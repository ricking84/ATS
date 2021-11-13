import RPi.GPIO as GPIO
import time

def ir_sensor():
    GPIO.setmode(GPIO.BCM)

    ECHO = 24

    print('Distance Measurement In Progress')

    GPIO.setup(ECHO, GPIO.IN)
    try:
        while True:

            while GPIO.input(ECHO) == 0:
                pulse_start = time.time()

            while GPIO.input(ECHO) == 1:
                pulse_end = time.time()

            pulse_duration = pulse_end - pulse_start

            distance = pulse_duration * 17150

            distance = round(distance, 2)

            print("Distance:", distance, "cm")

    # If there is a KeyboardInterrupt (when you press ctrl+c), exit the program and cleanup
    except KeyboardInterrupt:

        print("Cleaning up!")
        GPIO.cleanup()
