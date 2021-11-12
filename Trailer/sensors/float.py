import RPi.GPIO as GPIO
from time import sleep


def float():
    GPIO.setmode(GPIO.BCM)

    SLEEPTIME = .1
    x = 1

    FLOAT = 16
    GPIO.setup(FLOAT, GPIO.IN)

    BUTTON = 25
    GPIO.setup(BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

    try:
        while True:
            if GPIO.input(BUTTON) == 1:
                if GPIO.input(FLOAT) == 1:
                    print("Float in water")
                    print(x)
                    x = x+1
                    sleep(SLEEPTIME)

    except KeyboardInterrupt:
        GPIO.cleanup()


float()