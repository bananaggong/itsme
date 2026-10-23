// Spotlight: search the whole site, like Spotlight on a Mac.
//
// Open it with ⌘K (Ctrl+K on Windows), or / when you're not typing somewhere, or the
// 🔍 at the end of the nav on phones. Type to search pages, articles, newsletter issues,
// projects, books and links; the arrow keys move, Return opens, Escape clears then closes.
// It can also do things (Actions: dark mode, Memoji, Photo Booth, office hours, email),
// do sums like the Mac's calculator, and has a few Easter eggs (EGGS below).
//
// What it searches: search.json, made by tools/build_search.py (rerun it when content
// changes). It's only downloaded the first time Spotlight opens. The look is in
// spotlight.css, fetched as the page loads so Spotlight opens instantly.
//
// Loaded on every page with a nav (not /vr/).

import { unlockAudio } from './audio.js?v=8f596f00be';
import { savedLook, setLook } from './look.js?v=d45ebe80f1';
import { isGlass, setGlass, hasGlassStyles } from './glass.js?v=77bedca5a5';
import { copyText, lessMotion, scrollBehavior } from './utils.js?v=8c1091ee90';

const CSS = '/spotlight.css?v=504f9840d9';
const INDEX = '/search.json?v=12aaf1e639';
const EMAIL = 'samdickie@gmail.com';
const onHome = location.pathname === '/';

// How many results each group shows, in the order groups appear when they score the same
const GROUPS = { Actions: 3, Pages: 4, Projects: 4, Work: 3, Writing: 5, Newsletter: 5, Books: 4, Links: 4 };
const GROUP_BONUS = { Actions: 12, Pages: 10, Projects: 6, Work: 4, Writing: 3, Newsletter: 0, Books: 0, Links: 0 };
const MAX_RESULTS = 22;

// ---------------------------------------------------------------- the search index

let index = null;     // search.json, once loaded and prepared
let loading = null;
let indexFailed = false;   // the download didn't work, so stop promising results that aren't coming

function loadIndex() {
  loading ??= fetch(INDEX)
    .then(response => (response.ok ? response.json() : Promise.reject(new Error(response.status))))
    .then(items => { index = items.map(prepare); indexFailed = false; })
    .catch(() => { loading = null; index = null; indexFailed = true; })   // try again next time Spotlight opens
    .finally(() => { if (dialog?.open) render(); });   // either way, show where it got to
  return loading;
}

// Whether the index is as good as it's going to get: loaded, or not coming. Until then
// the window says "Loading…" rather than "No results".
const indexSettled = () => index !== null || indexFailed;

// Lower case, accents and punctuation removed, so "Café's" matches "cafes"
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9£]+/g, ' ').trim();
}
const words = s => (s ? s.split(' ') : []);

function prepare(item) {
  const t = norm(item.t);
  const s = norm(item.s);
  const w = norm(`${item.w || ''} ${item.m || ''} ${item.g}`);
  return Object.assign(item, { _t: t, _tw: words(t), _s: s, _sw: words(s), _ww: words(w) });
}

// ---------------------------------------------------------------- scoring

