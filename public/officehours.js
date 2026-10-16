// Office hours tile, styled as the Calendar "Up Next" widget: show today's weekday
// (in red) and date, like the real widget. Uses the visitor's own clock, so it's their today.
// Without this script the heading just reads "Office hours".
//
// Booking: pressing the open slot (or anywhere else on the tile) opens a picker of the next
// three weekdays. Each day is an email link with that day in the subject. Picking one shows
// a tick ("requested") for a moment, then opens the email.

import { lessMotion } from './utils.js?v=8c1091ee90';

const tile = document.querySelector('.tile--office');

if (tile) {
  const today = new Date();
  tile.querySelector('.ch-weekday').textContent = today.toLocaleDateString('en-GB', { weekday: 'long' });
  const date = tile.querySelector('.ch-date');
  date.textContent = today.getDate();
  date.hidden = false;

  const slot = tile.querySelector('.ch-event--open');
  const button = slot.querySelector('.ch-slot');
  const title = slot.querySelector('.ch-title');
  const status = slot.querySelector('.ch-status');
  const days = slot.querySelector('.ch-days');
  const announcer = tile.querySelector('[aria-live]');
  const email = tile.dataset.email;

  // The next three weekdays after today, skipping the weekend
  const upcoming = [];
  for (const day = new Date(today); upcoming.length < 3;) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() !== 0 && day.getDay() !== 6) upcoming.push(new Date(day));
  }

  for (const day of upcoming) {
    const long = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const subject = `Office hours: ${long} (via samdickie.me)`;
    const body = `Hi Sam,\n\nI'd like the open slot on ${long}. Here's what I'm working on:\n\n`;
    const link = document.createElement('a');
    link.className = 'ch-day';
    link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    link.setAttribute('aria-label', `Email Sam to book ${long}`);
    link.innerHTML = `<span class="ch-day-name">${day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>`
      + `<span class="ch-day-num">${day.getDate()}</span>`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      request(day, link.href);
    });
    days.firstElementChild.append(link);
  }

  const setOpen = (open) => {
    slot.classList.toggle('is-open', open);
    tile.classList.toggle('is-picking', open);
    button.setAttribute('aria-expanded', open);
    days.inert = !open;   // closed, its days can't be tabbed to
  };
  const isOpen = () => slot.classList.contains('is-open');

  // Show the day as requested, then open the email. The pause lets the tick be seen first.
  const request = (day, href) => {
    setOpen(false);
    slot.classList.add('is-sent');
    title.textContent = `${day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} requested`;
    status.textContent = 'Sam will reply by email';
    announcer.textContent = `${title.textContent}. Your email app will open to send the request.`;
    button.focus();
    setTimeout(() => { window.location.href = href; }, lessMotion() ? 0 : 700);
  };

  button.addEventListener('click', () => setOpen(!isOpen()));

  // The rest of the tile works as a big button too (the booked events, date, arrow...)
  tile.addEventListener('click', (event) => {
    if (!event.target.closest('a, button')) setOpen(!isOpen());
  });

  // Close on Escape, or on a click anywhere outside the tile
  tile.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (isOpen() && !tile.contains(event.target)) setOpen(false);
  });
}
