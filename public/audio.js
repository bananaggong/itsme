// One shared Web Audio engine (the browser's built-in synthesiser) for all the
// site's sounds: the click (sound.js), the Messages sounds (message-sounds.js), Siri
// (memoji.js) and the 404 page's chirps (lost.js).
// Browsers keep it silent until the visitor clicks, taps or presses a key, so
// it's only created or woken from inside one of those.
//
// Import it with exactly the same address everywhere ('./audio.js'), so
// every script gets the same engine rather than a copy each.

let engine = null;

// Call from inside a click, tap or key press: creates the engine (or wakes it up) and returns it
export function unlockAudio() {
  const Engine = window.AudioContext || window.webkitAudioContext;
  if (!Engine) return null; // very old browser: no sound, nothing breaks
  if (!engine) engine = new Engine();
  if (engine.state === 'suspended') engine.resume();
  return engine;
}

// The engine if sound is allowed right now, otherwise null (e.g. before the first click)
export function readyAudio() {
  return engine && engine.state === 'running' ? engine : null;
}

// A burst of hiss ("white noise": random numbers played as sound), `seconds` long, for
// clicks, taps and swooshes. `fade` is how steeply it dies away: 0 doesn't fade, and
// 3 or 4 makes a short click. Make it once and reuse it.
export function noiseBuffer(ctx, seconds, fade = 0) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, fade);
  return buffer;
}
