import React from 'react'
import { SignalPolarity, SignalStrength } from '@/types/loam.types'
import { Badge } from '@/components/ui/Badge'

interface SignalResult {
  signalType: string
  polarity: SignalPolarity
  strength: SignalStrength
  adjustedStrength: SignalStrength
  evidenceSpan: string
  reasoning: string
}

interface SignalResultCardProps {
  signal: SignalResult
}

const POLARITY_CONFIG: Record<SignalPolarity, { variant: 'success' | 'danger' | 'neutral' | 'warning'; label: string }> = {
  POSITIVE: { variant: 'success', label: '긍정' },
  NEGATIVE: { variant: 'danger', label: '부정' },
  NEUTRAL: { variant: 'neutral', label: '중립' },
  AMBIGUOUS: { variant: 'warning', label: '모호' },
}

const STRENGTH_LABELS: Record<SignalStrength, string> = {
  STRONG: '강',
  MODERATE: '중',
  WEAK: '약',
}

export function SignalResultCard({ signal }: SignalResultCardProps) {
  const polarityConfig = POLARITY_CONFIG[signal.polarity]
  const isAdjusted = signal.adjustedStrength !== signal.strength

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 flex flex-col gap-2">
      {/* 신호 타입 + 극성 + 강도 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-700">{signal.signalType}</span>
        <Badge variant={polarityConfig.variant} size="sm">
          {polarityConfig.label}
        </Badge>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          강도:
          {isAdjusted && (
            <span className="line-through text-slate-400">
              {STRENGTH_LABELS[signal.strength]}
            </span>
          )}
          <span className={isAdjusted ? 'text-amber-600 font-medium' : 'text-slate-700'}>
            {STRENGTH_LABELS[signal.adjustedStrength]}
          </span>
          {isAdjusted && (
            <span className="text-amber-500">(보정됨)</span>
          )}
        </span>
      </div>

      {/* 근거 문장 인용 */}
      {signal.evidenceSpan && (
        <blockquote className="border-l-4 border-indigo-300 pl-3 italic text-sm text-slate-600">
          {signal.evidenceSpan}
        </blockquote>
      )}

      {/* AI 추론 요약 */}
      {signal.reasoning && (
        <p className="text-xs text-slate-500">{signal.reasoning}</p>
      )}
    </div>
  )
}
