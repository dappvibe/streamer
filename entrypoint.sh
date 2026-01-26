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

# Start Next.js (which will spawn nginx internally when Apply is clicked)
echo "Starting Next.js server..."
exec node
