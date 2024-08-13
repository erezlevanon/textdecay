#!/usr/bin/env bash

screen -dmS server ./scripts/start_server.sh
screen -dmS browser ./scripts/rpi_openbrowser.sh

