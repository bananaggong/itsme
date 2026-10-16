// The Old site page (projects/old-site/): screenshots of the old samdickie.me in a Safari window.
//
// assets/old-site/pages.json (made by tools/build_old_site.py) lists every old page: its
// screenshot slices, and a box for each link on it saying where the link went. This script
// shows one page at a time and lays invisible links over those boxes, so clicking the
// screenshot works like clicking the real page. The window's Back and Forward buttons use
// the browser's own history, and each page has its own address (?page=/about).

import { lessMotion, scrollBehavior } from './utils.js?v=8c1091ee90';

const win = document.querySelector('.os-window');
const view = win.querySelector('.os-view');
const sheet = win.querySelector('.os-page');
const sidebar = win.querySelector('.os-sidebar');
const overview = win.querySelector('.os-overview');
const status = win.querySelector('.os-status');
const backButton = win.querySelector('.os-back');
const forwardButton = win.querySelector('.os-forward');
const sidebarToggle = win.querySelector('.os-sidebar-toggle');
const overviewToggle = win.querySelector('.os-overview-toggle');
const narrow = matchMedia('(max-width: 760px)');

const { width: WIDTH, pages } = await fetch(win.dataset.src).then(r => r.json());
const byPath = new Map(pages.map(p => [p.path, p]));
const home = pages[0];

let current = null;
let step = 0;        // how many pages into this visit we are (history.state.os)
let furthest = 0;    // the furthest step, so Forward knows if there's somewhere to go
let hintTimer;

const pathFromAddress = () => new URLSearchParams(location.search).get('page');
const addressFor = path => `?page=${path}`;
const pct = (n, of) => `${(n / of) * 100}%`;
const shortUrl = url => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

// ---------------------------------------------------------------- showing a page

