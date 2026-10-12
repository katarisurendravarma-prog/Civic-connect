# 🏛️ Civic Connect - Smart Civic Grievance & Dispatch Management System

> An intelligent, full-stack municipal grievance redressal platform with AI-powered category & priority prediction, live GPS geolocation, interactive Google Street View (360°), and an Officer Dispatch Map.

---

## 🌟 Key Features

### 👤 Citizen Portal
- **Smart Grievance Filing**: Automatic AI categorization (NLP) & urgency scoring.
- **Precision Geotagging**: 
  - Live GPS tracking with real-time accuracy circles (`±m`).
  - Google Street View (360°) panoramic imagery integration.
  - Multi-layer map toggle (Google Road Street View, Satellite Hybrid, CartoDB, OSM).
  - Reverse geocoding for automated street-level address detection.
- **Real-Time Tracking & Timelines**: Audit logging for every status transition.
- **AI Civic Assistant**: Conversational AI chatbot for municipal enquiries.

### 🛡️ Officer & Admin Console
- **Interactive Complaint Map**: Full-screen city-wide field dispatch map with live filters (by status, priority, department).
- **Officer Live GPS**: "Center My GPS" button to locate nearby complaints in the field.
- **Direct 360° Google Street View**: Visual inspection of reported physical damage before field deployment.
- **Case Actions & Proof Upload**: Reassign cases, post officer remarks, and attach resolution proof photos.
- **Analytics & PDF Reporting**: Visual charts for category breakdowns and 1-click official PDF report generation.

---

## 🚀 Quick Start (Local Run)

### Method A: 1-Click Startup (Windows)
Simply double-click:
```cmd
start_app.bat
```
This automatically boots the Flask backend on port `5000` and opens the Citizen Portal in your default browser.

### Method B: Manual Startup

#### 1. Start the Flask Backend
```bash
# Navigate to backend folder
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python app.py
```
*The database (`civic_connect.db`) and seed accounts are initialized automatically upon launch.*

#### 2. Open the Frontend
Open `frontend/index.html` (Citizen Portal) or `frontend/admin.html` (Officer Console) in any web browser, or navigate to `http://localhost:5000` in your browser.

---

## 🔑 Demo Login Credentials

The database automatically seeds standard test profiles upon first boot:

| Role | Email | Password |
|---|---|---|
| 👑 **Super Admin** | `admin@civic.gov` | `adminPassword123` |
| 🏢 **Department Officer** | `officer@civic.gov` | `officerPassword123` |
| 👷 **Field Staff** | `staff@civic.gov` | `staffPassword123` |
| 👤 **Citizen** | `jane@civic.gov` | `janePassword123` |

---

## ☁️ Free Cloud Deployment (Render.com)

To make your project accessible to anyone online via a live link:

1. **Push your code to GitHub** (see instructions below).
2. Go to **[Render.com](https://render.com)** and sign in with your GitHub account.
3. Click **New +** ➔ **Web Service**.
4. Select your GitHub repository.
5. Set the following configuration:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn backend.app:app`
   - **Instance Type**: `Free`
6. Click **Create Web Service**.
7. Once deployed, Render will provide a live URL (e.g. `https://your-app.onrender.com`).
   - Anyone visiting that link can use the full application live with the server running!

---

## 🛠️ Tech Stack
- **Backend**: Python 3, Flask, SQLAlchemy, Flask-JWT-Extended, Scikit-Learn, OpenCV, ReportLab
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+), Leaflet.js
- **Map & Geo**: Google Maps Tiles, Google Street View 360°, Esri Satellite, OpenStreetMap, BigDataCloud
- **Mobile**: Flutter Citizen App (`flutter_citizen_app/`)
