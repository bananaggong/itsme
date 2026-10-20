// =============================================================================
// Loam MVP — TypeScript Type Definitions v1.0
// Evidence-Based Validation Engine
// =============================================================================
// 이 파일은 Prisma 생성 타입을 보완하는 도메인 타입입니다.
// Prisma Client가 자동 생성하는 기본 타입 외에,
// API 계약, 상태 전이 규칙, UI 표시용 타입을 정의합니다.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (Prisma enum과 1:1 대응, 프론트엔드 공유용)
// ---------------------------------------------------------------------------

export const HYPOTHESIS_AXIS = {
  PROBLEM_EXISTENCE: "PROBLEM_EXISTENCE",
  WILLINGNESS_TO_PAY: "WILLINGNESS_TO_PAY",
  CHANNEL_REACH: "CHANNEL_REACH",
} as const;
export type HypothesisAxis = (typeof HYPOTHESIS_AXIS)[keyof typeof HYPOTHESIS_AXIS];

export const HYPOTHESIS_STATE = {
  DRAFTED: "DRAFTED",
  TESTING: "TESTING",
  STRENGTHENING_SIGNAL: "STRENGTHENING_SIGNAL",
  WEAKENING_SIGNAL: "WEAKENING_SIGNAL",
  PENDING_VALIDATION: "PENDING_VALIDATION",
  PENDING_REJECTION: "PENDING_REJECTION",
  VALIDATED: "VALIDATED",
  REJECTED: "REJECTED",
} as const;
export type HypothesisState = (typeof HYPOTHESIS_STATE)[keyof typeof HYPOTHESIS_STATE];

export const CONFIDENCE_LEVEL = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVEL)[keyof typeof CONFIDENCE_LEVEL];

export const SIGNAL_POLARITY = {
  POSITIVE: "POSITIVE",
  NEGATIVE: "NEGATIVE",
  NEUTRAL: "NEUTRAL",
  AMBIGUOUS: "AMBIGUOUS",
} as const;
export type SignalPolarity = (typeof SIGNAL_POLARITY)[keyof typeof SIGNAL_POLARITY];

export const SIGNAL_STRENGTH = {
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
} as const;
export type SignalStrength = (typeof SIGNAL_STRENGTH)[keyof typeof SIGNAL_STRENGTH];

export const EVIDENCE_SOURCE = {
  USER_INTERVIEW: "USER_INTERVIEW",
  SURVEY: "SURVEY",
  ANALYTICS_DATA: "ANALYTICS_DATA",
  MARKET_RESEARCH: "MARKET_RESEARCH",
  COMPETITOR_ANALYSIS: "COMPETITOR_ANALYSIS",
  EXPERT_OPINION: "EXPERT_OPINION",
  PERSONAL_OBSERVATION: "PERSONAL_OBSERVATION",
  OTHER: "OTHER",
} as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCE)[keyof typeof EVIDENCE_SOURCE];

export const OVERRIDE_TYPE = {
  STATE_OVERRIDE: "STATE_OVERRIDE",
  SIGNAL_OVERRIDE: "SIGNAL_OVERRIDE",
  CONFIDENCE_OVERRIDE: "CONFIDENCE_OVERRIDE",
  FLAG_OVERRIDE: "FLAG_OVERRIDE",
} as const;
export type OverrideType = (typeof OVERRIDE_TYPE)[keyof typeof OVERRIDE_TYPE];

export const DECISION_TYPE = {
  VALIDATED: "VALIDATED",
  REJECTED: "REJECTED",
  PIVOTED: "PIVOTED",
} as const;
export type DecisionType = (typeof DECISION_TYPE)[keyof typeof DECISION_TYPE];

// ---------------------------------------------------------------------------
// State Transition Rules — 허용되는 전이 맵
// ---------------------------------------------------------------------------

