/** M9 fictional season awards and legacy copy (original award names; no real trophies). */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.awards.title': ['Awards', '수상'],
  'v2.awards.none': ['No awards this season.', '이번 시즌 수상 없음.'],
  'v2.awards.help': [
    'Awards come from the staff’s grades, your starts and your team’s results.',
    '수상은 코치진의 평가, 선발 출전, 팀 성적으로 결정된다.',
  ],
  'v2.award.positionQb': ['Golden Signal Award', '골든 시그널 상'],
  'v2.award.positionRb': ['Iron Rail Award', '아이언 레일 상'],
  'v2.award.positionWr': ['Silk Hands Award', '실크 핸즈 상'],
  'v2.award.positionCb': ['Island Award', '아일랜드 상'],
  'v2.award.positionLb': ['Heart of the Defense Award', '수비의 심장 상'],
  'v2.award.positionEdge': ['Corner Hunter Award', '코너 헌터 상'],
  'v2.award.conferencePlayerOfYear': ['Conference Player of the Year', '콘퍼런스 올해의 선수'],
  'v2.award.allAmerican': ['All-American', '올아메리칸'],
  'v2.award.allConferenceFirst': ['All-Conference First Team', '올콘퍼런스 퍼스트 팀'],
  'v2.award.allConferenceSecond': ['All-Conference Second Team', '올콘퍼런스 세컨드 팀'],
  'v2.award.freshmanAllAmerican': ['Freshman All-American', '신입생 올아메리칸'],
  'v2.award.titleGameMvp': ['Title Game MVP', '결승전 MVP'],
  'v2.alumni.awards': [
    '{count, plural, one {# award} other {# awards}}',
    '{count, plural, other {수상 #회}}',
  ],
  'v2.alumni.conferenceTitles': [
    '{count, plural, one {# conference title} other {# conference titles}}',
    '{count, plural, other {콘퍼런스 우승 #회}}',
  ],
  'v2.draft.awardsFactor': ['Awards credit +{value}', '수상 가산점 +{value}'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSAwardMessages = messages(0);
export const koKRAwardMessages = messages(1);
