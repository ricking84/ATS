# ATS Quick Start Guide

## 📋 What You've Built

A **real-time 3D boat trailer visualization system** that displays:
- 🚤 Boat position on trailer (based on 2 distance sensors)
- 💧 Water level indicator (based on float sensor)
- 📐 Trailer angle/tilt (based on MPU6050 gyro)
- 📡 WebSocket real-time updates
- 🎨 Interactive 3D graphics
- 📱 Mobile/tablet/CarPlay compatible

---

## 🚀 Quick Start (Demo Mode)

### On Windows:
```bash
cd c:\Users\Richa\OneDrive\Documents\GitHub\ATS
run.bat
```

### On Mac/Linux:
```bash
cd ~/Documents/GitHub/ATS
bash run.sh
```

The server starts at **http://localhost:5000**

---

## 📱 Access the Dashboard

### 1. **On Same Computer:**
   - Open browser: `http://localhost:5000`

### 2. **From Phone/Tablet on Same WiFi:**
   - Find your computer's IP:
     - **Windows:** `ipconfig` → Look for IPv4 Address
     - **Mac/Linux:** `ifconfig | grep inet`
   - Open: `http://<YOUR-IP>:5000`
   - Example: `http://192.168.1.100:5000`

### 3. **From Internet (Cloud):**
   - Use ngrok (free): `ngrok http 5000`
   - Open the ngrok URL from any device

---

## 🔧 System Architecture

```
┌─────────────────────────────────┐
│   Boat Trailer Hardware         │
│  (Arduino/Raspberry Pi)         │
│  • MPU6050 Gyro                 │
│  • 2x VL53L0X Distance          │
│  • Float Sensor                 │
└──────────┬──────────────────────┘
           │ Bluetooth JSON
           ↓
┌──────────────────────────────────┐
│   Python Backend (Flask)         │
│  • WebSocket Server              │
│  • Data Processing               │
│  • Bluetooth Receiver            │
└──────────┬───────────────────────┘
           │ WebSocket
           ↓
┌──────────────────────────────────┐
│   Web Frontend                   │
│  • Three.js 3D Visualization     │
│  • Real-time Dashboard           │
│  • Mobile Responsive             │
└──────────────────────────────────┘
```

---

## 📦 Project Files Breakdown

### Backend Files
- **`app.py`** - Main Flask server with WebSocket
- **`config.py`** - Configuration settings
- **`Trailer/data_models.py`** - Sensor data schema
- **`Trailer/sensor_simulator.py`** - Demo data generator
- **`Trailer/bluetooth/bluetooth_receiver.py`** - Bluetooth communication

### Frontend Files
- **`web/templates/index.html`** - Dashboard layout
- **`web/static/css/style.css`** - Dashboard styling
- **`web/static/js/visualizer.js`** - 3D visualization (Three.js)
- **`web/static/js/socket-handler.js`** - WebSocket client

### Hardware Examples
- **`Arduino_Example.ino`** - Arduino code for sensors
- **`Raspberry_Pi_Example.py`** - Raspberry Pi code for sensors

---

## 🎯 Next Steps

### Phase 1: Test with Demo Data ✓ (You are here)
```bash
# Already running with simulated data
# The 3D visualization shows:
# - Boat moving on trailer
# - Water level changing
# - Trailer rocking angle
```

### Phase 2: Connect Real Hardware 🔲
1. **Upload code to Arduino/Raspberry Pi:**
   - Arduino: Use `Arduino_Example.ino`
   - Raspberry Pi: Use `Raspberry_Pi_Example.py`

2. **Run backend with real hardware:**
   ```bash
   # On Windows
   set DEMO_MODE=False
   python app.py
   
   # On Mac/Linux
   export DEMO_MODE=False
   python app.py
   ```

3. **Verify Bluetooth connection:**
   - Check sensor data appears on dashboard
   - Verify 3D model updates in real-time

### Phase 3: Deploy to Cloud ☁️
- Use ngrok, AWS, or your hosting provider
- Access from anywhere on internet
- Set up for CarPlay integration

---

## 🎮 Dashboard Controls & Displays

### 1. **3D Trailer View (Left Panel)**
   - **Shows:** 3D model of trailer, boat, and water
   - **Moves:** Based on gyro angle
   - **Displays:** Current gyro angle and boat alignment

### 2. **Water Level (Top Right)**
   - **Gauge:** Shows percentage (0-100%)
   - **Color:** Blue when in water, gray when out
   - **Status:** "In Water" or "Out of Water"

### 3. **Distance Sensors (Middle Right)**
   - **Left/Right Bars:** Show distance (0-3000mm)
   - **Status:** 
     - ✓ "Boat Centered" (within 50mm)
     - ⚠️ "Slight Offset" (within 150mm)
     - ⚠️ "Adjust Alignment" (more than 150mm)

### 4. **Gyro Angle Display (Bottom Right)**
   - **Gauge:** Circular display showing angle
   - **Values:** X (Pitch), Y (Roll), Z (Yaw)
   - **Status:** Level if < 5° tilt

### 5. **Footer**
   - **Last Update:** Timestamp of latest sensor data
   - **FPS:** Frames per second for 3D rendering

---

## 📊 Sensor Data Format

