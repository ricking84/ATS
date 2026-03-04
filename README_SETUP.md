# ATS - Advanced Trailering System

A real-time visual trailering system with 3D visualization for monitoring boat positioning, water levels, and trailer angle using a web-based dashboard.

## Features

✨ **Real-Time 3D Visualization**
- 3D trailer and boat models that move based on sensor data
- Interactive angle display showing trailer pitch/roll/yaw
- Responsive design for desktop, tablet, and mobile (including CarPlay)

📊 **Sensor Monitoring**
1. **Float Sensor** - Shows water level (in/out of water)
2. **Gyro Sensor (MPU6050)** - Displays trailer angle with visual feedback
3. **Distance Sensors (x2)** - Monitors boat positioning for proper alignment

🌊 **Dashboard Displays**
- Water level gauge with real-time updates
- Boat alignment indicator (centered/offset warning)
- Distance sensor readings (left & right)
- Gyro angle display with level detection
- FPS counter and timestamp

## System Architecture

```
Arduino/Raspberry Pi
    ↓ (Bluetooth JSON data)
Python Backend (Flask + SocketIO)
    ↓ (WebSocket streaming)
Web Frontend (Three.js + JavaScript)
```

## Hardware Requirements

### On Boat Trailer (Arduino/Raspberry Pi):
- **Float Sensor** - Digital input (pin configurable)
- **MPU6050 Gyro/Accelerometer** - I2C connection
- **2x VL53L0X Distance Sensors** - I2C connection (with different addresses)
- **Bluetooth Module** - HC-05 or HC-06

### Backend Server:
- Python 3.8+
- Bluetooth adapter (or USB dongle)
- Network access for client devices

### Client:
- Any modern web browser
- Network connectivity to backend

## Installation

### Backend Setup

1. **Clone or navigate to repo:**
```bash
cd ATS
```

2. **Create Python virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run in demo mode (with simulated data):**
```bash
set DEMO_MODE=True
python app.py
```

5. **Run with real hardware (Bluetooth):**
```bash
set DEMO_MODE=False
python app.py
```

The backend server will start at `http://localhost:5000`

## Arduino/Raspberry Pi Code

Your Arduino or Raspberry Pi should send JSON data over Bluetooth every 100-500ms:

### Expected JSON Format:
```json
{
  "timestamp": 1678001234.567,
  "float_sensor": 1,
  "gyro_x": 12.5,
  "gyro_y": -3.2,
  "gyro_z": 1.8,
  "distance_left": 1500,
  "distance_right": 1480
}
```

### Arduino Example Code (C++):
```cpp
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>
#include <VL53L0X.h>
#include <SoftwareSerial.h>

// Hardware
SoftwareSerial BTSerial(10, 11);  // RX, TX to Bluetooth module
MPU6050 mpu;
VL53L0X sensor_left, sensor_right;

// GPIO pins
const int FLOAT_PIN = 12;

void setup() {
  Serial.begin(9600);
  BTSerial.begin(9600);
  Wire.begin();
  
  // Initialize sensors
  mpu.initialize();
  sensor_left.init();
  sensor_right.setAddress(0x30);
  
  pinMode(FLOAT_PIN, INPUT);
}

void loop() {
  // Read float sensor
  int floatSensor = digitalRead(FLOAT_PIN);
  
  // Read gyro
  int16_t gyroX, gyroY, gyroZ;
  mpu.getRotation(&gyroX, &gyroY, &gyroZ);
  
  float gyroXDeg = gyroX / 131.0;    // Convert to degrees (500°/s sensitivity)
  float gyroYDeg = gyroY / 131.0;
  float gyroZDeg = gyroZ / 131.0;
  
  // Read distance sensors
  uint16_t distLeft = sensor_left.readRangeContinuousMillimeters();
  uint16_t distRight = sensor_right.readRangeContinuousMillimeters();
  
  // Create JSON
  StaticJsonDocument<256> doc;
  doc["timestamp"] = millis() / 1000.0;
  doc["float_sensor"] = floatSensor;
  doc["gyro_x"] = gyroXDeg;
  doc["gyro_y"] = gyroYDeg;
  doc["gyro_z"] = gyroZDeg;
  doc["distance_left"] = distLeft;
  doc["distance_right"] = distRight;
  
  // Send over Bluetooth
  serializeJson(doc, BTSerial);
  BTSerial.println();  // Newline to separate messages
  
  delay(200);  // Send every 200ms
}
```

