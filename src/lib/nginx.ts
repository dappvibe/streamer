import { execSync } from 'child_process';
import * as fs from 'fs';

const NGINX_CONFIG_PATH = '/tmp/nginx-rtmp.conf';
const NGINX_PID_PATH = '/tmp/nginx.pid';

export interface Stream {
  id: number;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: number | null;
}

export function generateConfig(template: string, streams: Stream[]): string {
  const ingestKey = process.env.INGEST_KEY;
  if (!ingestKey) {
    throw new Error('INGEST_KEY is not defined');
  }

  const pushLines = streams
    .filter(s => s.enabled)
    .map(s => {
      let url = s.rtmpUrl;
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      
      if (url.startsWith('rtmps://')) {
        // Use FFmpeg for RTMPS destinations (zero-copy)
        return `            exec_push ffmpeg -i rtmp://127.0.0.1:1935/$app/$name -c copy -f flv "${url}/${s.streamKey}";`;
      }
      return `            push "${url}/${s.streamKey}";`;
    })
    .join('\n');

  let config = template.replace('{{PUSH_DESTINATIONS}}', pushLines || '            # No destinations configured');
  config = config.replace('{{INGEST_KEY}}', ingestKey);

  return config;
}

export function writeConfig(config: string): void {
  fs.writeFileSync(NGINX_CONFIG_PATH, config, 'utf-8');
}

export function reloadNginx(): boolean {
  if (!isNginxRunning()) {
    console.log('Nginx not running (no PID file), cannot reload');
    return false;
  }

  try {
    const pid = fs.readFileSync(NGINX_PID_PATH, 'utf-8').trim();
    process.kill(parseInt(pid, 10), 'SIGHUP');
    console.log(`Sent SIGHUP to nginx (PID: ${pid})`);
    return true;
  } catch (error) {
    console.error('Failed to reload nginx:', error);
    return false;
  }
}

export function isNginxRunning(): boolean {
  if (!fs.existsSync(NGINX_PID_PATH)) {
    return false;
  }
  try {
    const pid = fs.readFileSync(NGINX_PID_PATH, 'utf-8').trim();
    // Check if process exists
    process.kill(parseInt(pid, 10), 0);
    return true;
  } catch (e) {
    return false;
  }
}

export function getNginxConfigPath(): string {
  return NGINX_CONFIG_PATH;
}

export function readConfig(): string | null {
  if (!fs.existsSync(NGINX_CONFIG_PATH)) {
    return null;
  }
  return fs.readFileSync(NGINX_CONFIG_PATH, 'utf-8');
}
