from flask import Blueprint, request, jsonify, current_app, send_from_directory
from backend.models import db, User, Complaint, Department, Feedback, Notification, AuditLog
from backend.services.ai_service import AIService
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime

complaints_bp = Blueprint('complaints', __name__)
ai_service = AIService()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def generate_unique_id():
    # Returns format: CC-YYYYMMDD-8CHARS
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = str(uuid.uuid4()).split('-')[0].upper()
    return f"CC-{date_str}-{random_str}"

@complaints_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_complaint():
    citizen_id = get_jwt_identity()
    user = User.query.get(citizen_id)
    
    if not user:
        return jsonify({'message': 'User session not found'}), 404
        
    data = request.json or {}
    title = data.get('title')
    description = data.get('description')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    address = data.get('address', '')
    category = data.get('category')  # Can be selected or auto-detected
    images = data.get('images', [])  # Array of strings (image paths)
    documents = data.get('documents', [])
    
    if not title or not description or latitude is None or longitude is None:
        return jsonify({'message': 'Missing required fields (title, description, latitude, longitude)'}), 400
        
    # AI Feature 1: Classification (if not provided, or to suggest auto-adjust)
    ai_category = ai_service.classify_complaint(description)
    if not category or category == "Detect Automatically" or category == "Others":
        category = ai_category
        
    # AI Feature 2: Smart Priority Prediction
    priority = ai_service.predict_priority(description)
    
    # AI Feature 3: Duplicate Detection
    # Get all active complaints (not resolved or rejected) to check for duplicate
    active_complaints = Complaint.query.filter(Complaint.status.in_(['Pending', 'Assigned', 'In Progress'])).all()
    complaints_list = [{
        'unique_id': c.unique_id,
        'description': c.description,
        'latitude': c.latitude,
        'longitude': c.longitude
    } for c in active_complaints]
    
    is_duplicate, original_id = ai_service.detect_duplicates(
        float(latitude), float(longitude), description, complaints_list
    )
    
    unique_id = generate_unique_id()
    
    # Resolve department based on category
    dept = Department.query.filter(Department.name.like(f"%{category}%")).first()
    dept_id = dept.id if dept else None
    
    # Create the complaint
    new_complaint = Complaint(
        unique_id=unique_id,
        title=title,
        description=description,
        category=category,
        latitude=float(latitude),
        longitude=float(longitude),
        address=address,
        priority=priority,
        status='Pending' if not is_duplicate else 'Rejected', # Mark rejected if direct duplicate, or keep track of merge
        images_json=None,
        documents_json=None,
        citizen_id=citizen_id,
        department_id=dept_id,
        remarks="Flagged as possible duplicate of " + original_id if is_duplicate else "Awaiting department review."
    )
    
    new_complaint.images = images
    new_complaint.documents = documents
    
    try:
        db.session.add(new_complaint)
        db.session.commit()
        
        # Create notification for citizen
        notif_msg = f"Your complaint '{title}' was submitted successfully. ID: {unique_id}."
        if is_duplicate:
            notif_msg = f"Your complaint was flagged as a duplicate of {original_id} and merged into the active investigation."
            
        notification = Notification(
            user_id=citizen_id,
            title="Complaint Registered Successfully",
            message=notif_msg,
            type="System"
        )
        db.session.add(notification)
        
        # Audit Log
        audit = AuditLog(
            actor_id=citizen_id,
            actor_name=user.name,
            action="CREATE_COMPLAINT",
            target_type="Complaint",
            target_id=new_complaint.id,
            details=f"Created complaint {unique_id} with category {category} and priority {priority}."
        )
        db.session.add(audit)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Complaint registered successfully',
            'complaint': new_complaint.to_dict(),
            'is_duplicate': is_duplicate,
            'duplicate_of': original_id,
            'ai_insights': {
                'detected_category': ai_category,
                'predicted_priority': priority
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error submitting complaint', 'error': str(e)}), 500

@complaints_bp.route('/list', methods=['GET'])
@jwt_required()
def list_complaints():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User session not found'}), 404
        
    # Citizens only see their own complaints, other roles see everything or filtering
    if user.role == 'Citizen':
        complaints = Complaint.query.filter_by(citizen_id=user_id).order_by(Complaint.created_at.desc()).all()
    else:
        # Administrators, officers, field staff see all
        complaints = Complaint.query.order_by(Complaint.created_at.desc()).all()
        
    return jsonify([c.to_dict() for c in complaints]), 200

@complaints_bp.route('/details/<int:complaint_id>', methods=['GET'])
@jwt_required()
def complaint_details(complaint_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    complaint = Complaint.query.get(complaint_id)
    
    if not complaint:
        return jsonify({'message': 'Complaint not found'}), 404
        
    # Restrict citizen from reading others' complaints
    if user.role == 'Citizen' and complaint.citizen_id != int(user_id):
        return jsonify({'message': 'Access denied to this resource'}), 403
        
    # Get audit logs for tracking history timeline
    logs = AuditLog.query.filter_by(target_type='Complaint', target_id=complaint_id).order_by(AuditLog.created_at.asc()).all()
    timeline = [{
        'action': l.action,
        'actor_name': l.actor_name,
        'details': l.details,
        'created_at': l.created_at.isoformat()
    } for l in logs]
    
    return jsonify({
        'complaint': complaint.to_dict(),
        'timeline': timeline
    }), 200

@complaints_bp.route('/upload-media', methods=['POST'])
@jwt_required()
def upload_media():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected for uploading'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        
        # Ensure upload folder exists
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Build URL relative to server static serving
        relative_url = f"/backend/uploads/{filename}"
        
        # AI Feature 4: OpenCV Image Check
        ai_visual_insight = {}
        if filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}:
            ai_visual_insight = ai_service.analyze_image(file_path)
            
        return jsonify({
            'message': 'File uploaded successfully',
            'file_url': relative_url,
            'filename': filename,
            'ai_analysis': ai_visual_insight
        }), 200
    else:
        return jsonify({'message': 'File type not allowed'}), 400

@complaints_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    citizen_id = get_jwt_identity()
    user = User.query.get(citizen_id)
    
    data = request.json or {}
    complaint_id = data.get('complaint_id')
    rating = data.get('rating')
    comments = data.get('comments', '')
    
    if not complaint_id or rating is None:
        return jsonify({'message': 'Missing complaint_id or rating rating'}), 400
        
    complaint = Complaint.query.get(complaint_id)
    if not complaint or complaint.citizen_id != int(citizen_id):
        return jsonify({'message': 'Complaint not found or unauthorized'}), 404
        
    if complaint.status != 'Resolved':
        return jsonify({'message': 'Feedback can only be submitted for resolved complaints.'}), 400
        
    # Analyze rating and comments to derive satisfaction score (out of 100)
    score = float(rating) * 20.0 # 5 stars = 100%
    if comments and "delay" in comments.lower() or "slow" in comments.lower():
        score = max(score - 15, 0)
        
    feedback = Feedback(
        complaint_id=complaint_id,
        citizen_id=citizen_id,
        rating=rating,
        comments=comments,
        satisfaction_score=score
    )
    
    db.session.add(feedback)
    
    # Audit log
    audit = AuditLog(
        actor_id=citizen_id,
        actor_name=user.name,
        action="SUBMIT_FEEDBACK",
        target_type="Complaint",
        target_id=complaint_id,
        details=f"Rated resolved complaint {complaint.unique_id} with {rating} stars."
    )
    db.session.add(audit)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Feedback submitted successfully', 'feedback': feedback.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@complaints_bp.route('/reopen', methods=['POST'])
@jwt_required()
def reopen_complaint():
    citizen_id = get_jwt_identity()
    user = User.query.get(citizen_id)
    
    data = request.json or {}
    complaint_id = data.get('complaint_id')
    remarks = data.get('remarks', '')
    
    if not complaint_id:
        return jsonify({'message': 'Complaint ID is required'}), 400
        
    complaint = Complaint.query.get(complaint_id)
    if not complaint or complaint.citizen_id != int(citizen_id):
        return jsonify({'message': 'Complaint not found or unauthorized'}), 404
        
    if complaint.status != 'Resolved':
        return jsonify({'message': 'Only resolved complaints can be reopened.'}), 400
        
    complaint.status = 'Reopened'
    complaint.remarks = f"[Reopened] {remarks}"
    
    # Audit log
    audit = AuditLog(
        actor_id=citizen_id,
        actor_name=user.name,
        action="REOPEN_COMPLAINT",
        target_type="Complaint",
        target_id=complaint_id,
        details=f"Reopened resolved complaint {complaint.unique_id}. Reason: {remarks}"
    )
    db.session.add(audit)
    
    # Notification for department
    # If assigned to officer, notify them
    if complaint.assigned_officer_id:
        notif = Notification(
            user_id=complaint.assigned_officer_id,
            title="Complaint Reopened",
            message=f"Complaint {complaint.unique_id} has been reopened by the citizen.",
            type="Alert"
        )
        db.session.add(notif)
        
    try:
        db.session.commit()
        return jsonify({'message': 'Complaint reopened successfully', 'complaint': complaint.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@complaints_bp.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.json or {}
    message = data.get('message')
    
    # DB Helper function to retrieve complaint status for chatbot
    def get_complaint_status_from_db(unique_id):
        return Complaint.query.filter_by(unique_id=unique_id).first()
        
    reply = ai_service.chatbot_reply(message, get_complaint_status_from_db)
    return jsonify({'reply': reply}), 200

@complaints_bp.route('/delete/<int:complaint_id>', methods=['DELETE'])
@jwt_required()
def delete_complaint(complaint_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User session not found'}), 404
        
    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        return jsonify({'message': 'Complaint not found'}), 404
        
    # Permission check: Citizen can only delete their own complaints
    if user.role == 'Citizen' and complaint.citizen_id != int(user_id):
        return jsonify({'message': 'Access denied to this resource'}), 403
        
    try:
        # Delete associated feedback manually if any
        if complaint.feedback:
            db.session.delete(complaint.feedback)
            
        # Delete associated audit logs targeting this complaint
        AuditLog.query.filter_by(target_type='Complaint', target_id=complaint.id).delete()
        
        # Log the deletion audit record
        audit = AuditLog(
            actor_id=user_id,
            actor_name=user.name,
            action="DELETE_COMPLAINT",
            target_type="Complaint",
            target_id=complaint.id,
            details=f"Deleted complaint {complaint.unique_id} titled '{complaint.title}'."
        )
        db.session.add(audit)
        
        db.session.delete(complaint)
        db.session.commit()
        
        return jsonify({'message': 'Complaint deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error deleting complaint', 'error': str(e)}), 500

# Route to serve uploads directory statically
@complaints_bp.route('/uploads/<filename>')
def serve_uploads(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@complaints_bp.route('/feedbacks', methods=['GET'])
@jwt_required()
def get_feedbacks():
    citizen_id = get_jwt_identity()
    feedbacks = Feedback.query.filter_by(citizen_id=citizen_id).order_by(Feedback.created_at.desc()).all()
    
    result = []
    for f in feedbacks:
        result.append({
            'id': f.id,
            'complaint_id': f.complaint_id,
            'complaint_title': f.complaint.title if f.complaint else 'Unknown',
            'complaint_unique_id': f.complaint.unique_id if f.complaint else '',
            'rating': f.rating,
            'comments': f.comments,
            'satisfaction_score': f.satisfaction_score,
            'created_at': f.created_at.isoformat()
        })
        
    return jsonify(result), 200

@complaints_bp.route('/history', methods=['GET'])
@jwt_required()
def get_user_history():
    citizen_id = get_jwt_identity()
    my_complaints = Complaint.query.filter_by(citizen_id=citizen_id).all()
    my_complaint_ids = [c.id for c in my_complaints]
    
    logs = AuditLog.query.filter(
        (AuditLog.actor_id == citizen_id) | 
        ((AuditLog.target_type == 'Complaint') & (AuditLog.target_id.in_(my_complaint_ids)))
    ).order_by(AuditLog.created_at.desc()).all()
    
    return jsonify([l.to_dict() for l in logs]), 200
