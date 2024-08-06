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


read_counter_ = 0


class ReadSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        global read_counter_

        if exhibit:
            return Response(d_sensor.distance)
        read_counter_ = read_counter_ + 1
        return Response(read_counter_ - 1)


class ResetMockSensorViewSet(viewsets.ModelViewSet):
    def list(self, request):
        global read_counter_
        read_counter_ = 0
        return Response()
