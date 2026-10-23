import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './site.mjs';
import { auditCapturedResources } from './reference-integrity.mjs';
const manifest=JSON.parse(readFileSync(resolve(root,'reference/manifest.json'),'utf8'));
const resources=manifest.resources.filter(resource=>resource.status===200);
const overrides=JSON.parse(readFileSync(resolve(root,'personalization/reference-overrides.json'),'utf8'));
auditCapturedResources(root,resources,overrides);
const pages=JSON.parse(readFileSync(resolve(root,'reference/routes.json'),'utf8'));
assert.equal(pages.length,42);
for(const page of pages) assert.ok(existsSync(resolve(root,'public','.'+page.path,'index.html')),`Missing route ${page.path}`);
const old=JSON.parse(readFileSync(resolve(root,'public/assets/old-site/pages.json'),'utf8'));
for(const page of old.pages) {
  for(let i=0;i<page.slices.length;i++) assert.ok(existsSync(resolve(root,`public/assets/old-site/${page.slug}-${i}.webp`)));
  assert.ok(existsSync(resolve(root,`public/assets/old-site/thumbs/${page.slug}.webp`)));
}
console.log(`PASS: ${resources.length} resource hashes (${Object.keys(overrides).length} explicit personalizations), ${pages.length} captured routes, ${old.pages.length} archived viewer pages.`);
