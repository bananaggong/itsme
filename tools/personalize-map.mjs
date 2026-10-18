import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const directory = new URL('../public/personal/map/', import.meta.url);
const names = ['map-light.svg', 'map-dark.svg', 'route.json'];
const present = names.map(name => existsSync(new URL(name, directory)));
if (present.some(Boolean) && !present.every(Boolean)) throw new Error('Personal map assets are incomplete; rebuild all map files together.');
export const mapReady = present.every(Boolean);
const route = mapReady ? JSON.parse(readFileSync(new URL('route.json', directory), 'utf8')) : null;
export const mapVersion = mapReady ? names.reduce((hash, name) => hash.update(readFileSync(new URL(name, directory))), createHash('sha256')).digest('hex').slice(0, 12) : '';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function personalizeMapHTML(html) {
  if (!mapReady || !html.includes('class="tile tile--findmy"')) return html;
  return html.replace(/<section class="tile tile--findmy"[^>]*>/, '<section class="tile tile--findmy" id="majang-walk" aria-label="서울 성동구 마장동 주변 산책 애니메이션">')
    .replace(/src="\/assets\/map\/(map-(?:light|dark)\.svg)(?:\?[^"]*)?"/g, (_, file) => `src="/personal/map/${file}?v=${mapVersion}"`)
    .replace(/(<span class="fm-card-text"><strong>)[^<]*/, '$1마장동 산책')
    .replace(/(<span class="fm-street">)[^<]*/, (_, prefix) => prefix+escape(route.streets[0]))
    .replace(' · 샘플 경로', ' · 산책 애니메이션');
}

export function personalizeMapJavaScript(source) {
  if (!mapReady) return source;
  return source.replace(/\/assets\/map\/route\.json(?:\?[^']*)?/, `/personal/map/route.json?v=${mapVersion}`)
    .replace('const LOOP_MS = 45000;', `const LOOP_MS = ${route.loopMs};`)
    .replace('let progress = 0.12;', 'let progress = 0;');
}
