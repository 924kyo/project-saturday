/**
 * Weekly lifecycle copy for Career VNext: event scene cards, per-event choice labels for the
 * QB/RB/CB catalogs (whose shipped choice names were generic), and the pregame medical check.
 * Choice keys are `v2.evt.<camelEventId>.<commit|protect|connect>`; a content test proves coverage.
 */
type Pair = readonly [en: string, ko: string];
type ChoiceRow = readonly [camel: string, commit: Pair, protect: Pair, connect?: Pair];

const choiceRows: readonly ChoiceRow[] = [
  // Quarterback
  [
    'qbProtectionMeeting',
    ['Stay for the extra protection install', '추가 보호 설치 미팅에 남는다'],
    ['Rest up and trust the line', '쉬면서 라인을 믿는다'],
  ],
  [
    'qbBackupRepRequest',
    ['Keep every rep for yourself', '반복을 전부 가져간다'],
    ['Give up the reps', '반복을 넘겨준다'],
    ['Split the reps and coach through them', '반복을 나누고 함께 짚어 준다'],
  ],
  [
    'qbReceiverTiming',
    ['Throw until the timing clicks', '타이밍이 맞을 때까지 던진다'],
    ['Rest the arm tonight', '오늘 밤은 팔을 쉰다'],
    ['Walk the timing on the whiteboard', '화이트보드로 타이밍을 맞춘다'],
  ],
  [
    'qbFilmRoomDispute',
    ['Study both reads overnight', '두 리드를 밤새 연구한다'],
    ['Trust your own eyes', '내 눈을 믿는다'],
    ['Settle it with the coordinator', '코디네이터와 함께 정리한다'],
  ],
  [
    'qbMuddyPractice',
    ['Grind through the mud', '진흙 속에서 끝까지 버틴다'],
    ['Sit out the slop', '진창 훈련은 빠진다'],
  ],
  [
    'qbCampusInterview',
    ['Do the interview', '인터뷰에 응한다'],
    ['Politely decline', '정중히 거절한다'],
  ],
  [
    'qbTutorOverlap',
    ['Keep the tutor session', '튜터 세션을 지킨다'],
    ['Skip it for football work', '풋볼 훈련을 택한다'],
    ['Study with a teammate after practice', '훈련 뒤 동료와 함께 공부한다'],
  ],
  [
    'qbSoreThrowingArm',
    ['Shut the arm down for a day', '하루 동안 팔을 쉰다'],
    ['Keep throwing through it', '참고 계속 던진다'],
  ],
  [
    'qbTwoMinuteChallenge',
    ['Take the two-minute period', '2분 드릴에 나선다'],
    ['Watch from the side', '옆에서 지켜본다'],
  ],
  [
    'qbRoommateNoise',
    ['Study late in the library', '도서관에서 늦게까지 공부한다'],
    ["Crash on a friend's couch", '친구 집 소파에서 잔다'],
  ],
  [
    'qbCaptainMessage',
    ['Speak up in the huddle', '허들에서 목소리를 낸다'],
    ['Let the captain lead', '주장에게 맡긴다'],
    ['Run a players-only meeting', '선수들끼리 미팅을 연다'],
  ],
  [
    'qbLocalAppearance',
    ['Make the appearance', '행사에 참석한다'],
    ['Stay in and recover', '숙소에서 회복한다'],
  ],
  // Running back
  [
    'rbBallSecurityChallenge',
    ['Run the gauntlet drill', '건틀릿 드릴을 뛴다'],
    ['Skip the extra drill', '추가 드릴은 건너뛴다'],
  ],
  [
    'rbProtectionWalkthrough',
    ['Stay for blitz pickup reps', '블리츠 픽업 반복에 남는다'],
    ['Head to the training room', '트레이닝룸으로 간다'],
    ['Walk it through with the line', '라인과 함께 동선을 맞춘다'],
  ],
  [
    'rbReceiverRoutes',
    ['Run routes with the receivers', '리시버들과 루트를 뛴다'],
    ['Save your legs', '다리를 아낀다'],
    ['Ask the QB to script your routes', 'QB에게 루트 스크립트를 부탁한다'],
  ],
  [
    'rbGoalLineReps',
    ['Take the goal-line reps', '골라인 반복을 맡는다'],
    ['Leave them to the veterans', '고학년에게 넘긴다'],
  ],
  [
    'rbSoreHips',
    ['Rest the hips', '엉덩이를 쉬게 한다'],
    ['Tape up and practice', '테이핑하고 훈련한다'],
  ],
  [
    'rbRoomRotation',
    ['Compete for the rotation', '로테이션 자리를 두고 경쟁한다'],
    ['Accept your slot', '지금 자리를 받아들인다'],
    ['Share the backfield notes', '백필드 노트를 공유한다'],
  ],
  [
    'rbTutorSession',
    ['Go to the tutor session', '튜터 세션에 간다'],
    ['Skip it for film', '필름 공부를 택한다'],
  ],
  [
    'rbCampusFeature',
    ['Sit for the feature story', '특집 기사 인터뷰에 응한다'],
    ['Pass on it', '사양한다'],
  ],
  [
    'rbFilmCutup',
    ['Build your own cut-up', '직접 컷업 영상을 만든다'],
    ['Rely on the staff tape', '스태프 영상에 맡긴다'],
  ],
  [
    'rbEquipmentAdjustment',
    ['Break in the new pads', '새 패드를 길들인다'],
    ['Stick with the old gear', '예전 장비를 고수한다'],
  ],
  [
    'rbCaptainAssignment',
    ['Lead the scout team', '스카우트 팀을 이끈다'],
    ['Keep your head down', '조용히 제 몫만 한다'],
    ['Lead it with the seniors', '4학년들과 함께 이끈다'],
  ],
  [
    'rbCommunityClinic',
    ['Coach the youth clinic', '유소년 클리닉에서 가르친다'],
    ['Stay on your schedule', '내 일정을 지킨다'],
  ],
  // Cornerback
  [
    'cbReleaseStudy',
    ['Chart every release', '모든 릴리스를 기록한다'],
    ['Keep your usual prep', '평소 준비를 유지한다'],
  ],
  [
    'cbReceiverChallenge',
    ['Accept the one-on-one challenge', '1대1 도전을 받아들인다'],
    ['Decline and recover', '거절하고 회복한다'],
    ['Turn it into a teaching period', '서로 배우는 시간으로 바꾼다'],
  ],
  [
    'cbTackleCircuit',
    ['Finish the full circuit', '서킷을 끝까지 마친다'],
    ['Cut the circuit short', '서킷을 일찍 끝낸다'],
    ['Pair up with a safety', '세이프티와 짝을 이룬다'],
  ],
  [
    'cbBallDrill',
    ['Stay for ball drills', '볼 드릴에 남는다'],
    ['Call it a day', '오늘은 여기까지'],
  ],
  [
    'cbSoreShoulders',
    ['Rest the shoulders', '어깨를 쉬게 한다'],
    ['Play through it', '참고 훈련한다'],
  ],
  [
    'cbSecondaryRotation',
    ['Compete for the rotation', '로테이션 자리를 두고 경쟁한다'],
    ['Accept your slot', '지금 자리를 받아들인다'],
    ['Study the coverage calls together', '커버리지 콜을 함께 공부한다'],
  ],
  [
    'cbTutorOverlap',
    ['Keep the tutor session', '튜터 세션을 지킨다'],
    ['Skip it for film', '필름 공부를 택한다'],
  ],
  [
    'cbCampusInterview',
    ['Do the interview', '인터뷰에 응한다'],
    ['Politely decline', '정중히 거절한다'],
  ],
  [
    'cbOpponentCutup',
    ['Break down their top receiver', '상대 에이스 리시버를 분석한다'],
    ['Rely on the scouting report', '스카우팅 리포트에 맡긴다'],
  ],
  [
    'cbWeatherPractice',
    ['Practice through the storm', '폭풍 속에서 훈련한다'],
    ['Move inside for a walk-through', '실내 워크스루로 옮긴다'],
  ],
  [
    'cbCaptainCheckin',
    ['Speak up in the DB room', 'DB 룸에서 목소리를 낸다'],
    ['Let the captain lead', '주장에게 맡긴다'],
    ['Run a players-only meeting', '선수들끼리 미팅을 연다'],
  ],
  [
    'cbYouthCamp',
    ['Coach at the youth camp', '유소년 캠프에서 가르친다'],
    ['Stay on your schedule', '내 일정을 지킨다'],
  ],
];

