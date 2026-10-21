import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateChat} from '../tools/chat-content.mjs';
import {fromWorkbook} from '../tools/import-chat.mjs';
import {searchQuestions, suggestions} from '../public/personal/chat-model.js';
import {cloneHTML} from '../tools/site.mjs';

const source = JSON.parse(readFileSync(new URL('../personalization/chat-content.json', import.meta.url)));
test('publishing omits drafts, editorial notes and links to hidden questions', () => {
  const data = structuredClone(source); data.questions[1].published = false;
  const result = validateChat(data);
  assert.equal(result.questions.length, 17);
  assert.ok(result.questions.every(q => !('notes' in q) && q.id !== 'hobby' && !q.followups.includes('hobby')));
});
test('authoring rejects broken media, unsafe links, duplicate IDs and missing follow-ups', () => {
  for (const mutate of [
    data => data.questions[0].answers.push({type:'link',content:'javascript:alert(1)',description:'bad'}),
    data => data.questions[0].answers.push({type:'photo',content:'/personal/missing-test.jpg',description:'missing'}),
    data => data.questions[1].id = data.questions[0].id,
    data => data.questions[0].followups.push('missing-id'),
  ]) { const data = structuredClone(source); mutate(data); assert.throws(() => validateChat(data)); }
});
test('question search handles Korean aliases, fullwidth text, multiple terms and no match', () => {
  const data = validateChat(source).questions;
  assert.ok(searchQuestions(data,'수노').some(q => q.id === 'music'));
  assert.equal(searchQuestions(data,'ＬＯＡＭ')[0].id, 'loam');
  assert.ok(searchQuestions(data,'일본 여행').some(q => q.id === 'japan'));
  assert.equal(searchQuestions(data,'없는검색어12345').length, 0);
  assert.ok(searchQuestions(data,'','여행 이야기').every(q => q.topic === '여행 이야기'));
  const picks = suggestions(data, data.find(q=>q.id==='hobby'), new Set(['music']));
  assert.ok(picks.every(q => q.id !== 'music' && q.id !== 'hobby'));
});
test('Excel rows keep message order and reject duplicated answer positions', () => {
  const tables = {
    '질문 목록': [{A:'질문 ID',B:'주제',C:'질문',D:'검색 키워드',E:'후속 질문 ID',F:'첫 질문',G:'공개',H:'작성 메모'}, {A:'test',B:'테스트',C:'무엇?',D:'단어, 별명',F:'예',G:'예'}],
    '답변 순서': [{A:'질문 ID',B:'순서',C:'유형',D:'답변 / 파일 경로 / URL',E:'사진 설명 / 링크 제목'}, {A:'test',B:'2',C:'text',D:'둘째\n줄바꿈'}, {A:'test',B:'1',C:'text',D:'첫째'}]
  };
  assert.deepEqual(fromWorkbook(tables).questions[0].answers.map(a=>a.content), ['첫째','둘째\n줄바꿈']);
  tables['답변 순서'][1].B = '1';
  assert.throws(() => fromWorkbook(tables), /중복/);
});
test('both routes use Messages shell, Chat navigation and no subscription composer', () => {
  for (const route of ['chat','newsletter']) {
    const html = cloneHTML(readFileSync(new URL(`../public/${route}/index.html`,import.meta.url),'utf8'));
    assert.match(html, /class="ms-window gc-window"/);
    assert.match(html, /href="\/chat\/"[^>]*>Chat/);
    assert.match(html, /src="\/personal\/chat.js\?v=/);
    assert.doesNotMatch(html, /action="\/api\/subscribe"|광일이 미리 남겨둔 이야기예요|Creator Club newsletter|\/newsletter-page.js/);
  }
});
