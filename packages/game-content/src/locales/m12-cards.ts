/**
 * M12 cards, Insight and NIL shop copy (Phase 7): attribution, the Workshop, the Scouting Draw
 * with its odds and pity, mastery and fusion, the rarity legend and rules, the NIL shop, gear and
 * deal costs.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  // Attribution (CARD-01, CARD-02).
  'v2.cards.attribution.title': ['What your cards do this week', '이번 주 카드 효과'],
  'v2.cards.attribution.active': ['{card}: {effects}', '{card}: {effects}'],
  'v2.cards.attribution.inactive': [
    '{card}: no effect on this plan (its condition is not met)',
    '{card}: 이번 계획에는 효과 없음 (발동 조건 미충족)',
  ],
  'v2.cards.attribution.xp': ['{value} XP', 'XP {value}'],
  'v2.cards.attribution.body': ['Body {value}', '체력 {value}'],
  'v2.cards.attribution.prep': ['Prep {value}', '준비 {value}'],
  'v2.cards.attribution.conf': ['Confidence {value}', '자신감 {value}'],
  'v2.cards.attribution.gpa': ['GPA {value}', '학점 {value}'],
  'v2.cards.attribution.none': ['No cards equipped.', '장착한 카드가 없습니다.'],
  'v2.cards.tells': [
    '{card}: +{count, plural, one {# tell} other {# tells}} on your reads',
    '{card}: 판단 단서 +{count, plural, other {#개}}',
  ],
  // Insight, Workshop, Draw, mastery (CARD-03…07).
  'v2.cards.insight.title': ['Insight', '인사이트'],
  'v2.cards.insight.balance': ['{value} Insight', '인사이트 {value}'],
  'v2.cards.insight.sources': [
    'Insight is earned, never bought: skipping a breakthrough offer (+{skip}), each season award (+{award}), every gauge point once your collection is complete, and refunds for duplicates of fully mastered cards (+{refund}). NIL money cannot buy cards.',
    '인사이트는 획득만 가능하며 구매할 수 없습니다: 브레이크스루 제안 넘기기 (+{skip}), 시즌 수상 1회 (+{award}), 컬렉션 완성 후 게이지 포인트 전부, 최대 숙련 카드 중복 환급 (+{refund}). NIL 수입으로는 카드를 살 수 없습니다.',
  ],
  'v2.cards.insight.gained': [
    '+{value} Insight (collection complete)',
    '인사이트 +{value} (컬렉션 완성)',
  ],
  'v2.cards.workshop.title': ['Workshop', '워크숍'],
  'v2.cards.workshop.help': [
    'Craft any card you do not own at a fixed price: no luck involved.',
    '보유하지 않은 카드를 정해진 가격에 제작합니다. 운이 개입하지 않습니다.',
  ],
  'v2.cards.workshop.browse': [
    '{count, plural, one {# card to craft} other {# cards to craft}}',
    '제작 가능한 카드 {count, plural, other {#장}}',
  ],
  'v2.cards.workshop.craft': ['Craft · {price}', '제작 · {price}'],
  'v2.cards.workshop.complete': [
    'You own every card for your position.',
    '포지션의 모든 카드를 보유했습니다.',
  ],
  'v2.cards.draw.title': ['Scouting Draw', '스카우팅 드로우'],
  'v2.cards.draw.help': [
    'Optional: {cost} Insight for one card by these odds. A duplicate is kept for fusion (or refunded once the card is fully mastered).',
    '선택 사항: 인사이트 {cost}로 아래 확률에 따라 카드 1장을 얻습니다. 중복 카드는 합성용으로 보관됩니다 (최대 숙련이면 환급).',
  ],
  'v2.cards.draw.odds': ['C {c}% · B {b}% · A {a}% · S {s}%', 'C {c}% · B {b}% · A {a}% · S {s}%'],
  'v2.cards.draw.pity': [
    'Guarantee: an A or better within {draws} draws ({left} to go).',
    '보장: {draws}회 안에 A 이상 1장 (남은 횟수 {left}).',
  ],
  'v2.cards.draw.button': ['Draw · {cost}', '드로우 · {cost}'],
  'v2.cards.draw.last': [
    'Last draw: {card} ({grade}){duplicate, select, yes { — duplicate} other {}}',
    '최근 드로우: {card} ({grade}){duplicate, select, yes { — 중복} other {}}',
  ],
  'v2.cards.mastery.title': ['Mastery', '숙련'],
  'v2.cards.mastery.help': [
    'Level 2 makes a card’s effects {two}% as strong, level 3 {three}% (each effect stays within its limit). Raise a level with Insight or by fusing a duplicate copy; fusion never uses the card itself.',
    '숙련 2단계는 카드 효과를 {two}%로, 3단계는 {three}%로 강화합니다 (각 효과의 상한 내). 인사이트 또는 중복 카드 합성으로 올리며, 합성은 카드 자체를 소모하지 않습니다.',
  ],
  'v2.cards.mastery.level': ['Level {level}', '{level}단계'],
  'v2.cards.mastery.preview': ['Strength {from}% → {to}%', '효과 {from}% → {to}%'],
  'v2.cards.mastery.raise': ['Raise · {price}', '강화 · {price}'],
  'v2.cards.mastery.fuse': ['Fuse a duplicate ({count})', '중복 합성 ({count})'],
  'v2.cards.mastery.max': ['Fully mastered', '최대 숙련'],
  'v2.cards.legend.title': ['Rarity and rules', '등급과 규칙'],
  'v2.cards.legend.grades': [
    'Grades C, B, A and S rise in strength. Breakthrough offers never repeat a card you own; duplicates come only from the Scouting Draw.',
    '등급은 C, B, A, S 순으로 강해집니다. 브레이크스루 제안은 보유한 카드를 다시 주지 않으며, 중복은 스카우팅 드로우에서만 나옵니다.',
  ],
  'v2.bt.skip': ['Pass for {value} Insight', '넘기고 인사이트 {value} 받기'],
  'v2.bt.skipped': [
    'You passed and banked {value} Insight.',
    '제안을 넘기고 인사이트 {value}를 받았습니다.',
  ],
  // NIL shop (NIL-01…03).
  'v2.shop.title': ['NIL shop', 'NIL 상점'],
  'v2.shop.ledger': [
    'Earned {earned} · spendable {spendable} · spent {spent}',
    '총 수입 {earned} · 사용 가능 {spendable} · 지출 {spent}',
  ],
  'v2.shop.obligation': [
    'In force: {offer}, {weeks, plural, one {# week} other {# weeks}} left',
    '진행 중: {offer}, {weeks, plural, other {#주}} 남음',
  ],
  'v2.shop.help': [
    'Services apply this week, once each. NIL money pays for services and gear only.',
    '서비스는 이번 주에 바로 적용되며 종류별로 주 1회 구매할 수 있습니다. NIL 수입은 서비스와 장비에만 쓸 수 있습니다.',
  ],
  'v2.shop.buy': ['Buy · {price}', '구매 · {price}'],
  'v2.shop.bought': ['Bought this week', '이번 주 구매함'],
  'v2.shop.service.shopRecoverySession': [
    'Recovery session: Body +{body}',
    '회복 세션: 체력 +{body}',
  ],
  'v2.shop.service.shopFilmPackage': ['Film package: Prep +{prep}', '필름 패키지: 준비 +{prep}'],
  'v2.shop.service.shopTutor': ['Tutor: GPA +{gpa}', '과외: 학점 +{gpa}'],
  'v2.shop.service.shopAgentVisibility': [
    'Agent visibility: Brand +{brand}, more NIL offers for {weeks} weeks',
    '에이전트 홍보: 브랜드 +{brand}, {weeks}주간 NIL 제안 증가',
  ],
  'v2.shop.gearTitle': ['Gear', '장비'],
  'v2.shop.gear.gearGoldTrim': ['Gold trim', '골드 트림'],
  'v2.shop.gear.gearBlackoutHelmet': ['Blackout helmet', '블랙아웃 헬멧'],
  'v2.shop.gear.gearVoltGloves': ['Volt gloves', '볼트 장갑'],
  'v2.shop.gear.gearAlternateJersey': ['Alternate jersey', '얼터네이트 저지'],
  'v2.shop.token': ['Use a style token', '스타일 토큰 사용'],
  'v2.shop.tokens': [
    '{count, plural, one {# style token} other {# style tokens}}: unlock any gear of your choice.',
    '스타일 토큰 {count, plural, other {#개}}: 원하는 장비 하나를 해금합니다.',
  ],
  'v2.shop.wear': ['Wear', '착용'],
  'v2.shop.putAway': ['Put away', '해제'],
  'v2.nil.dealCost': [
    'Over the deal: {weeks, plural, one {# week} other {# weeks}} × −{perWeek} practice = −{total} practice in all.',
    '계약 기간 전체: {weeks, plural, other {#주}} × 연습 −{perWeek} = 총 연습 −{total}.',
  ],
  'v2.nil.rewardPreview': ['If you accept: {effects}', '수락하면: {effects}'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12CardsMessages = messages(0);
export const koKRM12CardsMessages = messages(1);
