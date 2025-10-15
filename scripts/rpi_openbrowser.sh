#!/usr/bin/env bash
# wait for server to load
sleep 1s

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
sleep 4s

# Start Chromium.
# old dwd
# chromium-browser --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gestu>
# new dwd
chromium 'http://127.0.0.1:8000'\
	--kiosk \
	--autoplay-policy=no-user-gesture-required \
	--enable-logging=stderr \
	--noerrdialogs \
	--disable-infobars \
	--disable-session-crashed-bubble \
	--disable-features=TranslateUI,,RendererCodeIntegrity,BackForwardCache,GoogleCloudMessaging \
#	--incognito \
	--disable-component-update \
	--no-first-run \
	--disable-background-networking \
	--disable-default-apps \
	--disable-translate \
	--disable-sync \
	--disable-extensions \
	--disable-notifications \
	--password-store=basic \
#	--use-gl=egl \
	--disable-smooth-scrolling \
#	--disk-cache-dir=/dev/null \
	--disk-cache-size=1 \
	--media-cache-size=1 \
	--disable-google-services


# chromium-browser --noerrdialogs --autoplay-policy=no-user-gesture 'http://127.0.0.1:8000'
# chromium-browser 'http://127.0.0.1:8000'

# Start qutebrowser
# qutebrowser "127.0.0.1:8000" ':fullscreen --enter' ':reload -f' -s tabs.show never -s statusbar.show never
