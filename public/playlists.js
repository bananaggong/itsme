// Spotify playlists tile: clicking a row in the list shows that playlist
// in the big "hero" area above it and in the mini player bar.
// Each row's title and cover are read from the row itself; the extra details
// (song count, glow colour, Spotify link) live in its data-* attributes.

const tile = document.querySelector('.tile--spotify');

if (tile) {
  const rows = [...tile.querySelectorAll('.sp-row')];
  const cover = tile.querySelector('.sp-cover');
  const title = tile.querySelector('.sp-title');
  const detail = tile.querySelector('.sp-detail');
  const play = tile.querySelector('.sp-play');
  const links = tile.querySelectorAll('.sp-play, .sp-open');
  const playerCover = tile.querySelector('.sp-player-cover');
  const playerTitle = tile.querySelector('.sp-player-title');
  let swapTimer = null;

  function select(row, { animate = true } = {}) {
    const name = row.querySelector('.sp-name-title').textContent;
    const coverSrc = row.querySelector('img').getAttribute('src');
    const { detail: detailText, color, url } = row.dataset;

    rows.forEach(r => {
      r.classList.toggle('is-active', r === row);
      r.setAttribute('aria-pressed', r === row);
    });

    // Fade the big cover out, swap it, fade it back in
    clearTimeout(swapTimer);
    if (animate) {
      cover.classList.add('is-swapping');
      swapTimer = setTimeout(() => {
        cover.src = coverSrc;
        cover.classList.remove('is-swapping');
      }, 150);
    } else {
      cover.src = coverSrc;
    }

    title.textContent = name;
    detail.textContent = detailText;
    playerCover.src = coverSrc;
    playerTitle.textContent = name;
    links.forEach(a => (a.href = url));
    play.setAttribute('aria-label', `Play ${name} on Spotify`);
    tile.style.setProperty('--sp-color', color); // the background glow takes on the playlist's colour
  }

  rows.forEach(row => row.addEventListener('click', () => select(row)));

  // Make sure the hero matches whichever row is marked active in the HTML
  select(tile.querySelector('.sp-row.is-active') || rows[0], { animate: false });
}
