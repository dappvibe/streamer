#!/bin/sh
set -e

if [ -z "$INGEST_KEY" ]; then
  echo "Error: INGEST_KEY environment variable is not set."
  exit 1
fi

echo "Starting Streamer Admin..."

# Create /data directory if it doesn't exist
mkdir -p /data

# Check if we are in app directory
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
if [ "$NODE_ENV" = "development" ]; then
    npm run dev &
else
    npm start &
fi
sleep 2

if [ ! -f /data/db.sqlite ]; then
  echo "Initializing database..."
  # Takes username/password from env
  npx tsx seed.ts
fi


echo "Starting Nginx..."
exec nginx -c /tmp/nginx-rtmp.conf
