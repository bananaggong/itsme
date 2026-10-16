// A small red "unread" dot on the Newsletter link in the nav, like an iPhone app badge.
// It shows until the visitor opens the Newsletter page (remembered in their browser),
// and comes back when a newer issue is published. Loaded on every page with the nav.
// The dot's look is .nav-link.has-news in styles.css.

// The newest issue's date. tools/build_newsletter.py updates this line when it builds the
// Newsletter page, so publishing an issue and running it brings the dot back for everyone.
const LATEST = '2026-09-03';

const KEY = 'newsletter-seen'; // the newest issue date this visitor has seen

function seen() {
  try { return localStorage.getItem(KEY) || ''; } catch { return LATEST; } // storage blocked: don't nag
}

const link = document.querySelector('.nav .nav-link[href="/newsletter/"]');

if (location.pathname.startsWith('/newsletter/')) {
  try { localStorage.setItem(KEY, LATEST); } catch {}
} else if (link && seen() < LATEST) {  // dates as YYYY-MM-DD compare correctly as text
  link.classList.add('has-news');
  const note = document.createElement('span');
  note.className = 'sr-only';
  note.textContent = ' (new issue)'; // screen readers hear "Newsletter (new issue)"
  link.append(note);
}
