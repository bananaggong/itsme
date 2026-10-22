import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { personalizeHTML, personalizeJavaScript, personalizeSearchIndex } from './personalize.mjs';
import { storeContactNote } from '../hosting/contact-notes.mjs';
import { createInboxHandler } from '../hosting/message-inbox.mjs';
import { createChatHandler } from '../hosting/chat-studio.mjs';
import chatBank from '../hosting/generated/chat-bank.json' with {type:'json'};

export const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.woff2':'font/woff2', '.woff':'font/woff', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webm':'video/webm', '.ico':'image/x-icon', '.vcf':'text/vcard; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.pdf':'application/pdf' };

// Keep captured bytes on disk. Serving and building share the identity overlay
// and omit the original owner's analytics beacon.
export function cloneHTML(html) {
  return personalizeHTML(html.replace(/\s*<script\b[^>]*src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*><\/script>/g, ''));
}

export function cloneJavaScript(source, name) {
  // The captured production page has no active Turnstile site key. Its original
  // localhost-only test widget adds an empty flex gap and changes mobile geometry.
  // Exercise the production branch on the clone's localhost, too.
  return personalizeJavaScript(name==='newsletter-page.js'
    ? source.replace("const LOCAL = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);",'const LOCAL = false;')
    : source, name);
}

export const cloneJSON = (source, name) => name==='search.json' ? personalizeSearchIndex(source) : source;

