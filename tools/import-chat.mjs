import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeChat, chatRoot } from './chat-content.mjs';

export function fromWorkbook(sheets) {
  const table = (name, expected) => {
    const rows = sheets[name];
    const start = rows?.findIndex(row => row.A === expected[0] && row.B === expected[1]);
    if (start === undefined || start < 0) throw new Error(`${name}: 표 머리글을 찾을 수 없습니다.`);
    const headers = expected.map((value, i) => String.fromCharCode(65 + i));
    if (headers.some((key, i) => rows[start][key] !== expected[i])) throw new Error(`${name}: 열 이름이나 순서를 바꾸지 말아주세요.`);
    return rows.slice(start + 1).filter(row => headers.some(key => String(row[key] || '').trim())).map(row => headers.map(key => String(row[key] ?? '').trim()));
  };
  const bool = (value, label) => { if (!['예', '아니오'].includes(value)) throw new Error(`${label}: 예 또는 아니오를 선택해주세요.`); return value === '예'; };
  const list = value => value.split(',').map(s => s.trim()).filter(Boolean);
  const questions = table('질문 목록', ['질문 ID', '주제', '질문', '검색 키워드', '후속 질문 ID', '첫 질문', '공개', '작성 메모']).map(([id, topic, question, keywords, followups, featured, published, notes]) => ({id, topic, question, keywords:list(keywords), followups:list(followups), featured:bool(featured,id), published:bool(published,id), notes, answers:[]}));
  const rows = table('답변 순서', ['질문 ID', '순서', '유형', '답변 / 파일 경로 / URL', '사진 설명 / 링크 제목']);
  const orders = new Set();
  for (const [id, position, type, content, description] of rows) {
    const q = questions.find(q => q.id === id);
    const order = Number(position);
    if (!q) throw new Error(`답변에 연결된 질문 ID가 없습니다: ${id}`);
    if (!Number.isInteger(order) || order < 1 || orders.has(`${id}:${order}`)) throw new Error(`${id}: 답변 순서는 1 이상의 중복되지 않는 정수여야 합니다.`);
    orders.add(`${id}:${order}`);
    q.answers.push({type, content, ...(description ? {description} : {}), order});
  }
  questions.forEach(q => { q.answers.sort((a,b)=>a.order-b.order); q.answers.forEach(a => delete a.order); });
  return {version:1, questions};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const path = process.argv[2];
    if (!path || !/\.xlsx$/i.test(path)) throw new Error('사용법: npm run chat:import -- "엑셀 파일 전체 경로.xlsx"');
    const parsed = spawnSync(process.env.PYTHON || 'python', [resolve(chatRoot, 'tools/read-chat-xlsx.py'), resolve(path)], {encoding:'utf8', maxBuffer:20_000_000, windowsHide:true});
    if (parsed.error) throw new Error('Python 3이 필요합니다. PYTHON 환경변수에 Python 실행 경로를 설정할 수도 있습니다.');
    if (parsed.status !== 0) throw new Error(parsed.stderr.trim());
    const result = writeChat(fromWorkbook(JSON.parse(parsed.stdout)), {saveSource:true});
    console.log(`반영 완료: 공개 질문 ${result.questions.length}개. 로컬 서버를 다시 시작하고 /chat/에서 확인하세요.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
