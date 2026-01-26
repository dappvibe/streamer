import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateConfig, writeConfig, reloadNginx } from '@/lib/nginx';

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

    // Reload nginx
    const reloaded = reloadNginx();
    if (!reloaded) {
      return NextResponse.json({ error: 'Failed to reload Nginx (is it running?)' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to apply nginx config:', error);
    return NextResponse.json({ error: 'Failed to apply config' }, { status: 500 });
  }
}
