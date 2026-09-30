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
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM10Messages = messages(0);
export const koKRM10Messages = messages(1);
