type Pair = readonly [english: string, korean: string];
type Entry = readonly [slug: string, name: Pair, description: Pair];

const families: readonly Entry[] = [
  [
    'pre.snap',
    ['Pre-snap command', '스냅 전 지휘'],
    [
      'Identify the structure and set the offense before the snap.',
      '수비 구조를 파악하고 스냅 전에 공격을 정돈합니다.',
    ],
  ],
  [
    'pocket',
    ['Pocket response', '포켓 대응'],
    [
      'Manage pressure without losing the shape of the play.',
      '플레이의 형태를 잃지 않으면서 압박에 대응합니다.',
    ],
  ],
  [
    'throw',
    ['Throw decision', '패스 판단'],
    [
      'Balance a safe outlet against a harder, more valuable window.',
      '안전한 출구와 어렵지만 가치 있는 창 사이를 판단합니다.',
    ],
  ],
  [
    'scramble',
    ['Open-field decision', '오픈필드 판단'],
    [
      'Choose when to protect yourself, chase the marker, or end the play.',
      '몸을 보호할지, 목표 지점을 노릴지, 플레이를 끝낼지 선택합니다.',
    ],
  ],
];

const decisions: readonly Entry[] = [
  [
    'confirm.shell',
    ['Confirm the shell', '셸 확인'],
    [
      'Take the underneath answer after verifying the deep structure.',
      '깊은 수비 구조를 확인한 뒤 아래쪽 해답을 택합니다.',
    ],
  ],
  [
    'redirect.protection',
    ['Redirect protection', '보호 방향 전환'],
    [
      'Move the protection toward the most credible pressure surface.',
      '가장 위협적인 압박 방향으로 보호를 전환합니다.',
    ],
  ],
  [
    'vary.cadence',
    ['Vary the cadence', '카운트 변화'],
    [
      'Test the front with rhythm changes before committing.',
      '리듬을 바꿔 프런트의 반응을 확인합니다.',
    ],
  ],
  [
    'climb.pocket',
    ['Climb the pocket', '포켓 전진'],
    [
      'Step through edge pressure while preserving the throwing lane.',
      '바깥 압박을 지나 안으로 전진하며 패스 길을 지킵니다.',
    ],
  ],
  [
    'reset.platform',
    ['Reset the platform', '플랫폼 재정렬'],
    [
      'Trade time for a balanced base and a controlled release.',
      '시간을 들여 균형 잡힌 자세와 안정적인 릴리스를 되찾습니다.',
    ],
  ],
  [
    'escape.edge',
    ['Escape the edge', '바깥 탈출'],
    [
      'Leave the pocket before the rush closes the exit.',
      '러시가 출구를 닫기 전에 포켓을 벗어납니다.',
    ],
  ],
  [
    'take.checkdown',
    ['Take the checkdown', '체크다운 선택'],
    [
      'Bank the available gain and limit turnover exposure.',
      '확실한 전진을 확보하고 턴오버 위험을 줄입니다.',
    ],
  ],
  [
    'attack.layered.window',
    ['Attack the layered window', '겹친 창 공략'],
    [
      'Drive the ball between the underneath and deep defenders.',
      '아래 수비와 깊은 수비 사이로 공을 보냅니다.',
    ],
  ],
  [
    'challenge.boundary',
    ['Challenge the boundary', '사이드라인 도전'],
    [
      'Accept a narrow margin for a larger field-position swing.',
      '더 큰 전진을 위해 좁은 성공 여지를 감수합니다.',
    ],
  ],
  [
    'slide.early',
    ['Slide early', '일찍 슬라이드'],
    ['Protect possession and Body before contact arrives.', '접촉 전에 공과 몸 상태를 보호합니다.'],
  ],
  [
    'reach.marker',
    ['Reach the marker', '목표 지점 돌파'],
    [
      'Run through the available lane for the needed yards.',
      '열린 길을 따라 필요한 야드를 노립니다.',
    ],
  ],
  [
    'extend.boundary',
    ['Extend to the boundary', '사이드라인 연장'],
    [
      'Move outside and discard the ball if the window stays closed.',
      '바깥으로 이동하고 창이 닫히면 공을 버립니다.',
    ],
  ],
];

