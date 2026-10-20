import { createHash } from 'node:crypto';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const digest = value => createHash('sha256').update(value).digest('hex');

// Shared by the local server and the private Vercel store. No public read endpoint.
export function storeContactNote(store, data, address, timestamp) {
  const { id, message, email = '', website = '' } = data;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) fail(400, 'Invalid request identifier');
  if (typeof message !== 'string' || !message.trim() || message.length > 1200) fail(400, 'Invalid message');
  if (typeof email !== 'string' || email.length > 254 || (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) fail(400, 'Invalid reply address');
  if (website) fail(400, 'Invalid submission');

  const content = { message: message.trim(), email: email.trim().toLowerCase() || null };
  store.messages ||= {};
  const existing = store.messages[id];
  if (existing) {
    if (existing.message !== content.message || existing.email !== content.email) fail(409, 'Request identifier already used');
    return { ok: true, id };
  }

  // Keep only a hashed connection identity and a ten-minute submission window.
  const identity = digest(address || 'unknown');
  store.messageLimits ||= {};
  for (const [key, value] of Object.entries(store.messageLimits)) {
    if (value.until <= timestamp) delete store.messageLimits[key];
  }
  const limit = store.messageLimits[identity] ||= { count: 0, until: timestamp + 600000 };
  if (limit.count >= 5) fail(429, 'Please try again later');
  limit.count++;
  store.messages[id] = { id, ...content, createdAt: new Date(timestamp).toISOString(), status: 'unread' };
  return { ok: true, id };
}
