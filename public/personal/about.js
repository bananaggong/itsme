// Keep the Notes design and content; coordinate its section navigation in one place.
import { scrollBehavior } from '../utils.js?v=8c1091ee90';

const windowElement = document.querySelector('.notes-window');
const editor = document.querySelector('.note-editor');
const sectionRows = [...document.querySelectorAll('.note-row[href^="#"]')];
const mobileLinks = [...document.querySelectorAll('.notes-mobile-nav a')];
const sections = sectionRows.map(row => document.getElementById(row.hash.slice(1)));
const legacySections = { '#background': '#experience', '#current-role': '#experience', '#how-i-work': '#skills', '#interests': '#about' };
const sidebarToggle = document.querySelector('.notes-sidebar-toggle');
const composeButton = document.querySelector('.notes-compose');
const aboutDocument = document.querySelector('.note-document');
const draftEditor = document.querySelector('.note-draft');
const draftRow = document.querySelector('.note-row--draft');
const draftTitle = document.querySelector('.draft-title');
const draftBody = document.querySelector('.draft-body');
let draftCreated = false;
let movement = null;
let syncFrame = 0;
let restoreFrame = 0;
let saveTimer = 0;
let interacted = false;
const previousRestoration = history.scrollRestoration;
history.scrollRestoration = 'manual';

function context() {
  const internal = getComputedStyle(editor).overflowY !== 'visible';
  const scroller = internal ? editor : document.scrollingElement;
  return { internal, scroller, position: scroller.scrollTop,
    max: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    origin: internal ? editor.getBoundingClientRect().top + editor.clientTop : 0 };
}

function selectRow(selected) {
  mobileLinks.forEach(link => {
    if (link.hash === selected?.hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.note-row').forEach(row => {
    row.classList.toggle('is-selected', row === selected);
    if (row === selected) row.setAttribute('aria-current', 'location');
    else row.removeAttribute('aria-current');
  });
}

function writeLocation(row, mode, position = context().position) {
  const view = context();
  const id = row?.hash?.slice(1) || null;
  const state = { ...history.state, aboutNavigation: { id, position, internal: view.internal, width: innerWidth } };
  const url = location.pathname + location.search + (id ? `#${id}` : '');
  const method = mode === 'push' && location.hash !== (id ? `#${id}` : '') ? 'pushState' : 'replaceState';
  history[method](state, '', url);
}

function savePosition() {
  clearTimeout(saveTimer);
  if (movement) return;
  const row = draftEditor.hidden ? sectionRows.find(item => item.classList.contains('is-selected')) : null;
  writeLocation(row, 'replace');
}

function stopMovement() {
  if (!movement) return;
  cancelAnimationFrame(movement.frame);
  const { scroller } = context();
  movement = null;
  scroller.scrollTo({ top: scroller.scrollTop, behavior: 'instant' });
}

function synchronize() {
  syncFrame = 0;
  if (movement || !draftEditor.hidden || !sections.length) return;
  const view = context();
  const marker = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) + 24;
  let index = 0;
  if (view.max > 0 && view.position >= view.max - 2) index = sections.length - 1;
  else if (view.position > 2) sections.forEach((section, i) => {
    if (section.getBoundingClientRect().top - view.origin <= marker) index = i;
  });
  const row = sectionRows[index];
  selectRow(row);
  if (location.hash !== row.hash) writeLocation(row, 'replace');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePosition, 160);
}

function queueSync() {
  if (restoreFrame) return;
  if (!syncFrame) syncFrame = requestAnimationFrame(synchronize);
}

function showAbout(row, { mode = 'push', instant = false, saved = null } = {}) {
  clearTimeout(saveTimer);
  if (mode === 'push' && !movement) savePosition();
  stopMovement();
  aboutDocument.hidden = false;
  draftEditor.hidden = true;
  selectRow(row);
  const index = sectionRows.indexOf(row);
  const section = sections[index];
  const view = context();
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const sectionTop = index === 0 ? 0 : view.position + section.getBoundingClientRect().top - view.origin - margin;
  const savedFits = saved?.id === section.id && saved.internal === view.internal && saved.width === innerWidth;
  const target = Math.max(0, Math.min(view.max, savedFits ? saved.position : sectionTop));
  writeLocation(row, mode, target);
  const motion = { frame: 0, target, started: performance.now(), previous: view.position, stable: 0 };
  movement = motion;
  view.scroller.scrollTo({ top: target, behavior: instant ? 'instant' : scrollBehavior() });
  function finishWhenSettled(now) {
    if (movement !== motion) return;
    const position = context().position;
    motion.stable = Math.abs(position - motion.previous) < .1 ? motion.stable + 1 : 0;
    motion.previous = position;
    if (Math.abs(position - target) <= 1 || (now - motion.started > 180 && motion.stable >= 6) || now - motion.started > 2000) {
      movement = null;
      // Retain the clicked section when the last heading cannot reach the top.
      writeLocation(row, 'replace', position);
      return;
    }
    motion.frame = requestAnimationFrame(finishWhenSettled);
  }
  motion.frame = requestAnimationFrame(finishWhenSettled);
}

