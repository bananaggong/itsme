import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const instagram = JSON.parse(readFileSync(new URL('../personalization/instagram.json', import.meta.url), 'utf8'));
const hash = createHash('sha256').update(JSON.stringify(instagram)).update(readFileSync(new URL(import.meta.url)));
for (const path of ['/personal/instagram/widget.css', '/personal/instagram/instagram.svg', ...instagram.posts.map(post => post.image)]) {
  hash.update(readFileSync(new URL('../public'+path, import.meta.url)));
}
export const instagramVersion = hash.digest('hex').slice(0, 12);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const external = 'target="_blank" rel="noopener noreferrer"';

export function personalizeInstagramHTML(html) {
  if (!html.includes('class="tile tile--newsletter"')) return html;
  const posts = instagram.posts.map(post => `<a class="ig-post" href="${escape(post.url)}" ${external} aria-label="${escape(post.title)} — Instagram에서 읽기" title="${escape(post.title)}"><img src="${escape(post.image)}?v=${instagramVersion}" alt="${escape(post.title)}" width="945" height="1181" loading="lazy" decoding="async"></a>`).join('');
  // Keep the existing newsletter key so visitors' saved tile positions still work.
  const widget = `<section class="tile tile--newsletter tile--instagram" id="instagram-writing" aria-labelledby="ig-title">
    <header class="ig-header"><div class="ig-heading"><h2 id="ig-title">${escape(instagram.name)}</h2><p>${escape(instagram.description)}</p></div><a class="ig-brand" href="${escape(instagram.url)}" ${external} aria-label="${escape(instagram.name)} Instagram 프로필"><img src="/personal/instagram/instagram.svg?v=${instagramVersion}" alt="" width="28" height="28"></a></header>
    <div class="ig-posts" aria-label="심심풀이에서 고른 글 네 편">${posts}</div>
    <footer class="ig-footer"><a class="ig-handle" href="${escape(instagram.url)}" ${external}>@${escape(instagram.username)}</a><a class="ig-more" href="${escape(instagram.url)}" ${external}>글 더 읽기${arrow}</a></footer>
  </section>`;
  return html.replace(/<section class="tile tile--newsletter"[\s\S]*?<\/section>/, widget)
    .replace(/\s*<script type="module" src="\/newsletter\.js[^" ]*"><\/script>/, '')
    .replace('</head>', `<link rel="stylesheet" href="/personal/instagram/widget.css?v=${instagramVersion}"></head>`);
}
