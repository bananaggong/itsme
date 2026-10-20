import { randomUUID, timingSafeEqual } from 'node:crypto';

const failure = code => Object.assign(new Error('Message notification failed'), { code });

export function createFormSubmitNotifier({ recipient, fetchImpl = fetch, timeoutMs = 45000 } = {}) {
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw failure('invalid_recipient');
  return async note => {
    const body = {
      name: 'GWANGIL.XYZ', message: note.message,
      reference: note.id,
      receivedAt: new Date(note.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' (한국 시간)',
      _subject: `[gwangil.xyz] 새 메시지 · ${note.id.slice(0, 8)}`,
      _url: 'https://gwangil.xyz/', _captcha: 'false', _template: 'table',
      ...(note.email ? { email: note.email, _replyto: note.email } : { replyAddress: '답장받을 이메일을 남기지 않았어요.' })
    };
    let response;
    try {
      response = await fetchImpl(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://gwangil.xyz/' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)
      });
    } catch { throw failure('provider_unreachable'); }
    const result = await response.json().catch(() => null);
    if (/activat/i.test(result?.message || '')) throw failure('activation_required');
    if (!response.ok || ![true, 'true'].includes(result?.success)) throw failure('provider_rejected');
    // The provider accepted the email. This is not a claim that the inbox received it.
    return { provider: 'formsubmit' };
  };
}

// Persist the claim before the network call. Concurrent requests and cron runs share it.
export async function deliverMessageNotifications({ mutate, notify, now = Date.now, id, limit = 2 }) {
  if (!notify) return { accepted: 0, deferred: 0 };
  const leaseId = randomUUID();
  const claimed = await mutate(store => {
    const timestamp = now();
    const candidates = Object.values(store.messages || {}).filter(note => {
      if (id && note.id !== id) return false;
      const delivery = note.notification;
      return delivery?.status !== 'accepted' && !(delivery?.leaseUntil > timestamp) && !(delivery?.nextAttemptAt > timestamp);
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, limit);
    for (const note of candidates) {
      note.notification = {
        status: 'sending', attempts: (note.notification?.attempts || 0) + 1,
        leaseId, leaseUntil: timestamp + 120000, updatedAt: new Date(timestamp).toISOString()
      };
    }
    return structuredClone(candidates);
  });
  const results = await Promise.all(claimed.map(async note => {
    let provider, code;
    try { provider = await notify(note); }
    catch (error) { code = ['activation_required', 'provider_unreachable', 'provider_rejected'].includes(error.code) ? error.code : 'provider_error'; }
    await mutate(store => {
      const current = store.messages?.[note.id];
      if (current?.notification?.leaseId !== leaseId) return;
      const timestamp = now();
      current.notification = {
        status: code ? 'pending' : 'accepted', attempts: note.notification.attempts,
        updatedAt: new Date(timestamp).toISOString(),
        ...(code ? {
          errorCode: code,
          nextAttemptAt: timestamp + Math.min(86400000, 300000 * 2 ** Math.min(note.notification.attempts - 1, 8))
        } : { provider: provider.provider, acceptedAt: new Date(timestamp).toISOString() })
      };
    });
    return code ? 'deferred' : 'accepted';
  }));
  return { accepted: results.filter(value => value === 'accepted').length, deferred: results.filter(value => value === 'deferred').length };
}

export function isNotificationRetryAuthorized(request, secret) {
  if (!secret || secret.length < 32) return false;
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
