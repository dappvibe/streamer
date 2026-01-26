# Base stage
FROM tiangolo/nginx-rtmp:latest AS base
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /data
WORKDIR /app

# Deps stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Dev stage
FROM deps AS dev
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Prod stage
FROM deps AS prod
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/db.sqlite
ENV PORT=3000
EXPOSE 3000 1935 8080
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
