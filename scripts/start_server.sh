#!/usr/bin/env bash

source ./.venv/bin/activate

cd api

python manage.py runserver --noreload --skip-checks

