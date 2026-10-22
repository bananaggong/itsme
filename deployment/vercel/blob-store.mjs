import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

const pathname = 'itsme/store.json';

export async function readStore() {
  // Compression weakens the response ETag (W/...), which cannot satisfy put's
  // strong If-Match precondition. Read the original representation for mutations.
  const result = await get(pathname, { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } });
  if (!result || result.statusCode !== 200) {
    throw Object.assign(new Error('The private store must be initialized before deployment'), { status: 503 });
  }
  if (!result.blob.etag || result.blob.etag.startsWith('W/')) {
    await result.stream?.cancel();
    throw Object.assign(new Error('Private store returned an unusable version identifier'), { status: 503 });
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

export async function writeImage(id,content,type) {
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type];
  const pathname=`itsme/chat-media/${id}.${extension}`;
  await put(pathname,content,{access:'private',contentType:type,addRandomSuffix:false,allowOverwrite:false});
  return {pathname};
}
export async function readImage(entry) {
  const result=await get(entry.pathname,{access:'private'});
  return result?.statusCode===200?result.stream:null;
}
