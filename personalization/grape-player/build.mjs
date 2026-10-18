import { build } from 'esbuild';
import { copyFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = new URL('./', import.meta.url);
const output = new URL('../../public/personal/grapes/', directory);
for (const name of readdirSync(output)) if (/^(player|scene-|chunk-).*\.js(?:\.LEGAL\.txt)?$/.test(name)) unlinkSync(new URL(name, output));
await build({
  absWorkingDir: fileURLToPath(directory),
  entryPoints: ['player.ts'], bundle: true, minify: true, format: 'esm',
  target: ['safari15', 'chrome100', 'firefox100'], legalComments: 'linked',
  splitting: true, entryNames: 'player', chunkNames: 'scene-[hash]',
  outdir: fileURLToPath(output),
});
for (const [source, name] of [['three/LICENSE', 'THREE-LICENSE.txt']]) {
  copyFileSync(new URL('node_modules/' + source, directory), new URL('../../public/personal/grapes/' + name, directory));
}
writeFileSync(new URL('GSAP-NOTICE.txt', output), 'GSAP 3.14.2\nCopyright 2008-2025, GreenSock. All rights reserved.\nSubject to the terms at https://gsap.com/standard-license\nThe distributed bundle retains the upstream license notice.\n');
