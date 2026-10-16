import { handleAPI } from './api.mjs';

export default {
  async fetch(request: Request, env: { DB: D1Database; ASSETS: Fetcher }) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleAPI(request, env.DB);
    if (url.pathname === '/downloads' || url.pathname === '/downloads/') {
      return Response.redirect('https://thisdickie.gumroad.com/', 302);
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    return new Response(response.body, { status: response.status, headers });
  },
};
