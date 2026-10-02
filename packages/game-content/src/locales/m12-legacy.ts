/**
 * M12 legacy copy (Phase 8): legacy points and their reasons, the Hall of Fame, the Pro Combine,
 * and the perks a later career can start with.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.legacy.points.title': ['Legacy earned', '획득한 레거시'],
  'v2.legacy.points.total': [
    '{points, plural, one {# legacy point} other {# legacy points}} for later careers',
    '다음 커리어를 위한 레거시 포인트 {points, plural, other {#점}}',
  ],
  'v2.legacy.points.role': [
    'Role (best depth rank {value}): +{points}',
    '역할 (최고 뎁스 순위 {value}): +{points}',
  ],
  'v2.legacy.points.honors': ['Honors ({value}): +{points}', '수상 ({value}회): +{points}'],
  'v2.legacy.points.team': ['Team titles ({value}): +{points}', '팀 우승 ({value}회): +{points}'],
  'v2.legacy.points.academics': [
    'Academics (final GPA {gpa}): +{points}',
    '학업 (최종 학점 {gpa}): +{points}',
  ],
  'v2.legacy.points.relationships': [
    'Leadership and goals ({value} goals met): +{points}',
    '리더십과 목표 (달성 목표 {value}개): +{points}',
  ],
  'v2.legacy.points.draft': [
    'Drafted (round {value}): +{points}',
    '드래프트 ({value}라운드): +{points}',
  ],
  'v2.legacy.points.hallOfFame': ['Hall of Fame: +{points}', '명예의 전당: +{points}'],
  'v2.legacy.points.none': [
    'No legacy points this time: a starting role, an honor, a title, good grades, met goals or a draft pick would have earned some.',
    '이번에는 레거시 포인트가 없습니다. 주전 역할, 수상, 우승, 좋은 학점, 목표 달성, 드래프트 지명으로 얻을 수 있습니다.',
  ],
  'v2.hof.inducted': [
    'Inducted into the Hall of Fame (score {score}; the bar is {bar}).',
    '명예의 전당 헌액 (점수 {score}, 기준 {bar}).',
  ],
  'v2.hof.notInducted': [
    'Hall of Fame score {score}; induction takes {bar}.',
    '명예의 전당 점수 {score}, 헌액 기준은 {bar}입니다.',
  ],
  'v2.hof.title': ['Hall of Fame', '명예의 전당'],
  'v2.hof.none': ['No one inducted yet.', '아직 헌액자가 없습니다.'],
  'v2.combine.title': ['Pro Combine', '프로 컴바인'],
  'v2.combine.line': [
    '40-yard {forty}s · vertical {vertical}" · bench {bench} reps · shuttle {shuttle}s · football test {test}',
    '40야드 {forty}초 · 수직 점프 {vertical}인치 · 벤치 {bench}회 · 셔틀 {shuttle}초 · 풋볼 테스트 {test}',
  ],
  'v2.combine.stock': [
    'Draft stock from the workout: {delta}',
    '워크아웃으로 인한 드래프트 평가: {delta}',
  ],
  // Perks (LEG-02, LEG-04, LEG-05).
  'v2.perks.title': ['Legacy perks', '레거시 혜택'],
  'v2.perks.balance': [
    '{points, plural, one {# point} other {# points}} to spend · earned from {careers, plural, one {# finished career} other {# finished careers}}',
    '사용 가능 {points, plural, other {#점}} · 완료한 커리어 {careers, plural, other {#개}}에서 획득',
  ],
  'v2.perks.help': [
    'Perks change how a career can start. They never raise a rating cap, and a first career needs none.',
    '혜택은 커리어의 시작 방식을 바꿉니다. 능력치 상한은 올리지 않으며, 첫 커리어는 혜택 없이도 충분합니다.',
  ],
  'v2.perks.unlock': ['Unlock · {cost}', '해금 · {cost}'],
  'v2.perks.level': ['Level {level} of {max}', '{max}단계 중 {level}'],
  'v2.perks.locked': ['Locked', '잠김'],
  'v2.perks.perkHeadStart.name': ['Head start', '헤드 스타트'],
  'v2.perks.perkHeadStart.desc': [
    '+1 allocation point per level when building the athlete (at most +3). Caps per attribute do not change.',
    '선수 설계 시 단계마다 배분 포인트 +1 (최대 +3). 능력치별 상한은 그대로입니다.',
  ],
  'v2.perks.perkMentorChoice.name': ['Mentor choice', '멘토 선택'],
  'v2.perks.perkMentorChoice.desc': [
    'Pick a former player as your mentor: they check in wherever you play, not only at their old school.',
    '전 선수 한 명을 멘토로 고릅니다. 그 선수의 옛 학교가 아니어도 어디서든 찾아옵니다.',
  ],
  'v2.perks.perkLegacyOffer.name': ['Legacy offer', '레거시 제안'],
  'v2.perks.perkLegacyOffer.desc': [
    'A guaranteed first offer from a program a former player played for.',
    '전 선수가 뛰었던 학교에서 첫 제안을 보장받습니다.',
  ],
  'v2.perks.perkCommemorativeGear.name': ['Commemorative gear', '기념 장비'],
  'v2.perks.perkCommemorativeGear.desc': [
    'Start the career owning the gold trim, worn from day one.',
    '골드 트림을 보유하고 착용한 채 커리어를 시작합니다.',
  ],
  'v2.perks.useHeadStart': ['Extra points this career', '이번 커리어 추가 포인트'],
  'v2.perks.useMentor': ['Mentor', '멘토'],
  'v2.perks.useOffer': ['Guaranteed offer from', '보장 제안 학교'],
  'v2.perks.useGear': ['Start with the gold trim', '골드 트림으로 시작'],
  'v2.perks.none': ['None', '선택 안 함'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12LegacyMessages = messages(0);
export const koKRM12LegacyMessages = messages(1);
