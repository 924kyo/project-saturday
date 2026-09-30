type Pair = readonly [string, string];
type Row = readonly [string, Pair, Pair];
const decisions: readonly Row[] = [
  [
    'press.landmark',
    ['Press the landmark', '목표 지점 누르기'],
    [
      'Hold the designed track until the blocking declares.',
      '블로킹이 드러날 때까지 설계된 길을 유지합니다.',
    ],
  ],
  [
    'cut.back',
    ['Cut back', '컷백'],
    [
      'Attack the space left behind the flowing front.',
      '흐르는 프런트 뒤에 남은 공간을 공략합니다.',
    ],
  ],
  [
    'bounce.edge',
    ['Bounce outside', '바깥으로 튀기'],
    [
      'Give up secure yards for an explosive edge chance.',
      '확실한 야드를 포기하고 바깥 빅플레이를 노립니다.',
    ],
  ],
  [
    'finish.forward',
    ['Finish forward', '앞으로 마무리'],
    [
      'Accept contact and drive for dependable yards.',
      '접촉을 받아들이고 확실한 야드를 밀어냅니다.',
    ],
  ],
  [
    'make.miss',
    ['Make the defender miss', '수비 벗겨내기'],
    ['Use space and elusiveness for a larger gain.', '공간과 회피력으로 더 큰 전진을 노립니다.'],
  ],
  [
    'cover.ball',
    ['Cover the ball', '공 감싸기'],
    [
      'Protect possession and Body at the cost of extra yards.',
      '추가 야드 대신 공과 몸 상태를 지킵니다.',
    ],
  ],
  [
    'scan.inside',
    ['Scan inside-out', '안쪽부터 스캔'],
    ['Identify the most immediate protection threat.', '가장 즉각적인 보호 위협부터 찾습니다.'],
  ],
  [
    'square.anchor',
    ['Square and anchor', '정면 앵커'],
    [
      'Meet the rusher firmly and absorb more contact.',
      '러셔를 정면으로 맞아 더 큰 접촉을 감수합니다.',
    ],
  ],
  [
    'release.late',
    ['Release late', '늦게 루트 진입'],
    ['Check the threat, then become a receiving outlet.', '위협을 확인한 뒤 패스 출구가 됩니다.'],
  ],
  [
    'settle.checkdown',
    ['Settle underneath', '아래에 자리 잡기'],
    ['Present a safe target and secure the catch.', '안전한 타깃을 제공하고 캐치를 확보합니다.'],
  ],
  [
    'turn.upfield',
    ['Turn upfield', '필드 안쪽 전환'],
    ['Transition immediately into a YAC attempt.', '즉시 전진해 캐치 후 야드를 노립니다.'],
  ],
  [
    'secure.boundary',
    ['Secure the boundary', '사이드라인 확보'],
    [
      'Use the sideline to protect possession and contact exposure.',
      '사이드라인으로 공과 접촉 위험을 관리합니다.',
    ],
  ],
];
const patterns: readonly [string, Pair, Pair, readonly [Pair, Pair, Pair]][] = [
  [
    'flowing.front',
    ['Flowing front', '흐르는 프런트'],
    ['The defense stretches with the run action.', '수비가 러닝 액션을 따라 옆으로 늘어납니다.'],
    [
      ['The play-side linebacker widens.', '플레이 쪽 라인배커가 넓어진다.'],
      ['The guard keeps inside leverage.', '가드가 안쪽 레버리지를 유지한다.'],
      ['The edge defender stays patient.', '에지 수비가 인내하며 버틴다.'],
    ],
  ],
  [
    'backside.fold',
    ['Backside fold', '백사이드 폴드'],
    ['Pursuit opens a lane against the original flow.', '추격이 원래 흐름 반대쪽 길을 엽니다.'],
    [
      ['The backside tackle crosses face.', '백사이드 태클이 얼굴 앞을 가로지른다.'],
      ['The safety rotates late.', '세이프티가 늦게 회전한다.'],
      ['The edge loses contain depth.', '에지가 컨테인 깊이를 잃는다.'],
    ],
  ],
  [
    'square.contact',
    ['Square contact', '정면 접촉'],
    [
      'A downhill defender meets the run in a narrow lane.',
      '내리꽂는 수비가 좁은 길에서 러닝을 맞습니다.',
    ],
    [
      ['The defender lowers his hips.', '수비가 엉덩이를 낮춘다.'],
      ['Both shoulders stay square.', '양쪽 어깨가 정면을 유지한다.'],
      ['Help closes from inside.', '안쪽에서 지원 수비가 좁혀 온다.'],
    ],
  ],
  [
    'open.field.angle',
    ['Open-field angle', '오픈필드 각도'],
    [
      'One defender owns the space between the runner and open grass.',
      '한 수비가 러너와 열린 공간 사이를 지킵니다.',
    ],
    [
      ['The defender overcommits inside.', '수비가 안쪽으로 과하게 들어온다.'],
      ['The sideline remains distant.', '사이드라인은 아직 멀다.'],
      ['Pursuit trails the play.', '추격 수비가 뒤에서 따라온다.'],
    ],
  ],
  [
    'inside.pressure',
    ['Inside pressure', '내부 압박'],
    [
      'An interior rusher threatens the quarterback quickly.',
      '내부 러셔가 쿼터백을 빠르게 위협합니다.',
    ],
    [
      ['The linebacker enters the A gap.', '라인배커가 A 갭으로 들어온다.'],
      ['The center is occupied.', '센터가 이미 수비를 맡고 있다.'],
      ['The outlet remains uncovered.', '패스 출구는 아직 비어 있다.'],
    ],
  ],
  [
    'delayed.edge',
    ['Delayed edge', '지연 에지'],
    [
      'A patient rusher waits for the protection to commit.',
      '인내하는 러셔가 보호가 확정되기를 기다립니다.',
    ],
    [
      ['The edge defender pauses.', '에지 수비가 잠시 멈춘다.'],
      ['The tackle looks inside.', '태클이 안쪽을 본다.'],
      ['The flat opens after the rush.', '러시 뒤 플랫이 열린다.'],
    ],
  ],
  [
    'flat.space',
    ['Flat space', '플랫 공간'],
    [
      'A short catch arrives with room to transition upfield.',
      '짧은 패스 뒤 필드 안쪽으로 전환할 공간이 생깁니다.',
    ],
    [
      ['The nearest defender has depth.', '가장 가까운 수비가 깊이 있다.'],
      ['The sideline angle is clean.', '사이드라인 각도가 깨끗하다.'],
      ['Inside pursuit is late.', '안쪽 추격이 늦다.'],
    ],
  ],
  [
    'option.window',
    ['Option window', '옵션 창'],
    [
      'The route can settle or continue based on underneath leverage.',
      '아래 수비 레버리지에 따라 루트를 멈추거나 이어갈 수 있습니다.',
    ],
    [
      ['The hook defender widens.', '훅 수비가 바깥으로 넓어진다.'],
      ['The quarterback faces pressure.', '쿼터백이 압박을 받는다.'],
      ['Boundary help stays high.', '사이드라인 지원 수비가 깊게 남는다.'],
    ],
  ],
];
const skills: readonly Row[] = [
  [
    'flow.map.c',
    ['Flow Map', '흐름 지도'],
    ['Reveal one more clue before an RB key snap.', 'RB 핵심 스냅 전에 단서 하나를 더 확인합니다.'],
  ],
  [
    'patient.press.b',
    ['Patient Press', '인내의 압박'],
    ['Improve the designed-landmark decision.', '설계된 목표 지점 판단을 강화합니다.'],
  ],
  [
    'one.cut.a',
    ['One Cut', '원 컷'],
    [
      'Raise cutback explosion while adding ball risk.',
      '컷백 폭발력을 높이는 대신 공 위험을 더합니다.',
    ],
  ],
  [
    'contact.economy.b',
    ['Contact Economy', '접촉 경제'],
    ['Reduce accumulated Game Day Body cost.', '누적 경기 몸 상태 비용을 줄입니다.'],
  ],
  [
    'two.hands.c',
    ['Two Hands', '두 손'],
    ['Reduce fumble risk when covering the ball.', '공을 감쌀 때 펌블 위험을 줄입니다.'],
  ],
  [
    'pocket.guard.a',
    ['Pocket Guard', '포켓 수호자'],
    ['Improve protection outcomes and grade value.', '패스 보호 결과와 평가 가치를 높입니다.'],
  ],
  [
    'fresh.legs.c',
    ['Fresh Legs', '가벼운 다리'],
    ['Preserve Body across a limited role.', '제한된 역할에서도 몸 상태를 보존합니다.'],
  ],
  [
    'next.play.b',
    ['Next Play', '다음 플레이'],
    ['Reduce Confidence loss after a poor grade.', '낮은 평가 뒤 자신감 하락을 줄입니다.'],
  ],
  [
    'rep.harvest.a',
    ['Rep Harvest', '반복 수확'],
    ['Increase attribute XP from game decisions.', '경기 판단으로 얻는 능력치 XP를 늘립니다.'],
  ],
  [
    'complete.back.a',
    ['Complete Back', '완성형 백'],
    [
      'Lift general execution, grade, and role evidence.',
      '전반적 실행, 평가, 역할 증거를 높입니다.',
    ],
  ],
  [
    'room.table.b',
    ['Room Table', '포지션룸 테이블'],
    ['Unlock cooperative choices in selected RB events.', '일부 RB 이벤트의 협력 선택지를 엽니다.'],
  ],
  [
    'shared.credit.s',
    ['Shared Credit', '공동의 공'],
    ['Amplify only positive event consequences.', '이벤트의 긍정적 결과만 강화합니다.'],
  ],
];
const events: readonly Row[] = [
  [
    'ball.security.challenge',
    ['Ball-security challenge', '볼 시큐리티 도전'],
    [
      'A coach adds a possession drill after practice.',
      '코치가 훈련 뒤 공 지키기 드릴을 추가합니다.',
    ],
  ],
  [
    'protection.walkthrough',
    ['Protection walkthrough', '보호 워크스루'],
    [
      'The line invites you to rehearse pressure pickups.',
      '라인이 압박 픽업 합동 연습을 제안합니다.',
    ],
  ],
  [
    'receiver.routes',
    ['Receiver routes', '리시버 루트'],
    ['A receiver offers extra route timing work.', '리시버가 추가 루트 타이밍 훈련을 제안합니다.'],
  ],
  [
    'goal.line.reps',
    ['Goal-line reps', '골라인 반복'],
    [
      'The staff opens a demanding short-yardage period.',
      '코칭스태프가 강도 높은 짧은 야드 훈련을 엽니다.',
    ],
  ],
  [
    'sore.hips',
    ['Sore hips', '뻐근한 엉덩이'],
    [
      'Accumulated contact makes recovery a real choice.',
      '누적 접촉으로 회복이 중요한 선택이 됩니다.',
    ],
  ],
  [
    'room.rotation',
    ['Room rotation', '포지션룸 로테이션'],
    [
      'The backs negotiate how to divide valuable repetitions.',
      '러닝백들이 귀중한 반복을 어떻게 나눌지 논의합니다.',
    ],
  ],
  [
    'tutor.session',
    ['Tutor session', '튜터 세션'],
    ['Academic work overlaps optional field time.', '학업 시간이 선택 필드 훈련과 겹칩니다.'],
  ],
  [
    'campus.feature',
    ['Campus feature', '캠퍼스 특집'],
    [
      'A student outlet asks about your expanding role.',
      '학생 매체가 커지는 역할에 대해 묻습니다.',
    ],
  ],
  [
    'film.cutup',
    ['Film cutup', '필름 컷업'],
    [
      'A coach shares a focused set of defensive fronts.',
      '코치가 수비 프런트 중심 필름을 공유합니다.',
    ],
  ],
  [
    'equipment.adjustment',
    ['Equipment adjustment', '장비 조정'],
    [
      'A small equipment change trades comfort for security.',
      '작은 장비 변화가 편안함과 안정성을 맞바꿉니다.',
    ],
  ],
  [
    'captain.assignment',
    ['Captain assignment', '주장 임무'],
    ['A captain asks you to organize the skill group.', '주장이 스킬 그룹을 정돈해 달라고 합니다.'],
  ],
  [
    'community.clinic',
    ['Community clinic', '지역 클리닉'],
    [
      'A youth clinic competes with recovery and study.',
      '유소년 클리닉이 회복과 학업 시간과 겹칩니다.',
    ],
  ],
];

