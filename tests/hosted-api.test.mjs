import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { handleAPI } from '../hosting/api.mjs';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_sour_gideon.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
after(()=>sqlite.close());
const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async run(){return sqlite.prepare(sql).run(...args);},async first(){return sqlite.prepare(sql).get(...args);},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}};
const request=(path,data,extra={})=>new Request('https://preview.example'+path,{method:data===undefined?'GET':'POST',headers:{Accept:'application/json','Content-Type':'application/json',...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});

test('hosted D1 ratings preserve source seeds and replace an existing reader vote',async()=>{
  const input={book:'atomic-habits',stars:5,voter:'hosted-test-reader'};
  assert.deepEqual(await (await handleAPI(request('/api/ratings',input),db)).json(),{ok:true,average:5,count:1});
  input.stars=3;
  assert.deepEqual(await (await handleAPI(request('/api/ratings',input),db)).json(),{ok:true,average:3,count:1});
  input.voter='another-test-reader';input.stars=5;
  assert.deepEqual(await (await handleAPI(request('/api/ratings',input),db)).json(),{ok:true,average:4,count:2});
  const data=await (await handleAPI(request('/api/ratings'),db)).json();
  assert.deepEqual(data.ratings['atomic-habits'],{average:4,count:2});
  assert.deepEqual(data.ratings['the-infinity-machine'],{average:5,count:1});
});
test('hosted subscription queue deduplicates and persists pending imports',async()=>{
  for(const email of ['Test@Example.com','test@example.com']) assert.deepEqual(await (await handleAPI(request('/api/subscribe',{email,website:''}),db,0)).json(),{ok:true});
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM subscribers').get().count,1);
  assert.equal(sqlite.prepare('SELECT status FROM subscribers').get().status,'pending-import');
});
test('hosted endpoints reject invalid data, cross-origin requests and rate excess',async()=>{
  assert.equal((await handleAPI(request('/api/ratings',{book:'missing',voter:'test-reader',stars:4}),db)).status,400);
  assert.equal((await handleAPI(request('/api/subscribe',{email:'bad'}),db)).status,400);
  assert.equal((await handleAPI(request('/api/subscribe',{email:'test@example.com'},{Origin:'https://other.example'}),db)).status,403);
  for(let i=0;i<10;i++) assert.equal((await handleAPI(request('/api/subscribe',{email:`test${i}@example.com`}),db,120000)).status,200);
  assert.equal((await handleAPI(request('/api/subscribe',{email:'last@example.com'}),db,120000)).status,429);
  assert.equal((await handleAPI(request('/api/subscribe',{email:'next@example.com'}),db,180000)).status,200);
});
