import { NextRequest, NextResponse } from 'next/server';
import {
  validateAndClearState,
  exchangeCodeForTokens,
  fetchRedditUser,
  setSessionCookie,
} from '@/lib/reddit-oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  if (error) {
    const description = searchParams.get('error_description') ?? error;
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent(description)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Missing code or state from Reddit')}`
    );
  }

  const stateValid = await validateAndClearState(state);
  if (!stateValid) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Invalid or expired OAuth state — please try again')}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await fetchRedditUser(tokens.access_token);
    await setSessionCookie(tokens, user.name);

    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    console.error('[auth/reddit/callback]', message);
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Login failed — please try again')}`
    );
  }
}
