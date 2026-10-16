import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cloneHTML, cloneJavaScript, root } from './site.mjs';
const dist=resolve(root,'dist');
rmSync(dist,{recursive:true,force:true});
cpSync(resolve(root,'public'),dist,{recursive:true});
let pages=0;
for(const file of readdirSync(dist,{recursive:true})) {
  if(!file.endsWith('.html')) continue;
  const path=resolve(dist,file);
  writeFileSync(path,cloneHTML(readFileSync(path,'utf8')));pages++;
}
const newsletter=resolve(dist,'newsletter-page.js');
writeFileSync(newsletter,cloneJavaScript(readFileSync(newsletter,'utf8'),'newsletter-page.js'));
console.log(`Built ${pages} HTML documents. Use npm start for persisted ratings and subscription collection; static hosts serve the UI only.`);
