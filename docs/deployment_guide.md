# Deployment & Setup Guide

This document describes how to launch the Smart Civic Complaint Management System locally or on a production environment.

## 1. Backend Setup & Run

### Prerequisites
- Python 3.8 to 3.11 installed.
- MySQL Server (Optional, defaults to SQLite if variables are omitted).

### Steps
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install virtual environment and packages:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```
3. Set environment variables (Only if integrating with local MySQL server):
   ```powershell
   $env:MYSQL_USER="root"
   $env:MYSQL_PASSWORD="your-mysql-password"
   $env:MYSQL_HOST="localhost"
   $env:MYSQL_DB="smart_civic_db"
   ```
4. Start the server application:
   ```bash
   python app.py
   ```
   *Note: This automatically builds database tables and seeds standard accounts (Jane, John, David, Admin) and categories.*

---

## 2. Frontend Web Clients Run
- **Automated Startup (Windows)**:
  Double-click the `start_app.bat` script in the root directory. This will automatically start the Flask backend server in a separate terminal and open `frontend/index.html` in your default browser.
  
- **Manual Launch**:
  1. Serve the frontend folder or double-click `frontend/index.html` (Citizen Portal) or `frontend/admin.html` (Admin Dashboard) to launch directly inside any modern web browser.
  2. Note: For Google Maps API deployment, substitute Leaflet calls inside `app.js` and `admin.js` with Google Maps init scripts, pasting your API credential key inside `index.html` headers.

---

## 3. Test Authentication Credentials (Seeded Profiles)
- **Super Admin Profile**:
  - Email: `admin@civic.gov`
  - Password: `adminPassword123`
- **Department Officer Profile**:
  - Email: `officer@civic.gov`
  - Password: `officerPassword123`
- **Field Staff Profile**:
  - Email: `staff@civic.gov`
  - Password: `staffPassword123`
- **Citizen Profile**:
  - Email: `jane@civic.gov`
  - Password: `janePassword123`
