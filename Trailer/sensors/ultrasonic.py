import RPi.GPIO as GPIO
import time


class ultrasonic:
    GPIO.setmode(GPIO.BCM)
    SLEEPTIME = .1

    # Left Ultrasonic Sensor Setup
    TRIGL = 23
    ECHOL = 24
    GPIO.setup(TRIGL, GPIO.OUT)
    GPIO.setup(ECHOL, GPIO.IN)

    # Right Ultrasonic Sensor Setup
    TRIGR = 27
    ECHOR = 17
    GPIO.setup(TRIGR, GPIO.OUT)
    GPIO.setup(ECHOR, GPIO.IN)

    # Button Sensor Setup
    BUTTON = 25
    GPIO.setup(BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

    # Float switch setup
    FLOAT = 16
    GPIO.setup(FLOAT, GPIO.IN)

    try:
        while True:
            # if GPIO.input(BUTTON) == 1:
            # Float switch read out
            if GPIO.input(FLOAT) == 1:
                print("Trailer in water")
            else:
                print("Trailer not in water yet, please wait")

    # Left Ultrasonic sensor read out
            print('Distance Measurement In Progress')
            GPIO.output(TRIGL, False)
            time.sleep(2)
            GPIO.output(TRIGL, True)
            time.sleep(0.00001)
            GPIO.output(TRIGL, False)

            while GPIO.input(ECHOL) == 0:
                pulse_start_l = time.time()

            while GPIO.input(ECHOL) == 1:
                pulse_end_l = time.time()

            pulse_duration_l = pulse_end_l - pulse_start_l
            distance_l = round(pulse_duration_l * 17150, 2)

            print("Distance Left:", distance_l, "cm")

    # Right Ultrasonic sensor read out
            GPIO.output(TRIGR, False)
            time.sleep(2)
            GPIO.output(TRIGR, True)
            time.sleep(0.00001)
            GPIO.output(TRIGR, False)

            while GPIO.input(ECHOR) == 0:
                pulse_start_r = time.time()

            while GPIO.input(ECHOR) == 1:
                pulse_end_r = time.time()

            pulse_duration_r = pulse_end_r - pulse_start_r
            distance_r = round(pulse_duration_r * 17150, 2)

            print("Distance Right:", distance_r, "cm")

            time.sleep(SLEEPTIME)

    # If there is a KeyboardInterrupt (when you press ctrl+c), exit the program and cleanup
    except KeyboardInterrupt:  # If CTRL+C is pressed, exit cleanly:
    print("Keyboard interrupt")

    except:
    print("some error")

    finally:
    print("clean up")
    GPIO.cleanup()  # cleanup all GPIO
