/**
 * M12 relationships and narrative copy (Phase 6): story beats and their choices, the cast,
 * reputation tones, year goals, contributor honors and scheme explanations. Beat text may name
 * {rival}, {coach}, {captain}, {reporter} and {previous} (the program left behind).
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  // Season opener (background variants, CRE-04).
  'v2.story.seasonOpener.title': ['First day on campus', '캠퍼스 첫날'],
  'v2.story.seasonOpener.body': [
    'Coach {coach} hands you a playbook as thick as a phone book. {captain}, the team captain, finds you in the locker room. {rival} is already stretching on the next stall.',
    '{coach} 코치가 전화번호부만큼 두꺼운 플레이북을 건넵니다. 주장 {captain} 선수가 라커룸에서 당신을 찾아오고, 옆자리에서는 {rival} 선수가 벌써 몸을 풀고 있습니다.',
  ],
  'v2.story.seasonOpener.variant.blueChipStar': [
    'Everyone already knows your name from the recruiting sites. Coach {coach} tells you the stars mean nothing here until you earn them again. {rival} watches you warm up and does not say a word.',
    '모두가 리크루팅 사이트에서 당신 이름을 이미 압니다. {coach} 코치는 여기서는 별점이 아무 의미 없다며 다시 증명하라고 말합니다. {rival} 선수는 몸 푸는 당신을 말없이 지켜봅니다.',
  ],
  'v2.story.seasonOpener.variant.lateBloomer': [
    'Two years ago nobody recruited you. Coach {coach} says the late growth spurt is why you are here, and the next one is up to you. {rival} has been on campus a year longer.',
    '2년 전만 해도 아무도 당신을 찾지 않았습니다. {coach} 코치는 늦게 찾아온 성장이 당신을 여기로 데려왔고, 다음 성장은 당신에게 달렸다고 말합니다. {rival} 선수는 캠퍼스에 1년 먼저 왔습니다.',
  ],
  'v2.story.seasonOpener.variant.smallTownStar': [
    'Your hometown paper ran your signing on the front page. Here, nobody has heard of it. Coach {coach} gives you a locker in the back row, next to {rival}.',
    '고향 신문은 당신의 입단을 1면에 실었습니다. 여기서는 아무도 그 소식을 모릅니다. {coach} 코치는 맨 뒷줄, {rival} 선수 옆 라커를 배정합니다.',
  ],
  'v2.story.seasonOpener.variant.legacyRecruit': [
    'Your family name is on the wall outside the weight room. Coach {coach} says he coached the name once and now he coaches you. {rival} has heard all about it.',
    '웨이트룸 앞 벽에 당신 가문의 이름이 걸려 있습니다. {coach} 코치는 그 이름을 지도한 적이 있지만 이제는 당신을 지도한다고 말합니다. {rival} 선수도 그 이야기를 다 들었습니다.',
  ],
  'v2.story.seasonOpener.variant.underRecruitedAthlete': [
    'You remember every school that passed on you. Coach {coach} says the list is fuel, as long as it does not become an excuse. {rival} was ranked ahead of you out of high school.',
    '당신을 외면한 학교를 하나도 잊지 않았습니다. {coach} 코치는 그 목록이 변명이 되지만 않는다면 연료가 된다고 말합니다. {rival} 선수는 고교 시절 랭킹에서 당신보다 위였습니다.',
  ],
  'v2.story.seasonOpener.choice.setTheTone': [
    'Introduce yourself to {captain} and the vets',
    '{captain} 선수와 선배들에게 먼저 인사한다',
  ],
  'v2.story.seasonOpener.choice.quietWork': [
    'Put your head down and learn the playbook',
    '묵묵히 플레이북부터 익힌다',
  ],
  'v2.story.seasonOpener.choice.callHome': [
    'Call home before the first practice',
    '첫 연습 전에 집에 전화한다',
  ],
  'v2.story.seasonOpener.choice.carryTheName': [
    'Give the campus reporter a quote',
    '캠퍼스 기자에게 한마디 남긴다',
  ],
  'v2.story.seasonOpener.choice.proveTheGrowth': [
    'Stay late with the strength staff',
    '트레이닝 코치와 늦게까지 남는다',
  ],
  'v2.story.seasonOpener.choice.markTheRival': [
    'Let {rival} know you are coming for the spot',
    '{rival} 선수에게 자리를 노리겠다고 알린다',
  ],
  // Depth beats (REL-02, memory: vow, fiery interview).
  'v2.story.rivalPassedYou.title': ['{rival} takes your spot', '{rival} 선수가 자리를 가져가다'],
  'v2.story.rivalPassedYou.body': [
    'The new depth chart is taped to the meeting-room door. {rival} is above you now. Coach {coach} says it is about this week, not forever.',
    '미팅룸 문에 새 뎁스 차트가 붙었습니다. 이제 {rival} 선수가 당신 위에 있습니다. {coach} 코치는 이번 주의 결과일 뿐 영원한 건 아니라고 말합니다.',
  ],
  'v2.story.rivalPassedYou.variant.fiery': [
    'The new depth chart is taped to the meeting-room door, right next to a clipping of your last interview. {rival} is above you now, and somebody underlined your quote.',
    '미팅룸 문에 새 뎁스 차트가 붙었고, 그 옆에 당신의 지난 인터뷰 기사가 붙어 있습니다. 이제 {rival} 선수가 당신 위에 있고, 누군가 당신의 발언에 밑줄을 쳐 두었습니다.',
  ],
  'v2.story.rivalPassedYou.choice.congratulate': [
    'Congratulate {rival}',
    '{rival} 선수를 축하한다',
  ],
  'v2.story.rivalPassedYou.choice.askTheCoach': [
    'Ask Coach {coach} what to fix',
    '{coach} 코치에게 무엇을 고칠지 묻는다',
  ],
  'v2.story.rivalPassedYou.choice.vowToTakeItBack': [
    'Vow to take it back',
    '반드시 되찾겠다고 다짐한다',
  ],
  'v2.story.rivalPassedYou.choice.extraReps': [
    'Ask for extra reps after practice',
    '연습 후 추가 훈련을 자청한다',
  ],
  'v2.story.youPassedRival.title': ['You pass {rival}', '{rival} 선수를 넘어서다'],
  'v2.story.youPassedRival.body': [
    'Your name moved up the chart this morning. {rival} saw it first and walked out of the meeting room without a word.',
    '오늘 아침 뎁스 차트에서 당신의 이름이 올라갔습니다. 먼저 확인한 {rival} 선수는 말없이 미팅룸을 나갔습니다.',
  ],
  'v2.story.youPassedRival.variant.vow': [
    'You said you would take it back, and you did. Your name is above {rival} again. Coach {coach} remembers you said it.',
    '되찾겠다고 했고, 해냈습니다. 당신의 이름이 다시 {rival} 선수 위에 있습니다. {coach} 코치도 그 말을 기억합니다.',
  ],
  'v2.story.youPassedRival.variant.fiery': [
    'Your name moved above {rival}, and the reporters who printed your last quote are already asking about it.',
    '당신의 이름이 {rival} 선수 위로 올라갔고, 지난번 발언을 실은 기자들이 벌써 그 얘기를 묻습니다.',
  ],
  'v2.story.youPassedRival.choice.stayHumble': ['Keep it quiet', '조용히 넘어간다'],
  'v2.story.youPassedRival.choice.talkItUp': [
    'Tell the reporter you earned it',
    '기자에게 당연한 결과라고 말한다',
  ],
  'v2.story.youPassedRival.choice.liftHimUp': [
    'Find {rival} and work through film together',
    '{rival} 선수를 찾아가 함께 필름을 본다',
  ],
  'v2.story.defendSpot.title': ['Defend the spot', '자리를 지켜라'],
  'v2.story.defendSpot.body': [
    '{rival} is closing on you in practice. Coach {coach} has not said anything, which says plenty.',
    '{rival} 선수가 연습에서 당신을 바짝 추격하고 있습니다. {coach} 코치가 아무 말도 하지 않는다는 것 자체가 많은 걸 말해 줍니다.',
  ],
  'v2.story.defendSpot.choice.extraFilm': [
    'Stay late in the film room',
    '필름룸에 늦게까지 남는다',
  ],
  'v2.story.defendSpot.choice.leanOnTheCoach': [
    'Ask Coach {coach} for a plan',
    '{coach} 코치에게 계획을 묻는다',
  ],
  'v2.story.defendSpot.choice.mentorTheBackup': [
    'Help {rival} get better anyway',
    '그래도 {rival} 선수의 성장을 돕는다',
  ],
  // Interview (REL-04).
  'v2.story.interview.title': ['{reporter} wants a word', '{reporter} 기자의 인터뷰 요청'],
  'v2.story.interview.body': [
    '{reporter} from the campus paper catches you outside the locker room.',
    '캠퍼스 신문의 {reporter} 기자가 라커룸 앞에서 당신을 붙잡습니다.',
  ],
  'v2.story.interview.variant.bigGame': [
    '{reporter} from the campus paper catches you after the best game of your season. What do you want people to hear?',
    '시즌 최고의 경기를 마친 당신을 캠퍼스 신문의 {reporter} 기자가 붙잡습니다. 사람들에게 무엇을 들려주고 싶나요?',
  ],
  'v2.story.interview.variant.toughLoss': [
    'After a lopsided loss, {reporter} from the campus paper asks what went wrong.',
    '크게 진 경기 후, 캠퍼스 신문의 {reporter} 기자가 무엇이 잘못됐는지 묻습니다.',
  ],
  'v2.story.interview.variant.upsetWin': [
    'Nobody picked you to win that one. {reporter} from the campus paper wants to know how it felt.',
    '아무도 이길 거라 예상하지 않은 경기였습니다. 캠퍼스 신문의 {reporter} 기자가 소감을 묻습니다.',
  ],
  'v2.story.interview.choice.toneConfident': [
    'Confident: “We expected this.”',
    '자신감: “당연한 결과입니다.”',
  ],
  'v2.story.interview.choice.toneHumble': [
    'Humble: credit the team and the coaches',
    '겸손: 팀과 코치진에게 공을 돌린다',
  ],
  'v2.story.interview.choice.toneFiery': [
    'Fiery: say what you really think',
    '도발: 하고 싶은 말을 다 한다',
  ],
  // Captain vote.
  'v2.story.captainVote.title': ['Captain vote', '주장 투표'],
  'v2.story.captainVote.body': [
    'The team votes for captains before camp ends.',
    '캠프가 끝나기 전 팀이 주장을 뽑습니다.',
  ],
  'v2.story.captainVote.variant.elected': [
    'The team votes for captains before camp ends. Your teammates chose you. {captain} hands you the C.',
    '캠프가 끝나기 전 팀이 주장을 뽑았습니다. 동료들이 당신을 선택했습니다. {captain} 선수가 C 마크를 건넵니다.',
  ],
  'v2.story.captainVote.variant.notElected': [
    'The team votes for captains before camp ends. {captain} keeps the C this year.',
    '캠프가 끝나기 전 팀이 주장을 뽑았습니다. 올해도 {captain} 선수가 주장을 맡습니다.',
  ],
  'v2.story.captainVote.choice.acceptTheC': ['Accept the captaincy', '주장을 맡는다'],
  'v2.story.captainVote.choice.shareTheC': [
    'Ask {captain} to lead it with you',
    '{captain} 선수에게 함께 이끌자고 한다',
  ],
  'v2.story.captainVote.choice.backTheCaptain': [
    'Back {captain} publicly',
    '공개적으로 {captain} 선수를 지지한다',
  ],
  'v2.story.captainVote.choice.leadByExample': ['Lead by example instead', '행동으로 이끈다'],
  // Mentoring a freshman.
  'v2.story.mentorFreshman.title': ['A freshman needs help', '도움이 필요한 신입생'],
  'v2.story.mentorFreshman.body': [
    'A freshman in your room is lost in the playbook. Coach {coach} asks if you can spare an hour a week.',
    '같은 포지션 신입생이 플레이북에서 헤매고 있습니다. {coach} 코치가 일주일에 한 시간만 내줄 수 있겠냐고 묻습니다.',
  ],
  'v2.story.mentorFreshman.choice.takeHimUnderYourWing': [
    'Take him under your wing',
    '데리고 가르친다',
  ],
  'v2.story.mentorFreshman.choice.mentorNaturally': [
    'Bring him into your film sessions',
    '내 필름 세션에 함께 데려간다',
  ],
  'v2.story.mentorFreshman.choice.ownWorkFirst': [
    'Your own work comes first this year',
    '올해는 내 훈련이 먼저다',
  ],
  // Transfer and stay (REC-04).
  'v2.story.freshStart.title': ['A fresh start', '새로운 출발'],
  'v2.story.freshStart.body': [
    'New city, new playbook. Coach {coach} shakes your hand and says your old tape got you in the door, nothing more.',
    '새 도시, 새 플레이북. {coach} 코치는 악수를 건네며 예전 영상이 문을 열어 줬을 뿐 그 이상은 아니라고 말합니다.',
  ],
  'v2.story.freshStart.variant.farewell': [
    'Your old teammates at {previous} sent you off with a group text. Here, Coach {coach} shakes your hand and says your old tape got you in the door, nothing more.',
    '{previous}의 옛 동료들이 단체 메시지로 배웅해 주었습니다. 이곳의 {coach} 코치는 악수를 건네며 예전 영상이 문을 열어 줬을 뿐 그 이상은 아니라고 말합니다.',
  ],
  'v2.story.freshStart.choice.earnTheirTrust': [
    'Outwork everyone in the first week',
    '첫 주부터 누구보다 열심히 한다',
  ],
  'v2.story.freshStart.choice.learnThePlaybook': [
    'Live in the playbook until it clicks',
    '익숙해질 때까지 플레이북에 파묻힌다',
  ],
  'v2.story.freshStart.choice.winTheRoom': [
    'Get to know the locker room',
    '라커룸 동료들과 먼저 친해진다',
  ],
  'v2.story.loyalty.title': ['You stayed', '잔류를 택하다'],
  'v2.story.loyalty.body': [
    'Coach {coach} stops you in the hallway: plenty of players left this offseason, and he noticed you did not.',
    '{coach} 코치가 복도에서 당신을 불러 세웁니다. 이번 오프시즌에 많은 선수가 떠났지만 당신은 남았다는 걸 알고 있다고 합니다.',
  ],
  'v2.story.loyalty.choice.recommit': ['Tell him you are all in', '모든 걸 걸겠다고 말한다'],
  'v2.story.loyalty.choice.raiseTheBar': [
    'Tell him you want more this year',
    '올해는 더 많은 걸 원한다고 말한다',
  ],
  // Scene chrome and outcomes.
  'v2.story.eyebrow': ['Your story', '나의 이야기'],
  'v2.story.relationship': ['{name} {delta}', '{name} {delta}'],
  'v2.story.lockerRoom': ['Locker room {delta}', '라커룸 {delta}'],
  'v2.story.tone': ['Reputation: {tone}', '평판: {tone}'],
  'v2.story.memory.vow': [
    'You kept your vow: confidence +{value}',
    '다짐을 지켰습니다: 자신감 +{value}',
  ],
  'v2.tone.confident': ['confident', '자신감'],
  'v2.tone.humble': ['humble', '겸손'],
  'v2.tone.fiery': ['fiery', '도발적'],
  // The cast (REL-01).
  'v2.cast.title': ['Your people', '나의 사람들'],
  'v2.cast.role.rival': ['Depth rival', '뎁스 라이벌'],
  'v2.cast.role.coach': ['Position coach', '포지션 코치'],
  'v2.cast.role.captain': ['Team captain', '팀 주장'],
  'v2.cast.role.reporter': ['Campus reporter', '캠퍼스 기자'],
  'v2.cast.value': ['Relationship {value}', '관계 {value}'],
  'v2.cast.last': ['Last: {delta} ({beat})', '최근: {delta} ({beat})'],
  'v2.cast.toneLine': [
    'Your reputation in the press: {tone}. It shifts how often NIL deals call (+{chance}‰ a week).',
    '언론에서의 평판: {tone}. NIL 제안 빈도가 달라집니다 (주당 +{chance}‰).',
  ],
  'v2.cast.noTone': [
    'No interviews yet: the press has no read on you.',
    '아직 인터뷰가 없어 언론의 평가가 없습니다.',
  ],
  // Year goals (REL-03) and honors (CAR-05).
  'v2.goal.title': ['This year’s goal', '올해의 목표'],
  'v2.goal.earnRole': [
    'Freshman goal: earn a role (finish the season in the top two on the depth chart).',
    '1학년 목표: 역할 확보 (시즌 종료 시 뎁스 차트 2위 이내).',
  ],
  'v2.goal.keyPlayer': [
    'Sophomore goal: become a key player (finish as the starter, or play {snaps}+ live snaps).',
    '2학년 목표: 핵심 선수 (시즌 종료 시 주전, 또는 실시간 스냅 {snaps}회 이상).',
  ],
  'v2.goal.contender': [
    'Junior goal: contend (reach the bracket, or earn an honor).',
    '3학년 목표: 우승 경쟁 (포스트시즌 진출 또는 수상).',
  ],
  'v2.goal.seniorLegacy': [
    'Senior goal: leave a legacy (a semifinal or better, an honor, or a draftable stock).',
    '4학년 목표: 유산 남기기 (4강 이상, 수상, 또는 드래프트 가능한 평가).',
  ],
  'v2.goal.progress.role': [
    'Now: {role}, {snaps} live snaps this season.',
    '현재: {role}, 이번 시즌 실시간 스냅 {snaps}회.',
  ],
  'v2.goal.met': ['Goal met', '목표 달성'],
  'v2.goal.missed': ['Goal missed', '목표 미달성'],
  'v2.honor.captain': ['Team captain', '팀 주장'],
  'v2.honor.mostImproved': ['Most improved', '기량 발전상'],
  // Scheme explained (REL-06).
  'v2.scheme.title': ['Your scheme', '우리 팀 전술'],
  'v2.scheme.favors.spread': [
    'Spread: option reads, quick throws and space to run.',
    '스프레드: 옵션 판단, 빠른 패스, 넓은 공간에서의 러닝.',
  ],
  'v2.scheme.favors.proStyle': [
    'Pro style: progressions, play action and possession throws.',
    '프로 스타일: 단계적 판단, 플레이 액션, 볼 점유형 패스.',
  ],
  'v2.scheme.favors.powerRun': [
    'Power run: downhill runs, gap blocking and short yardage.',
    '파워 러닝: 직선적인 러닝, 갭 블로킹, 짧은 야드 공략.',
  ],
  'v2.scheme.favors.airRaid': [
    'Air raid: vertical routes, tempo and deep shots.',
    '에어 레이드: 수직 루트, 빠른 템포, 롱패스.',
  ],
  'v2.scheme.favors.pressMan': [
    'Press man: jams at the line, single-high help and run fits in the box.',
    '프레스 맨투맨: 라인에서의 저지, 싱글 하이 지원, 박스 내 런 수비.',
  ],
  'v2.scheme.favors.zoneMatch': [
    'Zone match: pattern reading, passing off routes and contain.',
    '존 매치: 패턴 읽기, 루트 넘겨받기, 외곽 봉쇄.',
  ],
  'v2.scheme.favors.pressure': [
    'Pressure: blitzes, speed off the edge and jumping quick throws.',
    '압박 수비: 블리츠, 엣지의 스피드, 빠른 패스 가로채기.',
  ],
  'v2.scheme.fit': [
    'This scheme is {fit}: scheme fit {value} on the depth chart ({delta} from this scheme).',
    '이 전술은 {fit}: 뎁스 차트 전술 적합도 {value} (전술 보정 {delta}).',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12StoryMessages = messages(0);
export const koKRM12StoryMessages = messages(1);
