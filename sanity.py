from gpiozero import DistanceSensor, LED
import time

switch = LED(12)
switch.off()
time.sleep(2)
switch.on();
time.sleep(2);

d_sensor = DistanceSensor(trigger=23, echo=24)

while True:
    print("hey")
    try:
        d = d_sensor.distance
        print('got distance {}'.format(d))
    except:
        print('Error')
    print("beyyy")
    time.sleep(1)
