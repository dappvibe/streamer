#!/bin/sh

envsubst '${INGEST_KEY} ${TWITTER_STREAM_KEY} ${TELEGRAM_STREAM_KEY} ${YOUTUBE_STREAM_KEY}' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
