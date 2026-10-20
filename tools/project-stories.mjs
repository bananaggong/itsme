import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
for (const path of ['/personal/projects/stories.css', '/personal/projects/nuvio-detail.css', '/personal/projects/nuvio-open-section.webp', '/personal/projects/nuvio-icon.png', '/personal/projects/nuvio-wordmark.svg', '/personal/projects/nuvio-symbol.svg', '/personal/projects/nuvio-open-hero.webp', '/personal/projects/nuvio-social-preview.png']) {
  hash.update(readFileSync(new URL('../public' + path, import.meta.url)));
}
export const projectStoriesVersion = hash.digest('hex').slice(0, 12);
const asset = path => `${path}?v=${projectStoriesVersion}`;
const glyph = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const chevron = glyph('<path d="m14 6-6 6 6 6"/>');
const lock = glyph('<rect x="7" y="10" width="10" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>');
const refresh = glyph('<path d="M19 8a8 8 0 1 0 1 8M19 3v5h-5"/>');
const arrow = glyph('<path d="M7 17 17 7M7 7h10v10"/>');

const nuvioCard = `<a class="pj-story pj-story--wide pj-story--nuvio" id="nuvio" href="/projects/nuvio/" aria-label="누비오 프로젝트 자세히 보기" lang="ko">
  <div class="pj-story-clip">
    <div class="pj-story-text">
      <p class="pj-eyebrow" lang="en">Ongoing project</p>
      <h2 class="pj-story-title"><span>숨겨진 로컬 프로그램</span><span>예약까지 한 번에</span></h2>
    </div>
    <span class="nuvio-browser" aria-hidden="true">
      <span class="nuvio-browser-bar">
        <span class="nuvio-browser-lights"><i></i><i></i><i></i></span>
        <span class="nuvio-browser-nav">${chevron}${chevron}</span>
        <span class="nuvio-browser-address">${lock}<span>nuvio.kr/open</span>${refresh}</span>
      </span>
      <img class="nuvio-browser-screen" src="${asset('/personal/projects/nuvio-open-section.webp')}" alt="" width="1022" height="541" fetchpriority="high" decoding="async">
    </span>
    <div class="pj-strip">
      <span class="pj-icon nuvio-story-icon" aria-hidden="true"><img src="${asset('/personal/projects/nuvio-icon.png')}" alt="" width="512" height="512"></span>
      <span class="pj-strip-text"><strong>누비오</strong><span>로컬 여행의 발견부터 예약까지</span></span>
      <span class="pj-get nuvio-story-visit">자세히 보기${arrow}</span>
    </div>
  </div>
</a>`;

export function personalizeProjectStoriesHTML(html) {
  const original = /<a class="pj-story pj-story--inset pj-story--wide" href="\/projects\/nocode\/"[\s\S]*?<\/a>/;
  if (original.test(html)) {
    html = html.replace(original, nuvioCard)
      .replace("new URL(to).pathname.indexOf('/projects/') !== 0", "(new URL(to).pathname.indexOf('/projects/') !== 0 || new URL(to).pathname === '/projects/nuvio/')")
      .replace('</head>', `<link rel="stylesheet" href="${asset('/personal/projects/stories.css')}"></head>`);
  }
  if (html.includes('class="pj-app nuvio-detail"')) {
    html = html.replace('</head>', `<link rel="stylesheet" href="${asset('/personal/projects/nuvio-detail.css')}"></head>`)
      .replace(/src="(\/personal\/projects\/nuvio-[^"?]+)"/g, (_, path) => `src="${asset(path)}"`);
  }
  return html;
}