### Raspberry Pi Example Code (Python):
```python
import bluetooth
import json
import time
from datetime import datetime

# Assuming you have sensor code initialized (mpu6050, VL53L0X, GPIO)

def send_sensor_data():
    # Setup Bluetooth socket
    sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    sock.connect(("XX:XX:XX:XX:XX:XX", 1))  # Connect to receiver
    
    while True:
        # Read sensors (your existing code)
        float_level = GPIO.input(FLOAT_PIN)
        gyro = mpu.get_gyro_data()
        dist_left = tof_left.range
        dist_right = tof_right.range
        
        # Create JSON
        data = {
            "timestamp": datetime.now().timestamp(),
            "float_sensor": float_level,
            "gyro_x": gyro['x'],
            "gyro_y": gyro['y'],
            "gyro_z": gyro['z'],
            "distance_left": dist_left,
            "distance_right": dist_right
        }
        
        # Send over Bluetooth
        sock.send(json.dumps(data).encode())
        
        time.sleep(0.2)  # Send every 200ms
```

## Accessing the Dashboard

1. **From same computer:**
   - Open browser: `http://localhost:5000`

2. **From phone/tablet on same network:**
   - Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Linux/Mac)
   - Open: `http://<YOUR-IP>:5000` (e.g., `http://192.168.1.100:5000`)

3. **From Internet (Cloud):**
   - Use ngrok or port forwarding to expose the backend
   - `ngrok http 5000`

## Configuration

### Sensor Thresholds
Edit [Trailer/data_models.py](Trailer/data_models.py):
```python
THRESHOLDS = {
    'boat_centered': {
        'tolerance': 50,  # mm - how close sensors should be
    },
    'trailer_level': {
        'tolerance': 5,   # degrees - acceptable tilt
    }
}
```

### Backend Port
Edit [app.py](app.py) line with `socketio.run()`:
```python
socketio.run(app, host='0.0.0.0', port=5000)
```

## Testing

### Demo Mode
Run with simulated data - no hardware required:
```bash
set DEMO_MODE=True
python app.py
```

### Manual Testing
Generate test data locally:
```bash
python -m Trailer.sensor_simulator
```

## Project Structure

```
ATS/
├── app.py                           # Main Flask server
├── requirements.txt                 # Python dependencies
├── Trailer/
│   ├── __init__.py
│   ├── data_models.py              # Sensor data schema
│   ├── sensor_simulator.py         # Demo data generator
│   ├── bluetooth/
│   │   ├── bluetooth_receiver.py   # Bluetooth communication
│   │   ├── bluetooth_server.py     # Original BT code
│   │   └── syscheck.py
│   └── sensors/
│       ├── accelarometer.py
│       ├── float.py
│       ├── tof_laser.py
│       └── ...
└── web/
    ├── templates/
    │   └── index.html              # Frontend dashboard
    └── static/
        ├── css/
        │   └── style.css           # Dashboard styling
        └── js/
            ├── visualizer.js       # 3D visualization (Three.js)
            └── socket-handler.js   # WebSocket client
```

## Troubleshooting

### Connection Issues
- Ensure backend is running: `python app.py`
- Check firewall allows port 5000
- Verify Bluetooth module is paired and powered

### 3D Visualization Not Showing
- Check browser console (F12) for errors
- Ensure Three.js CDN is accessible
- Try different browser (Chrome recommended)

### Sensor Data Not Updating
- Verify demo mode is enabled: `set DEMO_MODE=True`
- Check WebSocket connection (DevTools → Network → WS)
- Confirm JSON format from Arduino/RPi is correct

## Features Roadmap

- [ ] Data logging and playback
- [ ] Alert notifications (boat misalignment, water level)
- [ ] Calibration wizard for sensors
- [ ] Mobile app wrapper
- [ ] Multi-trailer support
- [ ] Historical data graphs

## License

See LICENSE file

## Support

For issues or questions, please create an issue in the repository.

---

**Happy trailering! ⛵**
