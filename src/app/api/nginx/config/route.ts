import { NextResponse } from 'next/server';
import { readConfig } from '@/lib/nginx';

export async function GET() {
  try {
    const config = readConfig();
    return NextResponse.json({ config: config || 'No config found' });
  } catch (error) {
    console.error('Failed to read nginx config:', error);
    return NextResponse.json(
      { error: 'Failed to read config' },
      { status: 500 }
    );
  }
}
