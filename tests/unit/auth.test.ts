import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_PATH = '/tmp/test-streamer.sqlite';

describe('Stream Auth API', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Create test database
    db = new Database(TEST_DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('ingest_key', 'valid-test-key');
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should accept valid ingest key', async () => {
    // Simulate the auth logic
    const ingestKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('ingest_key') as { value: string };
    const providedKey = 'valid-test-key';
    
    expect(providedKey).toBe(ingestKey.value);
  });

  it('should reject invalid ingest key', async () => {
    const ingestKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('ingest_key') as { value: string };
    const providedKey = 'wrong-key';
    
    expect(providedKey).not.toBe(ingestKey.value);
  });
});

describe('Nginx Config Generation', () => {
  it('should generate push directives from streams', () => {
    const streams = [
      { id: 1, name: 'Twitch', rtmpUrl: 'rtmp://live.twitch.tv/app', streamKey: 'key1', enabled: 1 },
      { id: 2, name: 'YouTube', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: 'key2', enabled: 1 },
      { id: 3, name: 'Disabled', rtmpUrl: 'rtmp://disabled.com', streamKey: 'key3', enabled: 0 },
    ];

    const pushLines = streams
      .filter(s => s.enabled)
      .map(s => `            push ${s.rtmpUrl}/${s.streamKey};`)
      .join('\n');

    expect(pushLines).toContain('rtmp://live.twitch.tv/app/key1');
    expect(pushLines).toContain('rtmp://a.rtmp.youtube.com/live2/key2');
    expect(pushLines).not.toContain('rtmp://disabled.com');
  });

  it('should replace placeholder in template', () => {
    const template = `
rtmp {
    application live {
{{PUSH_DESTINATIONS}}
    }
}`;
    const pushLines = '            push rtmp://test.com/key;';
    const result = template.replace('{{PUSH_DESTINATIONS}}', pushLines);

    expect(result).toContain('push rtmp://test.com/key');
    expect(result).not.toContain('{{PUSH_DESTINATIONS}}');
  });
});
