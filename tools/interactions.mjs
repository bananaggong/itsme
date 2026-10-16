import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect } from 'playwright/test';
import { makeServer, root } from './site.mjs';

const dataDir=mkdtempSync(join(tmpdir(),'itsme-browser-'));
const server=makeServer({dataDir});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],
  proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
const report=process.env.RESUME ? JSON.parse(readFileSync(resolve(root,'reference/interaction-results.json'),'utf8')) : {date:new Date().toISOString(),tests:[],errors:[]};
const output='/tmp/itsme-qa/states';mkdirSync(output,{recursive:true});
const refs=resolve(root,'reference/screenshots/states');mkdirSync(refs,{recursive:true});
const save=()=>writeFileSync(resolve(root,'reference/interaction-results.json'),JSON.stringify(report,null,2)+'\n');

async function suite(kind,mobile) {
  const base=kind==='source'?'https://www.samdickie.me':local;
  const prefix=kind+'-'+(mobile?'mobile':'desktop');
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,locale:'en-GB',timezoneId:'Asia/Seoul',reducedMotion:'reduce',permissions:['camera','clipboard-read','clipboard-write'],acceptDownloads:true});
  await context.route('https://static.cloudflareinsights.com/**',route=>route.abort());
  if(kind==='source') await context.route('**/api/**',route=>route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>report.errors.push({suite:prefix,message:error.message}));
  const go=async path=>{await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);};
  const click=async selector=>{const locator=typeof selector==='string'?page.locator(selector):selector;await (mobile?locator.tap():locator.click());};
  const snap=async name=>{const path=resolve(kind==='source'?refs:output,prefix+'--'+name+'.png');await page.screenshot({path,animations:'disabled',caret:'hide'});return path;};
  async function check(name,fn) {
    if(process.env.RESUME && report.tests.some(t=>t.suite===prefix && t.name===name && t.pass)) return;
    report.tests=report.tests.filter(t=>!(t.suite===prefix && t.name===name));
    try {const details=await fn();report.tests.push({suite:prefix,name,pass:true,...details});console.log('PASS',prefix,name);}
    catch(error){report.tests.push({suite:prefix,name,pass:false,error:error.message});console.error('FAIL',prefix,name,error.message.slice(0,350));}
    save();
  }
  await check('theme toggles and persists between routes',async()=>{
    await go('/');await click('.theme-toggle');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    const screenshot=await snap('dark-home');await go('/about/');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await click('.theme-toggle');return {screenshot};
  });
  await check('Spotlight keyboard, fuzzy search, calculator and Escape',async()=>{
    await go('/');await page.keyboard.press('Control+k');await expect(page.locator('.spotlight')).toBeVisible();
    await page.locator('.sl-input').fill('atomic habits');await expect(page.locator('.sl-list')).toContainText('Atomic Habits');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
    await page.locator('.sl-input').fill('(12+3)*4');await expect(page.locator('.sl-list')).toContainText('60');
    const screenshot=await snap('spotlight-calculator');await page.keyboard.press('Escape');await expect(page.locator('.sl-input')).toHaveValue('');
    await page.keyboard.press('Escape');await expect(page.locator('.spotlight')).not.toBeVisible();return {screenshot};
  });
  await check('Spotlight actions: Liquid Glass on/off',async()=>{
    await go('/');await page.keyboard.press('/');await page.locator('.sl-input').fill('liquid glass');
    await click(page.locator('.sl-row').filter({hasText:'Turn on Liquid Glass'}));await expect(page.locator('html')).toHaveAttribute('data-glass','on');
    const screenshot=await snap('liquid-glass');await page.keyboard.press('Control+k');await page.locator('.sl-input').fill('liquid glass');
    await click(page.locator('.sl-row').filter({hasText:'Turn off Liquid Glass'}));await expect(page.locator('html')).not.toHaveAttribute('data-glass','on');return {screenshot};
  });
  await check('Siri transforms portrait, persists and reverses',async()=>{
    await go('/');await click('.siri-button');await expect(page.locator('.tile--avatar')).toHaveAttribute('data-look','memoji',{timeout:15000});
    await expect(page.locator('.siri-button')).toHaveAttribute('aria-pressed','true');const screenshot=await snap('memoji');
    await go('/about/');assert.ok((await page.locator('img[src*="sam-memoji"]').count())>0);
    await go('/');await click('.siri-button');await expect(page.locator('.tile--avatar')).toHaveAttribute('data-look','pixel',{timeout:15000});return {screenshot};
  });
  await check('office hours expands three weekday mailto choices',async()=>{
    await go('/');await click('.ch-slot');await expect(page.locator('.ch-slot')).toHaveAttribute('aria-expanded','true');
    assert.equal(await page.locator('.ch-day').count(),3);
    for(const href of await page.locator('.ch-day').evaluateAll(a=>a.map(x=>x.href))) assert.ok(href.startsWith('mailto:samdickie@gmail.com?subject=Office'));
    const screenshot=await snap('officehours');await page.keyboard.press('Escape');await expect(page.locator('.ch-slot')).toHaveAttribute('aria-expanded','false');return {screenshot};
  });
  await check('all five app switcher tabs update selected content',async()=>{
    await go('/');
    for(const app of ['dia','gumroad','substack','podcasts','notion']) {await click(`.sw-app[data-app="${app}"]`);await expect(page.locator(`.sw-app[data-app="${app}"]`)).toHaveAttribute('aria-pressed','true');}
    return {apps:5};
  });
  await check('Photos cycles all seven pictures and toggles metadata',async()=>{
    await go('/');const initial=await page.locator('.ph-slide.is-active img').getAttribute('src');
    for(let i=0;i<7;i++) await click('.ph-next');
    assert.equal(await page.locator('.ph-slide.is-active img').getAttribute('src'),initial);
    await click('.ph-info-button');await expect(page.locator('.ph-info')).toBeVisible();const screenshot=await snap('photo-details');
    await page.keyboard.press('Escape');await expect(page.locator('.ph-info')).not.toBeVisible();return {screenshot,photos:7};
  });
  await check('five playlists change title, cover, count and actual Spotify target',async()=>{
    await go('/');const rows=page.locator('.sp-row');assert.equal(await rows.count(),5);
    for(let i=0;i<5;i++) {const row=rows.nth(i);const target=await row.getAttribute('data-url');await click(row);await expect(row).toHaveAttribute('aria-pressed','true');await expect(page.locator('.sp-play')).toHaveAttribute('href',target);assert.ok((await page.locator('.sp-title').innerText()).length>0);}
    return {playlists:5,playback:'Original opens Spotify; no in-page audio source.'};
  });
  await check('copy contact email and downloadable vCard',async()=>{
    await go('/');await click('.ct-copy');await expect(page.locator('.ct-status')).toHaveText('Email address copied');
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'samdickie@gmail.com');
    const vcard=await context.request.get(base+'/assets/sam-dickie.vcf');assert.equal(vcard.status(),200);assert.ok((await vcard.text()).includes('BEGIN:VCARD'));
  });
  await check('Freeform note, text, shapes, photo, undo/redo, zoom, drawing, reset',async()=>{
    await go('/');await click('.ff-expand');await expect(page.locator('.ff-expand')).toHaveAttribute('aria-expanded','true');
    const initial=await page.locator('.ff-item').count();
    await click('[data-add="note"]');await page.keyboard.type('Reference clone note');await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ff-item').count(),initial+1);
    await click('[data-add="text"]');await page.keyboard.type('Editable text');await page.keyboard.press('Escape');
    await click('[data-add="shape"]');await click(page.locator('.ff-shape-btn').filter({has:page.locator('[aria-hidden="true"]')}).nth(1));
    assert.equal(await page.locator('.ff-item').count(),initial+3);
    await page.locator('#ff-file').setInputFiles(resolve(root,'public/assets/favicon.png'));await expect(page.locator('.ff-image')).toHaveCount(1);
    const after=await page.locator('.ff-item').count();await click('[data-act="undo"]');assert.equal(await page.locator('.ff-item').count(),after-1);
    await click('[data-act="redo"]');assert.equal(await page.locator('.ff-item').count(),after);
    const zoom=await page.locator('.ff-zoom-value').innerText();
    if(mobile) {
      // Original hides +/- below 440px: exercise its real two-finger gesture.
      await page.locator('.ff-viewport').scrollIntoViewIfNeeded();
      const box=await page.locator('.ff-viewport').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
      const touch=await context.newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-30,y:cy},{id:2,x:cx+30,y:cy}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-60,y:cy},{id:2,x:cx+60,y:cy}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    } else await click('[data-zoom="in"]');
    assert.notEqual(await page.locator('.ff-zoom-value').innerText(),zoom);
    await click('[data-add="pen"]');const area=await page.locator('.ff-viewport').boundingBox();
    const strokes=await page.locator('.ff-strokes-g path').count();
    if(mobile) {
      const touch=await context.newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,x:area.x+area.width*.4,y:area.y+area.height*.4}]});
      for(let i=1;i<=12;i++) await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:3,x:area.x+area.width*(.4+i/60),y:area.y+area.height*(.4+i/60)}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    } else {await page.mouse.move(area.x+area.width*.4,area.y+area.height*.4);await page.mouse.down();await page.mouse.move(area.x+area.width*.6,area.y+area.height*.6,{steps:12});await page.mouse.up();}
    assert.ok(await page.locator('.ff-strokes-g path').count()>strokes);
    await click('[data-add="pen"]');const screenshot=await snap('freeform-edited');
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.ff-item').count(),after);
    await click('[data-act="reset"]');await click('[data-reset="confirm"]');assert.equal(await page.locator('.ff-item').count(),initial);
    return {screenshot,initialItems:initial,uploadedPhotoStored:'browser localStorage only'};
  });
  await check('layout keyboard reorder, persistence and reset',async()=>{
    await go('/');await click('.ra-edit');await expect(page.locator('.grid')).toHaveClass(/is-editing/);
    await page.locator('.tile--intro').focus();await page.keyboard.press('ArrowRight');
    const stored=await page.evaluate(()=>localStorage.getItem('tile-order'));assert.ok(stored);
    await click('.ra-done');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.tile--intro').evaluate(e=>getComputedStyle(e).order),'1');
    await click('.ra-edit');await click('.ra-reset');await click('.ra-done');assert.equal(await page.evaluate(()=>localStorage.getItem('tile-order')),null);
  });
  await check('Photo Booth camera, four effects, countdown, download and stop',async()=>{
    await go('/');await click('.pb-launch');await expect(page.locator('.pb-window')).toBeVisible();await expect(page.locator('.pb-shutter')).toBeEnabled({timeout:15000});
    await click('.pb-effects-button');await expect(page.locator('.pb-grid-cell')).toHaveCount(4);await click(page.locator('.pb-grid-cell').filter({hasText:'Pop Art'}));
    await click('.pb-shutter');await expect(page.locator('.pb-tray a')).toHaveCount(1,{timeout:15000});const screenshot=await snap('photobooth');
    const downloadPromise=page.waitForEvent('download');await click('.pb-tray a');const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.jpg'));
    await click('[aria-label="Close Photo Booth"]');await expect(page.locator('.pb-window')).not.toBeVisible();
    assert.equal(await page.locator('.pb-video').evaluate(video=>video.srcObject),null);return {screenshot,camera:'Chromium synthetic video device; no physical camera accessed'};
  });
  await check('iMessage search trigger, reply and dismissal',async()=>{
    await go('/');await page.keyboard.press('Control+k');await page.locator('.sl-input').fill('hello');await page.keyboard.press('Enter');
    await expect(page.locator('.im')).toBeVisible();if(!mobile) await page.locator('.im').hover();await click('.im-reply');await page.locator('.im-input').fill('Hello');await click('.im-send');await expect(page.locator('.im')).not.toBeVisible({timeout:5000});
  });
  await check('About section navigation and editable temporary note',async()=>{
    await go('/about/');await click('.notes-compose');await page.locator('.draft-title').fill('My temporary note');await page.locator('.draft-body').fill('A working editable note.');
    await expect(page.locator('.note-row--draft')).toContainText('My temporary note');const screenshot=await snap('about-draft');
    await click('.draft-back');await expect(page.locator('.note-document')).toBeVisible();return {screenshot};
  });
  await check('Writing topic filters hide unrelated rows and reset to 29',async()=>{
    await go('/writing/');const chips=page.locator('.wr-chip');
    for(let i=1;i<await chips.count();i++) {const chip=chips.nth(i),topic=await chip.getAttribute('data-topic');await click(chip);assert.ok(await page.locator(`.wr-row[data-topic="${topic}"]:visible`).count()>0);assert.equal(await page.locator(`.wr-row:not([data-topic="${topic}"]):visible`).count(),0);}
    await click(chips.first());assert.equal(await page.locator('.wr-row:visible').count(),29);
  });
  await check('Books filters, all 42 detail cards and deep links',async()=>{
    await go('/books/');const chips=page.locator('.bk-chip');
    for(let i=1;i<await chips.count();i++) {const chip=chips.nth(i),topic=await chip.getAttribute('data-topic');await click(chip);assert.equal(await page.locator(`.bk-book:not([data-topic="${topic}"]):visible`).count(),0);}
    await click(chips.first());assert.equal(await page.locator('.bk-book:visible').count(),42);
    for(let i=0;i<42;i++) {await click(page.locator('.bk-link').nth(i));await expect(page.locator('.bk-card')).toBeVisible();assert.ok((await page.locator('.bk-card-title').innerText()).length>0);await click('.bk-close');}
    await go('/books/#atomic-habits');await expect(page.locator('.bk-card-title')).toHaveText('Atomic Habits');return {cards:42,screenshot:await snap('book-details')};
  });
  if(kind==='clone') await check('book rating updates server, then survives reload',async()=>{
    await go('/books/#atomic-habits');await click('.bk-rate-star[data-stars="5"]');await expect(page.locator('.bk-readers-text')).toContainText('Thanks, you gave it 5 out of 5');
    await page.reload({waitUntil:'networkidle'});await expect(page.locator('.bk-rate-star[data-stars="5"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.bk-readers-text')).toContainText('5.0');
  });
  await check('newsletter quick replies and invalid email validation',async()=>{
    await go('/newsletter/');const chips=page.locator('.ms-chip');const count=await chips.count();assert.ok(count>0);
    for(let i=0;i<count;i++) await click(chips.first());
    await page.locator('.ms-input').fill('invalid-email');await click('.ms-send');await expect(page.locator('.ms-thread')).toContainText('doesn’t look like an email');return {screenshot:await snap('newsletter-chat')};
  });
  if(kind==='clone') await check('newsletter valid email reaches persistent local import queue',async()=>{
    await go('/newsletter/');const email=`qa-${mobile?'mobile':'desktop'}@example.com`;await page.locator('.ms-input').fill(email);await click('.ms-send');
    await expect(page.locator('.ms-thread')).toContainText('You’re on the list',{timeout:12000});
    assert.equal(JSON.parse(readFileSync(join(dataDir,'store.json'),'utf8')).subscribers[email].status,'pending-import');
  });
  await check('old-site sidebar, overview, back/forward and linked screenshot',async()=>{
    await go('/projects/old-site/');await click('.os-sidebar-toggle');await click('.os-sidebar-toggle');
    await click('.os-overview-toggle');await expect(page.locator('.os-overview')).toBeVisible();assert.equal(await page.locator('.os-card').count(),48);
    await click(page.locator('.os-card').nth(1));await expect(page.locator('.os-path')).toHaveText('/about');
    await click('.os-back');await expect(page.locator('.os-path')).toHaveText('');await click('.os-forward');await expect(page.locator('.os-path')).toHaveText('/about');return {screenshot:await snap('old-site-about')};
  });
  await check('VR actual audio play and pause',async()=>{
    await go('/vr/');await click('.vr-sound');await expect(page.locator('.vr-sound')).toHaveAttribute('aria-pressed','true');
    await expect.poll(()=>page.locator('.vr-audio').evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
    await click('.vr-sound');await expect(page.locator('.vr-sound')).toHaveAttribute('aria-pressed','false');
  });
  await context.close();
}
try {for(const mobile of [false,true]) for(const kind of ['source','clone']) await suite(kind,mobile);}
finally {await browser.close();await new Promise(resolve=>server.close(resolve));rmSync(dataDir,{recursive:true,force:true});save();}
const failed=report.tests.filter(t=>!t.pass);console.log(`${report.tests.length-failed.length}/${report.tests.length} checks passed; ${report.errors.length} runtime errors`);
if(failed.length || report.errors.length) process.exitCode=1;
