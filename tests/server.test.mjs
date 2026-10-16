import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeServer } from '../tools/site.mjs';

const dataDir=mkdtempSync(join(tmpdir(),'itsme-test-'));
let server,base;
before(async()=>{
  server=makeServer({dataDir});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dataDir,{recursive:true,force:true});});
const post=(path,data,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...headers},body:JSON.stringify(data)});

test('all 42 routes serve captured content and no original analytics',async()=>{
  const routes=JSON.parse(readFileSync(new URL('../reference/routes.json',import.meta.url),'utf8'));
  for(const route of routes) {
    const response=await fetch(base+route.path);
    assert.equal(response.status,200,route.path);
    const html=await response.text();
    assert.ok(html.includes('<html'),route.path);
    assert.ok(!html.includes('src="https://static.cloudflareinsights.com/'));
    assert.ok(response.headers.get('permissions-policy').includes('camera=(self)'));
  }
});
test('404, trailing slash, downloads redirect and HEAD preserve route behavior',async()=>{
  assert.equal((await fetch(base+'/missing/')).status,404);
  const trailing=await fetch(base+'/books?from=test',{redirect:'manual'});
  assert.equal(trailing.status,308);assert.equal(trailing.headers.get('location'),'/books/?from=test');
  const downloads=await fetch(base+'/downloads/',{redirect:'manual'});
  assert.equal(downloads.status,302);assert.equal(downloads.headers.get('location'),'https://thisdickie.gumroad.com/');
  const head=await fetch(base+'/assets/sam-memoji.webp',{method:'HEAD'});
  assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.ok(Number(head.headers.get('content-length'))>0);
  const original=readFileSync(new URL('../public/newsletter-page.js',import.meta.url),'utf8');
  assert.ok(original.includes('const LOCAL = /^(localhost'));
  const served=await (await fetch(base+'/newsletter-page.js')).text();
  assert.ok(served.includes('const LOCAL = false;'));
});
test('rating saves, re-rating replaces the vote, and a second reader changes the mean',async()=>{
  const book='atomic-habits';
  let response=await post('/api/ratings',{book,stars:5,voter:'test-reader-one'});
  assert.deepEqual(await response.json(),{ok:true,average:5,count:1});
  response=await post('/api/ratings',{book,stars:3,voter:'test-reader-one'});
  assert.deepEqual(await response.json(),{ok:true,average:3,count:1});
  response=await post('/api/ratings',{book,stars:5,voter:'test-reader-two'});
  assert.deepEqual(await response.json(),{ok:true,average:4,count:2});
  const ratings=await (await fetch(base+'/api/ratings')).json();
  assert.deepEqual(ratings.ratings[book],{average:4,count:2});
  assert.deepEqual(ratings.ratings['the-infinity-machine'],{average:5,count:1});
  const stored=JSON.parse(readFileSync(join(dataDir,'store.json'),'utf8'));
  assert.ok(!Object.keys(stored.votes[book]).includes('test-reader-one'));
});
test('ratings reject invalid books, ranges, voter IDs and cross-origin writes',async()=>{
  for(const data of [{book:'missing',stars:3,voter:'test-reader'},{book:'atomic-habits',stars:6,voter:'test-reader'},{book:'atomic-habits',stars:2.5,voter:'test-reader'},{book:'atomic-habits',stars:2,voter:'x'}]) assert.equal((await post('/api/ratings',data)).status,400);
  assert.equal((await post('/api/ratings',{book:'atomic-habits',stars:3,voter:'test-reader'},{Origin:'https://another.example'})).status,403);
});
test('subscription collector validates, deduplicates and persists a real import queue',async()=>{
  assert.equal((await post('/api/subscribe',{email:'bad'})).status,400);
  assert.equal((await post('/api/subscribe',{email:'test@example.com',website:'spam'})).status,200);
  assert.deepEqual(await (await post('/api/subscribe',{email:'Test@Example.com',website:''})).json(),{ok:true});
  await post('/api/subscribe',{email:'test@example.com',website:''});
  const store=JSON.parse(readFileSync(join(dataDir,'store.json'),'utf8'));
  assert.equal(Object.keys(store.subscribers).length,1);
  assert.equal(store.subscribers['test@example.com'].status,'pending-import');
});
test('malformed, null and oversized bodies fail and internal data is not served',async()=>{
  assert.equal((await post('/api/ratings',null)).status,400);
  assert.equal((await fetch(base+'/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'})).status,400);
  assert.equal((await post('/api/subscribe',{email:'x'.repeat(9000)})).status,413);
  assert.equal((await fetch(base+'/.data/store.json')).status,404);
  assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,403);
  assert.equal((await fetch(base+'/api/unknown')).status,404);
});
test('data remains after a server restart',async()=>{
  const second=makeServer({dataDir});
  await new Promise(resolve=>second.listen(0,'127.0.0.1',resolve));
  try {
    const data=await (await fetch(`http://127.0.0.1:${second.address().port}/api/ratings`)).json();
    assert.deepEqual(data.ratings['atomic-habits'],{average:4,count:2});
  } finally {await new Promise(resolve=>second.close(resolve));}
});
