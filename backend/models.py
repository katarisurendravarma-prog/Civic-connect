from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), default='Citizen')  # Citizen, FieldStaff, DepartmentOfficer, MunicipalCommissioner, SuperAdmin
    is_verified = db.Column(db.Boolean, default=False)
    otp = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    complaints = db.relationship('Complaint', backref='citizen', foreign_keys='Complaint.citizen_id', lazy=True)
    assigned_tasks = db.relationship('Complaint', backref='officer', foreign_keys='Complaint.assigned_officer_id', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    feedbacks = db.relationship('Feedback', backref='citizen', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False) # e.g., Roads & Potholes, Water Supply
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    complaints = db.relationship('Complaint', backref='department', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }

class Complaint(db.Model):
    __tablename__ = 'complaints'
    
    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(50), unique=True, nullable=False) # e.g., CC-20260625-XYZ
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False) # Roads & Potholes, Garbage, Water Supply, etc.
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    priority = db.Column(db.String(20), default='Medium') # Critical, High, Medium, Low
    status = db.Column(db.String(30), default='Pending') # Pending, Assigned, In Progress, Resolved, Reopened, Rejected
    
    # Store JSON arrays as text for compatibility across MySQL/SQLite
    images_json = db.Column(db.Text, default='[]')
    documents_json = db.Column(db.Text, default='[]')
    
    remarks = db.Column(db.Text, nullable=True)
    resolution_proof = db.Column(db.String(255), nullable=True) # Proof image path
    resolution_date = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign keys
    citizen_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    assigned_officer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    feedback = db.relationship('Feedback', backref='complaint', uselist=False, lazy=True)
    
    @property
    def images(self):
        try:
            return json.loads(self.images_json)
        except Exception:
            return []
            
    @images.setter
    def images(self, value):
        self.images_json = json.dumps(value)
        
    @property
    def documents(self):
        try:
            return json.loads(self.documents_json)
        except Exception:
            return []
            
    @documents.setter
    def documents(self, value):
        self.documents_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'unique_id': self.unique_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'priority': self.priority,
            'status': self.status,
            'images': self.images,
            'documents': self.documents,
            'remarks': self.remarks,
            'resolution_proof': self.resolution_proof,
            'resolution_date': self.resolution_date.isoformat() if self.resolution_date else None,
            'citizen_id': self.citizen_id,
            'citizen_name': self.citizen.name if self.citizen else 'Unknown',
            'citizen_phone': self.citizen.phone if self.citizen else '',
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else 'Unassigned',
            'assigned_officer_id': self.assigned_officer_id,
            'assigned_officer_name': self.officer.name if self.officer else 'Unassigned',
            'assigned_officer_phone': self.officer.phone if self.officer else '',
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    
    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    citizen_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False) # 1 to 5 stars
    comments = db.Column(db.Text, nullable=True)
    satisfaction_score = db.Column(db.Float, nullable=True) # Computed by NLP or input
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'citizen_id': self.citizen_id,
            'rating': self.rating,
            'comments': self.comments,
            'satisfaction_score': self.satisfaction_score,
            'created_at': self.created_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(50), default='StatusUpdate') # StatusUpdate, Assignment, Alert, System
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'read': self.read,
            'type': self.type,
            'created_at': self.created_at.isoformat()
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, nullable=False) # ID of user taking action (e.g. admin or citizen)
    actor_name = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(150), nullable=False) # e.g. "STATUS_CHANGE", "ASSIGN_OFFICER"
    target_type = db.Column(db.String(50), nullable=False) # e.g. "Complaint", "User"
    target_id = db.Column(db.Integer, nullable=False)
    details = db.Column(db.Text, nullable=True) # JSON details
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'actor_name': self.actor_name,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'created_at': self.created_at.isoformat()
        }
