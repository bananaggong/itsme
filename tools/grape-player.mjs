import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const asset = path => readFileSync(new URL('../public/personal/grapes/' + path, import.meta.url));
export const grapeVersion = createHash('sha256').update(asset('player.js')).update(asset('player.css')).digest('hex').slice(0, 12);
const html = readFileSync(new URL('../personalization/grape-player/widget.html', import.meta.url), 'utf8');
export function replacePlaylist(htmlSource) {
  if (!htmlSource.includes('class="tile tile--spotify"')) return htmlSource;
  return htmlSource
    .replace(/<section class="tile tile--spotify"[\s\S]*?<\/section>/, html)
    .replace(/<script\b[^>]*src="\/playlists\.js[^\"]*"[^>]*><\/script>/, '')
    .replace('</head>', `<link rel="stylesheet" href="/personal/grapes/player.css?v=${grapeVersion}"></head>`)
    .replace('</body>', `<script type="module" src="/personal/grapes/player.js?v=${grapeVersion}"></script></body>`);
}
