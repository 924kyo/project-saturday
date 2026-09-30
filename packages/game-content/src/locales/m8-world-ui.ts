/** M8 conference-world presentation copy: bracket rounds, finishes and conference standings. */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.gd.regulationTie': ['Tied after regulation', '정규 시간 동점'],
  'v2.gd.toOvertime': ['Go to overtime', '연장전으로'],
  'v2.post.overtime': ['Decided in overtime', '연장 끝에 승부'],
  'v2.round.firstRound': ['Playoff first round', '플레이오프 1라운드'],
  'v2.round.quarterfinal': ['Quarterfinal', '8강'],
  'v2.review.finish.quarterfinal': ['Quarterfinalist', '8강 진출'],
  'v2.review.finish.firstRound': ['Playoff first round', '플레이오프 1라운드 진출'],
  'v2.review.conferenceChampion': ['{conference} champions', '{conference} 우승'],
  'v2.team.conference': ['{conference} standings', '{conference} 순위'],
  'v2.team.conferenceRecord': [
    '{wins}-{losses}-{ties} in conference',
    '콘퍼런스 {wins}승 {losses}패 {ties}무',
  ],
  'v2.team.playoffLine': [
    'Twelve teams make the playoff: all eight conference champions and four at-large teams.',
    '플레이오프에는 12팀이 나섭니다. 8개 콘퍼런스 우승팀과 성적순 4팀입니다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSWorldUiMessages = messages(0);
export const koKRWorldUiMessages = messages(1);
