import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = ['chat.css', 'chat.js', 'chat-model.js', 'chat-data.json', 'chat-message.js'];
export const chatVersion = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(files.map(name => readFileSync(new URL('../public/personal/' + name, import.meta.url))).join('')).digest('hex').slice(0, 10);

export function personalizeChatHTML(html, profile) {
  html = html.replace(/(<a\b[^>]*href=")\/newsletter\/("[^>]*>)(?:<span[^>]*>)?Newsletter(?:<\/span>)?/g, '$1/chat/$2Chat');
  html = html.replace(/<script\b[^>]*src="\/nav-badge\.js[^"]*"[^>]*><\/script>/g, '');
  if (!html.includes('class="ms-window"')) return html;
  const content = `<section class="ms-window gc-window" aria-label="광일과 이야기" data-chat-data="/personal/chat-data.json?v=${chatVersion}">
    <div class="ms-chat">
      <header class="ms-header">
        <div class="window-lights" aria-hidden="true"><span></span><span></span><span></span></div>
        <img class="ms-header-avatar" src="${profile.photo}" alt="" width="40" height="40">
        <h1 class="ms-title">광일</h1>
        <button class="gc-reset" type="button" title="대화 처음부터" aria-label="대화 처음부터">↺</button>
      </header>
      <div class="ms-thread" role="log" aria-live="polite" aria-relevant="additions" aria-label="광일과의 대화" tabindex="0">
        <div class="ms-stamp">오늘</div>
        <div class="ms-msg ms-msg--sam"><div class="ms-bubble">안녕하세요, 광일이에요 👋</div></div>
        <div class="ms-msg ms-msg--sam"><div class="ms-bubble">어떤 이야기가 궁금하세요? 아래에서 골라보세요.</div></div>
      </div>
      <div class="ms-footer">
        <div class="gc-tools"><span class="gc-prompt" role="status">질문을 불러오는 중…</span><button type="button" class="gc-browse" aria-expanded="false" aria-controls="gc-results">모든 질문</button></div>
        <div class="ms-chips" aria-label="추천 질문"></div>
        <div class="gc-picker" id="gc-results" hidden>
          <div class="gc-topics" aria-label="질문 주제"></div>
          <ul class="gc-results" aria-label="질문 검색 결과"></ul>
        </div>
        <form class="ms-compose" role="search" aria-label="궁금한 질문 찾기">
          <label class="ms-hidden-label" for="gc-search">질문 검색</label>
          <input id="gc-search" class="ms-input" type="search" placeholder="궁금한 질문 찾기 · 취미, 여행, 프로젝트" autocomplete="off" maxlength="100" aria-controls="gc-results">
          <button class="ms-send gc-search-button" type="submit" aria-label="질문 찾기"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg></button>
        </form>
        <noscript><p>질문을 고르고 답변을 보려면 JavaScript를 켜주세요.</p></noscript>
      </div>
    </div>
    <aside class="ms-info" aria-label="대화 정보">
      <div class="ms-contact"><img src="${profile.photo}" alt="광일" width="80" height="80"><h2>광일</h2><p>만들고, 쓰고, 가끔 음악도 해요.</p></div>
      <div class="gc-info-section"><h2>이야깃거리</h2><div class="gc-categories"></div></div>
      <div class="gc-info-section"><h2>대화 속 사진</h2><p class="gc-empty">이야기를 나누면 여기에 모여요.</p><div class="gc-shared-photos"></div></div>
      <div class="gc-info-section"><h2>대화 속 링크</h2><ul class="gc-shared-links"><li class="gc-empty">함께 본 링크를 다시 찾을 수 있어요.</li></ul></div>
      <button class="gc-contact" type="button" data-chat-message-open aria-haspopup="dialog">직접 메시지 남기기</button>
    </aside>
  </section>
  <dialog class="gc-lightbox" aria-label="사진 크게 보기"><button type="button" class="gc-close" aria-label="사진 닫기">×</button><img alt=""><p></p></dialog>
  <dialog class="gc-message" aria-labelledby="gc-message-title" aria-describedby="gc-message-description">
    <header class="gc-message-head"><div><h2 id="gc-message-title">광일에게 메시지</h2><p id="gc-message-description">궁금한 점이나 함께 나누고 싶은 이야기를 남겨주세요.</p></div><button type="button" class="gc-message-close" aria-label="메시지 작성창 닫기">×</button></header>
    <form class="gc-message-form">
      <div class="gc-message-field"><label for="gc-message-text">메시지</label><textarea id="gc-message-text" name="message" rows="5" maxlength="1200" required placeholder="어떤 이야기를 나누고 싶으세요?"></textarea></div>
      <div class="gc-message-field"><label for="gc-message-email">답장받을 이메일 <span>선택</span></label><input id="gc-message-email" name="email" type="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="you@example.com" aria-describedby="gc-email-help"><p class="gc-message-help" id="gc-email-help">답장을 원하시면 이메일을 남겨주세요.</p></div>
      <div hidden aria-hidden="true"><label for="gc-message-website">Website</label><input id="gc-message-website" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="gc-message-error" role="alert" hidden></p>
      <div class="gc-message-actions"><p class="gc-message-help">내용은 광일에게만 보여요.</p><button type="submit" class="gc-message-send">보내기 ↑</button></div>
    </form>
    <div class="gc-message-success" hidden><span aria-hidden="true">✓</span><h3 tabindex="-1">메시지를 남겼어요.</h3><p class="gc-message-success-copy"></p><button type="button" class="gc-message-done">대화로 돌아가기</button></div>
    <p class="ms-hidden-label gc-message-announcement" role="status" aria-live="polite"></p>
  </dialog>`;
  return html.replace(/<section class="ms-window"[\s\S]*?<\/section>/, content)
    .replace('<html lang="en">', '<html lang="ko">')
    .replace(/<title>[^<]*<\/title>/, '<title>Chat · 광일과 이야기 | 김광일</title>')
    .replace(/(<meta (?:name="description"|property="og:(?:title|description|image:alt)") content=")[^"]*"/g, '$1광일과 이야기. 일상, 취미, 프로젝트에 관한 질문을 골라보세요."')
    .replace(/(rel="canonical" href="|property="og:url" content=")[^"]*"/g, '$1https://gwangil.xyz/chat/"')
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1https://gwangil.xyz${profile.photo}"`)
    .replace(/<meta property="og:image:(?:width|height)"[^>]*>/g, '')
    .replace(/src="\/newsletter-page\.js[^"]*"/, `src="/personal/chat.js?v=${chatVersion}"`)
    .replace('</body>', `<script type="module" src="/personal/chat-message.js?v=${chatVersion}"></script></body>`)
    .replace('</head>', `<link rel="stylesheet" href="/personal/chat.css?v=${chatVersion}"></head>`);
}
