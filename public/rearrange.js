// Rearrange: visitors can drag the homepage tiles into their own order, like editing
// widgets on an iPhone. The "Edit" button under the grid starts edit mode: the tiles
// jiggle, what's inside them stops responding, and any tile can be dragged to a new spot.
// "Done" (or Escape) finishes, and "Reset" puts Sam's order back.
//
// The order is saved in this browser only (localStorage), so each visitor gets their own
// layout and nobody else's changes show up. The small script straight after the grid in
// index.html puts the saved order back on the next visit, before the page is drawn.
//
// While a visitor drags, tiles aren't moved around in the page: each one gets a CSS
// `order` number instead, which the grid lays out by. That way nothing inside a tile is
// interrupted (moving a playing video or audio element in the page would pause it).
//
// Keyboard: in edit mode, Tab to a tile and use the arrow keys to move it.

import { lessMotion, scrollBehavior, writeStorage } from './utils.js?v=8c1091ee90';

const KEY = 'tile-order';
const grid = document.querySelector('.grid');
const editButton = document.querySelector('.ra-edit');
const bar = document.querySelector('.ra-bar');
const status = document.querySelector('.ra-status');

if (grid && editButton && bar) {
  const tiles = [...grid.children];
  const name = tile => tile.className.match(/\btile--([\w-]+)/)?.[1];

  // Sam's order, as written in index.html (the script after the grid numbers each tile)
  const home = [...tiles].sort((a, b) => (a.dataset.home ?? 0) - (b.dataset.home ?? 0));

  // Names read out to screen readers when a tile moves
  const LABELS = {
    intro: 'Intro', avatar: 'Portrait', office: 'Office hours', switcher: 'Where to find me',
    newsletter: 'Newsletter', freeform: 'Freeform', photobooth: 'Photo Booth', photos: 'Photos',
    spotify: 'Spotify', findmy: 'Find My', contact: 'Contact', books: 'Books',
    shortcut: 'Search shortcut', news: 'Featured story',
  };
  const label = tile => LABELS[name(tile)] || name(tile);

  // The order on screen right now (the page loads in the saved order, so start from that)
  let order = [...tiles];
  let editing = false;

  const isHome = () => order.every((tile, i) => tile === home[i]);

  function save() {
    // (if storage is blocked, the order just won't be remembered)
    writeStorage(KEY, isHome() ? null : JSON.stringify(order.map(name)));
    grid.classList.toggle('is-custom', !isHome());
    bar.querySelector('.ra-reset').disabled = isHome();
  }

  // ---------- Moving tiles, with the others sliding out of the way ----------

  // Where a tile is laid out, ignoring any transform (offsetLeft/Top skip transforms)
  const spot = tile => ({ x: tile.offsetLeft, y: tile.offsetTop, w: tile.offsetWidth, h: tile.offsetHeight });

  // The `translate` a tile has right now, part-way through a slide
  function shift(tile) {
    const [x = 0, y = 0] = getComputedStyle(tile).translate.split(' ').map(parseFloat);
    return { x: x || 0, y: y || 0 };
  }

  // "FLIP" animation: note where every tile is (First), change the order so the grid
  // lays them out again (Last), then make each tile start from its old place (Invert)
  // and slide to its new one (Play). `skip` is the tile being dragged, which follows the pointer.
  function reorder(newOrder, skip) {
    const before = new Map();
    for (const tile of tiles) {
      if (tile === skip) continue;
      const s = spot(tile), d = shift(tile);
      before.set(tile, { x: s.x + d.x, y: s.y + d.y });
    }

    order = newOrder;
    order.forEach((tile, i) => { tile.style.order = i; });

    for (const [tile, old] of before) {
      const now = spot(tile);
      const dx = old.x - now.x, dy = old.y - now.y;
      tile.getAnimations().forEach(a => { if (a.id === 'ra-slide') a.cancel(); });
      if (!dx && !dy) continue;
      if (lessMotion()) continue;
      const slide = tile.animate(
        [{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }],
        { duration: 320, easing: 'cubic-bezier(.2, .9, .3, 1)' },
      );
      slide.id = 'ra-slide';
    }
  }

  // Move `tile` so it sits at position `to`
  function moveTo(tile, to, skip) {
    const next = order.filter(t => t !== tile);
    next.splice(to, 0, tile);
    reorder(next, skip);
  }

  // ---------- Edit mode ----------

  function setEditing(on) {
    if (on === editing) return;
    editing = on;
    grid.classList.toggle('is-editing', on);
    document.body.classList.toggle('is-rearranging', on);
    editButton.hidden = on;
    bar.hidden = !on;

    for (const tile of tiles) {
      // Everything inside a tile goes quiet: no clicks, no focus, no dragging notes around
      for (const child of tile.children) child.inert = on;
      if (on) {
        // Tiles jiggle slightly out of step with each other, like iPhone icons
        tile.style.animationDelay = `${-Math.random().toFixed(2)}s`;
        if (!tile.matches('a, button')) tile.tabIndex = 0;
        tile.setAttribute('aria-roledescription', 'movable tile');
        tile.setAttribute('aria-describedby', 'ra-help');
      } else {
        tile.style.animationDelay = '';
        if (!tile.matches('a, button')) tile.removeAttribute('tabindex');
        tile.removeAttribute('aria-roledescription');
        tile.removeAttribute('aria-describedby');
      }
    }

    if (on) {
      bar.querySelector('.ra-done').focus({ preventScroll: true });
      announce('Edit mode. Drag the tiles, or Tab to one and use the arrow keys to move it.');
    } else {
      editButton.focus({ preventScroll: true });
      announce('Layout saved.');
    }
  }

  function announce(text) {
    if (status) status.textContent = text;
  }

  editButton.addEventListener('click', () => setEditing(true));
  bar.querySelector('.ra-done').addEventListener('click', () => setEditing(false));
  bar.querySelector('.ra-reset').addEventListener('click', () => {
    reorder([...home]);
    save();
    announce('Tiles are back in their original order.');
  });

  // In edit mode a tile that's a link or a button mustn't open
  grid.addEventListener('click', e => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('keydown', e => {
    if (!editing) return;
    if (e.key === 'Escape') { setEditing(false); return; }

    const tile = e.target.closest?.('.grid > .tile');
    if (!tile) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return; }  // don't follow the link

    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const to = order.indexOf(tile) + step;
    if (to < 0 || to >= order.length) return;
    moveTo(tile, to);
    save();
    tile.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
    announce(`${label(tile)}, position ${to + 1} of ${order.length}.`);
  });

  // ---------- Dragging ----------
  // A mouse drags straight away. A finger has to rest on a tile for a moment first, so
  // that swiping still scrolls the page.

  const HOLD = 220;      // ms a finger rests before the tile lifts
  const SLOP = 8;        // px a pointer can wander before it counts as a move

  let press = null;      // { tile, id, x, y, timer }
  let drag = null;       // { tile, id, grabX, grabY, x, y, over, lock }
  let scrollLoop = 0;

  grid.addEventListener('pointerdown', e => {
    if (!editing || drag || !e.isPrimary || e.button !== 0) return;
    const tile = e.target.closest('.grid > .tile');
    if (!tile) return;
    press = { tile, id: e.pointerId, x: e.clientX, y: e.clientY };
    if (e.pointerType === 'mouse') e.preventDefault();   // no text selection
    else press.timer = setTimeout(() => lift(e.clientX, e.clientY), HOLD);
  });

  document.addEventListener('pointermove', e => {
    if (drag && e.pointerId === drag.id) { follow(e.clientX, e.clientY); return; }
    if (!press || e.pointerId !== press.id) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP;
    if (!moved) return;
    if (press.timer) { clearTimeout(press.timer); press = null; return; }   // a finger swiped: scroll
    lift(e.clientX, e.clientY);
  });

  // Once a finger has lifted a tile, stop the page scrolling under it.
  // (This has to be a touch listener that isn't "passive", or the browser won't let us.)
  document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
  // A long press would otherwise open the browser's menu for the tile
  grid.addEventListener('contextmenu', e => { if (editing) e.preventDefault(); });

  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);

  function lift(x, y) {
    const { tile, id } = press;
    clearTimeout(press.timer);
    press = null;

    const s = spot(tile), base = base0();
    drag = { tile, id, grabX: x - base.x - s.x, grabY: y - base.y - s.y, x, y, over: null, lock: 0 };
    tile.getAnimations().forEach(a => { if (a.id === 'ra-slide' || a.id === 'ra-drop') a.cancel(); });
    tile.classList.add('is-dragging');
    grid.classList.add('has-drag');
    try { tile.setPointerCapture(id); } catch (err) { /* pointer already gone */ }
    if (navigator.vibrate) navigator.vibrate(10);
    follow(x, y);
    scrollLoop = requestAnimationFrame(autoScroll);
  }

  // Tiles' offsetLeft/Top are measured from their offsetParent: this is where that sits on screen
  function base0() {
    const r = (grid.firstElementChild.offsetParent || document.body).getBoundingClientRect();
    return { x: r.left, y: r.top };
  }

  function follow(x, y) {
    drag.x = x; drag.y = y;
    const { tile } = drag;
    const base = base0();
    const px = x - base.x, py = y - base.y;   // the pointer, in the same terms as offsetLeft/Top

    // Is the pointer over another tile? Then take its place.
    const now = performance.now();
    const over = order.find(t => {
      if (t === tile) return false;
      const s = spot(t);
      return px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h;
    }) || null;
    if (over !== drag.over && now > drag.lock) {
      drag.over = over;
      if (over) {
        moveTo(tile, order.indexOf(over), tile);
        drag.lock = now + 120;   // let the tiles settle before swapping again
      }
    }

    // Keep the tile under the pointer, wherever the grid has put it
    const s = spot(tile);
    tile.style.translate = `${px - drag.grabX - s.x}px ${py - drag.grabY - s.y}px`;
  }

  // Dragging near the top or bottom of the window scrolls the page
  function autoScroll() {
    if (!drag) return;
    const edge = 80, h = innerHeight;
    const speed = drag.y < edge ? -(edge - drag.y) / 4 : drag.y > h - edge ? (drag.y - (h - edge)) / 4 : 0;
    if (speed) { scrollBy(0, speed); follow(drag.x, drag.y); }
    scrollLoop = requestAnimationFrame(autoScroll);
  }

  function end(e) {
    if (press && e.pointerId === press.id) { clearTimeout(press.timer); press = null; }
    if (!drag || e.pointerId !== drag.id) return;
    cancelAnimationFrame(scrollLoop);
    const { tile } = drag;
    drag = null;

    // Glide from under the pointer into its new spot
    const from = tile.style.translate;
    tile.style.translate = '';
    tile.classList.remove('is-dragging');
    grid.classList.remove('has-drag');
    if (!lessMotion() && from) {
      tile.classList.add('is-dropping');
      const drop = tile.animate([{ translate: from, scale: 1.03 }, { translate: '0 0', scale: 1 }],
        { duration: 300, easing: 'cubic-bezier(.2, .9, .3, 1)' });
      drop.id = 'ra-drop';
      drop.finished.then(() => tile.classList.remove('is-dropping'), () => tile.classList.remove('is-dropping'));
    }
    save();
    announce(`${label(tile)}, position ${order.indexOf(tile) + 1} of ${order.length}.`);
  }

  // Start right: the page may have loaded in a saved order
  order.forEach((tile, i) => { tile.style.order = i; });
  save();
}
