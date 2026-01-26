import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const streamKey = formData.get('name') as string;

    if (!streamKey) {
      return new Response('Missing stream key', { status: 400 });
    }

    const settings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'ingest_key'));

    const ingestKey = settings[0]?.value;

    if (streamKey === ingestKey) {
      console.log(`Stream auth: accepted key`);
      return new Response('OK', { status: 200 });
    }

    console.log(`Stream auth: rejected key "${streamKey}"`);
    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Stream auth error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
