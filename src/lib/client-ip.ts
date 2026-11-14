/**
 * The IP of whoever made the request, from the X-Forwarded-For header.
 *
 * In production the app runs behind a reverse proxy, which adds the IP it sees to the end
 * of X-Forwarded-For. The entries to its left come from the client and anyone can invent
 * them, so the last entry is the only reliable one. Without a proxy (`next dev`), Next.js
 * fills the header with the connection's address.
 *
 * Requires the app not to be reachable without going through the proxy; otherwise a client
 * could choose its own IP.
 */
export function clientIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get("x-forwarded-for");
  const last = forwardedFor?.split(",").at(-1)?.trim();
  if (!last) return undefined;
  // The same IPv4 address written as IPv6 ("::ffff:203.0.113.7") counts as one IP.
  return last.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
}