export function makeServer({ publicDir=resolve(root,'public'), dataDir=process.env.DATA_DIR || resolve(root,'.data'), now=()=>Date.now(), inboxPasswordHash }={}) {
  const bookHTML = readFileSync(resolve(publicDir,'books/index.html'),'utf8');
  const bookData = JSON.parse(bookHTML.match(/<script[^>]*id="bk-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const books = new Set(bookData.map(book=>book.slug));
  const seed = JSON.parse(readFileSync(resolve(root,'reference/ratings.json'),'utf8')).ratings;
  const file = resolve(dataDir,'store.json');
  let store = existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : { votes:{}, subscribers:{} };
  const requests = new Map();
  const save = () => {
    mkdirSync(dirname(file), {recursive:true});
    const temporary = `${file}.tmp`;
    writeFileSync(temporary,JSON.stringify(store,null,2)+'\n',{mode:0o600});
    renameSync(temporary,file);
  };
  const mutateMessages = async change => {
    const next = structuredClone(store);
    const result = change(next);
    const previous = store;
    store = next;
    try { save(); } catch (error) { store = previous; throw error; }
    return result;
  };
  const summary = slug => {
    const old = seed[slug] || {average:0,count:0};
    const votes = Object.values(store.votes[slug] || {});
    const count = old.count + votes.length;
    return {average:count ? (old.average*old.count + votes.reduce((a,b)=>a+b,0))/count : 0,count};
  };
  const inbox = createInboxHandler({ readStore: async () => structuredClone(store), mutate: mutateMessages, passwordHash: inboxPasswordHash, now });
  const chat = createChatHandler({bank:chatBank,readStore:async()=>structuredClone(store),mutate:mutateMessages,passwordHash:inboxPasswordHash,now,
    writeImage:async(id,content,type)=>{const pathname=`chat-media/${id}`;const path=resolve(dataDir,pathname);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content,{mode:0o600});return {pathname};},
    readImage:async entry=>{const path=resolve(dataDir,entry.pathname);return path.startsWith(resolve(dataDir,'chat-media')+sep)&&existsSync(path)?readFileSync(path):null;}
  });
  const json = (res,status,data) => {
    res.writeHead(status,{'Content-Type':mime['.json'],'Cache-Control':'no-store'});
    res.end(JSON.stringify(data));
  };
  const body = async req => {
    let text = '';
    for await (const chunk of req) {
      text += chunk;
      if (Buffer.byteLength(text)>8192) throw Object.assign(new Error('Request too large'),{status:413});
    }
    return req.headers['content-type']?.includes('application/json') ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
  };
  return createServer(async (req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    try {
      const url = new URL(req.url,'http://localhost');
      if(url.pathname==='/downloads/' || url.pathname==='/downloads') {
        res.writeHead(302,{Location:'https://thisdickie.gumroad.com/'});return res.end();
      }
      if (url.pathname.startsWith('/api/')) {
        if (['/api/inbox','/api/chat-studio','/api/chat-content','/api/chat-media'].includes(url.pathname.replace(/\/$/, ''))) {
          const headers = new Headers(req.headers);
          headers.set('x-real-ip', req.socket.remoteAddress);
          const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(['GET','HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' }) });
          const response = await (url.pathname.replace(/\/$/,'')==='/api/inbox'?inbox:chat)(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          return res.end(Buffer.from(await response.arrayBuffer()));
        }
        if (url.pathname==='/api/ratings' && req.method==='GET') {
          const slugs = new Set([...Object.keys(seed),...Object.keys(store.votes)]);
          return json(res,200,{ratings:Object.fromEntries([...slugs].map(slug=>[slug,summary(slug)]))});
        }
        if (!['/api/ratings','/api/subscribe','/api/messages'].includes(url.pathname)) return json(res,404,{ok:false,message:'Not found'});
        if (req.method!=='POST') { res.setHeader('Allow',url.pathname==='/api/ratings'?'GET, POST':'POST');return json(res,405,{ok:false,message:'Method not allowed'}); }
        const origin = req.headers.origin;
        if (origin && new URL(origin).host!==req.headers.host) return json(res,403,{ok:false,message:'Cross-origin submission rejected'});
        const data = await body(req);
        if (!data || typeof data!=='object' || Array.isArray(data)) return json(res,400,{ok:false,message:'Invalid request'});
        if (url.pathname === '/api/messages') {
          const result = await mutateMessages(next => storeContactNote(next, data, req.socket.remoteAddress, now()));
          return json(res,200,result);
        }
        if (url.pathname==='/api/ratings') {
          if (!books.has(data.book) || !Number.isInteger(data.stars) || data.stars<1 || data.stars>5 || typeof data.voter!=='string' || !/^[a-zA-Z0-9-]{8,100}$/.test(data.voter)) return json(res,400,{ok:false,message:'Invalid rating'});
          const voter = createHash('sha256').update(data.voter).digest('hex');
          store.votes[data.book] ||= {};
          store.votes[data.book][voter] = data.stars;
          save();
          return json(res,200,{ok:true,...summary(data.book)});
        }
        if (data.website) return json(res,200,{ok:true}); // original honeypot contract
        const email = typeof data.email==='string' ? data.email.trim().toLowerCase() : '';
        if (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{ok:false,message:'Invalid email address'});
        const address = req.socket.remoteAddress;
        const window = requests.get(address);
        const recent = window?.until>now() ? window : {count:0,until:now()+60000};
        if (++recent.count>10) return json(res,429,{ok:false,message:'Please try again in a minute'});
        requests.set(address,recent);
        if (requests.size>10000) for (const [key,value] of requests) if(value.until<=now()) requests.delete(key);
        store.subscribers[email] ||= {email,createdAt:new Date(now()).toISOString(),status:'pending-import'};
        save();
        if (req.headers.accept?.includes('application/json')) return json(res,200,{ok:true});
        res.writeHead(200,{'Content-Type':mime['.html']});
        return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Thanks for subscribing</title><p>Thanks! Your email has been saved.</p><a href="/newsletter/">Back to the newsletter</a></html>');
      }
      if (!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');return json(res,405,{ok:false,message:'Method not allowed'});}
      let path;
      try {path=decodeURIComponent(url.pathname);} catch {return json(res,400,{ok:false,message:'Invalid path'});}
      if (path.includes('\0') || path.includes('\\')) return json(res,400,{ok:false,message:'Invalid path'});
      let target=resolve(publicDir,'.'+path);
      if (target!==resolve(publicDir) && !target.startsWith(resolve(publicDir)+sep)) return json(res,403,{ok:false,message:'Invalid path'});
      if (!extname(target)) {
        if (!path.endsWith('/') && existsSync(resolve(target,'index.html'))) {res.writeHead(308,{Location:path+'/'+url.search});return res.end();}
        target=resolve(target,'index.html');
      }
      let status=200;
      if(!existsSync(target)) {status=404;target=resolve(publicDir,'404.html');}
      let bytes=readFileSync(target);
      if(extname(target)==='.html') bytes=Buffer.from(cloneHTML(bytes.toString('utf8')));
      if(extname(target)==='.js') bytes=Buffer.from(cloneJavaScript(bytes.toString('utf8'),target.slice(target.lastIndexOf(sep)+1)));
      if(target===resolve(publicDir,'search.json')) bytes=Buffer.from(cloneJSON(bytes.toString('utf8'),'search.json'));
      res.writeHead(status,{'Content-Type':mime[extname(target)] || 'application/octet-stream','Cache-Control':extname(target)==='.html'?'no-cache':'public, max-age=3600','Content-Length':bytes.length});
      return res.end(req.method==='HEAD'?undefined:bytes);
    } catch(error) {
      return json(res,error.status || (error instanceof SyntaxError?400:500),{ok:false,message:error instanceof SyntaxError?'Invalid request':'Unable to complete the request'});
    }
  });
}
