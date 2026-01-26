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

# SSL Configuration
# Ensure /data directories exist
mkdir -p /data/certificates
mkdir -p /data/letsencrypt

# Persist Let's Encrypt config to data volume
if [ ! -L /etc/letsencrypt ]; then
    rm -rf /etc/letsencrypt
    ln -s /data/letsencrypt /etc/letsencrypt
fi

# Set default SSL paths
export SSL_KEY_PATH="/data/certificates/key.pem"
export SSL_CERT_PATH="/data/certificates/cert.pem"

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "Error: NEXT_PUBLIC_APP_URL environment variable is not set."
    exit 1
fi

# Extract domain from NEXT_PUBLIC_APP_URL (remove protocol and port)
DOMAIN=$(echo "$NEXT_PUBLIC_APP_URL" | sed -e 's|^[^/]*//||' -e 's|:.*$||' -e 's|/.*$||')

if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ] && [ -n "$EMAIL" ]; then
    echo "Configuring Let's Encrypt for $DOMAIN..."
    
    # Check if certs already exist
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "Existing certificates found."
        export SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
        export SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    else
        echo "Obtaining new certificates..."
        # Run certbot in standalone mode (uses port 80)
        if certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
            echo "Certificate obtained successfully."
            export SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
            export SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
        else
            echo "Certbot failed. Falling back to self-signed certificate."
        fi
    fi
fi

# Generate self-signed cert if valid certs don't exist
if [ ! -f "$SSL_KEY_PATH" ] || [ ! -f "$SSL_CERT_PATH" ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -newkey rsa:4096 -keyout "$SSL_KEY_PATH" -out "$SSL_CERT_PATH" -days 365 -nodes -subj "/CN=localhost"
fi

echo "Starting Node.js app on port 443..."
npm run dev &
sleep 5

if [ ! -f /data/db.sqlite ]; then
  echo "Initializing database..."
  # Takes username/password from env
  npx tsx seed.ts
fi


echo "Starting Nginx..."
exec nginx -c /tmp/nginx-rtmp.conf
