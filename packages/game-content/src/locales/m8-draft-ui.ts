/** M8 Pro Draft copy (fictional pro framing): stock bands, declaration and endings. */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.draft.stock': ['Pro Draft projection', '프로 드래프트 예상'],
  'v2.draft.band.round1': ['First round', '1라운드'],
  'v2.draft.band.rounds2to3': ['Rounds 2–3', '2~3라운드'],
  'v2.draft.band.rounds4to7': ['Rounds 4–7', '4~7라운드'],
  'v2.draft.band.undrafted': ['Likely undrafted', '지명 가능성 낮음'],
  'v2.draft.stockHelp': [
    'Scouts weigh ability, production, program exposure, starts, big games and health. A projection is a range, not a promise.',
    '스카우트는 기량, 경기력, 소속 팀의 주목도, 선발 경험, 큰 경기, 건강을 함께 봅니다. 예상은 범위일 뿐 약속이 아닙니다.',
  ],
  'v2.draft.factors': [
    'Ability {ability} · Production {production} · Exposure {exposure} · Experience {experience} · Big games {bigGames}',
    '기량 {ability} · 경기력 {production} · 주목도 {exposure} · 경험 {experience} · 큰 경기 {bigGames}',
  ],
  'v2.draft.declare': ['Declare for the Pro Draft', '프로 드래프트 참가 선언'],
  'v2.draft.declareHelp': [
    'Your college career ends here and you enter the draft. Projection: {band}.',
    '대학 커리어를 여기서 마치고 드래프트에 나섭니다. 예상: {band}.',
  ],
  'v2.draft.declareConfirm': [
    'Declare now? You leave college football and cannot come back.',
    '지금 선언할까요? 대학 풋볼을 떠나며 되돌릴 수 없습니다.',
  ],
  'v2.draft.declareYes': ['Declare', '선언합니다'],
  'v2.draft.drafted': [
    'Pro Draft: round {round}, pick {pick}',
    '프로 드래프트: {round}라운드 전체 {pick}순위',
  ],
  'v2.draft.undrafted': ['Pro Draft: undrafted', '프로 드래프트: 지명되지 않음'],
  'v2.draft.ending.graduated': ['Played all four years', '4년을 모두 뛰었다'],
  'v2.draft.ending.declared': ['Declared early', '조기 드래프트 선언'],
  'v2.draft.ending.retired': ['Stepped away from football', '풋볼을 떠났다'],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSDraftUiMessages = messages(0);
export const koKRDraftUiMessages = messages(1);
