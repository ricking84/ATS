
from time import sleep
import sys
import os
from Trailer.sensors.tof_laser import tof_laser
#from Trailer.sensors.float import float
#from Trailer.sensors.button import button
#from Trailer.sensors.ir_sensor import ir_sensor
#from bluetooth.bluetooth_server import bluetooth


def main():
    # Distance sensor
    while True:
        tof = tof_laser()
        sleep(2)
        print("Range: {0}".format(tof))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted')
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