function add(target: Record<string, string>, section: string, rows: readonly Row[], locale: 0 | 1) {
  for (const [id, name, description] of rows) {
    target[`m7Rb.${section}.${id}.name`] = name[locale];
    target[`m7Rb.${section}.${id}.description`] = description[locale];
  }
}
function build(locale: 0 | 1) {
  const out: Record<string, string> = {
    'm7Rb.vertical.name': locale === 0 ? 'Running Back Alpha' : '러닝백 알파',
    'm7Rb.vertical.description':
      locale === 0
        ? 'A deterministic RB path spanning run tracks, contact, protection, receiving, skills, and events.'
        : '러닝 경로, 접촉, 보호, 리시빙, 스킬, 이벤트를 잇는 결정론적 RB 경로입니다.',
  };
  add(out, 'decisions', decisions, locale);
  add(
    out,
    'patterns',
    patterns.map(([id, name, description]) => [id, name, description]),
    locale,
  );
  add(out, 'skills', skills, locale);
  add(out, 'events', events, locale);
  for (const [id, , , clueRows] of patterns)
    for (const [index, clue] of clueRows.entries()) {
      const suffix = ['one', 'two', 'three'][index]!;
      out[`m7Rb.clues.${id}.${suffix}.name`] = clue[locale];
      out[`m7Rb.clues.${id}.${suffix}.description`] = clue[locale];
    }
  const third = new Set([
    'protection.walkthrough',
    'receiver.routes',
    'room.rotation',
    'captain.assignment',
  ]);
  const choiceCopy = {
    commit: [
      ['Commit fully', '전념하기'],
      ['Accept the demanding path and its tradeoff.', '부담이 큰 길과 대가를 받아들입니다.'],
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
      [
        'Use your build to create a cooperative breakthrough.',
        '빌드로 협력적인 돌파구를 만듭니다.',
      ],
    ],
  } as const;
  for (const [id] of events)
    for (const kind of third.has(id)
      ? (['commit', 'protect', 'connect'] as const)
      : (['commit', 'protect'] as const)) {
      const copy = choiceCopy[kind];
      out[`m7Rb.choices.${id}.${kind}.name`] = copy[0][locale];
      out[`m7Rb.choices.${id}.${kind}.description`] = copy[1][locale];
    }
  add(
    out,
    'feedback',
    [
      [
        'assignment.review',
        ['Assignment review', '임무 복기'],
        [
          'No key snaps were assigned; protection and run landmarks are reviewed.',
          '핵심 스냅이 없지만 보호와 러닝 목표를 복기합니다.',
        ],
      ],
      [
        'offense',
        ['Backfield contribution', '백필드 기여'],
        [
          'Rushing, receiving, and protection decisions all count toward the role.',
          '러싱, 리시빙, 보호 판단이 모두 역할에 반영됩니다.',
        ],
      ],
    ],
    locale,
  );
  return out;
}
export const enUSM7RbMessages = build(0);
export const koKRM7RbMessages = build(1);
