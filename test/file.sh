#!/bin/sh
ffmpeg -re -i $1 \
       -c:v libx264 -preset veryfast -b:v 2500k \
       -c:a aac -b:a 128k \
       -f flv rtmp://localhost:1935/live/stream
