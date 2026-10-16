// A soft "tick" whenever something clickable is pressed.
// The sound is generated in code with the Web Audio API (the browser's built-in
// synthesiser), so there's no audio file to download.

import { noiseBuffer, unlockAudio } from './audio.js?v=8f596f00be';

const CLICKABLE = 'a, button';
const VOLUME = 0.25; // 0 = silent, 1 = full volume

// A 20 millisecond burst of noise that fades out fast: the "tick".
// Made on the first click and reused for every click after.
let tick = null;

function playClick() {
  const ctx = unlockAudio(); // every click is a moment the browser allows sound
  if (!ctx) return;
  tick ??= noiseBuffer(ctx, 0.02, 4);
  const now = ctx.currentTime;

  // 1. The noise burst, filtered so only the crisp high part is left
  const noise = ctx.createBufferSource();
  noise.buffer = tick;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3200;
  filter.Q.value = 1.2;

  // 2. A tiny high "blip" underneath, which gives the click a bit of body
  const blip = ctx.createOscillator();
  blip.frequency.setValueAtTime(1800, now);
  blip.frequency.exponentialRampToValueAtTime(900, now + 0.03);
  const blipGain = ctx.createGain();
  blipGain.gain.setValueAtTime(0.35, now);
  blipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  // Wire everything up: sources → volume → speakers
  const volume = ctx.createGain();
  volume.gain.value = VOLUME;
  noise.connect(filter).connect(volume);
  blip.connect(blipGain).connect(volume);
  volume.connect(ctx.destination);

  noise.start(now);
  blip.start(now);
  blip.stop(now + 0.04);
}

// Mouse and trackpad: click the moment the button goes down (feels more physical)
document.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button === 0 && event.target.closest(CLICKABLE)) {
    playClick();
  }
});

// Touch: click when the finger lifts. Phones only allow sound at that point,
// and if the finger starts scrolling instead, this never fires, so no stray clicks.
document.addEventListener('pointerup', event => {
  if (event.pointerType !== 'mouse' && event.target.closest(CLICKABLE)) playClick();
});

// Keyboard (Enter or Space on a focused link or button)
document.addEventListener('click', event => {
  if (event.detail === 0 && event.target.closest(CLICKABLE)) playClick();
});
