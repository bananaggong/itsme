import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const directory = new URL('../public/personal/brand/', import.meta.url);
const mono = readFileSync(new URL('logo-mono.svg', directory), 'utf8');
const reverse = readFileSync(new URL('logo-reverse.svg', directory), 'utf8');
const svg = mono
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, '<title id="logo-title">김광일 — 단색 실타래 로고</title>')
  .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/, '<desc id="logo-desc">네 개의 곡면과 왼쪽 아래 타원으로 이루어진 실타래 표식.</desc>')
  .replace('<defs>', `<style>
    #shadow, #yarn { fill: #142035; }
    @media (prefers-color-scheme: dark) { #shadow, #yarn { fill: #FFFAEF; } }
  </style>
  <defs>`);
writeFileSync(new URL('favicon.svg', directory), svg);

// Tab icons retain the SVG's transparent background, including inside the ICO.
const render = (source, size) => sharp(Buffer.from(source)).resize(size, size).png().toBuffer();
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => render(mono, size)));
const darkImages = await Promise.all(sizes.map(size => render(reverse, size)));
writeFileSync(new URL('favicon-32.png', directory), images[1]);
writeFileSync(new URL('favicon-dark-32.png', directory), darkImages[1]);
// The home-screen icon has its own opaque background; it is never a tab favicon.
writeFileSync(new URL('apple-touch-icon.png', directory), await sharp(Buffer.from(mono))
  .resize(180, 180).flatten({ background: '#FFFAEF' }).png().toBuffer());

// ICO supports PNG payloads; retain three native sizes without another library.
function makeICO(images) {
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
  return Buffer.concat([header, ...images]);
}
writeFileSync(new URL('favicon.ico', directory), makeICO(images));
writeFileSync(new URL('favicon-dark.ico', directory), makeICO(darkImages));
console.log('Built transparent light/dark SVG, ICO and PNG tab icons, plus the 180px home-screen icon.');
