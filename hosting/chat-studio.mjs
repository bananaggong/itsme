import {createHash, randomUUID} from 'node:crypto';
import {hasInboxSession} from './message-inbox.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const mediaRef = id => `/api/chat-media/?id=${id}`;
const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
const json = (value,status=200,headers={}) => Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',...headers}});
async function bytes(request,limit) {
  if(Number(request.headers.get('content-length'))>limit) fail(413,'파일이나 답변이 너무 커요.');
  const reader=request.body?.getReader(),parts=[];let size=0;
  if(reader) while(true) {const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail(413,'파일이나 답변이 너무 커요.');}parts.push(value);}
  return Buffer.concat(parts);
}
function validateBlocks(blocks,store,assets) {
  if(!Array.isArray(blocks)||blocks.length>60)fail(400,'답변은 말풍선 60개까지 저장할 수 있어요.');
  const ids=new Set();
  return blocks.map(b=>{
    if(!b||!uuid.test(b.id)||ids.has(b.id))fail(400,'말풍선 정보를 확인해주세요.');ids.add(b.id);
    if(!['text','photo','link'].includes(b.type)||typeof b.content!=='string'||!b.content.trim()||b.content.length>6000)fail(400,'비어 있는 말풍선이나 너무 긴 답변을 확인해주세요.');
    const result={id:b.id,type:b.type,content:b.content};
    if(b.type==='text')return result;
    if(typeof b.description!=='string'||!b.description.trim()||b.description.length>500)fail(400,'사진 설명이나 링크 제목을 적어주세요.');
    result.description=b.description;
    if(b.type==='photo') {
      const id=b.content.match(/^\/api\/chat-media\/\?id=([a-f0-9-]+)$/i)?.[1];
      if(!assets.has(b.content)&&!(id&&uuid.test(id)&&store.chatStudio?.media?.[id]))fail(400,'업로드한 사진을 선택해주세요.');
    } else {
      let url;try{url=new URL(b.content,'https://gwangil.xyz');}catch{fail(400,'올바른 링크를 적어주세요.');}
      if(!b.content.startsWith('https://')&&!/^\/(?!\/)/.test(b.content)||url.protocol!=='https:'||url.username||url.password||b.content.includes('\\'))fail(400,'https:// 링크를 사용해주세요.');
    }
    return result;
  });
}
export function publicChat(bank,store) {
  const questions=bank.flatMap(q=>{
    const record=store.chatStudio?.records?.[q.id];
    if(record?.hidden)return [];
    const answers=record?.live?.blocks||q.seedAnswers;
    if(!answers?.length)return [];
    return [{id:q.id,topic:q.topic,question:q.question,keywords:q.keywords,followups:q.followups,featured:q.featured,answers:answers.map(({type,content,description})=>({type,content,...(description?{description}:{})}))}];
  });
  const ids=new Set(questions.map(q=>q.id));
  return {version:1,questions:questions.map(q=>({...q,followups:q.followups.filter(id=>ids.has(id))}))};
}

