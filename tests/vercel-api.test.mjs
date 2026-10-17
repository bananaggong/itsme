import test from 'node:test';
import assert from 'node:assert/strict';
import { createAPI } from '../deployment/vercel/api.mjs';
import books from '../hosting/generated/books.json' with { type: 'json' };

function fixture() {
  let value = { votes: {}, subscribers: {}, limits: {} }, revision = 0, collisions = 0;
  const storage = {
    async readStore() { return { value: structuredClone(value), etag: String(revision) }; },
    async writeStore(next, etag) {
      if (etag !== String(revision)) { collisions++; return false; }
      value = structuredClone(next); revision++; return true;
    },
  };
  return { handle: createAPI(storage, () => 1800000000000), snapshot: () => value, collisions: () => collisions, storage };
}
function request(path, body, headers = {}) {
  return new Request('https://gwangil.xyz/api/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://gwangil.xyz', 'x-real-ip': '192.0.2.1', ...headers },
    body: JSON.stringify(body),
  });
}

test('Vercel API preserves concurrent votes, replaces re-ratings and only exposes summaries', async () => {
  const f = fixture(), book = books[0];
  const before = await (await f.handle(new Request('https://gwangil.xyz/api/ratings'))).json();
  const initial = before.ratings[book] || { average: 0, count: 0 };
  const responses = await Promise.all(Array.from({ length: 5 }, (_, i) => f.handle(request('ratings', { book, stars: i + 1, voter: 'reader-000' + i }))));
  for (const response of responses) assert.equal(response.status, 200);
  assert.ok(f.collisions() > 0, 'the test must exercise conflicting writers');
  const rerating = await (await f.handle(request('ratings', { book, stars: 5, voter: 'reader-0000' }))).json();
  assert.equal(rerating.count, initial.count + 5);
  assert.equal(rerating.average, (initial.average * initial.count + 19) / (initial.count + 5));
  const response = await f.handle(new Request('https://gwangil.xyz/api/ratings'));
  const text = await response.text();
  assert.ok(!text.includes('reader-000'));
  assert.ok(!text.includes('subscribers'));
  assert.equal(Object.keys(f.snapshot().votes[book]).length, 5);
  assert.ok(!JSON.stringify(f.snapshot()).includes('reader-000'));
});

test('Vercel subscriber queue deduplicates, persists rate limits and rejects cross-origin writes', async () => {
  const f = fixture();
  const first = await f.handle(request('subscribe', { email: ' DEPLOY-TEST@example.invalid ' }));
  assert.equal(first.status, 200);
  assert.equal((await f.handle(request('subscribe', { email: 'deploy-test@example.invalid' }))).status, 200);
  assert.equal(Object.keys(f.snapshot().subscribers).length, 1);
  assert.equal(f.snapshot().subscribers['deploy-test@example.invalid'].status, 'pending-import');
  for (let i = 0; i < 8; i++) assert.equal((await f.handle(request('subscribe', { email: 'deploy-test@example.invalid' }))).status, 200);
  const restarted = createAPI(f.storage, () => 1800000000000);
  assert.equal((await restarted(request('subscribe', { email: 'deploy-test@example.invalid' }))).status, 429);
  assert.ok(!JSON.stringify(f.snapshot()).includes('192.0.2.1'));
  assert.equal((await f.handle(request('subscribe', { email: 'another@example.invalid' }, { Origin: 'https://other.invalid' }))).status, 403);
  assert.equal(Object.keys(f.snapshot().subscribers).length, 1);
  assert.equal((await f.handle(new Request('https://gwangil.xyz/api/subscribe'))).status, 405);
});

test('Vercel API rejects invalid and oversized input and fails closed on storage errors', async () => {
  const f = fixture();
  assert.equal((await f.handle(request('ratings', { book: books[0], stars: 6, voter: 'reader-0000' }))).status, 400);
  assert.equal((await f.handle(request('subscribe', null))).status, 400);
  assert.equal((await f.handle(request('subscribe', { email: 'invalid' }))).status, 400);
  assert.equal((await f.handle(request('subscribe', { email: 'x'.repeat(9000) }))).status, 413);
  const broken = createAPI({ async readStore() { throw new Error('Storage unavailable'); } });
  const response = await broken(request('subscribe', { email: 'deploy-test@example.invalid' }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).ok, false);
});