type PatternEntry = readonly [
  slug: string,
  name: Pair,
  description: Pair,
  clues: { readonly clues: readonly [Pair, Pair, Pair] },
];

const patterns: readonly PatternEntry[] = [
  [
    'split.safety.alert',
    ['Split-safety alert', '분리 세이프티 경보'],
    [
      'The deep shell hides which underneath defender will widen.',
      '깊은 셸이 어느 아래 수비가 넓어질지 감춥니다.',
    ],
    {
      clues: [
        ['Both safeties hold depth.', '두 세이프티가 깊이를 유지한다.'],
        ['The nickel defender shades inside.', '니켈 수비가 안쪽을 향한다.'],
        ['The back has leverage underneath.', '백이 아래쪽 레버리지를 확보한다.'],
      ],
    },
  ] as never,
  [
    'pressure.surface',
    ['Pressure surface', '압박 표면'],
    [
      'The front threatens more rushers than the protection can account for.',
      '프런트가 보호 인원보다 많은 러셔를 위협합니다.',
    ],
    {
      clues: [
        ['The boundary linebacker creeps forward.', '바운더리 라인배커가 전진한다.'],
        ['The interior tackle lightens his stance.', '인테리어 태클의 스탠스가 가벼워진다.'],
        ['The slot defender watches the cadence.', '슬롯 수비가 카운트를 주시한다.'],
      ],
    },
  ] as never,
  [
    'interior.squeeze',
    ['Interior squeeze', '내부 압축'],
    [
      'The pocket compresses from the middle before routes settle.',
      '루트가 완성되기 전에 포켓 중앙이 압축됩니다.',
    ],
    {
      clues: [
        ['Both tackles keep outside width.', '양쪽 태클이 바깥 폭을 유지한다.'],
        ['The middle rusher wins low leverage.', '중앙 러셔가 낮은 레버리지를 잡는다.'],
        ['A lane forms behind the center.', '센터 뒤에 전진 통로가 생긴다.'],
      ],
    },
  ] as never,
  [
    'edge.escape',
    ['Edge escape', '에지 탈출'],
    [
      'A wide rusher bends toward the launch point.',
      '넓게 선 러셔가 패스 지점으로 휘어 들어옵니다.',
    ],
    {
      clues: [
        ['The edge defender starts outside the tackle.', '에지 수비가 태클 바깥에서 출발한다.'],
        ['The interior stays square.', '내부 수비는 정면을 유지한다.'],
        ['Open grass appears beyond the rush.', '러시 바깥에 열린 공간이 보인다.'],
      ],
    },
  ] as never,
  [
    'layered.window',
    ['Layered window', '겹친 패스 창'],
    [
      'Two coverage levels create a brief intermediate opening.',
      '두 수비 층 사이에 짧은 중거리 창이 생깁니다.',
    ],
    {
      clues: [
        ['The hook defender settles shallow.', '훅 수비가 얕게 자리 잡는다.'],
        ['The safety gains depth at the snap.', '세이프티가 스냅과 함께 깊어진다.'],
        ['The checkdown releases immediately.', '체크다운이 즉시 빠져나온다.'],
      ],
    },
  ] as never,
  [
    'boundary.match',
    ['Boundary match', '바운더리 매치'],
    [
      'A tight sideline matchup offers either a safe exit or an ambitious throw.',
      '좁은 사이드라인 매치업에서 안전한 출구와 과감한 패스가 갈립니다.',
    ],
    {
      clues: [
        ['The corner plays outside leverage.', '코너가 바깥 레버리지를 잡는다.'],
        ['The safety stays near the hash.', '세이프티가 해시 근처에 머문다.'],
        ['The receiver preserves sideline space.', '리시버가 사이드라인 공간을 남긴다.'],
      ],
    },
  ] as never,
  [
    'open.lane',
    ['Open lane', '열린 러닝 길'],
    [
      'Coverage turns away and leaves a direct lane toward the marker.',
      '커버리지가 등을 돌려 목표 지점까지 직접적인 길이 열립니다.',
    ],
    {
      clues: [
        ['The middle defender carries the route.', '중앙 수비가 루트를 따라간다.'],
        ['The rush opens beyond the guard.', '가드 바깥으로 러시가 벌어진다.'],
        ['The nearest defender has a poor angle.', '가장 가까운 수비의 각도가 좋지 않다.'],
      ],
    },
  ] as never,
  [
    'late.spy',
    ['Late spy', '늦은 스파이'],
    [
      'An apparent running lane closes when a delayed defender mirrors the quarterback.',
      '늦게 움직이는 수비가 쿼터백을 따라가며 러닝 길을 닫습니다.',
    ],
    {
      clues: [
        ['One linebacker does not gain depth.', '한 라인배커가 깊이 물러서지 않는다.'],
        ['The boundary remains available.', '사이드라인 쪽 출구는 열려 있다.'],
        ['The marker sits beyond the spy.', '목표 지점은 스파이 너머에 있다.'],
      ],
    },
  ] as never,
];

