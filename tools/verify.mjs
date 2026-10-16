import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { root } from './site.mjs';

// Browser extension control is not exposed in this cloud chat. Use the installed
// Chromium through the managed proxy, with no TLS or network-policy bypass.
const origin='https://www.samdickie.me';
const local=process.env.BASE_URL || 'http://localhost:3000';
const referenceDir=resolve(root,'reference/screenshots');
const renderDir=process.env.QA_DIR || '/tmp/itsme-qa';
mkdirSync(referenceDir,{recursive:true});mkdirSync(renderDir,{recursive:true});
const routes=JSON.parse(readFileSync(resolve(root,'reference/routes.json'),'utf8'));
const archive=JSON.parse(readFileSync(resolve(root,'public/assets/old-site/pages.json'),'utf8')).pages;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],
  proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
const result=process.env.RESUME ? JSON.parse(readFileSync(resolve(root,'reference/visual-results.json'),'utf8')) : {date:new Date().toISOString(),browser:await browser.version(),source:origin,local,viewports:[{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}],pages:[],interactions:[],failures:[]};
const important=new Set(['/','/about/','/writing/','/projects/','/newsletter/','/books/','/projects/old-site/','/vr/']);
const jobs=[];
for(const viewport of result.viewports) {
  for(const route of routes) jobs.push({viewport,path:route.path,key:route.path==='/'?'home':route.path.replace(/^\/|\/$/g,'').replaceAll('/','--'),full:important.has(route.path)});
  jobs.push({viewport,path:'/a-page-that-does-not-exist/',key:'404',status:404});
  for(const page of archive) jobs.push({viewport,path:'/projects/old-site/?page='+encodeURIComponent(page.path),key:'archive--'+page.slug,archived:true});
}
if(process.env.RESUME) {
  for(let i=jobs.length-1;i>=0;i--) {
    const job=jobs[i],before=result.pages.find(p=>p.path===job.path && p.viewport===job.viewport.name);
    if(before && before.comparison.mismatchRatio===0 && (!job.full || before.fullComparison?.mismatchRatio===0)) jobs.splice(i,1);
  }
  result.failures=[];
}
if(process.env.FILTER) for(let i=jobs.length-1;i>=0;i--) if(!new RegExp(process.env.FILTER).test(jobs[i].viewport.name+' '+jobs[i].path)) jobs.splice(i,1);
let cursor=0;
function pixels(a,b) {
  const x=PNG.sync.read(a), y=PNG.sync.read(b);
  if(x.width!==y.width || x.height!==y.height) return {dimensionsMatch:false,mismatchRatio:1};
  let mismatch=0,exact=0;
  for(let i=0;i<x.data.length;i+=4) {
    const delta=Math.max(...[0,1,2].map(c=>Math.abs(x.data[i+c]-y.data[i+c])));
    if(delta>25) mismatch++;
    if(delta>0) exact++;
  }
  return {dimensionsMatch:true,mismatchRatio:Number((mismatch/(x.width*x.height)).toFixed(6)),exactMismatchRatio:Number((exact/(x.width*x.height)).toFixed(6)),channelTolerance:25};
}
async function ready(page,job) {
  await page.waitForLoadState('networkidle',{timeout:12000}).catch(()=>{});
  await page.evaluate(()=>document.fonts.ready);
  if(job.archived || job.path.startsWith('/projects/old-site/')) await page.locator('.os-shot img').first().waitFor();
  await page.locator('body').evaluate(async()=>{
    await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight && i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));
  });
  if(job.archived || job.path.startsWith('/projects/old-site/')) await page.waitForFunction(()=>document.querySelector('.os-window.is-loaded') && !document.querySelector('.os-window.is-hinting'));
  if(job.path==='/newsletter/') await page.locator('.ms-thread').evaluate(thread=>{thread.scrollTop=thread.scrollHeight;});
}
async function inspect(page,job,base) {
  const errors=[],responses=[];
  const onError=error=>errors.push(error.message);
  const onResponse=response=>{if(response.status()>=400 && response.url().startsWith(base)) responses.push({url:response.url().replace(base,''),status:response.status()});};
  page.on('pageerror',onError);page.on('response',onResponse);
  const response=await page.goto(base+job.path,{waitUntil:'domcontentloaded',timeout:45000});
  await ready(page,job);
  const metrics=await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,text:document.body.innerText,
    images:[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight && i.getBoundingClientRect().bottom>0).map(i=>({src:new URL(i.src).pathname,loaded:i.complete && i.naturalWidth>0})),
    heading:[...document.querySelectorAll('h1')].map(i=>({text:i.innerText,font:getComputedStyle(i).fontFamily,size:getComputedStyle(i).fontSize,weight:getComputedStyle(i).fontWeight})),
    background:getComputedStyle(document.body).backgroundColor,nav:[...document.querySelectorAll('.nav-link')].map(i=>i.textContent)}));
  const screenshot=await page.screenshot({animations:'disabled',caret:'hide'});
  page.off('pageerror',onError);page.off('response',onResponse);
  return {status:response.status(),metrics,errors,responses,screenshot};
}
async function worker() {
  for(;;) {
    const job=jobs[cursor++];if(!job) return;
    const stem=job.viewport.name+'--'+job.key;
    const context=await browser.newContext({viewport:{width:job.viewport.width,height:job.viewport.height},isMobile:job.viewport.name==='mobile',hasTouch:job.viewport.name==='mobile',deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light',locale:'en-GB',timezoneId:'Asia/Seoul'});
    await context.route('https://static.cloudflareinsights.com/**',route=>route.abort());
    const source=await context.newPage();const clone=await context.newPage();
    try {
      const [a,b]=await Promise.all([inspect(source,job,origin),inspect(clone,job,local)]);
      writeFileSync(resolve(referenceDir,stem+'.png'),a.screenshot);
      writeFileSync(resolve(renderDir,stem+'.png'),b.screenshot);
      const comparison=pixels(a.screenshot,b.screenshot);
      const report={path:job.path,viewport:job.viewport.name,archived:!!job.archived,reference:'reference/screenshots/'+stem+'.png',render:resolve(renderDir,stem+'.png'),comparison,
        sameText:a.metrics.text===b.metrics.text,source:{...a,screenshot:undefined},clone:{...b,screenshot:undefined}};
      result.pages=result.pages.filter(p=>!(p.path===job.path && p.viewport===job.viewport.name));result.pages.push(report);
      assert.equal(b.status,job.status || 200);
      assert.equal(b.errors.length,0,`${stem}: JavaScript runtime error`);
      assert.equal(b.metrics.width,b.metrics.scrollWidth,`${stem}: horizontal overflow`);
      assert.ok(b.metrics.text.length>20);
      assert.ok(b.metrics.images.every(i=>i.loaded),`${stem}: missing visible image`);
      if(job.full) {
        for(const page of [source,clone]) {
          await page.evaluate(async()=>{
            for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight) {scrollTo(0,y);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
            for(const image of document.images) image.loading='eager';
            await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0);
          });
        }
        const [aFull,bFull]=await Promise.all([source.screenshot({fullPage:true,animations:'disabled',caret:'hide'}),clone.screenshot({fullPage:true,animations:'disabled',caret:'hide'})]);
        writeFileSync(resolve(referenceDir,stem+'--full.png'),aFull);writeFileSync(resolve(renderDir,stem+'--full.png'),bFull);
        report.fullComparison=pixels(aFull,bFull);
      }
      console.log(`${stem}: ${(comparison.mismatchRatio*100).toFixed(2)}% pixel delta; text ${report.sameText?'same':'differs'}`);
    } catch(error) {result.failures.push({job:stem,message:error.message});console.error(stem,error.message);}
    finally {await context.close();}
    writeFileSync(resolve(root,'reference/visual-results.json'),JSON.stringify(result,null,2)+'\n');
  }
}
await Promise.all(Array.from({length:4},worker));
await browser.close();
console.log(`Compared ${result.pages.length} page/view combinations. ${result.failures.length} failures.`);
if(result.failures.length) process.exitCode=1;
