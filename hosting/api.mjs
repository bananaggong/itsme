import books from './generated/books.json' with { type: 'json' };
import snapshot from './generated/ratings.json' with { type: 'json' };
const allowed = new Set(books);
const json = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const sha = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
function summary(book, local) {
  const seed=snapshot.ratings[book] || {average:0,count:0};
  const count=seed.count+Number(local?.count || 0);
  return {average:count ? (seed.average*seed.count+Number(local?.total || 0))/count : 0,count};
}
async function parse(request) {
  const text=await request.text();
  if(new TextEncoder().encode(text).length>8192) throw Object.assign(new Error('Too large'),{status:413});
  const data=request.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
  if(!data || typeof data!=='object' || Array.isArray(data)) throw Object.assign(new Error('Invalid request'),{status:400});
  return data;
}
export async function handleAPI(request, db, now=Date.now()) {
  const url=new URL(request.url),path=url.pathname;
  if(!['/api/ratings','/api/subscribe'].includes(path)) return json({ok:false,message:'Not found'},404);
  try {
    if(path==='/api/ratings' && request.method==='GET') {
      const {results}=await db.prepare('SELECT book, SUM(stars) AS total, COUNT(*) AS count FROM votes GROUP BY book').all();
      const local=new Map(results.map(row=>[row.book,row]));
      const slugs=new Set([...Object.keys(snapshot.ratings),...local.keys()]);
      return json({ratings:Object.fromEntries([...slugs].map(book=>[book,summary(book,local.get(book))]))});
    }
    if(request.method!=='POST') return json({ok:false,message:'Method not allowed'},405);
    const origin=request.headers.get('origin');
    if(origin && new URL(origin).origin!==url.origin) return json({ok:false,message:'Cross-origin submission rejected'},403);
    const data=await parse(request);
    if(path==='/api/ratings') {
      if(!allowed.has(data.book) || !Number.isInteger(data.stars) || data.stars<1 || data.stars>5 || typeof data.voter!=='string' || !/^[a-zA-Z0-9-]{8,100}$/.test(data.voter)) return json({ok:false,message:'Invalid rating'},400);
      const voter=await sha(data.voter);
      await db.prepare('INSERT INTO votes (book,voter,stars) VALUES (?,?,?) ON CONFLICT(book,voter) DO UPDATE SET stars=excluded.stars').bind(data.book,voter,data.stars).run();
      const row=await db.prepare('SELECT SUM(stars) AS total,COUNT(*) AS count FROM votes WHERE book=?').bind(data.book).first();
      return json({ok:true,...summary(data.book,row)});
    }
    if(data.website) return json({ok:true});
    const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ok:false,message:'Invalid email address'},400);
    const minute=Math.floor(now/60000),identity=await sha(request.headers.get('cf-connecting-ip') || request.headers.get('oai-authenticated-user-id') || 'private-preview');
    const limit=await db.prepare('INSERT INTO submission_limits (identity,minute,count) VALUES (?,?,1) ON CONFLICT(identity) DO UPDATE SET count=CASE WHEN minute=excluded.minute THEN count+1 ELSE 1 END,minute=excluded.minute RETURNING count').bind(identity,minute).first();
    if(limit.count>10) return json({ok:false,message:'Please try again in a minute'},429);
    await db.prepare('INSERT INTO subscribers (email,created_at,status) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING').bind(email,new Date(now).toISOString(),'pending-import').run();
    if(request.headers.get('accept')?.includes('application/json')) return json({ok:true});
    return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Thanks for subscribing</title><p>Thanks! Your email has been saved.</p><a href="/newsletter/">Back to the newsletter</a></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  } catch(error) {return json({ok:false,message:'Unable to complete the request'},error.status || (error instanceof SyntaxError?400:500));}
}