const skills: readonly Entry[] = [
  [
    'chalkboard.echo.c',
    ['Chalkboard Echo', '칠판의 메아리'],
    [
      'Reveal one additional situational clue on every key snap.',
      '모든 핵심 스냅에서 상황 단서 하나를 더 확인합니다.',
    ],
  ],
  [
    'protection.voice.b',
    ['Protection Voice', '보호 지휘'],
    [
      'Improve pre-snap decisions and earn a small grade lift through command.',
      '스냅 전 판단을 높이고 지휘력으로 평가를 조금 올립니다.',
    ],
  ],
  [
    'compact.base.c',
    ['Compact Base', '간결한 베이스'],
    [
      'Improve pocket-family execution when space collapses.',
      '공간이 좁아질 때 포켓 계열 실행력을 높입니다.',
    ],
  ],
  [
    'layered.nerve.a',
    ['Layered Nerve', '겹친 창의 담력'],
    [
      'Improve the layered-window attack while accepting extra turnover risk.',
      '겹친 창 공략을 강화하는 대신 턴오버 위험을 더 감수합니다.',
    ],
  ],
  [
    'escape.geometry.b',
    ['Escape Geometry', '탈출 기하학'],
    [
      'Add yards to scramble outcomes created by sound angles.',
      '좋은 각도로 만든 스크램블 결과에 야드를 더합니다.',
    ],
  ],
  [
    'safe.harbor.b',
    ['Safe Harbor', '안전 항구'],
    [
      'Reduce turnover risk when deliberately taking the checkdown.',
      '의도적으로 체크다운을 택할 때 턴오버 위험을 줄입니다.',
    ],
  ],
  [
    'weekly.maintenance.c',
    ['Weekly Maintenance', '주간 관리'],
    [
      'Reduce the Body cost paid after game participation.',
      '경기 참여 뒤 지불하는 몸 상태 비용을 줄입니다.',
    ],
  ],
  [
    'short.memory.b',
    ['Short Memory', '짧은 기억'],
    [
      'Reduce Confidence loss after a poor performance grade.',
      '낮은 경기 평가 뒤 자신감 하락을 줄입니다.',
    ],
  ],
  [
    'rep.compounder.a',
    ['Rep Compounder', '반복의 복리'],
    [
      'Increase attribute XP earned from key-snap work.',
      '핵심 스냅에서 얻는 능력치 XP를 늘립니다.',
    ],
  ],
  [
    'command.presence.a',
    ['Command Presence', '지휘 존재감'],
    [
      'Lift general execution and the final quarterback grade.',
      '전반적인 실행력과 최종 쿼터백 평가를 높입니다.',
    ],
  ],
  [
    'open.office.b',
    ['Open Office', '열린 미팅룸'],
    [
      'Unlock cooperative third choices in selected quarterback events.',
      '일부 쿼터백 이벤트에서 협력적인 세 번째 선택지를 엽니다.',
    ],
  ],
  [
    'shared.spotlight.s',
    ['Shared Spotlight', '함께 받는 조명'],
    [
      'Amplify positive life and football consequences from event choices.',
      '이벤트 선택의 긍정적인 생활·풋볼 결과를 강화합니다.',
    ],
  ],
];

