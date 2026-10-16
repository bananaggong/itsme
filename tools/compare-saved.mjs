import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { root } from './site.mjs';
const path=resolve(root,'reference/visual-results.json');
const results=JSON.parse(readFileSync(path,'utf8'));
function compare(aPath,bPath) {
  const a=PNG.sync.read(readFileSync(aPath)),b=PNG.sync.read(readFileSync(bPath));
  if(a.width!==b.width || a.height!==b.height) return {dimensionsMatch:false,mismatchRatio:1,exactMismatchRatio:1,channelTolerance:25};
  let exact=0,tolerated=0;
  for(let i=0;i<a.data.length;i+=4) {
    const d=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]));
    if(d) exact++;if(d>25) tolerated++;
  }
  return {dimensionsMatch:true,mismatchRatio:tolerated/(a.width*a.height),exactMismatchRatio:exact/(a.width*a.height),channelTolerance:25};
}
for(const page of results.pages) {
  page.comparison=compare(resolve(root,page.reference),page.render);
  const ref=resolve(root,page.reference.replace(/\.png$/,'--full.png')),render=page.render.replace(/\.png$/,'--full.png');
  if(page.fullComparison && existsSync(ref) && existsSync(render)) page.fullComparison=compare(ref,render);
}
results.comparisonMethod='Pixel RGB channel max delta >25; exactMismatchRatio separately counts every nonidentical pixel. Chromium, same viewport/locale/timezone/reduced motion, settled fonts/images and archive hint.';
writeFileSync(path,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({pages:results.pages.length,visuallyDifferent:results.pages.filter(p=>p.comparison.mismatchRatio>0).map(p=>[p.path,p.viewport,p.comparison]),notBitIdentical:results.pages.filter(p=>p.comparison.exactMismatchRatio>0).map(p=>[p.path,p.viewport,p.comparison.exactMismatchRatio]),full:results.pages.filter(p=>p.fullComparison).length,fullDifferent:results.pages.filter(p=>p.fullComparison?.mismatchRatio>0).map(p=>[p.path,p.viewport,p.fullComparison])},null,2));
