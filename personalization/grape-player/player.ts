import { SONGS } from './songs';

const tile = document.querySelector<HTMLElement>('[data-grape-player]');
if (tile) initialize(tile);

function initialize(tile: HTMLElement) {
  const audio = tile.querySelector<HTMLAudioElement>('audio')!;
  const stage = tile.querySelector<HTMLElement>('.gp-stage')!;
  const canvas = tile.querySelector<HTMLCanvasElement>('canvas')!;
  const play = tile.querySelector<HTMLButtonElement>('[data-gp-play]')!;
  const title = tile.querySelector<HTMLElement>('[data-gp-title]')!;
  const artist = tile.querySelector<HTMLElement>('[data-gp-artist]')!;
  const status = tile.querySelector<HTMLElement>('[data-gp-status]')!;
  const seek = tile.querySelector<HTMLInputElement>('[data-gp-seek]')!;
  const time = tile.querySelector<HTMLElement>('[data-gp-time]')!;
  const placeholder = tile.querySelector<HTMLElement>('[data-gp-placeholder]')!;
  const metadata = tile.querySelector<HTMLElement>('[data-gp-metadata]')!;
  const empty = tile.querySelector<HTMLElement>('[data-gp-empty]')!;
  const timePlaceholder = tile.querySelector<HTMLElement>('[data-gp-time-placeholder]')!;
  let index = 0;
  let request = 0;
  let selected = false;
  let loading = false;
  let disposed = false;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let destroyScene: (() => void) | undefined;
  let sceneStarted = false;

  audio.hidden = true;
  audio.volume = 0.35;
  tile.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[disabled]').forEach(control => control.disabled = false);
  const clock = (n: number) => `${Math.floor(n / 60)}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
  function updateTime() {
    const duration = selected && Number.isFinite(audio.duration) ? audio.duration : 0;
    const currentTime = selected ? audio.currentTime : 0;
    seek.max = String(duration || 1);
    seek.value = String(currentTime);
    seek.disabled = duration === 0;
    seek.setAttribute('aria-valuetext', selected ? `${clock(currentTime)} / ${clock(duration)}` : '선택한 곡 없음');
    time.hidden = !selected;
    timePlaceholder.hidden = selected;
    time.textContent = selected ? `${clock(currentTime)} / ${clock(duration)}` : '';
  }
  function render() {
    const playing = selected && !audio.paused;
    tile.dataset.playing = String(playing);
    tile.dataset.track = selected ? String(index) : '';
    tile.dataset.loading = String(loading);
    tile.dataset.selection = selected ? 'selected' : 'idle';
    metadata.hidden = !selected;
    empty.hidden = selected;
    metadata.setAttribute('aria-busy', String(loading));
    title.textContent = selected ? SONGS[index].title : '';
    artist.textContent = selected ? SONGS[index].artist : '';
    play.setAttribute('aria-label', playing ? '일시정지' : '재생');
    play.setAttribute('aria-pressed', String(playing));
    play.textContent = playing ? 'Ⅱ' : '▶';
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
    status.textContent = `${SONGS[index].artist} · ${SONGS[index].title} 불러오는 중`;
    render();
    try {
      await audio.play();
      if (ticket !== request || disposed) return;
      loading = false;
      status.textContent = `${SONGS[index].artist} · ${SONGS[index].title} 재생 중`;
      render();
      document.dispatchEvent(new CustomEvent('itsme:music-played'));
    } catch {
      if (ticket !== request || disposed) return;
      stop('재생하지 못했습니다. 재생 버튼을 눌러 다시 시도해 주세요.');
    }
  }
  function pause() {
    ++request;
    audio.pause();
    loading = false;
    status.textContent = '일시정지 · 재생 버튼을 누르면 이어집니다.';
    render();
  }
  function stop(message: string) {
    ++request;
    selected = false;
    loading = false;
    audio.pause();
    audio.currentTime = 0;
    status.textContent = message;
    render();
  }
  function selectGrape(next: number) {
    if (selected && next === index) stop('재생 종료 · 다른 포도알을 골라보세요.');
    else void start(next);
  }
  function toggle(next = index) {
    if (next === index && (!audio.paused || loading)) pause();
    else void start(next);
  }
  play.addEventListener('click', () => toggle());
  tile.querySelector('[data-gp-prev]')!.addEventListener('click', () => void start((index + SONGS.length - 1) % SONGS.length));
  tile.querySelector('[data-gp-next]')!.addEventListener('click', () => void start((index + 1) % SONGS.length));
  seek.addEventListener('input', () => { audio.currentTime = Number(seek.value); updateTime(); });
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange']) audio.addEventListener(event, updateTime);
  audio.addEventListener('pause', render);
  audio.addEventListener('playing', () => { loading = false; render(); });
  audio.addEventListener('ended', () => {
    if (disposed || !selected || !audio.ended) return;
    void start((index + 1) % SONGS.length);
  });
  audio.addEventListener('error', () => {
    if (audio.error) stop('음원을 불러오지 못했습니다. 다시 재생해 주세요.');
  });
  function showSceneFallback() {
    tile.dataset.scene = 'fallback';
    placeholder.textContent = '아래 재생 버튼으로 음악을 들어보세요';
    tile.querySelector<HTMLElement>('.gp-hint')!.textContent = '이전·다음 버튼으로 곡을 바꿀 수 있어요';
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    destroyScene?.();
    destroyScene = undefined;
    showSceneFallback();
  });
  async function loadScene() {
    if (sceneStarted || disposed) return;
    sceneStarted = true;
    try {
      const { mountGrapeScene } = await import('./scene');
      if (disposed) return;
      destroyScene = mountGrapeScene({
        container: stage, canvas, onSelect: selectGrape,
        getActiveIndex: () => selected ? index : null,
        getAnalyser: () => analyser,
        onFirstRender: () => { tile.dataset.scene = 'ready'; },
      });
    } catch {
      showSceneFallback();
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
