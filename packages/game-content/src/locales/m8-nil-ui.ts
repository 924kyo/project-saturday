/** M8 NIL and locker-room copy for Career VNext (fictional funds; no real brands). */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.nil.eyebrow': ['NIL offer', 'NIL 제안'],
  'v2.nil.reward': ['The deal', '제안 내용'],
  'v2.nil.obligation': ['What it asks of you', '해야 할 일'],
  'v2.nil.cost': [
    'For {weeks, plural, one {# week} other {# weeks}}, it takes practice time: practice score −{penalty}.',
    '{weeks, plural, other {#주}} 동안 연습 시간을 씁니다. 연습 점수 −{penalty}.',
  ],
  'v2.nil.accept': ['Take the deal', '제안을 받는다'],
  'v2.nil.decline': ['Pass', '거절한다'],
  'v2.nil.accepted': [
    'Deal signed. The work starts with next week’s practice.',
    '계약했습니다. 다음 주 연습부터 일이 시작됩니다.',
  ],
  'v2.nil.declined': [
    'You passed. Football stays the only thing on the calendar.',
    '거절했습니다. 일정표에는 풋볼만 남습니다.',
  ],
  'v2.nil.funds': ['Funds {value}', '수입 {value}'],
  'v2.nil.lockerRoom': ['Locker room', '라커룸'],
  'v2.nil.benefit': ['+1 {benefit}', '+1 {benefit}'],
  'v2.nil.title': ['Name, image and likeness', '이름·이미지·초상권(NIL)'],
  'v2.nil.fundsTotal': ['Earned: {value}', '수입: {value}'],
  'v2.nil.brand': ['Brand {value}', '브랜드 {value}'],
  'v2.nil.lockerRoomLine': ['Locker room {value}: {effect}', '라커룸 {value}: {effect}'],
  'v2.nil.lockerRoomHigh': ['teammates lift your practice (+2)', '동료들이 연습을 끌어올린다(+2)'],
  'v2.nil.lockerRoomLow': ['friction costs you in practice (−2)', '마찰이 연습에 손해를 준다(−2)'],
  'v2.nil.lockerRoomNeutral': ['steady', '무난함'],
  'v2.nil.benefits': ['Benefits: {list}', '혜택: {list}'],
  'v2.nil.noBenefits': ['No benefits yet.', '아직 혜택이 없습니다.'],
  'v2.nil.active': [
    'Current deal: {offer}, {weeks, plural, one {# week} other {# weeks}} left.',
    '진행 중인 계약: {offer}, {weeks, plural, other {#주}} 남음.',
  ],
  'v2.nil.noDeal': [
    'No active deal. Saturdays build the name that brings offers.',
    '진행 중인 계약이 없습니다. 토요일 경기가 제안을 부르는 이름을 만듭니다.',
  ],
  'v2.report.offField': ['Off the field: practice score {value}', '필드 밖: 연습 점수 {value}'],
  'v2.report.benefitUsed': ['Used: {benefit}', '사용: {benefit}'],
  'v2.draft.exactStock': [
    'Advisor insight: stock score {score}',
    '어드바이저 분석: 드래프트 점수 {score}',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSNilUiMessages = messages(0);
export const koKRNilUiMessages = messages(1);
