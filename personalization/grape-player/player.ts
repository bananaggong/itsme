import { SONGS } from './songs';

const tile = document.querySelector<HTMLElement>('[data-grape-player]');
if (tile) initialize(tile);

function initialize(tile: HTMLElement) {
  const audio = tile.querySelector<HTMLAudioElement>('audio')!;
  const stage = tile.querySelector<HTMLElement>('.gp-stage')!;
  const canvas = tile.querySelector<HTMLCanvasElement>('canvas')!;
  const list = tile.querySelector<HTMLOListElement>('.gp-list')!;
  const rows = [...list.querySelectorAll<HTMLButtonElement>('[data-gp-song]')];
  const play = tile.querySelector<HTMLButtonElement>('[data-gp-play]')!;
  const titles = tile.querySelectorAll<HTMLElement>('[data-gp-title]');
  const artists = tile.querySelectorAll<HTMLElement>('[data-gp-artist]');
  const status = tile.querySelector<HTMLElement>('[data-gp-status]')!;
  const errorMessage = tile.querySelector<HTMLElement>('[data-gp-error]')!;
  const seek = tile.querySelector<HTMLInputElement>('[data-gp-seek]')!;
  const time = tile.querySelector<HTMLElement>('[data-gp-time]')!;
  let index = 0;
  let request = 0;
  let selected = false;
  let loading = false;
  let disposed = false;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let destroyScene: (() => void) | undefined;
  let sceneStarted = false;
  let renderedIndex = 0;

  audio.hidden = true;
  audio.volume = 0.35;
  tile.querySelectorAll<HTMLButtonElement>('[disabled]').forEach(control => control.disabled = false);
  const clock = (n: number) => `${Math.floor(n / 60)}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
  function announce(message: string, error = false) {
    status.textContent = error ? '' : message;
    errorMessage.hidden = !error;
    errorMessage.textContent = error ? message : '';
  }
  function updateTime() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.max = String(duration || 1);
    seek.value = String(audio.currentTime);
    seek.disabled = duration === 0;
    seek.setAttribute('aria-valuetext', `${clock(audio.currentTime)} / ${clock(duration || 12)}`);
    time.textContent = `${clock(audio.currentTime)} / ${clock(duration || 12)}`;
    tile.style.setProperty('--gp-progress', `${duration ? audio.currentTime / duration * 100 : 0}%`);
  }
  function render() {
    const playing = !audio.paused;
    tile.dataset.playing = String(playing);
    tile.dataset.track = String(index);
    tile.dataset.loading = String(loading);
    titles.forEach(title => { title.textContent = SONGS[index].title; });
    artists.forEach(artist => { artist.textContent = SONGS[index].artist; });
    tile.querySelector<HTMLElement>('[data-gp-cover]')!.style.setProperty('--cover-hue', `${index*2-16}deg`);
    rows.forEach((row, i) => {
      row.classList.toggle('is-active', i === index);
      row.setAttribute('aria-pressed', String(i === index));
      row.setAttribute('aria-label', `${SONGS[i].artist} — ${SONGS[i].title} ${i === index && playing ? '일시정지' : '재생'}`);
    });
    if (renderedIndex !== index) {
      const row = rows[index].getBoundingClientRect();
      const bounds = list.getBoundingClientRect();
      if (row.top < bounds.top || row.bottom > bounds.bottom) list.scrollTop += row.top - bounds.top - (list.clientHeight - row.height) / 2;
      renderedIndex = index;
    }
    play.setAttribute('aria-label', playing ? '일시정지' : '재생');
    play.setAttribute('aria-pressed', String(playing));
    updateTime();
  }
  function connectAnalyser() {
    if (ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AudioContextClass();
      analyser = ctx!.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      ctx!.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx!.destination);
    } catch {
      // Native media playback remains available without Web Audio support.
      analyser = null;
    }
  }
  async function start(next: number) {
    if (disposed) return;
    const ticket = ++request;
    connectAnalyser();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
    if (index !== next || !audio.getAttribute('src') || audio.error) {
      audio.pause();
      index = next;
      audio.src = SONGS[index].audioSrc;
      audio.load();
    }
    selected = true;
    loading = true;
    announce(`${SONGS[index].artist} · ${SONGS[index].title} 불러오는 중`);
    render();
    try {
      await audio.play();
      if (ticket !== request || disposed) return;
      loading = false;
      announce(`${SONGS[index].artist} · ${SONGS[index].title} 재생 중`);
      render();
    } catch {
      if (ticket !== request || disposed) return;
      loading = false;
      selected = false;
      announce('재생하지 못했습니다. 재생 버튼을 눌러 다시 시도해 주세요.', true);
      render();
    }
  }
  function pause() {
    ++request;
    audio.pause();
    loading = false;
    announce('일시정지');
    render();
  }
  function toggle(next = index) {
    if (next === index && (!audio.paused || loading)) pause();
    else void start(next);
  }
  play.addEventListener('click', () => toggle());
  for (const row of rows) row.addEventListener('click', () => toggle(Number(row.dataset.gpSong)));
  list.addEventListener('keydown', event => {
    const row = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-gp-song]');
    if (!row || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(row.dataset.gpSong);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows[next].focus({preventScroll: true});
    list.scrollTop = rows[next].offsetTop - list.offsetTop - (list.clientHeight - rows[next].offsetHeight) / 2;
  });
  tile.querySelector('[data-gp-prev]')!.addEventListener('click', () => void start((index + SONGS.length - 1) % SONGS.length));
  tile.querySelector('[data-gp-next]')!.addEventListener('click', () => void start((index + 1) % SONGS.length));
  seek.addEventListener('input', () => { audio.currentTime = Number(seek.value); updateTime(); });
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange']) audio.addEventListener(event, updateTime);
  audio.addEventListener('pause', render);
  audio.addEventListener('playing', () => { loading = false; render(); });
  audio.addEventListener('ended', () => {
    selected = false;
    announce('재생 완료');
    render();
  });
  audio.addEventListener('error', () => {
    selected = false;
    loading = false;
    announce('음원을 불러오지 못했습니다. 다시 재생해 주세요.', true);
    render();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    destroyScene?.();
    destroyScene = undefined;
    tile.dataset.scene = 'fallback';
    tile.querySelector<HTMLElement>('.gp-hint')!.textContent = '목록에서 골라 재생';
  });
  async function loadScene() {
    if (sceneStarted || disposed) return;
    sceneStarted = true;
    try {
      const { mountGrapeScene } = await import('./scene');
      if (disposed) return;
      destroyScene = mountGrapeScene({
        container: stage, canvas, onSelect: toggle,
        getActiveIndex: () => selected ? index : null,
        getAnalyser: () => analyser,
        onIntroReady: () => { tile.dataset.scene = 'ready'; },
      });
    } catch {
      tile.dataset.scene = 'fallback';
      tile.querySelector<HTMLElement>('.gp-hint')!.textContent = '목록에서 골라 재생';
    }
  }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      void loadScene();
    }
  }, { rootMargin: '240px' });
  observer.observe(tile);
  function dispose() {
    if (disposed) return;
    disposed = true;
    ++request;
    observer.disconnect();
    destroyScene?.();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    void ctx?.close();
  }
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); else pause(); });
  render();
}
