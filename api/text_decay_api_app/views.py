import os.path
import random

from decouple import config
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response

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
            return Response(d_sensor.distance)
        return Response(random.randint(0, 1000))