/** 각 상태에서 이동 가능한 다음 상태 목록 */
export const VALID_TRANSITIONS: Record<HypothesisState, HypothesisState[]> = {
  DRAFTED: ["TESTING"],
  TESTING: ["STRENGTHENING_SIGNAL", "WEAKENING_SIGNAL"],
  STRENGTHENING_SIGNAL: [
    "TESTING",             // 상충 신호 유입 시 복귀
    "PENDING_VALIDATION",  // 충분한 긍정 신호 누적
    "WEAKENING_SIGNAL",    // 방향 반전
  ],
  WEAKENING_SIGNAL: [
    "TESTING",             // 상충 신호 유입 시 복귀
    "PENDING_REJECTION",   // 충분한 부정 신호 누적
    "STRENGTHENING_SIGNAL", // 방향 반전
  ],
  PENDING_VALIDATION: [
    "VALIDATED",           // 사용자 수동 승인만 허용
    "TESTING",             // 사용자가 제안 거부 → 검증 계속
  ],
  PENDING_REJECTION: [
    "REJECTED",            // 사용자 수동 승인만 허용
    "TESTING",             // 사용자가 제안 거부 → 검증 계속
  ],
  VALIDATED: [],           // 최종 상태, 전이 불가
  REJECTED: [],            // 최종 상태, 전이 불가
};

/** 시스템(AI)이 자동으로 제안할 수 있는 전이 */
export const SYSTEM_ALLOWED_TRANSITIONS: Record<HypothesisState, HypothesisState[]> = {
  DRAFTED: ["TESTING"],
  TESTING: ["STRENGTHENING_SIGNAL", "WEAKENING_SIGNAL"],
  STRENGTHENING_SIGNAL: ["PENDING_VALIDATION", "TESTING", "WEAKENING_SIGNAL"],
  WEAKENING_SIGNAL: ["PENDING_REJECTION", "TESTING", "STRENGTHENING_SIGNAL"],
  // Conservatism 원칙: Pending → Final은 시스템이 제안 불가
  PENDING_VALIDATION: [],
  PENDING_REJECTION: [],
  VALIDATED: [],
  REJECTED: [],
};

/** 사용자만 실행할 수 있는 전이 (수동 승인) */
export const USER_ONLY_TRANSITIONS: Array<{
  from: HypothesisState;
  to: HypothesisState;
}> = [
  { from: "PENDING_VALIDATION", to: "VALIDATED" },
  { from: "PENDING_REJECTION", to: "REJECTED" },
  { from: "PENDING_VALIDATION", to: "TESTING" }, // 제안 거부
  { from: "PENDING_REJECTION", to: "TESTING" },  // 제안 거부
];

// ---------------------------------------------------------------------------
// Signal Dictionary Types — 3대 축별 신호 타입
// ---------------------------------------------------------------------------

export interface SignalDefinition {
  type: string;
  axis: HypothesisAxis;
  defaultPolarity: SignalPolarity;
  defaultStrength: SignalStrength;
  description: string;
  demotionCondition?: string; // 강등 조건 설명
}