### JSON sent from Arduino/Raspberry Pi:
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

### Sensor Ranges:
- **float_sensor:** 0 (out) or 1 (in water)
- **gyro_x/y/z:** -180° to +180°
- **distance_left/right:** 0-3000 mm

---

## 🔌 Arduino Wiring

```
MPU6050:        Bluetooth Module:    Distance Sensors:   Float Sensor:
├─ VCC → 5V     ├─ VCC → 5V        ├─ VCC → 5V        └─ GPIO 12
├─ GND → GND    ├─ GND → GND       ├─ GND → GND
├─ SDA → A4     ├─ TX → Pin 11     ├─ SDA → A4
└─ SCL → A5     └─ RX → Pin 10     └─ SCL → A5
```

---

## 🐍 Raspberry Pi Wiring

```
MPU6050:        Bluetooth UART:     Distance Sensors:   Float Sensor:
├─ VCC → 3.3V   ├─ GND → GND       ├─ VCC → 3.3V      └─ GPIO 17
├─ GND → GND    ├─ TX → GPIO 14    ├─ GND → GND
├─ SDA → GPIO 2 └─ RX → GPIO 15    ├─ SDA → GPIO 2
└─ SCL → GPIO 3                    └─ SCL → GPIO 3
```

---

## ⚙️ Configuration

Edit **`config.py`** to customize:

```python
# Sensor ranges
THRESHOLDS = {
    'boat_alignment': {
        'centered_tolerance_mm': 50,  # How close to center?
    },
    'trailer_level': {
        'level_tolerance_deg': 5,     # How level?
    }
}

# Server settings
SERVER_PORT = 5000  # Change if needed
DEMO_MODE = True    # Toggle demo/real hardware
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Dashboard won't load** | 1. Check backend is running<br>2. Verify port 5000 is accessible<br>3. Check browser console (F12) for errors |
| **3D model not moving** | 1. Confirm WebSocket connected (DevTools)<br>2. Check sensor data is being sent<br>3. Try different browser (Chrome recommended) |
| **"Disconnected" status** | 1. Verify backend running (`python app.py`)<br>2. Check firewall allows port 5000<br>3. See console logs for errors |
| **No sensor data in demo** | 1. Ensure `DEMO_MODE=True`<br>2. Check browser console for JS errors<br>3. Reload page |
| **Bluetooth connection fails** | 1. Verify device is paired<br>2. Check baud rate matches (9600)<br>3. Confirm JSON format is correct |

---

## 📚 File Descriptions

### Core Application
| File | Purpose |
|------|---------|
| `app.py` | Flask server + WebSocket endpoint |
| `Trailer/data_models.py` | Sensor data classes |
| `Trailer/sensor_simulator.py` | Demo data generator |
| `Trailer/bluetooth/bluetooth_receiver.py` | Bluetooth input handler |

### Frontend
| File | Purpose |
|------|---------|
| `web/templates/index.html` | Webpage structure |
| `web/static/css/style.css` | Dashboard styling |
| `web/static/js/visualizer.js` | 3D graphics (Three.js) |
| `web/static/js/socket-handler.js` | Real-time updates |

### Configuration
| File | Purpose |
|------|---------|
| `config.py` | System settings |
| `requirements.txt` | Python dependencies |

---

## 🚀 Performance

- **Update Rate:** 100ms (10 updates/second)
- **3D Frame Rate:** 60 FPS (desktop)
- **Network Bandwidth:** ~5KB per update
- **Latency:** <200ms typical

---

## 📝 Tips for Real Deployment

1. **Calibrate Gyro**
   - Keep trailer level and still
   - Run calibration routine (auto in code)
   - Offsets applied automatically

2. **Position Distance Sensors**
   - Mount sensors 1.5m apart (boat width)
   - Point towards boat side
   - 0-3000mm range gives best accuracy

3. **Mount Float Sensor**
   - Position at desired water level
   - Use waterproof housing
   - Test in actual water conditions

4. **Optimize for Your Boat**
   - Update boat dimensions in `visualizer.js`
   - Adjust tolerance thresholds in `config.py`
   - Calibrate sensor ranges

---

## 🎓 Learning Resources

- **Three.js 3D Graphics:** https://threejs.org/
- **Flask WebSocket:** https://python-socketio.readthedocs.io/
- **Arduino Sensor Libraries:**
  - MPU6050: https://github.com/jrowberg/mpu6050
  - VL53L0X: https://github.com/adafruit/Adafruit_CircuitPython_VL53L0X
- **Raspberry Pi I2C:** https://www.raspberrypi.org/documentation/hardware/raspberrypi/i2c/

---

## 📞 Support

For issues:
1. Check console logs: `python app.py` (backend) or F12 (browser)
2. Enable debug mode in `config.py`
3. Check sensor connections and wiring
4. Verify JSON format from hardware

---

## 🎉 You're All Set!

Your ATS system is ready to track boat trailers in real-time. Start with demo mode to explore all features, then connect your sensors when ready!

**Next:** Run `run.bat` (or `run.sh`) and open your browser to `http://localhost:5000`

Happy trailering! ⛵

---

*Last updated: March 2026*
*ATS v1.0 - Automated Trailering System*
