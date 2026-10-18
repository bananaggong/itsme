import { build } from 'esbuild';
import { copyFileSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { SONGS } from './songs.ts';
const directory = new URL('./', import.meta.url);
const output = new URL('../../public/personal/grapes/', directory);
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rows = SONGS.map((song, index) => `<li><button type="button" class="sp-row gp-row${index === 0 ? ' is-active' : ''}" data-gp-song="${index}" aria-pressed="${index === 0}" aria-label="${escape(song.artist+' — '+song.title)} 재생" disabled><span class="sp-num">${index+1}</span><img class="gp-cover" src="/personal/grapes/cover.svg" style="--cover-hue:${index*2-16}deg" alt="" loading="lazy"><span class="sp-name"><span class="sp-name-title">${escape(song.title)}</span><small>${escape(song.artist)}</small></span><span class="sp-count">0:12</span></button></li>`).join('\n');
const links = SONGS.map(song => `<li><a href="${song.audioSrc}">${escape(song.artist+' — '+song.title)}</a></li>`).join('');
writeFileSync(new URL('widget.html', directory), readFileSync(new URL('widget.template.html', directory), 'utf8').replace('<!-- SONG_ROWS -->', rows).replace('<!-- SONG_LINKS -->', links));
for (const name of readdirSync(output)) if (/^(player|scene-|chunk-).*\.js(?:\.LEGAL\.txt)?$/.test(name)) unlinkSync(new URL(name, output));
await build({
  absWorkingDir: directory.pathname,
  entryPoints: ['player.ts'], bundle: true, minify: true, format: 'esm',
  target: ['safari15', 'chrome100', 'firefox100'], legalComments: 'linked',
  splitting: true, entryNames: 'player', chunkNames: 'scene-[hash]',
  outdir: output.pathname,
});
for (const [source, name] of [['three/LICENSE', 'THREE-LICENSE.txt']]) {
  copyFileSync(new URL('node_modules/' + source, directory), new URL('../../public/personal/grapes/' + name, directory));
}
writeFileSync(new URL('GSAP-NOTICE.txt', output), 'GSAP 3.14.2\nCopyright 2008-2025, GreenSock. All rights reserved.\nSubject to the terms at https://gsap.com/standard-license\nThe distributed bundle retains the upstream license notice.\n');
