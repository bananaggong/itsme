import { createAPI } from '../deployment/vercel/api.mjs';
import * as storage from '../deployment/vercel/blob-store.mjs';
import { createFormSubmitNotifier } from '../hosting/message-notifications.mjs';

const notifyMessage = process.env.CONTACT_NOTIFY_EMAIL ? createFormSubmitNotifier({ recipient: process.env.CONTACT_NOTIFY_EMAIL }) : undefined;
const handler = createAPI(storage, Date.now, { notifyMessage });
export default { fetch: request => notifyMessage ? handler(request) : Response.json({ ok: false, message: 'Contact notifications are not configured' }, { status: 503 }) };
