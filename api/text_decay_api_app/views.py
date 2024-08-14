import time

from decouple import config
from django.contrib.staticfiles import finders
from rest_framework import viewsets
from rest_framework.response import Response
from django.views.generic import View
from django.http import HttpResponse

from gpiozero import DistanceSensor, LED

exhibit = config("EXHIBIT", cast=bool)
if exhibit:
    if True:
        # inner scope
        led0 = LED(23)
        led0.off()
        led1 = LED(24)
        led1.off()
        time.sleep(0.3)
        led0.close()
        led1.close()
        time.sleep(0.3)
    d_sensor = DistanceSensor(trigger=23, echo=24)


class ReadSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        print('in read_sensor')
        if exhibit:
            print('exhibit')
            d = d_sensor.distance
            print('got distance {}'.format(d))
            return Response(d < 0.5)
        return Response(True)


class AngularAppView(View):
    def get(self, request, *args, **kwargs):
        try:
            with open(finders.find('text_decay_api_app/browser/index.html')) as file:
                return HttpResponse(file.read())
        except FileNotFoundError:
            return HttpResponse("Angular build files not found", status=501)

