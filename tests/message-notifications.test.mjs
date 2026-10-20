import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createFormSubmitNotifier, deliverMessageNotifications } from '../hosting/message-notifications.mjs';
import { createAPI } from '../deployment/vercel/api.mjs';

function fixture() {
  let value = { votes: {}, subscribers: {}, messages: {} }, revision = 0, time = 1800000000000;
  const storage = {
    async readStore() { return { value: structuredClone(value), etag: revision }; },
    async writeStore(next, etag) { if (revision !== etag) return false; value = structuredClone(next); revision++; return true; }
  };
  const mutate = async change => {
    for (let i = 0; i < 8; i++) {
      const { value, etag } = await storage.readStore();
      const result = change(value);
      if (await storage.writeStore(value, etag)) return result;
    }
    throw new Error('Conflict');
  };
  return { storage, mutate, now: () => time, advance: amount => { time += amount; }, snapshot: () => structuredClone(value) };
}
const note = (extra = {}) => ({ id: randomUUID(), message: '테스트 메시지\n두 번째 줄', email: null, createdAt: new Date(1800000000000).toISOString(), status: 'unread', ...extra });

test('notification uses only configured recipient, preserves plain text, and supports optional Reply-To', async () => {
  const sent = [];
  const notify = createFormSubmitNotifier({ recipient: 'owner@example.invalid', fetchImpl: async (url, options) => {
    sent.push({ url, body: JSON.parse(options.body) });
    return Response.json({ success: 'true', message: 'Success' });
  } });
  await notify(note({ email: 'reply@example.invalid', recipient: 'attacker@example.invalid' }));
  await notify(note());
  assert.equal(sent[0].url, 'https://formsubmit.co/ajax/owner%40example.invalid');
  assert.equal(sent[0].body._replyto, 'reply@example.invalid');
  assert.equal(sent[0].body.email, 'reply@example.invalid');
  assert.equal(sent[0].body.message, '테스트 메시지\n두 번째 줄');
  assert.equal(sent[0].body._url, 'https://gwangil.xyz/');
  assert.equal(sent[1].body._replyto, undefined);
  assert.equal(sent[1].body.email, undefined);
  assert.throws(() => createFormSubmitNotifier({ recipient: 'invalid\nrecipient' }));
});

test('activation, rejection, malformed responses, and network failures never count as accepted', async () => {
  for (const [reply, code] of [
    [() => Response.json({ success: 'false', message: 'This form needs Activation.' }), 'activation_required'],
    [() => Response.json({ success: 'false' }), 'provider_rejected'],
    [() => new Response('<html>Error</html>', { status: 502 }), 'provider_rejected'],
    [() => { throw new Error('Secret network detail'); }, 'provider_unreachable']
  ]) {
    const notify = createFormSubmitNotifier({ recipient: 'owner@example.invalid', fetchImpl: async () => reply() });
    await assert.rejects(notify(note()), error => error.code === code && !error.message.includes('Secret'));
  }
});

test('concurrent notification workers claim once and accepted notifications are not sent again', async () => {
  const f = fixture(), message = note();
  await f.mutate(store => { store.messages[message.id] = message; });
  let calls = 0, finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const notify = async input => {
    calls++;
    assert.equal(f.snapshot().messages[input.id].notification.status, 'sending');
    await gate;
    return { provider: 'formsubmit' };
  };
  const workers = [1, 2, 3].map(() => deliverMessageNotifications({ ...f, notify }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  finish();
  await Promise.all(workers);
  assert.equal(f.snapshot().messages[message.id].notification.status, 'accepted');
  await deliverMessageNotifications({ ...f, notify });
  assert.equal(calls, 1);
});

test('failed notifications retain the message, back off, and recover on a later retry', async () => {
  const f = fixture(), message = note();
  await f.mutate(store => { store.messages[message.id] = message; });
  let calls = 0;
  const notify = async () => {
    if (++calls === 1) throw Object.assign(new Error('Provider failed'), { code: 'provider_unreachable' });
    return { provider: 'formsubmit' };
  };
  assert.deepEqual(await deliverMessageNotifications({ ...f, notify }), { accepted: 0, deferred: 1 });
  assert.equal(f.snapshot().messages[message.id].message, message.message);
  await deliverMessageNotifications({ ...f, notify });
  assert.equal(calls, 1);
  f.advance(300001);
  assert.deepEqual(await deliverMessageNotifications({ ...f, notify }), { accepted: 1, deferred: 0 });
  assert.equal(f.snapshot().messages[message.id].notification.attempts, 2);
});

test('expired worker leases recover, while an unpersisted claim never sends an email', async () => {
  const f = fixture(), message = note({ notification: { status: 'sending', leaseUntil: 1800000001000, attempts: 1, leaseId: 'old' } });
  await f.mutate(store => { store.messages[message.id] = message; });
  let calls = 0;
  const notify = async () => { calls++; return { provider: 'formsubmit' }; };
  await deliverMessageNotifications({ ...f, notify });
  assert.equal(calls, 0);
  f.advance(1001);
  await deliverMessageNotifications({ ...f, notify });
  assert.equal(calls, 1);
  await assert.rejects(deliverMessageNotifications({ mutate: async () => { throw new Error('Disk unavailable'); }, notify }));
  assert.equal(calls, 1);
});

test('API saves immediately, keeps the email task alive, and authenticates retry endpoint', async () => {
  const f = fixture(), tasks = [], secret = 'test-only-secret-'.repeat(3);
  let finish, calls = 0;
  const gate = new Promise(resolve => { finish = resolve; });
  const notify = async () => { calls++; await gate; return { provider: 'formsubmit' }; };
  const handler = createAPI(f.storage, f.now, { notifyMessage: notify, waitUntil: task => tasks.push(task), retrySecret: secret });
  const message = note({ email: 'reply@example.invalid' });
  const request = new Request('https://gwangil.xyz/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.equal(f.snapshot().messages[message.id].message, message.message);
  assert.equal(tasks.length, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  finish();
  await Promise.all(tasks);
  assert.equal(f.snapshot().messages[message.id].notification.status, 'accepted');
  const url = 'https://gwangil.xyz/api/message-notifications';
  for (const authorization of ['', 'Bearer wrong']) assert.equal((await handler(new Request(url, { headers: { authorization } }))).status, 401);
  const retry = await handler(new Request(url, { headers: { authorization: `Bearer ${secret}` } }));
  assert.deepEqual(await retry.json(), { ok: true, accepted: 0, deferred: 0 });
  assert.equal(calls, 1);
  const unconfigured = createAPI(f.storage);
  assert.equal((await unconfigured(new Request(url, { headers: { authorization: `Bearer ${secret}` } }))).status, 401);
});
