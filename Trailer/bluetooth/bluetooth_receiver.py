"""Bluetooth receiver for ATS.

BLE implementation for ESP32-S3/Nano ESP32 firmware.
"""

import asyncio
import json
import logging
import queue
import threading
from typing import Dict, Optional

try:
    from bleak import BleakClient, BleakScanner
    _BLEAK_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - handled at runtime
    BleakClient = None
    BleakScanner = None
    _BLEAK_IMPORT_ERROR = exc

logger = logging.getLogger(__name__)


class BluetoothReceiver:
    """Handles BLE communication for sensor data."""

    def __init__(
        self,
        uuid: str = "94f39d29-7d6d-437d-973b-fba39e49d4ee",
        characteristic_uuid: str = "94f39d29-7d6d-437d-973b-fba39e49d4ef",
        service_name: str = "ATS_Arduino",
        scan_timeout: float = 5.0,
    ):
        """
        Initialize Bluetooth receiver
        
        Args:
            uuid: BLE service UUID
            characteristic_uuid: BLE notification characteristic UUID
            service_name: BLE advertised device name
            scan_timeout: BLE scan timeout in seconds
        """
        if _BLEAK_IMPORT_ERROR is not None:
            raise ImportError(
                "BLE receiver requires bleak. Install with: pip install bleak"
            ) from _BLEAK_IMPORT_ERROR

        self.uuid = uuid
        self.characteristic_uuid = characteristic_uuid
        self.service_name = service_name
        self.scan_timeout = scan_timeout
        self.is_connected = False
        self._stop_event = threading.Event()
        self._buffer = ""
        self._queue: "queue.Queue[Dict]" = queue.Queue(maxsize=200)
        self._worker_thread = threading.Thread(target=self._worker_main, daemon=True)
        self._worker_thread.start()

    async def _find_device(self):
        """Find target BLE device by service UUID or advertised name."""
        target_uuid = self.uuid.lower()

        def _match(device, adv_data):
            uuids = [u.lower() for u in (adv_data.service_uuids or [])]
            if target_uuid in uuids:
                return True
            if self.service_name and device.name == self.service_name:
                return True
            return False

        return await BleakScanner.find_device_by_filter(_match, timeout=self.scan_timeout)

    def _notification_handler(self, _: int, data: bytearray):
        """Handle incoming BLE notification chunks and parse NDJSON lines."""
        text = bytes(data).decode("utf-8", errors="ignore")
        self._buffer += text

        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            line = line.strip()
            if not line:
                continue

            try:
                packet = json.loads(line)
                try:
                    self._queue.put_nowait(packet)
                except queue.Full:
                    # Drop oldest sample so latest data keeps flowing.
                    _ = self._queue.get_nowait()
                    self._queue.put_nowait(packet)
            except json.JSONDecodeError:
                logger.debug("Skipping malformed BLE payload chunk: %s", line)

    async def _run_ble_loop(self):
        """Background BLE scan/connect/subscribe loop."""
        while not self._stop_event.is_set():
            device = await self._find_device()
            if device is None:
                logger.info("BLE device not found yet; scanning again")
                await asyncio.sleep(1.0)
                continue

            try:
                logger.info("Connecting to BLE device: %s", device.address)
                async with BleakClient(device) as client:
                    await client.start_notify(self.characteristic_uuid, self._notification_handler)
                    self.is_connected = True
                    logger.info("BLE connected, notifications started")

                    while client.is_connected and not self._stop_event.is_set():
                        await asyncio.sleep(0.2)

                    if client.is_connected:
                        await client.stop_notify(self.characteristic_uuid)
            except Exception as exc:
                logger.error("BLE connection error: %s", exc)
            finally:
                self.is_connected = False

            await asyncio.sleep(1.0)

    def _worker_main(self):
        """Run BLE asyncio loop in a dedicated worker thread."""
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._run_ble_loop())
        finally:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
    
    def receive_sensor_data(self) -> Optional[Dict]:
        """
        Receive sensor data from BLE notifications
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
        try:
            # Small timeout keeps the app loop responsive.
            return self._queue.get(timeout=2.0)
        except queue.Empty:
            return None
    
    def close(self):
        """Stop BLE receiver worker thread."""
        try:
            self._stop_event.set()
            if self._worker_thread.is_alive():
                self._worker_thread.join(timeout=3.0)
            logger.info('BLE receiver closed')
        except Exception as exc:
            logger.error('Error closing BLE receiver: %s', exc)
