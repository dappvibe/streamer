import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allSettings = await db.select().from(schema.settings);
    const settingsObj: Record<string, string> = {};
    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await db
          .insert(schema.settings)
          .values({ key, value })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value },
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
