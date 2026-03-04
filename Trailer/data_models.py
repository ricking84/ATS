"""
Data models for ATS (Advanced Trailering System)
Defines the sensor data schema and structures
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class SensorData:
    """Central sensor data model"""
    timestamp: float
    float_sensor: bool  # 0 = not in water, 1 = in water
    gyro_x: float  # Pitch angle (degree)
    gyro_y: float  # Roll angle (degree)
    gyro_z: float  # Yaw angle (degree)
    distance_left: float  # Distance sensor left (mm)
    distance_right: float  # Distance sensor right (mm)
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'timestamp': self.timestamp,
            'float_sensor': self.float_sensor,
            'gyro': {
                'x': self.gyro_x,
                'y': self.gyro_y,
                'z': self.gyro_z
            },
            'distance': {
                'left': self.distance_left,
                'right': self.distance_right
            }
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'SensorData':
        """Parse from JSON/dict format"""
        return SensorData(
            timestamp=data.get('timestamp', datetime.now().timestamp()),
            float_sensor=bool(data.get('float_sensor', 0)),
            gyro_x=float(data.get('gyro_x', 0)),
            gyro_y=float(data.get('gyro_y', 0)),
            gyro_z=float(data.get('gyro_z', 0)),
            distance_left=float(data.get('distance_left', 0)),
            distance_right=float(data.get('distance_right', 0))
        )


# Configuration constants
SENSOR_CONFIG = {
    'float_sensor': {
        'type': 'binary',
        'description': 'Water level detection'
    },
    'gyro': {
        'type': 'angle',
        'range': (-90, 90),
        'unit': 'degrees',
        'description': 'Trailer pitch/roll/yaw angles'
    },
    'distance_sensors': {
        'type': 'distance',
        'range': (0, 3000),  # 0-3000mm
        'unit': 'millimeters',
        'description': 'Boat positioning sensors (left and right)'
    }
}

# Thresholds
THRESHOLDS = {
    'boat_centered': {
        'tolerance': 50,  # mm - how close sensors should be
        'description': 'Boat is properly centered on trailer'
    },
    'trailer_level': {
        'tolerance': 5,  # degrees - acceptable tilt
        'description': 'Trailer is level (< 5 degrees)'
    }
}
