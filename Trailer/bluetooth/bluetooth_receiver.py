"""
Bluetooth receiver for ATS
Receives sensor data from Arduino/Raspberry Pi via Bluetooth
"""

import bluetooth
import json
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class BluetoothReceiver:
    """Handles Bluetooth communication for sensor data"""
    
    def __init__(self, uuid: str = "94f39d29-7d6d-437d-973b-fba39e49d4ee", 
                 service_name: str = "ATS_SensorData"):
        """
        Initialize Bluetooth receiver
        
        Args:
            uuid: Service UUID
            service_name: Bluetooth service name
        """
        self.uuid = uuid
        self.service_name = service_name
        self.server_sock = None
        self.client_sock = None
        self.is_connected = False
        
        self._setup_bluetooth_server()
    
    def _setup_bluetooth_server(self):
        """Setup Bluetooth RFCOMM server"""
        try:
            self.server_sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            self.server_sock.bind(("", bluetooth.PORT_ANY))
            self.server_sock.listen(1)
            
            port = self.server_sock.getsockname()[1]
            
            # Advertise the service
            bluetooth.advertise_service(
                self.server_sock, 
                self.service_name,
                service_id=self.uuid,
                service_classes=[self.uuid, bluetooth.SERIAL_PORT_CLASS],
                profiles=[bluetooth.SERIAL_PORT_PROFILE]
            )
            
            logger.info(f'Bluetooth server listening on RFCOMM channel {port}')
            logger.info(f'Service name: {self.service_name}')
            logger.info(f'UUID: {self.uuid}')
            
        except Exception as e:
            logger.error(f'Failed to setup Bluetooth server: {e}')
            raise
    
    def _accept_connection(self):
        """Wait for and accept a Bluetooth connection"""
        try:
            logger.info('Waiting for Bluetooth connection...')
            self.client_sock, client_info = self.server_sock.accept()
            logger.info(f'Accepted connection from {client_info}')
            self.is_connected = True
            
        except Exception as e:
            logger.error(f'Failed to accept Bluetooth connection: {e}')
            self.is_connected = False
            raise
    
    def receive_sensor_data(self) -> Optional[Dict]:
        """
        Receive sensor data from Bluetooth
        Expected JSON format:
        {
            "timestamp": 1234567890.5,
            "float_sensor": 1,
            "gyro_x": 15.2,
            "gyro_y": -5.1,
            "gyro_z": 2.3,
            "distance_left": 1500,
            "distance_right": 1480
        }
        
        Returns:
            Dictionary with sensor data, or None if no data
        """
        if not self.is_connected:
            self._accept_connection()
        
        try:
            # Receive data (non-blocking would be better in production)
            data = self.client_sock.recv(1024)
            
            if not data:
                logger.warning('Connection closed by client')
                self.is_connected = False
                return None
            
            # Parse JSON
            sensor_data = json.loads(data.decode('utf-8'))
            logger.debug(f'Received: {sensor_data}')
            
            return sensor_data
        
        except json.JSONDecodeError as e:
            logger.error(f'Invalid JSON received: {e}')
            return None
        
        except OSError as e:
            logger.error(f'Bluetooth connection error: {e}')
            self.is_connected = False
            return None
    
    def close(self):
        """Close Bluetooth connections"""
        try:
            if self.client_sock:
                self.client_sock.close()
            if self.server_sock:
                self.server_sock.close()
            logger.info('Bluetooth connection closed')
        except Exception as e:
            logger.error(f'Error closing Bluetooth: {e}')
