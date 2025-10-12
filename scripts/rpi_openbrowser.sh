#!/usr/bin/env bash
# wait for server to load
sleep 5s

xhost +local:
export DISPLAY=:0

export XAUTHORITY=/home/yotamerez/.Xauthority

# For PulseAudio
export XDG_RUNTIME_DIR=/run/user/1000

# Disable xset blanking, let xscreensaver handle that.
xset s noblank
xset s off

# Start xscreensaver.
# xscreensaver &

# Hide the mouse cursor.
# unclutter -idle 1 -root &

# just in case.
sleep 1s

# Start Chromium.
# old dwd
# chromium-browser --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gestu>
# new dwd
chromium --kiosk --enable-logging=stderr --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars 'http://127.0.0.1:8000'

# chromium-browser --noerrdialogs --autoplay-policy=no-user-gesture 'http://127.0.0.1:8000'
# chromium-browser 'http://127.0.0.1:8000'

# Start qutebrowser
# qutebrowser "127.0.0.1:8000" ':fullscreen --enter' ':reload -f' -s tabs.show never -s statusbar.show never
