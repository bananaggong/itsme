// The Freeform tile's board as Sam leaves it: his product career, 2017 to now, as role
// cards, timeline bars, sticky-note highlights and hand-drawn lines. freeform.js draws it
// and lets visitors play with it; this file is only what's on it.
//
// To change a job, a note or a date, edit ROLES, SIDE or HIGHLIGHTS below, then bump the
// number in SAVE_KEY: visitors who'd already played with the board keep their own copy
// (in their browser) until it changes.

// Where a visitor's own copy of the board is saved in their browser
export const SAVE_KEY = 'ff-home-board-v5';

function arrowHead(tip, from, len = 17) {
  const a = Math.atan2(from[1] - tip[1], from[0] - tip[0]);
  return [
    [tip[0] + len * Math.cos(a + .5), tip[1] + len * Math.sin(a + .5)],
    tip,
    [tip[0] + len * Math.cos(a - .5), tip[1] + len * Math.sin(a - .5)],
  ];
}

// Company logos for the role cards, drawn simply in SVG (24 × 24)
export const LOGOS = {
  fl: { bg: '#e2673f', svg: '<path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5z" fill="#fff"/>' },
  softr: { bg: '#141417', svg: '<rect x="5" y="5" width="14" height="6" rx="2" fill="#f6c343"/><circle cx="8.5" cy="15.5" r="3" fill="#e5426b"/><rect x="13" y="12.5" width="6" height="6" rx="1.6" fill="#4d74f0"/>' },
  stacker: { bg: '#ffffff', svg: '<path d="M12 3.5 19.5 8 12 12.5 4.5 8z M12 11.5 19.5 16 12 20.5 4.5 16z" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"/>' },
  skyscanner: { bg: '#0770e3', svg: '<path d="M12 6.5v3M7.2 8.4l1.6 2.4M16.8 8.4l-1.6 2.4M4.5 12.3l2.7 1.1M19.5 12.3l-2.7 1.1M5.5 17q6.5-4.5 13 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' },
};

// The story is told in two rows, each with its own hand-drawn line: Founder and
// Lightning (2017–2021), then no-code startups and Skyscanner (2021–now).
// On a row, one year is 300 wide; ROW_H is the gap between the rows.
const YEAR_W = 300, X0 = 120, ROW_H = 780;
const LINES = [
  { label: 'Founder + Lightning · 2017 – 2021', start: [2017, 1], end: [2021, 10], years: [2017, 2018, 2019, 2020, 2021] },
  { label: 'No-code startups, then Skyscanner · 2021 – now', start: [2021, 7], end: [2026, 9], years: [2022, 2023, 2024, 2025, 2026], now: true },
];
const at = (row, [y, m = 1]) => {
  const [sy, sm] = LINES[row].start;
  return Math.round(X0 + (y - sy + (m - sm) / 12) * YEAR_W);
};
const NOW = [2026, 9];

// Each job: its card (pinned at the start date) and its bar (start to finish).
// Dates and descriptions come from Sam's LinkedIn.
const ROLES = [
  { id: 'pm', row: 0, title: 'Product Manager', company: 'Founder + Lightning', logo: 'fl', from: [2017, 1], to: [2018, 1], dates: 'Jan 2017 – Jan 2018 · 1 yr 1 mo', place: 'London', bar: 'fl1', label: 'Product Manager' },
  { id: 'spm', row: 0, title: 'Senior Product Manager', company: 'Founder + Lightning', logo: 'fl', from: [2017, 10], to: [2020, 1], dates: 'Oct 2017 – Jan 2020 · 2 yrs 4 mos', place: 'London', bar: 'fl2', label: 'Senior Product Manager' },
  { id: 'lpm', row: 0, title: 'Lead Product Manager', company: 'Founder + Lightning', logo: 'fl', from: [2020, 1], to: [2021, 8], dates: 'Jan 2020 – Aug 2021 · 1 yr 8 mos', place: 'London', bar: 'fl3', label: 'Lead Product Manager' },
  { id: 'softr', row: 1, title: 'Senior Product Manager', company: 'Softr', logo: 'softr', from: [2021, 7], to: [2022, 3], dates: 'Jul 2021 – Mar 2022 · 9 mos', place: 'Remote', bar: 'softr', label: 'Softr' },
  { id: 'stacker', row: 1, title: 'Senior Product Manager', company: 'Stacker', logo: 'stacker', from: [2022, 3], to: [2023, 2], dates: 'Mar 2022 – Feb 2023 · 1 yr', place: 'Remote', bar: 'stacker', label: 'Stacker' },
  { id: 'sky', row: 1, title: 'Senior Product Manager', company: 'Skyscanner', logo: 'skyscanner', from: [2023, 4], to: NOW, dates: 'Apr 2023 – now · 3 yrs 6 mos', place: 'Remote', bar: 'sky', label: 'Skyscanner' },
];
// Alongside the day job (the newsletter starts on the first row and carries on)
const SIDE = [
  { id: 'side-news', row: 0, lane: 0, from: [2020, 7], to: [2021, 10], bar: 'substack', label: 'Creator Club newsletter · Jul 2020 →' },
  { id: 'side-news2', row: 1, lane: 0, from: [2021, 7], to: NOW, bar: 'substack', label: 'Creator Club newsletter · still going' },
  { id: 'side-scout', row: 1, lane: 1, from: [2022, 1], to: [2025, 3], bar: 'scout', label: 'Venture Scout, Founder + Lightning · Jan 2022 – Mar 2025' },
];
// Sticky notes: highlights, above the job each one points at
const HIGHLIGHTS = [
  { id: 'n-mvp', row: 0, role: 'spm', color: 'green', x: 380, text: 'Took early-stage startups from inception to validation and a launched MVP' },
  { id: 'n-raise', row: 0, role: 'lpm', color: 'yellow', x: 870, text: 'Helped founders raise $9m+ in pre-seed and seed rounds' },
  { id: 'n-program', row: 0, role: 'lpm', color: 'pink', x: 1070, text: 'Launched our first 6-week validation program, for 20 founders' },
  { id: 'n-softr', row: 1, role: 'softr', color: 'orange', x: 110, text: 'First Product hire' },
  { id: 'n-stacker', row: 1, role: 'stacker', color: 'green', x: 330, text: 'YC company backed by A16z' },
  { id: 'n-office', row: 1, role: null, color: 'blue', x: 1000, text: 'On the side: office hours, helping founders test ideas before they build. 108 helped so far' },
];

