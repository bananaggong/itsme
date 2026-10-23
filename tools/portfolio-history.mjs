import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const historyVersion = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(readFileSync(new URL('../public/personal/projects/work.css', import.meta.url))).digest('hex').slice(0, 12);

const work = {
  nuvio: {
    role: '여행자 탐색·신청 / 호스트 편집·신청자 관리 / 저장 복구·AI 도구 권한',
    cases: [
      ['저장 응답이 늦어도 작성 중인 내용을 지키기', '프로그램을 작성하는 동안 이전 저장 응답이 도착해도 새로 입력한 내용이 덮이지 않도록 편집 상태와 전송한 초안을 분리했습니다. 저장 요청을 순서대로 처리하고, 실패했을 때 사용할 복구본과 서버 내용이 달라졌을 때의 비교 흐름을 연결했습니다.'],
      ['질문이 바뀐 뒤에도 신청 내용을 이해할 수 있도록', '운영자가 신청폼을 수정하더라도 접수 답변을 해석할 수 있도록 질문 구조와 제출된 동의 기록을 함께 저장하는 경로를 추가했습니다. 모집 예정·진행·마감은 한국 날짜와 공개 상태를 기준으로 판단하고, 화면 안내와 실제 접수 조건에 같은 규칙을 적용했습니다.'],
      ['AI의 초안 수정과 공개를 다른 권한으로 다루기', '호스트 도구를 AI와 연결하면서 수정할 수 있는 필드를 제한하고, 서버가 현재 초안과 변경 내용을 합치도록 구성했습니다. 프로그램 공개는 초안 저장과 분리해 승인 기록, 권한, 문서 버전을 다시 확인하도록 했습니다.'],
    ],
    scope: '커밋 이력과 로컬 검증 기록을 바탕으로 정리했습니다. 저장·모집 조건·AI 변경 계약을 확인했으며, 인증된 운영 전체 흐름과 현재 AI 쓰기 활성화 여부는 이번 정리에서 재검증하지 않았습니다.',
  },
  intume: {
    role: '프로필·커피챗 흐름 / 행사 신청폼·운영 도구 / 가입 실패 복구',
    cases: [
      ['대화할 의사와 일정 확정을 나누기', '커피챗을 신청할 때부터 시간을 정하던 흐름을, 먼저 대화를 수락하고 쪽지로 시간과 장소를 조율하는 방식으로 바꿨습니다. 요청과 수락, 일정 확정을 별도 단계로 나누고 이전 방식으로 만들어진 요청도 함께 다뤘습니다.'],
      ['행사마다 다른 질문을 운영자가 구성할 수 있도록', '행사마다 질문과 필수 조건이 달라질 수 있도록 신청폼 편집기와 답변 관리 화면을 연결했습니다. 질문의 노출 조건을 화면과 서버 검증에서 함께 사용하고, 여러 조건이 동시에 맞아야 하는 질문의 분기 오류도 수정했습니다.'],
      ['가입이 중간에 멈췄을 때 다시 이어가기', '계정 생성은 끝났지만 로그인만 실패한 경우와 보안 인증이 취소·만료된 경우를 구분했습니다. 완료된 단계를 같은 화면에서 반복하지 않도록 하고, 오류 뒤에도 다시 시도할 수 있도록 버튼과 대기 상태를 정리했습니다.'],
    ],
    scope: '가입 복구는 인증 공급자를 대체한 회귀 테스트 기록, 행사 조건 분기는 과거 함수의 합성 재현을 근거로 정리했습니다. 가입 전환율과 행사 운영시간의 개선 수치는 측정하지 않았습니다.',
  },
  payking: {
    role: '음악 재생·큐 / 회원·음원 운영 도구 / 권한·캐시·외부 등록 조회',
    cases: [
      ['다음 곡을 미리 준비해 이어서 재생하기', '재생 테스트가 성공해도 곡 전환 사이의 짧은 공백을 놓칠 수 있어 검증 기준부터 다시 살폈습니다. 현재 곡과 다음 곡을 준비해 오디오 시각에 맞춰 재생을 예약하고, 메모리 사용 한도와 재생 권한 만료를 함께 처리하도록 엔진을 바꿨습니다.'],
      ['같은 곡도 재생목록에서는 다른 항목이 되도록', '같은 곡을 여러 번 추가해도 각각의 위치를 선택하고 이어 들을 수 있도록 곡 자체의 ID와 재생 항목의 ID를 분리했습니다. 다음·이전·셔플과 새로고침 뒤 위치 복원까지 같은 기준으로 맞췄습니다.'],
      ['10행을 보여주기 위해 전체 데이터를 읽지 않도록', '운영 화면의 전체 조회를 서버 검색과 페이지 조회, 요약 집계, 단건 상세로 나눴습니다. 회원·음원·문의 화면에서 필요한 범위만 가져오도록 하고, 데이터 변경으로 마지막 페이지가 사라지는 경우도 처리했습니다.'],
    ],
    scope: '합성 음원 300곡 검사와 실제 연동 9시간 중간 기록을 확인했습니다. 15시간 완주와 실물 스피커 검수 완료는 확인되지 않았습니다. 운영 조회 개선은 합성 데이터 기준이며, 외부 등록 조회의 실제 등록 사업자 응답도 별도 검수가 필요합니다.',
  },
};

