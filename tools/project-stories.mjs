import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
for (const name of ['nuvio-traveler-screen.jpg', 'nuvio-host-editor.jpg', 'intume-icon.png', 'intume-home-screen.jpg', 'intume-events-screen.jpg', 'intume-connect-preview.png', 'intume-profile-desktop.jpg', 'intume-profile-mobile.jpg', 'intume-coffeechat-screen.jpg', 'intume-detail.css']) {
  hash.update(readFileSync(new URL('../public/personal/projects/' + name, import.meta.url)));
}
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

const intumeCard = `<a class="pj-story pj-story--intume" id="intume" href="/projects/intume/" aria-label="인투미 프로젝트 자세히 보기" lang="ko">
  <div class="pj-story-clip">
    <div class="pj-story-text">
      <p class="pj-eyebrow" lang="en">Ongoing project</p>
      <h2 class="pj-story-title"><span>만남이 끝나도,</span><span>대화는 이어지도록</span></h2>
    </div>
    <span class="intume-browser" aria-hidden="true">
      <span class="nuvio-browser-bar">
        <span class="nuvio-browser-lights"><i></i><i></i><i></i></span>
        <span class="nuvio-browser-address">${lock}<span>intume.kr</span>${refresh}</span>
      </span>
      <img class="intume-browser-screen" src="${asset('/personal/projects/intume-home-screen.jpg')}" alt="" width="1280" height="800" decoding="async">
    </span>
    <div class="pj-strip">
      <span class="pj-icon intume-story-icon" aria-hidden="true"><img src="${asset('/personal/projects/intume-icon.png')}" alt="" width="512" height="512"></span>
      <span class="pj-strip-text"><strong>인투미</strong><span>프로필에서 커피챗과 모임까지</span></span>
      <span class="pj-get">자세히 보기</span>
    </div>
  </div>
</a>`;

export function personalizeProjectStoriesHTML(html) {
  const original = /<a class="pj-story pj-story--inset pj-story--wide" href="\/projects\/nocode\/"[\s\S]*?<\/a>/;
  if (original.test(html)) {
    html = html.replace(original, nuvioCard)
      .replace("new URL(to).pathname.indexOf('/projects/') !== 0", "(new URL(to).pathname.indexOf('/projects/') !== 0 || ['/projects/nuvio/', '/projects/intume/'].includes(new URL(to).pathname))")
      .replace('</head>', `<link rel="stylesheet" href="${asset('/personal/projects/stories.css')}"></head>`);
  }
  html = html.replace(/<a class="pj-story pj-story--cover" href="\/projects\/betatesta\/"[\s\S]*?<\/a>/, intumeCard);
  if (html.includes('class="pj-app nuvio-detail"')) {
    html = html.replace('</head>', `<link rel="stylesheet" href="${asset('/personal/projects/nuvio-detail.css')}"></head>`)
      .replace(/\b(src|href)="(\/personal\/projects\/nuvio-[^"?]+)"/g, (_, attr, path) => `${attr}="${asset(path)}"`);
  }
  if (html.includes('class="pj-app intume-detail"')) {
    html = html.replace('</head>', `<link rel="stylesheet" href="${asset('/personal/projects/intume-detail.css')}"></head>`)
      .replace(/\b(src|href)="(\/personal\/projects\/intume-[^"?]+)"/g, (_, attr, path) => `${attr}="${asset(path)}"`);
  }
  return html;
}
