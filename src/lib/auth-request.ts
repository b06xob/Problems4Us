/**
 * Resolve public origin for auth email links (behind App Service / Front Door).
 */
export function resolvePublicOrigin(request: {
  headers: Headers;
  nextUrl?: { origin: string };
}): string {
  const host = request.headers.get("x-forwarded-host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return request.nextUrl?.origin || "https://problems4us.com";
}

/** Approximate constant-time delay for enumeration-sensitive auth paths. */
export async function authResponsePad(minMs = 80, jitterMs = 40): Promise<void> {
  const wait = minMs + Math.floor(Math.random() * jitterMs);
  await new Promise((r) => setTimeout(r, wait));
}