function workSection(id) {
  const { role, cases, scope } = work[id];
  return `<section class="pj-section project-work" aria-labelledby="project-work-title">
    <div class="project-work-heading"><p class="pj-eyebrow">Development</p><h2 id="project-work-title">만들면서 해결한 문제</h2><p class="project-role"><strong>담당 영역</strong><span>${role}</span></p></div>
    <ol class="project-cases">${cases.map(([title, body], i) => `<li><span class="project-case-number" aria-hidden="true">0${i + 1}</span><div><h3>${title}</h3><p>${body}</p></div></li>`).join('')}</ol>
    <details class="project-scope"><summary>개발 기록의 확인 범위</summary><p>${scope}</p></details>
  </section>`;
}

export const paykingCard = `<a class="pj-story pj-story--payking" id="payking" href="/projects/payking/" aria-label="페이킹뮤직 프로젝트 자세히 보기" lang="ko">
  <div class="pj-story-clip">
    <div class="pj-story-text"><p class="pj-eyebrow">Music service</p><h2 class="pj-story-title"><span>매장의 음악과 운영을</span><span>한곳에서</span></h2></div>
    <div class="payking-browser" aria-hidden="true"><div class="payking-browser-bar"><i></i><i></i><i></i><span>페이킹뮤직</span></div><img src="/personal/projects/payking-home.png" alt="" width="1440" height="1100" loading="lazy"></div>
    <div class="pj-strip"><span class="pj-icon" aria-hidden="true"><img src="/personal/projects/payking-icon.png" alt="" width="512" height="512"></span><span class="pj-strip-text"><strong>페이킹뮤직</strong><span>음악 탐색·연속 재생·운영 도구</span></span><span class="pj-get">자세히 보기</span></div>
  </div>
</a>`;

export function personalizePortfolioHTML(html) {
  const id = Object.keys(work).find(id => html.includes(`class="pj-app ${id}-detail"`));
  if (id) {
    html = html.replace('</article>', workSection(id) + '\n</article>');
    if (id === 'intume') html = html.replace('<dt>Together</dt><dd class="pj-fact-value">모임 · 세션</dd><dd class="pj-fact-note">함께 질문하는 시간</dd>', '<dt>My role</dt><dd class="pj-fact-value">개발</dd><dd class="pj-fact-note">커피챗 · 신청 · 운영 도구</dd>');
  }
  if (id || html.includes('class="pj-stories"')) {
    html = html.replace('</head>', `<link rel="stylesheet" href="/personal/projects/work.css?v=${historyVersion}"></head>`);
  }
  if (html.includes('class="pj-stories"')) {
    html = html.replace('<html lang="en">', '<html lang="ko">')
      .replaceAll('Side projects, startups and a few flops', '직접 만들고, 계속 다듬는 서비스들')
      .replace('alt="About Sam"', 'alt="김광일 소개"')
      .replace(/<a class="pj-story pj-collection"[\s\S]*?<\/a>/, '')
      .replace('<a class="pj-story pj-story--galpang"', paykingCard + '\n<a class="pj-story pj-story--galpang"')
      .replace(/<a class="pj-story pj-oldsite"[\s\S]*?<\/a>/, '')
      .replace(/<section class="pj-section pj-work"[\s\S]*?<\/section>/, '')
      .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*"/g, '$1누비오, 인투미, 페이킹뮤직, 갈팡질팡, LOAM. 김광일이 만든 서비스와 개발 이야기."')
      .replace(/(<meta property="og:image" content=")[^"]*"/, '$1https://gwangil.xyz/personal/projects/nuvio-social-preview.png"')
      .replace(/(<meta property="og:image:alt" content=")[^"]*"/, '$1김광일의 프로젝트 모음"');
  }
  // Retired template destinations must not remain in navigation or recovery UI.
  html = html.replace(/<a\b(?=[^>]*href="\/(?:writing|newsletter|downloads)\/")[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a\b(?=[^>]*href="\/projects\/old-site\/")[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a\b(?=[^>]*href="https:\/\/samdickie\.substack\.com[^\"]*")[^>]*>[\s\S]*?<\/a>/g, '');
  if (html.includes('id="lost-title"')) html = html
    .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="페이지를 찾을 수 없습니다. 김광일의 프로젝트 모음이나 홈으로 이동해 주세요.">')
    .replace('No location found · Last seen on the old version of this site', '페이지를 찾을 수 없습니다')
    .replace('It may have moved when I rebuilt the site. Try one of these instead:', '홈이나 프로젝트 모음에서 다시 찾아보세요.');
  return html;
}
