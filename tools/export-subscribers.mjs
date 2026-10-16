import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './site.mjs';
const store=JSON.parse(readFileSync(resolve(process.env.DATA_DIR || resolve(root,'.data'),'store.json'),'utf8'));
console.log('email,created_at,status');
for(const entry of Object.values(store.subscribers)) console.log([entry.email,entry.createdAt,entry.status].map(value=>'"'+value.replaceAll('"','""')+'"').join(','));
