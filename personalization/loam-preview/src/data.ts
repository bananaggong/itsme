import type { HypothesisCard, DecisionMemoryEntry } from '@/types/loam.types';

// Fictional, fixed fixtures. These are neither customer data nor live AI output.
export const project = {
  name: '마감한입',
  description: '동네 카페의 마감 상품을 미리 예약하는 서비스',
};
export const hypotheses: HypothesisCard[] = [
  {
    id: 'demo-problem', axis: 'PROBLEM_EXISTENCE',
    title: '동네 카페는 매일 남는 상품을 처리하는 데 어려움을 겪는다.',
    state: 'PENDING_VALIDATION', confidenceLevel: 'MEDIUM', latestEvidenceSummary: null,
    signalSummary: {positiveCount: 4, negativeCount: 1, strongPositive: 3, strongNegative: 0},
    flags: {isStale: false, isConflicting: false, needsMoreContext: false},
    pendingSuggestion: {
      hypothesisId: 'demo-problem', currentState: 'PENDING_VALIDATION', suggestedState: 'VALIDATED',
      confidenceLevel: 'MEDIUM', confidenceReason: '반복되는 폐기와 직접적인 손실을 확인했습니다.',
      supportingSignals: [],
    },
  },
  {
    id: 'demo-payment', axis: 'WILLINGNESS_TO_PAY',
    title: '고객은 할인된 마감 상품에 예약금을 지불한다.',
    state: 'STRENGTHENING_SIGNAL', confidenceLevel: 'MEDIUM', latestEvidenceSummary: null,
    signalSummary: {positiveCount: 2, negativeCount: 1, strongPositive: 1, strongNegative: 0},
    flags: {isStale: false, isConflicting: false, needsMoreContext: false}, pendingSuggestion: null,
  },
  {
    id: 'demo-channel', axis: 'CHANNEL_REACH',
    title: '동네 커뮤니티에서 첫 예약 고객을 만날 수 있다.',
    state: 'TESTING', confidenceLevel: 'LOW', latestEvidenceSummary: null,
    signalSummary: {positiveCount: 1, negativeCount: 0, strongPositive: 0, strongNegative: 0},
    flags: {isStale: false, isConflicting: false, needsMoreContext: true}, pendingSuggestion: null,
  },
];
export const evidenceExamples = [
  {
    label: '카페 사장님 인터뷰', source: '고객 인터뷰', axis: '문제 존재',
    text: '동네 카페 사장님 6명을 인터뷰했다. 5명은 주 4회 이상 빵과 디저트가 남는다고 했다. 한 매장은 “매일 2만 원 정도를 버리고, 남은 상품을 알리려고 단골에게 직접 메시지를 보낸다”고 답했다.',
    signals: [
      {signalType: 'Recurring_Problem', polarity: 'POSITIVE', strength: 'STRONG', adjustedStrength: 'STRONG', evidenceSpan: '5명은 주 4회 이상 빵과 디저트가 남는다고 했다.', reasoning: '빈도와 표본이 명시된 반복적인 문제입니다.'},
      {signalType: 'Cost_Impact', polarity: 'POSITIVE', strength: 'STRONG', adjustedStrength: 'STRONG', evidenceSpan: '매일 2만 원 정도를 버리고', reasoning: '당사자가 직접 경험한 금전적 손실을 확인했습니다.'},
    ],
  },
  {
    label: '예약금 결제 실험', source: '제품 데이터', axis: '지불 의향',
    text: '마감 상품 예약 페이지에 방문한 24명 중 7명이 1,000원의 예약금을 실제로 결제했다. 이 중 6명은 약속한 시간에 카페를 방문해 상품을 받았다.',
    signals: [
      {signalType: 'Actual_Commitment', polarity: 'POSITIVE', strength: 'STRONG', adjustedStrength: 'STRONG', evidenceSpan: '7명이 1,000원의 예약금을 실제로 결제했다.', reasoning: '설문 응답을 넘어 실제 결제로 이어진 행동입니다.'},
    ],
  },
  {
    label: '가벼운 관심 표현', source: '개인 관찰', axis: '지불 의향',
    text: '지인에게 아이디어를 설명했더니 “그런 서비스가 있으면 좋겠네. 가격만 괜찮으면 써볼 것 같아”라고 답했다.',
    signals: [
      {signalType: 'Hypothetical_Pricing', polarity: 'NEGATIVE', strength: 'STRONG', adjustedStrength: 'WEAK', evidenceSpan: '가격만 괜찮으면 써볼 것 같아', reasoning: '조건부 의향이며 결제 약속은 아닙니다. 표본과 구체적 행동이 부족해 강도를 낮춥니다.'},
    ],
  },
] as const;
export const initialDecisions: DecisionMemoryEntry[] = [{
  id: 'demo-prior', decisionType: 'REJECTED', fromState: 'PENDING_REJECTION', toState: 'REJECTED',
  hypothesisAxis: 'WILLINGNESS_TO_PAY',
  hypothesisTitle: '고객은 방문할 때 결제하는 방식만 원한다.',
  reason: '예약금을 먼저 낸 고객의 실제 수령을 확인했습니다. 결제 시점보다 원하는 상품을 확보하는 것이 중요했습니다.',
  createdAt: '2026-10-12T03:00:00.000Z',
}];
export const learning = {
  summary: '카페가 겪는 어려움은 단순히 상품이 남는 것이 아니었다. 마감 시간에 남은 상품을 알리고, 가져갈 사람을 찾는 일이 매일 반복되고 있었다.',
  insight: '할인보다 먼저 해결할 것은, 남은 상품을 알리는 수고다.',
};