// Typos: two words are "near" if one letter is missing, extra, wrong or swapped
// (two for long words). Compares against the start of the word, so half-typed words count.
function near(word, tok) {
  if (Math.abs(word.length - tok.length) > 2 && word.length < tok.length) return false;
  const a = word.slice(0, tok.length + 1);
  const max = tok.length >= 8 ? 2 : 1;
  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  let prev2 = null;
  for (let i = 1; i <= tok.length; i++) {
    const row = [i];
    for (let j = 1; j <= a.length; j++) {
      const cost = tok[i - 1] === a[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && tok[i - 1] === a[j - 2] && tok[i - 2] === a[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1);
    }
    prev2 = prev;
    prev = row;
  }
  // Best match against any prefix of the word (so "valdat" is near "validation")
  return Math.min(...prev.slice(Math.max(1, tok.length - max))) <= max;
}

function tokenScore(item, tok, short, fuzzy) {
  if (item._t.startsWith(tok)) return 100;
  if (item._tw.some(w => w.startsWith(tok))) return 60;
  if (short) return 0;                                   // one letter: only the starts of titles
  if (tok.length > 2 && item._t.includes(tok)) return 35;
  if (item._ww.some(w => w.startsWith(tok))) return 25;
  if (item._sw.some(w => w.startsWith(tok))) return 15;
  if (tok.length > 3 && item._s.includes(tok)) return 8;
  if (!fuzzy) return 0;
  if (tok.length > 4 && item._tw.some(w => near(w, tok))) return 18;
  if (tok.length > 5 && item._ww.some(w => near(w, tok))) return 10;
  return 0;
}

function score(item, q, toks, fuzzy) {
  let total = 0;
  for (const tok of toks) {
    const s = tokenScore(item, tok, q.length === 1, fuzzy);
    if (!s) return 0;                                    // every word has to match something
    total += s;
  }
  if (item._t === q) total += 200;
  else if (item._t.startsWith(q)) total += 80;
  total += GROUP_BONUS[item.g] || 0;
  if (item.d) total += (Number(item.d.slice(0, 4)) - 2015) * 0.4;   // newer first, gently
  return total;
}

// ---------------------------------------------------------------- actions

const isDark = () => document.documentElement.dataset.theme === 'dark';

// Things only the homepage can do: elsewhere, go there and do it on arrival (see the end of this file)
function onHomepage(name) {
  if (onHome) HOME_ACTIONS[name]();
  else location.href = `/?spotlight=${name}`;
}

const HOME_ACTIONS = {
  photobooth() { document.querySelector('.pb-launch')?.click(); },
  officehours() {
    const tile = document.querySelector('.tile--office');
    if (!tile) return;
    tile.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    setTimeout(() => {
      const slot = tile.querySelector('.ch-slot');
      if (slot && slot.getAttribute('aria-expanded') !== 'true') slot.click();
    }, lessMotion() ? 0 : 450);
  },
  // imessage.js listens for this and slides the message from Sam in
  hello() { document.dispatchEvent(new CustomEvent('spotlight:hello')); },
  // Pages without the Liquid Glass styles (the Old site) switch it on the homepage instead
  glass() { setGlass(!isGlass()); },
};

const ACTIONS = [
  {
    e: '🌗', get t() { return isDark() ? 'Turn on light mode' : 'Turn on dark mode'; },
    s: 'Change how the site looks', a: 'Switch', w: 'dark mode light mode theme appearance night day colours colors',
    run() { close(); document.querySelector('.theme-toggle')?.click(); },
  },
  {
    e: '✨', get t() { return savedLook() === 'memoji' ? 'Change Sam back to pixel art' : 'Turn Sam into a Memoji'; },
    s: 'Ask Siri', a: 'Ask Siri', w: 'memoji siri avatar cartoon pixel art portrait face photo picture',
    run() {
      close();
      const siri = document.querySelector('.siri-button');
      if (siri) {
        siri.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        setTimeout(() => siri.click(), lessMotion() ? 0 : 450);
      } else {
        const next = savedLook() === 'memoji' ? 'pixel' : 'memoji';
        setLook(next);
        toast(next === 'memoji' ? 'Sam is now a Memoji' : 'Sam is back to pixel art');
      }
    },
  },
  {
    e: '📸', t: 'Open Photo Booth', s: 'Take a selfie. Nothing’s saved or uploaded.', a: 'Open',
    w: 'photo booth camera selfie picture photo webcam thermal',
    run() { close(); onHomepage('photobooth'); },
  },
  {
    id: 'officehours', e: '📅', t: 'Book office hours', s: 'A free 30 min video call with Sam', a: 'Book',
    w: 'office hours book call meeting advice validation help mentor chat calendar consult',
    run() { close(); onHomepage('officehours'); },
  },
  {
    e: '✉️', t: 'Email Sam', s: EMAIL, a: 'Write an email', w: 'email contact mail message reach get in touch',
    run() { close(); location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Hello via samdickie.me')}`; },
  },
  {
    e: '📋', t: 'Copy Sam’s email address', s: EMAIL, a: 'Copy', w: 'copy email address contact clipboard',
    run() { close(); copy(EMAIL, 'Email address copied'); },
  },
  {
    id: 'glass', e: '🫧', get t() { return isGlass() ? 'Turn off Liquid Glass' : 'Turn on Liquid Glass'; },
    s: 'Make the site look like iOS 26', a: 'Switch',
    w: 'liquid glass ios 26 macos tahoe apple theme look appearance transparent frosted wallpaper',
    run() { close(); if (hasGlassStyles()) setGlass(!isGlass()); else onHomepage('glass'); },
  },
].map(action => Object.assign(action, { g: 'Actions' }));

// Easter eggs: typing one of these exactly makes it the Top Hit
const EGGS = [
  {
    on: ['hello', 'hi', 'hey', 'hiya', 'hello sam', 'hi sam'], e: '👋', t: 'Say hello to Sam', s: 'He might just say hello back.', a: 'Say hello',
    run() { close(); onHomepage('hello'); },
  },
  {
    on: ['dial-up', 'dialup', 'dial up', 'modem', '56k'], e: '📠', t: 'Connecting at 56k…', s: 'Turn your sound up.', a: 'Dial in',
    run() { close(); modem(); },
  },
  {
    on: ['hire', 'hire sam', 'hiring', 'job', 'jobs', 'recruiter', 'recruiters', 'recruiting', 'recruitment'],
    e: '💼', t: '광일에게 연락하기', s: '궁금한 점과 제안을 보내주세요.', a: 'Copy his email',
    run() { close(); copy(EMAIL, 'Email address copied'); },
  },
  { on: [/^sudo\b/], e: '🔒', t: 'Nice try.', s: 'This incident will be reported.', a: 'Try anyway', run() { shake(); } },
].map(egg => Object.assign(egg, { g: 'Top Hit', egg: true }));

function findEgg(raw) {
  const q = raw.trim().toLowerCase();
  return EGGS.find(egg => egg.on.some(on => (on instanceof RegExp ? on.test(q) : on === q)));
}

// ---------------------------------------------------------------- the calculator

// Sums like Spotlight's: + − × ÷ ^ % and brackets. Read by hand rather than with eval(),
// so typing code into the box can never run it.
function calculate(raw) {
  const text = raw.replace(/,/g, '').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!/^[\d\s.+\-*/^%()]+$/.test(text) || !/\d/.test(text) || !/[+\-*/^%]/.test(text.trim().replace(/^-/, ''))) return null;
  const toks = text.match(/\d*\.?\d+|[+\-*/^%()]/g);
  let i = 0;
  const peek = () => toks[i];
  const take = () => toks[i++];
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = take() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = power();
    while (peek() === '*' || peek() === '/') v = take() === '*' ? v * power() : v / power();
    return v;
  }
  function power() {
    const v = unary();
    return peek() === '^' ? (take(), v ** power()) : v;
  }
  function unary() {
    if (peek() === '-') { take(); return -unary(); }
    if (peek() === '+') { take(); return unary(); }
    let v;
    if (peek() === '(') { take(); v = expr(); if (take() !== ')') throw new Error('bracket'); }
    else { v = Number(take()); if (Number.isNaN(v)) throw new Error('number'); }
    while (peek() === '%') { take(); v /= 100; }
    return v;
  }
  try {
    const v = expr();
    if (i !== toks.length || !Number.isFinite(v)) return null;
    return Number.isInteger(v) ? v.toLocaleString('en-GB') : v.toLocaleString('en-GB', { maximumFractionDigits: 8 });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- finding results

// What Spotlight shows before anything's typed. Office hours comes first, since Return runs the
// first one; Liquid Glass second, so visitors find it without knowing to search for it.
function suggestions() {
  const action = id => ACTIONS.find(a => a.id === id);
  const byUrl = url => index?.find(i => i.u === url);
  const latest = index?.filter(i => i.g === 'Newsletter').sort((a, b) => b.d.localeCompare(a.d))[0];
  return [
    { group: 'Siri Suggestions', items: [action('officehours'), action('glass'), latest, byUrl('/about/'), byUrl('/projects/'), byUrl('/writing/'), byUrl('/books/')].filter(Boolean) },
  ];
}

function search(raw) {
  const q = norm(raw);
  const groups = [];
  const top = [];

  const egg = findEgg(raw);
  if (egg) top.push(egg);
  const sum = calculate(raw);
  if (sum !== null) {
    top.push({ g: 'Top Hit', e: '🧮', t: `= ${sum}`, s: raw.trim(), a: 'Copy', calc: true, run() { close(); copy(sum.replace(/,/g, ''), `Copied ${sum}`); } });
  }
  // A sum only needs its answer; an empty search (just punctuation) needs nothing
  if (!q || sum !== null) return top.length ? [{ group: 'Top Hit', items: top }] : [];

  const toks = q.split(' ');
  const all = [...ACTIONS.map(prepare), ...(index || [])];
  const find = fuzzy => all.map(item => [score(item, q, toks, fuzzy), item]).filter(([s]) => s);
  // Typos only count when an exact search finds very little ("valdation" → validation)
  let scored = find(false);
  if (scored.length < 3) scored = find(true);
  scored.sort((a, b) => b[0] - a[0]);

  // The best match becomes the Top Hit (unless an Easter egg or a sum got there first)
  if (!top.length && scored.length && scored[0][0] >= 60) top.push(scored.shift()[1]);

  const byGroup = new Map();
  for (const [s, item] of scored) {
    if (!byGroup.has(item.g)) byGroup.set(item.g, { group: item.g, best: s, items: [] });
    const g = byGroup.get(item.g);
    if (g.items.length < (GROUPS[item.g] || 4)) g.items.push(item);
  }
  if (top.length) groups.push({ group: 'Top Hit', items: top });
  const order = Object.keys(GROUPS);
  groups.push(...[...byGroup.values()].sort((a, b) => b.best - a.best || order.indexOf(a.group) - order.indexOf(b.group)));

  // Keep it to one screenful
  let left = MAX_RESULTS;
  for (const g of groups) { g.items = g.items.slice(0, Math.max(0, left)); left -= g.items.length; }
  const found = groups.filter(g => g.items.length);
  if (!found.length && indexSettled()) {
    found.push({ group: 'Search the web', items: [{
      g: 'Web', e: '🔎', t: `Search the web for “${raw.trim()}”`, s: 'Nothing on this site, but the internet is big', a: 'Search',
      u: `https://www.google.com/search?q=${encodeURIComponent(raw.trim())}`, x: 1,
    }] });
  }
  return found;
}

// ---------------------------------------------------------------- the window

let dialog, panel, input, list, preview, live;
let rows = [];        // the items on screen, in order
let selected = 0;
let cssLoaded = false;
let cssLoading = null;

function loadCSS() {
  cssLoading ??= new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS;
    link.onload = link.onerror = () => { cssLoaded = true; resolve(); };
    document.head.append(link);
  });
  return cssLoading;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';

function build() {
  if (dialog) return;
  dialog = el('dialog', 'spotlight');
  dialog.setAttribute('aria-label', 'Spotlight search');
  panel = el('div', 'sl-panel');

  const bar = el('div', 'sl-bar');
  bar.insertAdjacentHTML('afterbegin', SEARCH_ICON);
  input = el('input', 'sl-input');
  Object.assign(input, { type: 'text', placeholder: 'Spotlight Search', autocomplete: 'off', spellcheck: false, enterKeyHint: 'go' });
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-label', 'Search samdickie.me');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'sl-list');
  input.setAttribute('aria-autocomplete', 'list');
  const cancel = el('button', 'sl-cancel', 'Cancel');
  cancel.type = 'button';
  cancel.addEventListener('click', close);
  bar.append(input, cancel);

  const body = el('div', 'sl-body');
  list = el('div', 'sl-list');
  list.id = 'sl-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Results');
  preview = el('aside', 'sl-preview');
  preview.setAttribute('aria-hidden', 'true');
  body.append(list, preview);
  live = el('p', 'sl-sr');
  live.setAttribute('aria-live', 'polite');

  panel.append(bar, body, live);
  dialog.append(panel);
  document.body.append(dialog);

  input.addEventListener('input', () => { selected = 0; render(); });
  input.addEventListener('keydown', onKey);
  list.addEventListener('pointermove', event => {
    const row = event.target.closest('.sl-row');
    if (row && Number(row.dataset.n) !== selected) select(Number(row.dataset.n), false);
  });
  list.addEventListener('click', event => {
    const row = event.target.closest('.sl-row');
    if (row) activate(rows[Number(row.dataset.n)], { newTab: event.metaKey || event.ctrlKey });
  });
  // Clicking the page around the window closes it (the click lands on the <dialog> itself)
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  // Other ways of closing (Escape with focus elsewhere, a phone's back gesture): same as Escape
  dialog.addEventListener('cancel', event => { event.preventDefault(); escape(); });
  dialog.addEventListener('close', () => document.documentElement.classList.remove('sl-is-open'));
  // Phones: keep the window above the on-screen keyboard
  window.visualViewport?.addEventListener('resize', () => {
    dialog.style.setProperty('--sl-viewport', `${window.visualViewport.height}px`);
  });
}

