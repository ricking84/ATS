"""
Data models for ATS (Automated Trailering System)
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
        # Accept both flat and nested formats
        gyro = data.get('gyro', {})
        distance = data.get('distance', {})

        # Helper to read value from nested or flat keys
        def _g(k, nested_key=None, default=0.0):
            if nested_key and nested_key in gyro:
                return gyro.get(nested_key, default)
            if k in data:
                return data.get(k, default)
            return default

        def _d(k, nested_key=None, default=0.0):
            if nested_key and nested_key in distance:
                return distance.get(nested_key, default)
            if k in data:
                return data.get(k, default)
            return default

        return SensorData(
            timestamp=data.get('timestamp', datetime.now().timestamp()),
            float_sensor=bool(data.get('float_sensor', data.get('in_water', 0))),
            gyro_x=float(_g('gyro_x', 'x', 0)),
            gyro_y=float(_g('gyro_y', 'y', 0)),
            gyro_z=float(_g('gyro_z', 'z', 0)),
            distance_left=float(_d('distance_left', 'left', 0)),
            distance_right=float(_d('distance_right', 'right', 0))
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
