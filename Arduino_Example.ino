/**
 * ATS Sensor Data Sender - Arduino Code
 * 
 * This code reads sensors and sends data to the backend via Bluetooth
 * 
 * Required Libraries:
 * - ArduinoJson (for JSON support)
 * - MPU6050 (for accelerometer/gyro)
 * - VL53L0X (for distance sensors)
 * 
 * Hardware Connections:
 * - Bluetooth Module: TX to pin 11, RX to pin 10
 * - MPU6050: SDA to A4, SCL to A5 (I2C)
 * - VL53L0X (Left): SDA to A4, SCL to A5, Address: 0x29
 * - VL53L0X (Right): SDA to A4, SCL to A5, Address: 0x30 (after init)
 * - Float Sensor: Pin 12
 */

#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>
#include <VL53L0X.h>
#include <SoftwareSerial.h>

// ===== Configuration =====
const int TX_PIN = 11;
const int RX_PIN = 10;
const int FLOAT_SENSOR_PIN = 12;
const int SEND_INTERVAL_MS = 200;  // Send every 200ms

// ===== Global Objects =====
SoftwareSerial BTSerial(RX_PIN, TX_PIN);  // Bluetooth module
MPU6050 mpu;
VL53L0X sensor_left;
VL53L0X sensor_right;

// ===== Sensor Calibration =====
// You may need to adjust these based on your specific sensors
const float ACCEL_SCALE = 16384.0;      // For ±2g range
const float GYRO_SCALE = 131.0;         // For ±250°/s range

// Gyro offset (calibrate by averaging readings at rest)
float gyroOffsetX = 0;
float gyroOffsetY = 0;
float gyroOffsetZ = 0;

// ===== Filtering =====
const float ALPHA = 0.7;  // Low-pass filter coefficient (0-1, higher = more smoothing)
float filtered_gyroX = 0, filtered_gyroY = 0, filtered_gyroZ = 0;
float filtered_distLeft = 0, filtered_distRight = 0;

// ===== Timing =====
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(9600);      // Serial monitor for debugging
  BTSerial.begin(9600);    // Bluetooth at 9600 baud (adjust if needed)
  Wire.begin();
  
  delay(1000);
  
  Serial.println("\n=== ATS Sensor Initialization ===");
  
  // Initialize float sensor pin
  pinMode(FLOAT_SENSOR_PIN, INPUT);
  Serial.println("✓ Float sensor initialized");
  
  // Initialize MPU6050
  if (!mpu.testConnection()) {
    Serial.println("✗ MPU6050 not found!");
    while (1);
  }
  mpu.initialize();
  Serial.println("✓ MPU6050 initialized");
  
  // Initialize VL53L0X sensors
  if (!sensor_left.init()) {
    Serial.println("✗ Left distance sensor not found!");
    while (1);
  }
  sensor_left.setAddress(0x29);
  Serial.println("✓ Left distance sensor initialized");
  
  if (!sensor_right.init()) {
    Serial.println("✗ Right distance sensor not found!");
    while (1);
  }
  sensor_right.setAddress(0x30);
  Serial.println("✓ Right distance sensor initialized");
  
  // Start continuous ranging
  sensor_left.startContinuous();
  sensor_right.startContinuous();
  
  // Calibrate gyro (average ~100 readings at rest)
  Serial.println("Calibrating gyro (keep sensor still)...");
  calibrateGyro();
  Serial.println("✓ Gyro calibrated");
  
  Serial.println("\n=== ATS Ready ===");
  Serial.println("Sending sensor data every " + String(SEND_INTERVAL_MS) + "ms");
}

void loop() {
  // Send data at regular intervals
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();
    sendSensorData();
  }
}

/**
 * Calibrate the gyro by averaging readings at rest
 */
void calibrateGyro() {
  float sumX = 0, sumY = 0, sumZ = 0;
  const int CALIB_SAMPLES = 100;
  
  for (int i = 0; i < CALIB_SAMPLES; i++) {
    int16_t gx, gy, gz;
    mpu.getRotation(&gx, &gy, &gz);
    
    sumX += gx / GYRO_SCALE;
    sumY += gy / GYRO_SCALE;
    sumZ += gz / GYRO_SCALE;
    
    delay(10);
  }
  
  gyroOffsetX = sumX / CALIB_SAMPLES;
  gyroOffsetY = sumY / CALIB_SAMPLES;
  gyroOffsetZ = sumZ / CALIB_SAMPLES;
}

/**
 * Read all sensors and send via Bluetooth
 */
void sendSensorData() {
  // ===== Read Float Sensor =====
  int floatLevel = digitalRead(FLOAT_SENSOR_PIN);
  
  // ===== Read Gyro (with calibration) =====
  int16_t gx, gy, gz;
  mpu.getRotation(&gx, &gy, &gz);
  
  float rawGyroX = (gx / GYRO_SCALE) - gyroOffsetX;
  float rawGyroY = (gy / GYRO_SCALE) - gyroOffsetY;
  float rawGyroZ = (gz / GYRO_SCALE) - gyroOffsetZ;
  
  // Apply low-pass filter
  filtered_gyroX = ALPHA * rawGyroX + (1 - ALPHA) * filtered_gyroX;
  filtered_gyroY = ALPHA * rawGyroY + (1 - ALPHA) * filtered_gyroY;
  filtered_gyroZ = ALPHA * rawGyroZ + (1 - ALPHA) * filtered_gyroZ;
  
  // ===== Read Distance Sensors =====
  uint16_t rawDistLeft = sensor_left.readRangeContinuousMillimeters();
  uint16_t rawDistRight = sensor_right.readRangeContinuousMillimeters();
  
  // Apply low-pass filter
  if (filtered_distLeft == 0) {
    filtered_distLeft = rawDistLeft;
  } else {
    filtered_distLeft = ALPHA * rawDistLeft + (1 - ALPHA) * filtered_distLeft;
  }
  
  if (filtered_distRight == 0) {
    filtered_distRight = rawDistRight;
  } else {
    filtered_distRight = ALPHA * rawDistRight + (1 - ALPHA) * filtered_distRight;
  }
  
  // ===== Create JSON Document =====
  StaticJsonDocument<256> doc;
  
  doc["timestamp"] = millis() / 1000.0;
  doc["float_sensor"] = floatLevel;
  doc["gyro_x"] = filtered_gyroX;
  doc["gyro_y"] = filtered_gyroY;
  doc["gyro_z"] = filtered_gyroZ;
  doc["distance_left"] = (int)filtered_distLeft;
  doc["distance_right"] = (int)filtered_distRight;
  
  // ===== Send over Bluetooth =====
  serializeJson(doc, BTSerial);
  BTSerial.println();  // Add newline to separate messages
  
  // ===== Debug Output (optional) =====
  Serial.print("Float: ");
  Serial.print(floatLevel);
  Serial.print(" | Gyro: ");
  Serial.print(filtered_gyroX, 1);
  Serial.print(", ");
  Serial.print(filtered_gyroY, 1);
  Serial.print(", ");
  Serial.print(filtered_gyroZ, 1);
  Serial.print(" | Dist: ");
  Serial.print((int)filtered_distLeft);
  Serial.print(", ");
  Serial.println((int)filtered_distRight);
}
