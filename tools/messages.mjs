import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = createHash('sha256').update(readFileSync(new URL(import.meta.url)));
for (const file of ['messages.js', 'messages.css']) hash.update(readFileSync(new URL('../public/personal/' + file, import.meta.url)));
export const messagesVersion = hash.digest('hex').slice(0, 10);

export function personalizeMessagesHTML(html, profile) {
  if (!html.includes('class="im"')) return html;
  return html
    .replace(/<section class="im"[\s\S]*?<\/section>/, `<section class="im im-personal" aria-label="${profile.name}의 메시지" hidden>
      <button class="im-close" type="button" aria-label="메시지 닫기"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
      <div class="im-main"><span class="im-avatar"><img src="${profile.photo}" data-profile-photo alt="" draggable="false"><svg class="im-badge" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="5" fill="#34c759"/><path d="M10 4.6c-3.3 0-5.9 2.1-5.9 4.8 0 1.5.8 2.8 2.1 3.7-.1.9-.6 1.8-1.3 2.3 1.5.1 2.8-.4 3.6-1.2.5.1 1 .1 1.5.1 3.3 0 5.9-2.1 5.9-4.9S13.3 4.6 10 4.6z" fill="#fff"/></svg></span>
      <div class="im-text"><p class="im-head"><span class="im-name">${profile.name}</span><span class="im-time">방금</span></p><p class="im-body" role="status" aria-live="polite" aria-atomic="true"></p></div></div>
      <div class="im-actions"><button class="im-ack" type="button">계속 들을게요</button></div>
    </section>`)
    .replace(/src="\/imessage\.js[^" ]*"/, `src="/personal/messages.js?v=${messagesVersion}"`)
    .replace('</head>', `<link rel="stylesheet" href="/personal/messages.css?v=${messagesVersion}"></head>`);
}
