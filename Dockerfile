FROM tiangolo/nginx-rtmp:latest

RUN apt-get update && apt-get install gettext-base -y && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /var/www/html/hls

EXPOSE 1935 8080

ENTRYPOINT ["/entrypoint.sh"]
