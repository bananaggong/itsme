// Apple Notes-style About page: section links scroll the editor and track the
// visible note. On wide screens the toolbar button can collapse both sidebars.

import { scrollBehavior } from './utils.js?v=8c1091ee90';

const windowElement = document.querySelector('.notes-window');
const editor = document.querySelector('.note-editor');
const sectionRows = [...document.querySelectorAll('.note-row[href^="#"]')];
const sections = sectionRows
  .map(row => document.querySelector(row.getAttribute('href')))
  .filter(Boolean);
const sidebarToggle = document.querySelector('.notes-sidebar-toggle');
const composeButton = document.querySelector('.notes-compose');
const aboutDocument = document.querySelector('.note-document');
const draftEditor = document.querySelector('.note-draft');
const draftRow = document.querySelector('.note-row--draft');
const draftTitle = document.querySelector('.draft-title');
const draftBody = document.querySelector('.draft-body');
const draftBack = document.querySelector('.draft-back');
const noteCount = document.querySelector('.note-count');
const folderCount = document.querySelector('.folder-count');
const accountCount = document.querySelector('.notes-account small');
let draftCreated = false;

function selectRow(selected) {
  document.querySelectorAll('.note-row').forEach(row => row.classList.toggle('is-selected', row === selected));
}

function setNoteCount(count) {
  const label = `${count} ${count === 1 ? 'note' : 'notes'}`;
  if (noteCount) noteCount.textContent = label;
  if (folderCount) folderCount.textContent = count;
  if (accountCount) accountCount.textContent = label;
}

function showAbout(row, section) {
  if (!aboutDocument || !draftEditor) return;
  aboutDocument.hidden = false;
  draftEditor.hidden = true;
  selectRow(row);
  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  });
  history.replaceState(null, '', row.hash);
}

function showDraft({ focus = false } = {}) {
  if (!aboutDocument || !draftEditor || !draftRow) return;
  if (!draftCreated) {
    draftCreated = true;
    draftRow.hidden = false;
    setNoteCount(6);
    composeButton?.setAttribute('aria-label', 'Open temporary note');
  }
  aboutDocument.hidden = true;
  draftEditor.hidden = false;
  editor.scrollTop = 0;
  selectRow(draftRow);
  history.replaceState(null, '', location.pathname);
  if (focus) requestAnimationFrame(() => draftTitle?.focus());
}

sectionRows.forEach(row => {
  row.addEventListener('click', event => {
    const section = document.querySelector(row.hash);
    if (!section) return;
    event.preventDefault();
    showAbout(row, section);
  });
});

composeButton?.addEventListener('click', () => showDraft({ focus: true }));
draftRow?.addEventListener('click', () => showDraft({ focus: true }));
draftBack?.addEventListener('click', () => showAbout(sectionRows[0], sections[0]));

draftTitle?.addEventListener('input', () => {
  const title = draftTitle.value.trim() || 'New Note';
  draftRow.querySelector('strong').textContent = title;
});

draftBody?.addEventListener('input', () => {
  const excerpt = draftBody.innerText.trim().replace(/\s+/g, ' ');
  draftRow.querySelector('span').textContent = excerpt ? excerpt.slice(0, 90) : 'Start typing…';
});

if (editor && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible && draftEditor?.hidden) {
      const row = sectionRows.find(candidate => candidate.hash === `#${visible.target.id}`);
      if (row) selectRow(row);
    }
  }, { root: editor, rootMargin: '-12% 0px -62% 0px', threshold: [0, .2, .5] });

  sections.forEach(section => observer.observe(section));
}

if (sidebarToggle && windowElement) {
  sidebarToggle.addEventListener('click', () => {
    const hidden = windowElement.classList.toggle('is-sidebar-hidden');
    sidebarToggle.setAttribute('aria-expanded', String(!hidden));
    sidebarToggle.setAttribute('aria-label', hidden ? 'Show Notes sidebars' : 'Hide Notes sidebars');
  });
}
