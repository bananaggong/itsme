import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep capture provenance immutable. Intentional edits have explicit, reviewed hashes;
// neither original resources nor personalized resources may change unnoticed.
export function auditCapturedResources(root, resources, overrides) {
  const captured = new Map(resources.map(resource => [resource.path, resource]));
  for (const [path, override] of Object.entries(overrides)) {
    assert.ok(captured.has(path), `Unknown reference override: ${path}`);
    assert.equal(override.referenceSha256, captured.get(path).sha256, `Reference baseline mismatch: ${path}`);
    assert.match(override.sha256, /^[a-f0-9]{64}$/, `Invalid personalized hash: ${path}`);
    assert.ok(typeof override.reason === 'string' && override.reason.trim(), `Missing personalization reason: ${path}`);
  }
  for (const resource of resources) {
    const path = resolve(root, resource.path);
    assert.ok(existsSync(path), `Missing ${resource.path}`);
    const expected = overrides[resource.path]?.sha256 ?? resource.sha256;
    const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(hash, expected, `${overrides[resource.path] ? 'Personalized resource' : 'Reference'} changed: ${resource.path}`);
  }
}
