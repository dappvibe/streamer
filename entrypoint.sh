#!/bin/sh
set -e

echo "Starting Streamer Admin..."

# Run seed to ensure database is initialized
cd /app
if [ ! -f /data/db.sqlite ]; then
  echo "Initializing database..."
  # Takes username/password from env
  npx tsx seed.ts
fi

exec npm run dev
