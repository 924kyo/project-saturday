/** Playtest round 1 copy: creation, training, growth, reads, post-game, settings, profile. */
type Pair = readonly [en: string, ko: string];

const rows = {
  // Creation: nothing is chosen for the player.
  'v2.create.namePlaceholder': ['Type a name', '이름을 입력하세요'],
  'v2.create.suggestName': ['Suggest a name', '이름 추천'],
  'v2.create.suggestHelp': [
    'A suggested name follows the language setting.',
    '추천 이름은 언어 설정을 따라 바뀝니다.',
  ],
  'v2.create.roleHint': ['Pick a position and a play style.', '포지션과 플레이 스타일을 고르세요.'],
  'v2.create.storyHint': [
    'Pick a recruiting background and two traits.',
    '리크루팅 배경과 성격 두 가지를 고르세요.',
  ],
  'v2.create.nameHint': ['Give your athlete a name.', '선수 이름을 정하세요.'],
  // Save slots.
  'v2.slots.open': ['Saves', '저장 슬롯'],
  'v2.slots.eyebrow': ['Careers', '커리어'],
  'v2.slots.title': ['Saved careers', '저장된 커리어'],
  'v2.slots.help': [
    'Every decision saves automatically. Start another career in an empty slot and come back to this one any time.',
    '모든 결정은 자동으로 저장됩니다. 빈 슬롯에서 다른 커리어를 시작하고, 언제든 이 커리어로 돌아올 수 있습니다.',
  ],
  'v2.slots.empty': ['Empty slot', '빈 슬롯'],
  'v2.slots.corrupt': ['This save can’t be read.', '이 저장은 읽을 수 없습니다.'],
  'v2.slots.resume': ['Resume', '이어하기'],
  'v2.slots.playing': ['Playing now', '진행 중'],
  'v2.slots.newHere': ['New career', '새 커리어'],
  'v2.slots.delete': ['Delete', '삭제'],
  'v2.slots.confirmDelete': [
    'Delete this career for good? This can’t be undone.',
    '이 커리어를 영구히 삭제할까요? 되돌릴 수 없습니다.',
  ],
  'v2.slots.confirmDeleteAction': ['Delete career', '커리어 삭제'],
  'v2.slots.progress': [
    '{program} · Season {season}, week {week}',
    '{program} · {season}시즌 {week}주차',
  ],
  'v2.slots.recruiting': ['Choosing a school', '학교 선택 중'],
  'v2.slots.complete': ['Career complete', '커리어 종료'],
  'v2.slots.saved': ['Saved {when}', '저장: {when}'],
  'v2.slots.recovered': ['restored from backup', '백업에서 복원됨'],
  'v2.slots.full': [
    'Every slot holds a career. Delete one to start another.',
    '모든 슬롯이 사용 중입니다. 새로 시작하려면 커리어 하나를 삭제하세요.',
  ],
  'v2.slots.close': ['Back to the game', '게임으로 돌아가기'],
  // Settings.
  'v2.settings.open': ['Settings', '설정'],
  'v2.settings.title': ['Settings', '설정'],
  'v2.settings.units': ['Height and weight', '키와 몸무게 단위'],
  'v2.settings.metric': ['Metric (cm, kg)', '미터법 (cm, kg)'],
  'v2.settings.imperial': ['Imperial (ft, lb)', '야드파운드법 (ft, lb)'],
  'v2.settings.playReview': ['Play Review', '플레이 리뷰'],
  'v2.settings.playReviewHelp': [
    'After each snap, show the real look and the best read. After each game, review every snap.',
    '스냅이 끝날 때마다 실제 룩과 최선의 판단을 보여 주고, 경기가 끝나면 모든 스냅을 되돌아봅니다.',
  ],
  'v2.settings.close': ['Done', '완료'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12Messages = messages(0);
export const koKRM12Messages = messages(1);
