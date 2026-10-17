import { get, put } from '@vercel/blob';

const pathname = 'itsme/store.json';
const existing = await get(pathname, { access: 'private', useCache: false });
if (existing) {
  console.log('Private store already exists; preserved without changes.');
} else {
  await put(pathname, JSON.stringify({ votes: {}, subscribers: {}, limits: {} }), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false,
    allowOverwrite: false, cacheControlMaxAge: 60,
  });
  console.log('Initialized empty private itsme store.');
}
