import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, setOAuthStateCookie } from '@/lib/reddit-oauth';

export async function GET() {
  try {
    const { url, state } = buildAuthorizeUrl(['identity', 'read', 'history']);
    await setOAuthStateCookie(state);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth initiation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
