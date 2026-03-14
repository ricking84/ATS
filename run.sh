#!/bin/bash
# Quick start script for ATS (Mac/Linux)
# This script sets up and runs the Automated Trailering System

echo ""
echo "========================================"
echo "Automated Trailering System (ATS)"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

echo "[1/4] Checking virtual environment..."
if [ ! -d "venv" ]; then
    echo "[2/4] Creating virtual environment..."
    python3 -m venv venv
else
    echo "[2/4] Virtual environment already exists"
fi

echo "[3/4] Activating virtual environment..."
source venv/bin/activate

echo "[4/4] Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "========================================"
echo "Starting ATS Backend Server"
echo "========================================"
echo ""
echo "Backend will be available at:"
echo "  http://localhost:5000"
echo ""
echo "Access from phone/tablet:"
echo "  Find your IP: ifconfig | grep inet"
echo "  Open: http://[YOUR-IP]:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run in demo mode by default
export DEMO_MODE=True
python3 app.py