// Heights within a row
const NOTE_Y = 60, CARD_Y = 300, CARD_W = 196, CARD_H = 156, BAR_Y = 474, AXIS_Y = 540, SIDE_Y = 626;
// The first view: small tile = the first cards, bars and line; 2×2 tile = the start of the story
export const START_SMALL = { x: 90, y: 250, w: 700, h: 336 };
export const START_EXPANDED = { x: 90, y: 40, w: 1000, h: 700 };

function buildDefault() {
  const items = [];
  const strokes = [];
  const links = [];
  LINES.forEach((line, r) => {
    const dy = r * ROW_H;
    items.push({ id: `line-label${r}`, type: 'text', style: 'label', x: X0 + 4, y: dy + 262, w: 500, text: line.label });
    items.push({ id: `side-label${r}`, type: 'text', style: 'label', x: X0 + 4, y: dy + SIDE_Y - 30, w: 300, text: 'On the side' });
    // the hand-drawn line, with a dot and a label for each new year
    const end = at(r, line.end) + 40;
    const pts = [];
    for (let x = 80; x < end; x += 26) pts.push([x, dy + AXIS_Y + Math.sin(x / 47) * 1.5]);
    pts.push([end, dy + AXIS_Y]);
    strokes.push({ id: `axis${r}`, color: 'ink', w: 3, pts });
    strokes.push({ id: `axis-head${r}`, color: 'ink', w: 3, pts: arrowHead([end, dy + AXIS_Y], [end - 40, dy + AXIS_Y], 16) });
    for (const y of line.years) {
      const x = at(r, [y, 1]);
      strokes.push({ id: `tick${y}`, color: 'ink', w: 9, pts: [[x, dy + AXIS_Y]] });
      items.push({ id: `yr${y}`, type: 'text', x: x - 19, y: dy + AXIS_Y + 14, w: 70, size: 15, weight: 700, text: String(y) });
    }
    if (line.now) {
      const x = at(r, NOW);
      strokes.push({ id: 'now-dot', color: 'red', w: 14, pts: [[x, dy + AXIS_Y]] });
      items.push({ id: 'now', type: 'text', x: x - 14, y: dy + AXIS_Y + 14, w: 60, size: 15, weight: 700, text: 'Now' });
    }
  });
  for (const j of ROLES) {
    items.push({ id: j.id, type: 'role', x: at(j.row, j.from), y: j.row * ROW_H + CARD_Y, w: CARD_W, h: CARD_H, title: j.title, company: j.company, logo: j.logo, dates: j.dates, place: j.place });
  }
  // Bars go after the cards so a later job's bar sits on top where two overlap
  for (const j of ROLES) {
    const x = at(j.row, j.from);
    items.push({ id: 'bar-' + j.id, type: 'bar', color: j.bar, x, y: j.row * ROW_H + BAR_Y, w: at(j.row, j.to) - x, h: 30, text: j.label });
  }
  for (const s of SIDE) {
    const x = at(s.row, s.from);
    items.push({ id: s.id, type: 'bar', color: s.bar, x, y: s.row * ROW_H + SIDE_Y + s.lane * 42, w: at(s.row, s.to) - x, h: 30, text: s.label });
  }
  for (const h of HIGHLIGHTS) {
    items.push({ id: h.id, type: 'note', color: h.color, x: h.x, y: h.row * ROW_H + NOTE_Y, w: 180, h: 180, text: h.text });
    if (h.role) links.push({ id: 'c-' + h.id, from: h.id, to: h.role });
  }
  return { items, links, strokes };
}

// The board: its items, the connector lines between them and the pen strokes (rounded,
// so a saved copy stays small)
export const DEFAULT = buildDefault();
for (const s of DEFAULT.strokes) s.pts = s.pts.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]);
