import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const sessionAge = 7 * 24 * 60 * 60;
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: {
  'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers
} });

export function hashInboxPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function validHash(hash) { return /^scrypt:[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash || ''); }
function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !validHash(hash)) return false;
  const [, salt, expected] = hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(expected, 'hex'));
}

function cookieSettings(url) {
  const secure = url.protocol === 'https:';
  return { name: secure ? '__Host-gwangil-inbox' : 'gwangil-inbox', suffix: `Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}` };
}

function tokenFrom(request, name) {
  const token = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token || '') ? token : null;
}

function rows(store) {
  return Object.values(store.messages || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ id, message, email, createdAt, status }) => ({ id, message, email, createdAt, status: status === 'read' ? 'read' : 'unread' }));
}

export function inboxCSV(messages) {
  const cell = value => {
    let text = String(value ?? '');
    // Spreadsheet formulas can start after spaces or control characters, too.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const date = value => new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
  return '\ufeff' + [['받은 시각 (한국)', '상태', '메시지', '답장받을 이메일', '메시지 ID'], ...messages.map(note => [date(note.createdAt), note.status === 'read' ? '읽음' : '안 읽음', note.message, note.email || '', note.id])].map(row => row.map(cell).join(',')).join('\r\n');
}

export function createInboxHandler({ readStore, mutate, passwordHash, now = Date.now }) {
  return async request => {
    const url = new URL(request.url);
    if (!validHash(passwordHash)) return json({ ok: false, message: '메시지함이 아직 설정되지 않았어요.' }, 503);
    if (!['GET', 'POST'].includes(request.method)) return json({ ok: false }, 405, { Allow: 'GET, POST' });
    if (request.method === 'POST' && request.headers.get('origin') !== url.origin) return json({ ok: false }, 403);
    if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false }, 403);
    const cookie = cookieSettings(url);
    const token = tokenFrom(request, cookie.name);
    const tokenHash = token ? sha(token) : null;
    const credentialVersion = sha(passwordHash);
    try {
      let data;
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.includes('application/json')) return json({ ok: false }, 415);
        let bytes = 0, text = '';
        const reader = request.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const part = await reader.read(); if (part.done) break;
            bytes += part.value.byteLength;
            if (bytes > 4096) { await reader.cancel(); return json({ ok: false }, 413); }
            text += decoder.decode(part.value, { stream: true });
          }
          text += decoder.decode();
        }
        data = JSON.parse(text);
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ ok: false }, 400);
      }
      if (data?.action === 'login') {
        const address = createHmac('sha256', passwordHash).update(request.headers.get('x-real-ip') || 'unknown').digest('hex');
        const allowed = await mutate(store => {
          store.inboxLoginLimits ||= {};
          for (const [key, entry] of Object.entries(store.inboxLoginLimits)) if (entry.until <= now()) delete store.inboxLoginLimits[key];
          const limit = store.inboxLoginLimits[address] ||= { count: 0, until: now() + 900000 };
          if (limit.count >= 6) return false;
          limit.count++; return true;
        });
        if (!allowed) return json({ ok: false, message: '잠시 후 다시 로그인해 주세요.' }, 429, { 'Retry-After': '900' });
        if (!verifyPassword(data.password, passwordHash)) return json({ ok: false, message: '비밀번호를 확인해 주세요.' }, 401);
        const nextToken = randomBytes(32).toString('base64url');
        await mutate(store => {
          store.inboxSessions ||= {};
          for (const [key, session] of Object.entries(store.inboxSessions)) if (session.expiresAt <= now()) delete store.inboxSessions[key];
          if (tokenHash) delete store.inboxSessions[tokenHash];
          store.inboxSessions[sha(nextToken)] = { expiresAt: now() + sessionAge * 1000, credentialVersion };
          delete store.inboxLoginLimits[address];
        });
        return json({ ok: true }, 200, { 'Set-Cookie': `${cookie.name}=${nextToken}; Max-Age=${sessionAge}; ${cookie.suffix}` });
      }
      const store = await readStore();
      const session = tokenHash && store.inboxSessions?.[tokenHash];
      if (!session || session.expiresAt <= now() || session.credentialVersion !== credentialVersion) return json({ ok: false }, 401);
      if (request.method === 'GET') {
        const messages = rows(store);
        if (url.searchParams.get('format') === 'csv') return new Response(inboxCSV(messages), { headers: {
          'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="gwangil-messages.csv"',
          'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow'
        } });
        return json({ ok: true, messages });
      }
      if (data.action === 'logout') {
        await mutate(value => { delete value.inboxSessions?.[tokenHash]; });
        return json({ ok: true }, 200, { 'Set-Cookie': `${cookie.name}=; Max-Age=0; ${cookie.suffix}` });
      }
      if (data.action === 'status' && typeof data.id === 'string' && ['read', 'unread'].includes(data.status)) {
        const updated = await mutate(value => {
          if (!Object.hasOwn(value.messages || {}, data.id)) return false;
          value.messages[data.id].status = data.status;
          return true;
        });
        return json({ ok: updated }, updated ? 200 : 404);
      }
      return json({ ok: false }, 400);
    } catch (error) {
      return json({ ok: false, message: '연결을 확인한 뒤 다시 시도해 주세요.' }, error instanceof SyntaxError ? 400 : 503);
    }
  };
}
