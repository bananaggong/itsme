import { aboutVersion, personalizeAboutHTML } from './about.mjs';
import { historyVersion, personalizePortfolioHTML } from './portfolio-history.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { replacePlaylist } from './grape-player.mjs';
import { mapVersion, personalizeMapHTML, personalizeMapJavaScript } from './personalize-map.mjs';
import { instagram, instagramVersion, personalizeInstagramHTML } from './instagram.mjs';
import { projectsVersion, personalizeProjectsHTML } from './projects.mjs';
import { personalizeBrandHTML } from './brand.mjs';
import { portraitVersion, personalizePortraitHTML, personalizePortraitJavaScript } from './portrait.mjs';
import { messagesVersion, personalizeMessagesHTML } from './messages.mjs';
import { personalizeProjectStoriesHTML } from './project-stories.mjs';
import { contactNoteVersion, personalizeContactNoteHTML } from './contact-note.mjs';
import { chatVersion, personalizeChatHTML } from './chat.mjs';
import { homeLayoutVersion, personalizeHomeLayout } from './home-layout.mjs';

export const profile = JSON.parse(readFileSync(new URL('../personalization/profile.json', import.meta.url), 'utf8'));
const p = profile;
const version = createHash('sha256').update(JSON.stringify(p)).update(readFileSync(new URL(import.meta.url))).update(mapVersion).update(instagramVersion).update(projectsVersion).update(portraitVersion).update(messagesVersion).update(contactNoteVersion).update(chatVersion).update(homeLayoutVersion).update(aboutVersion).update(historyVersion);
for (const file of [p.photo, p.memoji, '/personal/typography.css', '/personal/profile.css', '/personal/intro.js', '/personal/contact.js', '/personal/about.js']) version.update(readFileSync(new URL('../public'+file, import.meta.url)));
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
const intro = `<div class="intro-body">
  <div class="intro-preview">
  <p>학교를 졸업하고 무작정 서울로 올라온 지, 어느덧 1년이 되었습니다. 여전히 하고 싶은 게 많습니다. 하나를 시작하면 또 다른 게 궁금해져서, 취미도 하나둘 늘어났고요.</p>
  <p>IT 스타트업에서 일하며 영업, 인플루언서 마케팅, 기획과 디자인, 개발까지 경험했습니다. 하는 일마다 만나는 사람도 문제를 바라보는 방식도 달라서 배울 게 참 많았습니다.</p>
  </div>
  <div class="intro-more" id="intro-more">
  <p>AI로 음악을 만들어 플레이리스트로 엮기도 하고, 그 경험을 외국인들에게 강의하기도 했습니다. 제가 만든 음악은 이곳의 플레이어에서 들으실 수 있어요. 잠깐 틀어두고 읽으셔도 좋겠습니다.</p>
  <p>때로는 사색에 잠겨 글을 씁니다. 그림이나 영화에서 시작한 이야기가 어느새 제 이야기가 되기도 해요. 그렇게 쓴 글들은 ‘심심풀이’라는 이름으로 모으고 있습니다. 아래 인스타그램에서 만나보실 수 있어요.</p>
  <p>그중에서도 가장 무게를 두고 있는 일은 프로덕트를 만드는 일입니다. 시작은 대개 제가 겪었던 작은 경험이었어요.</p>
  <p>네트워킹이 끝난 뒤 남았던 공허함은 커피챗 플랫폼 <a href="https://intume.kr/" target="_blank" rel="noopener noreferrer">‘인투미’</a>를 만드는 계기가 되었습니다. 지방을 여행하다 알게 된 청년마을은 로컬 여행 플랫폼 <a href="https://nuvio.kr/" target="_blank" rel="noopener noreferrer">‘누비오’</a>로 이어졌고요. 일본을 여행할 때는 여행 길잡이 <a href="https://gal-pang-jil-pang.vercel.app/" target="_blank" rel="noopener noreferrer">‘갈팡질팡’</a>도 소소하게 만들어보았습니다.</p>
  <p>그 밖에도 이런저런 웹사이트를 만들며 지내고 있습니다. 하고 싶은 게 많아 조금 분주하지만, 직접 해보고 나서야 알게 되는 것들이 좋아요.</p>
  </div>
</div>
<button class="intro-toggle" type="button" aria-expanded="false" aria-controls="intro-more" hidden><span>더 보기</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

export function personalizeHTML(html) {
  html = personalizeProjectStoriesHTML(html);
  html = personalizeBrandHTML(html);
  // Keep the Writing pages on disk for later; hide only their navigation entry.
  html = html.replace(/(<nav\b[^>]*>)([\s\S]*?)(<\/nav>)/g, (_, open, content, close) =>
    open + content.replace(/\s*<a\b(?=[^>]*\bhref="\/writing\/")[^>]*>[\s\S]*?<\/a>/g, '') + close);
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
  html = html.replace(/src="\/about\.js[^" ]*"/g, `src="/personal/about.js?v=${profileVersion}"`);
  for (const name of ['look', 'memoji', 'officehours', 'spotlight', 'newsletter-page', 'rearrange', 'findmy']) {
    html = html.replace(new RegExp(`src="/${name}\\.js[^" ]*"`, 'g'), `src="/${name}.js?v=${profileVersion}"`);
  }
  if (html.includes('class="tile tile--intro"')) {
    html = html
      .replace(/<!-- 11\. Photo Booth[\s\S]*?<button class="tile tile--photobooth[\s\S]*?<\/button>/, '')
      .replace(/<!-- Featured story,[\s\S]*?<section class="tile tile--news[\s\S]*?<\/section>/, '')
      .replace(/<!-- Photo Booth window,[\s\S]*?<dialog class="pb-window"[\s\S]*?<\/dialog>/, '')
      .replace(/<script\b[^>]*src="\/photobooth\.js[^"]*"[^>]*><\/script>\s*/, '');
    html = html.replace('<html lang="en">', '<html lang="ko">').replace(/<h1 class="intro-title">[\s\S]*?<\/h1>/, `<h1 class="intro-title">호기심 많음 청년, ${p.name}입니다.</h1>`)
      .replace(/<div class="intro-body">[\s\S]*?<\/div>/, intro)
      .replace('<section class="tile tile--intro">', '<section class="tile tile--intro" id="intro" aria-labelledby="intro-title">')
      .replace('<h1 class="intro-title">', '<h1 class="intro-title" id="intro-title">')
      .replace('</body>', `<script src="/personal/intro.js?v=${profileVersion}" defer></script></body>`)
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
  html = personalizeAboutHTML(html, p);
  html = personalizeContactNoteHTML(html);
  html = personalizeChatHTML(html, p);
  html = personalizePortfolioHTML(html);
  return personalizeHomeLayout(personalizeMessagesHTML(personalizePortraitHTML(personalizeMapHTML(personalizeProjectsHTML(personalizeInstagramHTML(replacePlaylist(html)))), p), p)).replaceAll(`src="${p.photo}"`, `src="${p.photo}?v=${profileVersion}"`)
    .replaceAll(`src="${p.memoji}"`, `src="${p.memoji}?v=${profileVersion}"`)
    .replaceAll(`href="${p.vcard}"`, `href="${p.vcard}?v=${profileVersion}"`);
}

export function personalizeJavaScript(source, name) {
  source = personalizePortraitJavaScript(source, name);
  if (name === 'findmy.js') return personalizeMapJavaScript(source);
  if (name === 'rearrange.js') return source.replace("spotify: 'Spotify'", "spotify: 'Grapes 플레이어'").replace("newsletter: 'Newsletter'", "newsletter: '심심풀이 Instagram'").replace("switcher: 'Where to find me'", "switcher: '내가 만든 것들'").replace("office: 'Office hours'", "office: '한 줄 남기기'");
  if (!['spotlight.js', 'officehours.js', 'look.js', 'memoji.js', 'newsletter-page.js'].includes(name)) return source;
  if (name === 'spotlight.js') source = source.replace(/\n  \{\n    e: '📸', t: 'Open Photo Booth'[\s\S]*?\n  \},/, '');
  if (name === 'spotlight.js') source = source
    .replace("tile.querySelector('.ch-slot')", "tile.querySelector('[data-note-open]')")
    .replace("id: 'officehours', e: '📅', t: 'Book office hours', s: 'A free 30 min video call with Sam', a: 'Book'", "id: 'officehours', e: '💬', t: '광일에게 한 줄 남기기', s: '질문과 제안을 비공개 메시지로 남겨주세요', a: '작성하기'")
    .replace("w: 'office hours book call meeting advice validation help mentor chat calendar consult'", "w: 'message note hello contact feedback 질문 제안 메시지 한줄 남기기 연락 광일'");
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
  const index = [
    { g: 'Pages', t: '김광일 · Home', u: '/', s: '프로젝트와 일상, 관심사를 모은 개인 웹사이트', w: '광일 김광일 홈 소개', m: 'Home' },
    { g: 'Pages', t: 'About · 김광일 소개', u: '/about/', s: '직접 경험하고 만드는 일, 관심사와 경험', w: '광일 소개 경험 경력 관심사 기술', m: 'About' },
    { g: 'Pages', t: 'Projects · 만든 것들', u: '/projects/', s: '누비오, 인투미, 페이킹뮤직, 갈팡질팡, LOAM', w: '프로젝트 개발 서비스 포트폴리오', m: 'Projects' },
    { g: 'Projects', t: '페이킹뮤직 · Payking Music', u: '/projects/payking/', s: '매장 음악의 탐색·연속 재생과 회원·음원 운영 도구', w: '페이킹뮤직 페이킹 payking music 재생목록 오디오 큐 권한 캐시 운영', m: 'Music service' },
  ];
  index.push({g:'Pages', t:'Chat · 광일과 이야기', u:'/chat/', s:'취미, 일상, 여행과 프로젝트. 궁금한 질문을 골라보세요.', w:'chat 채팅 대화 광일 질문 취미 사진 여행', m:'Chat'});
  index.push({g:'Projects', t:'LOAM · 가설 검증', u:'/projects/loam/', s:'가설에서, 근거 있는 판단까지. 증거를 분석하고 직접 판단하는 창업자 도구.', w:'LOAM 로암 가설 검증 증거 인터뷰 AI 창업 MVP 마감한입 프로젝트', m:'MVP project'});
  index.push({g:'Links', t:'Grapes 음악 플레이어', u:'/#grapes-player', s:'포도알을 눌러 17곡의 샘플을 재생해보세요.', w:'grapes music audio sample player grape 포도 음악 샘플 재생 플레이어', e:'🍇', m:'Music'});
  index.push({g:'Links', t:instagram.name+' · Instagram 글쓰기', u:'/#instagram-writing', s:instagram.description, w:'instagram simsim__puli 심심풀이 인스타그램 글쓰기 에세이 일기 그림 영화 마음', m:'Writing'});
  index.push({g:'Links', t:'내가 만든 것들 · 프로젝트 둘러보기', u:'/#project-workbench', s:'누비오, 인투미, 페이킹뮤직, 갈팡질팡, LOAM의 화면과 서비스 소개', w:'NUVIO 누비오 Intume 인투미 페이킹뮤직 payking 갈팡질팡 LOAM 로암 프로젝트 개발 서비스 만든 것들', m:'Projects'});
  index.push({g:'Links', t:'광일에게 한 줄 남기기', u:'/?spotlight=officehours#say-hello', s:'회원가입 없이 질문과 제안을 비공개로 남겨주세요.', w:'한 줄 남기기 질문 제안 메시지 연락 광일', m:'Message'});
  index.push({g:'Projects', t:'갈팡질팡 · 다음 여행지 고르기', u:'/projects/galpang/', s:'지금 위치와 남은 시간에 맞춰 다음 여행지를 고르는 길잡이.', w:'갈팡질팡 일본 여행 장소 추천 위치 시간 관광 프로젝트', m:'Side project'});
  index.push({g:'Projects', t:'누비오 · NUVIO', u:'/projects/nuvio/', s:'로컬 프로그램의 발견부터 신청과 운영까지. 저장 복구와 신청서, 호스트 AI 도구의 권한 설계.', w:'NUVIO 누비오 로컬 여행 체류 청년마을 프로그램 신청 호스트 운영 인터뷰 김천 개발 큐레이션 프로젝트', m:'Ongoing project'});
  index.push({g:'Projects', t:'인투미 · Intume', u:'/projects/intume/', s:'만남이 끝나도, 대화는 이어지도록. 프로필과 커피챗, 행사 신청·운영과 가입 복구를 연결하는 커뮤니티.', w:'Intume 인투미 커피챗 프로필 명함 네트워킹 커뮤니티 모임 세션 이벤트 질문 프로젝트', m:'Ongoing project'});
  for (const item of index) {
    if (item.u === '/') item.s = `${p.name}의 개인 웹사이트. ${p.email} · ${p.phone}`;
    if (item.u === '/about/') {
      item.s = `${p.name}의 소개와 경험. 전공·인턴십, 영업·개발·창업 준비의 이야기.`;
      item.w = 'about 소개 김광일 호기심 많음 청년 경험 전북대학교 컴퓨터공학 문헌정보학 미래내일 리모트 인턴십 최우수 CJ올리브네트웍스 데이터 분석 시스코 Cisco DevNet 네트워크 그레이프스 Grapes 비글코퍼레이션 SNOW EPIK SODA Foodie 푸디 소다 ODO EASYSHOP 바나나테크놀러지 Banana 방문 영업 마케팅 리팩터링 MVP 기획 문구 디자인 개발 배포 웹사이트 홈페이지 랜딩페이지 리뉴얼 팀 창업 음악 글쓰기 여행';
    }
  }
  return JSON.stringify(index);
}
