// Local-only adapter: same suggestion UI, with no API or model calls.
import { useContext } from 'react';
import type { StateSuggestionDisplay } from '@/types/loam.types';
import { Button } from '@/components/ui/Button';
import { STATE_LABELS } from '@/components/board/stateLabels';
import { DemoContext } from '../../../src/demo-context';

export function StateSuggestionBanner({suggestion}: {
  suggestion: StateSuggestionDisplay;
  onAccepted?: () => void;
  onRejected?: () => void;
}) {
  const demo = useContext(DemoContext);
  return <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-3">
    <p className="text-xs text-indigo-700 font-medium mb-0.5">상태 전환 제안</p>
    <p className="text-sm text-indigo-900">신호 분석 결과, <strong>{STATE_LABELS[suggestion.suggestedState]}</strong> 상태로 전환을 권장합니다.</p>
    <p className="text-xs text-indigo-600 mt-1">{suggestion.confidenceReason}</p>
    <div className="flex gap-2 mt-3">
      <Button size="sm" onClick={demo.confirm}>수락</Button>
      <Button size="sm" variant="ghost" onClick={demo.skip}>이번엔 건너뜀</Button>
    </div>
  </div>;
}