function choiceMessages(index: 0 | 1): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [camel, commit, protect, connect] of choiceRows) {
    messages[`v2.evt.${camel}.commit`] = commit[index];
    messages[`v2.evt.${camel}.protect`] = protect[index];
    if (connect !== undefined) messages[`v2.evt.${camel}.connect`] = connect[index];
  }
  return messages;
}

const screen = {
  'v2.evt.eyebrow': ['Off the field this week', '이번 주, 경기장 밖에서'],
  'v2.evt.choose': ['How do you handle it?', '어떻게 하겠습니까?'],
  'v2.evt.outcome': ['How it played out', '결과'],
  'v2.evt.carries': ['Carries into Saturday', '토요일 경기까지 이어집니다'],
  'v2.evt.noChange': ['No change to your readiness', '컨디션 변화 없음'],
  'v2.evt.modClue': ['+{value} read clue on your snaps', '내 스냅의 리드 단서 +{value}'],
  'v2.evt.modScore': ['+{value} decision edge', '판단 보너스 +{value}'],
  'v2.evt.modExposure.qb': ['Pressure reduced {value}%', '압박 {value}% 감소'],
  'v2.evt.modExposure.rb': ['Contact reduced {value}%', '충돌 {value}% 감소'],
  'v2.evt.modExposure.wr': ['Coverage pressure reduced {value}%', '커버리지 압박 {value}% 감소'],
  'v2.evt.modExposure.cb': ['Targets reduced {value}%', '타깃 {value}% 감소'],
  'v2.evt.continue': ['Continue', '계속'],
  'v2.evt.choiceLabel': ['{name}: {effects}', '{name}: {effects}'],
  'v2.build.tabWeek': ['This week', '이번 주'],
  'v2.build.tabBuild': ['Build ({count})', '빌드 ({count})'],
  'v2.build.nav': ['Week sections', '주간 메뉴'],
  'v2.build.title': ['Your build', '나의 빌드'],
  'v2.build.help': [
    'Pick a slot, then a card. Cards work in practice, on Saturday and in weekly events.',
    '슬롯을 고른 뒤 카드를 선택하세요. 카드는 훈련, 토요일 경기, 주간 이벤트에서 작동합니다.',
  ],
  'v2.build.slot': ['Slot {n}', '슬롯 {n}'],
  'v2.build.empty': ['Empty', '비어 있음'],
  'v2.build.remove': ['Remove', '해제'],
  'v2.build.collection': ['Collection', '보유 카드'],
  'v2.build.none': [
    'No cards yet. Fill the breakthrough gauge in practice to earn your first card.',
    '아직 카드가 없습니다. 훈련으로 브레이크스루 게이지를 채우면 첫 카드를 얻습니다.',
  ],
  'v2.build.equipped': ['In slot {n}', '슬롯 {n} 장착'],
  'v2.build.gauge': ['Breakthrough {value}/{threshold}', '브레이크스루 {value}/{threshold}'],
  'v2.bt.eyebrow': ['Breakthrough', '브레이크스루'],
  'v2.bt.title': ['Choose your next card', '다음 카드를 고르세요'],
  'v2.bt.help': [
    'The gauge is full. One of these joins your build for good.',
    '게이지가 가득 찼습니다. 이 중 한 장이 영구히 빌드에 합류합니다.',
  ],
  'v2.bt.slotted': ['Equipped in slot {n}.', '슬롯 {n}에 장착했습니다.'],
  'v2.bt.stored': [
    'All four slots are full, so it waits in your collection. Swap it in from Build.',
    '네 슬롯이 모두 찼습니다. 보유 카드에 보관되며, 빌드에서 교체할 수 있습니다.',
  ],
  'v2.nav.team': ['Team', '팀'],
  'v2.nav.profile': ['Profile', '프로필'],
  'v2.team.recordLine': ['Record {wins}-{losses}-{ties}', '전적 {wins}승 {losses}패 {ties}무'],
  'v2.team.unranked': ['Unranked', '순위권 밖'],
  'v2.team.schedule': ['Schedule', '일정'],
  'v2.team.week': ['Week {n}', '{n}주차'],
  'v2.team.win': ['W {us}–{them}', '승 {us}–{them}'],
  'v2.team.loss': ['L {us}–{them}', '패 {us}–{them}'],
  'v2.team.tie': ['T {us}–{them}', '무 {us}–{them}'],
  'v2.team.next': ['This week', '이번 주'],
  'v2.team.rankings': ['Top 25', 'Top 25'],
  'v2.team.yourRank': ['Your program: {rank}', '우리 팀: {rank}'],
  'v2.profile.title': ['Player profile', '선수 프로필'],
  'v2.profile.measure': ['{height} cm · {weight} kg', '{height}cm · {weight}kg'],
  'v2.profile.background': ['Background', '배경'],
  'v2.profile.traits': ['Personality', '성격'],
  'v2.profile.ratings': ['Ratings', '능력치'],
  'v2.profile.season': ['Season so far', '이번 시즌'],
  'v2.profile.games': [
    'Games with live snaps: {count} of {total}',
    '라이브 스냅 출전: {total}경기 중 {count}경기',
  ],
  'v2.profile.noStats': ['No live production yet.', '아직 라이브 기록이 없습니다.'],
  'v2.profile.academics': ['Academics and health', '학업과 건강'],
  'v2.profile.gpa': ['GPA {gpa}', '학점 {gpa}'],
  'v2.profile.status.eligible': ['Eligible', '출전 자격 충족'],
  'v2.profile.status.warning': ['Academic warning', '학업 경고'],
  'v2.profile.status.ineligible': ['Below the eligibility floor', '출전 기준 미달'],
  'v2.profile.nextCheck': ['Next academic check: week {week}', '다음 학업 점검: {week}주차'],
  'v2.profile.noCheck': [
    'No academic checks left this season.',
    '이번 시즌 남은 학업 점검이 없습니다.',
  ],
  'v2.profile.healthy': ['Healthy', '부상 없음'],
  'v2.acad.alert': [
    'Academic check in week {week}: GPA {gpa}. Below {floor} at the check sits you out that game. Study Hall raises GPA.',
    '{week}주차 학업 점검: 현재 학점 {gpa}. 점검 때 {floor} 미만이면 그 경기에 결장합니다. 자습으로 학점을 올릴 수 있습니다.',
  ],
  'v2.gd.academicHold': ['Academically ineligible', '학업 성적 미달로 결장'],
  'v2.post.academicHold': [
    'You missed this one on academic ineligibility.',
    '학업 성적 미달로 이번 경기에 결장했습니다.',
  ],
  'v2.stat.brand': ['Brand', '브랜드'],
  'v2.stat.gauge': ['Breakthrough', '브레이크스루'],
  'v2.inj.eyebrow': ['Pregame medical check', '경기 전 메디컬 체크'],
  'v2.inj.new': ['New injury', '새 부상'],
  'v2.inj.ongoing': ['Still recovering', '회복 중'],
  'v2.inj.weeksLeft': ['Weeks left: {count}', '남은 기간: {count}주'],
  'v2.inj.choose': [
    'The staff needs your call for Saturday.',
    '토요일 출전 여부를 결정해야 합니다.',
  ],
  'v2.inj.snapCap': ['Live snaps: up to {count}', '라이브 스냅 최대 {count}회'],
  'v2.inj.sitOut': ['Sits out Saturday', '토요일 결장'],
  'v2.inj.recoveryCredit': ['Recovery {count} week faster', '회복 기간 {count}주 단축'],
  'v2.inj.out': [
    "You're out this Saturday. You'll still work the sideline reps with the staff.",
    '이번 토요일은 결장합니다. 사이드라인에서 스태프와 함께 판단 렙은 그대로 진행합니다.',
  ],
  'v2.inj.limited': [
    "You'll play a limited package: up to {count} live snaps.",
    '제한된 패키지로 출전합니다. 라이브 스냅은 최대 {count}회입니다.',
  ],
  'v2.inj.continue': ['To Game Day', '경기일로'],
  'v2.inj.planOut': [
    '{name} — out, {count} week(s) left. Only recovery-safe work is open.',
    '{name} — 결장, {count}주 남음. 회복에 안전한 훈련만 할 수 있습니다.',
  ],
  'v2.inj.planLimited': [
    '{name} — limited, {count} week(s) left. Heavy work is off the table.',
    '{name} — 제한 출전, {count}주 남음. 고강도 훈련은 할 수 없습니다.',
  ],
  'v2.inj.restricted': ['Restricted', '제한됨'],
  'v2.risk.label': ['Injury risk', '부상 위험'],
  'v2.risk.low': ['Low', '낮음'],
  'v2.risk.elevated': ['Elevated', '주의'],
  'v2.risk.high': ['High', '높음'],
  'v2.risk.help': [
    'Pregame injury risk rises sharply as Body drops, and with heavy training.',
    '경기 전 부상 위험은 체력이 떨어질수록, 훈련 강도가 높을수록 크게 오릅니다.',
  ],
  'v2.gd.availOut': ['Out — injured', '결장 — 부상'],
  'v2.gd.availLimited': ['Limited package', '제한 출전'],
  'v2.post.satOut': [
    'You watched this one from the sideline while you heal.',
    '회복 중이라 이번 경기는 사이드라인에서 지켜봤습니다.',
  ],
  'v2.post.playedLimited': [
    'You played through it on a limited package.',
    '제한된 패키지로 부상을 안고 뛰었습니다.',
  ],
} as const satisfies Record<string, Pair>;

function screenMessages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(screen).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof screen]: string;
  };
}

export const enUSVNextWeekMessages = { ...choiceMessages(0), ...screenMessages(0) };
export const koKRVNextWeekMessages = { ...choiceMessages(1), ...screenMessages(1) };