const events: readonly Entry[] = [
  [
    'protection.meeting',
    ['Protection meeting', '보호 미팅'],
    [
      'The line asks for extra time to settle a pressure answer.',
      '라인이 압박 대응을 맞추기 위한 추가 시간을 요청합니다.',
    ],
  ],
  [
    'backup.rep.request',
    ['Backup rep request', '백업의 반복 요청'],
    [
      'A room competitor asks to share valuable throwing repetitions.',
      '포지션 경쟁자가 귀중한 패스 반복을 나누자고 합니다.',
    ],
  ],
  [
    'receiver.timing',
    ['Receiver timing', '리시버 타이밍'],
    [
      'A receiver wants an additional session to repair a timing mismatch.',
      '리시버가 어긋난 타이밍을 고치기 위한 추가 세션을 원합니다.',
    ],
  ],
  [
    'film.room.dispute',
    ['Film-room dispute', '필름룸 논쟁'],
    [
      'Two valid reads produce disagreement over the preferred answer.',
      '두 가지 타당한 리드 중 무엇이 더 나은지 의견이 갈립니다.',
    ],
  ],
  [
    'muddy.practice',
    ['Muddy practice', '진흙 훈련'],
    [
      'Bad footing turns a normal practice into a Body decision.',
      '나쁜 발판 때문에 평범한 훈련이 몸 상태 선택으로 바뀝니다.',
    ],
  ],
  [
    'campus.interview',
    ['Campus interview', '캠퍼스 인터뷰'],
    [
      'A student outlet offers attention during preparation time.',
      '학생 매체가 준비 시간 중 인터뷰를 제안합니다.',
    ],
  ],
  [
    'tutor.overlap',
    ['Tutor overlap', '튜터 일정 충돌'],
    [
      'An academic session overlaps with optional football work.',
      '학업 세션과 선택 풋볼 훈련 시간이 겹칩니다.',
    ],
  ],
  [
    'sore.throwing.arm',
    ['Sore throwing arm', '뻐근한 투구 팔'],
    [
      'Accumulated throws force a choice between recovery and preparation.',
      '누적된 투구로 회복과 준비 사이를 선택해야 합니다.',
    ],
  ],
  [
    'two.minute.challenge',
    ['Two-minute challenge', '2분 드릴 도전'],
    [
      'The staff offers a high-pressure situational period.',
      '코칭스태프가 압박이 큰 상황 훈련을 제안합니다.',
    ],
  ],
  [
    'roommate.noise',
    ['Roommate noise', '룸메이트 소음'],
    [
      'A late night threatens both sleep and next-day preparation.',
      '늦은 밤의 소음이 수면과 다음 날 준비를 위협합니다.',
    ],
  ],
  [
    'captain.message',
    ['Captain message', '주장의 메시지'],
    [
      'A captain asks you to set the tone for the offensive group.',
      '주장이 공격 그룹의 분위기를 잡아 달라고 요청합니다.',
    ],
  ],
  [
    'local.appearance',
    ['Local appearance', '지역 행사'],
    [
      'A community invitation competes with recovery and study time.',
      '지역 행사 초대가 회복과 학업 시간을 두고 경쟁합니다.',
    ],
  ],
];

