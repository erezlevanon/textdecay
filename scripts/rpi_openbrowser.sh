#!/usr/bin/env bash

# Disable xset blanking, let xscreensaver handle that.
xset s noblank
xset s off

# Start xscreensaver.
xscreensaver &

# Hide the mouse cursor.
# unclutter -idle 1 -root &

# Let Chromium think it always exited cleanly.
 sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' '~/.config/chromium/Default/Preferences'
 sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' '~/.config/chromium/Default/Preferences'

# Start Chromium.
chromium-browser --kiosk --noerrdialogs --disable-infobars 'http://127.0.0.1:8000'
#chromium-browser 'http://127.0.0.1:8000'
