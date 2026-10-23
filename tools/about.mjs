import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const aboutVersion = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(readFileSync(new URL('../public/personal/about/remote-internship-poster.png', import.meta.url))).digest('hex').slice(0, 10);

const sections = [
  ['about', 'About', '호기심이 많아, 직접 해보는 편입니다.'],
  ['experience', 'Experience', '전공과 인턴십에서 영업·개발, 창업 준비까지.'],
  ['skills', 'Skills & Tools', '서비스 기획, 개발 기술과 전공 기초.'],
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
      <p>학교를 졸업하고 무작정 서울로 올라온 지, 어느덧 1년이 되었습니다. 여전히 하고 싶은 게 많습니다. 하나를 시작하면 또 다른 게 궁금해져서, 취미도 하나둘 늘어났고요.</p>
      <p>IT 스타트업에서 일하며 영업, 인플루언서 마케팅, 기획과 디자인, 개발까지 경험했습니다. 하는 일마다 만나는 사람도 문제를 바라보는 방식도 달라서 배울 게 참 많았습니다.</p>
      <p>AI로 음악을 만들어 플레이리스트로 엮기도 하고, 그 경험을 외국인들에게 강의하기도 했습니다. 제가 만든 음악은 <a href="/#grapes-player">이곳의 플레이어</a>에서 들으실 수 있어요. 잠깐 틀어두고 읽으셔도 좋겠습니다.</p>
      <p>때로는 사색에 잠겨 글을 씁니다. 그림이나 영화에서 시작한 이야기가 어느새 제 이야기가 되기도 해요. 그렇게 쓴 글들은 ‘심심풀이’라는 이름으로 모으고 있습니다. 아래 <a href="https://www.instagram.com/simsim__puli/" target="_blank" rel="noopener noreferrer">인스타그램</a>에서 만나보실 수 있어요.</p>
      <p>그중에서도 가장 무게를 두고 있는 일은 프로덕트를 만드는 일입니다. 시작은 대개 제가 겪었던 작은 경험이었어요.</p>
      <p>네트워킹이 끝난 뒤 남았던 공허함은 커피챗 플랫폼 <a href="https://intume.kr/" target="_blank" rel="noopener noreferrer">‘인투미’</a>를 만드는 계기가 되었습니다. 지방을 여행하다 알게 된 청년마을은 로컬 여행 플랫폼 <a href="https://nuvio.kr/" target="_blank" rel="noopener noreferrer">‘누비오’</a>로 이어졌고요. 일본을 여행할 때는 여행 길잡이 <a href="https://gal-pang-jil-pang.vercel.app/" target="_blank" rel="noopener noreferrer">‘갈팡질팡’</a>도 소소하게 만들어보았습니다.</p>
      <p>그 밖에도 이런저런 웹사이트를 만들며 지내고 있습니다. 하고 싶은 게 많아 조금 분주하지만, 직접 해보고 나서야 알게 되는 것들이 좋아요.</p>
    </section>
    <section class="note-section" id="experience">
      <h2>Experience</h2>
      <p>전북대학교에서 <strong>컴퓨터공학을 전공하고 문헌정보학을 부전공</strong>했습니다.</p>
      <p>미래내일 일경험의 ‘<a href="/personal/about/remote-internship-poster.png?v=${aboutVersion}" target="_blank" rel="noopener noreferrer" aria-label="리모트 인턴십 (프로그램 포스터 새 탭에서 보기)">리모트 인턴십</a>’에서 <strong>최우수 수료자</strong>로 선정되었고, CJ올리브네트웍스에서 실제 인턴십을 경험하며 데이터 분석과 기획 역량을 길렀습니다.</p>
      <p>서울로 올라온 뒤에는 <a href="https://www.ssgsag.kr/posters/23499" target="_blank" rel="noopener noreferrer">시스코 DevNet 과정 ↗</a>을 통해 네트워크 지식을 공부했습니다. 여러 창업가가 모이는 자리에서 저를 소개하고 이야기를 나누며 새로운 인연을 맺기도 했습니다.</p>
      <p>그중 한 분과 인연이 닿아 <strong>그레이프스</strong>에서 일하게 되었습니다. 매장을 직접 방문해 <strong>O.D.O 음악서비스</strong>를 소개하고 가입을 제안하는 영업으로 시작해, 코드 리팩터링과 UI·UX 개선, MVP 개발까지 맡는 일을 넓혀갔습니다.</p>
      <p>그레이프스와 함께 일하던 <strong>비글코퍼레이션을 통해 SNOW Corp.의 SNOW·EPIK·SODA·Foodie 인플루언서 마케팅</strong>을 담당하기도 했습니다.</p>
      <p>기업 홈페이지와 서비스 랜딩페이지를 제작·리뉴얼하며, 기획과 문구 작성부터 디자인, 개발, 배포까지 맡았습니다.</p>
      <p>이후에는 팀을 꾸려 예비 창업자로서 서비스를 준비했습니다. 그렇게 시작한 프로젝트가 <a href="/projects/intume/">인투미</a>와 <a href="/projects/nuvio/">누비오</a>입니다.</p>
    </section>
    <section class="note-section" id="skills">
      <h2>Skills &amp; Tools</h2>
      <div class="note-skills">
        <h3>기획 · 분석 · 협업</h3>
        <table class="note-skill-table" aria-label="기획과 프로젝트 역량">
          <tbody>
            <tr><th scope="row">데이터 기반 기획</th><td><ul><li>문제 정의 · 가설 검증</li><li>SQL 기반 데이터 분석</li><li>데이터 대시보드 설계 · 구축</li><li>KPI · 가드레일 성과 분석</li></ul></td></tr>
            <tr><th scope="row">서비스 기획 &amp; UX</th><td><ul><li>사용자 리서치 · 요구사항 정의</li><li>정보설계 (IA)</li><li>와이어프레임 설계</li><li>사용자 흐름 설계</li></ul></td></tr>
            <tr><th scope="row">협업 · 프로젝트 관리</th><td><ul><li>프로젝트 관리 (PM)</li><li>애자일 · 스프린트 운영</li><li>백로그 관리 · 우선순위 설정</li><li>이해관계자 커뮤니케이션</li></ul></td></tr>
          </tbody>
        </table>
        <h3>개발 스택</h3>
        <dl class="note-skill-lines">
          <div><dt>Frontend</dt><dd>TypeScript · JavaScript · HTML · CSS<br>React · Next.js · Tailwind CSS · Bootstrap</dd></div>
          <div><dt>Backend</dt><dd>Node.js · NestJS</dd></div>
          <div><dt>Database</dt><dd>SQL · MySQL · SQLite · PostgreSQL<br>Firebase · Supabase</dd></div>
        </dl>
        <details class="note-skill-detail">
          <summary>언어 · 데이터 분석 · 컴퓨터공학 기초</summary>
          <dl class="note-skill-lines">
            <div><dt>언어</dt><dd>C · C++ · Java · Python</dd></div>
            <div><dt>데이터 분석 · ML</dt><dd>Pandas · NumPy · Scikit-learn · PyTorch</dd></div>
            <div><dt>프로그래밍</dt><dd>문제 해결 · 알고리즘 문제 풀이<br>자료구조 · 알고리즘 · 객체지향 프로그래밍 (OOP)</dd></div>
            <div><dt>전공 기초</dt><dd>운영체제 · 컴퓨터 네트워크 · Unix 시스템 프로그래밍</dd></div>
          </dl>
        </details>
        <details class="note-skill-detail">
          <summary>도구 · 작업 환경</summary>
          <dl class="note-skill-lines">
            <div><dt>기획 · 디자인</dt><dd>Figma · FigJam · Miro · Notion</dd></div>
            <div><dt>협업 · 문서</dt><dd>Slack · Google Workspace · MS Office</dd></div>
            <div><dt>개발 · 분석 환경</dt><dd>Git · GitHub · VS Code · Colab · Anaconda</dd></div>
            <div><dt>테스트 · 배포</dt><dd>Playwright · Vitest · Vercel</dd></div>
            <div><dt>운영체제</dt><dd>Windows · Ubuntu</dd></div>
          </dl>
        </details>
      </div>
    </section>
    <footer class="note-footer"><span aria-hidden="true">✦</span><p>궁금한 점이나 함께 나누고 싶은 이야기가 있다면</p><a href="/#say-hello">광일에게 메시지 남기기</a></footer>
  </div>`;

  return html
    .replace('<html lang="en">', '<html lang="ko">')
    .replaceAll('About Sam Dickie', `About ${name}`).replaceAll('About Sam', `About ${name}`)
    .replace('<strong>Sam Dickie</strong>', `<strong>${name}</strong>`)
    .replace(/(<span class="folder-count">)\d+(<\/span>)/, (_, open, close) => `${open}${sections.length}${close}`)
    .replace(/(<span class="note-count">)\d+ notes(<\/span>)/, (_, open, close) => `${open}${sections.length} notes${close}`)
    .replace(/(<div class="notes-account">[\s\S]*?<small>)\d+ notes(<\/small>)/, (_, open, close) => `${open}${sections.length} notes${close}`)
    .replace(/(<nav class="notes-list"[\s\S]*?<\/button>)\s*<a class="note-row[\s\S]*?<\/nav>/, `$1\n${rows}\n</nav>`)
    .replace(/<div class="note-document" id="about-document">[\s\S]*?(?=\s*<section class="note-draft")/, document + '\n')
    .replace(/<title>[^<]*<\/title>/, `<title>About ${name} | 개인 웹사이트</title>`)
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*(")/g, `$1${name}의 소개와 경험, 프로젝트에 사용한 기술과 도구를 소개합니다.$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1About ${name} | 개인 웹사이트$2`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${profile.siteUrl}${profile.photo}"`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*"/, `$1${name} 프로필 사진"`)
    .replace(/<meta property="og:image:(?:width|height)"[^>]*>\s*/g, '')
    .replace('content="Sam"', `content="${escape(profile.givenName)}"`)
    .replace('content="Dickie"', `content="${escape(profile.familyName)}"`);
}
