import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { auditCapturedResources } from '../tools/reference-integrity.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

test('explicit personalizations preserve provenance and still detect unexpected edits', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'itsme-integrity-'));
  try {
    const resources = [{ path: 'original.txt', sha256: hash('original') }, { path: 'personal.txt', sha256: hash('captured') }];
    const overrides = { 'personal.txt': { referenceSha256: hash('captured'), sha256: hash('personalized'), reason: 'Reviewed portfolio copy' } };
    writeFileSync(resolve(directory, 'original.txt'), 'original');
    writeFileSync(resolve(directory, 'personal.txt'), 'personalized');
    assert.doesNotThrow(() => auditCapturedResources(directory, resources, overrides));
    writeFileSync(resolve(directory, 'personal.txt'), 'unexpected');
    assert.throws(() => auditCapturedResources(directory, resources, overrides), /Personalized resource changed/);
    writeFileSync(resolve(directory, 'personal.txt'), 'personalized');
    writeFileSync(resolve(directory, 'original.txt'), 'unexpected');
    assert.throws(() => auditCapturedResources(directory, resources, overrides), /Reference changed/);
    writeFileSync(resolve(directory, 'original.txt'), 'original');
    assert.throws(() => auditCapturedResources(directory, resources, { ...overrides, 'unknown.txt': overrides['personal.txt'] }), /Unknown reference override/);
    assert.throws(() => auditCapturedResources(directory, resources, { 'personal.txt': { ...overrides['personal.txt'], referenceSha256: hash('wrong capture') } }), /Reference baseline mismatch/);
  } finally {
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('itsme-integrity-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
