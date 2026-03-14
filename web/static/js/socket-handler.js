/**
 * WebSocket Handler for ATS
 * Handles real-time communication with the backend
 */

console.log('Socket handler script loaded');

let socket = null;
let frameCount = 0;
let lastFrameTime = Date.now();
let fps = 0;

// Initialize socket immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting...');
    document.addEventListener('DOMContentLoaded', initSocket);
} else {
    // DOM is already ready since script is at end of body
    console.log('DOM ready, initializing socket...');
    initSocket();
}

function initSocket() {
    console.log('Initializing Socket.IO connection...');
    
    // Connect to the WebSocket server
    socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });
    
    console.log('Socket.IO instance created, socket object:', socket);
    console.log('Socket connected?', socket.connected);
    
    // Monitor connection with a timer too
    setTimeout(() => {
        console.log('Socket status after 1 second:', socket.connected);
        if (socket.connected) {
            console.log('Socket is connected, forcing status update');
            updateConnectionStatus(true);
        }
    }, 1000);
    
    // Connection events
    socket.on('connect', () => {
        console.log('✅ Connect event fired!');
        console.log('Connected to ATS Backend');
        updateConnectionStatus(true);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from ATS Backend');
        updateConnectionStatus(false);
    });
    
    socket.on('connection_response', (data) => {
        console.log('Backend response:', data);
    });
    
    socket.on('connection_error', (data) => {
        console.error('Backend error:', data);
        showErrorNotification(data.error);
    });
    
    // Sensor data updates
    socket.on('sensor_update', (data) => {
        handleSensorData(data);
    });
    
    // Request update every 500ms
    setInterval(() => {
        if (socket.connected) {
            socket.emit('request_update');
        }
    }, 500);
}

function updateConnectionStatus(connected) {
    console.log('Updating connection status to:', connected);
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    
    console.log('Indicator element:', indicator);
    console.log('Text element:', text);
    
    if (connected) {
        indicator.classList.remove('disconnected');
        indicator.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        indicator.classList.add('disconnected');
        text.textContent = 'Disconnected';
    }
}

function handleSensorData(data) {
    if (!visualizer) return;
    
    // Extract sensor values
    const floatSensor = data.float_sensor || false;
    const waterSensors = data.water_sensors || [false, false, false, false];
    const gyro = data.gyro || { x: 0, y: 0, z: 0 };
    const distance = data.distance || { left: 0, right: 0 };
    
    // Update 3D visualization
    visualizer.updateFloatSensor(floatSensor);
    visualizer.updateWaterSensors(waterSensors);
    visualizer.updateTrailerAngle(gyro.x, gyro.y, gyro.z);
    
    // Update UI displays
    updateWaterLevelDisplay(waterSensors);
    updateDistanceSensorsDisplay(distance.left, distance.right);
    updateGyroDisplay(gyro.x, gyro.y, gyro.z);
    updateTimestamp(data.timestamp);
    
    // Check boat alignment
    checkBoatAlignment(distance.left, distance.right);
    
    // Update FPS
    updateFPS();
}

function updateWaterLevelDisplay(sensorArray) {
    const fillElement = document.getElementById('water-fill');
    const statusElement = document.getElementById('water-status');
    const sensorContainer = document.getElementById('water-sensors');
    
    // determine active count
    let count = 0;
    if (Array.isArray(sensorArray)) {
        count = sensorArray.filter(Boolean).length;
        sensorArray.forEach((active, idx) => {
            const box = document.getElementById('sensor-' + idx);
            if (box) {
                if (active) box.classList.add('active');
                else box.classList.remove('active');
            }
        });
    }

    const fillHeight = (count / 4) * 100;
    fillElement.style.height = fillHeight + '%';
    
    if (count === 0) {
        statusElement.textContent = '🏜️ Out of Water';
        statusElement.classList.remove('in-water');
        statusElement.classList.add('out-water');
    } else if (count === 4) {
        statusElement.textContent = '🌊 FULLY IN WATER';
        statusElement.classList.add('in-water');
        statusElement.classList.remove('out-water');
    } else {
        statusElement.textContent = '🌊 Partial Contact';
        statusElement.classList.add('in-water');
        statusElement.classList.remove('out-water');
    }
}

function updateDistanceSensorsDisplay(left, right) {
    // Max distance is 3000mm
    const maxDistance = 3000;
    
    // Calculate progress percentages (inverted - closer = higher %)
    const leftPercent = Math.max(0, Math.min(100, (1 - (left / maxDistance)) * 100));
    const rightPercent = Math.max(0, Math.min(100, (1 - (right / maxDistance)) * 100));
    
    // Update bars
    document.getElementById('distance-left-bar').style.width = leftPercent + '%';
    document.getElementById('distance-right-bar').style.width = rightPercent + '%';
    
    // Update text values
    document.getElementById('distance-left-value').textContent = Math.round(left) + ' mm';
    document.getElementById('distance-right-value').textContent = Math.round(right) + ' mm';
}

function checkBoatAlignment(left, right) {
    const statusElement = document.getElementById('distance-status');
    const difference = Math.abs(left - right);
    const tolerance = 50; // mm
    
    if (difference <= tolerance) {
        statusElement.textContent = '✓ Boat Centered';
        statusElement.classList.add('centered');
        statusElement.classList.remove('warning');
    } else if (difference <= 150) {
        statusElement.textContent = '⚠️ Slight Offset';
        statusElement.classList.remove('centered');
        statusElement.classList.add('warning');
    } else {
        statusElement.textContent = '⚠️ Adjust Alignment';
        statusElement.classList.remove('centered');
        statusElement.classList.add('warning');
    }
}

function updateGyroDisplay(x, y, z) {
    // Update numeric displays in the compact gyro overlay
    document.getElementById('gyro-x').textContent = x.toFixed(1) + '°';
    document.getElementById('gyro-y').textContent = y.toFixed(1) + '°';
    document.getElementById('gyro-z').textContent = z.toFixed(1) + '°';
}

function updateTimestamp(timestamp) {
    const element = document.getElementById('last-update');
    const date = new Date(timestamp * 1000);
    const timeString = date.toLocaleTimeString();
    element.textContent = 'Last Update: ' + timeString;
}

function updateFPS() {
    frameCount++;
    const currentTime = Date.now();
    const elapsed = currentTime - lastFrameTime;
    
    if (elapsed >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = currentTime;
        
        const fpsElement = document.getElementById('frame-rate');
        fpsElement.textContent = 'FPS: ' + fps;
    }
}

function requestUpdate() {
    if (socket && socket.connected) {
        socket.emit('request_update');
    }
}

function showErrorNotification(message) {
    console.error('Error:', message);
    // You could add a toast notification here if desired
}

// Export for use in other scripts
window.socketHandler = {
    requestUpdate,
    socket: () => socket
};
