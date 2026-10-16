// Find My tile: Sam walks a 45-second loop around Westminster.
// The map is a picture (map-light.svg, or map-dark.svg in dark mode). route.json
// lists the route as points in the map's own coordinates (metres from its top-left
// corner), with the street name at each point. Each frame we work out how far along the loop Sam should be
// and move the pin there.

import { lessMotion } from './utils.js?v=8c1091ee90';

const LOOP_MS = 45000; // one lap of the route takes 45 seconds
const tile = document.querySelector('.tile--findmy');

if (tile) init(tile);

async function init(tile) {
  const person = tile.querySelector('.fm-person');
  const streetLabel = tile.querySelector('.fm-street');

  let route;
  try {
    const response = await fetch('/assets/map/route.json?v=815c7d314e');
    if (!response.ok) throw new Error(`route.json: ${response.status}`);
    route = await response.json();
  } catch (error) {
    person.hidden = true; // no route, so no Sam, rather than a pin stuck in the corner
    console.warn('Find My: could not load the route', error);
    return;
  }
  const { width, height, points, streets } = route;

  // Distance walked by the time we reach each point, for a steady pace
  const walked = [0];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    walked.push(walked[i - 1] + Math.hypot(x2 - x1, y2 - y1));
  }
  const total = walked[walked.length - 1];

  // The map fills the tile the way `object-fit: cover` does: scaled up until
  // both sides are covered, then centred. Work out that scale and offset.
  let scale = 1, offsetX = 0, offsetY = 0;
  function measure() {
    scale = Math.max(tile.clientWidth / width, tile.clientHeight / height);
    offsetX = (tile.clientWidth - width * scale) / 2;
    offsetY = (tile.clientHeight - height * scale) / 2;
  }

  let segment = 0; // which stretch of the route Sam is on
  function placeAt(distance) {
    // Step forward (or wrap round) to the stretch that contains this distance
    if (distance < walked[segment]) segment = 0;
    while (segment < points.length - 2 && walked[segment + 1] < distance) segment++;

    const [x1, y1] = points[segment];
    const [x2, y2] = points[segment + 1];
    const t = (distance - walked[segment]) / (walked[segment + 1] - walked[segment] || 1);
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    person.style.transform = `translate(${offsetX + x * scale}px, ${offsetY + y * scale}px)`;

    const street = streets[segment + 1];
    if (streetLabel.textContent !== street) streetLabel.textContent = street;
  }

  let progress = 0.12;  // how far round the loop, 0 to 1 (starts part-way down Whitehall)
  let lastTime = null;
  let visible = false;
  let running = false;  // guards against two animation loops running at once

  function frame(now) {
    if (!visible) { running = false; return; } // paused while off-screen
    if (lastTime !== null) progress = (progress + (now - lastTime) / LOOP_MS) % 1;
    lastTime = now;
    placeAt(progress * total);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = null; // don't count the time we were off-screen
    requestAnimationFrame(frame);
  }

  measure();
  placeAt(progress * total);
  new ResizeObserver(() => { measure(); placeAt(progress * total); }).observe(tile);
  if (lessMotion()) return; // stay still for people who've asked for less motion

  // Only animate while the tile is on screen, to save battery
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(tile);
}
