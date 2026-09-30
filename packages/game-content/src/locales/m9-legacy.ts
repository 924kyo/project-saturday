/** M9 legacy copy: mentors, program familiarity, the record book and alumni cameos. */
type Pair = readonly [en: string, ko: string];

const rows = {
  'm9Legacy.event.mentor.name': ['{name} Checks In', '{name}의 방문'],
  'm9Legacy.event.mentor.description': [
    '{name}, who once played here, stops by the facility with a few lessons from their own Saturdays.',
    '이곳에서 뛰었던 {name}이(가) 시설에 들러 자신의 토요일에서 얻은 교훈을 들려준다.',
  ],
  'v2.evt.legacyMentor.commit': ['Take the advice to heart', '조언을 새겨듣는다'],
  'v2.evt.legacyMentor.protect': [
    'Thank them and trust your own way',
    '고마워하고 내 방식을 믿는다',
  ],
  'v2.legacy.title': ['Your legacy', '나의 유산'],
  'v2.legacy.familiar': ['Alumni here: {names}', '이곳 출신 동문: {names}'],
  'v2.record.title': ['Record Book', '기록실'],
  'v2.record.empty': [
    'Finish a career to open the record book.',
    '커리어를 마치면 기록실이 열립니다.',
  ],
  'v2.record.championships': ['Most national titles', '최다 전국 우승'],
  'v2.record.conferenceTitles': ['Most conference titles', '최다 콘퍼런스 우승'],
  'v2.record.awards': ['Most awards', '최다 수상'],
  'v2.record.bestPick': ['Highest Pro Draft pick', '최고 프로 드래프트 순위'],
  'v2.record.wins': ['Most career wins', '통산 최다 승'],
  'v2.record.liveGames': ['Most games with live snaps', '최다 라이브 스냅 출전'],
  'v2.record.stat': ['Career {stat}', '통산 {stat}'],
  'v2.record.pick': ['#{value}', '전체 {value}순위'],
  'v2.react.alumniProud': [
    '{name} texted the room after the win: “That’s how it’s done here.”',
    '{name}이(가) 승리 후 팀에 메시지를 보냈다. “여기선 그렇게 하는 거야.”',
  ],
  'v2.react.alumniRival': [
    'Beating {name}’s old program always tastes a little sweeter.',
    '{name}의 옛 팀을 이기는 건 언제나 조금 더 달콤하다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSLegacyMessages = messages(0);
export const koKRLegacyMessages = messages(1);
