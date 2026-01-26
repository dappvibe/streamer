# Base image
FROM tiangolo/nginx-rtmp:latest

# Install dependencies including Node.js 20
RUN apt-get update && \
    apt-get install -y curl python3 make g++ && \
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

# Build the application
RUN npm run build

# Ensure /data directory and declare volume
RUN mkdir -p /data
VOLUME ["/data"]

# Environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/db.sqlite
ENV PORT=3000

# Expose ports
EXPOSE 3000 1935 8080

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
