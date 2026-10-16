// The Books page (/books): topic filters, and a card for each book with its summary,
// Sam's rating, readers' ratings and a Buy on Amazon link. The page is built by
// tools/build_books.py; readers' ratings are saved by worker/index.js (/api/ratings).
// Without this script every cover is a plain link to the book on Amazon, so it still works.

import { readJSON, writeJSON } from './utils.js?v=8c1091ee90';

const books = JSON.parse(document.getElementById('bk-data').textContent);
const shelf = document.querySelector('.bk-shelf');
const card = document.querySelector('.bk-card');
const star = document.getElementById('bk-star');

// ---------- Topic filters: show only that topic's books ----------
const chips = [...document.querySelectorAll('.bk-filters [data-topic]')];
for (const chip of chips) {
  chip.addEventListener('click', () => {
    const topic = chip.dataset.topic;
    for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
    for (const book of shelf.querySelectorAll('.bk-book')) {
      book.hidden = topic !== '' && book.dataset.topic !== topic;
    }
  });
}

// ---------- A book's card ----------
const $ = selector => card.querySelector(selector);

function stars(rating) {
  const box = $('.bk-card-rating .bk-stars');
  box.replaceChildren(...[1, 2, 3, 4, 5].map(i => {
    const svg = star.content.firstElementChild.cloneNode(true);
    svg.classList.toggle('is-on', i <= rating);
    return svg;
  }));
  box.setAttribute('aria-label', `${rating} out of 5`);
}

function cover(book) {
  const box = document.createElement('span');
  box.className = 'bk-cover';
  if (book.cover) {
    const img = document.createElement('img');
    img.src = book.cover;
    img.alt = `Cover of ${book.title}`;
    box.append(img);
  } else {
    // No cover picture yet: a plain drawn one, like on the shelf
    box.classList.add('bk-cover--drawn');
    const part = (cls, text) => Object.assign(document.createElement('span'), { className: cls, textContent: text });
    box.append(part('bk-drawn-title', book.title));
    if (book.subtitle) box.append(part('bk-drawn-sub', book.subtitle));
    box.append(part('bk-drawn-author', book.author));
  }
  return box;
}

function show(book) {
  $('.bk-card-cover').replaceChildren(cover(book));
  $('.bk-card-topic').textContent = book.topic;
  $('.bk-card-title').textContent = book.title;
  $('.bk-card-sub').textContent = book.subtitle;
  $('.bk-card-sub').hidden = !book.subtitle;
  $('.bk-card-author').textContent = book.author;
  $('.bk-card-summary').textContent = book.summary;
  stars(book.rating);
  $('.bk-card-score').textContent = `${book.rating} / 5`;
  $('.bk-buy').href = book.amazon;
  current = book;
  showReaders();
  card.showModal();
}

let opener = null;
let current = null;   // the book whose card is open
for (const link of shelf.querySelectorAll('.bk-link')) {
  link.setAttribute('aria-haspopup', 'dialog');
}
shelf.addEventListener('click', event => {
  const link = event.target.closest('.bk-link');
  // Cmd/Ctrl/Shift-click still opens Amazon in a new tab, like any link
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = link;
  show(books[Number(link.dataset.book)]);
});

$('.bk-close').addEventListener('click', () => card.close());
// A click on the dimmed page around the card (the <dialog> itself, outside its contents) closes it
card.addEventListener('click', event => { if (event.target === card) card.close(); });
// Back to the book that was opened, so keyboard users keep their place on the shelf
card.addEventListener('close', () => opener?.focus());

// ---------- Readers' ratings ----------

// Saved in this browser: a random ID (so rating a book again changes the rating rather than
// adding another) and the visitor's own ratings (so their stars stay lit when they come back).
// Private windows may refuse to save; then ratings just aren't remembered.
//
// The ID is also kept in memory for this visit, so a browser that refuses to save still
// sends one ID throughout. Minting a fresh one per click would count each click as a
// separate reader and inflate the book's average and number of ratings.
let voter = null;
function voterId() {
  if (!voter) {
    voter = readJSON('bk-voter', null) || crypto.randomUUID();
    writeJSON('bk-voter', voter);
  }
  return voter;
}
const mine = readJSON('bk-mine', {});   // { slug: stars }

let readers = null;   // { slug: { average, count } } once loaded; stays null if they can't be
const readersBox = $('.bk-readers');
const readersText = $('.bk-readers-text');
const rateStars = [...card.querySelectorAll('.bk-rate-star')];

const plural = n => `${n} rating${n === 1 ? '' : 's'}`;
function summary(slug) {
  const r = readers?.[slug];
  return r?.count ? `Readers: ${r.average.toFixed(1)} from ${plural(r.count)}.` : 'No reader ratings yet. Be the first.';
}

function light(stars) {
  rateStars.forEach((button, i) => {
    button.classList.toggle('is-on', i < stars);
    button.setAttribute('aria-pressed', String(i + 1 === stars));
  });
}

function showReaders() {
  readersBox.hidden = readers === null;
  if (!current || readers === null) return;
  light(mine[current.slug] || 0);
  readersText.textContent = summary(current.slug);
}

fetch('/api/ratings', { headers: { Accept: 'application/json' } })
  .then(response => (response.ok ? response.json() : null))
  .then(data => {
    if (!data?.ratings) return;
    readers = data.ratings;
    showReaders();
  })
  .catch(() => { /* no ratings today: the card just doesn't offer them */ });

for (const button of rateStars) {
  button.addEventListener('click', async () => {
    const book = current;
    const stars = Number(button.dataset.stars);
    const before = mine[book.slug] || 0;
    light(stars);
    readersText.textContent = 'Saving…';
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ book: book.slug, stars, voter: voterId() }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message);
      mine[book.slug] = stars;
      writeJSON('bk-mine', mine);
      readers[book.slug] = { average: result.average, count: result.count };
      if (current === book) readersText.textContent = `Thanks, you gave it ${stars} out of 5. ${summary(book.slug)}`;
    } catch {
      if (current === book) {
        light(before);
        readersText.textContent = 'Sorry, that didn’t save. Please try again.';
      }
    }
  });
}

// ---------- Opening a book from its address ----------
// /books/#atomic-habits opens that book's card. Spotlight (spotlight.js) links to books this way.
function openFromHash() {
  const i = books.findIndex(b => `#${b.slug}` === location.hash);
  if (i < 0) return;
  opener = shelf.querySelector(`[data-book="${i}"]`);
  opener?.scrollIntoView({ block: 'center' });
  if (!card.open) show(books[i]);
  else if (current !== books[i]) { card.close(); show(books[i]); }
}
openFromHash();
window.addEventListener('hashchange', openFromHash);
