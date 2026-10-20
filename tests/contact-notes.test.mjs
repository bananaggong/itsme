import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { makeServer } from '../tools/site.mjs';
import { createAPI } from '../deployment/vercel/api.mjs';

async function local(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'itsme-notes-'));
  const dataDir = options.failSave ? join(directory, 'blocked') : directory;
  if (options.failSave) writeFileSync(dataDir, 'not a directory');
  let time = 1800000000000;
  const server = makeServer({ dataDir, now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    const checked = resolve(directory);
    assert.ok(checked.startsWith(resolve(tmpdir(), 'itsme-notes-')));
    rmSync(checked, { recursive: true, force: true });
  });
  return {
    base, dataDir,
    post: (body, headers = {}) => fetch(`${base}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
      body: JSON.stringify(body)
    }),
    snapshot: () => JSON.parse(readFileSync(join(dataDir, 'store.json'), 'utf8')),
    advance: amount => { time += amount; }
  };
}
const note = (extra = {}) => ({ id: randomUUID(), message: '로컬 테스트: 함께 만들고 싶은 이야기가 있어요.\n두 번째 줄도 유지해요.', ...extra });

test('local notes persist once across retry and restart, with optional email and no public inbox', async t => {
  const f = await local(t);
  const body = note();
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await f.post(body);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, id: body.id });
  }
  await f.post(note({ email: ' REPLY@example.invalid ' }));
  const saved = f.snapshot();
  assert.equal(Object.keys(saved.messages).length, 2);
  assert.equal(saved.messages[body.id].message, body.message);
  assert.equal(saved.messages[body.id].email, null);
  assert.ok(!JSON.stringify(saved).includes('127.0.0.1'));
  assert.equal((await fetch(`${f.base}/api/messages`)).status, 405);
  assert.equal((await fetch(`${f.base}/.data/store.json`)).status, 404);
  const publicRatings = await (await fetch(`${f.base}/api/ratings`)).text();
  assert.ok(!publicRatings.includes('messages'));
  assert.ok(!publicRatings.includes('REPLY'));

  const restarted = makeServer({ dataDir: f.dataDir });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${restarted.address().port}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    assert.equal(response.status, 200);
    assert.equal(Object.keys(f.snapshot().messages).length, 2);
  } finally { await new Promise(resolve => restarted.close(resolve)); }
});

test('local notes validate content, reject conflicting retries and cross-origin submissions', async t => {
  const f = await local(t);
  for (const body of [null, note({ message: ' \n ' }), note({ message: '가'.repeat(1201) }), note({ email: 'invalid' }), note({ id: '__proto__' }), note({ website: 'spam' })]) {
    assert.equal((await f.post(body)).status, 400);
  }
  assert.equal((await f.post(note(), { Origin: 'https://other.invalid' })).status, 403);
  assert.equal((await f.post(note({ message: 'x'.repeat(9000) }))).status, 413);
  const body = note();
  await f.post(body);
  assert.equal((await f.post({ ...body, message: 'different content' })).status, 409);
  assert.equal(f.snapshot().messages[body.id].message, body.message);
});

test('local notes limit new submissions while allowing safe retries and expire the window', async t => {
  const f = await local(t);
  const first = note();
  assert.equal((await f.post(first)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await f.post(note())).status, 200);
  assert.equal((await f.post(note())).status, 429);
  assert.equal((await f.post(first)).status, 200);
  assert.equal(Object.keys(f.snapshot().messages).length, 5);
  f.advance(600001);
  assert.equal((await f.post(note())).status, 200);
});

test('local notes return failure when the private file cannot be saved', async t => {
  const f = await local(t, { failSave: true });
  const response = await f.post(note());
  assert.equal(response.status, 500);
  assert.equal((await response.json()).ok, false);
});

test('Vercel notes preserve concurrent submissions and deduplicate retries in private storage', async () => {
  let value = { votes: {}, subscribers: {}, limits: {} }, revision = 0;
  const storage = {
    async readStore() { return { value: structuredClone(value), etag: revision }; },
    async writeStore(next, etag) {
      if (revision !== etag) return false;
      value = structuredClone(next); revision++; return true;
    }
  };
  const handler = createAPI(storage, () => 1800000000000);
  const request = body => new Request('https://gwangil.xyz/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://gwangil.xyz', 'x-real-ip': '192.0.2.3' },
    body: JSON.stringify(body)
  });
  const first = note();
  const replies = await Promise.all([first, first, note(), note()].map(body => handler(request(body))));
  assert.ok(replies.every(response => response.status === 200));
  assert.equal(Object.keys(value.messages).length, 3);
  assert.ok(!JSON.stringify(value).includes('192.0.2.3'));
  assert.equal((await handler(new Request('https://gwangil.xyz/api/messages'))).status, 405);
  const publicData = await (await handler(new Request('https://gwangil.xyz/api/ratings'))).text();
  assert.ok(!publicData.includes(first.message));
  const broken = createAPI({ async readStore() { throw new Error('Offline'); } });
  const failed = await broken(request(note()));
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).ok, false);
});
