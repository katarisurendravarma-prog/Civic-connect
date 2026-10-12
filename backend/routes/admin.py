from flask import Blueprint, request, jsonify, send_file
from backend.models import db, User, Complaint, Department, Feedback, Notification, AuditLog
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io

admin_bp = Blueprint('admin', __name__)

def admin_required(fn):
    """Decorator to restrict routes to authorized roles only."""
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        role = claims.get('role')
        if role not in {'SuperAdmin', 'MunicipalCommissioner', 'DepartmentOfficer', 'FieldStaff'}:
            return jsonify({'message': 'Access denied: Administrative privileges required.'}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

@admin_bp.route('/dashboard-stats', methods=['GET'])
@admin_required
def dashboard_stats():
    # Gather counts
    total = Complaint.query.count()
    pending = Complaint.query.filter_by(status='Pending').count()
    assigned = Complaint.query.filter_by(status='Assigned').count()
    in_progress = Complaint.query.filter_by(status='In Progress').count()
    resolved = Complaint.query.filter_by(status='Resolved').count()
    reopened = Complaint.query.filter_by(status='Reopened').count()
    rejected = Complaint.query.filter_by(status='Rejected').count()
    
    # Department-wise counts
    dept_stats = []
    departments = Department.query.all()
    for d in departments:
        comp_count = Complaint.query.filter_by(department_id=d.id).count()
        res_count = Complaint.query.filter_by(department_id=d.id, status='Resolved').count()
        dept_stats.append({
            'department_id': d.id,
            'name': d.name,
            'total': comp_count,
            'resolved': res_count,
            'resolution_rate': round((res_count / comp_count * 100), 1) if comp_count > 0 else 0
        })
        
    # Coordinate points for Heatmap
    heatmap_points = []
    all_active_complaints = Complaint.query.all()
    for c in all_active_complaints:
        heatmap_points.append({
            'id': c.id,
            'latitude': c.latitude,
            'longitude': c.longitude,
            'category': c.category,
            'status': c.status,
            'priority': c.priority,
            'title': c.title
        })
        
    # Calculate average resolution time
    resolved_complaints = Complaint.query.filter(Complaint.status == 'Resolved', Complaint.resolution_date.isnot(None)).all()
    total_time = timedelta()
    for rc in resolved_complaints:
        total_time += (rc.resolution_date - rc.created_at)
        
    avg_resolution_hours = 0
    if len(resolved_complaints) > 0:
        avg_resolution_hours = round(total_time.total_seconds() / 3600 / len(resolved_complaints), 1)
        
    # Citizen satisfaction scores
    feedbacks = Feedback.query.all()
    avg_rating = 0
    csat_score = 0
    if len(feedbacks) > 0:
        avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1)
        csat_score = round(sum(f.satisfaction_score for f in feedbacks) / len(feedbacks), 1)
        
    # Complaint trends (last 7 days)
    trends = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = Complaint.query.filter(
            Complaint.created_at >= datetime.combine(day, datetime.min.time()),
            Complaint.created_at < datetime.combine(next_day, datetime.min.time())
        ).count()
        trends.append({
            'date': day.strftime('%m-%d'),
            'count': count
        })
        
    return jsonify({
        'summary': {
            'total': total,
            'pending': pending,
            'assigned': assigned,
            'in_progress': in_progress,
            'resolved': resolved,
            'reopened': reopened,
            'rejected': rejected
        },
        'department_distribution': dept_stats,
        'heatmap': heatmap_points,
        'performance': {
            'avg_resolution_hours': avg_resolution_hours,
            'avg_rating': avg_rating,
            'csat_score': csat_score
        },
        'trends': trends
    }), 200

@admin_bp.route('/update-status/<int:complaint_id>', methods=['PUT'])
@admin_required
def update_status(complaint_id):
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    complaint = Complaint.query.get(complaint_id)
    
    if not complaint:
        return jsonify({'message': 'Complaint not found'}), 404
        
    data = request.json or {}
    status = data.get('status')
    priority = data.get('priority')
    department_id = data.get('department_id')
    assigned_officer_id = data.get('assigned_officer_id')
    remarks = data.get('remarks')
    resolution_proof = data.get('resolution_proof')
    
    changes = []
    
    if status and status != complaint.status:
        changes.append(f"Status changed from {complaint.status} to {status}")
        complaint.status = status
        
        # Log resolution details
        if status == 'Resolved':
            complaint.resolution_date = datetime.utcnow()
            if resolution_proof:
                complaint.resolution_proof = resolution_proof
                
        # Send Notification to Citizen
        notif = Notification(
            user_id=complaint.citizen_id,
            title="Complaint Status Updated",
            message=f"Your complaint '{complaint.title}' (ID: {complaint.unique_id}) status has been updated to '{status}'.",
            type="StatusUpdate"
        )
        db.session.add(notif)
        
    if priority and priority != complaint.priority:
        changes.append(f"Priority changed from {complaint.priority} to {priority}")
        complaint.priority = priority
        
    if department_id and int(department_id) != complaint.department_id:
        dept = Department.query.get(department_id)
        if dept:
            changes.append(f"Assigned department updated to {dept.name}")
            complaint.department_id = department_id
            
    if assigned_officer_id:
        officer = User.query.get(assigned_officer_id)
        if officer and int(assigned_officer_id) != (complaint.assigned_officer_id or 0):
            changes.append(f"Assigned officer updated to {officer.name}")
            complaint.assigned_officer_id = assigned_officer_id
            
            # Notify officer
            notif = Notification(
                user_id=assigned_officer_id,
                title="New Task Assigned",
                message=f"You have been assigned to investigate complaint {complaint.unique_id}.",
                type="Assignment"
            )
            db.session.add(notif)
            
    if remarks:
        complaint.remarks = remarks
        changes.append("Updated resolver remarks")
        
    if not changes:
        return jsonify({'message': 'No updates provided'}), 400
        
    # Log Audit Record
    audit = AuditLog(
        actor_id=admin_id,
        actor_name=admin_user.name,
        action="UPDATE_COMPLAINT",
        target_type="Complaint",
        target_id=complaint_id,
        details=f"Admin updated complaint parameters: {', '.join(changes)}."
    )
    db.session.add(audit)
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Complaint details updated successfully',
            'complaint': complaint.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@admin_bp.route('/list-staff', methods=['GET'])
