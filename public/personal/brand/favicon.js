// The browser/tab colour scheme can differ from the site's saved theme.
// Pick explicit artwork so image loaders need not evaluate CSS inside an SVG.
const scheme = window.matchMedia('(prefers-color-scheme: dark)');
function updateFavicon() {
  for (const icon of document.querySelectorAll('link[data-favicon-light]')) {
    const next = scheme.matches ? icon.dataset.faviconDark : icon.dataset.faviconLight;
    if (icon.getAttribute('href') !== next) icon.setAttribute('href', next);
  }
}
updateFavicon();
scheme.addEventListener('change', updateFavicon);
