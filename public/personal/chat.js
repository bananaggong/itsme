import { playChime, playSent } from '/message-sounds.js';
import { lessMotion, wait } from '/utils.js';
import { searchQuestions, suggestions } from './chat-model.js';

const windowEl = document.querySelector('.gc-window');
const thread = windowEl.querySelector('.ms-thread');
const chips = windowEl.querySelector('.ms-chips');
const input = windowEl.querySelector('.ms-input');
const picker = windowEl.querySelector('.gc-picker');
const results = windowEl.querySelector('.gc-results');
const prompt = windowEl.querySelector('.gc-prompt');
const browse = windowEl.querySelector('.gc-browse');
const lightbox = document.querySelector('.gc-lightbox');
const initial = thread.innerHTML;
let questions = [], busy = false, generation = 0, topic = '', current = null, photoFocus = null, composing = false;
const seen = new Set(), photos = new Set(), links = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
const button = (text, className, action) => {
  const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
};
const atBottom = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 90;
const scroll = () => thread.scrollTo({ top: thread.scrollHeight, behavior: 'instant' });
function append(node) { const follow = atBottom(); thread.append(node); if (follow) scroll(); }
function bubble(content, me = false) {
  const row = el('div', `ms-msg is-new ms-msg--${me ? 'me' : 'sam'}`);
  row.append(el('div', 'ms-bubble', content)); return row;
}
function syncBusy() {
  windowEl.querySelectorAll('[data-question]').forEach(node => { node.disabled = busy; });
  prompt.textContent = busy ? '광일이 입력 중…' : picker.hidden ? '궁금한 이야기를 골라보세요' : `${searchQuestions(questions, input.value, topic).length}개의 질문`;
}
function showSuggestions() {
  chips.replaceChildren();
  for (const q of suggestions(questions, current, seen)) chips.append(questionButton(q, 'ms-chip'));
  if (!chips.childElementCount) chips.append(button('다른 이야기 둘러보기', 'ms-chip', () => openPicker()));
  syncBusy();
}
function questionButton(q, className) {
  const node = button(q.question, className, () => ask(q)); node.dataset.question = q.id; node.disabled = busy; return node;
}
function renderResults() {
  const found = searchQuestions(questions, input.value, topic);
  results.replaceChildren();
  for (const q of found) {
    const li = el('li'), node = questionButton(q);
    node.append(el('small', '', seen.has(q.id) ? '다시 보기' : q.topic)); li.append(node); results.append(li);
  }
  if (!found.length) {
    const li = el('li', 'gc-no-results', '아직 그 질문은 없어요. 다른 단어로 찾아볼까요?');
    const contact = button('직접 메시지 남기기', 'gc-inline-contact', () => {}); contact.dataset.chatMessageOpen = ''; contact.setAttribute('aria-haspopup', 'dialog'); li.append(contact); results.append(li);
  }
  windowEl.querySelectorAll('.gc-topics button').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.topic === topic)));
  syncBusy();
}
function openPicker(selectedTopic = topic) {
  topic = selectedTopic; picker.hidden = false; chips.hidden = true; browse.textContent = '닫기'; browse.setAttribute('aria-expanded', 'true'); renderResults();
}
function closePicker() {
  picker.hidden = true; chips.hidden = false; browse.textContent = '모든 질문'; browse.setAttribute('aria-expanded', 'false'); syncBusy();
}
function showPhoto(answer, trigger) {
  photoFocus = trigger;
  lightbox.querySelector('img').src = answer.content;
  lightbox.querySelector('img').alt = answer.description;
  lightbox.querySelector('p').textContent = answer.description;
  lightbox.showModal();
}
lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => photoFocus?.focus());