@admin_required
def list_staff():
    staff = User.query.filter(User.role.in_(['FieldStaff', 'DepartmentOfficer'])).all()
    return jsonify([u.to_dict() for u in staff]), 200

@admin_bp.route('/departments', methods=['GET', 'POST'])
@admin_required
def manage_departments():
    if request.method == 'GET':
        depts = Department.query.all()
        return jsonify([d.to_dict() for d in depts]), 200
        
    # POST
    data = request.json or {}
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({'message': 'Department name is required'}), 400
        
    if Department.query.filter_by(name=name).first():
        return jsonify({'message': 'Department already exists'}), 400
        
    dept = Department(name=name, description=description)
    try:
        db.session.add(dept)
        db.session.commit()
        return jsonify(dept.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@admin_bp.route('/generate-pdf-report', methods=['GET'])
@admin_required
def generate_pdf_report():
    # Fetch report statistics
    total_complaints = Complaint.query.count()
    resolved = Complaint.query.filter_by(status='Resolved').count()
    pending = Complaint.query.filter_by(status='Pending').count()
    in_progress = Complaint.query.filter_by(status='In Progress').count()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom colors
    primary_color = colors.HexColor('#0F172A') # Dark Slate
    accent_color = colors.HexColor('#2563EB') # Blue
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        textColor=primary_color,
        fontSize=24,
        leading=28,
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("Smart Civic Complaint Management System", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
    elements.append(Paragraph("<b>Municipal Progress & Performance Summary Report</b>", body_style))
    elements.append(Spacer(1, 15))
    
    # Summary Table
    summary_data = [
        ['Metric Description', 'Count/Metric Value'],
        ['Total Civic Complaints Filed', str(total_complaints)],
        ['Resolved Complaints', str(resolved)],
        ['Awaiting Action (Pending)', str(pending)],
        ['In Progress Investigations', str(in_progress)],
        ['Resolution Success Rate', f"{round(resolved / total_complaints * 100, 1) if total_complaints > 0 else 0}%"]
    ]
    
    t = Table(summary_data, colWidths=[300, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), primary_color),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 11),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Department Wise Analysis Header
    elements.append(Paragraph("<b>Department Performance Distribution</b>", styles['Heading2']))
    elements.append(Spacer(1, 8))
    
    # Department Table
    depts = Department.query.all()
    dept_table_data = [['Department Name', 'Total Complaints', 'Resolved Issues', 'Performance Rate']]
    for d in depts:
        tot = Complaint.query.filter_by(department_id=d.id).count()
        res = Complaint.query.filter_by(department_id=d.id, status='Resolved').count()
        rate = f"{round(res/tot*100, 1)}%" if tot > 0 else "0.0%"
        dept_table_data.append([d.name, str(tot), str(res), rate])
        
    dt = Table(dept_table_data, colWidths=[200, 100, 100, 100])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F1F5F9'))
    ]))
    elements.append(dt)
    
    # Build Document
    doc.build(elements)
    buffer.seek(0)
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"civic_report_{datetime.now().strftime('%Y%m%d')}.pdf",
        mimetype='application/pdf'
    )

@admin_bp.route('/send-notification', methods=['POST'])
@admin_required
def send_notification():
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    
    data = request.json or {}
    citizen_id = data.get('citizen_id')
    complaint_id = data.get('complaint_id')
    title = data.get('title', 'Notification')
    message = data.get('message')
    
    if not citizen_id or not message:
        return jsonify({'message': 'Missing citizen_id or message'}), 400
        
    notif = Notification(
        user_id=citizen_id,
        title=title,
        message=message,
        type="Alert"
    )
    db.session.add(notif)
    
    # Audit log
    audit = AuditLog(
        actor_id=admin_id,
        actor_name=admin_user.name,
        action="SEND_NOTIFICATION",
        target_type="Complaint",
        target_id=complaint_id or 0,
        details=f"Sent notification '{title}': {message}"
    )
    db.session.add(audit)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Notification sent successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@admin_bp.route('/log-audit', methods=['POST'])
@admin_required
def log_audit():
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    
    data = request.json or {}
    complaint_id = data.get('complaint_id')
    action = data.get('action')
    details = data.get('details')
    
    if not complaint_id or not action:
        return jsonify({'message': 'Missing complaint_id or action'}), 400
        
    audit = AuditLog(
        actor_id=admin_id,
        actor_name=admin_user.name,
        action=action,
        target_type="Complaint",
        target_id=complaint_id,
        details=details
    )
    db.session.add(audit)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Audit log registered successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
