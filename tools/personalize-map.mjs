import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const directory = new URL('../public/personal/map/', import.meta.url);
const names = ['map-light.svg', 'map-dark.svg', 'route.json', 'google-home.svg'];
const present = names.map(name => existsSync(new URL(name, directory)));
if (present.some(Boolean) && !present.every(Boolean)) throw new Error('Personal map assets are incomplete; rebuild all map files together.');
export const mapReady = present.every(Boolean);
const route = mapReady ? JSON.parse(readFileSync(new URL('route.json', directory), 'utf8')) : null;
export const mapVersion = mapReady ? names.reduce((hash, name) => hash.update(readFileSync(new URL(name, directory))), createHash('sha256')).digest('hex').slice(0, 12) : '';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function personalizeMapHTML(html) {
  if (!mapReady || !html.includes('class="tile tile--findmy"')) return html;
  return html.replace(/<section class="tile tile--findmy"[^>]*>/, `<section class="tile tile--findmy" id="majang-walk" aria-label="${escape(route.title)} 애니메이션">`)
    .replace(/src="\/assets\/map\/(map-(?:light|dark)\.svg)(?:\?[^"]*)?"/g, (_, file) => `src="/personal/map/${file}?v=${mapVersion}"`)
    .replace(/(<span class="fm-card-text"><strong>)[^<]*/, (_, prefix) => prefix+escape(route.title))
    .replace(/<small><span class="fm-street">[\s\S]*?<\/small>/, `<small><span class="fm-address">${escape(route.cardAddress)}</span></small>`)
    .replace('<!-- Sam\'s pin: photo, pointer, location dot and accuracy halo -->', `<div class="fm-home" role="img" aria-label="집: ${escape(route.cardAddress)}" title="집 · ${escape(route.cardAddress)}"><span class="fm-home-marker"><img src="/personal/map/google-home.svg?v=${mapVersion}" alt="" width="20" height="20"></span><span class="fm-home-label" aria-hidden="true">집</span></div>`);
}

export function personalizeMapJavaScript(source) {
  if (!mapReady) return source;
  return source.replace(/\/assets\/map\/route\.json(?:\?[^']*)?/, `/personal/map/route.json?v=${mapVersion}`)
    .replace('const LOOP_MS = 45000;', `const LOOP_MS = ${route.loopMs};`)
    .replace("const streetLabel = tile.querySelector('.fm-street');", "const streetLabel = tile.querySelector('.fm-street');\n  const home = tile.querySelector('.fm-home');")
    .replace('offsetY = (tile.clientHeight - height * scale) / 2;', `offsetY = (tile.clientHeight - height * scale) / 2;
    if (home) home.style.transform = \`translate(\${offsetX + route.home.x * scale}px, \${offsetY + route.home.y * scale}px)\`;`)
    .replace('if (streetLabel.textContent !== street)', 'if (streetLabel && streetLabel.textContent !== street)')
    .replace('person.style.transform = `translate(${offsetX + x * scale}px, ${offsetY + y * scale}px)`;', `// Align the moving portrait to device pixels so its composited layer stays sharp.
    const bounds = tile.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const originX = bounds.left + tile.clientLeft;
    const originY = bounds.top + tile.clientTop;
    const pinX = Math.round((originX + offsetX + x * scale) * ratio) / ratio - originX;
    const pinY = Math.round((originY + offsetY + y * scale) * ratio) / ratio - originY;
    person.style.transform = \`translate(\${pinX}px, \${pinY}px)\`;`)
    .replace('let progress = 0.12;', 'let progress = 0;');
}
