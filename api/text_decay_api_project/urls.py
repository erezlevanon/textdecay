"""
URL configuration for decaying_storage_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from rest_framework import routers

from text_decay_api_app import views as app_views

router = routers.DefaultRouter()
router.register(r'read_sensor', app_views.ReadSensorViewSet, basename="read_sensor")

urlpatterns = [
                  path('', app_views.AngularAppView.as_view(), name='index'),
                  path('api/v1/', include(router.urls)),
                  path('<path:path>', app_views.AngularAppView.as_view(), name='angular_app_with_path'),
              ]