function open() {
  loadCSS();
  loadIndex();
  build();
  if (dialog.open) { input.select(); return; }
  if (!cssLoaded) {           // first open before the look has arrived: show it once it has
    dialog.style.opacity = '0';
    cssLoading.then(() => { dialog.style.opacity = ''; });
  }
  if (window.visualViewport) dialog.style.setProperty('--sl-viewport', `${window.visualViewport.height}px`);
  input.value = '';
  selected = 0;
  render();
  dialog.showModal();
  document.documentElement.classList.add('sl-is-open');
  input.focus();
}

function close() {
  if (dialog?.open) dialog.close();
}

// Escape clears the search first, then closes, like a Mac
function escape() {
  if (input.value) { input.value = ''; selected = 0; render(); }
  else close();
}

function onKey(event) {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();          // handled here, so the browser doesn't close the window as well
    escape();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (rows.length) select((selected + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (rows[selected]) activate(rows[selected], { newTab: event.metaKey || event.ctrlKey });
  }
}

function activate(item, { newTab = false } = {}) {
  unlockAudio();   // a key press or click: the moment browsers allow sound (the hello chime, the modem)
  if (item.run) return item.run();
  close();
  const url = item.go || item.u;
  if (url === location.pathname) return window.scrollTo({ top: 0, behavior: scrollBehavior() });
  if (item.x || newTab) window.open(url, '_blank', 'noopener');
  else location.href = url;
}

// ---------------------------------------------------------------- drawing results

function icon(item, big) {
  if (item.swatch) {
    const sw = el('span', 'sl-icon sl-icon--swatch');
    sw.style.background = item.swatch;
    return sw;
  }
  if (item.e) return el('span', 'sl-icon sl-icon--emoji', item.e);
  if (item.i) {
    const img = el('img', `sl-icon sl-icon--${item.g.toLowerCase()}`);
    Object.assign(img, { src: item.i, alt: '', decoding: 'async' });
    if (!big) img.loading = 'lazy';
    return img;
  }
  const glyph = el('span', 'sl-icon sl-icon--glyph');
  glyph.innerHTML = LINK_ICON;
  return glyph;
}

function render() {
  if (!dialog) return;
  const raw = input.value;
  const groups = raw.trim() ? search(raw) : suggestions();
  rows = [];
  list.replaceChildren();
  groups.forEach((g, gi) => {
    const box = el('div', 'sl-group');
    box.setAttribute('role', 'group');
    const head = el('p', 'sl-group-name', g.group);
    head.id = `sl-g${gi}`;
    box.setAttribute('aria-labelledby', head.id);
    box.append(head);
    for (const item of g.items) {
      const n = rows.length;
      rows.push(item);
      const row = el('div', 'sl-row');
      row.id = `sl-r${n}`;
      row.dataset.n = n;
      row.setAttribute('role', 'option');
      const text = el('span', 'sl-text');
      text.append(el('span', 'sl-title', item.t));
      const sub = item.egg || item.calc || item.g === 'Actions' ? item.s : item.m || item.s;
      if (sub) text.append(el('span', 'sl-sub', sub));
      row.append(icon(item), text);
      if (item.x) row.append(el('span', 'sl-out', '↗'));
      box.append(row);
    }
    list.append(box);
  });
  list.hidden = !rows.length;
  dialog.classList.toggle('has-results', rows.length > 0);
  if (!raw.trim()) live.textContent = '';
  else live.textContent = rows.length ? `${rows.length} result${rows.length === 1 ? '' : 's'}` : (indexSettled() ? 'No results' : 'Loading…');
  select(Math.min(selected, Math.max(0, rows.length - 1)), false);
}

function select(n, scroll = true) {
  selected = n;
  list.querySelectorAll('.sl-row.is-selected').forEach(r => { r.classList.remove('is-selected'); r.setAttribute('aria-selected', 'false'); });
  const row = list.querySelector(`#sl-r${n}`);
  if (!row) {
    input.removeAttribute('aria-activedescendant');
    preview.replaceChildren();
    return;
  }
  row.classList.add('is-selected');
  row.setAttribute('aria-selected', 'true');
  input.setAttribute('aria-activedescendant', row.id);
  if (scroll) row.scrollIntoView({ block: 'nearest' });
  showPreview(rows[n]);
}

function pretty(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showPreview(item) {
  const box = el('div', `sl-pv sl-pv--${(item.g || '').toLowerCase().replace(/\s+/g, '-')}`);
  box.append(icon(item, true));
  box.append(el('p', 'sl-pv-title', item.t));
  const meta = [item.egg || item.calc || item.g === 'Actions' ? '' : item.m, item.d ? pretty(item.d) : ''].filter(Boolean).join(' · ');
  if (meta) box.append(el('p', 'sl-pv-meta', meta));
  if (item.s) box.append(el('p', 'sl-pv-text', item.s));
  const url = item.go || item.u;
  const where = item.a || (item.x ? `Open ${new URL(url, location.href).hostname.replace(/^www\./, '')}` : 'Open');
  const hint = el('p', 'sl-pv-hint');
  hint.append(el('kbd', '', '↵'), document.createTextNode(` ${where}`));
  box.append(hint);
  preview.replaceChildren(box);
}

// ---------------------------------------------------------------- little extras

function toast(text) {
  const note = el('p', 'sl-toast', text);
  note.setAttribute('role', 'status');
  document.body.append(note);
  setTimeout(() => note.classList.add('is-out'), 2000);
  setTimeout(() => note.remove(), 2400);
}

// Copies text and says so, or shows the text itself if copying isn't allowed
async function copy(text, message) {
  toast((await copyText(text)) ? message : text);
}

// The seafoam egg: the whole page turns NoCode green for a moment
function wash(colour) {
  const layer = el('div', 'sl-wash');
  layer.style.background = colour;
  document.body.append(layer);
  layer.addEventListener('animationend', () => layer.remove());
  setTimeout(() => layer.remove(), 4000);   // in case the animation never runs
}

// The sudo egg: the window shakes its head
function shake() {
  if (lessMotion()) return;
  panel.animate([0, -10, 10, -7, 7, -3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: 'ease-out' });
}

// The dial-up egg: a 56k modem connecting, made in code with the Web Audio API
// (the browser's built-in synthesiser), so there's no sound file to download.
// Dial tones, the answer tone, then the famous screech, about four seconds.
function modem() {
  const ctx = unlockAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.05;
  const out = ctx.createGain();
  out.gain.value = 0.12;
  out.connect(ctx.destination);

  function tone(freq, start, length, type = 'sine', level = 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0 + start);
    gain.gain.linearRampToValueAtTime(level, t0 + start + 0.01);
    gain.gain.setValueAtTime(level, t0 + start + length - 0.01);
    gain.gain.linearRampToValueAtTime(0, t0 + start + length);
    osc.connect(gain).connect(out);
    osc.start(t0 + start);
    osc.stop(t0 + start + length + 0.02);
    return osc;
  }

  // 1. Dialling: touch-tone pairs for a phone number
  const KEYS = { 0: [941, 1336], 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477] };
  [...'01415550156'].forEach((digit, i) => {
    const [low, high] = KEYS[digit];
    tone(low, i * 0.1, 0.07, 'sine', 0.5);
    tone(high, i * 0.1, 0.07, 'sine', 0.5);
  });
  // 2. The other end answers: a long, high tone
  tone(2100, 1.35, 0.6, 'sine', 0.6);
  // 3. Handshake: two warbling tones
  for (let i = 0; i < 6; i++) tone(i % 2 ? 1200 : 2400, 2.0 + i * 0.07, 0.07, 'square', 0.25);
  // 4. The screech: hissing noise swept through a filter, with tones hopping about on top
  const length = 1.7;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 4;
  const start = t0 + 2.45;
  for (let s = 0; s < length; s += 0.05) filter.frequency.setValueAtTime(900 + Math.random() * 2600, start + s);
  const hiss = ctx.createGain();
  hiss.gain.setValueAtTime(0.9, start);
  hiss.gain.setValueAtTime(0.9, start + length - 0.3);
  hiss.gain.linearRampToValueAtTime(0, start + length);
  noise.connect(filter).connect(hiss).connect(out);
  noise.start(start);
  for (let s = 0; s < length - 0.3; s += 0.08) tone(1000 + Math.random() * 2000, 2.45 + s, 0.08, 'sawtooth', 0.12);
  toast('Connecting at 56k…');
}

