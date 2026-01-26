# Base image
FROM tiangolo/nginx-rtmp:latest

# Install dependencies including Node.js 20
RUN apt-get update && \
    apt-get install -y curl certbot openssl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Ensure /data directory and declare volume
# Must exist before build because generic db access might trigger
RUN mkdir -p /data

# Environment variables needed for build
ENV DATABASE_PATH=/data/db.sqlite
ENV NODE_ENV=development

# Runtime Environment variables
ENV PORT=443

# Declare volume
VOLUME ["/data"]

# Expose ports
EXPOSE 1935 8080 80 443

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
