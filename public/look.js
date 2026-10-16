// Which picture of Sam the site shows. Once a visitor asks Siri to turn Sam into a Memoji
// (the portrait tile on the homepage, memoji.js), every picture of Sam on every page shows
// the Memoji instead, until they ask Siri to change him back. The choice is remembered in
// this browser only (localStorage), like the light/dark choice.
//
// Loaded on every page. Import it as './look.js' everywhere, so there's only one copy.
// It finds Sam's pictures by their file names, so a new page with his photo or pixel
// portrait on it is covered automatically.

import { readStorage, writeStorage } from './utils.js?v=8c1091ee90';

export const MEMOJI = '/assets/sam-memoji.webp';
const KEY = 'sam-look';
const PICTURES = 'img[src^="/assets/sam-photo"], img[src^="/assets/sam-portrait"], img[data-sam-src]';

// 'memoji' or 'pixel' (the default)
export function savedLook() {
  return readStorage(KEY) === 'memoji' ? 'memoji' : 'pixel';
}

// Remember the look, and switch every picture on this page to match
export function setLook(look) {
  writeStorage(KEY, look === 'memoji' ? 'memoji' : null);   // if it can't be saved, it still changes on this page
  showLook(look);
}

function showLook(look) {
  for (const img of document.querySelectorAll(PICTURES)) {
    if (img.closest('.tile--avatar')) continue; // the homepage portrait tile has its own scene (memoji.js)
    if (look === 'memoji' && !img.dataset.samSrc) {
      img.dataset.samSrc = img.getAttribute('src');   // keep the original to swap back to
      img.dataset.samAlt = img.alt;
      img.src = MEMOJI;
      img.alt = img.alt.replace(/pixel-art portrait/i, 'Memoji');
      img.style.imageRendering = 'auto';                // smooth, not the pixel art's blocky scaling
    } else if (look === 'pixel' && img.dataset.samSrc) {
      img.src = img.dataset.samSrc;
      img.alt = img.dataset.samAlt;
      delete img.dataset.samSrc;
      delete img.dataset.samAlt;
      img.style.imageRendering = '';
    }
  }
}

if (savedLook() === 'memoji') showLook('memoji');
