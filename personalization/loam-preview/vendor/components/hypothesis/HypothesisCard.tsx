import React from 'react'
import { HypothesisCard as HypothesisCardType } from '@/types/loam.types'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { STATE_LABELS, AXIS_LABELS, CONFIDENCE_LABELS } from '@/components/board/stateLabels'
import { StateSuggestionBanner } from './StateSuggestionBanner'

interface HypothesisCardProps {
  hypothesis: HypothesisCardType
  /** reEvaluationSuggested 여부 — DB에서 직접 받거나 부모에서 파생 */
  reEvaluationSuggested?: boolean
  onSuggestionAccepted?: () => void
  onSuggestionRejected?: () => void
  onOverrideClick?: () => void
}

const STATE_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  DRAFTED: 'neutral',
  TESTING: 'info',
  STRENGTHENING_SIGNAL: 'success',
  WEAKENING_SIGNAL: 'warning',
  PENDING_VALIDATION: 'info',
  PENDING_REJECTION: 'warning',
  VALIDATED: 'success',
  REJECTED: 'danger',
}

const CONFIDENCE_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  HIGH: 'success',
  MEDIUM: 'info',
  LOW: 'neutral',
}

export function HypothesisCard({
  hypothesis,
  reEvaluationSuggested = false,
  onSuggestionAccepted,
  onSuggestionRejected,
  onOverrideClick,
}: HypothesisCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            {AXIS_LABELS[hypothesis.axis]}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={STATE_BADGE_VARIANT[hypothesis.state]} dot>
              {STATE_LABELS[hypothesis.state]}
            </Badge>
            <Badge variant={CONFIDENCE_BADGE_VARIANT[hypothesis.confidenceLevel]}>
              신뢰 {CONFIDENCE_LABELS[hypothesis.confidenceLevel]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardBody className="flex flex-col gap-3 flex-1">
        {/* 가설 문장 */}
        <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
          {hypothesis.title}
        </p>

        {/* Signal 요약 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">신호:</span>
          <Badge variant="success" size="sm">
            긍정 {hypothesis.signalSummary.positiveCount}
          </Badge>
          <Badge variant="danger" size="sm">
            부정 {hypothesis.signalSummary.negativeCount}
          </Badge>
        </div>

        {/* 보조 플래그 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hypothesis.flags.isStale && (
            <Badge variant="warning" size="sm">
              검토 필요
            </Badge>
          )}
          {hypothesis.flags.isConflicting && (
            <Badge variant="danger" size="sm">
              신호 상충
            </Badge>
          )}
          {hypothesis.flags.needsMoreContext && (
            <Badge variant="neutral" size="sm">
              정보 부족
            </Badge>
          )}
        </div>

        {/* ReEvaluation 제안 배너 */}
        {reEvaluationSuggested && (
          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-xs text-blue-700">
              새로운 상충 증거가 유입되었습니다. 재검토를 권장합니다.
            </p>
          </div>
        )}

        {/* State Suggestion 배너 */}
        {hypothesis.pendingSuggestion && (
          <StateSuggestionBanner
            suggestion={hypothesis.pendingSuggestion}
            onAccepted={onSuggestionAccepted}
            onRejected={onSuggestionRejected}
          />
        )}

        {/* Override 버튼 */}
        {onOverrideClick && (
          <button
            type="button"
            onClick={onOverrideClick}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 text-left mt-auto pt-1"
          >
            상태 직접 변경
          </button>
        )}
      </CardBody>
    </Card>
  )
}
