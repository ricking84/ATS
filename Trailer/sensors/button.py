import RPi.GPIO as GPIO
from time import sleep

GPIO.setmode(GPIO.BCM)

BUTTON = 25
SLEEPTIME = .1

GPIO.setup(BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

try:
    while True:
        if GPIO.input(BUTTON) == 1:
            print("Button Pushed")
            sleep(SLEEPTIME)

except KeyboardInterrupt:
    GPIO.cleanup()