export function createChatHandler({bank,readStore,mutate,passwordHash,writeImage,readImage,now=Date.now}) {
  const byId=new Map(bank.map(q=>[q.id,q]));
  const assets=new Set(bank.flatMap(q=>(q.seedAnswers||[]).filter(a=>a.type==='photo').map(a=>a.content)));
  const auth=(req,store)=>{if(!hasInboxSession(req,store,passwordHash,now()))fail(401,'작성 공간에 로그인해주세요.');};
  return async request=>{
    try {
      const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
      if(!['GET','POST'].includes(request.method))return json({ok:false},405,{Allow:'GET, POST'});
      if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))fail(403,'같은 사이트에서 요청해주세요.');
      const store=await readStore();
      if(path==='/api/chat-content') {
        if(request.method!=='GET')fail(405,'지원하지 않는 요청이에요.');
        return json(publicChat(bank,store));
      }
      if(path==='/api/chat-media'&&request.method==='GET') {
        const id=url.searchParams.get('id');if(!uuid.test(id||''))fail(404,'사진을 찾지 못했어요.');
        const entry=store.chatStudio?.media?.[id];
        const published=Object.values(store.chatStudio?.records||{}).some(r=>!r.hidden&&r.live?.blocks.some(b=>b.type==='photo'&&b.content===mediaRef(id)));
        if(!entry||(!published&&!hasInboxSession(request,store,passwordHash,now())))fail(404,'사진을 찾지 못했어요.');
        const image=await readImage(entry);if(!image)fail(404,'사진을 찾지 못했어요.');
        return new Response(image,{headers:{'Content-Type':entry.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Disposition':'inline'}});
      }
      auth(request,store);
      if(path==='/api/chat-media') {
        const content=await bytes(request,3_000_000);
        const type=request.headers.get('content-type')?.split(';')[0];
        const valid=type==='image/jpeg'?content.subarray(0,3).equals(Buffer.from([255,216,255])):
          type==='image/png'?content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
          type==='image/webp'?content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP':false;
        if(!valid||content.length<32)fail(400,'JPG, PNG, WebP 사진을 선택해주세요.');
        const id=randomUUID(),entry=await writeImage(id,content,type);
        await mutate(next=>{auth(request,next);next.chatStudio||={records:{},media:{}};next.chatStudio.media[id]={...entry,type,createdAt:new Date(now()).toISOString()};});
        return json({ok:true,id,content:mediaRef(id)});
      }
      if(path!=='/api/chat-studio')fail(404,'찾을 수 없는 주소예요.');
      if(request.method==='GET') {
        const data={ok:true,questions:bank,records:store.chatStudio?.records||{}};
        return json(data,200,url.searchParams.get('format')==='export'?{'Content-Disposition':'attachment; filename="gwangil-chat-answers.json"'}:{});
      }
      if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'요청 형식을 확인해주세요.');
      const data=JSON.parse((await bytes(request,200_000)).toString('utf8'));
      if(!data||!byId.has(data.questionId)||!uuid.test(data.requestId||'')||!Number.isInteger(data.revision)||data.revision<0)fail(400,'질문이나 저장 정보를 확인해주세요.');
      if(!['save','publish','unpublish'].includes(data.action))fail(400,'지원하지 않는 요청이에요.');
      const digest=createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const record=await mutate(next=>{
        auth(request,next);
        next.chatStudio||={records:{},media:{}};
        const previous=next.chatStudio.records[data.questionId];
        if(previous?.lastRequest?.id===data.requestId) {
          if(previous.lastRequest.digest!==digest)fail(409,'저장 요청이 달라졌어요. 다시 시도해주세요.');
          return previous;
        }
        if((previous?.revision||0)!==data.revision)fail(409,'다른 화면에서 답변이 수정됐어요. 서버 저장본을 불러와 비교해주세요. 현재 초안은 이 브라우저에 남아 있어요.');
        const updated={...previous,revision:data.revision+1,updatedAt:new Date(now()).toISOString(),lastRequest:{id:data.requestId,digest}};
        if(data.action==='save') {
          if(!['draft','completed','skipped'].includes(data.status))fail(400,'답변 상태를 확인해주세요.');
          updated.blocks=validateBlocks(data.blocks,next,assets);
          if(data.status==='completed'&&!updated.blocks.length)fail(400,'답변을 한 개 이상 남겨주세요.');
          updated.status=data.status;
        } else if(data.action==='publish') {
          if(previous?.status!=='completed'||!previous.blocks?.length)fail(400,'답변 완료 후 공개해주세요.');
          updated.live={blocks:structuredClone(previous.blocks),publishedAt:new Date(now()).toISOString()};updated.hidden=false;
        } else {updated.live=null;updated.hidden=true;}
        next.chatStudio.records[data.questionId]=updated;return updated;
      });
      return json({ok:true,record});
    } catch(error) {return json({ok:false,message:error.status?error.message:error instanceof SyntaxError?'요청 내용을 확인해주세요.':'저장소에 연결하지 못했어요. 작성 내용은 유지되니 다시 시도해주세요.'},error.status||(error instanceof SyntaxError?400:503));}
  };
}
