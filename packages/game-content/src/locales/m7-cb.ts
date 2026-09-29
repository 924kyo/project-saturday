type Pair = readonly [string, string];
type Row = readonly [string, Pair, Pair];
const decisions: readonly Row[] = [
  [
    'press.jam',
    ['Press and jam', '프레스 잼'],
    ['Disrupt the release with contact at the line.', '라인에서 접촉으로 릴리스를 방해합니다.'],
  ],
  [
    'shade.inside',
    ['Shade inside', '안쪽 셰이드'],
    ['Protect the inside route while preserving balance.', '균형을 지키며 안쪽 루트를 막습니다.'],
  ],
  [
    'bail.depth',
    ['Bail for depth', '깊이 물러서기'],
    [
      'Protect vertical space and concede the short window.',
      '깊은 공간을 지키고 짧은 창을 내줍니다.',
    ],
  ],
  [
    'mirror.release',
    ['Mirror the release', '릴리스 미러'],
    [
      'Match the receiver before committing the hips.',
      '엉덩이 방향을 정하기 전 리시버를 따라갑니다.',
    ],
  ],
  [
    'undercut.break',
    ['Undercut the break', '브레이크 언더컷'],
    ['Risk the trailing window to attack the route.', '뒤 공간 위험을 감수하고 루트를 가로챕니다.'],
  ],
  [
    'handoff.zone',
    ['Handoff the zone', '존 인계'],
    ['Pass the route and drive the next threat.', '루트를 인계하고 다음 위협으로 이동합니다.'],
  ],
  [
    'play.ball',
    ['Play the ball', '공 노리기'],
    ['Attack the catch point for a takeaway chance.', '캐치 지점에서 턴오버를 노립니다.'],
  ],
  [
    'play.hands',
    ['Play the hands', '손 공략'],
    [
      'Disrupt the receiver without abandoning position.',
      '위치를 버리지 않고 리시버의 손을 방해합니다.',
    ],
  ],
  [
    'close.catch',
    ['Close and tackle', '캐치 후 마무리'],
    ['Limit damage by securing the immediate tackle.', '즉시 태클로 피해를 제한합니다.'],
  ],
  [
    'breakdown.tackle',
    ['Break down', '브레이크다운'],
    ['Stay square and finish the reliable tackle.', '정면을 유지해 확실한 태클을 마칩니다.'],
  ],
  [
    'drive.boundary',
    ['Drive to boundary', '사이드라인 몰기'],
    ['Use leverage to remove inside YAC.', '레버리지로 안쪽 캐치 후 전진을 지웁니다.'],
  ],
  [
    'attack.strip',
    ['Attack the strip', '스트립 시도'],
    ['Trade tackle certainty for a takeaway attempt.', '태클 확실성을 턴오버 기회와 맞바꿉니다.'],
  ],
];
const patterns: readonly [string, Pair, Pair, readonly [Pair, Pair, Pair]][] = [
  [
    'split.release',
    ['Split release', '스플릿 릴리스'],
    [
      'The receiver threatens either side from a balanced split.',
      '리시버가 균형 잡힌 스플릿에서 양쪽을 위협합니다.',
    ],
    [
      ['The first step stays square.', '첫 스텝이 정면을 유지합니다.'],
      ['Inside help is available.', '안쪽 도움 수비가 있습니다.'],
      ['The sideline limits space.', '사이드라인이 공간을 제한합니다.'],
    ],
  ],
  [
    'vertical.stem',
    ['Vertical stem', '버티컬 스템'],
    [
      'The route pushes directly at the defender’s cushion.',
      '루트가 수비의 쿠션을 정면으로 압박합니다.',
    ],
    [
      ['The receiver gains speed early.', '리시버가 일찍 속도를 올립니다.'],
      ['Safety help stays inside.', '세이프티 도움은 안쪽에 있습니다.'],
      ['The short break remains possible.', '짧은 브레이크 가능성이 남습니다.'],
    ],
  ],
  [
    'crossing.exchange',
    ['Crossing exchange', '크로싱 교환'],
    ['Two routes cross the coverage boundary.', '두 루트가 커버리지 경계를 교차합니다.'],
    [
      ['The inside route gains depth.', '안쪽 루트가 깊이를 얻습니다.'],
      ['A teammate carries the shallow route.', '동료가 얕은 루트를 이어받습니다.'],
      ['The quarterback looks middle.', '쿼터백이 중앙을 봅니다.'],
    ],
  ],
  [
    'zone.flood',
    ['Zone flood', '존 플러드'],
    ['Multiple routes overload one outside zone.', '여러 루트가 한 바깥 존을 과부하시킵니다.'],
    [
      ['The flat route releases now.', '플랫 루트가 바로 나옵니다.'],
      ['The corner route climbs.', '코너 루트가 깊어집니다.'],
      ['Inside help cannot cover both.', '안쪽 도움은 둘 다 막을 수 없습니다.'],
    ],
  ],
  [
    'high.point',
    ['High-point throw', '하이포인트 패스'],
    ['The ball arrives above a contested catch point.', '공이 경합 캐치 지점 위로 옵니다.'],
    [
      ['The receiver turns late.', '리시버가 늦게 돌아봅니다.'],
      ['The throw hangs briefly.', '패스가 잠시 떠 있습니다.'],
      ['Contact is imminent.', '접촉이 임박했습니다.'],
    ],
  ],
  [
    'late.window',
    ['Late window', '늦은 창'],
    [
      'A delayed throw opens after the initial route break.',
      '첫 루트 브레이크 뒤 늦은 패스 창이 열립니다.',
    ],
    [
      ['The quarterback resets.', '쿼터백이 자세를 다시 잡습니다.'],
      ['The receiver drifts outside.', '리시버가 바깥으로 흐릅니다.'],
      ['Recovery space is narrow.', '회복 공간이 좁습니다.'],
    ],
  ],
  [
    'open.field.catch',
    ['Open-field catch', '오픈필드 캐치'],
    [
      'A completed short pass creates an isolated tackle.',
      '짧은 패스 완성이 고립된 태클을 만듭니다.',
    ],
    [
      ['The receiver squares up.', '리시버가 정면을 잡습니다.'],
      ['Pursuit trails inside.', '추격 수비가 안쪽에서 따라옵니다.'],
      ['The boundary is several yards away.', '사이드라인까지 몇 야드 남았습니다.'],
    ],
  ],
  [
    'boundary.finish',
    ['Boundary finish', '바운더리 마무리'],
    [
      'The receiver turns near the sideline with limited space.',
      '리시버가 좁은 사이드라인 근처에서 방향을 틉니다.',
    ],
    [
      ['Inside leverage is available.', '안쪽 레버리지를 잡을 수 있습니다.'],
      ['The receiver protects the ball.', '리시버가 공을 감쌉니다.'],
      ['Support arrives from depth.', '깊은 곳에서 지원 수비가 옵니다.'],
    ],
  ],
];
const skills: readonly Row[] = [
  [
    'split.key.c',
    ['Split Key', '스플릿 키'],
    ['Reveal one additional CB assignment clue.', 'CB 임무 단서 하나를 더 확인합니다.'],
  ],
  [
    'patient.feet.b',
    ['Patient Feet', '인내의 발'],
    ['Improve leverage-family execution.', '레버리지 계열 실행력을 높입니다.'],
  ],
  [
    'route.thief.a',
    ['Route Thief', '루트 도둑'],
    [
      'Raise undercut takeaway chance while allowing more completion risk.',
      '언더컷 턴오버 기회를 높이는 대신 패스 허용 위험을 더합니다.',
    ],
  ],
  [
    'ball.window.b',
    ['Ball Window', '볼 윈도'],
    ['Improve takeaway chances at the catch point.', '캐치 지점 턴오버 기회를 높입니다.'],
  ],
  [
    'secure.finish.c',
    ['Secure Finish', '확실한 마무리'],
    ['Improve tackle-family reliability.', '태클 계열 신뢰도를 높입니다.'],
  ],
  [
    'boundary.force.a',
    ['Boundary Force', '바운더리 포스'],
    ['Improve boundary tackles and grade value.', '사이드라인 태클과 평가 가치를 높입니다.'],
  ],
  [
    'weekly.reset.c',
    ['Weekly Reset', '주간 리셋'],
    ['Reduce Game Day Body cost.', '경기 몸 상태 비용을 줄입니다.'],
  ],
  [
    'next.series.b',
    ['Next Series', '다음 시리즈'],
    ['Reduce Confidence loss after a poor grade.', '낮은 평가 뒤 자신감 하락을 줄입니다.'],
  ],
  [
    'rep.archive.a',
    ['Rep Archive', '반복 기록'],
    ['Increase attribute XP from coverage work.', '커버리지 수행으로 얻는 능력치 XP를 늘립니다.'],
  ],
  [
    'quiet.island.a',
    ['Quiet Island', '고요한 섬'],
    [
      'Reduce general completion risk and lift grade.',
      '전반적인 패스 허용 위험을 줄이고 평가를 높입니다.',
    ],
  ],
  [
    'secondary.table.b',
    ['Secondary Table', '세컨더리 테이블'],
    ['Unlock cooperative CB event choices.', 'CB 이벤트의 협력 선택지를 엽니다.'],
  ],
  [
    'shared.stage.s',
    ['Shared Stage', '함께 쓰는 무대'],
    ['Amplify positive event consequences only.', '이벤트의 긍정적 결과만 강화합니다.'],
  ],
];
const events: readonly Row[] = [
  [
    'release.study',
    ['Release study', '릴리스 연구'],
    [
      'A receiver offers extra line-of-scrimmage film.',
      '리시버가 라인 릴리스 필름 연구를 제안합니다.',
    ],
  ],
  [
    'receiver.challenge',
    ['Receiver challenge', '리시버 도전'],
    [
      'A teammate proposes competitive one-on-one work.',
      '동료가 경쟁적인 일대일 훈련을 제안합니다.',
    ],
  ],
  [
    'tackle.circuit',
    ['Tackle circuit', '태클 서킷'],
    [
      'The staff adds a demanding finish period.',
      '코칭스태프가 강도 높은 마무리 훈련을 추가합니다.',
    ],
  ],
  [
    'ball.drill',
    ['Ball drill', '볼 드릴'],
    ['A coach opens extra catch-point repetitions.', '코치가 추가 캐치 지점 반복을 엽니다.'],
  ],
  [
    'sore.shoulders',
    ['Sore shoulders', '뻐근한 어깨'],
    [
      'Accumulated contact makes recovery meaningful.',
      '누적 접촉으로 회복이 중요한 선택이 됩니다.',
    ],
  ],
  [
    'secondary.rotation',
    ['Secondary rotation', '세컨더리 로테이션'],
    [
      'The room discusses how to divide coverage reps.',
      '포지션룸이 커버리지 반복 배분을 논의합니다.',
    ],
  ],
  [
    'tutor.overlap',
    ['Tutor overlap', '튜터 일정 충돌'],
    [
      'Academic time overlaps optional coverage work.',
      '학업 시간이 선택 커버리지 훈련과 겹칩니다.',
    ],
  ],
  [
    'campus.interview',
    ['Campus interview', '캠퍼스 인터뷰'],
    ['A student outlet asks about island coverage.', '학생 매체가 단독 커버리지에 대해 묻습니다.'],
  ],
  [
    'opponent.cutup',
    ['Opponent cutup', '상대 컷업'],
    ['A coach shares a focused opponent route reel.', '코치가 상대 루트 중심 필름을 공유합니다.'],
  ],
  [
    'weather.practice',
    ['Weather practice', '악천후 훈련'],
    [
      'Bad conditions change the cost of technique work.',
      '나쁜 날씨가 기술 훈련의 비용을 바꿉니다.',
    ],
  ],
  [
    'captain.checkin',
    ['Captain check-in', '주장 체크인'],
    ['A captain asks you to align the secondary.', '주장이 세컨더리를 정돈해 달라고 합니다.'],
  ],
  [
    'youth.camp',
    ['Youth camp', '유소년 캠프'],
    [
      'A local clinic competes with recovery and study.',
      '지역 클리닉이 회복과 학업 시간과 겹칩니다.',
    ],
  ],
];
function add(out: Record<string, string>, section: string, rows: readonly Row[], locale: 0 | 1) {
  for (const [id, name, description] of rows) {
    out[`m7Cb.${section}.${id}.name`] = name[locale];
    out[`m7Cb.${section}.${id}.description`] = description[locale];
  }
}
function build(locale: 0 | 1) {
  const out: Record<string, string> = {
    'm7Cb.vertical.name': locale === 0 ? 'Cornerback Alpha' : '코너백 알파',
    'm7Cb.vertical.description':
      locale === 0
        ? 'A deterministic CB path spanning leverage, coverage, ball disruption, tackling, skills, and events.'
        : '레버리지, 커버리지, 볼 방해, 태클, 스킬, 이벤트를 잇는 결정론적 CB 경로입니다.',
  };
  add(out, 'decisions', decisions, locale);
  add(
    out,
    'patterns',
    patterns.map(([id, n, d]) => [id, n, d]),
    locale,
  );
  add(out, 'skills', skills, locale);
  add(out, 'events', events, locale);
  for (const [id, , , clueRows] of patterns)
    for (const [i, clue] of clueRows.entries()) {
      const s = ['one', 'two', 'three'][i]!;
      out[`m7Cb.clues.${id}.${s}.name`] = clue[locale];
      out[`m7Cb.clues.${id}.${s}.description`] = clue[locale];
    }
  const third = new Set([
    'receiver.challenge',
    'tackle.circuit',
    'secondary.rotation',
    'captain.checkin',
  ]);
  const copy = {
    commit: [
      ['Commit fully', '전념하기'],
      ['Take the demanding path and its tradeoff.', '부담이 큰 길과 대가를 감수합니다.'],
    ],
    protect: [
      ['Protect the week', '이번 주 보호'],
      [
        'Preserve scarce resources and slower momentum.',
        '부족한 자원을 지키고 느린 흐름을 감수합니다.',
      ],
    ],
    connect: [
      ['Build a shared answer', '함께 해답 만들기'],
      ['Use your build for a cooperative breakthrough.', '빌드로 협력적인 돌파구를 만듭니다.'],
    ],
  } as const;
  for (const [id] of events)
    for (const kind of third.has(id)
      ? (['commit', 'protect', 'connect'] as const)
      : (['commit', 'protect'] as const)) {
      out[`m7Cb.choices.${id}.${kind}.name`] = copy[kind][0][locale];
      out[`m7Cb.choices.${id}.${kind}.description`] = copy[kind][1][locale];
    }
  add(
    out,
    'feedback',
    [
      [
        'scout.review',
        ['Scout review', '스카우트 복기'],
        [
          'No key coverage snaps were assigned; releases and leverage are reviewed.',
          '핵심 커버리지 스냅이 없지만 릴리스와 레버리지를 복기합니다.',
        ],
      ],
      [
        'coverage',
        ['Coverage contribution', '커버리지 기여'],
        [
          'Targets avoided, disruptions, tackles, and mistakes all shape the grade.',
          '타깃 억제, 방해, 태클, 실수가 모두 평가를 만듭니다.',
        ],
      ],
    ],
    locale,
  );
  return out;
}
export const enUSM7CbMessages = build(0);
export const koKRM7CbMessages = build(1);
