export const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/[^\p{L}\p{N}]/gu, '');

export function searchQuestions(questions, query = '', topic = '') {
  const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return questions.map((question, index) => {
    const fields = [question.question, ...question.keywords, question.topic].map(normalize);
    const score = terms.reduce((total, term) => total + (fields.some(field => field === term) ? 10 : fields.some(field => field.includes(term)) ? 3 : 0), 0);
    return { question, index, score, matches: terms.every(term => fields.some(field => field.includes(term))) };
  }).filter(item => (!topic || item.question.topic === topic) && item.matches)
    .sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.question);
}

export function suggestions(questions, current, seen) {
  const ids = current?.followups || questions.filter(q => q.featured).map(q => q.id);
  const candidates = [...ids.map(id => questions.find(q => q.id === id)), ...questions];
  return candidates.filter((q, index) => q && q.id !== current?.id && !seen.has(q.id) && candidates.findIndex(item => item?.id === q.id) === index).slice(0, 4);
}
