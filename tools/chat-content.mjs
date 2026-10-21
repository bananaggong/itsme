import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const chatRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(chatRoot, 'public');
export function validateChat(data) {
  if (data.version !== 1 || !Array.isArray(data.questions) || !data.questions.length) throw new Error('질문 목록이 비어 있습니다.');
  const ids = new Set();
  for (const q of data.questions) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(q.id) || ids.has(q.id)) throw new Error(`질문 ID가 잘못되었거나 중복됩니다: ${q.id}`);
    ids.add(q.id);
    if (typeof q.question !== 'string' || !q.question.trim() || !q.topic?.trim()) throw new Error(`${q.id}: 질문과 주제를 채워주세요.`);
    if (typeof q.published !== 'boolean' || typeof q.featured !== 'boolean' || !Array.isArray(q.keywords) || !Array.isArray(q.followups)) throw new Error(`${q.id}: 공개/첫 질문/키워드/후속 질문 형식을 확인하세요.`);
    if (!Array.isArray(q.answers) || (q.published && !q.answers.length)) throw new Error(`${q.id}: 공개 질문에는 답변이 필요합니다.`);
    for (const a of q.answers) {
      if (!['text', 'photo', 'link'].includes(a.type) || !a.content?.trim()) throw new Error(`${q.id}: 답변 유형 또는 내용이 비어 있습니다.`);
      if (a.type === 'text') continue;
      if (!a.description?.trim()) throw new Error(`${q.id}: 사진 설명/링크 제목을 채워주세요.`);
      const url = new URL(a.content, 'https://gwangil.xyz');
      if (!(a.content.startsWith('/') && !a.content.startsWith('//')) && !a.content.startsWith('https://')) throw new Error(`${q.id}: /로 시작하는 내부 경로나 https:// 링크만 사용할 수 있습니다.`);
      if (url.username || url.password) throw new Error(`${q.id}: 인증정보가 있는 주소는 사용할 수 없습니다.`);
      if (a.type === 'photo') {
        if (!a.content.startsWith('/personal/') || /[?#]/.test(a.content)) throw new Error(`${q.id}: 사진은 /personal/ 아래 로컬 파일 경로를 넣어주세요.`);
        const file = resolve(publicRoot, '.' + a.content);
        if (!file.startsWith(publicRoot + sep) || !/\.(webp|png|jpe?g|gif)$/i.test(file) || !existsSync(file)) throw new Error(`${q.id}: 사진 파일을 찾을 수 없습니다: ${a.content}`);
      }
    }
  }
  for (const q of data.questions) for (const id of q.followups) {
    if (!ids.has(id) || id === q.id) throw new Error(`${q.id}: 후속 질문 ID를 확인하세요: ${id}`);
  }
  const published = data.questions.filter(q => q.published);
  if (!published.length) throw new Error('공개 질문을 하나 이상 설정해주세요.');
  const available = new Set(published.map(q => q.id));
  return { version: 1, questions: published.map(({ notes, published, ...q }) => ({ ...q, followups: q.followups.filter(id => available.has(id)) })) };
}

export function writeChat(data, { saveSource = false } = {}) {
  const published = validateChat(data);
  const write = (path, value) => { writeFileSync(path + '.tmp', JSON.stringify(value, null, 2) + '\n'); renameSync(path + '.tmp', path); };
  if (saveSource) write(resolve(chatRoot, 'personalization/chat-content.json'), data);
  write(resolve(publicRoot, 'personal/chat-data.json'), published);
  return published;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = writeChat(JSON.parse(readFileSync(resolve(chatRoot, 'personalization/chat-content.json'), 'utf8')));
  console.log(`Chat: ${result.questions.length} published questions`);
}
