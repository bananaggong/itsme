import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png'];
const hash = createHash('sha256');
for (const file of files) hash.update(readFileSync(new URL('../public/personal/brand/' + file, import.meta.url)));
export const brandVersion = hash.digest('hex').slice(0, 12);
const asset = file => `/personal/brand/${file}?v=${brandVersion}`;
const links = `<link rel="icon" href="${asset('favicon.ico')}" sizes="16x16 32x32 48x48" type="image/x-icon">
  <link rel="icon" href="${asset('favicon-32.png')}" sizes="32x32" type="image/png">
  <link rel="icon" href="${asset('favicon.svg')}" sizes="any" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${asset('apple-touch-icon.png')}" sizes="180x180">`;

export function personalizeBrandHTML(html) {
  if (!html.includes('</head>')) return html;
  return html.replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>\s*/gi, '')
    .replace('</head>', `${links}\n</head>`);
}
