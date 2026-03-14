@echo off
REM Quick start script for ATS
REM This script sets up and runs the Automated Trailering System

echo.
echo ========================================
echo Automated Trailering System (ATS)
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/4] Checking virtual environment...
if not exist "venv\" (
    echo [2/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [2/4] Virtual environment already exists
)

echo [3/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [4/4] Installing dependencies...
pip install -q -r requirements.txt

echo.
echo ========================================
echo Starting ATS Backend Server
echo ========================================
echo.
echo Backend will be available at:
echo   http://localhost:5000
echo.
echo Access from phone/tablet:
echo   Find your IP: ipconfig
echo   Open: http://[YOUR-IP]:5000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Run in demo mode by default
set DEMO_MODE=True
python app.py

pause
