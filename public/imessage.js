// iMessage notification: a macOS-style message from Sam that slides in from the
// top right 10 seconds after the visitor first scrolls. They can close it (the ×,
// Escape, or swiping it off to the right) or reply to it. Sending a reply just
// sends the notification away: the text isn't stored or sent anywhere.
// Like a real Mac, it slides away by itself after 8 seconds, unless the visitor
// is hovering over it, dragging it or replying.
// It appears once per visit (per browser tab session), not on every page load.

import { unlockAudio } from './audio.js?v=8f596f00be';
import { playChime, playSent } from './message-sounds.js?v=941f833443';
import { readStorage, writeStorage } from './utils.js?v=8c1091ee90';

const note = document.querySelector('.im');

if (note) {
  const closeButton = note.querySelector('.im-close');
  const replyButton = note.querySelector('.im-reply');
  const form = note.querySelector('.im-compose');
  const input = note.querySelector('.im-input');
  const send = note.querySelector('.im-send');

  const DELAY = 10000;        // milliseconds after the first scroll
  const SEEN_KEY = 'imessage-seen';
  const SWIPE_AWAY = 80;      // pixels dragged right that count as "dismiss"
  const AUTO_HIDE = 8000;     // milliseconds it stays on screen before sliding away by itself
  const RESUME = 4000;        // once the pointer moves off it, this much longer before it goes

  let visible = false;
  let removeTimer;            // the wait between the slide-out starting and the banner leaving the page

  // For testing: add ?imessage to the address (e.g. localhost:8080/?imessage) to see it
  // again, even if it's already appeared in this tab
  const testing = new URLSearchParams(location.search).has('imessage');

  function alreadySeen() {
    if (testing) return false;
    return readStorage(SEEN_KEY, 'sessionStorage') === '1';
  }

  // --- Showing it -----------------------------------------------------------

  // Wait for the first scroll, then start the 10 second timer. { once: true }
  // means the listener removes itself after the first scroll event.
  if (!alreadySeen()) {
    window.addEventListener('scroll', () => setTimeout(show, DELAY), { once: true, passive: true });
    listenForAudioUnlock();
  }

  function show() {
    // The visitor switched to another tab: wait until they're back, so it isn't missed
    if (document.hidden) {
      return document.addEventListener('visibilitychange', show, { once: true });
    }
    // Don't interrupt someone using the Photo Booth window; try again shortly
    if (document.querySelector('dialog[open]')) return setTimeout(show, 3000);

    writeStorage(SEEN_KEY, '1', 'sessionStorage');   // if it can't be saved, it shows again next visit, that's all
    clearTimeout(removeTimer);   // a dismissal moments ago is still waiting to take it out of the page
    note.hidden = false;
    // Wait one frame so the browser draws it off-screen first; then the slide-in can animate
    requestAnimationFrame(() => requestAnimationFrame(() => note.classList.add('is-in')));
    visible = true;
    playChime();
    startHideTimer(AUTO_HIDE);
  }

  // Spotlight: searching "hello" (spotlight.js) brings the message straight in,
  // even if it has already been and gone this visit
  document.addEventListener('spotlight:hello', () => {
    if (visible) return;
    note.classList.remove('is-in', 'is-out', 'is-replying', 'is-dragging');
    note.style.transform = '';
    input.value = '';
    send.disabled = true;
    input.tabIndex = -1;
    send.tabIndex = -1;
    show();
  });

  // --- Hiding it ------------------------------------------------------------

  function dismiss() {
    if (!visible) return;
    visible = false;
    clearTimeout(hideTimer);
    note.classList.remove('is-dragging');
    note.style.transform = '';
    note.classList.add('is-out');
    if (note.contains(document.activeElement)) document.activeElement.blur();
    // Take it out of the page once the slide-out has finished. show() cancels this, so
    // saying hello (Spotlight) straight after a dismissal doesn't hide the new banner.
    removeTimer = setTimeout(() => { note.hidden = true; }, 450);
  }

  closeButton.addEventListener('click', dismiss);

  // --- Hiding itself after a few seconds ---------------------------------------
  // A timer counts down while it's on screen. Hovering over it, dragging it,
  // clicking into it or switching to another tab pauses the countdown; once the
  // visitor stops, it gets a few more seconds. Opening the reply box stops it for good.

  let hideTimer;

  function startHideTimer(ms) {
    clearTimeout(hideTimer);
    if (visible && !note.classList.contains('is-replying')) hideTimer = setTimeout(autoHide, ms);
  }

  function autoHide() {
    // Still in use (e.g. the pointer is resting on it): leave it; moving off restarts the timer
    if (dragging || note.matches(':hover, :focus-within')) return;
    dismiss();
  }

  note.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  note.addEventListener('pointerleave', () => { if (!dragging) startHideTimer(RESUME); });
  note.addEventListener('focusin', () => clearTimeout(hideTimer));
  note.addEventListener('focusout', event => {
    if (!note.contains(event.relatedTarget)) startHideTimer(RESUME);  // focus left the banner altogether
  });

  // Don't let it slip away while the visitor is looking at another tab
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(hideTimer);
    else startHideTimer(RESUME);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && visible && !document.querySelector('dialog[open]')) dismiss();
  });

  // --- Replying -------------------------------------------------------------

  function openReply() {
    if (note.classList.contains('is-replying')) return;
    note.classList.add('is-replying');
    clearTimeout(hideTimer);  // they're typing: it stays until they send or close it
    input.tabIndex = 0;
    send.tabIndex = 0;
    input.focus({ preventScroll: true });
  }

  replyButton.addEventListener('click', openReply);

  // Clicking the message itself also opens the reply box (on a Mac it opens Messages)
  note.querySelector('.im-main').addEventListener('click', event => {
    if (!event.target.closest('button') && !dragged) openReply();
  });

  // Send only lights up once there's something to send
  input.addEventListener('input', () => { send.disabled = !input.value.trim(); });

  // Enter in the box or clicking Send both "submit" the form
  form.addEventListener('submit', event => {
    event.preventDefault();  // stop the browser reloading the page, which is what forms do by default
    if (!input.value.trim()) return;
    playSent();
    dismiss();
  });

  // --- Swipe right to dismiss ------------------------------------------------
  // Pointer events cover mouse, trackpad and touch in one go.

  let startX = 0;
  let offset = 0;
  let dragging = false;
  let dragged = false;  // true if the pointer moved enough to count as a drag, not a click

  note.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button, input')) return;
    event.preventDefault();  // stops the browser starting its own drag of the photo or text
    startX = event.clientX;
    offset = 0;
    dragging = true;
    dragged = false;
  });

  window.addEventListener('pointermove', event => {
    if (!dragging) return;
    // Right follows the pointer; left only budges a little, as if on a rubber band
    const dx = event.clientX - startX;
    offset = dx > 0 ? dx : dx / 6;
    if (Math.abs(dx) > 4) {
      dragged = true;
      note.classList.add('is-dragging');
      note.style.transform = `translateX(${offset}px)`;
    }
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (event.type === 'pointerup' && offset > SWIPE_AWAY) return dismiss();
    // Not far enough: spring back into place
    note.classList.remove('is-dragging');
    note.style.transform = '';
    setTimeout(() => { dragged = false; }, 0);  // after the click event that follows pointerup
    if (!note.matches(':hover')) startHideTimer(RESUME);
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);  // e.g. the phone decided it's a scroll after all

  // --- Sounds ---------------------------------------------------------------
  // Both sounds are made in code with the Web Audio API (the browser's built-in
  // synthesiser, as in sound.js), so there are no audio files to download.
  //
  // Browsers stay silent until the visitor has clicked, tapped or pressed a key,
  // and scrolling doesn't count. So the audio is "unlocked" on their first click
  // anywhere on the page (only on visits where the notification is still to come).
  // If it arrives before any click, it arrives silently; the Send sound always
  // plays, because clicking Send is a click.

  function listenForAudioUnlock() {
    ['pointerdown', 'keydown', 'touchend'].forEach(type =>
      window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
  }
  // playChime and playSent live in message-sounds.js, shared with the Newsletter page's chat
}
