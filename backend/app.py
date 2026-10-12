import sys
import os

# Append the parent directory to sys.path to enable direct backend folder script launches
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config import Config
from backend.models import db, User, Department, Complaint

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app)
    db.init_app(app)
    
    # Configure JWT
    jwt = JWTManager(app)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'The token has expired.', 'error': 'token_expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'message': 'Signature verification failed.', 'error': 'invalid_token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'message': 'Authorization header is missing or invalid.', 'error': 'authorization_required'}), 401
    
    # Register blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.complaints import complaints_bp
    from backend.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(complaints_bp, url_prefix='/api/complaints')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Serve frontend web assets (for unified cloud deployment on Render/Railway)
    @app.route('/')
    def serve_frontend_index():
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
        if os.path.exists(os.path.join(frontend_dir, 'index.html')):
            return send_from_directory(frontend_dir, 'index.html')
        return jsonify({'status': 'online', 'service': 'Civic Connect API'}), 200

    @app.route('/<path:filename>')
    def serve_frontend_static(filename):
        if filename.startswith('api/'):
            return jsonify({'message': 'API endpoint not found'}), 404
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
        file_path = os.path.join(frontend_dir, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(frontend_dir, filename)
        return jsonify({'message': 'Resource not found'}), 404
    
    # Handle global error routes
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({'message': 'API endpoint not found'}), 404
        
    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({'message': 'Internal server error occurred', 'error': str(e)}), 500

    # Initialize/Seed Database
    with app.app_context():
        # Ensure uploads folder exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Build database tables
        db.create_all()
        
        # Seed standard civic departments if empty
        seeded_depts = [
            ("Roads & Potholes", "Potholes, cracked asphalt, missing pavements, resurfacing."),
            ("Garbage Management", "Littering, overflowing bins, missed collections, dumping."),
            ("Water Supply Issues", "Leaking pipes, low water pressure, muddy water, supply outages."),
            ("Drainage Problems", "Blocked storm drains, street flooding, surface water pooling."),
            ("Sewage Issues", "Sewer line bursts, blockages, foul odor leaks, toxic overflows."),
            ("Streetlight Failure", "Non-functional streetlights, blinking bulbs, dark areas."),
            ("Electricity Problems", "Hanging wires, voltage spikes, transformer fire/failure."),
            ("Public Property Damage", "Broken park benches, vandalized railings, damaged public toilets."),
            ("Traffic Signal Issues", "Dead traffic lights, malfunctioning crossing indicators."),
            ("Environmental Issues", "Illegal deforestation, chemical discharges, toxic smoke.")
        ]
        
        if Department.query.count() == 0:
            for name, desc in seeded_depts:
                db.session.add(Department(name=name, description=desc))
            db.session.commit()
            print("[DB SEED] Standard Departments successfully added.")
            
        # Seed initial admin, officer, and field worker accounts if empty
        if User.query.filter_by(role='SuperAdmin').count() == 0:
            # Create SuperAdmin
            admin = User(name="Super Admin", email="admin@civic.gov", phone="9999999999", role="SuperAdmin", is_verified=True)
            admin.set_password("adminPassword123")
            db.session.add(admin)
            
            # Create Department Officer
            officer = User(name="Officer John", email="officer@civic.gov", phone="8888888888", role="DepartmentOfficer", is_verified=True)
            officer.set_password("officerPassword123")
            db.session.add(officer)
            
            # Create Field Staff
            staff = User(name="Staff David", email="staff@civic.gov", phone="7777777777", role="FieldStaff", is_verified=True)
            staff.set_password("staffPassword123")
            db.session.add(staff)
            
            # Create test citizen
            citizen = User(name="Citizen Jane", email="jane@civic.gov", phone="6666666666", role="Citizen", is_verified=True)
            citizen.set_password("janePassword123")
            db.session.add(citizen)
            
            db.session.commit()
            print("[DB SEED] SuperAdmin, Officer, Staff, and Citizen profiles created.")
            
    return app

app = create_app()

if __name__ == '__main__':
    # Run the server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
