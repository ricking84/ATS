#!/usr/bin/env python3
"""
ATS Sensor Data Sender - Raspberry Pi Code
Reads sensors and sends data to the backend via Bluetooth

Required Libraries:
    pip install pybluez RPi.GPIO adafruit-circuitpython-vl53l0x adafruit-circuitpython-mpu6050

Hardware Connections:
    - Bluetooth Module: Connect to Raspberry Pi UART (GPIO 14 TX, GPIO 15 RX)
    - MPU6050: SDA to GPIO 2, SCL to GPIO 3 (I2C)
    - VL53L0X (Left): SDA to GPIO 2, SCL to GPIO 3, Address: 0x29
    - VL53L0X (Right): SDA to GPIO 2, SCL to GPIO 3, Address: 0x30
    - Float Sensor: GPIO 17
"""

import json
import time
import math
import threading
from datetime import datetime
from collections import deque

# Hardware libraries
import RPi.GPIO as GPIO
import board
import busio
import adafruit_vl53l0x
from adafruit_mpu6050 import MPU6050
import bluetooth

# ===== Configuration =====
FLOAT_SENSOR_PIN = 17
SEND_INTERVAL = 0.2  # Send every 200ms
BLUETOOTH_ADDRESS = None  # Will be set during discovery
BLUETOOTH_PORT = 1
FILTER_SAMPLES = 5  # Number of samples for rolling average

# ===== Global Variables =====
i2c = None
mpu = None
tof_left = None
tof_right = None
bluetooth_socket = None
running = True

# Rolling average filters
gyro_buffer = {"x": deque(maxlen=FILTER_SAMPLES), 
               "y": deque(maxlen=FILTER_SAMPLES), 
               "z": deque(maxlen=FILTER_SAMPLES)}
distance_buffer = {"left": deque(maxlen=FILTER_SAMPLES),
                   "right": deque(maxlen=FILTER_SAMPLES)}

# Gyro calibration offsets
gyro_offset = {"x": 0, "y": 0, "z": 0}


def setup_gpio():
    """Initialize GPIO pins"""
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(FLOAT_SENSOR_PIN, GPIO.IN)
    print("✓ GPIO setup complete")


def setup_i2c():
    """Initialize I2C bus"""
    global i2c
    i2c = busio.I2C(board.SCL, board.SDA)
    print("✓ I2C bus initialized")


def setup_mpu6050():
    """Initialize MPU6050 gyro/accelerometer"""
    global mpu
    try:
        mpu = MPU6050(i2c)
        print("✓ MPU6050 initialized")
    except Exception as e:
        print(f"✗ Failed to initialize MPU6050: {e}")
        return False
    return True


def setup_distance_sensors():
    """Initialize VL53L0X distance sensors"""
    global tof_left, tof_right
    try:
        # Left sensor (default address 0x29)
        tof_left = adafruit_vl53l0x.VL53L0X(i2c)
        print("✓ Left distance sensor initialized")
        
        # Right sensor (custom address 0x30)
        # Note: You need to change this address in the sensor's firmware or use 
        # a multiplexer if using two sensors with same I2C bus
        tof_right = adafruit_vl53l0x.VL53L0X(i2c)
        print("✓ Right distance sensor initialized")
        
    except Exception as e:
        print(f"✗ Failed to initialize distance sensors: {e}")
        return False
    return True


def calibrate_gyro(samples=100):
    """Calibrate gyro by averaging readings at rest"""
    print(f"Calibrating gyro ({samples} samples - keep still)...")
    
    sum_x, sum_y, sum_z = 0, 0, 0
    
    for i in range(samples):
        gyro = mpu.gyro
        sum_x += gyro[0]
        sum_y += gyro[1]
        sum_z += gyro[2]
        time.sleep(0.01)
    
    gyro_offset["x"] = sum_x / samples
    gyro_offset["y"] = sum_y / samples
    gyro_offset["z"] = sum_z / samples
    
    print(f"✓ Gyro calibration complete")
    print(f"  Offset X: {gyro_offset['x']:.3f}")
    print(f"  Offset Y: {gyro_offset['y']:.3f}")
    print(f"  Offset Z: {gyro_offset['z']:.3f}")


def get_filtered_value(buffer):
    """Calculate average from buffer"""
    if not buffer:
        return 0
    return sum(buffer) / len(buffer)


