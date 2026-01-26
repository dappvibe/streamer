# Single-stage build with nginx-rtmp base
FROM tiangolo/nginx-rtmp:latest

# Install Node.js 20 and build tools
RUN apt-get update && \
    apt-get install -y curl python3 make g++ && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /app /data

WORKDIR /app

# Copy package files and install dependencies
COPY ./ ./
RUN npm ci

# Build Next.js
RUN npm run build

# Environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/db.sqlite
ENV PORT=3000

EXPOSE 3000 1935 8080

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
