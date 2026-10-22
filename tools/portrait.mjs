import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Framing coordinates refer to each original, upright photo. The web assets keep
// the whole image; CSS presents these face-centred squares at any card size.
const photos = [
  { file: 'daily-01.webp', width: 3307, x: 760, y: 60, size: 1950, alt: '데님 셔츠를 입고 미소 짓는 김광일' },
  { file: 'daily-02.webp', width: 3024, x: 250, y: 1250, size: 1250, alt: '검은 폴로 셔츠를 입은 김광일의 거울 사진' },
  { file: 'daily-03.webp', width: 3024, x: 70, y: 920, size: 1250, alt: '밤거리에서 찍은 김광일의 거울 사진' },
];
const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
// Version the dark-mode alpha mask with the portrait styles, keeping the photo original.
for (const file of ['portrait.js', 'portrait.css', 'portrait-dark-mask-v1.png', ...photos.map(p => p.file)]) {
  hash.update(readFileSync(new URL('../public/personal/' + file, import.meta.url)));
}
export const portraitVersion = hash.digest('hex').slice(0, 10);

export function personalizePortraitHTML(html, profile) {
  if (!html.includes('class="tile tile--avatar"')) return html;
  const images = photos.map((photo, i) => `<div class="portrait-slide" data-photo="${i}" aria-hidden="true"><img data-src="/personal/${photo.file}?v=${portraitVersion}" alt="${photo.alt}" width="${photo.width}" style="--photo-width:${photo.width / photo.size * 100}%;--photo-left:${-photo.x / photo.size * 100}%;--photo-top:${-photo.y / photo.size * 100}%" decoding="async"></div>`).join('');
  const dots = photos.map((_, i) => `<button type="button" data-photo-index="${i}" aria-label="일상 사진 ${i + 1} 보기" aria-pressed="${i === 0}"><span></span></button>`).join('');
  return html
    .replace(/(<div class="tile tile--avatar")[^>]*>\s*(?:<img\b[^>]*>\s*){3}/, `$1 id="daily-portrait" data-look="pixel" data-portrait-mode="profile" role="region" aria-label="김광일의 프로필과 일상 사진"><img src="${profile.photo}" data-profile-photo alt="김광일 프로필 사진" class="avatar-profile"><div class="portrait-photos" id="daily-photos" aria-label="일상 사진" aria-roledescription="슬라이드 쇼">${images}</div><div class="portrait-controls" role="group" aria-label="일상 사진 선택" hidden><button class="portrait-prev" type="button" aria-label="이전 일상 사진">‹</button><div class="portrait-dots">${dots}</div><button class="portrait-next" type="button" aria-label="다음 일상 사진">›</button></div>`)
    .replace(/(<button class="siri-button"[^>]*aria-label=")[^"]*(")/, '$1일상 모습$2 aria-controls="daily-photos" disabled')
    .replace('<span class="siri-label" aria-hidden="true">Memoji me</span>', '<span class="siri-label" aria-hidden="true">일상 모습</span>')
    .replace(/(<span class="siri-placeholder">)[\s\S]*?(<\/span>)/, '$1Siri에게 요청하기…$2')
    .replace(/src="\/memoji\.js[^" ]*"/, `src="/personal/portrait.js?v=${portraitVersion}"`)
    .replace('</head>', `<link rel="stylesheet" href="/personal/portrait.css?v=${portraitVersion}"></head>`);
}

export function personalizePortraitJavaScript(source, name) {
  // Retire the old site-wide cartoon preference, including saved choices. Keep
  // this entry point harmless for older cached pages importing the module.
  if (name === 'look.js') return `try { localStorage.removeItem('itsme-look'); localStorage.removeItem('sam-look'); } catch {}
export const MEMOJI = '/personal/profile.jpg';
export const savedLook = () => 'pixel';
export function setLook() {}
`;
  if (name !== 'spotlight.js') return source;
  return source
    .replace(/import \{ savedLook, setLook \} from '[^']*';\s*/, '')
    .replace("  photobooth() { document.querySelector('.pb-launch')?.click(); },", `  portrait() {
    const siri = document.querySelector('.siri-button');
    if (!siri) return;
    siri.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    setTimeout(() => siri.click(), lessMotion() ? 0 : 450);
  },`)
    .replace(/  \{\n    e: '✨', get t\(\) \{ return savedLook\(\)[\s\S]*?\n  \},/, `  {
    e: '✨', get t() { return document.querySelector('.tile--avatar')?.dataset.portraitMode === 'daily' ? '프로필로 돌아가기' : '일상 모습'; },
    s: 'Siri에게 요청하기', a: '보기', w: 'siri avatar portrait face photo picture 일상 모습 사진 시리 프로필 김광일',
    run() { close(); onHomepage('portrait'); },
  },`);
}
