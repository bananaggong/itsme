// Chat's private message sheet uses the same persisted inbox as the home calendar.
const dialog = document.querySelector('.gc-message');

if (dialog) {
  const form = dialog.querySelector('form');
  const message = form.elements.message;
  const email = form.elements.email;
  const close = dialog.querySelector('.gc-message-close');
  const send = dialog.querySelector('.gc-message-send');
  const error = dialog.querySelector('.gc-message-error');
  const success = dialog.querySelector('.gc-message-success');
  const status = dialog.querySelector('.gc-message-announcement');
  let pending = false, requestId = null, opener = null;

  function clearError() { error.hidden = true; error.textContent = ''; }
  function open(trigger) {
    if (dialog.open) return;
    opener = trigger;
    if (!success.hidden) { success.hidden = true; form.hidden = false; clearError(); status.textContent = ''; }
    dialog.showModal(); message.focus({preventScroll:true});
  }
  function dismiss() { if (!pending) dialog.close(); }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-chat-message-open]');
    if (!trigger) return;
    event.preventDefault(); open(trigger);
  });
  close.addEventListener('click', dismiss);
  dialog.querySelector('.gc-message-done').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { if (pending || event.isComposing) event.preventDefault(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
  });
  dialog.addEventListener('close', () => {
    const target = opener?.isConnected && opener.getClientRects().length ? opener : document.querySelector('.gc-contact');
    target?.focus({preventScroll:true});
  });
  form.addEventListener('input', () => { requestId = null; message.setCustomValidity(''); clearError(); status.textContent = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    clearError();
    message.setCustomValidity(message.value.trim() ? '' : '메시지를 한 줄 남겨주세요.');
    if (!form.reportValidity()) return;
    requestId ||= crypto.randomUUID();
    const body = {id:requestId,message:message.value,email:email.value,website:form.elements.website.value};
    const replyRequested = Boolean(email.value.trim());
    pending = true; send.disabled = close.disabled = true; message.readOnly = email.readOnly = true;
    form.setAttribute('aria-busy','true'); send.textContent = '보내는 중…'; status.textContent = '메시지를 보내고 있어요.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/messages', {
        method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(body),signal:controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true || result.id !== requestId) {
        if (response.status === 429) throw new Error('잠시 뒤에 다시 보내주세요. 작성한 내용은 그대로 남아 있어요.');
        throw new Error('메시지를 보내지 못했어요. 내용은 그대로 있으니 다시 시도해주세요.');
      }
      form.reset(); requestId = null; form.hidden = true; success.hidden = false;
      dialog.querySelector('.gc-message-success-copy').textContent = replyRequested ? '이야기와 답장받을 주소를 함께 남겼어요.' : '남겨주신 이야기, 잘 읽어볼게요.';
      success.querySelector('h3').focus({preventScroll:true}); status.textContent = '메시지가 저장됐어요.';
    } catch (failure) {
      error.textContent = failure.name === 'AbortError'
        ? '응답을 확인하지 못했어요. 다시 보내도 같은 메시지가 중복으로 남지 않아요.'
        : failure instanceof TypeError ? '연결을 확인한 뒤 다시 보내주세요. 작성한 내용은 그대로 남아 있어요.' : failure.message;
      error.hidden = false; status.textContent = '';
    } finally {
      clearTimeout(timeout); pending = false; send.disabled = close.disabled = false;
      message.readOnly = email.readOnly = false; form.removeAttribute('aria-busy'); send.textContent = '보내기 ↑';
    }
  });
}
