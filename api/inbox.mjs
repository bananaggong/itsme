import { createAPI } from '../deployment/vercel/api.mjs';
import * as storage from '../deployment/vercel/blob-store.mjs';

export default { fetch: createAPI(storage, Date.now, { inboxPasswordHash: process.env.INBOX_PASSWORD_HASH }) };
