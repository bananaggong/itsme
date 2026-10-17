import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

const pathname = 'itsme/store.json';

export async function readStore() {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) {
    throw Object.assign(new Error('The private store must be initialized before deployment'), { status: 503 });
  }
  return { value: await new Response(result.stream).json(), etag: result.blob.etag };
}

export async function writeStore(value, etag) {
  try {
    await put(pathname, JSON.stringify(value), {
      access: 'private', contentType: 'application/json', addRandomSuffix: false,
      allowOverwrite: true, ifMatch: etag, cacheControlMaxAge: 60,
    });
    return true;
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return false;
    throw error;
  }
}
