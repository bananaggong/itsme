// "Siri, turn me into a Memoji": a pretend Apple Intelligence moment on the portrait tile.
// Pressing the Siri button plays a short scene: Siri's rainbow glow runs round the tile,
// an "Ask Siri" bar slides up and types the request, the photo shimmers while Siri
// "thinks", then the Memoji fades in. Pressing it again asks Siri to change Sam back.
// Nothing is really generated: the Memoji is a ready-made picture (assets/sam-memoji.webp).
// The Memoji is remembered (look.js), and then shows instead of Sam's photo across the site,
// including this tile on later visits. Styles are in memoji.css.

import { noiseBuffer, unlockAudio, readyAudio } from './audio.js?v=8f596f00be';
import { savedLook, setLook } from './look.js?v=d45ebe80f1';
import { lessMotion, wait } from './utils.js?v=8c1091ee90';

// For each look: what Siri is asked to get there, what's announced once it's done,
// and what the button offers next (it then offers the way back)
const LOOKS = {
  memoji: {
    prompt: 'Turn me into a Memoji',
    done: 'Siri turned Sam into a Memoji.',
    button: 'Ask Siri to change Sam back to pixel art',
    label: 'Change me back',
  },
  pixel: {
    prompt: 'Change me back',
    done: 'Sam is back to pixel art.',
    button: 'Ask Siri to turn Sam into a Memoji',
    label: 'Memoji me',
  },
};

const tile = document.querySelector('.tile--avatar');
if (tile) setUp(tile);

function setUp(tile) {
  const button = tile.querySelector('.siri-button');
  const label = tile.querySelector('.siri-label');
  const bar = tile.querySelector('.siri-bar');
  const text = tile.querySelector('.siri-text');
  const status = tile.querySelector('.siri-status');
  const pixel = tile.querySelector('.avatar-pixel');
  const memoji = tile.querySelector('.avatar-memoji');
  const pixelAlt = pixel.alt;

  // Pause for a moment (much shorter for visitors who prefer less movement)
  const pause = ms => wait(lessMotion() ? Math.min(ms, 200) : ms);   // short pauses for less movement

  // Sets the button, labels and descriptions to match a look
  function settle(next) {
    const look = LOOKS[next];
    tile.dataset.look = next;
    pixel.alt = next === 'memoji' ? '' : pixelAlt;
    memoji.alt = next === 'memoji' ? 'Memoji of Sam: a cartoon version of his photo' : '';
    button.setAttribute('aria-label', look.button);
    button.setAttribute('aria-pressed', String(next === 'memoji'));
    label.textContent = look.label;
  }

  // Already a Memoji from an earlier visit: show it straight away, without the scene
  if (savedLook() === 'memoji') {
    memoji.loading = 'eager';
    tile.classList.add('is-instant');
    settle('memoji');
    requestAnimationFrame(() => requestAnimationFrame(() => tile.classList.remove('is-instant')));
  }

  // The Siri logo animates (memoji.css). Pause it while the tile is off screen, and the first
  // time the tile comes into view, slide out the button's words for a few seconds as a hint
  // (phones have no hover, so otherwise they'd never see what the button does).
  let hinted = false;
  new IntersectionObserver(([entry]) => {
    tile.classList.toggle('is-away', !entry.isIntersecting);
    if (entry.intersectionRatio >= 0.6 && !hinted && tile.dataset.look === 'pixel') {
      hinted = true;
      setTimeout(() => tile.classList.add('is-hinting'), 1500);   // in step with the first wake-up
      setTimeout(() => tile.classList.remove('is-hinting'), 4500);
    }
  }, { threshold: [0, 0.6] }).observe(tile);

  let busy = false;

  button.addEventListener('click', async () => {
    if (busy) return; // one scene at a time
    busy = true;
    tile.classList.add('was-used');   // it's been found, so the logo stops waking up to invite a tap
    tile.classList.remove('is-hinting');
    const next = tile.dataset.look === 'memoji' ? 'pixel' : 'memoji';
    const look = LOOKS[next];
    status.textContent = '';

    // 1. Siri wakes up: chime, glow round the edge, the bar slides up
    chime();
    tile.classList.add('is-busy', `to-${next}`, 'is-asking');
    await pause(600);

    // 2. The request is typed in, then sent
    await type(look.prompt);
    await pause(400);
    bar.classList.add('is-sent');
    keyClick(true);
    await pause(220);

    // 3. The bar slides away and the picture shimmers while Siri "thinks".
    //    (Also waits for the Memoji to be downloaded and ready, so it never pops in half-drawn.)
    tile.classList.remove('is-asking');
    tile.classList.add('is-making');
    await Promise.all([pause(1600), memoji.decode().catch(() => {})]);

    // 4. The new look fades in, here and in every other picture of Sam (and it's remembered)
    settle(next);
    setLook(next);
    tile.classList.remove('is-making');
    if (next === 'memoji') sparkle();
    await pause(900);

    // 5. Siri goes away; the button comes back, now offering the other direction
    tile.classList.remove('is-busy', `to-${next}`);
    bar.classList.remove('has-text', 'is-sent');
    text.textContent = '';
    status.textContent = look.done; // read out by screen readers
    busy = false;
  });

  // Types the words into the bar a letter at a time, at an uneven human-ish speed
  async function type(words) {
    bar.classList.add('has-text');
    if (lessMotion()) { text.textContent = words; return; }
    text.textContent = '';
    for (const letter of words) {
      text.textContent += letter;
      keyClick(letter === ' ');
      await pause(45 + Math.random() * 55 + (letter === ' ' ? 50 : 0));
    }
  }
}

// ---------- Sounds (made in code with the browser's built-in synthesiser) ----------

// Plays soft bell-like notes: [pitch in Hz, start delay in seconds]
function tones(notes, volume) {
  const ctx = unlockAudio(); // the button press is a moment the browser allows sound
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(ctx.destination);
  for (const [pitch, delay] of notes) {
    const start = now + delay;
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = pitch;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0.0001, start);
    fade.gain.exponentialRampToValueAtTime(1, start + 0.02);
    fade.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    tone.connect(fade).connect(out);
    tone.start(start);
    tone.stop(start + 0.55);
  }
}

// A keyboard tick for each typed letter: a very short burst of noise, filtered so it
// sounds like a tap on glass. Each tick's pitch wobbles a little so it doesn't sound
// robotic, and the space bar (and the send button) sound a touch deeper, like on an iPhone.
let tickNoise = null;
function keyClick(deep = false) {
  const ctx = readyAudio(); // only if sound is already on (the Siri button press switched it on)
  if (!ctx) return;
  tickNoise ??= noiseBuffer(ctx, 0.015, 3);
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = tickNoise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (deep ? 1500 : 2600) * (0.9 + Math.random() * 0.2);
  filter.Q.value = 1.4;
  const volume = ctx.createGain();
  volume.gain.value = deep ? 0.22 : 0.16;
  noise.connect(filter).connect(volume).connect(ctx.destination);
  noise.start(now);
}

// Two rising notes when Siri starts listening
const chime = () => tones([[523.25, 0], [783.99, 0.1]], 0.16);
// A quick twinkle as the Memoji appears
const sparkle = () => tones([[1046.5, 0], [1318.5, 0.07], [1568, 0.14], [2093, 0.21]], 0.07);
