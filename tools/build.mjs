import { isRetiredPath } from './published-routes.mjs';
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cloneHTML, cloneJavaScript, cloneJSON, root } from './site.mjs';
const dist=resolve(root,'dist');
rmSync(dist,{recursive:true,force:true});
cpSync(resolve(root,'public'),dist,{recursive:true,filter:source=>!isRetiredPath(source.slice(resolve(root,'public').length))});
let pages=0;
for(const file of readdirSync(dist,{recursive:true})) {
  const path=resolve(dist,file);
  if(file.endsWith('.html')) {
    writeFileSync(path,cloneHTML(readFileSync(path,'utf8')));pages++;
  } else if(file.endsWith('.js')) {
    writeFileSync(path,cloneJavaScript(readFileSync(path,'utf8'),file));
  } else if(file==='search.json') {
    writeFileSync(path,cloneJSON(readFileSync(path,'utf8'),file));
  }
}
console.log(`Built ${pages} HTML documents. Use npm start for persisted ratings and subscription collection; static hosts serve the UI only.`);
