from flask import Blueprint, request, jsonify
from backend.models import db, User, AuditLog
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import random
import uuid
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

def generate_otp():
    return str(random.randint(100000, 999999))

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    address = data.get('address', '')
    role = data.get('role', 'Citizen') # Citizen, FieldStaff, DepartmentOfficer, MunicipalCommissioner, SuperAdmin
    
    if not name or not email or not phone or not password:
        return jsonify({'message': 'Missing required fields (name, email, phone, password)'}), 400
        
    # Check if user already exists
    if User.query.filter((User.email == email) | (User.phone == phone)).first():
        return jsonify({'message': 'User with this email or phone number already exists'}), 409
        
    user = User(
        name=name,
        email=email,
        phone=phone,
        address=address,
        role=role,
        is_verified=False
    )
    user.set_password(password)
    
    # Generate OTP
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # Log/Print OTP in server log for easy developer access
        print(f"\n[OTP SERVICE] Generated verification code for {email}: {otp}\n")
        
        return jsonify({
            'message': 'Registration successful. An OTP has been sent to your registered contact.',
            'email': email,
            'otp_demo': otp  # Expose in API for testing convenience
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error creating user', 'error': str(e)}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    email = data.get('email')
    otp_code = data.get('otp')
    
    if not email or not otp_code:
        return jsonify({'message': 'Missing email or OTP'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if user.otp != otp_code:
        return jsonify({'message': 'Invalid OTP verification code'}), 400
        
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        return jsonify({'message': 'OTP has expired. Please request a new one.'}), 400
        
    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    
    try:
        db.session.commit()
        return jsonify({'message': 'Account verified successfully. You can now login.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error during verification', 'error': str(e)}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    try:
        db.session.commit()
        print(f"\n[OTP SERVICE] Re-generated verification code for {email}: {otp}\n")
        return jsonify({
            'message': 'OTP resent successfully.',
            'otp_demo': otp
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error resending OTP', 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    login_id = data.get('username')  # can be email or phone
    password = data.get('password')
    
    if not login_id or not password:
        return jsonify({'message': 'Missing credentials'}), 400
        
    user = User.query.filter((User.email == login_id) | (User.phone == login_id)).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    if not user.is_verified:
        return jsonify({
            'message': 'Account not verified. Please verify your OTP.',
            'is_verified': False,
            'email': user.email
        }), 403
        
    # Generate JWT containing identity (id) and roles in claims
    token_identity = str(user.id)
    access_token = create_access_token(
        identity=token_identity,
        additional_claims={'role': user.role, 'email': user.email, 'name': user.name}
    )
    
    return jsonify({
        'message': 'Login successful',
        'token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/google-login', methods=['POST'])
def google_login():
    data = request.get_json() or {}
    email = data.get('email')
    name = data.get('name')
    google_id = data.get('google_id')
    
    if not email or not name:
        return jsonify({'message': 'Missing Google profile information.'}), 400
        
    # Check if user already exists
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Create new verified citizen account automatically
        user = User(
            name=name,
            email=email,
            phone=f"G-{google_id[:13]}" if google_id else f"G-{random.randint(10000000, 99999999)}",
            address="Google Authenticated Profile",
            role="Citizen",
            is_verified=True
        )
        # Set dummy password
        user.set_password(str(uuid.uuid4()))
        
        try:
            db.session.add(user)
            db.session.commit()
            
            # Log audit
            audit = AuditLog(
                actor_id=user.id,
                actor_name=user.name,
                action="GOOGLE_REGISTER",
                target_type="User",
                target_id=user.id,
                details=f"Registered and verified new user {email} via Google Sign-In."
            )
            db.session.add(audit)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': 'Error creating Google account profile', 'error': str(e)}), 500
            
    # Generate JWT for existing or new user
    token_identity = str(user.id)
    access_token = create_access_token(
        identity=token_identity,
        additional_claims={'role': user.role, 'email': user.email, 'name': user.name}
    )
    
    return jsonify({
        'message': 'Login successful via Google Auth',
        'token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if request.method == 'GET':
        return jsonify(user.to_dict()), 200
        
    # PUT request to update profile
    data = request.get_json() or {}
    user.name = data.get('name', user.name)
    user.phone = data.get('phone', user.phone)
    user.address = data.get('address', user.address)
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating profile', 'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'message': 'Missing parameters'}), 400
        
    if not user.check_password(old_password):
        return jsonify({'message': 'Incorrect current password'}), 400
        
    user.set_password(new_password)
    try:
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error changing password', 'error': str(e)}), 500
        
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal account doesn't exist, but send mock success
        return jsonify({'message': 'If the email exists, a reset code has been sent.'}), 200
        
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    try:
        db.session.commit()
        print(f"\n[PASSWORD RESET] Verification code for {email}: {otp}\n")
        return jsonify({
            'message': 'Verification code sent to email.',
            'otp_demo': otp
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@auth_bp.route('/reset-password-verify', methods=['POST'])
def reset_password_verify():
    data = request.get_json() or {}
    email = data.get('email')
    otp_code = data.get('otp')
    new_password = data.get('new_password')
    
    if not email or not otp_code or not new_password:
        return jsonify({'message': 'Missing email, OTP or new password'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or user.otp != otp_code:
        return jsonify({'message': 'Invalid verification code or email'}), 400
        
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        return jsonify({'message': 'Verification code has expired'}), 400
        
    user.set_password(new_password)
    user.otp = None
    user.otp_expiry = None
    
    try:
        db.session.commit()
        return jsonify({'message': 'Password reset successful. You can now login.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
