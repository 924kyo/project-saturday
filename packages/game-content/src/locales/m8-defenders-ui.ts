/**
 * M8 front-seven presentation copy: position identity, Saturday play headlines (shared by LB and
 * EDGE over the defender result vocabulary), stat labels, event exposure chips and reactions.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.position.lb.name': ['Linebacker', '라인배커'],
  'v2.position.lb.abbr': ['LB', 'LB'],
  'v2.position.lb.pitch': [
    'Read the key, fill the gap, finish every play.',
    '키를 읽고, 갭을 메우고, 모든 플레이를 끝낸다.',
  ],
  'v2.position.edge.name': ['Edge Rusher', '엣지 러셔'],
  'v2.position.edge.abbr': ['EDGE', 'EDGE'],
  'v2.position.edge.pitch': [
    'Win the corner, set the edge, hunt the quarterback.',
    '코너를 이기고, 엣지를 지키고, 쿼터백을 사냥한다.',
  ],
  'v2.evt.modExposure.lb': ['Blocks absorbed reduced {value}%', '블록 부담 {value}% 감소'],
  'v2.evt.modExposure.edge': ['Double teams reduced {value}%', '더블팀 {value}% 감소'],
  'v2.play.def.noPlay': ['The play goes away from {name}', '플레이가 {name}의 반대쪽으로 갔다'],
  'v2.play.def.stop': ['{name} makes the stop', '{name}, 확실한 저지'],
  'v2.play.def.loss': ['{name} drops him for a {yards}-yard loss', '{name}, {yards}야드 손실 태클'],
  'v2.play.def.sack': ['Sack! {name} gets home', '색! {name}이(가) 쿼터백을 쓰러뜨렸다'],
  'v2.play.def.pressure': ['{name} forces a hurried throw', '{name}의 압박에 서두른 패스'],
  'v2.play.def.passDefended': ['{name} gets a hand on it', '{name}, 패스를 쳐냈다'],
  'v2.play.def.interception': [
    'Picked! {name} takes it away',
    '가로채기! {name}이(가) 공을 빼앗았다',
  ],
  'v2.play.def.forcedFumble': [
    'Ball out! {name} forces the fumble',
    '공이 빠졌다! {name}의 펌블 유도',
  ],
  'v2.play.def.gainAllowed': ['{yards}-yard gain allowed', '{yards}야드 전진 허용'],
  'v2.play.def.missedTackle': ['{name} misses the tackle', '{name}, 태클 실패'],
  'v2.stats.tfl': ['TFL', '손실 태클'],
  'v2.stats.sacks': ['Sacks', '색'],
  'v2.stats.pressures': ['Pressures', '압박'],
  'v2.stats.forcedFumbles': ['Forced fumbles', '펌블 유도'],
  'v2.stats.missedTackles': ['Missed tackles', '태클 실패'],
  'v2.react.sack': [
    'Sack! The student section is still chanting the number.',
    '색! 학생석이 아직도 등번호를 외치고 있다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSDefenderUiMessages = messages(0);
export const koKRDefenderUiMessages = messages(1);
