import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Saved from Gwangil's Chrome layout on 2026-10-23. Keep source/keyboard order
// consistent with this layout, including on mobile and before JavaScript loads.
export const HOME_TILE_ORDER = [
  'intro', 'avatar', 'office', 'spotify', 'switcher', 'newsletter',
  'findmy', 'contact', 'photos', 'books', 'freeform', 'shortcut',
];
// Remove 'freeform' here to restore the board. Its original markup, assets and
// visitors' saved board data remain intact; hidden boards do not initialize.
export const HIDDEN_HOME_TILES = new Set(['freeform']);
export const homeLayoutVersion = createHash('sha256')
  .update(readFileSync(new URL(import.meta.url))).digest('hex').slice(0, 10);

// The captured HTML contains nested divs and buttons. Match each complete root
// instead of stopping at the first descendant's closing tag.
function elementEnd(html, start, tag) {
  const tags = new RegExp(`<!--[\\s\\S]*?-->|<\\/?${tag}\\b[^>]*>`, 'g');
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(html));) {
    if (match[0].startsWith('<!--')) continue;
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tags.lastIndex;
  }
  throw new Error(`Unclosed home layout element: ${tag}`);
}

export function personalizeHomeLayout(html) {
  const opening = '<div class="grid">';
  const start = html.indexOf(opening);
  if (start === -1 || !html.includes('id="intro"')) return html;
  const end = elementEnd(html, start, 'div');
  const content = html.slice(start + opening.length, end - '</div>'.length);
  const tiles = new Map();
  const roots = /<(section|div|a|button)\b[^>]*class="tile tile--([\w-]+)[^"]*"[^>]*>/g;
  for (let match; (match = roots.exec(content));) {
    const tileEnd = elementEnd(content, match.index, match[1]);
    if (tiles.has(match[2])) throw new Error(`Duplicate home tile: ${match[2]}`);
    tiles.set(match[2], content.slice(match.index, tileEnd));
    roots.lastIndex = tileEnd;
  }
  for (const name of HOME_TILE_ORDER) {
    if (!tiles.has(name)) throw new Error(`Missing home tile: ${name}`);
  }
  const order = [...HOME_TILE_ORDER, ...[...tiles.keys()].filter(name => !HOME_TILE_ORDER.includes(name))];
  const fixed = order.filter(name => !HIDDEN_HOME_TILES.has(name)).map(name => tiles.get(name)).join('\n\n');
  html = html.slice(0, start) + `<div class="grid" data-layout="fixed">\n${fixed}\n</div>` + html.slice(end);

  // Ignore old visitor-specific tile-order values without deleting any storage.
  html = html
    .replace(/<!-- Rearrange \(rearrange\.js\):[\s\S]*?<\/script>\s*/, '')
    .replace(/<div class="ra-controls">[\s\S]*?<\/div>\s*/, '')
    .replace(/<!-- Rearrange: floating[\s\S]*?<p class="ra-status sr-only"[^>]*><\/p>\s*/, '')
    .replace(/<script\b[^>]*src="\/rearrange\.js[^\"]*"[^>]*><\/script>\s*/, '');
  if (HIDDEN_HOME_TILES.has('freeform')) {
    html = html
      .replace(/<script\b[^>]*src="\/freeform\.js[^\"]*"[^>]*><\/script>\s*/, '')
      .replace(/<link\b[^>]*href="\/freeform\.css[^\"]*"[^>]*>\s*/, '');
  }
  return html;
}
