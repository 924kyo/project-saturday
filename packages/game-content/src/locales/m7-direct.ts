export const m7DirectKo = {
  'm7Direct.shell.calendar': '{season}시즌 · {week}주차',
  'm7Direct.shell.opponent': '이번 경기 상대: {opponent}',
  'm7Direct.shell.worldRound': '이번 포스트시즌 라운드에는 소속팀 경기가 없습니다.',
  'm7Direct.creation.pending':
    '{name} 선수의 첫 저장을 기다리고 있습니다. 다시 시도하면 같은 선수와 시드가 저장됩니다.',
  'm7Direct.shell.settledState':
    '직전 정산 시점의 상태입니다. 이번 주에 저장한 준비와 경기 결과는 주간 화면에서 확인하세요.',
  'm7Direct.shell.openWeek': '다음 선택으로',
  'm7Direct.shell.competition': '바로 옆의 경쟁 상대: {name}',
  'm7Direct.shell.comparison': '{factor}: 나 {player} · 상대 {neighbor}',
  'm7Direct.shell.deficit': '현재 평가에서 가장 크게 뒤처진 항목: {factor}',
  'm7Direct.shell.roomHelp':
    '코치는 포지션에 맞는 능력, 신뢰, 최근 연습, 전술 적합도, 경기 준비도를 함께 봅니다. 아래 근거에서 다음 훈련의 방향을 찾아보세요.',
  'm7Direct.shell.history': '이번 시즌 경기 기록',
  'm7Direct.shell.identity': '선수의 배경과 성격',
  'm7Direct.nil.projected':
    '이번 주에 저장한 NIL 선택을 반영한 상태입니다. 활동 계획과 경기에는 이 값이 이어집니다.',
  'm7Direct.nil.expire': '기한이 지난 제안 정리',
  'm7Direct.nil.afterObligation': '선택 후 남은 의무: {count}주',
  'm7Direct.nil.attention':
    '필수 생활 활동 {count}칸. 별도로 선택하는 세 가지 집중 활동은 유지됩니다.',
  'm7Direct.nil.noDecision': '지금 해결할 NIL 선택은 없습니다.',
  'm7Direct.nil.preview': '이 선택을 저장하면 적용되는 변화',
  'm7Direct.skills.historical':
    '이전 저장 형식에는 각성 진척의 항목별 근거가 없습니다. 기존 카드와 진척은 그대로 유지됩니다.',
  'm7Direct.skills.help':
    '성장, 코치·역할, 경기, 자신감, 몸 관리, 학업·생활의 성과가 각성을 만듭니다. 네 장의 장착 스킬은 훈련뿐 아니라 경기 판단과 생활 선택에도 영향을 줍니다.',
  'm7Direct.skills.buildHelp':
    '활동 계획 중에 네 슬롯을 바꿀 수 있습니다. 같은 카드를 다른 슬롯으로 옮기면 원래 슬롯은 비워집니다.',
  'm7Direct.plan.xpCapped':
    '{attribute}: XP +{xp} · 레이팅 {ratingBefore} → {ratingAfter} · 최대 레이팅 도달',
  'm7Direct.plan.title': '이번 주의 세 가지 집중 활동',
  'm7Direct.plan.help':
    '훈련, 경기 준비, 회복, 학업 사이에서 선택하세요. 같은 활동을 반복해도 됩니다. 아래 예상 결과에는 현재 스킬과 선택 순서가 반영됩니다.',
  'm7Direct.plan.slot': '집중 활동 {slot}',
  'm7Direct.plan.unavailable': '{action} — 현재 부상으로 선택 불가',
  'm7Direct.plan.base': '기본 변화: 몸 상태 {body} · 경기 준비 {preparation} · 자신감 {confidence}',
  'm7Direct.plan.proficiency': '현재 숙련도 {level} · 누적 {uses}회 · XP 효율 {multiplier}',
  'm7Direct.plan.next': '{threshold}회까지 {remaining}회 남음 · 다음 XP 효율 {multiplier}',
  'm7Direct.plan.noProficiency': '속성 XP나 훈련 숙련도를 얻는 활동은 아닙니다.',
  'm7Direct.plan.forecast': '세 활동을 마친 뒤의 예상 결과',
  'm7Direct.plan.change': '{label}: {before} → {after}',
  'm7Direct.plan.practice': '훈련 평가 {score}',
  'm7Direct.plan.factors':
    '기준 {base} · 활동 {focus} · 몸 상태 {body} · 경기 준비 {preparation} · 자신감 {confidence}',
  'm7Direct.plan.opportunities':
    '예상 키 스냅 {count}회. 이후 학업 자격과 부상 판정에 따라 줄어들 수 있습니다.',
  'm7Direct.plan.details': '활동별 성장과 변화',
  'm7Direct.plan.xp':
    '{attribute}: XP +{xp} · 레이팅 {ratingBefore} → {ratingAfter} · 다음 레이팅 진행 {progress}/{required}',
  'm7Direct.plan.incomplete':
    '세 활동을 모두 선택하면 실제 적용 규칙에 따른 예상 결과를 볼 수 있습니다.',
  'm7Direct.plan.blocked':
    '먼저 대기 중인 선택이나 필수 의무를 해결하세요. 부상으로 제한된 활동은 바꿔야 합니다.',
} as const;

