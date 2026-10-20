import { createHash } from 'node:crypto';
import { waitUntil as keepAlive } from '@vercel/functions';
import books from '../../hosting/generated/books.json' with { type: 'json' };
import snapshot from '../../reference/ratings.json' with { type: 'json' };
import { storeContactNote } from '../../hosting/contact-notes.mjs';
import { deliverMessageNotifications, isNotificationRetryAuthorized } from '../../hosting/message-notifications.mjs';

const allowed = new Set(books);
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

function summary(book, store) {
  const seed = snapshot.ratings[book] || { average: 0, count: 0 };
  const votes = Object.values(store.votes[book] || {});
  const count = seed.count + votes.length;
  return { average: count ? (seed.average * seed.count + votes.reduce((a, b) => a + b, 0)) / count : 0, count };
}

async function parse(request) {
  let text = '';
  if (request.body) {
    const reader = request.body.getReader();
    let bytes = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        throw Object.assign(new Error('Too large'), { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  }
  const data = request.headers.get('content-type')?.includes('application/json')
    ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw Object.assign(new Error('Invalid request'), { status: 400 });
  }
  return data;
}

// An ETag guards every mutation so concurrent serverless instances cannot lose votes or subscribers.
async function mutate(storage, change) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { value, etag } = await storage.readStore();
    const result = change(value);
    if (await storage.writeStore(value, etag)) return result;
  }
  throw Object.assign(new Error('Concurrent update, retry'), { status: 503 });
}

export function createAPI(storage, now = Date.now, { notifyMessage, waitUntil = keepAlive, retrySecret } = {}) {
  return async function handle(request) {
    const url = new URL(request.url), path = url.pathname.replace(/\/$/, '');
    if (!['/api/ratings', '/api/subscribe', '/api/messages', '/api/message-notifications'].includes(path)) return json({ ok: false, message: 'Not found' }, 404);
    try {
      if (path === '/api/message-notifications') {
        if (!isNotificationRetryAuthorized(request, retrySecret)) return json({ ok: false }, 401);
        if (!['GET', 'POST'].includes(request.method)) return json({ ok: false }, 405, { Allow: 'GET, POST' });
        if (!notifyMessage) return json({ ok: false }, 503);
        return json({ ok: true, ...await deliverMessageNotifications({ mutate: change => mutate(storage, change), notify: notifyMessage, now }) });
      }
      if (path === '/api/ratings' && request.method === 'GET') {
        const { value } = await storage.readStore();
        const slugs = new Set([...Object.keys(snapshot.ratings), ...Object.keys(value.votes)]);
        return json({ ratings: Object.fromEntries([...slugs].map(book => [book, summary(book, value)])) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, message: 'Method not allowed' }, 405, { Allow: path === '/api/ratings' ? 'GET, POST' : 'POST' });
      }
      const origin = request.headers.get('origin');
      if (origin && new URL(origin).origin !== url.origin) return json({ ok: false, message: 'Cross-origin submission rejected' }, 403);
      const data = await parse(request);
      if (path === '/api/messages') {
        const result = await mutate(storage, value => storeContactNote(value, data, request.headers.get('x-real-ip'), now()));
        if (notifyMessage) {
          const task = deliverMessageNotifications({ mutate: change => mutate(storage, change), notify: notifyMessage, now, id: result.id })
            .catch(() => console.error('Message notification remains queued for retry.'));
          if (waitUntil) waitUntil(task); else await task;
        }
        return json(result);
      }
      if (path === '/api/ratings') {
        if (!allowed.has(data.book) || !Number.isInteger(data.stars) || data.stars < 1 || data.stars > 5 || typeof data.voter !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(data.voter)) {
          return json({ ok: false, message: 'Invalid rating' }, 400);
        }
        const voter = sha(data.voter);
        const result = await mutate(storage, value => {
          value.votes[data.book] ||= {};
          value.votes[data.book][voter] = data.stars;
          return summary(data.book, value);
        });
        return json({ ok: true, ...result });
      }
      if (data.website) return json({ ok: true });
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, message: 'Invalid email address' }, 400);
      // Vercel sets x-real-ip at its trusted proxy; raw addresses are never persisted.
      const identity = sha(request.headers.get('x-real-ip') || 'unknown');
      const timestamp = now(), minute = Math.floor(timestamp / 60000);
      const result = await mutate(storage, value => {
        value.limits ||= {};
        for (const [key, limit] of Object.entries(value.limits)) if (limit.minute < minute) delete value.limits[key];
        const limit = value.limits[identity] ||= { minute, count: 0 };
        limit.count++;
        if (limit.count > 10) return false;
        value.subscribers[email] ||= { email, createdAt: new Date(timestamp).toISOString(), status: 'pending-import' };
        return true;
      });
      if (!result) return json({ ok: false, message: 'Please try again in a minute' }, 429);
      if (request.headers.get('accept')?.includes('application/json')) return json({ ok: true });
      return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Thanks for subscribing</title><p>Thanks! Your email has been saved.</p><a href="/newsletter/">Back to the newsletter</a></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (error) {
      return json({ ok: false, message: 'Unable to complete the request' }, error.status || (error instanceof SyntaxError ? 400 : 500));
    }
  };
}
