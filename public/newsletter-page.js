// Newsletter page: a Messages chat with Sam where the visitor subscribes by replying
// with their email.
//
// 1. Sam's opening messages (plain HTML in the page) are replayed one by one, each
//    after a moment of "typing…". Skipped for reduced motion or a background tab.
// 2. Quick-reply buttons ask Sam a question; his answers come from the page's
//    <template class="ms-answers">, so all the copy lives in one place.
// 3. The reply box sends the email to the site's own sign-up address (/api/subscribe,
//    worker/index.js), in the background so the chat carries on. Sam replies once it's
//    saved, or asks them to try again if it wasn't. Sam imports the list into Substack.
// 4. Turnstile, Cloudflare's "are you a person?" check, runs quietly in the background and
//    only shows a box to tick if Cloudflare isn't sure. Its one-time token goes with the
//    email, and worker/index.js asks Cloudflare whether it's genuine.

import { playChime, playSent } from './message-sounds.js?v=941f833443';
import { lessMotion, scrollBehavior, wait } from './utils.js?v=8c1091ee90';

// Turnstile's site key, from the Cloudflare dashboard (Turnstile → the samdickie.me widget).
// Empty means the page sends no token. It's public, so it's fine here; the secret key is
// kept in Cloudflare (see wrangler.jsonc).
//
// Deploy this before setting the secret: worker/index.js turns away any sign-up without a
// token once the secret is set. See "Sign-ups" in README.md.
const TURNSTILE_SITE_KEY = '';
// On a laptop (localhost) use Cloudflare's test key instead, which always passes
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const siteKey = LOCAL ? '1x00000000000000000000AA' : TURNSTILE_SITE_KEY;

const thread = document.querySelector('.ms-thread');
const form = document.querySelector('.ms-compose');

