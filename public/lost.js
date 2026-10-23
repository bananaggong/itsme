// 404 page: a pretend Find My search for the page the visitor asked for.
// 1. "Searching for /their-address/…" with radar rings for a few seconds
// 2. then "No location found": the pin goes grey, like an AirTag that's offline
// Play Sound plays an AirTag-style chirp (made in code, like the site's other sounds)
// and wiggles the pin. Without JavaScript the page shows the final state straight away.

import { unlockAudio } from './audio.js?v=8f596f00be';
import { lessMotion } from './utils.js?v=8c1091ee90';

const SEARCH_MS = 3200;   // how long the pretend search lasts
const VOLUME = 0.18;      // 0 = silent, 1 = full volume

const tile = document.querySelector('.tile--lost');
if (tile) init(tile);

function init(tile) {
  const status = tile.querySelector('.lost-status-text');
  const soundButton = tile.querySelector('.lost-sound');
  let address = location.pathname;
  try { address = decodeURI(address); } catch { /* a malformed address: show it as typed */ }

  const lostText = `페이지를 찾을 수 없습니다`;

  if (lessMotion()) {
    showLost();
  } else {
    tile.classList.add('is-searching');
    status.textContent = `Searching for ${address}…`;
    setTimeout(showLost, SEARCH_MS);
  }

  function showLost() {
    tile.classList.remove('is-searching');
    tile.classList.add('is-lost');
    status.textContent = lostText;
  }

  soundButton.hidden = false;
  soundButton.addEventListener('click', () => {
    const seconds = playChirps();
    soundButton.disabled = true;
    soundButton.textContent = 'Playing Sound…';
    tile.classList.add('is-ringing');
    setTimeout(() => {
      tile.classList.remove('is-ringing');
      soundButton.disabled = false;
      soundButton.textContent = 'Play Sound';
      status.textContent = 'Sound played. Nothing answered · It’s not nearby';
    }, seconds * 1000);
  });
}

// Three bursts of a quick rising four-note chirp. Returns how long it lasts, in seconds.
function playChirps() {
  const NOTES = [1568, 2093, 2637, 3136];   // G6, C7, E7, G7
  const NOTE = 0.07, GAP = 0.02, PAUSE = 0.28, BURSTS = 3;
  const burst = NOTES.length * (NOTE + GAP) + PAUSE;
  const ctx = unlockAudio();
  if (!ctx) return BURSTS * burst;          // no sound available, but still wiggle the pin

  const start = ctx.currentTime + 0.05;
  for (let b = 0; b < BURSTS; b++) {
    NOTES.forEach((freq, i) => {
      const t = start + b * burst + i * (NOTE + GAP);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';                 // softer than a pure beep
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(VOLUME, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + NOTE);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + NOTE + 0.02);
    });
  }
  return BURSTS * burst;
}
