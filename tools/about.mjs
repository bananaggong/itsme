import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const aboutVersion = createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex').slice(0, 10);

const sections = [
  ['about', 'About', '호기심이 많아, 직접 해보는 편입니다.'],
  ['experience', 'Experience', '사람을 만나고, 서비스를 만들어온 경험.'],
  ['how-i-work', 'How I Work', '직접 겪은 경험에서 만들 것을 찾습니다.'],
  ['interests', 'Interests', '음악, 글, 여행으로 넓어지는 관심사.'],
  ['skills', 'Skills & Tools', '생각을 구체적인 결과로 만드는 일.'],
];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function personalizeAboutHTML(html, profile) {
  if (!html.includes('class="notes-window"')) return html;
  const name = escape(profile.name);
  const rows = sections.map(([id, title, summary], i) => `<a class="note-row${i === 0 ? ' is-selected' : ''}" href="#${id}"><strong>${escape(title)}</strong><span>${summary}</span></a>`).join('\n');
  const document = `<div class="note-document" id="about-document">
    <p class="note-date">About ${name}</p>
    <section class="note-section note-intro" id="about">
      <div class="note-profile">
        <img src="${escape(profile.photo)}" data-profile-photo width="96" height="96" alt="${name} 프로필 사진">
        <div><p class="note-eyebrow">호기심 많음 청년</p><h1>${name}입니다.</h1></div>
      </div>
      <p class="note-lede">사람을 만난 경험을, 직접 만드는 서비스로 이어갑니다.</p>
      <p>학교를 졸업하고 서울로 올라왔습니다. 하나를 시작하면 또 다른 일이 궁금해져, 관심사도 하는 일도 조금씩 늘었습니다. 사람을 만나는 일부터 서비스를 만드는 일까지, 그동안 해온 일과 생각을 이곳에 모으고 있습니다.</p>
    </section>
    <section class="note-section" id="experience">
      <h2>Experience</h2>
      <p>IT 스타트업에서 영업, 인플루언서 마케팅, 기획과 디자인, 개발까지 경험했습니다.</p>
      <p>하는 일마다 만나는 사람도 문제를 바라보는 방식도 달라서 배울 게 참 많았습니다.</p>
    </section>
    <section class="note-section" id="how-i-work">
      <h2>How I Work</h2>
      <p>네트워킹이 끝난 뒤의 공허함은 <a href="/projects/intume/">인투미</a>로, 여행 중 알게 된 청년마을은 <a href="/projects/nuvio/">누비오</a>로 이어졌습니다. 일본을 여행할 때는 <a href="https://gal-pang-jil-pang.vercel.app/" target="_blank" rel="noopener noreferrer">갈팡질팡</a>을 만들었습니다.</p>
      <p>직접 겪은 작은 경험을 출발점으로, 기획과 디자인, 개발을 거치며 서비스의 모습으로 구체화하고 있습니다.</p>
    </section>
    <section class="note-section" id="interests">
      <h2>Interests</h2>
      <div class="interest-tags"><span>AI 음악</span><span>글쓰기</span><span>여행</span><span>만드는 일</span></div>
      <p>AI로 음악을 만들어 플레이리스트로 엮고, 그 경험을 외국인에게 강의하기도 했습니다. 그림이나 영화에서 시작한 생각을 글로 쓰기도 합니다. 그렇게 쓴 글은 <a href="https://www.instagram.com/simsim__puli/" target="_blank" rel="noopener noreferrer">‘심심풀이’ ↗</a>라는 이름으로 모으고 있습니다.</p>
    </section>
    <section class="note-section" id="skills">
      <h2>Skills &amp; Tools</h2>
      <p>서비스의 방향을 기획하고 화면을 디자인하며, 웹으로 구현하는 일을 해왔습니다. 인투미, 누비오, 페이킹뮤직, 갈팡질팡, LOAM을 만들며 여러 역할을 직접 경험했습니다.</p>
      <p>AI 도구도 서비스와 음악을 만드는 과정에 활용합니다. 직접 만든 결과는 <a href="/projects/">프로젝트 모음</a>과 <a href="${escape(profile.github)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>에서 볼 수 있습니다.</p>
    </section>
    <footer class="note-footer"><span aria-hidden="true">✦</span><p>궁금한 점이나 함께 나누고 싶은 이야기가 있다면</p><a href="/#say-hello">광일에게 메시지 남기기</a></footer>
  </div>`;

  return html
    .replace('<html lang="en">', '<html lang="ko">')
    .replaceAll('About Sam Dickie', `About ${name}`).replaceAll('About Sam', `About ${name}`)
    .replace('<strong>Sam Dickie</strong>', `<strong>${name}</strong>`)
    .replace(/(<nav class="notes-list"[\s\S]*?<\/button>)\s*<a class="note-row[\s\S]*?<\/nav>/, `$1\n${rows}\n</nav>`)
    .replace(/<div class="note-document" id="about-document">[\s\S]*?(?=\s*<section class="note-draft")/, document + '\n')
    .replace(/<title>[^<]*<\/title>/, `<title>About ${name} | 개인 웹사이트</title>`)
    .replace(/(<meta (?:name="description"|property="og:(?:title|description)") content=")[^"]*(")/g, `$1${name}의 경험, 만드는 방식, 관심사를 소개합니다.$2`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${profile.siteUrl}${profile.photo}"`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*"/, `$1${name} 프로필 사진"`)
    .replace(/<meta property="og:image:(?:width|height)"[^>]*>\s*/g, '')
    .replace('content="Sam"', `content="${escape(profile.givenName)}"`)
    .replace('content="Dickie"', `content="${escape(profile.familyName)}"`);
}
