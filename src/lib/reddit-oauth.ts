import { cookies } from 'next/headers';
import crypto from 'crypto';

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const STATE_COOKIE = 'reddit_oauth_state';
const SESSION_COOKIE = 'reddit_session';

export interface RedditOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface RedditUser {
  name: string;
  id: string;
  icon_img?: string;
  total_karma?: number;
}

/**
 * Build the redirect URI from env. An explicit REDDIT_REDIRECT_URI takes
 * priority so production deployments can lock the value to their exact
 * registered URI. Falls back to NEXT_PUBLIC_APP_URL + path.
 */
export function getRedirectUri(): string {
  const explicit = process.env.REDDIT_REDIRECT_URI;
  if (explicit) return explicit;

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/auth/reddit/callback`;
}

export function buildAuthorizeUrl(scopes: string[] = ['identity', 'read']): {
  url: string;
  state: string;
} {
  const clientId = process.env.REDDIT_CLIENT_ID;
  if (!clientId) {
    throw new Error('REDDIT_CLIENT_ID is not set');
  }

  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state,
    redirect_uri: getRedirectUri(),
    duration: 'permanent',
    scope: scopes.join(' '),
  });

  return { url: `${REDDIT_AUTH_URL}?${params.toString()}`, state };
}

export async function exchangeCodeForTokens(code: string): Promise<RedditOAuthTokens> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Reddit OAuth credentials (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET) are not set');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Problems4Us/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit token exchange failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<RedditOAuthTokens>;
}

export async function fetchRedditUser(accessToken: string): Promise<RedditUser> {
  const response = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Problems4Us/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Reddit user (${response.status})`);
  }

  return response.json() as Promise<RedditUser>;
}

export async function setOAuthStateCookie(state: string): Promise<void> {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes — plenty for the OAuth round-trip
  });
}

export async function validateAndClearState(incomingState: string): Promise<boolean> {
  const jar = await cookies();
  const stored = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (!stored || stored !== incomingState) return false;
  return true;
}

export async function setSessionCookie(tokens: RedditOAuthTokens, username: string): Promise<void> {
  const jar = await cookies();
  const payload = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    username,
  });

  jar.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  username: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
