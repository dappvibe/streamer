#!/bin/sh

envsubst '${TWITTER_RTMP_URL} ${TWITTER_STREAM_KEY} ${TELEGRAM_RTMP_URL} ${TELEGRAM_STREAM_KEY} ${YOUTUBE_RTMP_URL} ${YOUTUBE_STREAM_KEY}' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
