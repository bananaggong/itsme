import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAPI } from '../deployment/vercel/api.mjs';
import { hashInboxPassword, inboxCSV } from '../hosting/message-inbox.mjs';

const password = 'test-only-password-strong-1021';
const passwordHash = hashInboxPassword(password);
function fixture() {
  let value = { votes: {}, subscribers: {} }, revision = 0, time = 1800000000000;
  const storage = {
    async readStore() { return { value: structuredClone(value), etag: revision }; },
    async writeStore(next, etag) { if (etag !== revision) return false; value = structuredClone(next); revision++; return true; }
  };
  const api = createAPI(storage, () => time, { inboxPasswordHash: passwordHash });
  const req = (body, cookie, extra = {}, path = '/api/inbox/') => new Request('https://gwangil.xyz' + path, { method: body ? 'POST' : 'GET', headers: { Origin: 'https://gwangil.xyz', 'Content-Type': 'application/json', 'x-real-ip': '192.0.2.4', ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { api, req, snapshot: () => value, advance: n => { time += n; }, storage, login: async () => (await api(req({ action: 'login', password }))).headers.get('set-cookie')?.split(';')[0] };
}

test('inbox requires authentication for listing, export and state changes; sessions are private and revocable', async () => {
  const f = fixture();
  assert.equal((await f.api(f.req())).status, 401);
  assert.equal((await f.api(f.req(undefined, undefined, {}, '/api/inbox/?format=csv'))).status, 401);
  assert.equal((await f.api(f.req({ action: 'status', id: randomUUID(), status: 'read' }))).status, 401);
  assert.equal((await f.api(f.req({ action: 'login', password: 'wrong' }))).status, 401);
  assert.equal((await f.api(f.req({ action: 'login', password }, undefined, { Origin: 'https://other.invalid' }))).status, 403);
  const login = await f.api(f.req({ action: 'login', password }));
  const header = login.headers.get('set-cookie');
  for (const expected of ['__Host-gwangil-inbox=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(header.includes(expected));
  const cookie = header.split(';')[0];
  assert.equal((await f.api(f.req(undefined, cookie))).status, 200);
  assert.ok(!JSON.stringify(f.snapshot()).includes(cookie.split('=')[1]));
  assert.ok(!JSON.stringify(f.snapshot()).includes(password));
  assert.equal((await f.api(f.req(undefined, cookie + 'x'))).status, 401);
  assert.equal((await f.api(f.req({ action: 'logout' }, cookie))).status, 200);
  assert.equal((await f.api(f.req(undefined, cookie))).status, 401);
});

test('real storage contract: submit, read exact content, update status, export and preserve unrelated data', async () => {
  const f = fixture(); const note = { id: randomUUID(), message: '<img src=x onerror=alert(1)>\n두 번째 줄', email: 'owner@example.invalid' };
  assert.equal((await f.api(f.req(note, undefined, {}, '/api/messages/'))).status, 200);
  const cookie = await f.login();
  const read = await f.api(f.req(undefined, cookie));
  assert.match(read.headers.get('cache-control'), /no-store/);
  const result = await read.json();
  assert.equal(result.messages[0].message, note.message);
  assert.equal(result.messages[0].email, note.email);
  assert.ok(!JSON.stringify(result).includes('inboxSessions'));
  assert.equal((await f.api(f.req({ action: 'status', id: note.id, status: 'read' }, cookie))).status, 200);
  assert.equal((await (await f.api(f.req(undefined, cookie))).json()).messages[0].status, 'read');
  assert.equal((await f.api(f.req({ action: 'status', id: '__proto__', status: 'read' }, cookie))).status, 404);
  const csv = await f.api(f.req(undefined, cookie, {}, '/api/inbox/?format=csv'));
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-disposition'), /attachment/); assert.ok((await csv.text()).includes(note.email));
  assert.deepEqual(f.snapshot().votes, {}); assert.deepEqual(f.snapshot().subscribers, {});
  assert.equal((await f.api(f.req(undefined, undefined, {}, '/api/messages/'))).status, 405);
  assert.equal((await f.api(f.req(undefined, undefined, {}, '/api/message-notifications/'))).status, 404);
});

test('persistent login rate limit, session expiry, password rotation and unavailable configuration fail closed', async () => {
  const f = fixture();
  for (let i = 0; i < 6; i++) assert.equal((await f.api(f.req({ action: 'login', password: 'wrong' }))).status, 401);
  assert.equal((await f.api(f.req({ action: 'login', password }))).status, 429);
  f.advance(900001); const cookie = await f.login(); assert.ok(cookie);
  const changed = createAPI(f.storage, Date.now, { inboxPasswordHash: hashInboxPassword('another-password') });
  assert.equal((await changed(f.req(undefined, cookie))).status, 401);
  f.advance(7 * 86400000 + 1); assert.equal((await f.api(f.req(undefined, cookie))).status, 401);
  assert.equal((await createAPI(f.storage)(f.req())).status, 503);
});

test('CSV preserves quotes and newlines and neutralizes spreadsheet formulas', () => {
  const notes = ['=1+1', '  +SUM(1,2)', '@SUM(1)', '-1+2', '\t=1', 'hello, "world"\nnext'].map(message => ({ message, id: randomUUID(), createdAt: '2026-10-20T22:00:00Z', email: null, status: 'unread' }));
  const csv = inboxCSV(notes);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('2026-10-21 07:00:00'));
  for (const original of notes.slice(0, 5)) assert.ok(csv.includes('"\'' + original.message.replaceAll('"','""') + '"'));
  assert.ok(csv.includes('"hello, ""world""\nnext"'));
});
