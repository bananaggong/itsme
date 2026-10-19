import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const directory = new URL('../public/personal/brand/', import.meta.url);
const mono = readFileSync(new URL('logo-mono.svg', directory), 'utf8');
const svg = mono
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, '<title id="logo-title">김광일 — 단색 실타래 로고</title>')
  .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/, '<desc id="logo-desc">네 개의 곡면과 왼쪽 아래 타원으로 이루어진 실타래 표식.</desc>')
  .replace('<defs>', `<style>
    #shadow, #yarn { fill: #142035; }
    @media (prefers-color-scheme: dark) { #shadow, #yarn { fill: #FFFAEF; } }
  </style>
  <defs>`);
writeFileSync(new URL('favicon.svg', directory), svg);

// Fixed light backgrounds keep raster fallbacks legible on either tab colour.
const render = size => sharp(Buffer.from(mono)).resize(size, size)
  .flatten({ background: '#FFFAEF' }).png().toBuffer();
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
writeFileSync(new URL('favicon-32.png', directory), images[1]);
writeFileSync(new URL('apple-touch-icon.png', directory), await render(180));

// ICO supports PNG payloads; retain three native sizes without another library.
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((bytes, index) => {
  const entry = 6 + 16 * index;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(bytes.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += bytes.length;
});
writeFileSync(new URL('favicon.ico', directory), Buffer.concat([header, ...images]));
console.log('Built adaptive SVG, 16/32/48px ICO, 32px PNG and 180px Apple touch icon.');
