import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {makeServer} from '../tools/site.mjs';
import {createAPI} from '../deployment/vercel/api.mjs';
import {hashInboxPassword} from '../hosting/message-inbox.mjs';
import bank from '../hosting/generated/chat-bank.json' with {type:'json'};
const publicSeedCount = bank.filter(q => q.seedAnswers?.length).length;

const password='test-only-studio-password-20261022',passwordHash=hashInboxPassword(password);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
const bubble=(content,type='text',description)=>({id:randomUUID(),type,content,...(description?{description}:{})});
function client(api) {
  let cookie='';
  const req=(path='/api/chat-studio/',body,headers={})=>new Request('https://gwangil.xyz'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://gwangil.xyz','Content-Type':'application/json',Cookie:cookie,...headers},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});
  return {api,req,call:(body,headers={},path='/api/chat-studio/')=>api(req(path,body,headers)),login:async()=>{const response=await api(req('/api/inbox/',{action:'login',password}));assert.equal(response.status,200);cookie=response.headers.get('set-cookie').split(';')[0];}};
}
function fixture() {
 let value={votes:{},subscribers:{},messages:{}},revision=0,fail=false;
 const images=new Map();
 const storage={
   readStore:async()=>({value:structuredClone(value),etag:revision}),
   writeStore:async(next,etag)=>{if(fail)throw Error('test storage unavailable');if(etag!==revision)return false;value=structuredClone(next);revision++;return true;},
   writeImage:async(id,content,type)=>{images.set(id,content);return {pathname:id};},
   readImage:async entry=>images.get(entry.pathname)
 };
 return {...client(createAPI(storage,Date.now,{inboxPasswordHash:passwordHash})),snapshot:()=>structuredClone(value),fail:()=>{fail=true;}};
}
const save=(blocks,extra={})=>({questionId:'bank-001',action:'save',status:'completed',revision:0,requestId:randomUUID(),blocks,...extra});
const action=(name,revision,questionId='bank-001')=>({questionId,action:name,revision,requestId:randomUUID()});
async function ok(response){assert.equal(response.status,200,await response.clone().text());return response.json();}

test('studio and exports require the existing session; only authored public snapshots reach visitors',async()=>{
 const f=fixture();assert.equal((await f.call()).status,401);assert.equal((await f.call(undefined,{},'/api/chat-studio/?format=export')).status,401);
 const publicData=await ok(await f.call(undefined,{},'/api/chat-content/'));assert.equal(publicData.questions.length,publicSeedCount);assert.ok(!publicData.questions.some(q=>q.id.startsWith('bank-')));
 await f.login();const data=await ok(await f.call());assert.equal(data.questions.length,bank.length);assert.deepEqual(data.records,{});assert.ok(!JSON.stringify(data).includes(password));
 assert.equal((await f.call(save([bubble('test')]),{Origin:'https://other.invalid'})).status,403);
 assert.equal((await f.call(save([bubble('test')]),{'sec-fetch-site':'cross-site'})).status,403);
 assert.equal((await f.call(save([bubble('test')]),{Origin:''})).status,403);
 assert.equal((await f.call(undefined,{},'/api/chat-studio/?format=export')).headers.get('content-disposition'),'attachment; filename="gwangil-chat-answers.json"');
});

test('text, images, links, order and whitespace persist; private uploads become public only while referenced by a published answer',async()=>{
 const f=fixture();assert.equal((await f.call(png,{'Content-Type':'image/png'},'/api/chat-media/')).status,401);await f.login();
 const uploaded=await ok(await f.call(png,{'Content-Type':'image/png'},'/api/chat-media/'));
 const anonymous=new Request('https://gwangil.xyz'+uploaded.content);
 assert.equal((await f.api(anonymous)).status,404);assert.equal((await f.api(f.req(uploaded.content))).status,200);
 const blocks=[bubble('  첫 번째 말풍선\n줄바꿈과 공백도 유지  '),bubble(uploaded.content,'photo','업로드 확인용 사진'),bubble('https://gwangil.xyz/','link','홈페이지'),bubble('마지막 이야기')];
 assert.equal((await ok(await f.call(save(blocks)))).record.revision,1);
 assert.deepEqual((await ok(await f.call())).records['bank-001'].blocks,blocks);
 assert.equal((await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.length,publicSeedCount);
 await ok(await f.call(action('publish',1)));
 const live=(await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.find(q=>q.id==='bank-001');
 assert.deepEqual(live.answers,blocks.map(({id,...b})=>b));assert.equal((await f.api(anonymous)).status,200);assert.deepEqual(Buffer.from(await (await f.api(anonymous)).arrayBuffer()),png);
 await ok(await f.call(save([bubble('아직 공개하지 않은 수정')],{revision:2,status:'draft'})));
 assert.deepEqual((await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.find(q=>q.id==='bank-001').answers,live.answers);
 await ok(await f.call(action('unpublish',3)));
 assert.equal((await f.api(anonymous)).status,404);assert.equal((await f.api(f.req(uploaded.content))).status,200);
 assert.ok(!(await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.some(q=>q.id==='bank-001'));
 assert.deepEqual(f.snapshot().votes,{});assert.deepEqual(f.snapshot().messages,{});
});

test('safe retries, stale revisions and concurrent tabs never overwrite a newer answer',async()=>{
 const f=fixture();await f.login();const payload=save([bubble('처음 저장')]);
 await ok(await f.call(payload));assert.equal((await ok(await f.call(payload))).record.revision,1);
 assert.equal((await f.call({...payload,blocks:[bubble('다른 내용')]})).status,409);
 assert.equal((await f.call(save([bubble('지난 탭')]))).status,409);
 const attempts=await Promise.all([f.call(save([bubble('탭 A')],{revision:1})),f.call(save([bubble('탭 B')],{revision:1}))]);
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);assert.equal(f.snapshot().chatStudio.records['bank-001'].revision,2);
 const original=f.snapshot();f.fail();assert.equal((await f.call(save([bubble('저장 실패')],{revision:2}))).status,503);assert.deepEqual(f.snapshot(),original);
});

test('invalid blocks, unsafe URLs, fake uploads and oversized requests fail without publishing anything',async()=>{
 const f=fixture();await f.login();const one=bubble('test');
 for(const blocks of [[],[one,one],[bubble(' ')],[bubble('x'.repeat(6001))],[bubble('javascript:alert(1)','link','안전하지 않은 주소')],[bubble('https://user:password@example.com/','link','주소')],[bubble('/api/chat-media/?id='+randomUUID(),'photo','없는 사진')],[bubble('https://example.com/photo.png','photo','외부 사진')]])assert.equal((await f.call(save(blocks))).status,400);
 assert.equal((await f.call(action('publish',0))).status,400);
 assert.equal((await f.call(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),{'Content-Type':'image/svg+xml'},'/api/chat-media/')).status,400);
 assert.equal((await f.call(Buffer.alloc(3_000_001),{'Content-Type':'image/png'},'/api/chat-media/')).status,413);
 assert.equal((await f.call(save([bubble('x'.repeat(210_000))]))).status,413);
 assert.ok(!f.snapshot().chatStudio?.records?.['bank-001']);
});

test('an existing example can be hidden without erasing it or revealing a private replacement',async()=>{
 const f=fixture();await f.login();const first=(await ok(await f.call())).questions[0];
 await ok(await f.call(save([bubble('작성 중인 내 답변')],{questionId:first.id,status:'draft'})));
 assert.deepEqual((await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.find(q=>q.id===first.id).answers,first.seedAnswers);
 await ok(await f.call(action('unpublish',1,first.id)));assert.ok(!(await ok(await f.call(undefined,{},'/api/chat-content/'))).questions.some(q=>q.id===first.id));
});

test('real local HTTP save and photo survive a process restart with the existing login session',async t=>{
 const dataDir=mkdtempSync(join(tmpdir(),'itsme-studio-'));let server;
 const start=async()=>{server=makeServer({dataDir,inboxPasswordHash:passwordHash});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 t.after(async()=>{if(server?.listening)await new Promise(r=>server.close(r));const checked=resolve(dataDir);assert.ok(checked.startsWith(resolve(tmpdir(),'itsme-studio-')));rmSync(checked,{recursive:true,force:true});});
 let base=await start(),cookie='';
 const send=(path,body,type='application/json')=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':type},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});
 cookie=(await send('/api/inbox/',{action:'login',password})).headers.get('set-cookie').split(';')[0];
 const media=await ok(await send('/api/chat-media/',png,'image/png'));
 const blocks=[bubble('  다시 열어도 그대로\n두 번째 줄 '),bubble(media.content,'photo','실제 파일 저장')];await ok(await send('/api/chat-studio/',save(blocks)));
 await new Promise(r=>server.close(r));base=await start();
 assert.deepEqual((await ok(await send('/api/chat-studio/'))).records['bank-001'].blocks,blocks);
 assert.deepEqual(Buffer.from(await (await send(media.content)).arrayBuffer()),png);
 assert.equal((await fetch(base+media.content)).status,404);assert.equal((await fetch(base+'/.data/store.json')).status,404);
 const page=await (await fetch(base+'/chat/studio/')).text();assert.ok(page.includes('답변 완료'));assert.ok(!page.includes('class="ms-window"'));
});
