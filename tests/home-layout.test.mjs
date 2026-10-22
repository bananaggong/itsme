import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personalizeHTML } from '../tools/personalize.mjs';
import { HOME_TILE_ORDER, HIDDEN_HOME_TILES, personalizeHomeLayout } from '../tools/home-layout.mjs';

const source = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('home renders the approved order without the board or saved-order scripts', () => {
  const html = personalizeHTML(source);
  const names = [...html.matchAll(/class="tile tile--([\w-]+)/g)].map(match => match[1]);
  assert.deepEqual(names, HOME_TILE_ORDER.filter(name => name !== 'freeform'));
  assert.match(html, /data-layout="fixed"/);
  assert.doesNotMatch(html, /tile-order|\/rearrange\.js|class="ra-(?:edit|controls|bar)"/);
  assert.doesNotMatch(html, /\/freeform\.(?:js|css)|class="tile tile--freeform/);
  // Moving full roots must retain nested widgets and their interactive controls.
  for (const marker of ['class="siri-button"', 'data-grape-player', 'data-note-open', 'id="project-workbench"', 'id="instagram-writing"']) {
    assert.ok(html.includes(marker), `Missing nested widget: ${marker}`);
  }
});

test('the preserved board can be restored with the visibility setting', () => {
  HIDDEN_HOME_TILES.delete('freeform');
  try {
    const html = personalizeHTML(source);
    assert.match(html, /class="tile tile--freeform"/);
    assert.match(html, /src="\/freeform\.js/);
    assert.match(html, /href="\/freeform\.css/);
    assert.match(html, /id="ff-file"/);
  } finally {
    HIDDEN_HOME_TILES.add('freeform');
  }
});

test('other pages are not rearranged', () => {
  const page = '<main><div class="grid"><article>Project</article></div></main>';
  assert.equal(personalizeHomeLayout(page), page);
});
