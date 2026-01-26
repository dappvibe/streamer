import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let nginxProcess: ChildProcess | null = null;

const NGINX_CONFIG_PATH = '/tmp/nginx-rtmp.conf';

export interface Stream {
  id: number;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: number | null;
}

export function generateConfig(template: string, streams: Stream[]): string {
  const pushLines = streams
    .filter(s => s.enabled)
    .map(s => `            push "${s.rtmpUrl}/${s.streamKey}";`)
    .join('\n');

  return template.replace('{{PUSH_DESTINATIONS}}', pushLines || '            # No destinations configured');
}

export function writeConfig(config: string): void {
  fs.writeFileSync(NGINX_CONFIG_PATH, config, 'utf-8');
}

export function validateConfig(): { valid: boolean; error?: string } {
  try {
    execSync(`nginx -t -c ${NGINX_CONFIG_PATH}`, { stdio: 'pipe' });
    return { valid: true };
  } catch (error: any) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    return { 
      valid: false, 
      error: (stderr + '\n' + stdout).trim() || error.message 
    };
  }
}

export function spawnNginx(): ChildProcess {
  if (nginxProcess) {
    console.log('Nginx already running');
    return nginxProcess;
  }

  nginxProcess = spawn('nginx', ['-c', NGINX_CONFIG_PATH, '-g', 'daemon off;'], {
    stdio: 'inherit',
  });

  nginxProcess.on('exit', (code) => {
    console.log(`Nginx exited with code ${code}`);
    nginxProcess = null;
  });

  return nginxProcess;
}

export function reloadNginx(): boolean {
  if (!nginxProcess || !nginxProcess.pid) {
    console.log('Nginx not running, spawning new instance');
    spawnNginx();
    return true;
  }

  try {
    process.kill(nginxProcess.pid, 'SIGHUP');
    console.log('Sent SIGHUP to nginx');
    return true;
  } catch (error) {
    console.error('Failed to reload nginx:', error);
    return false;
  }
}

export function isNginxRunning(): boolean {
  return nginxProcess !== null && nginxProcess.exitCode === null;
}

export function getNginxConfigPath(): string {
  return NGINX_CONFIG_PATH;
}
