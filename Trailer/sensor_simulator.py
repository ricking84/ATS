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
    
    def get_simulated_data(self) -> SensorData:
        """Generate simulated sensor data"""
        
        # Simulate time progression
        elapsed = time.time() - self.start_time
        
        # 1. Float sensor - oscillates every 10 seconds
        float_sensor = 1 if (elapsed % 20) < 10 else 0
        
        # 2. Gyro data - simulate gentle rocking motion
        gyro_x = math.sin(elapsed * 0.3) * 15  # Pitch: ±15 degrees
        gyro_y = math.cos(elapsed * 0.2) * 8   # Roll: ±8 degrees
        gyro_z = math.sin(elapsed * 0.15) * 5  # Yaw: ±5 degrees
        
        # 3. Distance sensors - simulate boat positioning
        # Left sensor - starts at 1500mm, with some variation
        base_distance = 1500
        variation = math.sin(elapsed * 0.4) * 200  # ±200mm variation
        noise_left = math.sin(elapsed * 0.7) * 50   # ±50mm noise
        distance_left = base_distance + variation + noise_left
        
        # Right sensor - slightly offset to simulate centering
        offset = math.cos(elapsed * 0.35) * 150    # Centering motion
        noise_right = math.cos(elapsed * 0.8) * 50  # ±50mm noise
        distance_right = base_distance + offset + noise_right
        
        # Ensure distances are within realistic range
        distance_left = max(100, min(3000, distance_left))
        distance_right = max(100, min(3000, distance_right))
        
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