function addAnswer(answer) {
  if (answer.type === 'text') { append(bubble(answer.content)); return; }
  const row = el('div', 'ms-msg ms-msg--sam is-new');
  if (answer.type === 'photo') {
    const node = button('', `gc-photo${answer.content.includes('/projects/') ? ' gc-photo--screen' : ''}`, () => showPhoto(answer, node));
    node.setAttribute('aria-label', `${answer.description} · 크게 보기`);
    const img = el('img'); img.src = answer.content; img.alt = answer.description; img.decoding = 'async';
    img.addEventListener('error', () => { img.hidden = true; node.disabled = true; node.append(el('small', '', '사진을 불러오지 못했어요.')); }, {once:true});
    node.append(img); if (answer.content.includes('/projects/')) node.append(el('small', '', answer.description));
    row.append(node);
    if (!photos.has(answer.content)) {
      photos.add(answer.content);
      windowEl.querySelector('.gc-shared-photos').previousElementSibling.hidden = true;
      const thumb = button('', '', () => showPhoto(answer, thumb));
      thumb.setAttribute('aria-label', `${answer.description} · 크게 보기`);
      const photo = img.cloneNode(); photo.loading = 'lazy'; thumb.append(photo); windowEl.querySelector('.gc-shared-photos').append(thumb);
    }
  } else {
    const isContact = new URL(answer.content, location.origin).hash === '#say-hello';
    const link = el(isContact ? 'button' : 'a', 'ms-bubble gc-reply-link');
    if (isContact) { link.type = 'button'; link.dataset.chatMessageOpen = ''; link.setAttribute('aria-haspopup','dialog'); }
    else { link.href = answer.content; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    link.append(el('span', '', answer.description), el('span', '', '↗'));
    row.append(link);
    if (!links.has(answer.content)) {
      links.add(answer.content);
      const list = windowEl.querySelector('.gc-shared-links'); list.querySelector('.gc-empty')?.remove();
      const li = el('li'), copy = link.cloneNode(true); copy.className = ''; li.append(copy); list.append(li);
    }
  }
  append(row);
}
async function ask(q) {
  if (busy) return;
  busy = true; current = q; const run = generation;
  input.value = ''; topic = ''; closePicker(); syncBusy();
  thread.querySelector('.gc-delivered')?.remove();
  thread.append(bubble(q.question, true));
  const receipt = el('div', 'ms-delivered gc-delivered', '전달됨'); thread.append(receipt); scroll();
  playSent();
  for (const answer of q.answers) {
    const typing = el('div', 'ms-msg ms-msg--sam'); typing.setAttribute('aria-hidden', 'true');
    const dots = el('div', 'ms-bubble ms-typing'); for (let i=0;i<3;i++) dots.append(el('span')); typing.append(dots); append(typing);
    await wait(lessMotion() ? 0 : Math.min(1150, 400 + answer.content.length * 9));
    typing.remove();
    if (run !== generation) return;
    addAnswer(answer);
    await wait(lessMotion() ? 0 : 160);
    if (run !== generation) return;
  }
  seen.add(q.id); busy = false; playChime(); showSuggestions();
  // The selected question disappears: return keyboard focus to the next choices.
  if (picker.hidden && document.activeElement !== input && !document.querySelector('dialog[open]')) chips.querySelector('button')?.focus({ preventScroll:true });
}

browse.addEventListener('click', () => { if (picker.hidden) openPicker(); else { input.value = ''; topic = ''; closePicker(); } });
input.addEventListener('input', () => { if (input.value.trim()) openPicker(''); else { topic = ''; closePicker(); } });
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', event => {
  if (event.isComposing || composing || event.keyCode === 229) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); openPicker(); results.querySelector('button:not(:disabled)')?.focus(); }
});
windowEl.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.isComposing && !composing && !picker.hidden) {
    event.preventDefault(); input.value = ''; topic = ''; closePicker(); input.focus();
  }
});
windowEl.querySelector('form').addEventListener('submit', event => { event.preventDefault(); if (composing) return; openPicker(); results.querySelector('button:not(:disabled)')?.focus(); });
windowEl.querySelector('.gc-reset').addEventListener('click', () => {
  generation++; busy = false; current = null; seen.clear(); photos.clear(); links.clear();
  thread.innerHTML = initial; input.value = ''; topic = '';
  windowEl.querySelector('.gc-shared-photos').replaceChildren(); windowEl.querySelector('.gc-shared-photos').previousElementSibling.hidden = false;
  windowEl.querySelector('.gc-shared-links').replaceChildren(el('li', 'gc-empty', '함께 본 링크를 다시 찾을 수 있어요.'));
  closePicker(); showSuggestions(); thread.scrollTop = 0;
});

async function load() {
  try {
    const response = await fetch(windowEl.dataset.chatData);
    if (!response.ok) throw new Error('Chat data unavailable');
    const data = await response.json(); questions = data.questions;
    if (!Array.isArray(questions) || !questions.length) throw new Error('Empty questions');
    const topics = [...new Set(questions.map(q => q.topic))];
    const group = windowEl.querySelector('.gc-topics');
    for (const label of ['', ...topics]) { const node = button(label || '전체', '', () => openPicker(label)); node.dataset.topic = label; node.setAttribute('aria-pressed', String(!label)); group.append(node); }
    const categories = windowEl.querySelector('.gc-categories');
    for (const label of topics) { const node = button(label, '', () => { input.value = ''; openPicker(label); input.focus(); }); categories.append(node); }
    showSuggestions();
  } catch {
    prompt.textContent = '질문을 불러오지 못했어요.';
    chips.append(button('다시 불러오기', 'ms-chip', () => { chips.replaceChildren(); load(); }));
  }
}
load();
