// Move the existing nodes so visual, keyboard and screen-reader order agree.
const grid = document.querySelector('.grid[data-mobile-order]');
if (grid) {
  const mobile = matchMedia('(max-width: 640px)');
  const tiles = new Map([...grid.children].map(tile => [tile.dataset.homeTile, tile]));
  function arrange() {
    const order = (mobile.matches ? grid.dataset.mobileOrder : grid.dataset.desktopOrder).split(' ');
    const focused = document.activeElement;
    order.forEach((name, index) => {
      const tile = tiles.get(name);
      const before = grid.children[index] || null;
      if (!tile || tile === before) return;
      // Modern browsers preserve widget state (including playing media).
      if (grid.moveBefore) grid.moveBefore(tile, before);
      else grid.insertBefore(tile, before);
    });
    if (focused !== document.activeElement && focused?.isConnected) focused.focus({ preventScroll: true });
  }
  arrange();
  mobile.addEventListener('change', arrange);
}
