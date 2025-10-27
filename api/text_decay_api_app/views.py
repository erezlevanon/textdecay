import time
import os

from decouple import config
from django.contrib.staticfiles import finders
from rest_framework import viewsets
from rest_framework.response import Response
from django.views.generic import View
from django.http import HttpResponse

from gpiozero import DistanceSensor, LED

DEMO_MODE_TOGGLE_SECONDS = 13

exhibit = config("EXHIBIT", cast=bool)
demo_mode = config("DEMO_MODE", default=False, cast=bool)

switch = None
inflight = 0

def restart_rpi_os():
    """Restarts the Raspberry Pi using the os.system command."""
    print("Restarting Raspberry Pi now...")
    # Execute the 'sudo reboot' command
    os.system('sudo reboot')
    print("Command issued. System should be restarting.")


def init_d_sensor():
    global switch
    try:
        if switch is None:
            # Only attempt GPIO setup if not in demo mode
            if not demo_mode:
                switch = LED(12)
                print("turning sensor off")
                switch.off()
                for i in range(10):
                    print('wait: {}'.format(i))
                    time.sleep(1)
                print("turning sensor on")
                switch.on()
                time.sleep(2)
                print("creating sensor")
                return DistanceSensor(trigger="GPIO23", echo="GPIO24")
            else:
                print("Demo mode active: skipping GPIO initialization.")
                return None # The sensor is explicitly not needed
        return None
    except Exception as e:
        print(f"problem init d: {e}")
        return None


d_sensor = None

if exhibit and d_sensor is None:
    if demo_mode:
        print("Demo Mode is active. Skipping sensor initialization.")
    else:
        print("initialize distance sensor: Start")
        d_sensor = init_d_sensor()
        print("initialize distance sensor: End")


class ReadSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        global d_sensor, inflight
        print('in read_sensor')
        force_true_param = request.query_params.get('force_true')
        if force_true_param is not None and force_true_param.lower() == 'true':
            return Response(True)

        if demo_mode:
            current_state = bool(int(time.time() / DEMO_MODE_TOGGLE_SECONDS) % 2)

            print(f"Demo state: {current_state}")
            return Response(current_state)
        if inflight > 10:
            restart_rpi_os()
        if exhibit:
            print('exhibit')
            try:
                if d_sensor is None or d_sensor.closed:
                    print('no d_sensor')
                    return Response(False)
                inflight += 1
                d = d_sensor.distance
                inflight -= 1
                print('got distance {}'.format(d))
                return Response(d < 0.9)
            except Exception as e:
                print(f"ERROR READING SENSOR: {e}", flush=True)
                # Attempt to close the faulty sensor and set to None for next retry
                d_sensor = None
                return Response(False)
        return Response(True)


class AngularAppView(View):
    def get(self, request, *args, **kwargs):
        try:
            with open(finders.find('text_decay_api_app/browser/index.html')) as file:
                return HttpResponse(file.read())
        except FileNotFoundError:
            return HttpResponse("Angular build files not found", status=501)