// ---------------------------------------------------------------- opening it

function isTyping(target) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (dialog?.open) close();
    else open();
  } else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target) && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    open();
  }
});

// The 🔍 in the nav on phones (hidden on wider screens by styles.css)
const navButton = document.querySelector('.nav-search');
navButton?.addEventListener('click', open);
navButton?.addEventListener('pointerdown', () => { loadCSS(); loadIndex(); }, { passive: true });

// The ⌘K tile on the homepage: two keycaps. Clicking presses ⌘, then K, then opens Spotlight.
// A real keyboard presses them too: holding ⌘ (Ctrl on Windows) pushes the ⌘ key down.
const shortcut = document.querySelector('.tile--shortcut');
if (shortcut) {
  const [modKey, kKey] = shortcut.querySelectorAll('.kc-key');
  const press = (key, down) => key.classList.toggle('is-down', down);
  const apple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  if (!apple) {                       // Windows and Linux press Ctrl+K
    modKey.querySelector('.kc-cap').textContent = 'Ctrl';
    modKey.classList.add('is-word');
    shortcut.setAttribute('aria-keyshortcuts', 'Control+K');
  }
  let touched = false;
  shortcut.addEventListener('pointerdown', event => {
    touched = event.pointerType !== 'mouse';
    loadCSS();
    loadIndex();
  }, { passive: true });
  shortcut.addEventListener('click', () => {
    // On a phone, open straight away: the keyboard only comes up inside the tap itself
    if (touched || lessMotion()) return open();
    press(modKey, true);
    setTimeout(() => press(kKey, true), 140);
    setTimeout(() => { press(modKey, false); press(kKey, false); open(); }, 380);
  });
  document.addEventListener('keydown', event => {
    if (event.key === (apple ? 'Meta' : 'Control')) press(modKey, true);
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      press(kKey, true);
      setTimeout(() => press(kKey, false), 200);
    }
  });
  document.addEventListener('keyup', event => { if (event.key === 'Meta' || event.key === 'Control') press(modKey, false); });
  window.addEventListener('blur', () => { press(modKey, false); press(kKey, false); });
}

// Fetch the look straight away (a stylesheet added by a script doesn't hold up the page),
// so the first ⌘K opens instantly. Not "once the page is idle": a stylesheet arriving
// seconds later, in the middle of a click, stalled the contact card's Copy button in Chrome.
loadCSS();

// Arriving on the homepage from an action that needs it (Photo Booth, office hours, hello)
if (onHome) {
  const params = new URLSearchParams(location.search);
  const action = params.get('spotlight');
  if (action) {
    params.delete('spotlight');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    if (HOME_ACTIONS[action]) {
      const go = () => setTimeout(HOME_ACTIONS[action], 300);
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go, { once: true });
    }
  }
}
