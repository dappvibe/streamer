# Streamer Admin

A concise Next.js 16 application for managing Nginx RTMP streams.

## Features
- **Dashboard**: Manage stream destinations.
- **Settings**: Configure Nginx template and ingest key.
- **Auth**: Secure login.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database:**
   The SQLite database is stored in `data/db.sqlite`.
   ```bash
   npm run seed
   ```

3. **Development:**
   ```bash
   npm run dev
   ```

4. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

## Architecture
- **Framework**: Next.js 16
- **ORM**: Drizzle + Better SQLite3
- **Styling**: Tailwind CSS
- **Nginx Management**: Direct process control (reload via SIGHUP).
