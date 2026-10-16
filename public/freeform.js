// Freeform tile: a pretend Apple Freeform board on the homepage, showing Sam's product
// career on a timeline. Visitors can move around, zoom, drag things, add notes and draw.
// Everything on it lives in `state`: a list of items (notes, text, shapes, photos,
// phones), the connector lines between them, and pen strokes. The "camera" (cam) is
// where you're looking and how far you're zoomed in; moving or zooming only changes
// one CSS transform on .ff-world. Changes are saved in the visitor's own browser
// (localStorage) and never sent anywhere. The expand button makes the tile 2×2.
//
// What's on the board when a visitor first sees it (Sam's career) is in freeform-board.js.

import { DEFAULT, LOGOS, SAVE_KEY, START_EXPANDED, START_SMALL } from './freeform-board.js?v=7a2397594a';
import { lessMotion, readJSON, scrollBehavior, writeStorage } from './utils.js?v=8c1091ee90';

const tile = document.querySelector('.tile--freeform');

if (tile) {
  // Building the board creates dozens of editable elements and SVG paths. On phones this
  // tile is several screens below the opening content, so wait until it is getting close
  // before doing that work. The generous margin keeps it ready before a normal scroll reaches it.
  if (!('IntersectionObserver' in window)) {
    initFreeform(tile);
  } else {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      initFreeform(tile);
    }, { rootMargin: '600px 0px' });
    observer.observe(tile);
  }
}

