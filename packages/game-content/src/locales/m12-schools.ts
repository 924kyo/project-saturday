/**
 * M12 schools and transfers copy (Phase 4): program profiles, offer facts and reasons, the "not
 * yet" school, the transfer market, transfer and stay notes, and academic support.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.programProfile.scheme.spread': ['Spread', '스프레드'],
  'v2.programProfile.scheme.proStyle': ['Pro style', '프로 스타일'],
  'v2.programProfile.scheme.powerRun': ['Power run', '파워 러닝'],
  'v2.programProfile.scheme.airRaid': ['Air raid', '에어 레이드'],
  'v2.programProfile.scheme.pressMan': ['Press man', '프레스 맨투맨'],
  'v2.programProfile.scheme.zoneMatch': ['Zone match', '존 매치'],
  'v2.programProfile.scheme.pressure': ['Pressure', '압박 수비'],
  'v2.programProfile.development.elite': ['Elite', '최상급'],
  'v2.programProfile.development.strong': ['Strong', '우수'],
  'v2.programProfile.development.standard': ['Standard', '보통'],
  'v2.programProfile.exposure.national': ['National', '전국구'],
  'v2.programProfile.exposure.regional': ['Regional', '지역'],
  'v2.programProfile.exposure.local': ['Local', '로컬'],
  'v2.programProfile.academics.strong': ['Strong', '탄탄함'],
  'v2.programProfile.academics.standard': ['Standard', '보통'],
  'v2.programProfile.academics.limited': ['Limited', '부족함'],
  'v2.programProfile.nilMarket.major': ['Major', '큰 시장'],
  'v2.programProfile.nilMarket.solid': ['Solid', '안정적'],
  'v2.programProfile.nilMarket.small': ['Small', '작은 시장'],
  'v2.programProfile.fit.ideal': ['ideal for your style', '내 스타일에 이상적'],
  'v2.programProfile.fit.neutral': ['workable for your style', '내 스타일과 무난'],
  'v2.programProfile.fit.poor': ['a poor fit for your style', '내 스타일과 맞지 않음'],
  'v2.offer.label.scheme': ['Scheme', '전술'],
  'v2.offer.label.development': ['Development', '육성'],
  'v2.offer.label.exposure': ['Exposure', '노출도'],
  'v2.offer.label.academics': ['Academics', '학업 지원'],
  'v2.offer.label.nilMarket': ['NIL market', 'NIL 시장'],
  'v2.offer.facts.scheme': ['{scheme}: {fit}', '{scheme}: {fit}'],
  'v2.offer.facts.coordinator': ['New coordinator: {from} → {to}', '새 코디네이터: {from} → {to}'],
  'v2.offer.facts.starter': [
    '{count, plural, =0 {Forecast: the coming season is their starter’s last} one {Forecast: their starter has one more season after this} other {Forecast: their starter has # more seasons after this}}',
    '{count, plural, =0 {예상: 현 주전은 이번이 마지막 시즌} other {예상: 현 주전은 이후 #시즌 더 남음}}',
  ],
  'v2.offer.profileHelp': [
    'Development scales training XP (elite {elite}%, standard {standard}%). Exposure scales the brand a game earns and how widely scouts see you. Academic support scales what study hall earns. The NIL market sets how often deals come.',
    '육성은 훈련 경험치를 늘립니다 (최상급 {elite}%, 보통 {standard}%). 노출도는 경기로 얻는 브랜드와 스카우트 노출을, 학업 지원은 자율 학습의 학점 효과를, NIL 시장은 계약 제안 빈도를 정합니다.',
  ],
  'v2.offer.whyTitle': ['Why they called', '제안 이유'],
  'v2.offer.reason.reach': ['A reach: they see upside', '상향 지원: 잠재력을 높이 봄'],
  'v2.offer.reason.fit': ['Your level matches theirs', '실력이 팀 수준과 맞음'],
  'v2.offer.reason.earlyRole': ['An early role: they need you now', '빠른 출전: 지금 당장 필요함'],
  'v2.offer.reason.starterLeaving': ['Their starter is a senior', '현 주전이 4학년'],
  'v2.offer.reason.openTop': [
    'No one ahead of you on their chart',
    '뎁스 차트에서 앞선 선수가 없음',
  ],
  'v2.offer.reason.scheme': ['Your style fits their scheme', '내 스타일이 전술에 맞음'],
  'v2.offer.reason.production': [
    'Your season’s staff grade ({grade})',
    '이번 시즌 코치 평가 ({grade})',
  ],
  'v2.offer.reason.honors': [
    'Your {count, plural, one {honor} other {# honors}} this season',
    '이번 시즌 수상 {count, plural, other {#회}}',
  ],
  'v2.offer.notYetRecruit': [
    'Not yet: {program} (strength {rating}). They would call at a recruit score of {needed}; yours is {current}.',
    '아직은: {program} (전력 {rating}). 리크루트 점수 {needed}점이면 제안이 옵니다. 현재 {current}점.',
  ],
  'v2.offer.notYetMarket': [
    'Not yet: {program} (strength {rating}). They would call at a market value of {needed}; yours is {current}.',
    '아직은: {program} (전력 {rating}). 시장 가치 {needed}이면 제안이 옵니다. 현재 {current}.',
  ],
  'v2.off.market.title': ['What your transfer market reads', '이적 시장 평가'],
  'v2.off.market.ability': [
    'Ability {ability} (counts as {term})',
    '능력 {ability} (반영값 {term})',
  ],
  'v2.off.market.awards': [
    '{count, plural, =0 {No honors} one {One honor} other {# honors}} {term}',
    '수상 {count, plural, other {#회}} {term}',
  ],
  'v2.off.market.role': ['Role: {role} {term}', '역할: {role} {term}'],
  'v2.off.market.grade': ['Staff grade {grade} {term}', '코치 평가 {grade} {term}'],
  'v2.off.market.noGrade': ['No staff grade yet {term}', '코치 평가 없음 {term}'],
  'v2.off.market.exposure': ['Program exposure {term}', '소속 팀 노출도 {term}'],
  'v2.off.market.total': ['Market value {target}', '시장 가치 {target}'],
  'v2.off.market.help': [
    'Transfer offers center on schools rated near your market value. Honors, a bigger role, better staff grades and more exposure all raise it.',
    '이적 제안은 시장 가치와 비슷한 전력의 학교에서 옵니다. 수상, 더 큰 역할, 좋은 코치 평가, 높은 노출도가 시장 가치를 올립니다.',
  ],
  'v2.off.transferNote': [
    'Transferring means a new staff and playbook: camp opens with Preparation {delta}, coach trust starts over, and your fit follows their scheme.',
    '이적하면 코치진과 플레이북이 바뀝니다. 캠프는 준비도 {delta}로 시작하고, 코치 신뢰는 새로 쌓으며, 적합도는 새 전술을 따릅니다.',
  ],
  'v2.off.stayNote': [
    'Staying keeps most of your coaches’ trust, and you already know the playbook.',
    '잔류하면 코치 신뢰 대부분이 유지되고 플레이북도 이미 익숙합니다.',
  ],
  'v2.recruit.strengthAria': ['Team strength {value} of 5', '팀 전력 5 중 {value}'],
  'v2.recruit.playingAria': ['Playing time {value} of 5', '출전 기회 5 중 {value}'],
  'v2.guide.programDevelopment': [
    'Program development ({tier}): training XP runs at {pct}% here.',
    '팀 육성 수준 ({tier}): 이곳의 훈련 경험치는 {pct}%입니다.',
  ],
  'v2.guide.academicSupport': [
    'Academic support at your program: study hall earns {pct}% of its usual GPA gain.',
    '현재 학교의 학업 지원: 자율 학습의 학점 효과가 평소의 {pct}%입니다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12SchoolsMessages = messages(0);
export const koKRM12SchoolsMessages = messages(1);
