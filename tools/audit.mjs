import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './site.mjs';
const manifest=JSON.parse(readFileSync(resolve(root,'reference/manifest.json'),'utf8'));
const resources=manifest.resources.filter(resource=>resource.status===200);
for(const resource of resources) {
  const path=resolve(root,resource.path);
  assert.ok(existsSync(path),`Missing ${resource.path}`);
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),resource.sha256,`Reference changed: ${resource.path}`);
}
const pages=JSON.parse(readFileSync(resolve(root,'reference/routes.json'),'utf8'));
assert.equal(pages.length,42);
for(const page of pages) assert.ok(existsSync(resolve(root,'public','.'+page.path,'index.html')),`Missing route ${page.path}`);
const old=JSON.parse(readFileSync(resolve(root,'public/assets/old-site/pages.json'),'utf8'));
for(const page of old.pages) {
  for(let i=0;i<page.slices.length;i++) assert.ok(existsSync(resolve(root,`public/assets/old-site/${page.slug}-${i}.webp`)));
  assert.ok(existsSync(resolve(root,`public/assets/old-site/thumbs/${page.slug}.webp`)));
}
console.log(`PASS: ${resources.length} captured resource hashes, ${pages.length} routes, ${old.pages.length} archived viewer pages.`);
