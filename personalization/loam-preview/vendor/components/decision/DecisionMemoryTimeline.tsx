import React from 'react'
import { DecisionMemoryEntry } from '@/types/loam.types'
import { Badge } from '@/components/ui/Badge'
import { STATE_LABELS, AXIS_LABELS } from '@/components/board/stateLabels'

interface DecisionMemoryTimelineProps {
  entries: DecisionMemoryEntry[]
}

const DECISION_TYPE_CONFIG = {
  VALIDATED: { label: '검증됨', variant: 'success' as const },
  REJECTED: { label: '기각됨', variant: 'danger' as const },
  PIVOTED: { label: '피봇', variant: 'warning' as const },
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function DecisionMemoryTimeline({ entries }: DecisionMemoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-400">아직 확정된 가설이 없습니다.</p>
        <p className="text-xs text-slate-400 mt-1">
          가설을 검증하거나 기각하면 이곳에 기록됩니다.
        </p>
      </div>
    )
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {entries.map((entry, index) => {
        const config = DECISION_TYPE_CONFIG[entry.decisionType]
        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* 타임라인 선 */}
            {index < entries.length - 1 && (
              <div
                className="absolute left-3 top-6 bottom-0 w-px bg-slate-200"
                aria-hidden="true"
              />
            )}

            {/* 도트 */}
            <div className="relative shrink-0 w-6 h-6 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center mt-0.5">
              <div className={[
                'w-2 h-2 rounded-full',
                entry.decisionType === 'VALIDATED' ? 'bg-green-500' :
                entry.decisionType === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500',
              ].join(' ')} aria-hidden="true" />
            </div>

            {/* 내용 */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500">
                  {AXIS_LABELS[entry.hypothesisAxis]}
                </span>
                <Badge variant={config.variant} size="sm">
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-800 font-medium truncate">
                {entry.hypothesisTitle}
              </p>
              <p className="text-xs text-slate-500">
                {STATE_LABELS[entry.fromState]} → {STATE_LABELS[entry.toState]}
              </p>
              {entry.reason && (
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{entry.reason}</p>
              )}
              <time className="text-xs text-slate-400 mt-0.5" dateTime={entry.createdAt}>
                {formatDate(entry.createdAt)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