function show(path, { jump } = {}) {
  const page = byPath.get(path) || home;
  current = page;

  // The screenshot, in slices that load as they scroll into view
  const frame = document.createElement('div');
  frame.className = 'os-shot';
  frame.style.aspectRatio = `${WIDTH} / ${page.height}`;
  page.slices.forEach((height, i) => {
    const img = new Image(WIDTH, height);
    img.src = `/assets/old-site/${page.slug}-${i}.webp`;
    img.alt = i === 0 ? `The old ${page.name} page, as saved on ${page.date}` : '';
    img.decoding = 'async';
    if (i > 0) img.loading = 'lazy';
    frame.append(img);
  });

  // An invisible link over each link in the screenshot
  for (const link of page.links) {
    const a = document.createElement('a');
    a.className = 'os-link';
    Object.assign(a.style, {
      left: pct(link.x, WIDTH), top: pct(link.y, page.height),
      width: pct(link.w, WIDTH), height: pct(link.h, page.height),
    });
    if (link.to) {
      a.href = addressFor(link.to);
      a.dataset.to = link.to;
      a.dataset.status = `samdickie.me${link.to === '/' ? '' : link.to}`;
    } else if (link.jump !== undefined) {
      a.href = addressFor(page.path);
      a.dataset.jump = link.jump;
      a.dataset.status = 'Jump down this page';
    } else {
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      const original = link.url.replace(/^https:\/\/web\.archive\.org\/web\/\d+\//, '');
      a.dataset.status = `${shortUrl(original)}  ·  opens in the Wayback Machine`;
    }
    a.setAttribute('aria-label', link.label || a.dataset.status);
    frame.append(a);
  }
  sheet.replaceChildren(frame);

  // The toolbar: address, date saved, and a link to the Wayback Machine's copy
  win.querySelector('.os-path').textContent = page.path === '/' ? '' : page.path;
  win.querySelector('.os-date').textContent = page.date;
  win.querySelector('.os-wayback').href = page.wayback;
  document.title = `${page.name} · The old site | Sam Dickie`;

  // The sidebar: highlight this page, and open its folder
  for (const a of sidebar.querySelectorAll('.os-bookmark')) {
    const here = a.dataset.path === page.path;
    a.toggleAttribute('aria-current', here);
    if (here) {
      a.setAttribute('aria-current', 'page');
      a.closest('details').open = true;
      const top = a.offsetTop;    // the sidebar is position: relative, so this is from its top
      if (top < sidebar.scrollTop || top > sidebar.scrollTop + sidebar.clientHeight - 40) {
        sidebar.scrollTop = top - sidebar.clientHeight / 3;
      }
    }
  }

  backButton.disabled = step === 0;
  forwardButton.disabled = step >= furthest;
  view.scrollTop = jump ? jumpOffset(jump) : 0;
  loading(frame.querySelector('img'));
}

const jumpOffset = y => (y / current.height) * sheet.offsetHeight;

// Safari's blue loading bar under the address, then a quick flash of every link on the
// page so visitors can see the screenshot is clickable
function loading(firstSlice) {
  win.classList.remove('is-loaded', 'is-hinting');
  win.classList.add('is-loading');
  const done = () => {
    win.classList.replace('is-loading', 'is-loaded');
    clearTimeout(hintTimer);
    win.classList.add('is-hinting');
    hintTimer = setTimeout(() => win.classList.remove('is-hinting'), lessMotion() ? 1200 : 1600);
  };
  if (firstSlice.complete) {
    requestAnimationFrame(done);
  } else {
    firstSlice.addEventListener('load', done, { once: true });
    firstSlice.addEventListener('error', done, { once: true });
  }
}

// ---------------------------------------------------------------- moving around

function go(path, options) {
  if (path === current?.path && !options?.jump) {
    view.scrollTo({ top: 0, behavior: scrollBehavior() });
    return;
  }
  step += 1;
  furthest = step;
  history.pushState({ os: step }, '', addressFor(path));
  show(path, options);
}

addEventListener('popstate', event => {
  step = event.state?.os ?? 0;
  show(pathFromAddress() || home.path);
});

backButton.addEventListener('click', () => history.back());
forwardButton.addEventListener('click', () => history.forward());

// Clicks on the screenshot's links
sheet.addEventListener('click', event => {
  const a = event.target.closest('.os-link');
  if (!a || event.metaKey || event.ctrlKey || event.shiftKey) return;
  if (a.dataset.to) {
    event.preventDefault();
    go(a.dataset.to);
  } else if (a.dataset.jump) {
    event.preventDefault();
    view.scrollTo({ top: jumpOffset(+a.dataset.jump), behavior: scrollBehavior() });
  }
});

// Safari's status bar: where a link goes, bottom left, while it's hovered or focused
function showStatus(event) {
  const a = event.target.closest('.os-link');
  status.textContent = a ? a.dataset.status : '';
  status.classList.toggle('is-shown', !!a);
}
sheet.addEventListener('pointerover', showStatus);
sheet.addEventListener('focusin', showStatus);
sheet.addEventListener('pointerleave', () => status.classList.remove('is-shown'));
sheet.addEventListener('focusout', () => status.classList.remove('is-shown'));

// ---------------------------------------------------------------- bookmarks sidebar

function setSidebar(open) {
  win.classList.toggle('is-sidebar-hidden', !open);
  sidebarToggle.setAttribute('aria-expanded', open);
  sidebarToggle.setAttribute('aria-label', open ? 'Hide bookmarks' : 'Show bookmarks');
  sidebar.inert = !open;
}
sidebarToggle.addEventListener('click', () => setSidebar(win.classList.contains('is-sidebar-hidden')));

sidebar.addEventListener('click', event => {
  const a = event.target.closest('.os-bookmark');
  if (!a || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  go(a.dataset.path);
  if (narrow.matches) setSidebar(false);    // on a phone it covers the page, so get it out of the way
});

// ---------------------------------------------------------------- tab overview: every page at once

function buildOverview() {
  const inner = overview.querySelector('.os-overview-inner');
  const groups = new Map();
  for (const p of pages) groups.set(p.group, [...(groups.get(p.group) || []), p]);
  for (const [name, items] of groups) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'os-cards';
    for (const p of items) {
      const card = document.createElement('a');
      card.className = 'os-card';
      card.href = addressFor(p.path);
      card.dataset.path = p.path;
      const thumb = new Image(480, 300);
      thumb.src = `/assets/old-site/thumbs/${p.slug}.webp`;
      thumb.alt = '';
      thumb.loading = 'lazy';
      const title = document.createElement('strong');
      title.textContent = p.name;
      const date = document.createElement('span');
      date.textContent = p.date;
      card.append(thumb, title, date);
      grid.append(card);
    }
    section.append(heading, grid);
    inner.append(section);
  }
}

function setOverview(open) {
  if (open && !overview.querySelector('.os-card')) buildOverview();
  overview.hidden = !open;
  win.classList.toggle('is-overview', open);
  overviewToggle.setAttribute('aria-expanded', open);
  overviewToggle.setAttribute('aria-label', open ? 'Hide all pages' : 'Show all pages');
  if (open) {
    const here = overview.querySelector(`.os-card[data-path="${CSS.escape(current.path)}"]`);
    overview.querySelectorAll('.os-card').forEach(c => c.toggleAttribute('aria-current', c === here));
    here?.setAttribute('aria-current', 'page');
    // Scroll the overview (not the whole page) so this page's card is in view
    if (here) overview.scrollTop = here.offsetTop - overview.clientHeight / 3;
    here?.focus({ preventScroll: true });
  }
}
overviewToggle.addEventListener('click', () => setOverview(overview.hidden));

overview.addEventListener('click', event => {
  const card = event.target.closest('.os-card');
  if (!card || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  setOverview(false);
  go(card.dataset.path);
  view.focus({ preventScroll: true });
});

win.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overview.hidden) {
    setOverview(false);
    overviewToggle.focus();
  }
});

// ---------------------------------------------------------------- start

step = history.state?.os ?? 0;
furthest = step;
history.replaceState({ os: step }, '');
if (narrow.matches) setSidebar(false);
show(pathFromAddress() || home.path);
