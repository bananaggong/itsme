import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = ['favicon.svg', 'favicon.ico', 'favicon-dark.ico', 'favicon-32.png', 'favicon-dark-32.png',
  'logo-mono.svg', 'logo-reverse.svg', 'favicon.js', 'apple-touch-icon.png'];
const hash = createHash('sha256');
for (const file of files) hash.update(readFileSync(new URL('../public/personal/brand/' + file, import.meta.url)));
export const brandVersion = hash.digest('hex').slice(0, 12);
const asset = file => `/personal/brand/${file}?v=${brandVersion}`;
const themeSources = (light, dark) => `data-favicon-light="${asset(light)}" data-favicon-dark="${asset(dark)}"`;
const links = `<link rel="icon" href="${asset('favicon.ico')}" sizes="16x16 32x32 48x48" type="image/x-icon" ${themeSources('favicon.ico', 'favicon-dark.ico')}>
  <link rel="icon" href="${asset('favicon-32.png')}" sizes="32x32" type="image/png" ${themeSources('favicon-32.png', 'favicon-dark-32.png')}>
  <link rel="icon" href="${asset('favicon.svg')}" sizes="any" type="image/svg+xml" ${themeSources('logo-mono.svg', 'logo-reverse.svg')}>
  <link rel="apple-touch-icon" href="${asset('apple-touch-icon.png')}" sizes="180x180">
  <script src="${asset('favicon.js')}"></script>`;

export function personalizeBrandHTML(html) {
  if (!html.includes('</head>')) return html;
  return html.replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>\s*/gi, '')
    .replace('</head>', `${links}\n</head>`);
}