function initFreeform(tile) {
  const KINDS = ['note', 'text', 'shape', 'image', 'role', 'bar'];   // the kinds of item a board can hold

  const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];
  const SHAPE_COLORS = ['blue', 'green', 'yellow', 'orange', 'pink', 'purple'];
  const PEN_COLORS = ['ink', 'blue', 'red', 'green', 'orange'];
  const COLOR_NAMES = { yellow: 'Yellow', green: 'Green', blue: 'Blue', pink: 'Pink', purple: 'Purple', orange: 'Orange', ink: 'Black', red: 'Red' };

  const SHAPES = {
    square: 'M12 2h76a10 10 0 0 1 10 10v76a10 10 0 0 1-10 10H12A10 10 0 0 1 2 88V12A10 10 0 0 1 12 2z',
    circle: 'M50 2a48 48 0 1 1 0 96a48 48 0 1 1 0-96z',
    triangle: 'M50 5 97 93H3z',
    star: starPath(),
    bubble: 'M14 6h72a10 10 0 0 1 10 10v48a10 10 0 0 1-10 10H44L24 94l4-20H14A10 10 0 0 1 4 64V16A10 10 0 0 1 14 6z',
  };
  const SHAPE_NAMES = { square: 'Square', circle: 'Circle', triangle: 'Triangle', star: 'Star', bubble: 'Speech bubble' };

  function starPath() {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 21 : 49;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (53 + r * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }

  // ---------- Elements ----------
  const $ = (s, r = tile) => r.querySelector(s);
  const win = tile;
  const grid = tile.closest('.grid');
  const vp = $('.ff-viewport');
  const world = $('.ff-world');
  const itemsEl = $('.ff-items');
  const linksG = $('.ff-links-g');
  const strokesG = $('.ff-strokes-g');
  const ctx = $('.ff-ctx');
  const penbar = $('.ff-penbar');
  const toastEl = $('.ff-toast');
  const zoomValue = $('.ff-zoom-value');
  const shapesPop = $('#ff-shapes');
  const resetPop = $('#ff-reset');
  const fileInput = $('#ff-file');
  const undoBtn = $('[data-act="undo"]');
  const redoBtn = $('[data-act="redo"]');
  const penBtn = $('[data-add="pen"]');

  // ---------- State + history ----------
  const clone = o => JSON.parse(JSON.stringify(o));
  let state = load() || clone(DEFAULT);
  let hist = [JSON.stringify(state)];
  let hIdx = 0;
  let selected = null;
  let editing = null;
  let tool = 'select';
  let penColor = 'ink';
  let gesture = null;
  let lastTap = null;
  let saveWarned = false;
  const cam = { x: 0, y: 0, z: 1 };
  let lastSize = [0, 0];   // the canvas size the camera was last set for
  const byId = id => state.items.find(i => i.id === id);
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // The visitor's saved board, if there is one. Anything this version can't draw
  // (an unknown kind of item, a stroke with no points) is left out rather than
  // letting it break the whole tile.
  function load() {
    try {
      const s = readJSON(SAVE_KEY);
      if (!s || !Array.isArray(s.items) || !Array.isArray(s.strokes) || !Array.isArray(s.links)) return null;
      s.items = s.items.filter(it => it && KINDS.includes(it.type) && (it.type !== 'role' || LOGOS[it.logo]) && (it.type !== 'shape' || SHAPES[it.shape]));
      s.strokes = s.strokes.filter(st => st && Array.isArray(st.pts) && st.pts.length);
      const ids = new Set(s.items.map(it => it.id));
      s.links = s.links.filter(l => l && ids.has(l.from) && ids.has(l.to));
      return s;
    } catch {
      return null;
    }
  }
  function save(str) {
    if (!writeStorage(SAVE_KEY, str)) {
      if (!saveWarned) toast('Couldn’t save that in your browser. It’ll last until you reload.');
      saveWarned = true;
    }
  }
  function commit() {
    const s = JSON.stringify(state);
    if (s === hist[hIdx]) return;
    hist = hist.slice(0, hIdx + 1);
    hist.push(s);
    if (hist.length > 80) hist.shift();
    hIdx = hist.length - 1;
    save(s);
    updateUndo();
  }
  function undo() { if (hIdx > 0) restore(--hIdx); }
  function redo() { if (hIdx < hist.length - 1) restore(++hIdx); }
  function restore(i) {
    if (editing) finishEdit(false);
    state = JSON.parse(hist[i]);
    if (selected && !byId(selected)) selected = null;
    save(hist[i]);
    render();
  }
  function updateUndo() {
    undoBtn.disabled = hIdx === 0;
    redoBtn.disabled = hIdx >= hist.length - 1;
  }

  // ---------- Camera ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function applyCam() {
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
    let step = 24 * cam.z;
    while (step < 12) step *= 2;          // thin the dots out when zoomed far out
    vp.style.backgroundSize = `${step}px ${step}px`;
    vp.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
    zoomValue.textContent = Math.round(cam.z * 100) + '%';
    positionCtx();
  }
  function zoomAt(sx, sy, factor) {
    const z = clamp(cam.z * factor, .1, 4);
    const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
    cam.z = z;
    cam.x = sx - wx * z;
    cam.y = sy - wy * z;
    applyCam();
  }
  function zoomCentre(factor) { zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, factor); }
  function toWorld(cx, cy) {
    const r = vp.getBoundingClientRect();
    return { x: (cx - r.left - cam.x) / cam.z, y: (cy - r.top - cam.y) / cam.z };
  }
  const phone = matchMedia('(max-width: 640px)');
  function bounds(items, strokes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const it of items) {
      x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y);
      x1 = Math.max(x1, it.x + it.w); y1 = Math.max(y1, it.y + (it.h || 40));
    }
    for (const s of strokes) for (const [x, y] of s.pts) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 800, h: 600 };
  }
  // 'start' frames where the story begins (START_SMALL or START_EXPANDED); 'all' frames everything
  function fit(mode) {
    const items = state.items, strokes = state.strokes;
    const b = bounds(items, strokes);
    const W = vp.clientWidth, H = vp.clientHeight;
    lastSize = [W, H];
    if (mode === 'start') {
      // Small tile: the first jobs at a readable size, running off the right edge so it's
      // clear there's more to drag along to. Expanded: more of the story at once.
      const expanded = tile.classList.contains('is-expanded');
      const r = expanded ? START_EXPANDED : START_SMALL;
      const pad = expanded ? 28 : 14, bottom = expanded ? 40 : 0;
      cam.z = clamp(Math.min((W - pad * 2) / r.w, (H - pad * 2 - bottom) / r.h), .1, 1);
      cam.x = pad - r.x * cam.z;
      cam.y = pad - r.y * cam.z;
      applyCam();
      return;
    }
    const pad = tile.classList.contains('is-expanded') ? 36 : 16;
    const top = 0, bottom = 40;   // room for the zoom controls
    const z = clamp(Math.min((W - pad * 2) / b.w, (H - pad * 2 - top - bottom) / b.h), .1, 1);
    cam.z = z;
    cam.x = (W - b.w * z) / 2 - b.x * z;
    // 'start' sits at the top so the rows below peek in; 'all' is centred
    cam.y = top + pad - b.y * z + (mode === 'all' ? (H - top - bottom - pad * 2 - b.h * z) / 2 : 0);
    applyCam();
  }

  // ---------- Drawing the board ----------
  function noteSize(t) {
    const n = t.length;
    return n <= 24 ? 26 : n <= 48 ? 21 : n <= 80 ? 18 : n <= 120 ? 16 : 14;
  }
  function place(el, it) {
    el.style.left = it.x + 'px';
    el.style.top = it.y + 'px';
    el.style.width = it.w + 'px';
    if (it.type !== 'text') el.style.height = it.h + 'px';
    el.style.transform = it.rot ? `rotate(${it.rot}deg)` : '';
  }
  function buildItem(it) {
    const el = document.createElement(it.type === 'image' ? 'figure' : 'div');
    el.className = `ff-item ff-${it.type}`;
    el.dataset.id = it.id;
    el.tabIndex = 0;
    if (it.type === 'note') {
      el.style.setProperty('--c', `var(--n-${it.color})`);
      el.setAttribute('role', 'note');
      el.setAttribute('aria-label', 'Sticky note: ' + (it.text || 'empty'));
      const t = document.createElement('div');
      t.className = 'ff-note-text';
      t.dataset.empty = 'Type something';
      t.style.fontSize = noteSize(it.text) * it.w / 190 + 'px';
      t.textContent = it.text;
      el.append(t);
    } else if (it.type === 'text') {
      if (it.style) el.classList.add('ff-text--' + it.style);
      if (it.tone) el.classList.add('ff-text--' + it.tone);
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', 'Text: ' + (it.text || 'empty'));
      const t = document.createElement('div');
      t.className = 'ff-text-body';
      t.dataset.empty = 'Text';
      if (it.size) t.style.fontSize = it.size + 'px';
      if (it.weight) t.style.fontWeight = it.weight;
      t.textContent = it.text;
      el.append(t);
    } else if (it.type === 'shape') {
      el.style.setProperty('--c', `var(--s-${it.color})`);
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${COLOR_NAMES[it.color]} ${SHAPE_NAMES[it.shape].toLowerCase()}`);
      el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${SHAPES[it.shape]}"/></svg>`;
    } else if (it.type === 'image') {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Photo' + (it.caption ? ': ' + it.caption : ''));
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.src = it.src;
      const cap = document.createElement('figcaption');
      cap.textContent = it.caption || '';
      el.append(img, cap);
    } else if (it.type === 'role') {
      const logo = LOGOS[it.logo];
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', `${it.title} at ${it.company}, ${it.dates}, ${it.place}`);
      el.innerHTML = `<div class="ff-role-head"><span class="ff-role-logo" style="background:${logo.bg}"><svg viewBox="0 0 24 24" aria-hidden="true">${logo.svg}</svg></span>
        <span class="ff-role-who"><strong></strong><span></span></span></div><p class="ff-role-when"></p><p class="ff-role-where"></p>`;
      el.querySelector('strong').textContent = it.title;
      el.querySelector('.ff-role-who span').textContent = it.company;
      el.querySelector('.ff-role-when').textContent = it.dates;
      el.querySelector('.ff-role-where').textContent = it.place;
    } else if (it.type === 'bar') {
      el.style.setProperty('--c', `var(--b-${it.color})`);
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', it.text);
      const t = document.createElement('span');
      t.textContent = it.text;
      el.append(t);
    }
    const handle = document.createElement('span');
    handle.className = 'ff-handle';
    handle.setAttribute('aria-hidden', 'true');
    el.append(handle);
    if (it.id === selected) el.classList.add('is-selected');
    place(el, it);
    return el;
  }
  const elFor = id => itemsEl.querySelector(`[data-id="${id}"]`);

  function render() {
    itemsEl.replaceChildren(...state.items.map(buildItem));
    measure();
    drawLinks();
    drawStrokes();
    updateUndo();
    updateCtx();
  }
  function measure() {
    // Text boxes grow with their words, so read their real height back
    for (const it of state.items) if (it.type === 'text') { const el = elFor(it.id); if (el) it.h = el.offsetHeight; }
  }

  function connectorPath(a, b) {
    const ah = a.h || 40, bh = b.h || 40;
    const ac = { x: a.x + a.w / 2, y: a.y + ah / 2 }, bc = { x: b.x + b.w / 2, y: b.y + bh / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y, gap = 14;
    let p1, p2, c1, c2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const s = Math.sign(dx) || 1;
      p1 = { x: ac.x + s * (a.w / 2 + gap), y: ac.y };
      p2 = { x: bc.x - s * (b.w / 2 + gap), y: bc.y };
      const k = Math.max(24, Math.abs(p2.x - p1.x) / 2);
      c1 = { x: p1.x + s * k, y: p1.y }; c2 = { x: p2.x - s * k, y: p2.y };
    } else {
      const s = Math.sign(dy) || 1;
      p1 = { x: ac.x, y: ac.y + s * (ah / 2 + gap) };
      p2 = { x: bc.x, y: bc.y - s * (bh / 2 + gap) };
      const k = Math.max(24, Math.abs(p2.y - p1.y) / 2);
      c1 = { x: p1.x, y: p1.y + s * k }; c2 = { x: p2.x, y: p2.y - s * k };
    }
    return `M${p1.x} ${p1.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  function drawLinks() {
    linksG.replaceChildren();
    for (const l of state.links) {
      const a = byId(l.from), b = byId(l.to);
      if (!a || !b) continue;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('class', 'ff-link-line');
      p.setAttribute('d', connectorPath(a, b));
      p.setAttribute('marker-end', 'url(#ff-arrow)');
      linksG.append(p);
    }
  }
  function smooth(pts) {
    if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}l0.01 0`;
    if (pts.length === 2) return `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += `Q${pts[i][0]} ${pts[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${l[0]} ${l[1]}`;
  }
  function strokeEl(s) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'ff-stroke');
    p.style.stroke = `var(--p-${s.color})`;
    p.style.strokeWidth = s.w + 'px';
    p.setAttribute('d', smooth(s.pts));
    return p;
  }
  function drawStrokes() { strokesG.replaceChildren(...state.strokes.map(strokeEl)); }

  // ---------- Selection + the little toolbar above it ----------
  function select(id) {
    if (selected === id) { updateCtx(); return; }
    selected = id;
    itemsEl.querySelectorAll('.is-selected').forEach(e => e.classList.remove('is-selected'));
    if (id) elFor(id)?.classList.add('is-selected');
    updateCtx();
  }
  const ICON = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5 5.6 15.4 15.9 5.1a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.6 18.4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 19.5-4-4a1.8 1.8 0 0 1 0-2.6l9.3-9.3a1.8 1.8 0 0 1 2.6 0l4 4a1.8 1.8 0 0 1 0 2.6L12 19.5z"/><path d="M8 19.5h11.5M9 8.5l6.5 6.5"/></svg>',
  };
  function ctxButton(label, icon, fn, extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ff-ctx-btn ' + extra;
    b.innerHTML = ICON[icon] + `<span>${label}</span>`;
    b.addEventListener('click', fn);
    return b;
  }
  function updateCtx() {
    const it = selected && byId(selected);
    if (!it || tool !== 'select' || (gesture && gesture.type !== 'pinch')) { ctx.hidden = true; return; }
    ctx.replaceChildren();
    if (it.type === 'note' || it.type === 'shape') {
      const set = it.type === 'note' ? NOTE_COLORS : SHAPE_COLORS;
      for (const c of set) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ff-swatch';
        b.style.setProperty('--sw', `var(--${it.type === 'note' ? 'n' : 's'}-${c})`);
        b.setAttribute('aria-label', COLOR_NAMES[c]);
        b.setAttribute('aria-pressed', String(it.color === c));
        b.addEventListener('click', () => {
          if (editing) finishEdit(true);
          it.color = c;
          commit(); render();
          ctx.querySelector(`[aria-label="${COLOR_NAMES[c]}"]`)?.focus();
        });
        ctx.append(b);
      }
      const sep = document.createElement('span');
      sep.className = 'ff-ctx-sep';
      ctx.append(sep);
    }
    if ((it.type === 'note' || it.type === 'text') && editing !== it.id) ctx.append(ctxButton('Edit', 'edit', () => startEdit(it.id)));
    ctx.append(ctxButton('Delete', 'trash', () => removeItem(it.id), 'ff-ctx-btn--danger'));
    ctx.hidden = false;
    positionCtx();
  }
  // Keep the text caret where it is when a button above a note is pressed mid-edit
  ctx.addEventListener('mousedown', e => { if (editing) e.preventDefault(); });

  function positionCtx() {
    if (ctx.hidden || !selected) return;
    const el = elFor(selected);
    if (!el) return;
    const r = el.getBoundingClientRect(), v = vp.getBoundingClientRect();
    const h = ctx.offsetHeight, w = ctx.offsetWidth;
    let top = r.top - v.top - h - 14;
    if (top < 8) top = r.bottom - v.top + 14;
    const left = clamp(r.left - v.left + r.width / 2, w / 2 + 8, v.width - w / 2 - 8);
    ctx.style.top = clamp(top, 8, v.height - h - 8) + 'px';
    ctx.style.left = left + 'px';
  }

  // ---------- Adding, editing, removing ----------
  let addCount = 0;
  function addItem(it, edit) {
    const c = toWorld(vp.getBoundingClientRect().left + vp.clientWidth / 2, vp.getBoundingClientRect().top + vp.clientHeight / 2);
    const nudge = (addCount++ % 5) * 22;
    it.id = newId(it.type[0]);
    it.x = Math.round(c.x - it.w / 2 + nudge);
    it.y = Math.round(c.y - (it.h || 40) / 2 + nudge);
    state.items.push(it);
    selected = it.id;
    commit();
    render();
    if (edit) startEdit(it.id, true);
    else elFor(it.id)?.focus({ preventScroll: true });
  }
  function removeItem(id) {
    if (editing === id) finishEdit(false);
    state.items = state.items.filter(i => i.id !== id);
    state.links = state.links.filter(l => l.from !== id && l.to !== id);
    if (selected === id) selected = null;
    commit();
    render();
    vp.focus({ preventScroll: true });
  }
  function startEdit(id, selectAll) {
    const el = elFor(id);
    const body = el && el.querySelector('.ff-note-text, .ff-text-body');
    if (!body) return;
    if (editing && editing !== id) finishEdit(true);
    editing = id;
    select(id);
    el.classList.add('is-editing');
    body.contentEditable = 'plaintext-only';
    if (body.contentEditable !== 'plaintext-only') body.contentEditable = 'true';
    body.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(body);
    if (!selectAll) range.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    updateCtx();
    const it = byId(id);
    body.oninput = () => {
      if (it.type === 'note') body.style.fontSize = noteSize(body.innerText) * it.w / 190 + 'px';
      else { it.h = el.offsetHeight; drawLinks(); }
    };
    body.onblur = () => finishEdit(true);
  }
  function finishEdit(keep) {
    const id = editing;
    if (!id) return;
    editing = null;
    const el = elFor(id);
    const body = el && el.querySelector('.ff-note-text, .ff-text-body');
    const it = byId(id);
    if (body) {
      body.onblur = body.oninput = null;
      body.contentEditable = 'false';
      el.classList.remove('is-editing');
      if (keep && it) {
        const text = body.innerText.replace(/\n+$/, '');
        if (text !== it.text) it.text = text;
        if (it.type === 'text' && !text.trim()) {
          state.items = state.items.filter(i => i !== it);
          if (selected === id) selected = null;
        }
        commit();
      }
    }
    render();
  }

  // Photos from the visitor's device: shrunk so they fit in browser storage
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('That file isn’t a photo. Try a JPEG or PNG.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 560, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const w = 220, ratio = c.height / c.width;
        addItem({ type: 'image', src: c.toDataURL('image/jpeg', .78), caption: f.name.replace(/\.[^.]+$/, '').slice(0, 40), w, h: Math.round((w - 20) * ratio + 56), rot: Math.round(Math.random() * 6 - 3) });
      };
      img.onerror = () => toast('Couldn’t open that photo. Try a JPEG or PNG.');
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });

  // ---------- Tools ----------
  function setTool(t) {
    tool = t;
    vp.classList.toggle('is-pen', t === 'pen');
    vp.classList.toggle('is-eraser', t === 'eraser');
    penBtn.setAttribute('aria-pressed', String(t !== 'select'));
    if (t !== 'select') { if (editing) finishEdit(true); select(null); }
    buildPenbar();
    updateCtx();
  }
  function buildPenbar() {
    penbar.hidden = tool === 'select';
    if (penbar.hidden) return;
    penbar.replaceChildren();
    for (const c of PEN_COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ff-swatch';
      b.style.setProperty('--sw', `var(--p-${c})`);
      b.setAttribute('aria-label', COLOR_NAMES[c] + ' pen');
      b.setAttribute('aria-pressed', String(tool === 'pen' && penColor === c));
      b.addEventListener('click', () => { penColor = c; setTool('pen'); });
      penbar.append(b);
    }
    const sep = document.createElement('span');
    sep.className = 'ff-ctx-sep';
    const er = document.createElement('button');
    er.type = 'button';
    er.className = 'ff-tool';
    er.innerHTML = ICON.eraser;
    er.setAttribute('aria-label', 'Eraser');
    er.setAttribute('aria-pressed', String(tool === 'eraser'));
    er.addEventListener('click', () => setTool(tool === 'eraser' ? 'pen' : 'eraser'));
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'ff-ctx-btn';
    done.textContent = 'Done';
    done.addEventListener('click', () => setTool('select'));
    penbar.append(sep, er, done);
  }

  function openPop(pop, btn) {
    const open = pop.hidden;
    closePops();
    if (!open) return;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const w = win.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const below = b.top - w.top < w.height / 2;
    pop.style.top = (below ? b.bottom - w.top + 8 : b.top - w.top - ph - 8) + 'px';
    pop.style.left = clamp(b.left - w.left + b.width / 2 - pw / 2, 8, w.width - pw - 8) + 'px';
    pop.querySelector('button')?.focus();
  }
  function closePops() {
    for (const p of [shapesPop, resetPop]) p.hidden = true;
    tile.querySelectorAll('[aria-controls][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  for (const [name, d] of Object.entries(SHAPES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ff-shape-btn';
    b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', SHAPE_NAMES[name]);
    b.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`;
    b.addEventListener('click', () => {
      closePops();
      addItem({ type: 'shape', shape: name, color: 'blue', w: 150, h: name === 'bubble' ? 130 : 150 });
    });
    shapesPop.append(b);
  }

  tile.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.add;
    if (kind !== 'shape') closePops();
    if (kind === 'pen') { setTool(tool === 'select' ? 'pen' : 'select'); return; }
    if (tool !== 'select') setTool('select');
    if (kind === 'note') addItem({ type: 'note', color: 'yellow', w: 190, h: 190, text: '' }, true);
    else if (kind === 'text') addItem({ type: 'text', w: 260, size: 20, text: '' }, true);
    else if (kind === 'shape') openPop(shapesPop, b);
    else if (kind === 'media') fileInput.click();
  }));
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  $('[data-act="reset"]').addEventListener('click', e => openPop(resetPop, e.currentTarget));
  $('[data-reset="cancel"]').addEventListener('click', closePops);
  $('[data-reset="confirm"]').addEventListener('click', () => {
    closePops();
    if (editing) finishEdit(false);
    state = clone(DEFAULT);
    hist = [JSON.stringify(state)];
    hIdx = 0;
    selected = null;
    writeStorage(SAVE_KEY, null);
    setTool('select');
    render();
    fit('start');
    toast('Board reset');
  });
  $('[data-zoom="in"]').addEventListener('click', () => zoomCentre(1.25));
  $('[data-zoom="out"]').addEventListener('click', () => zoomCentre(.8));
  $('[data-zoom="fit"]').addEventListener('click', () => fit('all'));
  zoomValue.addEventListener('click', () => zoomCentre(1 / cam.z));

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  // ---------- Pointer: drag, resize, pan, pinch, draw ----------
  // Pointer events cover mouse, finger and Apple Pencil with one set of code.
  const ptrs = new Map();
  function pinchInfo() {
    const [a, b] = [...ptrs.values()];
    const r = vp.getBoundingClientRect();
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top };
  }
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = dx || dy ? clamp(((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
    return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
  }
  function eraseAt(p, g) {
    const reach = 10 / cam.z;
    const before = state.strokes.length;
    state.strokes = state.strokes.filter(s => {
      if (s.pts.length === 1) return Math.hypot(p.x - s.pts[0][0], p.y - s.pts[0][1]) > reach + s.w / 2;
      for (let i = 1; i < s.pts.length; i++) if (segDist(p, s.pts[i - 1], s.pts[i]) < reach + s.w / 2) return false;
      return true;
    });
    if (state.strokes.length !== before) { g.erased = true; drawStrokes(); }
  }

  vp.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.ff-ui')) return;
    closePops();
    if (editing && e.target.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    if (editing) document.activeElement?.blur();

    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { vp.setPointerCapture(e.pointerId); } catch (err) {}

    if (ptrs.size === 2) {
      if (gesture?.type === 'stroke') gesture.path.remove();
      if ((gesture?.type === 'drag' || gesture?.type === 'resize') && gesture.moved) commit();
      const i = pinchInfo();
      gesture = { type: 'pinch', ...i, cam: { ...cam } };
      vp.classList.remove('is-panning');
      return;
    }
    if (ptrs.size > 2) return;

    const p = toWorld(e.clientX, e.clientY);
    const base = { sx: e.clientX, sy: e.clientY, moved: false };
    if (tool === 'pen') {
      const s = { id: newId('s'), color: penColor, w: 4, pts: [[+p.x.toFixed(1), +p.y.toFixed(1)]] };
      const path = strokeEl(s);
      strokesG.append(path);
      gesture = { type: 'stroke', s, path, ...base };
      return;
    }
    if (tool === 'eraser') {
      gesture = { type: 'erase', erased: false, ...base };
      eraseAt(p, gesture);
      return;
    }
    // (finishing an edit redraws the board, so look the item up again)
    const hit = e.target.closest('.ff-item');
    const itemEl = hit && elFor(hit.dataset.id);
    if (itemEl) {
      const it = byId(itemEl.dataset.id);
      select(it.id);
      if (e.target.closest('.ff-handle')) gesture = { type: 'resize', it, el: itemEl, w: it.w, h: it.h, ...base };
      else gesture = { type: 'drag', it, el: itemEl, x: it.x, y: it.y, ...base };
    } else {
      gesture = { type: 'pan', cx: cam.x, cy: cam.y, ...base };
      vp.classList.add('is-panning');
    }
  });

  vp.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture;
    if (!g) return;
    if (g.type === 'pinch') {
      if (ptrs.size < 2) return;
      const i = pinchInfo();
      const z = clamp(g.cam.z * i.d / g.d, .1, 4);
      const wx = (g.mx - g.cam.x) / g.cam.z, wy = (g.my - g.cam.y) / g.cam.z;
      cam.z = z;
      cam.x = i.mx - wx * z;
      cam.y = i.my - wy * z;
      applyCam();
      return;
    }
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 3 && g.type !== 'stroke' && g.type !== 'erase') return;
    const first = !g.moved;
    g.moved = true;
    if (g.type === 'pan') {
      cam.x = g.cx + dx;
      cam.y = g.cy + dy;
      applyCam();
    } else if (g.type === 'drag') {
      if (first) {
        // bring what you're holding to the top of the pile
        state.items = state.items.filter(i => i !== g.it).concat(g.it);
        itemsEl.append(g.el);
        ctx.hidden = true;
      }
      g.it.x = Math.round(g.x + dx / cam.z);
      g.it.y = Math.round(g.y + dy / cam.z);
      place(g.el, g.it);
      drawLinks();
    } else if (g.type === 'resize') {
      if (first) ctx.hidden = true;
      const it = g.it;
      const w = Math.max(it.type === 'text' ? 60 : 50, Math.round(g.w + dx / cam.z));
      if (it.type === 'note' || it.type === 'image' || it.type === 'role') {
        it.h = Math.round(g.h * w / g.w);        // keep the shape
      } else if (it.type === 'shape') {
        it.h = Math.max(40, Math.round(g.h + dy / cam.z));
      }
      it.w = w;
      place(g.el, it);
      if (it.type === 'note') g.el.querySelector('.ff-note-text').style.fontSize = noteSize(it.text) * w / 190 + 'px';
      if (it.type === 'text') it.h = g.el.offsetHeight;
      drawLinks();
    } else if (g.type === 'stroke') {
      const p = toWorld(e.clientX, e.clientY);
      const last = g.s.pts[g.s.pts.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) > 1.5 / cam.z) {
        g.s.pts.push([+p.x.toFixed(1), +p.y.toFixed(1)]);
        g.path.setAttribute('d', smooth(g.s.pts));
      }
    } else if (g.type === 'erase') {
      eraseAt(toWorld(e.clientX, e.clientY), g);
    }
  });

  function pointerEnd(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    const g = gesture;
    if (!g) return;
    if (g.type === 'pinch') { if (ptrs.size === 0) { gesture = null; updateCtx(); } return; }
    gesture = null;
    vp.classList.remove('is-panning');
    const now = performance.now();
    if (g.type === 'stroke') {
      if (e.type === 'pointercancel') { g.path.remove(); return; }
      state.strokes.push(g.s);
      commit();
    } else if (g.type === 'erase') {
      if (g.erased) commit();
    } else if (g.type === 'drag' || g.type === 'resize') {
      if (g.moved) { commit(); if (g.it.type === 'note') render(); }
      else if (g.type === 'drag') {
        // a double tap on a note or text box starts typing in it
        if (lastTap && lastTap.id === g.it.id && now - lastTap.t < 350 && (g.it.type === 'note' || g.it.type === 'text')) {
          lastTap = null;
          startEdit(g.it.id);
          return;
        }
        lastTap = { id: g.it.id, t: now };
      }
    } else if (g.type === 'pan' && !g.moved) {
      select(null);
      // a double tap on empty board adds a sticky note right there
      if (lastTap && lastTap.id === '' && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 20) {
        lastTap = null;
        const p = toWorld(e.clientX, e.clientY);
        const it = { id: newId('n'), type: 'note', color: 'yellow', w: 190, h: 190, text: '', x: Math.round(p.x - 95), y: Math.round(p.y - 95) };
        state.items.push(it);
        selected = it.id;
        commit();
        render();
        startEdit(it.id, true);
        return;
      }
      lastTap = { id: '', t: now, x: e.clientX, y: e.clientY };
    }
    updateCtx();
  }
  vp.addEventListener('pointerup', pointerEnd);
  vp.addEventListener('pointercancel', pointerEnd);

  // Trackpad and mouse wheel. On the homepage an ordinary scroll must still scroll the
  // page, so only a pinch (or ⌘/Ctrl + scroll) zooms and a sideways swipe pans.
  // Up/down scrolling moves the board only while it's expanded and has focus.
  vp.addEventListener('wheel', e => {
    if (e.target.closest('.ff-ui')) return;
    const r = vp.getBoundingClientRect();
    const k = e.deltaMode === 1 ? 16 : 1;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode === 1 ? .05 : .01)));
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || (tile.classList.contains('is-expanded') && tile.contains(document.activeElement))) {
      e.preventDefault();
      cam.x -= e.deltaX * k;
      cam.y -= e.deltaY * k;
      applyCam();
    }
  }, { passive: false });
  // Safari reports trackpad pinches as "gesture" events instead
  let gz = 1;
  vp.addEventListener('gesturestart', e => { e.preventDefault(); gz = cam.z; });
  vp.addEventListener('gesturechange', e => {
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, clamp(gz * e.scale, .1, 4) / cam.z);
  });

  // ---------- Keyboard ----------
  itemsEl.addEventListener('focusin', e => {
    const el = e.target.closest('.ff-item');
    if (el && !editing && tool === 'select') select(el.dataset.id);
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.ff-pop') && !e.target.closest('[aria-controls]')) closePops();
  });
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
      if (e.key === 'Escape') { e.preventDefault(); const id = editing; t.blur(); if (id) elFor(id)?.focus({ preventScroll: true }); }
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (!tile.contains(t)) return;      // the rest of the page keeps its own keys
    if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && key === 'y') { e.preventDefault(); redo(); return; }
    if (mod) return;
    if (e.key === 'Escape') {
      if (!shapesPop.hidden || !resetPop.hidden) closePops();
      else if (tool !== 'select') setTool('select');
      else if (selected) select(null);
      else if (tile.classList.contains('is-expanded')) setExpanded(false);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); removeItem(selected); }
    else if (e.key === 'Enter' && selected && t.closest?.('.ff-item')) {
      const it = byId(selected);
      if (it.type === 'note' || it.type === 'text') { e.preventDefault(); startEdit(selected); }
    }
    else if (e.key === '+' || e.key === '=') zoomCentre(1.25);
    else if (e.key === '-' || e.key === '_') zoomCentre(.8);
    else if (e.key === '0') zoomCentre(1 / cam.z);
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (selected && t.closest?.('.ff-item')) {
        const it = byId(selected), step = e.shiftKey ? 1 : 10;
        it.x += d[0] * step; it.y += d[1] * step;
        place(elFor(it.id), it);
        drawLinks();
        positionCtx();
        commit();
      } else {
        cam.x -= d[0] * 80; cam.y -= d[1] * 80;
        applyCam();
      }
    }
  });

  // ---------- Expand to 2×2 ----------
  // The tile grows from one row to two; the Spotify tile shrinks to one row to make
  // room (home.css, .is-ff-expanded). Where the browser supports it, a "view
  // transition" animates every tile from its old spot to its new one.
  const expandBtn = $('.ff-expand');
  function setExpanded(on) {
    const apply = () => {
      tile.classList.toggle('is-expanded', on);
      grid?.classList.toggle('is-ff-expanded', on);
      expandBtn.setAttribute('aria-expanded', String(on));
      expandBtn.setAttribute('aria-label', on ? 'Make the board smaller' : 'Expand the board');
      vp.style.touchAction = on ? 'none' : '';
    };
    const done = () => {
      fit('start');
      const r = tile.getBoundingClientRect();
      if (on && (r.bottom > innerHeight || r.top < 0)) tile.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    };
    closePops();
    if (document.startViewTransition && !lessMotion()) {
      grid?.classList.add('ff-morph');
      const t = document.startViewTransition(() => { apply(); fit('start'); });
      // Reversing the action before the half-second animation ends makes Chrome skip the
      // old transition. That is expected; consume its rejection instead of logging a page error.
      t.finished.catch(() => {}).then(() => { grid?.classList.remove('ff-morph'); done(); });
    } else { apply(); done(); }
  }
  expandBtn.addEventListener('click', () => setExpanded(!tile.classList.contains('is-expanded')));
  $('.ff-light--zoom').addEventListener('click', () => setExpanded(!tile.classList.contains('is-expanded')));
  phone.addEventListener('change', () => fit('start'));

  // ---------- Start ----------
  render();
  fit('start');
  new ResizeObserver(() => {
    const [w, h] = [vp.clientWidth, vp.clientHeight];
    cam.x += (w - lastSize[0]) / 2;       // keep the middle of the view in the middle
    cam.y += (h - lastSize[1]) / 2;
    lastSize = [w, h];
    applyCam();
  }).observe(vp);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); drawLinks(); });
}