const choices: Readonly<Record<string, readonly [Pair, Pair]>> = {
  commit: [
    ['Commit fully', '전념하기'],
    [
      'Take the demanding path and accept its tradeoffs.',
      '부담이 큰 길을 택하고 그 대가를 감수합니다.',
    ],
  ],
  protect: [
    ['Protect the week', '이번 주 보호'],
    [
      'Preserve scarce resources and accept slower momentum.',
      '부족한 자원을 지키고 느린 흐름을 받아들입니다.',
    ],
  ],
  connect: [
    ['Build a shared answer', '함께 해답 만들기'],
    [
      'Use your build to create a cooperative breakthrough.',
      '빌드를 활용해 협력적인 돌파구를 만듭니다.',
    ],
  ],
};

function addEntries(
  target: Record<string, string>,
  prefix: string,
  entries: readonly Entry[],
  localeIndex: 0 | 1,
): void {
  for (const [slug, name, description] of entries) {
    target[`m7Qb.${prefix}.${slug}.name`] = name[localeIndex];
    target[`m7Qb.${prefix}.${slug}.description`] = description[localeIndex];
  }
}

function build(localeIndex: 0 | 1): Readonly<Record<string, string>> {
  const messages: Record<string, string> = {
    'm7Qb.vertical.name': localeIndex === 0 ? 'Quarterback Alpha' : '쿼터백 알파',
    'm7Qb.vertical.description':
      localeIndex === 0
        ? 'A deterministic quarterback path spanning decisions, growth, skills, and weekly events.'
        : '판단, 성장, 스킬, 주간 이벤트를 잇는 결정론적 쿼터백 경로입니다.',
  };
  addEntries(messages, 'families', families, localeIndex);
  addEntries(messages, 'decisions', decisions, localeIndex);
  addEntries(
    messages,
    'patterns',
    patterns.map(([slug, name, description]) => [slug, name, description]),
    localeIndex,
  );
  addEntries(messages, 'skills', skills, localeIndex);
  addEntries(messages, 'events', events, localeIndex);
  for (const pattern of patterns) {
    const cluePairs = pattern[3].clues;
    for (const [index, clue] of cluePairs.entries()) {
      const suffix = ['one', 'two', 'three'][index]!;
      messages[`m7Qb.clues.${pattern[0]}.${suffix}.name`] = clue[localeIndex];
      messages[`m7Qb.clues.${pattern[0]}.${suffix}.description`] = clue[localeIndex];
    }
  }
  const eventSlugs = events.map(([slug]) => slug);
  const unlocked = new Set([
    'backup.rep.request',
    'receiver.timing',
    'film.room.dispute',
    'tutor.overlap',
    'captain.message',
  ]);
  for (const slug of eventSlugs) {
    for (const kind of unlocked.has(slug)
      ? ['commit', 'protect', 'connect']
      : ['commit', 'protect']) {
      const [name, description] = choices[kind]!;
      messages[`m7Qb.choices.${slug}.${kind}.name`] = name[localeIndex];
      messages[`m7Qb.choices.${slug}.${kind}.description`] = description[localeIndex];
    }
  }
  const feedback: readonly Entry[] = [
    [
      'no.snaps',
      ['Signal review', '시그널 복기'],
      [
        'No key snaps were assigned; you still review signals and preserve readiness.',
        '핵심 스냅이 배정되지 않았지만 시그널을 복기하며 준비 상태를 유지합니다.',
      ],
    ],
    [
      'limited.snaps',
      ['Limited package', '제한 패키지'],
      [
        'A small role still produces visible decisions, feedback, and development.',
        '작은 역할에서도 판단, 피드백, 성장이 분명히 남습니다.',
      ],
    ],
  ];
  addEntries(messages, 'feedback', feedback, localeIndex);
  return messages;
}

export const enUSM7QbMessages = build(0);
export const koKRM7QbMessages = build(1);
