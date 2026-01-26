import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, rtmpUrl, streamKey, enabled } = body;

    const result = await db
      .update(schema.streams)
      .set({ name, rtmpUrl, streamKey, enabled })
      .where(eq(schema.streams.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to update stream:', error);
    return NextResponse.json({ error: 'Failed to update stream' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .delete(schema.streams)
      .where(eq(schema.streams.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete stream:', error);
    return NextResponse.json({ error: 'Failed to delete stream' }, { status: 500 });
  }
}