def read_sensors():
    """Read all sensors"""
    try:
        # Float sensor
        float_level = GPIO.input(FLOAT_SENSOR_PIN)
        
        # Gyro (with calibration and filtering)
        gyro = mpu.gyro
        gyro_x = gyro[0] - gyro_offset["x"]
        gyro_y = gyro[1] - gyro_offset["y"]
        gyro_z = gyro[2] - gyro_offset["z"]
        
        # Add to buffers
        gyro_buffer["x"].append(gyro_x)
        gyro_buffer["y"].append(gyro_y)
        gyro_buffer["z"].append(gyro_z)
        
        # Distance sensors
        dist_left = tof_left.range
        dist_right = tof_right.range
        
        distance_buffer["left"].append(dist_left)
        distance_buffer["right"].append(dist_right)
        
        return {
            "float_sensor": float_level,
            "gyro_x": get_filtered_value(gyro_buffer["x"]),
            "gyro_y": get_filtered_value(gyro_buffer["y"]),
            "gyro_z": get_filtered_value(gyro_buffer["z"]),
            "distance_left": int(get_filtered_value(distance_buffer["left"])),
            "distance_right": int(get_filtered_value(distance_buffer["right"]))
        }
    
    except Exception as e:
        print(f"Error reading sensors: {e}")
        return None


def send_via_bluetooth(data):
    """Send sensor data via Bluetooth"""
    if not bluetooth_socket:
        return
    
    try:
        # Add timestamp
        data["timestamp"] = datetime.now().timestamp()
        
        # Convert to JSON and send
        json_data = json.dumps(data)
        bluetooth_socket.send(json_data.encode() + b"\n")
        
    except Exception as e:
        print(f"Error sending via Bluetooth: {e}")


def discover_bluetooth_device(target_name="ATS_SensorData"):
    """Discover and connect to Bluetooth receiver"""
    global BLUETOOTH_ADDRESS
    
    print("\nSearching for ATS receiver...")
    nearby_devices = bluetooth.discover_devices(lookup_names=True)
    
    for addr, name in nearby_devices:
        if target_name in name:
            BLUETOOTH_ADDRESS = addr
            print(f"✓ Found ATS receiver: {name} ({addr})")
            return
    
    print(f"✗ Could not find ATS receiver")
    return None


def connect_bluetooth():
    """Connect to Bluetooth receiver"""
    global bluetooth_socket
    
    if not BLUETOOTH_ADDRESS:
        discover_bluetooth_device()
        if not BLUETOOTH_ADDRESS:
            return False
    
    try:
        bluetooth_socket = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        bluetooth_socket.connect((BLUETOOTH_ADDRESS, BLUETOOTH_PORT))
        print(f"✓ Connected to Bluetooth receiver at {BLUETOOTH_ADDRESS}")
        return True
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return False


def sensor_loop():
    """Main sensor reading loop"""
    global running
    
    print("\n=== ATS Sensor Started ===")
    print(f"Sending data every {SEND_INTERVAL}s\n")
    
    while running:
        try:
            # Read sensors
            sensor_data = read_sensors()
            
            if sensor_data:
                # Print to console
                print(f"Float: {sensor_data['float_sensor']} | "
                      f"Gyro: {sensor_data['gyro_x']:.1f}° "
                      f"({sensor_data['gyro_y']:.1f}°, "
                      f"{sensor_data['gyro_z']:.1f}°) | "
                      f"Dist: {sensor_data['distance_left']}mm, "
                      f"{sensor_data['distance_right']}mm")
                
                # Send via Bluetooth
                send_via_bluetooth(sensor_data)
            
            time.sleep(SEND_INTERVAL)
        
        except KeyboardInterrupt:
            running = False
        except Exception as e:
            print(f"Sensor loop error: {e}")
            time.sleep(1)


def cleanup():
    """Clean up resources"""
    global running
    running = False
    
    if bluetooth_socket:
        try:
            bluetooth_socket.close()
        except:
            pass
    
    GPIO.cleanup()
    print("\n✓ Cleanup complete")


def main():
    """Main function"""
    try:
        print("\n===== ATS Raspberry Pi Sensor Node =====\n")
        
        # Setup
        print("Initializing hardware...")
        setup_gpio()
        setup_i2c()
        
        if not setup_mpu6050():
            print("Failed to initialize sensors")
            return
        
        if not setup_distance_sensors():
            print("Warning: Distance sensors not ready")
        
        # Calibrate
        calibrate_gyro()
        
        # Connect Bluetooth
        print("\nConnecting to Bluetooth receiver...")
        if not connect_bluetooth():
            print("Warning: Could not connect to Bluetooth, continuing anyway...")
        
        # Run sensor loop
        sensor_loop()
    
    except Exception as e:
        print(f"Fatal error: {e}")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
