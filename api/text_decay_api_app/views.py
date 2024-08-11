import os.path
import random

from decouple import config
from django.shortcuts import render
from django.contrib.staticfiles.views import serve
from django.contrib.staticfiles import finders
from rest_framework import viewsets
from rest_framework.response import Response
from django.views.generic import View
from django.http import HttpResponse

from .serializers import ImagesListSerializer, UploadImageSerializer
from os import walk
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import status

from gpiozero import DistanceSensor

exhibit = config("EXHIBIT", cast=bool)
if exhibit:
    d_sensor = DistanceSensor(trigger=16, echo=18)


class ReadSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        if exhibit:
            return Response(d_sensor.distance < 0.5)
        return Response(True)


class AngularAppView(View):
    def get(self, request, *args, **kwargs):
        try:
            with open(finders.find('text_decay_api_app/browser/index.html')) as file:
                http_response = HttpResponse(file.read())
                fake_response = Response(file.read(), content_type='text/html')
                # print(fake_response.headers)
                http_response.headers["Access-Control-Allow-Origin"] = "http://localhost:8000"
                return http_response
        except FileNotFoundError:
            return HttpResponse("Angular build files not found", status=501)

