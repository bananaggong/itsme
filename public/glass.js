// Liquid Glass: the optional iOS 26 / macOS Tahoe look (styled in glass.css).
// The small script in <head> has already put data-glass="on" on <html> if the visitor
// turned it on before, so the page never flashes the old look. This file switches it,
// remembers the choice (localStorage, like light/dark), and adds the lens.
//
// The lens: real Liquid Glass bends what's behind it near its edges, like the rim of a
// magnifying glass. Chrome can do that with an SVG "displacement" filter: a picture whose
// colours say how far to shift each pixel behind the control (grey = stay put, more red =
// shift sideways, more blue = shift up or down). The picture has to match the control's
// size, so it's drawn here, and redrawn when the control changes size. Safari and Firefox
// can't use SVG filters on what's behind an element yet, so they get the same shape without
// the bending (glass.css).

import { lessMotion, writeStorage } from './utils.js?v=8c1091ee90';

const root = document.documentElement;
const KEY = 'glass';
const reduceGlass = window.matchMedia('(prefers-reduced-transparency: reduce)');
const canLens = !!navigator.userAgentData?.brands?.some(b => b.brand === 'Chromium');
const LENSED = '.nav, body > .theme-toggle';   // small floating controls only: the lens is costly to draw
const SVG_NS = 'http://www.w3.org/2000/svg';

export const isGlass = () => root.dataset.glass === 'on';
// Whether this page has the look at all (the Old site and VR Corp keep their own)
export const hasGlassStyles = () => !!document.querySelector('link[href^="/glass.css?v=89ed5cd0b8"]');

export function setGlass(on) {
  writeStorage(KEY, on ? 'on' : null);   // if storage is blocked it still switches, just on this page
  const change = () => {
    if (on) root.dataset.glass = 'on';
    else delete root.dataset.glass;
    updateLenses();
  };
  // Cross-fade, the same way the light/dark switch does (theme.js)
  if (!lessMotion() && document.startViewTransition) document.startViewTransition(change);
  else change();
}

// ---------------------------------------------------------------- the lens

let defs = null;
const observed = new Map();   // control → its filter's id
let nextId = 0;

const resizes = new ResizeObserver(entries => entries.forEach(entry => drawLens(entry.target)));

// How the lens is shaped, as fractions of the control's height (its shorter side)
const RIM = 0.34;        // how far in from the edge the bending reaches
const BEND = 0.34;       // how far, at most, a pixel is shifted. Kept under RIM, or text at the edge folds back on itself
const SPREAD = 0.08;     // red bends a little more than green, blue a little less: the faint rainbow at the rim
const FROST = 4;         // blur, in pixels, behind the labels in the middle (the rim stays sharp, so the bending shows)

const svgImage = svg => `data:image/svg+xml,${encodeURIComponent(svg)}`;

// The displacement picture for a control of this size and corner radius
function lensMap(w, h, r, rim) {
  return svgImage(`<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="x" x1="100%" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="100%"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#000"/>
    <rect width="${w}" height="${h}" rx="${r}" fill="url(#x)"/>
    <rect width="${w}" height="${h}" rx="${r}" fill="url(#y)" style="mix-blend-mode:difference"/>
    <rect x="${rim}" y="${rim}" width="${w - rim * 2}" height="${h - rim * 2}" rx="${Math.max(0, r - rim)}"
          fill="#808080" style="filter:blur(${rim / 1.6}px)"/>
  </svg>`);
}

// Where the frost goes: solid in the middle, fading out towards the rim
function frostMask(w, h, r, rim) {
  return svgImage(`<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect x="${rim / 2}" y="${rim / 2}" width="${w - rim}" height="${h - rim}" rx="${Math.max(0, r - rim / 2)}"
          fill="#fff" style="filter:blur(${rim / 3}px)"/>
  </svg>`);
}

function drawLens(el) {
  const id = observed.get(el);
  const filter = defs?.querySelector(`#${id}`);
  if (!filter) return;
  const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
  if (!w || !h) return;
  const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
  const size = Math.min(w, h), rim = size * RIM, bend = size * BEND;
  // One shifted copy of what's behind per colour, each keeping only its own colour, added back together.
  // The scale is negative so pixels at the rim come from further in, never from outside the control:
  // Chrome fills "outside" with a mirror image, which showed up as upside-down text.
  const channel = (scale, keep, name) => `
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${-scale}" xChannelSelector="R" yChannelSelector="B" result="${name}-moved"/>
    <feColorMatrix in="${name}-moved" type="matrix" values="${keep}" result="${name}"/>`;
  filter.innerHTML = `
    <feImage href="${lensMap(w, h, r, rim)}" x="0" y="0" width="${w}" height="${h}" result="map"/>
    ${channel(bend * (1 + SPREAD), '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'red')}
    ${channel(bend, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'green')}
    ${channel(bend * (1 - SPREAD), '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'blue')}
    <feBlend in="red" in2="green" mode="screen" result="red-green"/>
    <feBlend in="red-green" in2="blue" mode="screen" result="bent"/>
    <feGaussianBlur in="bent" stdDeviation="${FROST}" result="frosted"/>
    <feImage href="${frostMask(w, h, r, rim)}" x="0" y="0" width="${w}" height="${h}" result="middle"/>
    <feComposite in="frosted" in2="middle" operator="in" result="frosted-middle"/>
    <feComposite in="frosted-middle" in2="bent" operator="over"/>`;
}

function addLens(el) {
  if (observed.has(el)) return;
  if (!defs) {
    // Somewhere to keep the filters: an invisible SVG (display:none would switch them off)
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.append(defs);
    document.body.append(svg);
  }
  const id = `lg-lens-${nextId++}`;
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = id;
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  defs.append(filter);
  observed.set(el, id);
  el.style.setProperty('--lg-lens', `url(#${id})`);
  el.dataset.glassLens = '';
  drawLens(el);
  resizes.observe(el);
}

function removeLens(el) {
  const id = observed.get(el);
  if (!id) return;
  resizes.unobserve(el);
  defs.querySelector(`#${id}`)?.remove();
  el.style.removeProperty('--lg-lens');
  delete el.dataset.glassLens;
  observed.delete(el);
}

function updateLenses() {
  const want = canLens && isGlass() && hasGlassStyles() && !reduceGlass.matches
    ? new Set(document.querySelectorAll(LENSED)) : new Set();
  for (const el of [...observed.keys()]) if (!want.has(el)) removeLens(el);
  want.forEach(addLens);
}

updateLenses();
reduceGlass.addEventListener('change', updateLenses);
// On phones the light/dark switch moves inside the nav (theme.js), where it shouldn't have its own lens
window.matchMedia('(max-width: 640px)').addEventListener('change', () => requestAnimationFrame(updateLenses));
