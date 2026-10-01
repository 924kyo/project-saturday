/**
 * M12 match feedback: the three-part snap explanation (read · execution · situation), the five-band
 * pregame line, the read-score scale and the post-game contribution split.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  // Part labels.
  'v2.explain.read': ['Read', '판단'],
  'v2.explain.execution': ['Execution', '수행'],
  'v2.explain.situation': ['The down', '다운 결과'],
  'v2.read.missedAmbiguous': [
    'The tells you saw also fit {look}, where your call is right. Another tell would have separated them.',
    '당신이 본 단서는 {look}에도 들어맞았고, 그 경우라면 당신의 선택이 맞습니다. 단서가 하나 더 있었다면 구분할 수 있었습니다.',
  ],
  // Execution: what happened to the athlete's own action.
  'v2.exec.qbIncomplete': ['The throw didn’t connect.', '패스가 연결되지 않았습니다.'],
  'v2.exec.qbInterception': ['A defender got to the throw first.', '수비가 먼저 공에 닿았습니다.'],
  'v2.exec.qbSack': [
    'The rush got home before the ball came out.',
    '공을 던지기 전에 러시가 먼저 도착했습니다.',
  ],
  'v2.exec.qbSackFumble': [
    'The rush got home and knocked the ball loose.',
    '러시가 들어와 공까지 떨어뜨렸습니다.',
  ],
  'v2.exec.qbRunFumble': [
    'The run gained ground, but the ball came loose.',
    '전진은 했지만 공을 놓쳤습니다.',
  ],
  'v2.exec.qbThrowaway': [
    'Throwing it away gave up the down to protect the ball: no turnover risk taken.',
    '공을 버려 이번 다운은 포기했지만, 턴오버 위험은 없앴습니다.',
  ],
  'v2.exec.rbStuffed': [
    'The hole closed before you got through.',
    '구멍이 닫혀 빠져나가지 못했습니다.',
  ],
  'v2.exec.rbFumble': ['Contact knocked the ball loose.', '접촉 순간 공을 놓쳤습니다.'],
  'v2.exec.rbCatchFumble': [
    'The catch was made, but the ball came out on contact.',
    '공은 잡았지만 태클에 공을 놓쳤습니다.',
  ],
  'v2.exec.rbProtectionMiss': ['The rusher beat your block.', '러셔가 당신의 블로킹을 뚫었습니다.'],
  'v2.exec.wrIncomplete': ['The catch point went against you.', '포구 경합에서 밀렸습니다.'],
  'v2.exec.wrDrop': [
    'The ball was there, and it came out of your hands.',
    '공은 정확히 왔지만 손에서 빠졌습니다.',
  ],
  'v2.exec.wrInterception': [
    'The defender won the catch point and took it away.',
    '수비가 포구 지점을 이겨 공을 가로챘습니다.',
  ],
  'v2.exec.wrNotTargeted': [
    'The ball went elsewhere this snap.',
    '이번 스냅에는 공이 다른 곳으로 갔습니다.',
  ],
  'v2.exec.cbStripMissed': [
    'Going for the ball loosened the wrap-up: the ball stayed in and he slipped through.',
    '공을 노리느라 태클이 느슨해졌고, 공은 빠지지 않은 채 상대가 빠져나갔습니다.',
  ],
  'v2.exec.cbStripHeld': [
    'The ball stayed in, but you still brought him down.',
    '공은 빠지지 않았지만 끝까지 잡아 쓰러뜨렸습니다.',
  ],
  'v2.exec.cbTackleMissed': [
    'You got there but couldn’t finish the tackle.',
    '도착은 했지만 태클을 마무리하지 못했습니다.',
  ],
  'v2.exec.cbCatchAllowed': [
    'The receiver made the catch in your coverage.',
    '당신이 맡은 리시버가 공을 잡았습니다.',
  ],
  'v2.exec.cbTouchdownAllowed': [
    'The catch went all the way for a score.',
    '그 캐치가 그대로 득점으로 이어졌습니다.',
  ],
  'v2.exec.defGainAllowed': [
    'The play got past your spot.',
    '플레이가 당신의 자리를 지나갔습니다.',
  ],
  'v2.exec.defMissedTackle': [
    'The aggressive angle overran the ball carrier.',
    '공격적인 각도로 들어가다 볼 캐리어를 지나쳤습니다.',
  ],
  'v2.exec.defNoPlay': ['The play went away from you.', '플레이가 반대쪽으로 갔습니다.'],
  'v2.exec.won': ['Your part came off.', '당신의 플레이는 성공했습니다.'],
  'v2.exec.chanceSuccess': [
    'This call had a {chance}% chance to come off.',
    '이 선택이 성공할 확률은 {chance}%였습니다.',
  ],
  'v2.exec.chanceRisk': [
    'The risk on this call was {chance}%.',
    '이 선택의 위험도는 {chance}%였습니다.',
  ],
  'v2.exec.attribute': [
    'Key skill here: {attribute} {rating}.',
    '여기서 중요한 능력: {attribute} {rating}.',
  ],
  // The down, from the athlete's team's point of view.
  'v2.sit.off.firstDown': [
    'First down: {yards} gained, {distance} needed.',
    '퍼스트 다운: {distance}야드가 필요했고 {yards}야드를 얻었습니다.',
  ],
  'v2.sit.off.short': [
    'Gained {yards}, but {distance} were needed: short of the first down.',
    '{yards}야드를 얻었지만 {distance}야드가 필요했습니다. 퍼스트 다운에 못 미쳤습니다.',
  ],
  'v2.sit.off.onSchedule': [
    'Gained {yards} of {distance}: the series stays on schedule.',
    '{distance}야드 중 {yards}야드를 얻어 공격 흐름을 이어 갑니다.',
  ],
  'v2.sit.off.noGain': ['No gain on the play.', '이번 플레이는 전진하지 못했습니다.'],
  'v2.sit.off.downs': [
    'Short on fourth down: the ball goes over.',
    '4번째 다운에서 모자라 공격권이 넘어갑니다.',
  ],
  'v2.sit.off.touchdown': ['Touchdown.', '터치다운.'],
  'v2.sit.off.turnover': [
    'Turnover: the ball goes the other way.',
    '턴오버: 공격권이 상대에게 넘어갑니다.',
  ],
  'v2.sit.def.firstDown': [
    'They converted: {yards} gained, {distance} needed.',
    '상대가 다운을 갱신했습니다. {distance}야드가 필요했고 {yards}야드를 얻었습니다.',
  ],
  'v2.sit.def.short': [
    'They gained {yards}, but {distance} were needed: no first down.',
    '상대는 {yards}야드를 얻었지만 {distance}야드가 필요했습니다. 퍼스트 다운은 없습니다.',
  ],
  'v2.sit.def.onSchedule': [
    'They gained {yards} of {distance}: a manageable down for them.',
    '상대가 {distance}야드 중 {yards}야드를 얻었습니다. 상대에게 무난한 다운입니다.',
  ],
  'v2.sit.def.stop': ['Stopped for no gain.', '전진 없이 막아 냈습니다.'],
  'v2.sit.def.downs': [
    'Stopped on fourth down: your offense gets the ball.',
    '4번째 다운에서 막아 내 공격권을 가져옵니다.',
  ],
  'v2.sit.def.touchdown': ['They scored.', '상대가 득점했습니다.'],
  'v2.sit.def.turnover': [
    'Takeaway: your offense gets the ball.',
    '턴오버를 만들어 공격권을 가져옵니다.',
  ],
  'v2.sit.noPlay': ['The ball went elsewhere.', '공은 다른 곳으로 갔습니다.'],
  // Pregame: five-band line and what the snaps represent.
  'v2.stakes.band.heavyFavorite': ['Heavy favorite', '압도적 우세'],
  'v2.stakes.band.favorite': ['Favored', '우세'],
  'v2.stakes.band.tossUp': ['Toss-up', '박빙'],
  'v2.stakes.band.underdog': ['Underdog', '열세'],
  'v2.stakes.band.heavyUnderdog': ['Heavy underdog', '큰 열세'],
  'v2.stakes.bandHelp': [
    'The line compares the two teams at your position’s matchup, before any snap is played.',
    '경기 전, 당신 포지션의 맞대결 기준으로 두 팀을 비교한 전망입니다.',
  ],
  'v2.gd.keyMoments': [
    'Your decisions are key moments picked from the full game; the rest of the game plays out around them.',
    '당신의 결정은 경기 전체에서 고른 핵심 장면입니다. 나머지 경기는 그 사이에 진행됩니다.',
  ],
  'v2.react.upsetUnranked': [
    'Nobody had us winning this one. We won it anyway.',
    '아무도 우리가 이길 거라 보지 않았다. 그래도 이겼다.',
  ],
  // Post-game: the read-score scale and the athlete's share of the result.
  'v2.post.gradeScale': [
    'Read grades: Sharp 90 · Solid 65 · Missed 30, averaged over your live snaps.',
    '판단 점수: 정확 90 · 무난 65 · 실수 30, 실전 스냅의 평균입니다.',
  ],
  'v2.post.contribution': [
    'On your snaps: {us} {a}, {them} {b}. Elsewhere in the game: {us} {c}, {them} {d}.',
    '당신이 뛴 스냅: {us} {a}점, {them} {b}점. 나머지 경기: {us} {c}점, {them} {d}점.',
  ],
  'v2.news.turningPointWhy': [
    'Turning point (the snap that mattered most): {play}',
    '승부처(가장 중요했던 스냅): {play}',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12MatchMessages = messages(0);
export const koKRM12MatchMessages = messages(1);
