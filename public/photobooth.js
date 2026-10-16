// Photo Booth: a pretend macOS Photo Booth, opened from its tile on the homepage.
// It asks the browser for the camera, then redraws each camera frame onto a
// <canvas>, running it through the chosen effect first. Everything happens on the
// visitor's device: nothing is recorded or sent anywhere. Closing the window
// switches the camera off.

import { wait } from './utils.js?v=8c1091ee90';

const win = document.querySelector('.pb-window');

if (win) {
  const video = win.querySelector('.pb-video');
  const canvas = win.querySelector('.pb-canvas');
  const ctx = canvas.getContext('2d');
  const grid = win.querySelector('.pb-grid');
  const effectName = win.querySelector('.pb-effect-name');
  const message = win.querySelector('.pb-message');
  const messageTitle = win.querySelector('.pb-message-title');
  const messageBody = win.querySelector('.pb-message-body');
  const retry = win.querySelector('.pb-retry');
  const flash = win.querySelector('.pb-flash');
  const shutter = win.querySelector('.pb-shutter');
  const countdown = win.querySelector('.pb-countdown');
  const effectsButton = win.querySelector('.pb-effects-button');
  const tray = win.querySelector('.pb-tray');

  const MAX_PHOTOS = 8;
  const phone = window.matchMedia('(max-width: 640px)');

  // Thermal Camera colours, from cold (dark) to hot (bright): a "lookup table"
  // of 256 colours, one for every brightness level a pixel can have.
  const THERMAL = buildPalette([
    [0, [10, 6, 60]],       // navy
    [0.25, [70, 20, 170]],  // indigo
    [0.45, [190, 30, 150]], // magenta
    [0.62, [240, 50, 40]],  // red
    [0.78, [255, 150, 0]],  // orange
    [0.92, [255, 235, 40]], // yellow
    [1, [255, 255, 235]],   // white hot
  ]);

  // X-Ray colours: the same idea, but back to front, so bright things turn dark
  // and shadows glow, with a cold blue tint like a hospital scan
  const XRAY = buildPalette([
    [0, [235, 245, 255]],   // shadows become bright
    [0.45, [110, 140, 180]],
    [1, [4, 8, 20]],        // highlights become near-black
  ]);

  // Pop Art: four copies of the picture, like Andy Warhol's Marilyn prints. Each copy
  // gets three flat colours: one for shadows, one for mid-tones, one for highlights.
  const POP_ART = [
    [[25, 20, 120], [235, 40, 125], [255, 230, 60]],  // navy, pink, yellow
    [[110, 0, 40], [255, 120, 0], [130, 230, 255]],   // maroon, orange, sky
    [[0, 70, 60], [60, 200, 120], [255, 170, 205]],   // teal, green, candy
    [[60, 0, 100], [0, 170, 230], [255, 240, 120]],   // purple, cyan, lemon
  ];

  // The effects to choose from. Each one draws the current camera frame into a canvas.
  const EFFECTS = [
    { name: 'Normal', draw: drawCamera },
    { name: 'Thermal Camera', draw: target => recolour(target, THERMAL, 5) },
    { name: 'X-Ray', draw: target => recolour(target, XRAY, 2) },
    { name: 'Pop Art', draw: drawPopArt },
  ];

  let stream = null;
  let attempt = 0;         // counts camera requests, so a late answer to an old one is ignored
  let frame = null;        // the id of the next scheduled redraw, so it can be cancelled
  let drawnTime = -1;      // the camera frame last drawn (webcams send fewer frames than screens show)
  let effect = EFFECTS[1]; // open straight into the fun one
  let photoCount = 0;
  let counting = false;

  // Effects work on a smaller copy of the picture: fewer pixels to change is faster,
  // and stretching it back up softens it (the blurry look of a real heat camera).
  // These off-screen canvases are made once per size and reused every frame.
  const workCanvases = new Map();
  function workCanvas(w, h) {
    const key = `${w}x${h}`;
    if (!workCanvases.has(key)) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      workCanvases.set(key, c.getContext('2d', { willReadFrequently: true }));
    }
    return workCanvases.get(key);
  }

  // One live preview per effect for the Effects grid
  const previews = EFFECTS.map(fx => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pb-grid-cell';
    const preview = document.createElement('canvas');
    const label = document.createElement('span');
    label.textContent = fx.name;
    button.append(preview, label);
    button.addEventListener('click', () => { effect = fx; toggleGrid(false); });
    grid.append(button);
    return { fx, button, ctx: preview.getContext('2d') };
  });

  // ---------- Opening and closing ----------

  document.querySelectorAll('.pb-launch').forEach(el => el.addEventListener('click', open));
  retry.addEventListener('click', startCamera);
  win.addEventListener('close', stopCamera);
  // Clicking the dimmed page around the window closes it, like clicking away from a sheet
  win.addEventListener('click', event => { if (event.target === win) win.close(); });

  function open() {
    if (win.open) return;
    win.showModal();
    startCamera();
  }

  async function startCamera() {
    const thisAttempt = ++attempt;
    showMessage('Waiting for your camera…',
      'Allow camera access in your browser’s prompt. Nothing is recorded or uploaded.');

    // Older browsers, or a page not served over https, have no camera access at all
    if (!navigator.mediaDevices?.getUserMedia) {
      showMessage('No camera here', 'This browser can’t share a camera with web pages.');
      return;
    }

    let camera;
    try {
      camera = await askForCamera(thisAttempt);
    } catch (error) {
      if (thisAttempt !== attempt) return; // the window was closed (or reopened) meanwhile
      if (error.name === 'NotAllowedError') {
        showMessage('Camera access is off',
          'Photo Booth needs your camera to work. Allow it for this site in your browser’s settings, then try again.', true);
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        showMessage('No camera found', 'Plug in or switch on a camera, then try again.', true);
      } else {
        showMessage('The camera didn’t start', 'Another app might be using it. Close that app, then try again.', true);
      }
      return;
    }

    // While the prompt was up the visitor may have closed the window, or closed and
    // reopened it (which asked again). Either way this camera isn't wanted: switch it off.
    if (thisAttempt !== attempt || !win.open) {
      camera.getTracks().forEach(track => track.stop());
      return;
    }

    stream = camera;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Usually the window closing interrupted it (stopCamera has tidied up); otherwise say so
      if (thisAttempt === attempt) {
        stopCamera(); // switch it off before offering Try again, which asks for a fresh one
        showMessage('The camera didn’t start', 'Something interrupted it. Try again.', true);
      }
      return;
    }
    message.hidden = true;
    shutter.disabled = false;
    effectsButton.disabled = false;
    sizeCanvases();
    toggleGrid(false);
    render();
  }

  // A camera that's busy or slow to wake up (just switched off, or on a busy computer) can fail
  // once with NotReadableError or AbortError ("Timeout starting video source") and then work a
  // moment later. So those get one quiet second try before Photo Booth shows an error.
  async function askForCamera(thisAttempt) {
    // This is what makes the browser ask "Allow samdickie.me to use your camera?".
    // `await` pauses until the visitor answers.
    const ask = () => navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    try {
      return await ask();
    } catch (error) {
      if (error.name !== 'NotReadableError' && error.name !== 'AbortError') throw error;
      await wait(700);
      if (thisAttempt !== attempt || !win.open) throw error;   // closed meanwhile: don't ask again
      return ask();
    }
  }

  function stopCamera() {
    attempt++; // any camera request still waiting for an answer is now out of date
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach(track => track.stop()); // turns the camera light off
    stream = null;
    video.srcObject = null;
    shutter.disabled = true;
    effectsButton.disabled = true;
    toggleGrid(false);
  }

  function showMessage(title, body, canRetry = false) {
    messageTitle.textContent = title;
    messageBody.textContent = body;
    retry.hidden = !canRetry;
    message.hidden = false;
  }

  // ---------- Drawing ----------

  // Landscape on computers, portrait on phones (matches the window's shape in home.css)
  function sizeCanvases() {
    const [w, h] = phone.matches ? [720, 960] : [960, 720];
    canvas.width = w; canvas.height = h;
    previews.forEach(p => { p.ctx.canvas.width = w / 2; p.ctx.canvas.height = h / 2; });
    drawnTime = -1; // resizing a canvas wipes it, so redraw straight away
  }
  phone.addEventListener('change', sizeCanvases);

  // Runs every time the screen refreshes while the window is open, but only redraws
  // when the camera has sent a new picture (about 30 a second), to save battery
  function render() {
    if (video.currentTime !== drawnTime) {
      drawnTime = video.currentTime;
      if (grid.hidden) {
        effect.draw(ctx);
      } else {
        previews.forEach(p => p.fx.draw(p.ctx));
      }
    }
    frame = requestAnimationFrame(render);
  }

  // Draws the camera mirrored (like looking in a mirror, as Photo Booth does), cropped
  // to fill the canvas the way `object-fit: cover` fills a box with an image.
  function drawCamera(target) {
    const { width: w, height: h } = target.canvas;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    const scale = Math.max(w / vw, h / vh);
    const sw = w / scale, sh = h / scale;
    target.save();
    target.translate(w, 0);
    target.scale(-1, 1);
    target.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
    target.restore();
  }

  // Thermal Camera and X-Ray: swap every pixel's brightness for a colour from a palette.
  // `shrink` is how much smaller the working copy is: 5× for a soft heat-camera blur,
  // 2× for X-Ray, which should stay fairly sharp.
  function recolour(target, palette, shrink) {
    const { width: w, height: h } = target.canvas;
    const work = workCanvas(Math.round(w / shrink), Math.round(h / shrink));
    drawCamera(work);
    const image = work.getImageData(0, 0, work.canvas.width, work.canvas.height);
    const px = image.data; // every pixel as 4 numbers in a row: red, green, blue, opacity
    for (let i = 0; i < px.length; i += 4) {
      const colour = brightness(px, i) * 3;
      px[i] = palette[colour];
      px[i + 1] = palette[colour + 1];
      px[i + 2] = palette[colour + 2];
    }
    work.putImageData(image, 0, 0);
    target.imageSmoothingQuality = 'high';
    target.drawImage(work.canvas, 0, 0, w, h);
  }

  // Pop Art: sort each pixel into shadow, mid-tone or highlight, then paint the four
  // copies in their own three colours. The cut-offs follow the picture's average
  // brightness, so it still works in a dim room.
  function drawPopArt(target) {
    const { width: w, height: h } = target.canvas;
    const work = workCanvas(Math.round(w / 3), Math.round(h / 3));
    drawCamera(work);
    const image = work.getImageData(0, 0, work.canvas.width, work.canvas.height);
    const px = image.data;

    const tones = new Uint8Array(px.length / 4); // 0 = shadow, 1 = mid-tone, 2 = highlight
    let total = 0;
    for (let i = 0; i < px.length; i += 4) total += brightness(px, i);
    const average = total / tones.length;
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      const b = brightness(px, i);
      tones[p] = b < average - 30 ? 0 : b < average + 30 ? 1 : 2;
    }

    POP_ART.forEach((colours, n) => {
      for (let i = 0, p = 0; i < px.length; i += 4, p++) {
        const [r, g, b] = colours[tones[p]];
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
      }
      work.putImageData(image, 0, 0);
      // Top left, top right, bottom left, bottom right
      target.drawImage(work.canvas, (n % 2) * w / 2, Math.floor(n / 2) * h / 2, w / 2, h / 2);
    });
  }

  // How bright a pixel looks, 0–255. Green counts most because our eyes are most
  // sensitive to it.
  function brightness(px, i) {
    return (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;
  }

  // Blends between the colour stops to make 256 colours, stored as [r, g, b, r, g, b, …]
  function buildPalette(stops) {
    const palette = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const next = stops.findIndex(([at]) => at >= t);
      const [a, from] = stops[Math.max(next - 1, 0)];
      const [b, to] = stops[next];
      const mix = b === a ? 0 : (t - a) / (b - a);
      for (let c = 0; c < 3; c++) palette[i * 3 + c] = from[c] + (to[c] - from[c]) * mix;
    }
    return palette;
  }

  // ---------- Effects grid ----------

  effectsButton.addEventListener('click', () => toggleGrid(grid.hidden));

  function toggleGrid(show) {
    drawnTime = -1; // redraw straight away in the new view
    grid.hidden = !show;
    effectsButton.setAttribute('aria-pressed', show);
    previews.forEach(p => p.button.classList.toggle('is-active', p.fx === effect));
    // Name the chosen effect under the picture (not needed for Normal)
    effectName.textContent = effect.name;
    effectName.hidden = show || effect === EFFECTS[0];
  }

  // ---------- Taking a photo: 3, 2, 1, flash ----------

  shutter.addEventListener('click', async () => {
    if (counting) return;
    counting = true;
    toggleGrid(false);
    shutter.hidden = true;
    countdown.hidden = false;
    const numbers = [...countdown.children];
    for (const number of numbers) {
      numbers.forEach(n => n.classList.toggle('is-lit', n === number));
      await wait(1000);
      if (!stream) break; // the window was closed mid-countdown
    }
    if (stream) takePhoto();
    countdown.hidden = true;
    shutter.hidden = false;
    counting = false;
  });

  function takePhoto() {
    flash.classList.remove('is-flashing');
    void flash.offsetWidth; // restarts the flash animation, even if it ran a moment ago
    flash.classList.add('is-flashing');

    canvas.toBlob(blob => {
      photoCount++;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.className = 'pb-photo';
      link.href = url;
      link.download = `photo-booth-${photoCount}.jpg`;
      link.setAttribute('aria-label', `Save photo ${photoCount}`);
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      link.append(img);
      tray.querySelector('.pb-tray-empty')?.remove();
      tray.prepend(link);

      // Keep the tray tidy: drop the oldest photo and free its memory
      const photos = tray.querySelectorAll('.pb-photo');
      if (photos.length > MAX_PHOTOS) {
        const oldest = photos[photos.length - 1];
        URL.revokeObjectURL(oldest.href);
        oldest.remove();
      }
    }, 'image/jpeg', 0.9);
  }
}
