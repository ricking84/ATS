"""
Sensor Data Simulator for ATS
Generates realistic simulated sensor data for testing
"""

import time
import math
import json
import logging
from Trailer.data_models import SensorData
from datetime import datetime

logger = logging.getLogger(__name__)


class SensorSimulator:
    """Simulates sensor data for testing"""
    
    def __init__(self):
        self.start_time = time.time()
        self.time_offset = 0
        # Ramp simulation parameters
        self.ramp_start = 2.0        # seconds before the trailer starts descending
        self.ramp_duration = 18.0    # seconds to reach water
        self.max_pitch = 15.0        # degrees at bottom of ramp
        self.min_distance = 200.0    # mm when at the end (boat near)
        self.start_distance = 2500.0 # mm starting distance
        self.water_triggered = False
    
    def get_simulated_data(self) -> SensorData:
        """Generate simulated sensor data"""
        
        # Simulate time progression
        elapsed = time.time() - self.start_time
        # Default values
        float_sensor = 0
        gyro_x = 0.0
        gyro_y = 0.0
        gyro_z = 0.0
        distance_left = self.start_distance
        distance_right = self.start_distance

        # Before ramp begins - mild idle motion
        if elapsed < self.ramp_start:
            gyro_x = math.sin(elapsed * 0.3) * 2.0
            gyro_y = math.cos(elapsed * 0.2) * 1.5
            gyro_z = math.sin(elapsed * 0.15) * 1.0
        else:
            # Progress along ramp from 0 -> 1
            t = min(1.0, max(0.0, (elapsed - self.ramp_start) / self.ramp_duration))
            # Smooth easing (easeInOut)
            ease = 0.5 - 0.5 * math.cos(math.pi * t)

            # Pitch increases toward max_pitch
            gyro_x = ease * self.max_pitch
            # Small roll/yaw variations
            gyro_y = math.cos(elapsed * 0.4) * 2.0 * (1.0 - t)
            gyro_z = math.sin(elapsed * 0.35) * 1.5 * (1.0 - t)

            # Distances move as boat progresses onto trailer
            avg_distance = self.start_distance + (self.min_distance - self.start_distance) * ease
            # Add small noise
            noise = math.sin(elapsed * 0.9) * 20
            distance_left = max(50.0, avg_distance + noise + math.cos(elapsed * 0.7) * 10)
            distance_right = max(50.0, avg_distance + noise + math.sin(elapsed * 0.65) * 10)

            # When fully down ramp, trigger float sensor (in water)
            if t >= 1.0 and not self.water_triggered:
                self.water_triggered = True
                float_sensor = 1
            elif self.water_triggered:
                float_sensor = 1

        # If water already triggered, hold final values
        if self.water_triggered:
            gyro_x = self.max_pitch
            # distances near minimum to indicate boat in place
            distance_left = max(50.0, self.min_distance + math.sin(elapsed * 0.2) * 5)
            distance_right = max(50.0, self.min_distance + math.cos(elapsed * 0.2) * 5)

        # Create sensor data
        sensor_data = SensorData(
            timestamp=datetime.now().timestamp(),
            float_sensor=bool(float_sensor),
            gyro_x=gyro_x,
            gyro_y=gyro_y,
            gyro_z=gyro_z,
            distance_left=distance_left,
            distance_right=distance_right
        )
        
        return sensor_data
    
    def simulate_arduino_message(self) -> str:
        """Generate a JSON message in Arduino format"""
        data = self.get_simulated_data()
        return json.dumps(data.to_dict())


class MockBluetoothReceiver:
    """Mock Bluetooth receiver for testing (replaces real hardware)"""
    
    def __init__(self):
        self.simulator = SensorSimulator()
        self.is_connected = True
    
    def receive_sensor_data(self) -> dict:
        """
        Receive simulated sensor data
        (In production, this would receive from real Bluetooth)
        """
        time.sleep(0.1)  # Simulate transmission delay
        data = self.simulator.get_simulated_data()
        logger.info(f'Simulated sensor data: {data}')
        return data.to_dict()
    
    def close(self):
        """Close connection"""
        self.is_connected = False


# Example usage for testing
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    simulator = SensorSimulator()
    
    print("ATS Sensor Simulator")
    print("=" * 50)
    
    # Generate 10 simulated data points
    for i in range(10):
        data = simulator.get_simulated_data()
        print(f"\nData Point {i+1}:")
        print(f"  Float Sensor: {'IN WATER' if data.float_sensor else 'OUT OF WATER'}")
        print(f"  Gyro X (Pitch): {data.gyro_x:.1f}°")
        print(f"  Gyro Y (Roll): {data.gyro_y:.1f}°")
        print(f"  Gyro Z (Yaw): {data.gyro_z:.1f}°")
        print(f"  Distance Left: {data.distance_left:.0f}mm")
        print(f"  Distance Right: {data.distance_right:.0f}mm")
        
        # Show JSON format
        json_msg = simulator.simulate_arduino_message()
        print(f"  JSON Message: {json_msg}")
        
        time.sleep(0.5)
