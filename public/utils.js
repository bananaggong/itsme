// Small helpers shared by the site's scripts.
//
// Import it as './utils.js' everywhere (publishing adds the version to the address).

// ---------- Movement ----------

const lessMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

// True if the visitor has asked their device for less movement ("reduce motion").
// Checked each time, so changing the setting takes effect without a reload.
export const lessMotion = () => lessMotionQuery.matches;

// For scrollIntoView / scrollTo: glide there, or jump for people who want less movement
export const scrollBehavior = () => (lessMotion() ? 'auto' : 'smooth');

// Resolves after `ms` milliseconds: `await wait(500)`
export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------- Remembering things in this browser ----------
// Browser storage can be blocked (private browsing, strict privacy settings, some embedded
// browsers), and then even looking at it throws an error. These never do: reading gives
// back null (or the fallback), and saving just doesn't happen.
// `area` is 'localStorage' (kept until cleared) or 'sessionStorage' (until the tab closes).

export function readStorage(key, area = 'localStorage') {
  try { return window[area].getItem(key); } catch { return null; }
}

// Saves `value` as text; null removes the key. Returns whether it was saved.
export function writeStorage(key, value, area = 'localStorage') {
  try {
    if (value === null) window[area].removeItem(key);
    else window[area].setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// The same for lists and objects (saved as JSON)
export function readJSON(key, fallback = null) {
  try { return JSON.parse(readStorage(key)) ?? fallback; } catch { return fallback; }
}
export const writeJSON = (key, value) => writeStorage(key, JSON.stringify(value));

// ---------- Copying ----------

// Copies text to the clipboard. Returns whether it worked: browsers only allow it on
// https (or localhost), and the visitor can refuse.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
