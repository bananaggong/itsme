import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = resolve(process.env.DATA_DIR || resolve(root, '.data'), 'store.json');
const messages = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).messages || {} : {};
console.log(JSON.stringify(Object.values(messages).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), null, 2));