export const SIGNAL_DICTIONARY: SignalDefinition[] = [
  // === Problem Existence ===
  {
    type: "Recurring_Problem",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "반복적으로 발생하는 문제를 확인",
  },
  {
    type: "Active_Workaround",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "사용자가 이미 우회 방법을 사용 중",
  },
  {
    type: "Cost_Impact",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "문제로 인한 비용/지연 발생 확인",
  },
  {
    type: "Direct_Pain_Owner",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "POSITIVE",
    defaultStrength: "MODERATE",
    description: "문제를 직접 경험하는 당사자 (보정 요소, 단독 strong 아님)",
  },
  {
    type: "Adequate_Existing_Solution",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "이미 충분한 기존 솔루션 존재",
  },
  {
    type: "Nice_To_Have",
    axis: "PROBLEM_EXISTENCE",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "있으면 좋지만 없어도 되는 수준",
  },

  // === Willingness To Pay ===
  {
    type: "Actual_Commitment",
    axis: "WILLINGNESS_TO_PAY",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "실제 구매 의향/선결제/계약 등 구체적 약속",
  },
  {
    type: "Current_Spend_Baseline",
    axis: "WILLINGNESS_TO_PAY",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "현재 유사 문제에 비용을 지출 중",
  },
  {
    type: "Free_Rider",
    axis: "WILLINGNESS_TO_PAY",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "무료로만 사용하려는 의향",
  },
  {
    type: "Lack_Of_Authority",
    axis: "WILLINGNESS_TO_PAY",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "구매 결정 권한 없음",
  },
  {
    type: "Hypothetical_Pricing",
    axis: "WILLINGNESS_TO_PAY",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "가상 가격에 대한 반응일 뿐 실제 약속 아님",
  },

  // === Channel / Reach ===
  {
    type: "Validated_Acquisition",
    axis: "CHANNEL_REACH",
    defaultPolarity: "POSITIVE",
    defaultStrength: "STRONG",
    description: "검증된 고객 획득 채널 확인",
  },
  {
    type: "Proprietary_Audience",
    axis: "CHANNEL_REACH",
    defaultPolarity: "POSITIVE",
    defaultStrength: "MODERATE",
    description: "자체 오디언스 보유 (ICP Fit 충족 시 Strong 승급)",
  },
  {
    type: "Hopium_Strategy",
    axis: "CHANNEL_REACH",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "근거 없는 낙관적 채널 전략",
  },
  {
    type: "Unscalable_Hack",
    axis: "CHANNEL_REACH",
    defaultPolarity: "NEGATIVE",
    defaultStrength: "STRONG",
    description: "확장 불가능한 임시방편 채널",
  },
];

// ---------------------------------------------------------------------------
// Reliability Adjustment Factors — 증거 신뢰도 보정
// ---------------------------------------------------------------------------

export interface ReliabilityFactors {
  sampleSize: "none" | "small" | "medium" | "large";
  freshness: "recent" | "moderate" | "dated";
  sourceCredibility: "high" | "medium" | "low";
  directness: "first_hand" | "second_hand" | "hearsay";
}

/** 보정 후 강도 다운그레이드 규칙 */
export const RELIABILITY_DOWNGRADE_RULES: Array<{
  condition: Partial<ReliabilityFactors>;
  maxStrength: SignalStrength;
}> = [
  { condition: { sampleSize: "none" }, maxStrength: "WEAK" },
  { condition: { freshness: "dated" }, maxStrength: "MODERATE" },
  { condition: { sourceCredibility: "low" }, maxStrength: "MODERATE" },
  { condition: { directness: "hearsay" }, maxStrength: "WEAK" },
  { condition: { sampleSize: "small", freshness: "dated" }, maxStrength: "WEAK" },
];

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

/** Evidence 제출 요청 */
export interface CreateEvidenceInput {
  hypothesisId: string;
  rawText: string; // max 300자
  sourceType: EvidenceSource;
  sourceDetail?: string;
  sampleSize?: number;
  collectedAt?: string; // ISO date
}

/** Signal Extraction 결과 (AI 파이프라인 출력) */
export interface SignalExtractionResult {
  signals: Array<{
    signalType: string;
    polarity: SignalPolarity;
    strength: SignalStrength;
    adjustedStrength: SignalStrength;
    evidenceSpan: string;
    spanStartIdx: number;
    spanEndIdx: number;
    reasoning: string;
    reliabilityFactors: ReliabilityFactors;
  }>;
  stateSuggestion: {
    suggestedState: HypothesisState | null;
    confidenceLevel: ConfidenceLevel;
    confidenceReason: string;
  } | null;
  flags: {
    needsMoreContext: boolean;
    conflicting: boolean;
  };
}

