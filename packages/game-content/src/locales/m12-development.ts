/**
 * M12 development copy: preseason camp, the midseason checkpoint and the coach's focus, offseason
 * programs, potential, the plan preview, injury-risk parts and next milestones.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  // Preseason camp.
  'v2.camp.eyebrow': ['Season {season} · Preseason camp', '{season}시즌 · 프리시즌 캠프'],
  'v2.camp.title': ['Pick three camp emphases', '캠프 중점 세 가지를 고르세요'],
  'v2.camp.help': [
    'Camp work earns {xp}% of a practice week’s XP and starts the role battle before week one. Camp has its own recovery, so Body and Preparation stay where they are.',
    '캠프 훈련은 연습 주간 XP의 {xp}%를 얻고, 1주차 전에 주전 경쟁을 시작합니다. 캠프에는 자체 회복이 있어 체력과 준비도는 그대로 유지됩니다.',
  ],
  'v2.camp.recommended': ['Coach’s camp plan', '코치 추천 캠프'],
  'v2.camp.lockIn': ['Run camp', '캠프 진행'],
  'v2.camp.reportTitle': ['Camp report', '캠프 결과'],
  'v2.camp.role': [
    'You open the season at {position}{rank}',
    '{position}{rank}로 시즌을 시작합니다',
  ],
  'v2.camp.continue': ['To week one', '1주차로'],
  'v2.camp.excluded': [
    'Recovery and study hall are not part of camp.',
    '회복과 스터디 홀은 캠프에 포함되지 않습니다.',
  ],
  // Midseason checkpoint.
  'v2.mid.eyebrow': ['Midseason review', '시즌 중간 점검'],
  'v2.mid.title': ['Six games in', '여섯 경기를 치렀습니다'],
  'v2.mid.summary': ['Season so far', '지금까지의 시즌'],
  'v2.mid.record': ['Record {wins}-{losses}-{ties}', '전적 {wins}승 {losses}패 {ties}무'],
  'v2.mid.reads': [
    'Sharp reads {sharp} of {total} live snaps',
    '실전 스냅 {total}회 중 정확한 판단 {sharp}회',
  ],
  'v2.mid.grade': ['Average staff grade {grade}', '코치진 평균 평가 {grade}'],
  'v2.mid.overall': ['Overall {start} → {now}', '종합 {start} → {now}'],
  'v2.mid.depth': [
    'Depth {position}{start} → {position}{now}',
    '뎁스 {position}{start} → {position}{now}',
  ],
  'v2.mid.focusTitle': ['The coach’s focus', '코치의 집중 과제'],
  'v2.mid.focusKey': [
    'Your {attribute} has the most overall to gain. Run {focus} in two of the next three weeks.',
    '{attribute}을(를) 올리면 종합 능력치가 가장 크게 오릅니다. 앞으로 3주 중 2주 동안 {focus}을(를) 하세요.',
  ],
  'v2.mid.focusReads': [
    'Too many reads have gone wrong. Run {focus} in two of the next three weeks to sharpen your Football IQ.',
    '판단 실수가 많았습니다. 풋볼 IQ를 높이도록 앞으로 3주 중 2주 동안 {focus}을(를) 하세요.',
  ],
  'v2.mid.reward': [
    'Done: coach trust +{trust}, {attribute} +{xp} XP, breakthrough gauge +{gauge}. Missed: coach trust {miss}.',
    '달성: 코치 신뢰 +{trust}, {attribute} +{xp} XP, 브레이크스루 게이지 +{gauge}. 실패: 코치 신뢰 {miss}.',
  ],
  'v2.mid.accept': ['Take it on', '받아들인다'],
  'v2.mid.decline': ['Keep my own plan', '내 계획대로 간다'],
  'v2.focus.progress': [
    'Coach’s focus: {focus} {done}/{required} weeks',
    '코치의 집중 과제: {focus} {done}/{required}주',
  ],
  'v2.focus.met': [
    'Coach’s focus done: trust +{trust}, +{xp} XP, gauge +{gauge}',
    '코치의 집중 과제 달성: 신뢰 +{trust}, +{xp} XP, 게이지 +{gauge}',
  ],
  'v2.focus.missed': ['Coach’s focus missed: trust {trust}', '코치의 집중 과제 실패: 신뢰 {trust}'],
  // Offseason programs.
  'v2.offProgram.title': ['Offseason program', '오프시즌 프로그램'],
  'v2.offProgram.help': [
    'One project for the summer. Its XP follows next season’s potential.',
    '여름 동안 할 프로젝트 하나를 고르세요. XP는 다음 시즌의 잠재력에 따릅니다.',
  ],
  'v2.offProgram.none': ['Rest (no program)', '휴식 (프로그램 없음)'],
  'v2.offProgram.strength': ['Strength program', '근력 프로그램'],
  'v2.offProgram.speed': ['Speed school', '스피드 스쿨'],
  'v2.offProgram.film': ['Film library', '필름 라이브러리'],
  'v2.offProgram.clinic': ['Position clinic', '포지션 클리닉'],
  'v2.offProgram.classes': ['Summer classes', '여름 학기'],
  'v2.offProgram.gain': ['{attribute} +{xp} XP', '{attribute} +{xp} XP'],
  'v2.offProgram.body': ['Starts the season at Body {value}', '체력 {value}로 시즌 시작'],
  'v2.offProgram.prep': ['Starts the season at Preparation {value}', '준비도 {value}로 시즌 시작'],
  'v2.offProgram.gpa': ['GPA {value}', 'GPA {value}'],
  'v2.offProgram.brand': ['Brand {value}', '브랜드 {value}'],
  // Potential.
  'v2.potential.title': ['Potential', '잠재력'],
  'v2.potential.line': [
    'Training XP this season: {value}% ({background})',
    '이번 시즌 훈련 XP: {value}% ({background})',
  ],
  'v2.potential.curve': [
    'Freshman {a}% · Sophomore {b}% · Junior {c}% · Senior {d}%',
    '1학년 {a}% · 2학년 {b}% · 3학년 {c}% · 4학년 {d}%',
  ],
  'v2.potential.standing': [
    'Recruit standing {value}: it sets how strong your first offers are.',
    '리크루트 평판 {value}: 첫 제안의 수준을 정합니다.',
  ],
  // Plan preview.
  'v2.preview.title': ['What this plan does', '이 계획의 결과'],
  'v2.preview.overall': ['Overall {before} → {after}', '종합 {before} → {after}'],
  'v2.preview.gauge': ['Breakthrough gauge +{gain}', '브레이크스루 게이지 +{gain}'],
  'v2.preview.empty': [
    'Pick three focuses to see the XP, the grade and the risk before you lock in.',
    '세 가지를 고르면 확정하기 전에 XP, 평가, 위험도를 볼 수 있습니다.',
  ],
  // Injury risk parts.
  'v2.risk.partsTitle': ['What makes up the risk', '위험도 구성'],
  'v2.risk.part.base': ['Football itself', '경기 자체'],
  'v2.risk.part.bodyDeficit': ['Missing Body', '부족한 체력'],
  'v2.risk.part.durability': ['Durability', '내구성'],
  'v2.risk.part.workload': ['Saturday workload', '경기 출전량'],
  'v2.risk.part.trainingLoad': ['This week’s training load', '이번 주 훈련 부하'],
  'v2.risk.part.positionExposure': ['Position contact', '포지션 접촉'],
  'v2.risk.part.cards': ['Cards ×{value}', '카드 ×{value}'],
  'v2.risk.total': [
    'Chance of an injury before Saturday: {value}%',
    '토요일 전 부상 확률: {value}%',
  ],
  // Next milestones.
  'v2.milestone.title': ['Next milestones', '다음 목표'],
  'v2.milestone.tellsMax': [
    'Two tells from preparation and IQ (cards and events can add a third).',
    '준비와 IQ로 단서 2개 확보 (카드와 이벤트로 세 번째 가능).',
  ],
  'v2.milestone.tell': [
    'Tell {n}: information {score}/{at}. About +{prep} Preparation or +{iq} Football IQ.',
    '단서 {n}: 정보 점수 {score}/{at}. 준비도 약 +{prep} 또는 풋볼 IQ +{iq}.',
  ],
  'v2.milestone.tellIqOnly': [
    'Tell {n}: information {score}/{at}. Preparation alone can’t reach it: about +{iq} Football IQ, or a card or event.',
    '단서 {n}: 정보 점수 {score}/{at}. 준비만으로는 부족합니다: 풋볼 IQ 약 +{iq}, 또는 카드나 이벤트.',
  ],
  'v2.milestone.point': [
    '{attribute} {rating} → {next}: {xp} XP to go',
    '{attribute} {rating} → {next}: {xp} XP 남음',
  ],
  'v2.milestone.depthUp': [
    'Passing {name}: {gap} more depth points (the gap plus the margin a move needs), mostly in {component}.',
    '{name} 추월까지: 뎁스 점수 {gap}점 더 필요 (점수 차 + 순위가 바뀌는 데 필요한 여유분), 주로 {component}.',
  ],
  'v2.milestone.depthTop': [
    'Top of the depth chart: {name} needs {gap} more depth points to pass you.',
    '뎁스 차트 1위: {name}이(가) 당신을 넘으려면 뎁스 점수 {gap}점이 더 필요합니다.',
  ],
  'v2.milestone.draft': [
    'Draft outlook: {factor} is the weakest part ({value}).',
    '드래프트 전망: {factor}이(가) 가장 약합니다 ({value}).',
  ],
  'v2.draftFactor.ability': ['Ability', '능력'],
  'v2.draftFactor.production': ['Production', '생산성'],
  'v2.draftFactor.exposure': ['Exposure', '노출도'],
  'v2.draftFactor.bigGames': ['Big games', '큰 경기'],
  // Development guide: each meter, what moves it, and the current numbers.
  'v2.guide.title': ['How development works', '성장은 이렇게 이루어집니다'],
  'v2.guide.xp': [
    'Attribute XP: every 100 XP is +1 rating. Training XP runs at {body}% at your current Body and {potential}% for your potential this season.',
    '능력치 XP: 100 XP마다 능력치 +1. 현재 체력에서 훈련 XP는 {body}%, 이번 시즌 잠재력은 {potential}%입니다.',
  ],
  'v2.guide.overall': [
    'Overall is the coaches’ talent score for your position, not an average: {list}.',
    '종합 능력치는 평균이 아니라 포지션별 코치 평가 점수입니다: {list}.',
  ],
  'v2.guide.depth': [
    'The depth chart weighs: {list}. Moving past a teammate needs a {margin}-point margin, so one bad week rarely costs a spot.',
    '뎁스 차트 반영 비중: {list}. 순위를 바꾸려면 {margin}점의 여유가 필요해 한 주 부진으로 자리를 잃는 일은 드뭅니다.',
  ],
  'v2.guide.information': [
    'Tells come from an information score: Football IQ {iq}%, {reading} {readingWeight}%, Preparation {prep}%. {one} unlocks one tell, {two} a second; cards and events add more.',
    '단서는 정보 점수로 결정됩니다: 풋볼 IQ {iq}%, {reading} {readingWeight}%, 준비도 {prep}%. {one}점이면 단서 1개, {two}점이면 2개이며 카드와 이벤트로 더 얻을 수 있습니다.',
  ],
  'v2.guide.condition': [
    'Body sets training efficiency and injury risk (risk grows with the square of missing Body). Preparation feeds tells and the execution score; Confidence feeds the execution score. These are this week’s condition, not ratings.',
    '체력은 훈련 효율과 부상 위험을 정합니다 (부족한 체력의 제곱에 비례해 위험 증가). 준비도는 단서와 수행 점수에, 자신감은 수행 점수에 반영됩니다. 이 값들은 이번 주 컨디션이지 능력치가 아닙니다.',
  ],
  'v2.guide.trust': [
    'Coach trust moves with your practice grade and the staff’s game grade, and it is one of the depth chart’s parts.',
    '코치 신뢰는 연습 평가와 경기 평가에 따라 움직이며 뎁스 차트 요소 중 하나입니다.',
  ],
  'v2.guide.academics': [
    'Academics: at checkpoint weeks ({weeks}) a GPA under {floor} sits you out of that game; {warning} is the warning line.',
    '학업: 점검 주차({weeks})에 GPA가 {floor} 미만이면 그 경기에 나갈 수 없습니다. {warning}이 경고선입니다.',
  ],
  'v2.guide.gauge': [
    'Breakthrough gauge: practice and some events fill it; every {threshold} points buys a choice of cards.',
    '브레이크스루 게이지: 연습과 일부 이벤트로 차며, {threshold}점마다 카드를 고를 수 있습니다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12DevelopmentMessages = messages(0);
export const koKRM12DevelopmentMessages = messages(1);
