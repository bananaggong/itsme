import { HypothesisState, HypothesisAxis, ConfidenceLevel } from '@/types/loam.types'

export const STATE_LABELS: Record<HypothesisState, string> = {
  DRAFTED: '초안',
  TESTING: '검증 중',
  STRENGTHENING_SIGNAL: '신호 강화',
  WEAKENING_SIGNAL: '신호 약화',
  PENDING_VALIDATION: '검증 대기',
  PENDING_REJECTION: '기각 대기',
  VALIDATED: '검증됨',
  REJECTED: '기각됨',
}

export const AXIS_LABELS: Record<HypothesisAxis, string> = {
  PROBLEM_EXISTENCE: '문제 존재',
  WILLINGNESS_TO_PAY: '지불 의향',
  CHANNEL_REACH: '채널 도달',
}

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}
