import os
# Configure the test runner to use an isolated in-memory SQLite database
# This prevents test teardowns from dropping developer database tables
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import unittest
import json
import shutil
from backend.app import create_app
from backend.models import db, User, Complaint, Department, Feedback, Notification, AuditLog
from backend.services.ai_service import AIService

class CivicSystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure app for testing
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.ctx = cls.app.app_context()
        cls.ctx.push()
        
        # Ensure we are testing on a fresh DB
        db.drop_all()
        db.create_all()
        
        # Re-seed categories since we wiped DB
        seeded_depts = [
            ("Roads & Potholes", "Potholes, cracks, pavements."),
            ("Garbage Management", "Littering, overflow."),
            ("Water Supply Issues", "Pipeline bursts, low pressure.")
        ]
        for name, desc in seeded_depts:
            db.session.add(Department(name=name, description=desc))
        db.session.commit()
        
        cls.ai_service = AIService()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def test_01_user_registration_and_activation(self):
        # Register Citizen
        payload = {
            "name": "Test Citizen",
            "email": "test@civic.gov",
            "phone": "1112223334",
            "password": "citizenPassword123",
            "address": "456 Ward Road"
        }
        res = self.client.post('/api/auth/register', json=payload)
        data = json.loads(res.data)
        
        self.assertEqual(res.status_code, 201)
        self.assertIn('otp_demo', data)
        otp = data['otp_demo']
        
        # Activate Account
        verify_payload = {
            "email": "test@civic.gov",
            "otp": otp
        }
        v_res = self.client.post('/api/auth/verify-otp', json=verify_payload)
        self.assertEqual(v_res.status_code, 200)

    def test_02_jwt_login(self):
        # Login Citizen
        payload = {
            "username": "test@civic.gov",
            "password": "citizenPassword123"
        }
        res = self.client.post('/api/auth/login', json=payload)
        data = json.loads(res.data)
        
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', data)
        self.token = data['token']

    def test_02_google_login(self):
        # Login Google Citizen (registers dynamically)
        payload = {
            "email": "google_test_user@gmail.com",
            "name": "Google Test User",
            "google_id": "google_123456"
        }
        res = self.client.post('/api/auth/google-login', json=payload)
        data = json.loads(res.data)
        
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], "google_test_user@gmail.com")
        self.assertEqual(data['user']['is_verified'], True)

    def test_03_ai_nlp_classifier_and_priority_checks(self):
        # 1. Test Pothole categorization
        desc_road = "I hit a huge pothole in the main street driving home, it bent my tire rim and is very dangerous."
        category = self.ai_service.classify_complaint(desc_road)
        priority = self.ai_service.predict_priority(desc_road)
        
        self.assertEqual(category, "Roads & Potholes")
        self.assertEqual(priority, "Critical") # Due to 'danger' / 'dangerous'

        # 2. Test Garbage categorization
        desc_trash = "Trash is piling up and overflow is everywhere, smells terrible."
        category_t = self.ai_service.classify_complaint(desc_trash)
        priority_t = self.ai_service.predict_priority(desc_trash)
        
        self.assertEqual(category_t, "Garbage Management")
        self.assertEqual(priority_t, "High") # Due to 'overflow'

    def test_04_ai_duplicate_detection(self):
        existing_complaints = [
            {
                'unique_id': 'CC-MOCK-001',
                'description': 'Pothole on the left lane of road causing cars to swerve.',
                'latitude': 12.9716,
                'longitude': 77.5946
            }
        ]
        
        # Closely matches: same location, identical description intent
        desc_new = "Pothole on the left lane of road causing cars to swerve."
        is_dup, dup_id = self.ai_service.detect_duplicates(12.9717, 77.5945, desc_new, existing_complaints)
        self.assertTrue(is_dup)
        self.assertEqual(dup_id, 'CC-MOCK-001')
        
        # Far location: should not be duplicate
        is_dup_far, _ = self.ai_service.detect_duplicates(13.0112, 77.6231, desc_new, existing_complaints)
        self.assertFalse(is_dup_far)

    def test_05_complaint_submission(self):
        # Force login to get token
        login_res = self.client.post('/api/auth/login', json={
            "username": "test@civic.gov",
            "password": "citizenPassword123"
        })
        token = json.loads(login_res.data)['token']
        
        payload = {
            "title": "Road damage on main avenue",
            "description": "Deep cracks and potholes everywhere",
            "category": "Roads & Potholes",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Main Ave",
            "images": []
        }
        res = self.client.post('/api/complaints/submit', json=payload, headers={
            'Authorization': f'Bearer {token}'
        })
        data = json.loads(res.data)
        self.assertEqual(res.status_code, 201)
        self.assertIn('complaint', data)

    def test_06_admin_dashboard_stats_and_pdf_generation(self):
        # Register & Login as Admin
        admin = User(name="Super Test Admin", email="admin-test@civic.gov", phone="1231231234", role="SuperAdmin", is_verified=True)
        admin.set_password("adminTest123")
        db.session.add(admin)
        db.session.commit()
        
        login_res = self.client.post('/api/auth/login', json={
            "username": "admin-test@civic.gov",
            "password": "adminTest123"
        })
        token = json.loads(login_res.data)['token']
        
        # Get Dashboard stats
        res = self.client.get('/api/admin/dashboard-stats', headers={
            'Authorization': f'Bearer {token}'
        })
        self.assertEqual(res.status_code, 200)
        
        # Export PDF report
        pdf_res = self.client.get('/api/admin/generate-pdf-report', headers={
            'Authorization': f'Bearer {token}'
        })
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.mimetype, 'application/pdf')

    def test_07_complaint_deletion(self):
        # 1. Create a second citizen to test unauthorized deletion
        user2 = User(name="User Two", email="user2@civic.gov", phone="2222222222", role="Citizen", is_verified=True)
        user2.set_password("user2Password123")
        db.session.add(user2)
        db.session.commit()
        
        # Login user2 to get their token
        login2 = self.client.post('/api/auth/login', json={
            "username": "user2@civic.gov",
            "password": "user2Password123"
        })
        token2 = json.loads(login2.data)['token']
        
        # Login main citizen to get their token and a complaint to delete
        login1 = self.client.post('/api/auth/login', json={
            "username": "test@civic.gov",
            "password": "citizenPassword123"
        })
        token1 = json.loads(login1.data)['token']
        
        # Get complaints list for citizen 1
        res_list = self.client.get('/api/complaints/list', headers={
            'Authorization': f'Bearer {token1}'
        })
        complaints = json.loads(res_list.data)
        self.assertTrue(len(complaints) > 0)
        target_complaint_id = complaints[0]['id']
        
        # 2. Try to delete citizen 1's complaint using token2 (Should fail with 403)
        res_del_fail = self.client.delete(f'/api/complaints/delete/{target_complaint_id}', headers={
            'Authorization': f'Bearer {token2}'
        })
        self.assertEqual(res_del_fail.status_code, 403)
        
        # 3. Delete citizen 1's complaint using token1 (Should succeed with 200)
        res_del_ok = self.client.delete(f'/api/complaints/delete/{target_complaint_id}', headers={
            'Authorization': f'Bearer {token1}'
        })
        self.assertEqual(res_del_ok.status_code, 200)
        
        # 4. Verify complaint is gone
        res_list_after = self.client.get('/api/complaints/list', headers={
            'Authorization': f'Bearer {token1}'
        })
        complaints_after = json.loads(res_list_after.data)
        self.assertEqual(len(complaints_after), len(complaints) - 1)

if __name__ == '__main__':
    unittest.main()
