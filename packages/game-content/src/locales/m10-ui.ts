/** M10 release-candidate copy: save recovery. */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.save.recovered': [
    'Your latest save could not be read, so your last good save was restored.',
    '최근 저장을 읽을 수 없어 마지막 정상 저장을 복원했습니다.',
  ],
  'v2.profile.measureImperial': [
    '{feet}′{inches}″ · {pounds} lb',
    '{feet}피트 {inches}인치 · {pounds}파운드',
  ],
  'v2.look.tellsTitle': ['What you read', '읽은 단서'],
  'v2.look.noTells': [
    'No tells yet. Read how they line up on the board.',
    '아직 단서가 없습니다. 보드에서 상대의 정렬을 읽으세요.',
  ],
  'v2.look.moreTells': [
    '{count, plural, one {# more tell} other {# more tells}} with more preparation',
    '{count, plural, other {준비를 더 하면 단서 #개가 더 보입니다}}',
  ],
  'v2.look.revealTitle': ['The real look', '실제 룩'],
  'v2.look.answer': ['The answer: {decision}', '정답: {decision}'],
  'v2.look.unseen': ['Tell you did not see', '보지 못한 단서'],
  'v2.look.legendPresnap': ['Pre-snap', '스냅 전'],
  'v2.look.legendRead': ['Read from a tell', '단서로 읽은 움직임'],
  'v2.look.keysHint': ['Keys 1–3 pick a call', '숫자 키 1–3으로 선택'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM10Messages = messages(0);
export const koKRM10Messages = messages(1);