export const m7DirectEn = {
  'm7Direct.shell.calendar': 'Season {season} · Week {week}',
  'm7Direct.shell.opponent': 'This game’s opponent: {opponent}',
  'm7Direct.shell.worldRound': 'Your program has no fixture in this postseason round.',
  'm7Direct.creation.pending':
    'The first save for {name} is pending. Retry saves the same athlete and seed.',
  'm7Direct.shell.settledState':
    'Last settled athlete state. Open Week for this week’s saved preparation and Game Day consequences.',
  'm7Direct.shell.openWeek': 'Go to your next decision',
  'm7Direct.shell.competition': 'Adjacent competition: {name}',
  'm7Direct.shell.comparison': '{factor}: you {player} · competitor {neighbor}',
  'm7Direct.shell.deficit': 'Largest weighted gap in the current evaluation: {factor}',
  'm7Direct.shell.roomHelp':
    'Coaches consider position ability, trust, recent practice, scheme fit, and game readiness together. Use the evidence below to guide your next training choices.',
  'm7Direct.shell.history': 'This season’s game record',
  'm7Direct.shell.identity': 'Athlete background and personality',
  'm7Direct.nil.projected':
    'These values include this week’s saved NIL choices. Your focus plan and game carry them forward.',
  'm7Direct.nil.expire': 'Clear expired offers',
  'm7Direct.nil.afterObligation': 'Obligation remaining after this choice: {count} weeks',
  'm7Direct.nil.attention':
    'Mandatory off-field attention: {count} blocks. Your three discretionary focuses remain available separately.',
  'm7Direct.nil.noDecision': 'There is no NIL decision to resolve right now.',
  'm7Direct.nil.preview': 'Changes applied when you save this choice',
  'm7Direct.skills.historical':
    'The earlier save format did not record a source breakdown. Your existing cards and progress are preserved.',
  'm7Direct.skills.help':
    'Development, role and coach progress, game day, mindset, Body management, and academics or life can earn a breakthrough. Your four equipped skills affect training, football decisions, and life choices.',
  'm7Direct.skills.buildHelp':
    'Change any of four slots during focus planning. Moving a card to another slot leaves its previous slot empty.',
  'm7Direct.plan.xpCapped':
    '{attribute}: +{xp} XP · rating {ratingBefore} → {ratingAfter} · maximum rating reached',
  'm7Direct.plan.title': 'Three focuses for this week',
  'm7Direct.plan.help':
    'Choose between development, game preparation, recovery, and academics. Repeats are allowed. The forecast includes your current skills and focus order.',
  'm7Direct.plan.slot': 'Focus {slot}',
  'm7Direct.plan.unavailable': '{action} — unavailable with your current injury',
  'm7Direct.plan.base':
    'Base changes: Body {body} · Preparation {preparation} · Confidence {confidence}',
  'm7Direct.plan.proficiency':
    'Current proficiency {level} · {uses} uses · XP efficiency {multiplier}',
  'm7Direct.plan.next':
    '{remaining} uses to threshold {threshold} · next XP efficiency {multiplier}',
  'm7Direct.plan.noProficiency': 'This focus does not award attribute XP or training proficiency.',
  'm7Direct.plan.forecast': 'Forecast after all three focuses',
  'm7Direct.plan.change': '{label}: {before} → {after}',
  'm7Direct.plan.practice': 'Practice Grade {score}',
  'm7Direct.plan.factors':
    'Base {base} · focuses {focus} · Body {body} · Preparation {preparation} · Confidence {confidence}',
  'm7Direct.plan.opportunities':
    '{count} projected key snaps. Later academic eligibility and injury assessment may reduce participation.',
  'm7Direct.plan.details': 'Growth and changes by focus',
  'm7Direct.plan.xp':
    '{attribute}: +{xp} XP · rating {ratingBefore} → {ratingAfter} · next-rating progress {progress}/{required}',
  'm7Direct.plan.incomplete':
    'Choose all three focuses to see a forecast from the actual resolution rules.',
  'm7Direct.plan.blocked':
    'Resolve pending choices or mandatory obligations first. Replace any focus restricted by your injury.',
} as const satisfies Record<keyof typeof m7DirectKo, string>;
