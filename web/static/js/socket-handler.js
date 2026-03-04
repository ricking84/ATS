/**
 * WebSocket Handler for ATS
 * Handles real-time communication with the backend
 */

let socket = null;
let frameCount = 0;
let lastFrameTime = Date.now();
let fps = 0;

document.addEventListener('DOMContentLoaded', () => {
    initSocket();
});

function initSocket() {
    // Connect to the WebSocket server
    socket = io();
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to ATS Backend');
        updateConnectionStatus(true);
        requestUpdate();
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
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    
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
    const gyro = data.gyro || { x: 0, y: 0, z: 0 };
    const distance = data.distance || { left: 0, right: 0 };
    
    // Update 3D visualization
    visualizer.updateFloatSensor(floatSensor);
    visualizer.updateTrailerAngle(gyro.x, gyro.y, gyro.z);
    visualizer.updateBoatPosition(distance.left, distance.right);
    
    // Update UI displays
    updateWaterLevelDisplay(floatSensor);
    updateDistanceSensorsDisplay(distance.left, distance.right);
    updateGyroDisplay(gyro.x, gyro.y, gyro.z);
    updateTimestamp(data.timestamp);
    
    // Check boat alignment
    checkBoatAlignment(distance.left, distance.right);
    
    // Update FPS
    updateFPS();
}

function updateWaterLevelDisplay(inWater) {
    const fillElement = document.getElementById('water-fill');
    const statusElement = document.getElementById('water-status');
    
    const fillHeight = inWater ? 100 : 0;
    fillElement.style.height = fillHeight + '%';
    
    if (inWater) {
        statusElement.textContent = '🌊 IN WATER';
        statusElement.classList.add('in-water');
        statusElement.classList.remove('out-water');
    } else {
        statusElement.textContent = '🏜️ Out of Water';
        statusElement.classList.remove('in-water');
        statusElement.classList.add('out-water');
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
    // Update numeric displays
    document.getElementById('gyro-x').textContent = x.toFixed(1) + '°';
    document.getElementById('gyro-y').textContent = y.toFixed(1) + '°';
    document.getElementById('gyro-z').textContent = z.toFixed(1) + '°';
    
    // Update main display
    document.getElementById('gyro-display').textContent = x.toFixed(1) + '°';
    
    // Update angle needle (using X rotation as primary angle)
    const needle = document.getElementById('angle-needle');
    needle.style.transform = `translateX(-50%) rotate(${x}deg)`;
    
    // Update alignment status - check if level (within tolerance)
    const tolerance = 5; // degrees
    const alignmentStatus = document.getElementById('alignment-status');
    
    if (Math.abs(x) <= tolerance && Math.abs(y) <= tolerance) {
        alignmentStatus.textContent = '✓ Level';
        alignmentStatus.style.color = '#43a047';
    } else {
        alignmentStatus.textContent = '⚠️ Tilted';
        alignmentStatus.style.color = '#fb8c00';
    }
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
