"""
Flask backend server for ATS (Advanced Trailering System)
Handles Bluetooth data collection and WebSocket streaming to frontend
"""

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
from Trailer.data_models import SensorData
import threading
import json
import logging
import os
from datetime import datetime

# Use simulator for testing if DEMO_MODE is set
DEMO_MODE = os.getenv('DEMO_MODE', 'True').lower() == 'true'

if DEMO_MODE:
    from Trailer.sensor_simulator import MockBluetoothReceiver as BluetoothReceiver
else:
    from Trailer.bluetooth.bluetooth_receiver import BluetoothReceiver

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__, template_folder='web/templates', static_folder='web/static')
app.config['SECRET_KEY'] = 'ats-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
bt_receiver = None
latest_sensor_data = None
clients_connected = 0


@app.route('/')
def index():
    """Serve the main dashboard"""
    return render_template('index.html')


@app.route('/api/status')
def api_status():
    """API endpoint for system status"""
    return jsonify({
        'status': 'connected' if latest_sensor_data else 'waiting',
        'clients': clients_connected,
        'latest_data': latest_sensor_data.to_dict() if latest_sensor_data else None
    })


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket client connection"""
    global clients_connected
    clients_connected += 1
    logger.info(f'Client connected. Total clients: {clients_connected}')
    emit('connection_response', {'data': 'Connected to ATS Backend'})
    
    # Send latest data if available
    if latest_sensor_data:
        emit('sensor_update', latest_sensor_data.to_dict())


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket client disconnection"""
    global clients_connected
    clients_connected = max(0, clients_connected - 1)
    logger.info(f'Client disconnected. Total clients: {clients_connected}')


@socketio.on('request_update')
def handle_request_update():
    """Send current sensor data to requesting client"""
    if latest_sensor_data:
        emit('sensor_update', latest_sensor_data.to_dict())


def bluetooth_receiver_thread():
    """
    Background thread that continuously receives Bluetooth data
    and broadcasts to all connected clients
    """
    global latest_sensor_data, bt_receiver
    
    try:
        # Initialize Bluetooth receiver
        bt_receiver = BluetoothReceiver()
        logger.info('Bluetooth receiver initialized')
        
        while True:
            # Receive sensor data from Bluetooth
            data = bt_receiver.receive_sensor_data()
            
            if data:
                # Parse sensor data
                latest_sensor_data = SensorData.from_dict(data)
                logger.info(f'Received sensor data: {latest_sensor_data}')
                
                # Broadcast to all connected WebSocket clients
                socketio.emit('sensor_update', latest_sensor_data.to_dict())
    
    except Exception as e:
        logger.error(f'Bluetooth receiver error: {e}')
        # Attempt reconnection after delay
        import time
        time.sleep(5)
        socketio.emit('connection_error', {'error': str(e)})


def start_bluetooth_receiver():
    """Start the Bluetooth receiver in a background thread"""
    thread = threading.Thread(target=bluetooth_receiver_thread, daemon=True)
    thread.start()
    logger.info('Bluetooth receiver thread started')


if __name__ == '__main__':
    # Start Bluetooth receiver thread
    start_bluetooth_receiver()
    
    # Start Flask SocketIO server
    logger.info('Starting ATS Backend Server...')
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
