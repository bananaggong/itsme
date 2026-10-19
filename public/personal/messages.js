// A local note from the site owner, triggered by actually starting a song.
// No replies are collected or sent. Each tab hears the music story once.
import { readStorage, writeStorage } from '../utils.js?v=8c1091ee90';

const note = document.querySelector('.im-personal');
if (note) setup(note);

function setup(note) {
  const seenKey = 'itsme-music-message-v1';
  const body = note.querySelector('.im-body');
  const acknowledge = note.querySelector('.im-ack');
  const copy = {
    music: '여기 담긴 음악은 제가 SUNO AI로 만든 곡들이에요. 제 취향을 담아 플레이리스트로 모으고 있습니다. 잠깐 틀어두고 둘러보셔도 좋아요.',
    hello: '반가워요, 김광일입니다. 하고 싶은 것들을 하나씩 만들고, 이곳에 모으고 있어요. 편하게 둘러보세요.',
  };
  let visible = false;
  let pending = null;
  let musicShown = readStorage(seenKey, 'sessionStorage') === '1';
  let hideTimer;
  let removeTimer;
  let showTimer;
  let dragging = false;
  let startX = 0;
  let restoreFocus = null;

  function startHideTimer(ms = 10000) {
    clearTimeout(hideTimer);
    if (visible && !document.hidden) hideTimer = setTimeout(() => {
      if (!note.matches(':hover, :focus-within') && !dragging) dismiss();
    }, ms);
  }
  function show(kind) {
    if (kind === 'music' && musicShown) return;
    if (document.hidden || document.querySelector('dialog[open]')) { pending = kind; return; }
    pending = null;
    clearTimeout(removeTimer);
    if (!visible) restoreFocus = document.activeElement;
    note.classList.remove('is-in', 'is-out', 'is-dragging');
    note.style.transform = '';
    note.hidden = false;
    acknowledge.textContent = kind === 'music' ? '계속 들을게요' : '반가워요';
    visible = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      body.textContent = copy[kind];
      note.classList.add('is-in');
    }));
    if (kind === 'music') {
      musicShown = true;
      writeStorage(seenKey, '1', 'sessionStorage');
    }
    startHideTimer();
  }
  function dismiss() {
    if (!visible) return;
    visible = false;
    clearTimeout(hideTimer);
    note.classList.remove('is-in', 'is-dragging');
    note.style.transform = '';
    note.classList.add('is-out');
    if (note.contains(document.activeElement)) {
      if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
      else document.activeElement.blur();
    }
    removeTimer = setTimeout(() => { note.hidden = true; }, 450);
  }
  document.addEventListener('itsme:music-played', () => {
    if (!musicShown && !showTimer) showTimer = setTimeout(() => { showTimer = null; show('music'); }, 500);
  });
  // Preserve the existing, explicit Spotlight "hello" action as a Korean hello.
  document.addEventListener('spotlight:hello', () => show('hello'));
  note.querySelector('.im-close').addEventListener('click', dismiss);
  acknowledge.addEventListener('click', dismiss);
  note.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  note.addEventListener('pointerleave', () => startHideTimer(4000));
  note.addEventListener('focusin', () => clearTimeout(hideTimer));
  note.addEventListener('focusout', event => { if (!note.contains(event.relatedTarget)) startHideTimer(4000); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) dismiss();
  });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(hideTimer);
    if (!document.hidden) { if (pending) show(pending); else startHideTimer(4000); }
  });
  // A modal may have been open when the music began. Show after it closes.
  new MutationObserver(() => { if (pending && !document.querySelector('dialog[open]')) show(pending); })
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  note.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button, a, input')) return;
    startX = event.clientX;
    dragging = true;
    clearTimeout(hideTimer);
  });
  window.addEventListener('pointermove', event => {
    if (!dragging) return;
    note.classList.add('is-dragging');
    note.style.transform = `translateX(${Math.max(0, event.clientX - startX)}px)`;
  });
  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (event.type === 'pointerup' && event.clientX - startX > 80) dismiss();
    else { note.classList.remove('is-dragging'); note.style.transform = ''; startHideTimer(4000); }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
}
