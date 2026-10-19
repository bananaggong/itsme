import { unlockAudio } from '../audio.js?v=8f596f00be';
import { lessMotion, wait } from '../utils.js?v=8c1091ee90';

const tile = document.querySelector('.tile--avatar[data-portrait-mode]');
if (tile) setup(tile);

function setup(tile) {
  const button = tile.querySelector('.siri-button');
  const label = tile.querySelector('.siri-label');
  const bar = tile.querySelector('.siri-bar');
  const text = tile.querySelector('.siri-text');
  const status = tile.querySelector('.siri-status');
  const profile = tile.querySelector('.avatar-profile');
  const slides = [...tile.querySelectorAll('.portrait-slide')];
  const controls = tile.querySelector('.portrait-controls');
  const dots = [...controls.querySelectorAll('[data-photo-index]')];
  let current = 0;
  let busy = false;
  const pause = ms => wait(lessMotion() ? Math.min(ms, 120) : ms);

  async function loadPhoto(index) {
    const image = slides[index].querySelector('img');
    if (!image.src) image.src = image.dataset.src;
    // Bound slow/failed image loads, keeping the current photo visible on failure.
    let timeout;
    try {
      await Promise.race([
        image.decode(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Photo timeout')), 10000); }),
      ]);
      if (!image.naturalWidth) throw new Error('Photo unavailable');
    } catch (error) {
      image.removeAttribute('src'); // allow a subsequent press to retry
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function setBusy(value) {
    busy = value;
    // aria-disabled retains focus during the scene; the handler ignores repeats.
    button.setAttribute('aria-disabled', String(value));
    controls.querySelectorAll('button').forEach(control => { control.setAttribute('aria-disabled', String(value)); });
  }

  function showPhoto(index) {
    current = index;
    slides.forEach((slide, i) => {
      const visible = tile.dataset.portraitMode === 'daily' && i === index;
      slide.classList.toggle('is-current', visible);
      slide.setAttribute('aria-hidden', String(!visible));
      dots[i].setAttribute('aria-pressed', String(i === index));
    });
  }

  function settle(mode) {
    const daily = mode === 'daily';
    tile.dataset.portraitMode = mode;
    profile.setAttribute('aria-hidden', String(daily));
    controls.hidden = !daily;
    label.textContent = daily ? '프로필로 돌아가기' : '일상 모습';
    button.setAttribute('aria-label', label.textContent);
    button.setAttribute('aria-pressed', String(daily));
    showPhoto(current);
  }

  button.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    const daily = tile.dataset.portraitMode !== 'daily';
    const pending = daily ? loadPhoto(current).then(() => true, () => false) : Promise.resolve(true);
    tile.classList.add('was-used', 'is-busy', 'is-asking');
    tile.classList.remove('is-hinting');
    status.textContent = '';
    status.classList.remove('has-error');
    try {
      chime();
      await pause(300);
      const prompt = daily ? '더 일상적인 모습을 보여줘' : '프로필로 돌아가기';
      bar.classList.add('has-text');
      if (lessMotion()) text.textContent = prompt;
      else for (const letter of prompt) { text.textContent += letter; await pause(65); }
      await wait(650); // reading time is the same with reduced motion
      bar.classList.add('is-sent');
      await pause(200);
      tile.classList.add('is-making');
      const available = await pending;
      if (!available) throw new Error('Photo unavailable');
      tile.classList.remove('is-asking');
      await pause(250);
      settle(daily ? 'daily' : 'profile');
      await pause(400);
      status.textContent = daily ? `일상 사진 ${current + 1}, 총 ${slides.length}장. 아래 버튼으로 다른 사진을 볼 수 있습니다.` : '프로필 사진으로 돌아왔습니다.';
      if (daily) {
        // Fetch the remaining photos only after the visitor opens the gallery.
        slides.forEach((_, i) => { if (i !== current) loadPhoto(i).catch(() => {}); });
      }
    } catch {
      status.textContent = '사진을 불러오지 못했습니다. 잠시 후 다시 눌러주세요.';
      status.classList.add('has-error');
    } finally {
      tile.classList.remove('is-busy', 'is-asking', 'is-making');
      bar.classList.remove('has-text', 'is-sent');
      text.textContent = '';
      setBusy(false);
    }
  });

  async function selectPhoto(index) {
    if (busy || tile.dataset.portraitMode !== 'daily' || index === current) return;
    setBusy(true);
    status.classList.remove('has-error');
    try {
      await loadPhoto(index);
      showPhoto(index);
      status.textContent = `일상 사진 ${index + 1}, 총 ${slides.length}장.`;
    } catch {
      status.textContent = '사진을 불러오지 못했습니다. 잠시 후 다시 눌러주세요.';
      status.classList.add('has-error');
    } finally { setBusy(false); }
  }
  controls.querySelector('.portrait-prev').addEventListener('click', () => selectPhoto((current + slides.length - 1) % slides.length));
  controls.querySelector('.portrait-next').addEventListener('click', () => selectPhoto((current + 1) % slides.length));
  dots.forEach((dot, index) => dot.addEventListener('click', () => selectPhoto(index)));
  controls.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : slides.length - 1)) % slides.length;
    selectPhoto(index);
  });
  settle('profile');
  // Preserve the orb's off-screen pause and reveal its label once on touchscreens.
  let hinted = false;
  const observer = new IntersectionObserver(([entry]) => {
    tile.classList.toggle('is-away', !entry.isIntersecting);
    if (!hinted && entry.intersectionRatio >= .6) {
      hinted = true;
      tile.classList.add('is-hinting');
      setTimeout(() => tile.classList.remove('is-hinting'), 3000);
    }
  }, { threshold: [0, .6] });
  observer.observe(tile);
  setBusy(false);
  button.disabled = false;
}

// Keep the existing Siri audio setting and short two-note cue.
function chime() {
  const ctx = unlockAudio();
  if (!ctx) return;
  for (const [pitch, delay] of [[523.25, 0], [783.99, .1]]) {
    const start = ctx.currentTime + delay;
    const tone = ctx.createOscillator();
    const gain = ctx.createGain();
    tone.frequency.value = pitch;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.1, start + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .4);
    tone.connect(gain).connect(ctx.destination);
    tone.start(start); tone.stop(start + .45);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
}
