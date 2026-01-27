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
COPY package.json package-lock.json ./
RUN npm install

ENV DATABASE_PATH=/data/db.sqlite
ENV PORT=443

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app
CMD ["/entrypoint.sh"]
