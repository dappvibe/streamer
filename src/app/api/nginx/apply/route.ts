import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateConfig, writeConfig, validateConfig, reloadNginx, spawnNginx, isNginxRunning } from '@/lib/nginx';

export async function POST() {
  try {
    // Get template from settings
    const templateRow = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'nginx_template'));

    if (!templateRow.length) {
      return NextResponse.json({ error: 'Nginx template not found' }, { status: 500 });
    }

    const template = templateRow[0].value;

    // Get all streams
    const streams = await db.select().from(schema.streams);

    // Generate config
    const config = generateConfig(template, streams);

    // Write config to file
    writeConfig(config);

    // Validate config
    if (!validateConfig()) {
      return NextResponse.json({ error: 'Invalid nginx config' }, { status: 400 });
    }

    // Reload or spawn nginx
    if (isNginxRunning()) {
      reloadNginx();
    } else {
      spawnNginx();
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to apply nginx config:', error);
    return NextResponse.json({ error: 'Failed to apply config' }, { status: 500 });
  }
}
