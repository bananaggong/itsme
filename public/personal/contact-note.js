const tile = document.querySelector('.tile--hello');

if (tile) {
  const form = tile.querySelector('form');
  const message = form.elements.message;
  const email = form.elements.email;
  const open = tile.querySelector('[data-note-open]');
  const calendarOpen = tile.querySelector('.note-calendar-open');
  const close = tile.querySelector('.note-close');
  const send = tile.querySelector('.note-send');
  const error = tile.querySelector('.note-error');
  const announcement = tile.querySelector('.note-announcement');
  let pending = false;
  let requestId = null;
  let opener = open;
  let dateTimer;

  function updateDate() {
    const now = new Date();
    const calendar = tile.querySelector('.note-calendar-date');
    calendar.dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    calendar.setAttribute('aria-label', now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
    calendar.querySelector('.ch-weekday').textContent = now.toLocaleDateString('en-GB', { weekday: 'long' });
    calendar.querySelector('.ch-date').textContent = String(now.getDate());
    clearTimeout(dateTimer);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dateTimer = setTimeout(updateDate, tomorrow.getTime() - now.getTime() + 100);
  }
  updateDate();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
  window.addEventListener('pageshow', updateDate);

  function view(name) {
    tile.dataset.noteState = name;
    for (const panel of tile.querySelectorAll('[data-note-view]')) panel.hidden = panel.dataset.noteView !== name;
    open.setAttribute('aria-expanded', String(name === 'compose'));
    calendarOpen.setAttribute('aria-expanded', String(name === 'compose'));
    calendarOpen.hidden = name !== 'idle';
    close.hidden = name !== 'compose';
  }
  function clearError() { error.hidden = true; error.textContent = ''; }
  function showError(text) { error.textContent = text; error.hidden = false; }
  function count() { tile.querySelector('.note-count').textContent = `${message.value.length.toLocaleString('en-US')} / 1,200`; }

  function openComposer(button) {
    opener = button;
    view('compose');
    message.focus({ preventScroll: true });
  }
  function closeComposer(restoreFocus = true) {
    if (pending) return;
    view('idle');
    if (restoreFocus) opener.focus({ preventScroll: true });
  }
  for (const button of [open, calendarOpen]) button.addEventListener('click', () => openComposer(button));
  close.addEventListener('click', () => closeComposer());
  // Match the original calendar: the date, topics and empty card area also open it.
  tile.addEventListener('click', event => {
    if (event.target.closest('a, button, form')) return;
    if (tile.dataset.noteState === 'idle') openComposer(calendarOpen);
    else if (tile.dataset.noteState === 'compose') closeComposer();
  });
  document.addEventListener('click', event => {
    if (tile.dataset.noteState === 'compose' && !tile.contains(event.target)) {
      closeComposer(form.contains(document.activeElement));
    }
  });
  tile.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing && !form.hidden) {
      event.stopPropagation();
      event.preventDefault();
      close.click();
    }
  });
  form.addEventListener('input', () => {
    requestId = null;
    message.setCustomValidity('');
    clearError();
    count();
  });
  tile.querySelector('.note-reset').addEventListener('click', () => {
    view('idle');
    opener.focus({ preventScroll: true });
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    clearError();
    message.setCustomValidity(message.value.trim() ? '' : '메시지를 한 줄 남겨주세요.');
    if (!form.reportValidity()) return;
    requestId ||= crypto.randomUUID();
    const body = { id: requestId, message: message.value, email: email.value, website: form.elements.website.value };
    const replyRequested = Boolean(email.value.trim());
    pending = true;
    send.disabled = close.disabled = true;
    message.readOnly = email.readOnly = true;
    form.setAttribute('aria-busy', 'true');
    send.querySelector('span').textContent = '보내는 중…';
    announcement.textContent = '메시지를 보내고 있어요.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body), signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true || result.id !== requestId) {
        if (response.status === 429) throw new Error('잠시 뒤에 다시 보내주세요. 작성한 내용은 그대로 남아 있어요.');
        throw new Error('메시지를 보내지 못했어요. 내용은 그대로 있으니 다시 시도해주세요.');
      }
      form.reset();
      count();
      requestId = null;
      tile.querySelector('.note-success-copy').textContent = replyRequested
        ? '이야기와 답장받을 주소를 함께 남겼어요.'
        : '남겨주신 이야기, 잘 읽어볼게요.';
      view('success');
      tile.querySelector('.note-success h2').focus({ preventScroll: true });
      announcement.textContent = '메시지가 저장됐어요.';
    } catch (failure) {
      const text = failure.name === 'AbortError'
        ? '응답을 확인하지 못했어요. 다시 보내도 같은 메시지가 중복으로 남지 않아요.'
        : failure instanceof TypeError
          ? '연결을 확인한 뒤 다시 보내주세요. 작성한 내용은 그대로 남아 있어요.'
          : failure.message;
      showError(text);
      announcement.textContent = '';
    } finally {
      clearTimeout(timeout);
      pending = false;
      send.disabled = close.disabled = false;
      message.readOnly = email.readOnly = false;
      form.removeAttribute('aria-busy');
      send.querySelector('span').textContent = '보내기';
    }
  });
}