function showDraft({ focus = false, mode = 'push' } = {}) {
  if (mode === 'push' && !movement) savePosition();
  stopMovement();
  clearTimeout(saveTimer);
  if (!draftCreated) {
    draftCreated = true;
    draftRow.hidden = false;
    const count = sectionRows.length + 1;
    document.querySelector('.note-count').textContent = `${count} notes`;
    document.querySelector('.folder-count').textContent = String(count);
    document.querySelector('.notes-account small').textContent = `${count} notes`;
    composeButton?.setAttribute('aria-label', 'Open temporary note');
  }
  aboutDocument.hidden = true;
  draftEditor.hidden = false;
  selectRow(draftRow);
  const view = context();
  view.scroller.scrollTo({ top: 0, behavior: 'instant' });
  writeLocation(null, mode, 0);
  if (focus) draftTitle?.focus({ preventScroll: true });
}

function restoreLocation() {
  const hash = location.hash;
  const saved = history.state?.aboutNavigation;
  clearTimeout(saveTimer);
  stopMovement();
  cancelAnimationFrame(syncFrame);
  syncFrame = 0;
  cancelAnimationFrame(restoreFrame);
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = 0;
    if (saved?.id === null && draftCreated && !hash) showDraft({ mode: 'replace' });
    else showAbout(sectionRows.find(row => row.hash === (legacySections[hash] || hash)) || sectionRows[0], { mode: 'replace', instant: true, saved });
    // Native fragment restoration may also scroll the outer page on a short desktop.
    if (context().internal) window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

[...sectionRows, ...mobileLinks].forEach(link => link.addEventListener('click', event => {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  interacted = true;
  cancelAnimationFrame(restoreFrame);
  restoreFrame = 0;
  showAbout(sectionRows.find(row => row.hash === link.hash));
}));

function interrupt() {
  interacted = true;
  stopMovement();
  queueSync();
}
for (const name of ['wheel', 'touchstart', 'pointerdown']) editor.addEventListener(name, interrupt, { passive: true });
editor.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !event.target.closest('input,textarea,[contenteditable="true"]')) interrupt();
});
editor.addEventListener('scroll', queueSync, { passive: true });
window.addEventListener('scroll', () => { if (!context().internal) queueSync(); }, { passive: true });
window.addEventListener('popstate', restoreLocation);
window.addEventListener('hashchange', restoreLocation);
let internalScroll = context().internal;
window.addEventListener('resize', () => {
  const changedScroller = context().internal !== internalScroll;
  internalScroll = context().internal;
  if (draftEditor.hidden && (movement || changedScroller)) showAbout(sectionRows.find(row => row.classList.contains('is-selected')), { mode: 'replace', instant: true });
  else queueSync();
});
window.addEventListener('pagehide', () => { clearTimeout(saveTimer); history.scrollRestoration = previousRestoration; });
window.addEventListener('pageshow', event => { history.scrollRestoration = 'manual'; if (event.persisted) restoreLocation(); });
composeButton?.addEventListener('click', () => showDraft({ focus: true }));
draftRow?.addEventListener('click', () => showDraft({ focus: true }));
document.querySelector('.draft-back')?.addEventListener('click', () => showAbout(sectionRows[0]));
draftTitle?.addEventListener('input', () => { draftRow.querySelector('strong').textContent = draftTitle.value.trim() || 'New Note'; });
draftBody?.addEventListener('input', () => { draftRow.querySelector('span').textContent = draftBody.innerText.trim().replace(/\s+/g, ' ').slice(0, 90) || 'Start typing…'; });
sidebarToggle?.addEventListener('click', () => {
  const hidden = windowElement.classList.toggle('is-sidebar-hidden');
  sidebarToggle.setAttribute('aria-expanded', String(!hidden));
  sidebarToggle.setAttribute('aria-label', hidden ? 'Show Notes sidebars' : 'Hide Notes sidebars');
});

restoreLocation();
document.fonts.ready.then(() => { if (!interacted) restoreLocation(); });
