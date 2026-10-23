import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { personalizeHTML } from '../tools/personalize.mjs';
import { projects } from '../tools/projects.mjs';

test('every home logo and preview opens an existing internal detail page', () => {
  const html = personalizeHTML(readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'));
  for (const project of projects) {
    assert.equal(project.url, `/projects/${project.id}/`);
    assert.ok(existsSync(new URL(`../public${project.url}index.html`, import.meta.url)));
    assert.ok(html.includes(`href="${project.url}" data-app="${project.id}"`));
    assert.ok(html.includes(`class="pj-card" href="${project.url}"`));
  }
  assert.doesNotMatch(html, /<button class="sw-app/);
});

test('Galpang list card and site search use the same internal route', () => {
  const html = personalizeHTML(readFileSync(new URL('../public/projects/index.html', import.meta.url), 'utf8'));
  assert.match(html, /id="galpang" href="\/projects\/galpang\/"/);
  assert.doesNotMatch(html, /id="galpang"[^>]+target="_blank"/);
});
