import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DEFAULT_NGINX_TEMPLATE = `worker_processes auto;
error_log stderr info;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
}

rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application {{INGEST_KEY}} {
            live on;

{{PUSH_DESTINATIONS}}
        }
    }
}

http {
    access_log /dev/stdout;

    server {
        listen 8080;

        location /stat {
            rtmp_stat all;
        }

        location / {
            return 200 'nginx-rtmp ok';
            add_header Content-Type text/plain;
        }
    }
}
`;

async function seed() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);

  console.log('Creating tables...');

  // Create app tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rtmp_url TEXT NOT NULL,
      stream_key TEXT NOT NULL,
      enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Create Better Auth tables with correct schema (snake_case, integer timestamps)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0 NOT NULL,
      image TEXT,
      created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
      updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id);

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id);

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
      updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
  `);

  // Insert default settings if not exist
  const existingTemplate = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('nginx_template');
  if (!existingTemplate) {
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('nginx_template', DEFAULT_NGINX_TEMPLATE);
    console.log('Inserted default nginx template');
  }

  const existingIngestKey = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('ingest_key');
  if (!existingIngestKey) {
    const defaultKey = process.env.INGEST_KEY;
    if (!defaultKey) {
      throw new Error('INGEST_KEY environment variable is not set');
    }
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('ingest_key', defaultKey);
    console.log('Inserted default ingest key:', defaultKey);
  }

  sqlite.close();

  // Create admin user via Better Auth API
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost';

  console.log(`Creating admin user via API: ${adminEmail}`);

  try {
    const response = await fetch(`${appUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': appUrl,
      },
      body: JSON.stringify({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (response.ok) {
      console.log('Admin user created successfully');
    } else {
      const data = await response.json().catch(() => ({}));
      if (data.code === 'USER_ALREADY_EXISTS') {
        console.log('Admin user already exists');
      } else {
        console.log('Failed to create admin user:', data);
      }
    }
  } catch (error) {
    console.log('Could not connect to app to create admin user');
    console.log('Run this after starting the app: npm run seed');
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
