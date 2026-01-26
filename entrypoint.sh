#!/bin/sh
set -e

echo "Starting Streamer Admin..."

# Run seed to ensure database is initialized
cd /app

# Create initial minimal nginx config if not exists
cat > /tmp/nginx-rtmp.conf <<EOF
worker_processes auto;
daemon off;
error_log /var/log/nginx/error.log info;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 8080;
        server_name _;

        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }

        location /stat.xsl {
            root /etc/nginx/html;
        }

        location / {
            return 200 'nginx init';
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "Starting Node.js app..."
npm run dev &
sleep 2

if [ ! -f /data/db.sqlite ]; then
  echo "Initializing database..."
  # Takes username/password from env
  npx tsx seed.ts
fi


echo "Starting Nginx..."
exec nginx -c /tmp/nginx-rtmp.conf
