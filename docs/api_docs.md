# REST API Documentation

All requests should be submitted to the `http://localhost:5000/api` base URL. Protected resources require standard Authorization headers:
`Authorization: Bearer <jwt_access_token>`

---

## Authentication Endpoints (`/api/auth`)

### 1. Register User
- **URL**: `/register`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "9998887776",
    "password": "securePassword123",
    "address": "123 Main St, Bangalore",
    "role": "Citizen"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful...",
    "email": "jane@example.com",
    "otp_demo": "123456"
  }
  ```

### 2. Verify OTP
- **URL**: `/verify-otp`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "email": "jane@example.com",
    "otp": "123456"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Account verified successfully..."
  }
  ```

### 3. Account Login
- **URL**: `/login`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "username": "jane@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": 4,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "Citizen"
    }
  }
  ```

### 4. Google Sign-In Login/Register
- **URL**: `/google-login`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "email": "google_citizen@gmail.com",
    "name": "Google Citizen",
    "google_id": "google_oauth_1234567890"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful via Google Auth",
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": 5,
      "name": "Google Citizen",
      "email": "google_citizen@gmail.com",
      "role": "Citizen",
      "is_verified": true
    }
  }
  ```

---

## Complaints Endpoints (`/api/complaints`)

### 1. Submit Complaint
- **URL**: `/submit`
- **Method**: `POST`
- **Headers**: JWT Required
- **Payload**:
  ```json
  {
    "title": "Water leakage in sector 3 pipeline",
    "description": "Clean water is flooding road pavements since morning.",
    "category": "Water Supply Issues",
    "latitude": 12.9785,
    "longitude": 77.6012,
    "address": "Sector 3 Road crossing",
    "images": ["/backend/uploads/sample.jpg"]
  }
  ```
- **Response (210 Created)**:
  ```json
  {
    "message": "Complaint registered successfully",
    "complaint": { "id": 1, "unique_id": "CC-20260625-XP76", "status": "Pending" },
    "is_duplicate": false,
    "duplicate_of": null,
    "ai_insights": {
      "detected_category": "Water Supply Issues",
      "predicted_priority": "High"
    }
  }
  ```

### 2. Upload Supporting Media
- **URL**: `/upload-media`
- **Method**: `POST`
- **Headers**: JWT Required, `Content-Type: multipart/form-data`
- **Payload**: File binary attachment as `file` key
- **Response (200 OK)**:
  ```json
  {
    "message": "File uploaded successfully",
    "file_url": "/backend/uploads/some-uuid_image.jpg",
    "ai_analysis": {
      "detected": true,
      "confidence": 0.85,
      "details": "Rough texture detected (indicates potholes)"
    }
  }
  ```

### 3. Delete Complaint
- **URL**: `/delete/<int:complaint_id>`
- **Method**: `DELETE`
- **Headers**: JWT Required
- **Response (200 OK)**:
  ```json
  {
    "message": "Complaint deleted successfully"
  }
  ```

---

## Admin Endpoints (`/api/admin`)

### 1. Dashboard Stats
- **URL**: `/dashboard-stats`
- **Method**: `GET`
- **Headers**: JWT Admin Required
- **Response (200 OK)**:
  ```json
  {
    "summary": { "total": 15, "pending": 4, "resolved": 11 },
    "trends": [{ "date": "06-25", "count": 3 }],
    "performance": { "avg_resolution_hours": 14.5, "csat_score": 88.0 }
  }
  ```

### 2. Generate PDF Report
- **URL**: `/generate-pdf-report`
- **Method**: `GET`
- **Headers**: JWT Admin Required
- **Response**: Binary PDF application download stream.
