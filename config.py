"""
ATS Configuration File
Edit this file to customize system behavior
"""

import os
from pathlib import Path

# ===== Server Configuration =====
SERVER_HOST = os.getenv('ATS_HOST', '0.0.0.0')
SERVER_PORT = int(os.getenv('ATS_PORT', 5000))
SERVER_DEBUG = os.getenv('ATS_DEBUG', 'False').lower() == 'true'

# ===== Demo Mode =====
# Set to True to run with simulated data (no hardware needed)
DEMO_MODE = os.getenv('DEMO_MODE', 'True').lower() == 'true'

# ===== Sensor Configuration =====

# Float Sensor
FLOAT_SENSOR = {
    'enabled': True,
    'gpio_pin': 17,  # Raspberry Pi GPIO pin
    'arduino_pin': 12,  # Arduino digital pin
    'max_depth_mm': 2500,  # Maximum water depth for visualization
}

# MPU6050 Gyro/Accelerometer
GYRO_SENSOR = {
    'enabled': True,
    'i2c_address': 0x68,
    'range_dps': 250,  # Degrees per second
    'calibration_samples': 100,  # Samples for calibration
    'filter_samples': 5,  # Samples for low-pass filter
}

# Distance Sensors (VL53L0X)
DISTANCE_SENSORS = {
    'enabled': True,
    'left': {
        'i2c_address': 0x29,
        'max_range_mm': 3000,
    },
    'right': {
        'i2c_address': 0x30,
        'max_range_mm': 3000,
    },
    'filter_samples': 5,
}

# ===== Thresholds & Tolerances =====
THRESHOLDS = {
    'boat_alignment': {
        'centered_tolerance_mm': 50,      # Distance difference for centered
        'warning_tolerance_mm': 150,      # Distance difference for warning
        'max_distance_mm': 2500,          # Max expected boat distance
    },
    'trailer_level': {
        'level_tolerance_deg': 5,         # Degrees for "level" status
        'warning_tolerance_deg': 15,      # Degrees for warning
        'max_angle_deg': 90,              # Max allowed angle
    },
    'water_level': {
        'float_debounce_ms': 100,         # Debounce time for float switch
    }
}

# ===== WebSocket Configuration =====
WEBSOCKET = {
    'update_interval_ms': 100,  # How often to broadcast updates
    'max_retries': 5,           # Max connection retries
    'timeout_sec': 10,          # Connection timeout
}

# ===== Bluetooth Configuration =====
BLUETOOTH = {
    'enabled': True,
    'service_uuid': '94f39d29-7d6d-437d-973b-fba39e49d4ee',
    'service_name': 'ATS_SensorData',
    'baud_rate': 9600,  # For serial Bluetooth modules
    'port': 1,  # RFCOMM port
}

# ===== Data Logging =====
LOGGING = {
    'enabled': True,
    'level': 'INFO',  # DEBUG, INFO, WARNING, ERROR
    'file': 'logs/ats.log',
    'max_size_mb': 10,
    'backup_count': 5,
}

# ===== 3D Visualization Configuration =====
VISUALIZATION = {
    'fov': 75,  # Camera field of view
    'boat_scale': 1.0,  # Boat model scale
    'trailer_scale': 1.0,  # Trailer model scale
    'auto_rotate_camera': False,  # Auto rotate view
    'show_grid': True,  # Show reference grid
}

# ===== Performance =====
PERFORMANCE = {
    'target_fps': 60,
    'enable_shadows': True,
    'enable_antialiasing': True,
    'max_particles': 1000,
}

# ===== Alerts & Notifications =====
ALERTS = {
    'enabled': True,
    'float_in_water': {
        'enabled': True,
        'sound': True,
    },
    'boat_misaligned': {
        'enabled': True,
        'threshold_mm': 100,
        'sound': True,
        'duration_sec': 3,  # How long alert shows
    },
    'trailer_tilted': {
        'enabled': True,
        'threshold_deg': 20,
        'sound': True,
    },
}

# ===== API Configuration =====
API = {
    'cors_enabled': True,
    'cors_origins': ['*'],  # Set to specific domains in production
    'rate_limit': 100,  # Requests per minute
}

# ===== Paths =====
PATHS = {
    'logs': Path('logs'),
    'data': Path('data'),
    'temp': Path('temp'),
}

# Create necessary directories
for path in PATHS.values():
    path.mkdir(exist_ok=True, parents=True)

# ===== Data Persistence =====
PERSISTENCE = {
    'enabled': True,
    'save_frequency': 60,  # Save every 60 seconds
    'database_file': 'data/ats_data.db',
    'retention_days': 30,  # Days to keep
}