/** State Transition 제안 (UI 표시용) */
export interface StateSuggestionDisplay {
  hypothesisId: string;
  currentState: HypothesisState;
  suggestedState: HypothesisState;
  confidenceLevel: ConfidenceLevel;
  confidenceReason: string;
  supportingSignals: Array<{
    signalType: string;
    evidenceSpan: string;
    polarity: SignalPolarity;
    strength: SignalStrength;
  }>;
}

/** User Override 요청 */
export interface OverrideInput {
  hypothesisId: string;
  overrideType: OverrideType;
  newValue: Record<string, unknown>;
  reason: string; // 필수 — PRD: "변경 사유 입력이 완료되어야만 저장"
}

/** Decision Memory 생성 요청 */
export interface CreateDecisionMemoryInput {
  hypothesisId: string;
  decisionType: DecisionType;
  reason: string;
  keyEvidenceIds: string[];
  keySignalIds: string[];
}

// ---------------------------------------------------------------------------
// Validation Board UI Types
// ---------------------------------------------------------------------------

/** Top Layer: Overall Confidence */
export interface OverallConfidence {
  level: ConfidenceLevel;
  reason: string;
  criticalRiskFlags: string[];
}

/** Middle Layer: 가설 카드 */
export interface HypothesisCard {
  id: string;
  axis: HypothesisAxis;
  title: string;
  state: HypothesisState;
  confidenceLevel: ConfidenceLevel;
  latestEvidenceSummary: string | null;
  signalSummary: {
    positiveCount: number;
    negativeCount: number;
    strongPositive: number;
    strongNegative: number;
  };
  flags: {
    isStale: boolean;
    isConflicting: boolean;
    needsMoreContext: boolean;
  };
  pendingSuggestion: StateSuggestionDisplay | null;
}

/** Bottom Layer: Decision Memory 타임라인 */
export interface DecisionMemoryEntry {
  id: string;
  decisionType: DecisionType;
  fromState: HypothesisState;
  toState: HypothesisState;
  reason: string;
  createdAt: string;
  hypothesisTitle: string;
  hypothesisAxis: HypothesisAxis;
}

// ---------------------------------------------------------------------------
// Analytics Event Types
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = {
  // 온보딩
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  FIRST_UNKNOWN_VIEWED: "first_unknown_viewed",

  // Evidence Loop
  EVIDENCE_SUBMITTED: "evidence_submitted",
  SIGNAL_EXTRACTED: "signal_extracted",
  STATE_SUGGESTION_SHOWN: "state_suggestion_shown",
  STATE_SUGGESTION_ACCEPTED: "state_suggestion_accepted",
  STATE_SUGGESTION_REJECTED: "state_suggestion_rejected",

  // Decision & Override
  DECISION_CONFIRMED: "decision_confirmed",          // Validated or Rejected
  DECISION_MEMORY_SAVED: "decision_memory_saved",
  OVERRIDE_PERFORMED: "override_performed",
  CONFIRMED_LEARNING_EVENT: "confirmed_learning_event", // North Star

  // Engagement
  HYPOTHESIS_CREATED: "hypothesis_created",
  HYPOTHESIS_STALE_FLAGGED: "hypothesis_stale_flagged",
  BOARD_VIEWED: "board_viewed",

  // Failure
  EXTRACTION_FAILED: "extraction_failed",
  NEEDS_MORE_CONTEXT_FLAGGED: "needs_more_context_flagged",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ---------------------------------------------------------------------------
// Stale Detection Config
// ---------------------------------------------------------------------------

export const STALE_CONFIG = {
  /** Evidence 없이 이 기간이 지나면 Stale 플래그 활성화 (일) */
  DAYS_WITHOUT_EVIDENCE: 14,
  /** 어떤 활동도 없이 이 기간이 지나면 Stale 플래그 활성화 (일) */
  DAYS_WITHOUT_ACTIVITY: 21,
} as const;
