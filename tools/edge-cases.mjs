import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from 'playwright/test';
import { PNG } from 'pngjs';
import { root } from './site.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
const report=process.env.RESUME ? JSON.parse(readFileSync(resolve(root,'reference/edge-results.json'),'utf8')) : {date:new Date().toISOString(),checks:[],failures:[]};
const source='https://www.samdickie.me',clone=process.env.BASE_URL || 'http://localhost:3000';
const ref=resolve(root,'reference/screenshots/extra'),out='/tmp/itsme-qa/extra';mkdirSync(ref,{recursive:true});mkdirSync(out,{recursive:true});
async function context(options={}) {
  const c=await browser.newContext({locale:'en-GB',timezoneId:'Asia/Seoul',reducedMotion:'reduce',...options});
  await c.route('https://static.cloudflareinsights.com/**',r=>r.abort());return c;
}
const load=async(p,url)=>{await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);};
async function check(name,fn) {
  if(process.env.RESUME && report.checks.some(c=>c.name===name && c.pass)) return;
  report.failures=report.failures.filter(c=>c.name!==name);
  try {const details=await fn();report.checks.push({name,pass:true,...details});console.log('PASS',name);}catch(error){report.failures.push({name,error:error.message});console.error('FAIL',name,error.message.slice(0,300));}
}
try {
  for(const width of [320,375,640,768,1180,1280,1920]) await check('responsive '+width,async()=>{
    const c=await context({viewport:{width,height:1000}});const a=await c.newPage(),b=await c.newPage();
    try {
      await Promise.all([load(a,source+'/'),load(b,clone+'/')]);
      const metric=()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns,nav:document.querySelector('.nav').getBoundingClientRect().toJSON()});
      const [x,y]=await Promise.all([a.evaluate(metric),b.evaluate(metric)]);
      assert.equal(y.width,y.scroll);assert.equal(x.columns,y.columns);assert.ok(y.nav.left>=0 && y.nav.right<=width);
      return {width,columns:y.columns};
    } finally {await c.close();}
  });
  const pages=['/','/about/','/writing/','/projects/','/newsletter/','/books/','/projects/old-site/','/vr/'];
  for(const width of [1440,390]) for(const path of pages) await check('dark '+width+' '+path,async()=>{
    const c=await context({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390,colorScheme:'dark'});const a=await c.newPage(),b=await c.newPage();
    try {
      await Promise.all([load(a,source+path),load(b,clone+path)]);
      for(const p of [a,b]) {
        if(path!=='/vr/') await expect(p.locator('html')).toHaveAttribute('data-theme','dark');
        if(path==='/projects/old-site/') await p.waitForFunction(()=>document.querySelector('.os-window.is-loaded') && !document.querySelector('.os-window.is-hinting'));
        if(path==='/') await p.waitForFunction(()=>performance.now()>5000 && !document.querySelector('.tile--avatar.is-hinting'));
        await p.evaluate(async()=>{await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0 && r.bottom>0 && r.top<innerHeight;}).map(i=>i.decode().catch(()=>{})));document.querySelector('.ms-thread')?.scrollTo(0,99999);});
      }
      const key='dark-'+width+'-'+(path==='/'?'home':path.replace(/^\/|\/$/g,'').replaceAll('/','--'))+'.png';
      const [x,y]=await Promise.all([a.screenshot({path:resolve(ref,key),animations:'disabled',caret:'hide'}),b.screenshot({path:resolve(out,key),animations:'disabled',caret:'hide'})]);
      const u=PNG.sync.read(x),v=PNG.sync.read(y);let count=0;
      for(let i=0;i<u.data.length;i+=4) if(Math.max(Math.abs(u.data[i]-v.data[i]),Math.abs(u.data[i+1]-v.data[i+1]),Math.abs(u.data[i+2]-v.data[i+2]))>25)count++;
      assert.equal(count,0);return {reference:'reference/screenshots/extra/'+key,render:resolve(out,key),mismatchRatio:count/(u.width*u.height)};
    } finally {await c.close();}
  });
  await Promise.all([['source',source],['clone',clone]].map(async([kind,base])=>{
    await check(kind+' real-time photo autoplay, Find My motion and Mail arrival',async()=>{
      const c=await context({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),p=await c.newPage();
      try {
        await load(p,base+'/');await p.locator('.tile--newsletter').scrollIntoViewIfNeeded();await expect(p.locator('.tile--newsletter')).toHaveClass(/is-revealed/);
        await p.locator('.tile--findmy').scrollIntoViewIfNeeded();const before=await p.locator('.fm-person').getAttribute('style');
        await expect.poll(()=>p.locator('.fm-person').getAttribute('style')).not.toBe(before);
        await p.locator('.tile--photos').scrollIntoViewIfNeeded();const photo=await p.locator('.ph-slide.is-active img').getAttribute('src');
        await expect.poll(()=>p.locator('.ph-slide.is-active img').getAttribute('src'),{timeout:7000}).not.toBe(photo);
      } finally {await c.close();}
    });
    await check(kind+' camera permission-denied message and retry',async()=>{
      const c=await context({viewport:{width:1440,height:1000}}),p=await c.newPage();
      try {
        await p.addInitScript(()=>{if(navigator.mediaDevices) navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Synthetic permission denial','NotAllowedError'));});
        await load(p,base+'/');await p.locator('.pb-launch').click();await expect(p.locator('.pb-message')).toContainText('Camera access is off');await expect(p.locator('.pb-retry')).toBeVisible();
      } finally {await c.close();}
    });
    await check(kind+' no-JavaScript navigation and content fallbacks',async()=>{
      const c=await context({viewport:{width:390,height:844},javaScriptEnabled:false}),p=await c.newPage();
      try {for(const path of pages.filter(x=>x!=='/projects/old-site/')) {await p.goto(base+path);assert.ok((await p.locator('body').innerText()).length>50);}}
      finally {await c.close();}
    });
  }));
} finally {await browser.close();writeFileSync(resolve(root,'reference/edge-results.json'),JSON.stringify(report,null,2)+'\n');}
console.log(`${report.checks.length} passed, ${report.failures.length} failed`);if(report.failures.length)process.exitCode=1;
