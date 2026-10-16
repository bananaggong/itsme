// The two Messages sounds, shared by the homepage iMessage notification (imessage.js)
// and the Newsletter chat (newsletter-page.js). Both are made in code with the Web
// Audio API (the browser's built-in synthesiser, as in sound.js), so there are no
// audio files to download.
//
// Browsers stay silent until the visitor has clicked, tapped or pressed a key, so
// each sound quietly does nothing before then.

import { noiseBuffer, readyAudio } from './audio.js?v=8f596f00be';

const VOLUME = 0.3;  // 0 = silent, 1 = full volume

// One soft bell note: a pure tone plus a quieter overtone an octave up,
// that glides up slightly as it starts (the "bubble" feel) and rings out.
function bell(ctx, out, frequency, start, length, level) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.008);   // quick fade in, so no pop
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length); // ring out
  gain.connect(out);

  [[1, 1], [2, 0.18]].forEach(([multiple, loudness]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * multiple * 0.94, start);
    osc.frequency.exponentialRampToValueAtTime(frequency * multiple, start + 0.04);
    const partial = ctx.createGain();
    partial.gain.value = loudness;
    osc.connect(partial).connect(gain);
    osc.start(start);
    osc.stop(start + length + 0.05);
  });
}

// Message arrived: two rising bell notes, in the spirit of the Messages "received" sound
export function playChime(volume = VOLUME) {
  const ctx = readyAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(ctx.destination);
  bell(ctx, out, 1175, now, 0.35, 0.5);         // D6
  bell(ctx, out, 1568, now + 0.11, 0.55, 0.45); // G6
}

// Message sent: a "swoosh" made from a burst of hiss whose pitch sweeps upward,
// drifting from left to right in stereo, as if flying off to the right
export function playSent(volume = VOLUME) {
  const ctx = readyAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const length = 0.38;

  // Hiss ("white noise"): random numbers played as sound
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, length);

  // A filter that only lets a narrow band of the hiss through; sweeping it up makes the swoosh
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.exponentialRampToValueAtTime(5000, now + length);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume * 1.6, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

  let chain = noise.connect(filter).connect(gain);
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.2, now);
    pan.pan.linearRampToValueAtTime(0.7, now + length);
    chain = chain.connect(pan);
  }
  chain.connect(ctx.destination);
  noise.start(now);
}
