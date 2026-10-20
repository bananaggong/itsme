import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
for (const file of ['contact-note.css', 'contact-note.js']) hash.update(readFileSync(new URL('../public/personal/' + file, import.meta.url)));
export const contactNoteVersion = hash.digest('hex').slice(0, 10);

const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function personalizeContactNoteHTML(html) {
  if (!html.includes('class="tile tile--office"')) return html;
  return html.replace(/<section class="tile tile--office"[\s\S]*?<\/section>/, `
    <section class="tile tile--office tile--hello" id="say-hello" data-note-state="idle" aria-label="광일에게 한 줄 남기기" lang="ko">
      <div class="ch-head note-calendar-head">
        <time class="note-calendar-date" aria-label="오늘"><span class="ch-weekday" lang="en">TODAY</span><span class="ch-date"></span></time>
        <button class="arrow note-calendar-open" type="button" aria-label="메시지 작성하기" aria-expanded="false" aria-controls="note-composer">↗</button>
        <button class="note-close" type="button" aria-label="작성 화면 닫기" title="작성 중인 내용은 유지돼요" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8m0-8-8 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
      </div>
      <div class="note-idle" data-note-view="idle">
        <ul class="ch-events note-topics" aria-label="이런 이야기를 나눠요">
          <li class="ch-event note-topic"><span class="ch-title">프로젝트 이야기</span><span class="ch-time">궁금한 점과 작은 피드백</span></li>
          <li class="ch-event note-topic"><span class="ch-title">함께 만드는 일</span><span class="ch-time">아이디어와 협업 제안</span></li>
          <li class="ch-event ch-event--open"><button class="ch-slot note-start" type="button" data-note-open aria-expanded="false" aria-controls="note-composer"><span class="ch-title">광일에게 한 줄 남기기</span><span class="ch-time">메시지 작성하기 →</span></button></li>
        </ul>
        <p class="ch-foot note-caption">가벼운 인사도 좋아요.</p>
      </div>
      <form class="note-compose" id="note-composer" data-note-view="compose" hidden>
        <div class="note-compose-head"><h2>광일에게 메시지</h2></div>
        <div class="note-field"><div class="note-field-heading"><label for="note-message">메시지</label><span class="note-count" aria-hidden="true">0 / 1,200</span></div><textarea id="note-message" name="message" rows="3" maxlength="1200" required placeholder="어떤 이야기를 나누고 싶으세요?"></textarea></div>
        <div class="note-field"><label for="note-email">답장받을 이메일 <span>선택</span></label><input id="note-email" name="email" type="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="you@example.com" aria-describedby="note-email-help"><p id="note-email-help" class="note-help">비워두면 답장을 받을 수 없어요.</p></div>
        <div class="note-trap" aria-hidden="true"><label for="note-website">Website</label><input id="note-website" name="website" tabindex="-1" autocomplete="off"></div>
        <p class="note-error" role="alert" hidden></p>
        <button class="note-send" type="submit"><span>보내기</span>${arrow}</button>
      </form>
      <div class="note-success" data-note-view="success" hidden>
        <span class="note-success-icon"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="m7 14 4.5 4.5L21 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <h2 tabindex="-1">메시지를 남겼어요.</h2><p class="note-success-copy"></p><p class="note-help">내용은 광일에게만 보여요.</p><button class="note-reset" type="button">돌아가기</button>
      </div>
      <p class="sr-only note-announcement" role="status" aria-live="polite"></p>
      <noscript><p class="note-help">메시지는 <a href="mailto:rhkd3539@gmail.com">이메일</a>로도 보낼 수 있어요.</p></noscript>
    </section>`)
    .replace(/src="\/officehours\.js[^" ]*"/, `src="/personal/contact-note.js?v=${contactNoteVersion}"`)
    .replace('</head>', `<link rel="stylesheet" href="/personal/contact-note.css?v=${contactNoteVersion}"></head>`);
}
