import React from 'react'
import { OverallConfidence as OverallConfidenceType } from '@/types/loam.types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface OverallConfidenceProps {
  data: OverallConfidenceType
}

const CONFIDENCE_CONFIG = {
  HIGH: {
    variant: 'success' as const,
    label: '높음',
    description: '복수의 강한 신호가 가설을 지지하고 있습니다.',
  },
  MEDIUM: {
    variant: 'info' as const,
    label: '보통',
    description: '일부 신호가 가설을 지지하지만 추가 검증이 필요합니다.',
  },
  LOW: {
    variant: 'neutral' as const,
    label: '낮음',
    description: '아직 충분한 신호가 수집되지 않았습니다.',
  },
}

export function OverallConfidence({ data }: OverallConfidenceProps) {
  const config = CONFIDENCE_CONFIG[data.level]

  return (
    <div className="flex flex-col gap-3">
      {/* 전반적 신뢰도 */}
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-500 mb-1">전반적 신뢰 수준</p>
          <Badge variant={config.variant} dot>
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-slate-600 mt-auto">{config.description}</p>
      </div>

      {/* Critical Risk Flags: isConflicting */}
      {data.criticalRiskFlags.length > 0 && (
        <Card className="border-amber-200 bg-amber-50" padding="sm">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-500 shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">신호 상충 감지</p>
              <p className="text-xs text-amber-700 mt-0.5">
                상충하는 강한 신호가 감지되었습니다. 가설 재검토를 권장합니다.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
