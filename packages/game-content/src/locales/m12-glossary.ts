/** M12 glossary (UI-06): plain definitions of the game's terms, EN/KO. */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.glossary.title': ['Glossary', '용어 설명'],
  'v2.glossary.help': [
    'Plain definitions of the words the game uses. Underlined terms open their definition in place.',
    '게임에서 쓰는 용어를 쉽게 풀었습니다. 밑줄 친 용어를 누르면 그 자리에서 설명이 열립니다.',
  ],
  'v2.glossary.terms': ['Terms', '용어'],
  'v2.glossary.look.name': ['Look', '룩'],
  'v2.glossary.look.def': [
    'The defense’s (or offense’s) actual shape on a play: how players line up and what they are about to do. The look is hidden; you read it from tells.',
    '한 플레이에서 수비(또는 공격)가 실제로 갖춘 형태입니다. 선수들이 어떻게 서고 무엇을 하려는지를 말합니다. 룩은 숨겨져 있고, 단서로 읽어냅니다.',
  ],
  'v2.glossary.tell.name': ['Tell', '단서'],
  'v2.glossary.tell.def': [
    'A visible clue before the snap that hints at the look. Preparation, Football IQ and cards reveal more of them.',
    '스냅 전에 보이는 힌트로, 룩을 짐작하게 해 줍니다. 준비도, 풋볼 IQ, 카드가 더 많은 단서를 보여 줍니다.',
  ],
  'v2.glossary.read.name': ['Read', '판단'],
  'v2.glossary.read.def': [
    'Your choice for the play, judged against the hidden look: sharp, solid or missed.',
    '그 플레이에서의 선택으로, 숨겨진 룩과 비교해 날카로움·무난·실패로 평가됩니다.',
  ],
  'v2.glossary.downDistance.name': ['Down & distance', '다운과 거리'],
  'v2.glossary.downDistance.def': [
    'The offense has four tries (downs) to gain the yards to the line to gain; “3rd & 4” means third try, four yards to go.',
    '공격은 목표선까지 필요한 야드를 얻을 기회(다운)가 4번 있습니다. “3rd & 4”는 세 번째 시도에 4야드가 남았다는 뜻입니다.',
  ],
  'v2.glossary.depthChart.name': ['Depth chart', '뎁스 차트'],
  'v2.glossary.depthChart.def': [
    'The coaches’ order at your position. It weighs talent, coach trust, practice form, scheme fit and experience; changing places needs a clear margin.',
    '포지션 내 코치진의 순위입니다. 실력, 코치 신뢰, 연습 컨디션, 전술 적합도, 경험을 반영하며 순위를 바꾸려면 확실한 차이가 필요합니다.',
  ],
  'v2.glossary.coachTrust.name': ['Coach trust', '코치 신뢰'],
  'v2.glossary.coachTrust.def': [
    'How much your position coach relies on you. Practice grades and game grades move it; it is part of the depth chart.',
    '포지션 코치가 당신을 얼마나 믿는지입니다. 연습·경기 평가로 오르내리며 뎁스 차트의 한 요소입니다.',
  ],
  'v2.glossary.preparation.name': ['Preparation', '준비도'],
  'v2.glossary.preparation.def': [
    'How ready you are for this week’s opponent. It feeds the tells you see and how well your action comes off; it is condition, not a rating.',
    '이번 주 상대에 대한 준비 정도입니다. 보이는 단서와 동작의 성공에 영향을 주며, 능력치가 아니라 컨디션입니다.',
  ],
  'v2.glossary.overall.name': ['Overall (OVR)', '종합 (OVR)'],
  'v2.glossary.overall.def': [
    'The coaches’ talent score for your position: ratings weighted by what the position needs, not an average.',
    '포지션 기준 코치진의 실력 평가입니다. 평균이 아니라 포지션이 중시하는 능력치에 가중치를 둡니다.',
  ],
  'v2.glossary.potential.name': ['Potential', '잠재력'],
  'v2.glossary.potential.def': [
    'How fast you grow each season, set by your recruiting background (and your program’s development).',
    '시즌마다 얼마나 빠르게 성장하는지로, 리크루팅 배경(과 학교의 육성 수준)이 정합니다.',
  ],
  'v2.glossary.schemeFit.name': ['Scheme fit', '전술 적합도'],
  'v2.glossary.schemeFit.def': [
    'How well your style suits your program’s scheme. It is one part of the depth chart.',
    '내 스타일이 팀 전술에 얼마나 맞는지입니다. 뎁스 차트의 한 요소입니다.',
  ],
  'v2.glossary.insight.name': ['Insight', '인사이트'],
  'v2.glossary.insight.def': [
    'A card currency you earn (never buy): craft cards, try a Scouting Draw, or master cards.',
    '획득으로만 얻는 카드 재화입니다. 카드 제작, 스카우팅 드로우, 카드 숙련에 씁니다.',
  ],
  'v2.glossary.mastery.name': ['Mastery', '숙련'],
  'v2.glossary.mastery.def': [
    'A card’s level: higher levels make its effects stronger, within each effect’s limit.',
    '카드의 단계입니다. 단계가 높을수록 효과가 강해지며 각 효과의 상한을 넘지 않습니다.',
  ],
  'v2.glossary.gauge.name': ['Breakthrough gauge', '브레이크스루 게이지'],
  'v2.glossary.gauge.def': [
    'Fills from practice and some events; a full gauge offers a new card.',
    '연습과 일부 이벤트로 차오르며, 가득 차면 새 카드를 고를 수 있습니다.',
  ],
  'v2.glossary.nil.name': ['NIL', 'NIL'],
  'v2.glossary.nil.def': [
    'Name, image and likeness: deals that pay you for your brand, with an obligation that costs practice time.',
    '이름·이미지·초상권 계약입니다. 브랜드 가치로 수입을 얻지만 연습 시간을 쓰는 의무가 따릅니다.',
  ],
  'v2.glossary.portal.name': ['Transfer portal', '이적 포털'],
  'v2.glossary.portal.def': [
    'Where players move between schools in the offseason. Your market value decides which schools call.',
    '오프시즌에 선수가 학교를 옮기는 창구입니다. 시장 가치가 어떤 학교가 연락할지를 정합니다.',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12GlossaryMessages = messages(0);
export const koKRM12GlossaryMessages = messages(1);
