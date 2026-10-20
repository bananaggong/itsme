import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HypothesisCard } from '@/components/hypothesis/HypothesisCard';
import { OverallConfidence } from '@/components/board/OverallConfidence';
import { SignalResultCard } from '@/components/evidence/SignalResultCard';
import { DecisionMemoryTimeline } from '@/components/decision/DecisionMemoryTimeline';
import type { DecisionMemoryEntry } from '@/types/loam.types';
import { DemoContext } from './demo-context';
import { hypotheses, project, evidenceExamples, initialDecisions, learning } from './data';
import './style.css';

type View = 'board' | 'evidence' | 'memory' | 'thumbnail';
const views = [
  {id: 'board', label: '가설 보드'},
  {id: 'evidence', label: '증거 분석'},
  {id: 'memory', label: '판단과 기록'},
] as const;
const initialView = new URLSearchParams(location.search).get('view');

function App() {
  const [view, setView] = useState<View>(['evidence','memory','thumbnail'].includes(initialView || '') ? initialView as View : 'board');
  const [selected, setSelected] = useState(0);
  const [decision, setDecision] = useState<'pending' | 'confirmed' | 'skipped'>('pending');
  const [records, setRecords] = useState<DecisionMemoryEntry[]>(initialDecisions);
  const [summary, setSummary] = useState(learning.summary);
  const [insight, setInsight] = useState(learning.insight);
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState('');
  const example = evidenceExamples[selected];
  const currentHypotheses = hypotheses.map((h, i) => i === 0 && decision !== 'pending' ? {
    ...h, state: decision === 'confirmed' ? 'VALIDATED' as const : 'TESTING' as const, pendingSuggestion: null,
  } : h);
  function changeView(next: View) {
    setView(next);
    history.replaceState(null, '', `?view=${next}`);
  }
  function reset() {
    setDecision('pending'); setRecords(initialDecisions); setSelected(0);
    setSummary(learning.summary); setInsight(learning.insight);
    setNotice('예시 프로젝트를 처음 상태로 되돌렸습니다.');
  }
  function confirm() {
    setRecords(prev => [{
      id: 'demo-confirmed', decisionType: 'VALIDATED', fromState: 'PENDING_VALIDATION', toState: 'VALIDATED',
      hypothesisAxis: 'PROBLEM_EXISTENCE', hypothesisTitle: hypotheses[0].title,
      reason: `${summary} ${insight}`, createdAt: '2026-10-20T03:00:00.000Z',
    }, ...prev]);
    setDecision('confirmed'); dialog.current?.close(); changeView('memory');
    setNotice('예시 가설을 확정하고 이 화면의 검증 기록에 남겼습니다.');
  }
  const demo = {
    confirm: () => dialog.current?.showModal(),
    skip: () => {setDecision('skipped'); setNotice('제안을 건너뛰고 검증을 이어갑니다.');},
  };
  if (view === 'thumbnail') return <div className="thumb-scene">
    <div className="thumb-back"><HypothesisCard hypothesis={{...hypotheses[0], pendingSuggestion: null}} /></div>
    <div className="thumb-front"><p className="thumb-kicker">예시 증거에서 발견한 신호</p><SignalResultCard signal={evidenceExamples[0].signals[0]} /></div>
    <span className="thumb-label">마감한입 · 예시 프로젝트</span>
  </div>;
  return <DemoContext value={demo}>
    <div className="demo-notice">예시 프로젝트 · 인터뷰, 수치, 분석 결과는 화면 설명을 위한 가상 데이터입니다.</div>
    <header className="appbar">
      <div><strong>Loam</strong><span className="divider">/</span><span>{project.name}</span></div>
      <a href="/projects/loam/">포트폴리오로 돌아가기 ↗</a>
    </header>
    <main className={`demo-main demo-main--${view}`}>
      <div className="project-heading">
        <div><p className="overline">EXAMPLE PROJECT</p><h1>{project.name}</h1><p>{project.description}</p></div>
        <button className="reset" onClick={reset}>예시 다시 보기 ↺</button>
      </div>
      <nav className="view-switch" aria-label="예시 화면">
        {views.map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => changeView(item.id)}>{item.label}</button>)}
      </nav>
      <p role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</p>
      {view === 'board' ? <div className="board-layout">
        <section className="board-main">
          <Card padding="lg"><CardHeader><h2>Validation Board</h2></CardHeader><OverallConfidence data={{level:'MEDIUM', reason:'', criticalRiskFlags:[]}} /></Card>
          <div><h2 className="section-label">3대 검증 축</h2><div className="hypothesis-grid">{currentHypotheses.map(h => <HypothesisCard key={h.id} hypothesis={h}/>)}</div></div>
          <Card padding="lg"><CardHeader><h2>검증 기록</h2></CardHeader><DecisionMemoryTimeline entries={records}/></Card>
        </section>
        <aside className="board-evidence"><Card padding="lg">
          <CardHeader><h2>최근 증거</h2><p className="text-xs text-slate-500 mt-1">카페 사장님 인터뷰 · 예시</p></CardHeader>
          <p className="evidence-text">{evidenceExamples[0].text}</p>
          <div className="signals">{evidenceExamples[0].signals.map(s => <SignalResultCard key={s.signalType} signal={s}/>)}</div>
          <button className="text-action" onClick={() => changeView('evidence')}>다른 증거도 살펴보기 →</button>
        </Card></aside>
      </div> : null}
      {view === 'evidence' ? <div className="evidence-layout">
        <Card padding="lg">
          <CardHeader><h2>증거를 읽는 방식</h2><p className="text-xs text-slate-500 mt-1">예시를 선택해 분석 결과를 비교해보세요.</p></CardHeader>
          <div className="example-switch">{evidenceExamples.map((item, i) => <button key={item.label} aria-pressed={selected === i} onClick={() => setSelected(i)}>{item.label}</button>)}</div>
          <div className="evidence-meta"><Badge variant="info">{example.axis}</Badge><span>{example.source}</span></div>
          <h3 className="field-label">수집한 증거 원문</h3>
          <blockquote className="raw-evidence">{example.text}</blockquote>
          <p className="text-xs text-slate-400 text-right mt-2">{example.text.length} / 300자</p>
          <p className="fixture-note">실제 AI 호출 없이 준비된 예시 결과를 보여줍니다.</p>
        </Card>
        <Card padding="lg">
          <CardHeader><h2>분석 결과 <span className="text-indigo-600">{example.signals.length}개 신호</span></h2></CardHeader>
          <div className="signals">{example.signals.map(s => <SignalResultCard key={s.signalType} signal={s}/>)}</div>
          <div className="analysis-note"><strong>{selected === 2 ? '관심 표현만으로는 충분하지 않습니다.' : selected === 1 ? '말보다 구체적인 행동을 봅니다.' : '원문에서 판단의 근거를 찾습니다.'}</strong><p>{selected === 2 ? '불확실한 정보를 강한 확신으로 바꾸지 않습니다.' : selected === 1 ? '지불 의향을 실제 예약금 결제와 연결해 살펴봅니다.' : '반복되는 문제와 실제 손실을 나누어 읽습니다.'}</p></div>
        </Card>
      </div> : null}
      {view === 'memory' ? <div className="memory-layout">
        <section className="board-main">
          <h2 className="section-label">최종 판단은 사용자가</h2>
          <HypothesisCard hypothesis={currentHypotheses[0]}/>
          <Card padding="lg"><p className="text-xs text-indigo-600 font-semibold mb-2">이번에 배운 것 · 예시</p><h2 className="learning-title">{insight}</h2><p className="evidence-text mt-3">{summary}</p></Card>
        </section>
        <Card padding="lg"><CardHeader><h2>검증 기록</h2><p className="text-xs text-slate-500 mt-1">어떤 근거로 판단했는지, 다시 돌아볼 수 있도록.</p></CardHeader><DecisionMemoryTimeline entries={records}/></Card>
      </div> : null}
      <footer className="demo-footer">화면 체험용 데모입니다. 변경 사항은 새로고침하면 초기화됩니다.</footer>
    </main>
    <dialog ref={dialog} className="memory-dialog" aria-labelledby="memory-title">
      <form onSubmit={e => {e.preventDefault(); confirm();}}>
        <div className="dialog-heading"><h2 id="memory-title">검증 기록 남기기</h2><button type="button" aria-label="닫기" onClick={() => dialog.current?.close()}>×</button></div>
        <p>이번 판단의 근거와 배운 점을 남겨보세요.</p>
        <label>이번 검증에서 무엇을 배웠나요?<textarea autoFocus required maxLength={1000} rows={5} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
        <label>핵심 인사이트 한 줄<input required maxLength={500} value={insight} onChange={e=>setInsight(e.target.value)}/></label>
        <div className="dialog-actions"><Button type="button" variant="secondary" onClick={()=>dialog.current?.close()}>취소</Button><Button type="submit" disabled={!summary.trim() || !insight.trim()}>기록하고 확정하기</Button></div>
        <small>이 예시 화면에만 반영됩니다.</small>
      </form>
    </dialog>
  </DemoContext>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
