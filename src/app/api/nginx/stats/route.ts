import { NextResponse } from 'next/server';

const NGINX_STAT_URL = process.env.NGINX_STAT_URL || 'http://127.0.0.1:8080/stat';

export async function GET() {
  try {
    const response = await fetch(NGINX_STAT_URL, {
      headers: { Accept: 'text/xml' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch nginx stats' },
        { status: response.status }
      );
    }

    const xml = await response.text();
    return new Response(xml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Failed to fetch nginx stats:', error);
    return NextResponse.json(
      { error: 'Nginx not available', details: String(error) },
      { status: 503 }
    );
  }
}
