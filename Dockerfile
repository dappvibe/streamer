FROM tiangolo/nginx-rtmp:latest

RUN apt-get update && apt-get install gettext-base -y && rm -rf /var/lib/apt/lists/*