if (thread && form) {
  const input = form.querySelector('.ms-input');
  const send = form.querySelector('.ms-send');
  const chips = document.querySelector('.ms-chips');
  const answers = document.querySelector('.ms-answers').content;

  // The browser's own check accepts "sam@gmail" (no .com), so also ask for a dot after the @
  const looksLikeEmail = text => input.checkValidity() && /@[^@\s]+\.[^@\s]{2,}$/.test(text);

  const pause = ms => wait(lessMotion() ? 0 : ms);   // no pauses for less movement

  // Sam "types" for longer when he has more to say, within limits
  const typingTime = text => Math.min(1400, 450 + text.length * 9);

  // --- Adding messages ----------------------------------------------------

  function scrollToEnd() {
    thread.scrollTo({ top: thread.scrollHeight, behavior: scrollBehavior() });
  }

  // Wraps a bubble in a row for Sam (left, grey) or the visitor (right, blue)
  function addRow(who, bubble) {
    const row = document.createElement('div');
    row.className = `ms-msg ms-msg--${who} is-new`;
    row.append(bubble);
    thread.append(row);
    scrollToEnd();
    return row;
  }

  function bubble(content) {
    const p = document.createElement('p');
    p.className = 'ms-bubble';
    // Visitor text goes in as plain text (never as HTML); Sam's answers are copied from the template
    if (typeof content === 'string') p.textContent = content;
    else p.append(...content.childNodes);
    return p;
  }

  function showTyping() {
    const dots = document.createElement('div');
    dots.className = 'ms-bubble ms-typing';
    dots.setAttribute('role', 'img');   // a label needs a role to count
    dots.setAttribute('aria-label', 'Sam is typing');
    dots.innerHTML = '<span></span><span></span><span></span>';
    return addRow('sam', dots);
  }

  // Sam's replies wait in a queue, so two quick questions don't get answered on top of each other
  let queue = Promise.resolve();

  function samSays(paragraphs) {
    queue = queue.then(async () => {
      for (const [i, paragraph] of paragraphs.entries()) {
        const typing = showTyping();
        await pause(typingTime(paragraph.textContent));
        typing.remove();
        addRow('sam', bubble(paragraph.cloneNode(true)));
        if (i === 0) playChime(0.2);
        await pause(250);
      }
    });
    return queue;
  }

  const reply = key => [...answers.querySelector(`[data-reply="${key}"]`).children];

  // "Delivered" sits under the visitor's latest message, as in Messages
  let delivered = null;
  function visitorSays(text) {
    delivered?.remove();
    addRow('me', bubble(text));
    delivered = document.createElement('p');
    delivered.className = 'ms-delivered';
    delivered.textContent = 'Delivered';
    thread.append(delivered);
  }

  // --- 1. Replaying Sam's opening messages --------------------------------

  const intro = [...thread.querySelectorAll('.ms-msg')];
  let introDone = false;

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    intro.forEach(row => { row.hidden = false; });
    thread.querySelector('.ms-typing')?.closest('.ms-msg').remove();
    chips.hidden = chips.children.length === 0;
    thread.scrollTop = thread.scrollHeight;   // start at the newest message, like Messages
  }

  async function replayIntro() {
    intro.forEach(row => { row.hidden = true; });
    for (const row of intro) {
      await pause(400);
      if (introDone) return;
      const typing = showTyping();
      await pause(typingTime(row.textContent.trim()));
      typing.remove();
      if (introDone) return;
      row.hidden = false;
      row.classList.add('is-new');
      scrollToEnd();
    }
    await pause(300);
    finishIntro();
  }

  // --- 2. Quick-reply questions -------------------------------------------

  answers.querySelectorAll('[data-q]').forEach(answer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ms-chip';
    button.textContent = answer.dataset.q;
    button.addEventListener('click', () => {
      finishIntro();
      button.remove();
      chips.hidden = chips.children.length === 0;
      visitorSays(answer.dataset.q);
      samSays([...answer.children]);
    });
    chips.append(button);
  });

  // --- 3. Subscribing -----------------------------------------------------

  form.noValidate = true;       // we check the address ourselves, so Sam can reply instead of a browser pop-up

  // Send only lights up once there's something to send, like Messages
  const updateSend = () => { send.disabled = !input.value.trim(); };
  input.addEventListener('input', updateSend);
  updateSend();

  input.addEventListener('focus', finishIntro);

  // Posts the address to worker/index.js and resolves true once it's saved
  async function save(email) {
    const turnstile = await turnstileToken();
    useToken();
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, website: form.elements.website.value, turnstile }),
      });
      return (await response.json()).ok === true;
    } catch {
      return false;  // offline, or the server didn't answer
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();     // stay on the page: the email goes in the background instead
    finishIntro();
    const email = input.value.trim();
    if (!email) return;

    if (!looksLikeEmail(email)) {
      visitorSays(email);
      samSays(reply('invalid'));
      input.select();           // keep the text to fix, but typing afresh replaces it
      return;
    }

    visitorSays(email);
    playSent();
    input.value = '';
    updateSend();
    const saved = await save(email);
    samSays(reply(saved ? 'subscribed' : 'error'));
    if (!saved) {               // give them their address back to resend
      input.value = email;
      updateSend();
    }
  });

  // --- 4. Turnstile ------------------------------------------------------

  let widget = null;        // Turnstile's ID for its box on this page
  let token = '';           // the latest one-time token; each can be used once
  const waiting = [];       // sign-ups waiting for a token
  let unavailable = !siteKey;

  const tokenArrived = value => { waiting.splice(0).forEach(resolve => resolve(value)); };

  if (siteKey) {
    const box = document.createElement('div');
    box.className = 'ms-turnstile';
    form.before(box);       // just above the reply box, if Cloudflare asks for a tick
    window.onTurnstileLoad = () => {
      try {
        widget = window.turnstile.render(box, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: value => { token = value; tokenArrived(value); },
          'expired-callback': () => { token = ''; },
        });
      } catch {
        unavailable = true;   // e.g. a mistyped site key
        tokenArrived('');
      }
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    script.async = true;
    // Blocked (by an ad blocker, say) or offline: send sign-ups without a token
    script.onerror = () => { unavailable = true; tokenArrived(''); };
    document.head.append(script);
  }

  // The token, waiting up to 20 seconds for the check to finish (or for the visitor to tick
  // the box). Without one the sign-up is still sent, and worker/index.js decides.
  function turnstileToken() {
    if (unavailable || token) return Promise.resolve(token);
    return new Promise(resolve => {
      waiting.push(resolve);
      setTimeout(() => resolve(''), 20_000);
    });
  }

  // A token works once, so get a fresh one ready for the next sign-up
  function useToken() {
    token = '';
    if (widget !== null) window.turnstile.reset(widget);
  }

  // --- Start --------------------------------------------------------------

  if (lessMotion() || document.hidden) finishIntro();
  else replayIntro();
}
