/**
 * Railway origin proxy for api.jobassist.tech
 *
 * Why this exists:
 *   - Railway routes requests by the HTTP Host header. The frontend calls
 *     https://api.jobassist.tech/api, but Cloudflare's free plan cannot rewrite
 *     the Host header (Origin Rules Host-header override is Enterprise-only).
 *   - This Worker intercepts api.jobassist.tech/* at the Cloudflare edge,
 *     rewrites the request to Railway's hostname, and forwards it with
 *     Railway's Host header so Railway routes it to the backend.
 *
 * Deploy:
 *   1. Cloudflare dashboard → Workers & Pages → Create → Worker
 *   2. Name it `railway-proxy`, replace the starter code with this file.
 *   3. Deploy.
 *   4. Worker → Settings → Domains & Routes → Add Route → `api.jobassist.tech/*`
 *
 * No changes needed to the `api` DNS record (keep it proxied / orange cloud).
 * CORS and cookies are unaffected: the browser still talks to
 * api.jobassist.tech, and the backend still sees the original Origin header.
 */
export default {
  async fetch(request) {
    // Rewrite the request URL to Railway, preserving path + query string.
    const url = new URL(request.url);
    url.host = "jobassist-production-4362.up.railway.app";

    // Forward the original request headers, but tell Railway who it is.
    const headers = new Headers(request.headers);
    headers.set("host", "jobassist-production-4362.up.railway.app");

    return fetch(url.toString(), {
      method: request.method,
      headers,
      // GET/HEAD requests must not carry a body.
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // Don't let the proxy follow redirects; pass 3xx through to the client.
      redirect: "manual",
    });
  },
};
