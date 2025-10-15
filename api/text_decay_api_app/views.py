import time

from decouple import config
from django.contrib.staticfiles import finders
from rest_framework import viewsets
from rest_framework.response import Response
from django.views.generic import View
from django.http import HttpResponse

from gpiozero import DistanceSensor

exhibit = config("EXHIBIT", cast=bool)
if exhibit:
    print("initialize distance sensor: Start")
    time.sleep(2)
    d_sensor = DistanceSensor(trigger=23, echo=24)
    print("initialize distance sensor: End")


class ReadSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        print('in read_sensor')
        if exhibit:
            print('exhibit')
            d = d_sensor.distance
            print('got distance {}'.format(d))
            return Response(d < 0.9)
        return Response(True)


class AngularAppView(View):
    def get(self, request, *args, **kwargs):
        try:
            with open(finders.find('text_decay_api_app/browser/index.html')) as file:
                return HttpResponse(file.read())
        except FileNotFoundError:
            return HttpResponse("Angular build files not found", status=501)

