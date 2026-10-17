import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { replacePlaylist } from './grape-player.mjs';

export const profile = JSON.parse(readFileSync(new URL('../personalization/profile.json', import.meta.url), 'utf8'));
const p = profile;
const version = createHash('sha256').update(JSON.stringify(p)).update(readFileSync(new URL(import.meta.url)));
for (const file of [p.photo, p.memoji, '/personal/typography.css', '/personal/profile.css', '/personal/contact.js']) version.update(readFileSync(new URL('../public'+file, import.meta.url)));
export const profileVersion = version.digest('hex').slice(0, 10);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const mail = `mailto:${p.email}?subject=${encodeURIComponent(`안녕하세요, ${p.name}님`)}`;
const copyIcon = '<svg class="ct-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><svg class="ct-done-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
const field = (label, value, href) => `<div class="ct-field"><a class="ct-field-link" href="${escape(href)}"><span class="ct-field-label">${label}</span><span class="ct-field-value">${escape(value)}</span></a><button class="ct-copy" type="button" data-copy="${escape(value)}" aria-label="${label} 복사" hidden>${copyIcon}</button><span class="ct-status" role="status"></span></div>`;
const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const envelope = icon('<rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7.5 8 5.5 8-5.5" fill="none" stroke="currentColor" stroke-width="1.8"/>');
const phone = icon('<path d="m7 3 3 5-2.3 2.3a15 15 0 0 0 6 6L16 14l5 3-1 4C11 22 2 13 3 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>');
const github = icon('<path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.71 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.5-.28-5.12-1.25-5.12-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.31 3.08 1.15a10.72 10.72 0 0 1 5.6 0c2.14-1.46 3.08-1.15 3.08-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/>');
const save = icon('<circle cx="10" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 20c.6-3.6 3.2-5.6 6.5-5.6 1.2 0 2.3.3 3.2.8M18 13.5v7M14.5 17h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
const action = (href, label, glyph, extra = '') => `<li><a class="ct-action" href="${escape(href)}" ${extra}>${glyph}${label}</a></li>`;

export function personalizeHTML(html) {
  html = html.replace(/<title>([^<]*)<\/title>/, (_, title) => `<title>${title.replaceAll('Sam Dickie', p.name)}</title>`)
    .replace(/(<meta property="og:(?:site_name|title)" content=")([^"]*)/g, (_, prefix, value) => prefix + value.replaceAll('Sam Dickie', p.name))
    .replace(/(<link rel="canonical" href=")https:\/\/www\.samdickie\.me/g, `$1${p.siteUrl}`)
    .replace(/(<meta property="og:url" content=")https:\/\/www\.samdickie\.me/g, `$1${p.siteUrl}`)
    .replace(/<footer class="footer">© Sam Dickie[^<]*<\/footer>/g, `<footer class="footer">© ${p.name}</footer>`)
    .replaceAll('samdickie@gmail.com', p.email)
    .replaceAll('Hello%20via%20samdickie.me', encodeURIComponent(`안녕하세요, ${p.name}님`))
    .replaceAll('aria-label="Email Sam"', `aria-label="${p.name}에게 이메일 보내기"`)
    .replace(/(<img\b[^>]*\bsrc=")\/assets\/sam-(?:photo[^"/]*|portrait\.png)(")/g, `$1${p.photo}$2 data-profile-photo`)
    .replace(/(<img\b[^>]*\bsrc=")\/assets\/sam-memoji\.webp(")/g, `$1${p.memoji}$2`)
    .replace(/alt="Pixel-art portrait of Sam(?: Dickie)?"/g, `alt="${p.name} 프로필 사진"`);
  html = html.replace(/<link\b[^>]*rel="preload"[^>]*href="\/assets\/fonts\/inter[^"]*"[^>]*>\s*/g, '')
    .replace('</head>', `<link rel="stylesheet" href="/personal/typography.css?v=${profileVersion}"><link rel="stylesheet" href="/personal/profile.css?v=${profileVersion}"></head>`);
  html = html.replace(/src="\/contact\.js[^" ]*"/g, `src="/personal/contact.js?v=${profileVersion}"`);
  for (const name of ['look', 'memoji', 'officehours', 'spotlight', 'newsletter-page', 'rearrange']) {
    html = html.replace(new RegExp(`src="/${name}\\.js[^" ]*"`, 'g'), `src="/${name}.js?v=${profileVersion}"`);
  }
  if (html.includes('class="tile tile--intro"')) {
    html = html.replace('<html lang="en">', '<html lang="ko">').replace(/<h1 class="intro-title">[\s\S]*?<\/h1>/, `<h1 class="intro-title">${p.name}<span class="muted">의</span><br>개인 웹사이트</h1>`)
      .replace(/<div class="intro-body">[\s\S]*?<\/div>/, `<div class="intro-body"><p>안녕하세요, 김광일입니다.</p><p>이곳은 저의 프로젝트와 관심사를 담아갈 개인 공간입니다.</p><p>이메일이나 전화로 편하게 연락해 주세요.<br><a href="${mail}">${p.email}</a><br><a href="tel:${p.phoneInternational}">${p.phone}</a></p><p><a href="${p.github}" target="_blank" rel="noopener">GitHub · bananaggong ↗</a></p></div>`)
      .replace(/<section class="tile tile--contact"[\s\S]*?<\/section>/, `<section class="tile tile--contact" aria-label="${p.name} 연락처"><div class="ct-head"><img class="ct-photo" src="${p.photo}" data-profile-photo alt="${p.name} 프로필 사진"><h2 class="ct-name">${p.name}</h2></div><ul class="ct-actions">${action(mail, '메일', envelope)}${action('tel:'+p.phoneInternational, '전화', phone)}${action(p.github, 'GitHub', github, 'target="_blank" rel="noopener" aria-label="bananaggong GitHub"')}${action(p.vcard, '저장', save, `download="${p.name}.vcf" aria-label="${p.name} 연락처 저장"`)}</ul>${field('이메일', p.email, mail)}${field('전화번호', p.phone, 'tel:'+p.phoneInternational)}</section>`)
      .replace(/(<span class="fm-card-text"><strong>)Sam Dickie/, '$1지도 데모')
      .replace(' · Probably lost', ' · 샘플 경로')
      .replace('aria-label="Message from Sam Dickie"', `aria-label="${p.name}의 메시지"`)
      .replace('<span class="im-name">Sam Dickie</span>', `<span class="im-name">${p.name}</span>`)
      .replace('aria-label="Ask Siri to turn Sam into a Memoji"', `aria-label="${p.name}의 Memoji 아바타로 전환"`);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${p.name} | 개인 웹사이트</title>`)
      .replace(/(<meta (?:name="description"|property="og:(?:title|description)") content=")[^"]*(")/g, `$1${p.name}의 개인 웹사이트. 프로젝트, 관심사, 연락처를 만나보세요.$2`)
      .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${p.siteUrl}${p.photo}$2`)
      .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${p.name} 프로필 사진$2`)
      .replace(/<meta property="og:image:(?:width|height)"[^>]*>\s*/g, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebSite','@id':p.siteUrl+'/#website',url:p.siteUrl+'/',name:p.name,author:{'@id':p.siteUrl+'/#person'}},{'@type':'Person','@id':p.siteUrl+'/#person',name:p.name,email:p.email,telephone:p.phoneInternational,url:p.siteUrl+'/',image:p.siteUrl+p.photo,sameAs:[p.github]}]})}</script>`);
  }
  if (html.includes('class="notes-window"')) {
    html = html.replaceAll('About Sam Dickie', `About ${p.name}`).replaceAll('About Sam', `About ${p.name}`)
      .replace('<strong>Sam Dickie</strong>', `<strong>${p.name}</strong>`)
      .replace("<h1>Hey, I'm Sam.</h1>", `<h1>안녕하세요, ${p.name}입니다.</h1>`)
      .replace('<p class="note-eyebrow">Product Manager &amp; Maker</p>', '<p class="note-eyebrow">Personal Website</p>')
      .replace(/<p class="note-lede">[\s\S]*?<\/p>/, `<p class="note-lede">연락은 <a href="${mail}">${p.email}</a> 또는 <a href="tel:${p.phoneInternational}">${p.phone}</a>로 주세요.</p>`)
      .replace(/(<p class="note-lede">[\s\S]*?<\/p>)\s*<p>[\s\S]*?<\/p>/, `$1<p><a href="${p.github}" target="_blank" rel="noopener">GitHub · bananaggong ↗</a></p><p class="profile-reference">아래 이력·관심사·직무·기술 목록은 개인화 전의 참고 콘텐츠입니다.</p>`)
      .replace(/<title>[^<]*<\/title>/, `<title>About ${p.name} | 개인 웹사이트</title>`)
      .replace(/(<meta (?:name="description"|property="og:(?:title|description)") content=")[^"]*(")/g, `$1${p.name}의 소개와 연락처$2`)
      .replace('content="Sam"', `content="${p.givenName}"`).replace('content="Dickie"', `content="${p.familyName}"`);
  }
  return replacePlaylist(html).replaceAll(`src="${p.photo}"`, `src="${p.photo}?v=${profileVersion}"`)
    .replaceAll(`src="${p.memoji}"`, `src="${p.memoji}?v=${profileVersion}"`)
    .replaceAll(`href="${p.vcard}"`, `href="${p.vcard}?v=${profileVersion}"`);
}

export function personalizeJavaScript(source, name) {
  if (name === 'rearrange.js') return source.replace("spotify: 'Spotify'", "spotify: 'Grapes 플레이어'");
  if (!['spotlight.js', 'officehours.js', 'look.js', 'memoji.js', 'newsletter-page.js'].includes(name)) return source;
  source = source.replaceAll('samdickie@gmail.com', p.email).replaceAll('samdickie.me', 'itsme')
    .replace(/\bSam\b/g, p.name).replaceAll('pixel art', 'photo');
  if (name === 'look.js') source = source.replaceAll('/assets/sam-memoji.webp', p.memoji+'?v='+profileVersion).replace("const KEY = 'sam-look';", "const KEY = 'itsme-look';")
    .replace(/const PICTURES = [^;]+;/, `const PICTURES = 'img[data-profile-photo], img[data-sam-src]';`);
  if (name === 'memoji.js') source = source.replaceAll('assets/sam-memoji.webp', p.memoji.slice(1));
  if (name === 'spotlight.js') source = source.replace(`${p.name}’s happily employed.`, `${p.name}에게 연락하기`).replace('A free 30 min video call with '+p.name, `${p.name}에게 일정 문의`)
    .replace("w: 'email contact mail message reach get in touch'", "w: 'email contact mail message reach get in touch 이메일 연락처 김광일 rhkd3539'")
    .replace("w: 'copy email address contact clipboard'", "w: 'copy email address contact clipboard 이메일 복사 연락처'");
  if (name === 'spotlight.js') source = source.replace('/[^a-z0-9£]+/g', '/[^\\p{L}\\p{N}£]+/gu')
    .replace(/(const INDEX = '\/search\.json)\?[^']*'/, `$1?v=${profileVersion}'`);
  source = source.replace(/(from '\.\/(?:look|memoji|officehours|spotlight|newsletter-page)\.js)\?[^']*'/g, `$1?v=${profileVersion}'`);
  return source;
}

export function personalizeSearchIndex(source) {
  const index = JSON.parse(source).filter(item => !item.u.startsWith('https://open.spotify.com/playlist/'));
  index.push({g:'Links', t:'Grapes 음악 플레이어', u:'/#grapes-player', s:'포도알을 눌러 17곡의 샘플을 재생해보세요.', w:'grapes music audio sample player grape 포도 음악 샘플 재생 플레이어', e:'🍇', m:'Music'});
  for (const item of index) {
    if (item.u === '/') item.s = `${p.name}의 개인 웹사이트. ${p.email} · ${p.phone}`;
    if (item.u === '/about/') item.s = `${p.name}의 소개와 연락처. GitHub bananaggong`;
  }
  return JSON.stringify(index);
}
