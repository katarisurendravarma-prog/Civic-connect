@echo off
title Smart Civic System Starter

echo ===================================================
echo   Starting Smart Civic Complaint System Backend...
echo ===================================================

:: Check if virtual environment exists in backend and activate it
if exist "backend\venv\Scripts\activate.bat" (
    echo Activating backend virtual environment...
    start "Flask Backend Server" cmd /k "cd backend && call venv\Scripts\activate.bat && python app.py"
) else (
    echo Starting backend server globally...
    start "Flask Backend Server" cmd /k "cd backend && python app.py"
)

:: Wait 2 seconds for the server to spin up
timeout /t 2 /nobreak >nul

echo ===================================================
echo   Opening Frontend Web Application...
echo ===================================================
start "" "frontend\index.html"

exit
