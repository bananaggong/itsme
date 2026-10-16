// /vr: the "Dare you to click!" button plays an AI-made sound (assets/vr/button-sound.mp3).
// Clicking again while it plays stops it. The file only downloads on the first click
// (preload="none" on the <audio> element), so it doesn't slow the page down.

const button = document.querySelector('.vr-sound');
const audio = document.querySelector('.vr-audio');

if (button && audio) {
  const showPlaying = playing => button.setAttribute('aria-pressed', String(playing));

  button.addEventListener('click', () => {
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play().catch(() => showPlaying(false));   // e.g. the browser blocked it
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', () => showPlaying(true));
  audio.addEventListener('pause', () => showPlaying(false));
  audio.addEventListener('ended', () => showPlaying(false));
}
