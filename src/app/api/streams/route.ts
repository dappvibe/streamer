import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allStreams = await db.select().from(schema.streams);
    return NextResponse.json(allStreams);
  } catch (error) {
    console.error('Failed to fetch streams:', error);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, rtmpUrl, streamKey, enabled = 1 } = body;

    if (!name || !rtmpUrl || !streamKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.insert(schema.streams).values({
      name,
      rtmpUrl,
      streamKey,
      enabled,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create stream:', error);
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 });
  }
}
