#!/usr/bin/env bash
xhost +local:
export DISPLAY=:0

# Disable xset blanking, let xscreensaver handle that.
xset s noblank
xset s off

# Start xscreensaver.
# xscreensaver &

# Hide the mouse cursor.
# unclutter -idle 1 -root &

# Start Chromium.
chromium-browser --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture 'http://127.0.0.1:8000'
# chromium-browser --noerrdialogs --autoplay-policy=no-user-gesture 'http://127.0.0.1:8000'
# chromium-browser 'http://127.0.0.1:8000'

# Start qutebrowser
# qutebrowser "127.0.0.1:8000" ':fullscreen --enter' ':reload -f' -s tabs.show never -s statusbar.show never
