const $=s=>document.querySelector(s),api='/api/chat-studio/';
let questions=[],records={},current=null,blocks=[],editing=null,busy=false,dirty=false,revision=0,pendingRequest=null,attachmentIndex=null,attachmentType='link',playback=0;
const key=id=>'gwangil-studio-draft-v1:'+id;
const notice=(text,error=false)=>{$('#notice').textContent=text;$('#notice').dataset.error=error;};
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const button=(text,action,label)=>{const b=node('button',text);b.type='button';b.addEventListener('click',action);if(label)b.setAttribute('aria-label',label);return b;};
function localGet(id){try{return JSON.parse(localStorage.getItem(key(id)));}catch{return null;}}
function remember(){if(!current)return;try{localStorage.setItem(key(current.id),JSON.stringify({blocks,composer:$('#reply').value,editing,revision,dirty,pendingRequest}));}catch{notice('이 브라우저의 임시 보관 공간을 사용할 수 없어요. 임시저장 버튼으로 저장해주세요.',true);}}
function forget(id){try{localStorage.removeItem(key(id));}catch{}}
function lastQuestion(){try{return localStorage.getItem('gwangil-studio-current');}catch{return null;}}
function changed(){dirty=true;pendingRequest=null;remember();$('#save-state').textContent='이 브라우저에 초안 보관 중';syncActions();}
function locked(value){busy=value;document.querySelectorAll('#workspace button,#workspace input,#workspace select,#workspace textarea,#logout,#export').forEach(e=>e.disabled=value);if(!value)renderBlocks();}
async function request(body,url=api){
 const response=await fetch(url,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok){if(response.status===401){$('#login').hidden=false;$('#workspace').hidden=true;}throw Object.assign(new Error(data.message||'연결을 확인하고 다시 시도해주세요.'),{status:response.status});}return data;
}
function state(q){return records[q.id]?.status||'new';}
function list(){
 const query=$('#search').value.normalize('NFKC').toLowerCase().trim(),topic=$('#topic').value,filter=$('#filter').value;
 const found=questions.filter(q=>(!topic||q.topic===topic)&&(!query||`${q.question} ${q.section} ${q.keywords.join(' ')}`.normalize('NFKC').toLowerCase().includes(query))&&(!filter||(filter==='live'?records[q.id]?.live&&!records[q.id]?.hidden:state(q)===filter)));
 $('#question-list').replaceChildren();
 for(const q of found){const b=button(q.question,()=>choose(q));b.setAttribute('aria-current',String(q.id===current?.id));const status=({new:'아직 안 씀',draft:'작성 중',completed:'답변 완료',skipped:'나중에'})[state(q)];b.append(node('small',`${q.section} · ${status}${records[q.id]?.live&&!records[q.id]?.hidden?' · 공개 중':''}`));$('#question-list').append(b);}
 if(!found.length)$('#question-list').append(node('p','조건에 맞는 질문이 없어요.','empty'));
 $('#progress').textContent=`${questions.length}개 질문 · 완료 ${Object.values(records).filter(r=>r.status==='completed').length}개`;
}
function syncActions(){
 if(!current||busy)return;
 const saved=records[current.id],hasContent=blocks.length||$('#reply').value.trim();
 $('#complete').disabled=!hasContent;$('#preview').disabled=!hasContent;
 $('#publish').hidden=saved?.status!=='completed';$('#publish').disabled=dirty||Boolean($('#reply').value.trim());
 $('#unpublish').hidden=!(saved?.live&&!saved.hidden||current.seedAnswers.length&&!saved?.hidden);
 $('#unpublish').disabled=dirty;
 $('#add').setAttribute('aria-label',editing?'말풍선 수정':'말풍선 추가');
 $('#cancel-edit').hidden=!editing;
}
function contentNode(block,mine=true){
 const n=node(block.type==='photo'?'figure':block.type==='link'?'a':'div',undefined,'bubble '+(mine?'mine':'visitor'));
 if(block.type==='text')n.textContent=block.content;
 if(block.type==='photo'){n.classList.add('photo-block');const img=node('img');img.src=block.content;img.alt=block.description;n.append(img,node('figcaption',block.description));}
 if(block.type==='link'){n.classList.add('link-block');n.href=block.content;n.target='_blank';n.rel='noopener noreferrer';n.append(node('span',block.description+' ↗'),node('small',block.content));}
 return n;
}
function renderBlocks(){
 $('#blocks').replaceChildren();$('#empty').hidden=blocks.length>0;
 blocks.forEach((block,index)=>{const row=node('div',undefined,'answer-row');row.append(contentNode(block));const actions=node('div',undefined,'answer-tools');
  const up=button('↑',()=>move(index,-1),`${index+1}번째 말풍선 위로`),down=button('↓',()=>move(index,1),`${index+1}번째 말풍선 아래로`);up.disabled=index===0;down.disabled=index===blocks.length-1;
  actions.append(up,down,button('수정',()=>edit(index),`${index+1}번째 말풍선 수정`),button('삭제',()=>{blocks.splice(index,1);if(editing===block.id){editing=null;$('#reply').value='';}changed();renderBlocks();},`${index+1}번째 말풍선 삭제`));row.append(actions);$('#blocks').append(row);
 });syncActions();
}
function move(index,direction){if(index+direction<0||index+direction>=blocks.length)return;[blocks[index],blocks[index+direction]]=[blocks[index+direction],blocks[index]];changed();renderBlocks();}
function edit(index){const b=blocks[index];if(b.type==='text'){if($('#reply').value.trim()&&!editing){notice('먼저 작성 중인 문장을 말풍선에 추가해주세요.',true);return;}editing=b.id;$('#reply').value=b.content;$('#reply').focus();remember();syncActions();}else openAttachment(b.type,index,b.content,b.description);}
function choose(q){if(busy)return;if(current)remember();current=q;const saved=records[q.id],local=localGet(q.id);
 try{localStorage.setItem('gwangil-studio-current',q.id);}catch{}
 blocks=structuredClone(local?.dirty?local.blocks:saved?.blocks||q.seedAnswers.map(a=>({...a,id:crypto.randomUUID()})));
 revision=local?.dirty?local.revision:saved?.revision||0;dirty=Boolean(local?.dirty);pendingRequest=local?.dirty?local.pendingRequest:null;editing=local?.editing||null;
 $('#reply').value=local?.composer||'';$('#question-bubble').textContent=q.question;$('#question-meta').textContent=`${q.topic} · ${q.section}`;
 $('#seed-note').hidden=Boolean(saved)||!q.seedAnswers.length;
 $('#save-state').textContent=dirty?'이 브라우저에 초안 보관 중':saved?`저장됨 · ${new Date(saved.updatedAt).toLocaleString('ko-KR')}`:'아직 저장한 답변이 없어요.';
 $('#conflict').hidden=!(local?.dirty&&(saved?.revision||0)!==local.revision);
 $('#workspace').classList.remove('show-list');renderBlocks();list();$('#thread').scrollTop=0;notice('');
}
function addText(){const value=$('#reply').value;if(!value.trim())return false;if(!editing&&blocks.length>=60){notice('말풍선은 질문당 60개까지 남길 수 있어요.',true);return false;}
 if(editing){const b=blocks.find(b=>b.id===editing);if(b)b.content=value;}else blocks.push({id:crypto.randomUUID(),type:'text',content:value});
 editing=null;$('#reply').value='';changed();renderBlocks();$('#thread').scrollTop=$('#thread').scrollHeight;return true;
}
async function save(status='draft',action='save'){
 if(busy)return false;
 if(action==='save'&&$('#reply').value.trim()&&!addText())return false;
 const id=current.id;
 const payload={action,questionId:id,revision,...(action==='save'?{blocks:structuredClone(blocks),status}:{})};
 const fingerprint=JSON.stringify(payload);
 if(pendingRequest?.fingerprint!==fingerprint)pendingRequest={fingerprint,id:crypto.randomUUID()};remember();
 locked(true);notice(action==='publish'?'Chat에 공개하고 있어요.':'답변을 저장하고 있어요.');
 try{const result=await request({...payload,requestId:pendingRequest.id});records[id]=result.record;revision=result.record.revision;dirty=false;pendingRequest=null;forget(id);$('#conflict').hidden=true;$('#seed-note').hidden=true;$('#save-state').textContent=action==='publish'?'Chat에 공개했어요.':action==='unpublish'?'공개를 내렸어요. 답변은 보관돼요.':status==='completed'?'답변 완료 · 저장됨':'서버에 임시저장했어요.';notice(action==='save'?'답변을 저장했어요.':action==='publish'?'방문자는 이제 이 답변을 볼 수 있어요.':'방문자 화면에서 숨겼어요.');list();return true;}
 catch(e){if(e.status===409)$('#conflict').hidden=false;notice(e.name==='TimeoutError'?'저장 응답을 확인하지 못했어요. 다시 눌러도 중복 저장되지 않아요.':e instanceof TypeError?'연결하지 못했어요. 초안은 이 브라우저에 남아 있으니 다시 저장해주세요.':e.message,true);remember();return false;}
 finally{locked(false);}
}
function next(){const topic=$('#topic').value;const candidates=questions.filter(q=>q.id!==current.id&&(!topic||q.topic===topic));const after=candidates.find(q=>questions.indexOf(q)>questions.indexOf(current)&&state(q)==='new')||candidates.find(q=>state(q)==='new')||candidates[0];if(after)choose(after);}
function openAttachment(type,index=null,content='',description=''){
 attachmentType=type;attachmentIndex=index;$('#attachment-title').textContent=type==='photo'?'사진 설명':'링크 보내기';$('#url-label').hidden=$('#url').hidden=type==='photo';$('#url').type=type==='photo'?'text':'url';$('#url').required=type==='link';$('#url').value=content;$('#description-label').textContent=type==='photo'?'사진에 대한 짧은 설명':'링크 제목';$('#description').value=description;$('#attachment').showModal();(type==='photo'?$('#description'):$('#url')).focus();
}
async function upload(file){
 if(!file||busy)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25_000_000){notice('25MB 이하의 JPG, PNG, WebP 사진을 골라주세요.',true);return;}
 locked(true);notice('사진을 준비하고 있어요.');
 try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.87));if(!blob||blob.size>3_000_000)throw Error('조금 더 작은 사진을 선택해주세요.');
  const response=await fetch('/api/chat-media/',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob,signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw Object.assign(Error(data.message||'사진을 올리지 못했어요.'),{status:response.status});
  openAttachment('photo',null,data.content,file.name.replace(/\.[^.]+$/,''));notice('사진 설명을 적어 말풍선에 넣어주세요.');
 }catch(e){notice(e.message||'사진을 읽지 못했어요. 다른 사진을 선택해주세요.',true);}finally{locked(false);$('#photo-file').value='';}
}
async function play(){const run=++playback;const target=$('#preview-thread');target.replaceChildren();target.append(node('div',current.question,'bubble mine'));const snapshot=structuredClone(blocks);if($('#reply').value.trim()){if(editing){const b=snapshot.find(b=>b.id===editing);if(b)b.content=$('#reply').value;}else snapshot.push({type:'text',content:$('#reply').value});}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const b of snapshot){const typing=node('div','•••','bubble visitor typing');target.append(typing);target.scrollTop=target.scrollHeight;await new Promise(r=>setTimeout(r,reduced?0:600));typing.remove();if(run!==playback)return;target.append(contentNode(b,false));target.scrollTop=target.scrollHeight;}
}
async function load(preferred){const data=await request();questions=data.questions;records=data.records;$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=$('#export').hidden=false;$('#topic').replaceChildren(new Option('모든 주제',''));for(const t of new Set(questions.map(q=>q.topic)))$('#topic').append(new Option(t,t));choose(questions.find(q=>q.id===(preferred||lastQuestion()))||questions.find(q=>state(q)==='new'&&!q.seedAnswers.length)||questions[0]);}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{await request({action:'login',password:$('#password').value},'/api/inbox/');$('#password').value='';await load(current?.id);}catch(error){notice(error.message,true);}finally{e.submitter.disabled=false;}});
$('#logout').addEventListener('click',async()=>{remember();try{await request({action:'logout'},'/api/inbox/');$('#workspace').hidden=true;$('#login').hidden=false;$('#logout').hidden=$('#export').hidden=true;questions=[];records={};current=null;blocks=[];notice('로그아웃했어요. 이 브라우저의 미저장 초안은 다음 로그인 때 이어 쓸 수 있어요.');}catch(e){notice(e.message,true);}});
$('#search').addEventListener('input',list);$('#topic').addEventListener('change',list);$('#filter').addEventListener('change',list);
$('#show-list').addEventListener('click',()=>$('#workspace').classList.add('show-list'));
$('#reply').addEventListener('input',changed);
$('#reply').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!e.isComposing){e.preventDefault();addText();}});
$('#reply').addEventListener('paste',e=>{const file=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile();if(file){e.preventDefault();upload(file);}});
$('#compose').addEventListener('submit',e=>{e.preventDefault();addText();$('#reply').focus();});
$('#cancel-edit').addEventListener('click',()=>{editing=null;$('#reply').value='';remember();syncActions();});
$('#draft').addEventListener('click',()=>save());$('#complete').addEventListener('click',()=>save('completed'));$('#skip').addEventListener('click',async()=>{if(await save('skipped'))next();});$('#next').addEventListener('click',next);
$('#publish').addEventListener('click',()=>save(null,'publish'));$('#unpublish').addEventListener('click',()=>save(null,'unpublish'));
$('#photo').addEventListener('click',()=>$('#photo-file').click());$('#photo-file').addEventListener('change',()=>upload($('#photo-file').files[0]));$('#link').addEventListener('click',()=>openAttachment('link'));
$('#attachment-close').addEventListener('click',()=>$('#attachment').close());
$('#attachment-form').addEventListener('submit',e=>{e.preventDefault();const content=$('#url').value.trim(),description=$('#description').value.trim();if(!description)return;if(attachmentType==='link'&&!content.startsWith('https://')){notice('https://로 시작하는 링크를 넣어주세요.',true);return;}const b={id:attachmentIndex===null?crypto.randomUUID():blocks[attachmentIndex].id,type:attachmentType,content,description};if(attachmentIndex===null){if(blocks.length>=60){notice('말풍선은 질문당 60개까지 남길 수 있어요.',true);return;}blocks.push(b);}else blocks[attachmentIndex]=b;$('#attachment').close();changed();renderBlocks();$('#thread').scrollTop=$('#thread').scrollHeight;});
$('#preview').addEventListener('click',()=>{$('#preview-dialog').showModal();play();});$('#preview-close').addEventListener('click',()=>$('#preview-dialog').close());$('#preview-dialog').addEventListener('close',()=>{playback++;});$('#replay').addEventListener('click',play);
$('#server-copy').addEventListener('click',async()=>{const q=current;remember();try{localStorage.setItem(key(q.id)+':backup',JSON.stringify(localGet(q.id)));const data=await request();records=data.records;forget(q.id);current=null;choose(q);notice('서버 저장본을 불러왔어요. 이전 초안은 이 브라우저에 별도로 보관했어요.');}catch(e){notice(e.message,true);}});
$('#draft-export').addEventListener('click',()=>download({question:current,blocks,composer:$('#reply').value,revision},'gwangil-chat-draft.json'));
$('#export').addEventListener('click',async()=>{try{download(await request(null,api+'?format=export'),'gwangil-chat-answers.json');}catch(e){notice(e.message,true);}});
window.addEventListener('pagehide',remember);
load().catch(error=>{notice(error.status===401?'기존 메시지함 비밀번호로 들어오세요.':error.message,error.status!==401);$('#login').hidden=false;});
