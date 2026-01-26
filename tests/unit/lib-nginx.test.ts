import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateConfig } from '@/lib/nginx';

describe('generateConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should replace {{INGEST_KEY}} with process.env.INGEST_KEY', () => {
    vi.stubEnv('INGEST_KEY', 'my-secret-key');
    const template = 'application {{INGEST_KEY}} { ... }';
    const config = generateConfig(template, []);
    expect(config).toContain('application my-secret-key { ... }');
  });

  it('should replace {{PUSH_DESTINATIONS}}', () => {
    vi.stubEnv('INGEST_KEY', 'key');
    const template = 'application {{INGEST_KEY}} {\n{{PUSH_DESTINATIONS}}\n}';
    const streams = [{ id: 1, name: 's1', rtmpUrl: 'url', streamKey: 'key', enabled: 1 }];
    const config = generateConfig(template, streams);
    expect(config).toContain('push "url/key";');
  });

  it('should throw error if INGEST_KEY is missing', () => {
    delete process.env.INGEST_KEY;
    const template = 'application {{INGEST_KEY}}';
    expect(() => generateConfig(template, [])).toThrow('INGEST_KEY is not defined');
  });
});
