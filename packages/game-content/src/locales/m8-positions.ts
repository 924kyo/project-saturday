/**
 * M8 position foundation copy for linebacker and edge rusher. The keys follow the shipped
 * `m7Alpha.*` position contract so the position catalog stays one shape for all six positions.
 */
type Pair = readonly [en: string, ko: string];

const entries: Readonly<Record<string, Pair>> = {
  'm7Alpha.positions.lb.name': ['Linebacker', '라인배커'],
  'm7Alpha.positions.lb.description': [
    'Reads the backfield, fits the run, drops into coverage and times pressure.',
    '백필드를 읽고 런을 막고, 커버리지로 물러서거나 블리츠 타이밍을 잡습니다.',
  ],
  'm7Alpha.positions.edge.name': ['Edge Rusher', '엣지 러셔'],
  'm7Alpha.positions.edge.description': [
    'Wins off the snap, beats the tackle, keeps the edge and finishes at the quarterback.',
    '스냅 순간 먼저 튀어 나가 태클을 이기고, 엣지를 지키며 쿼터백에게 마무리합니다.',
  ],
  'm7Alpha.archetypes.lbRunStopper.name': ['Run Stopper', '런 스토퍼'],
  'm7Alpha.archetypes.lbRunStopper.description': [
    'Downhill instincts and block shedding; lives in the A and B gaps.',
    '곧장 파고드는 감각과 블록 벗기기. A·B 갭이 주 무대입니다.',
  ],
  'm7Alpha.archetypes.lbCoverageBacker.name': ['Coverage Backer', '커버리지 백커'],
  'm7Alpha.archetypes.lbCoverageBacker.description': [
    'Range and eyes in space; carries seams and matches backs.',
    '넓은 활동 범위와 공간에서의 시야. 심 루트를 따라가고 백을 매치합니다.',
  ],
  'm7Alpha.archetypes.lbHybridBlitzer.name': ['Hybrid Blitzer', '하이브리드 블리처'],
  'm7Alpha.archetypes.lbHybridBlitzer.description': [
    'Times the snap and finds lanes; a pressure piece who still tackles.',
    '스냅 타이밍과 침투 레인을 찾는 압박 자원이면서 태클도 해냅니다.',
  ],
  'm7Alpha.archetypes.edgeSpeedRusher.name': ['Speed Rusher', '스피드 러셔'],
  'm7Alpha.archetypes.edgeSpeedRusher.description': [
    'Explosive get-off and bend around the corner.',
    '폭발적인 스타트와 코너를 도는 유연함.',
  ],
  'm7Alpha.archetypes.edgePowerRusher.name': ['Power Rusher', '파워 러셔'],
  'm7Alpha.archetypes.edgePowerRusher.description': [
    'Long arms and bull rushes that collapse the pocket.',
    '긴 팔과 불 러시로 포켓을 무너뜨립니다.',
  ],
  'm7Alpha.archetypes.edgeEdgeSetter.name': ['Edge Setter', '엣지 세터'],
  'm7Alpha.archetypes.edgeEdgeSetter.description': [
    'Sets a hard edge against the run and never loses contain.',
    '런에 맞서 단단한 엣지를 세우고 컨테인을 놓치지 않습니다.',
  ],
  'm7Alpha.attributes.lbRunRecognition.name': ['Run Recognition', '런 인지'],
  'm7Alpha.attributes.lbRunRecognition.description': [
    'How fast run keys turn into a correct first step.',
    '런 신호를 올바른 첫 스텝으로 바꾸는 속도.',
  ],
  'm7Alpha.attributes.lbZoneCoverage.name': ['Zone Coverage', '존 커버리지'],
  'm7Alpha.attributes.lbZoneCoverage.description': [
    'Drop depth and spacing under routes.',
    '드롭 깊이와 루트 아래 간격 유지.',
  ],
  'm7Alpha.attributes.lbManMatch.name': ['Man Match', '맨 매치'],
  'm7Alpha.attributes.lbManMatch.description': [
    'Carrying backs and tight ends through their routes.',
    '백과 타이트엔드를 루트 끝까지 따라가는 능력.',
  ],
  'm7Alpha.attributes.lbTackling.name': ['Tackling', '태클'],
  'm7Alpha.attributes.lbTackling.description': [
    'Wrap-up reliability in the box and in space.',
    '박스 안과 공간에서 확실히 감싸 쓰러뜨리는 능력.',
  ],
  'm7Alpha.attributes.lbBlockShed.name': ['Block Shed', '블록 쉐드'],
  'm7Alpha.attributes.lbBlockShed.description': [
    'Getting off climbing linemen to make the play.',
    '올라오는 라인맨을 떨쳐 내고 플레이에 가담하는 능력.',
  ],
  'm7Alpha.attributes.lbBlitzTiming.name': ['Blitz Timing', '블리츠 타이밍'],
  'm7Alpha.attributes.lbBlitzTiming.description': [
    'Disguise and arrival at the snap.',
    '의도를 숨기고 스냅에 맞춰 도달하는 능력.',
  ],
  'm7Alpha.attributes.edgeGetOff.name': ['Get-Off', '겟오프'],
  'm7Alpha.attributes.edgeGetOff.description': [
    'First-step quickness on the snap.',
    '스냅 순간 첫걸음의 빠르기.',
  ],
  'm7Alpha.attributes.edgeSpeedRush.name': ['Speed Rush', '스피드 러시'],
  'm7Alpha.attributes.edgeSpeedRush.description': [
    'Winning the corner with bend and burst.',
    '유연함과 가속으로 코너를 따내는 능력.',
  ],
  'm7Alpha.attributes.edgePowerRush.name': ['Power Rush', '파워 러시'],
  'm7Alpha.attributes.edgePowerRush.description': [
    'Driving the tackle back into the pocket.',
    '태클을 포켓 안으로 밀어붙이는 힘.',
  ],
  'm7Alpha.attributes.edgeCounterMove.name': ['Counter Move', '카운터 무브'],
  'm7Alpha.attributes.edgeCounterMove.description': [
    'Changing direction when the first move is stopped.',
    '첫 동작이 막혔을 때 방향을 바꾸는 기술.',
  ],
  'm7Alpha.attributes.edgeEdgeSetting.name': ['Edge Setting', '엣지 세팅'],
  'm7Alpha.attributes.edgeEdgeSetting.description': [
    'Holding the edge and forcing runs back inside.',
    '엣지를 지키며 런을 안쪽으로 몰아넣는 능력.',
  ],
  'm7Alpha.attributes.edgeTackling.name': ['Tackling', '태클'],
  'm7Alpha.attributes.edgeTackling.description': [
    'Finishing sacks and run stops without missing.',
    '색과 런 저지를 놓치지 않고 마무리하는 능력.',
  ],
  'm7Alpha.development.lbRunFits.name': ['Run Fits', '런 피트'],
  'm7Alpha.development.lbRunFits.description': [
    'Develop keys, gap discipline and shedding.',
    '신호 읽기, 갭 규율, 블록 벗기기를 키웁니다.',
  ],
  'm7Alpha.development.lbCoverageDrops.name': ['Coverage Drops', '커버리지 드롭'],
  'm7Alpha.development.lbCoverageDrops.description': [
    'Develop drop depth, eyes and matching.',
    '드롭 깊이, 시야, 매치 능력을 키웁니다.',
  ],
  'm7Alpha.development.lbPressure.name': ['Pressure Package', '압박 패키지'],
  'm7Alpha.development.lbPressure.description': [
    'Develop blitz timing and finishing tackles.',
    '블리츠 타이밍과 마무리 태클을 키웁니다.',
  ],
  'm7Alpha.development.edgeGetOff.name': ['Get-Off', '겟오프'],
  'm7Alpha.development.edgeGetOff.description': [
    'Develop the first step and the speed rush.',
    '첫 스텝과 스피드 러시를 키웁니다.',
  ],
  'm7Alpha.development.edgeHandFighting.name': ['Hand Fighting', '핸드 파이팅'],
  'm7Alpha.development.edgeHandFighting.description': [
    'Develop power moves and counters.',
    '파워 무브와 카운터를 키웁니다.',
  ],
  'm7Alpha.development.edgeFinish.name': ['Edge Finish', '엣지 마무리'],
  'm7Alpha.development.edgeFinish.description': [
    'Develop edge discipline and tackling.',
    '엣지 규율과 태클을 키웁니다.',
  ],
  'm7Alpha.game.lbKey.name': ['Read the Key', '신호 읽기'],
  'm7Alpha.game.lbKey.description': [
    'Decide run or pass from the backfield and the guards.',
    '백필드와 가드를 보고 런인지 패스인지 판단합니다.',
  ],
  'm7Alpha.game.lbFit.name': ['Fit the Gap', '갭 피트'],
  'm7Alpha.game.lbFit.description': [
    'Fill your gap, spill the run or scrape over the top.',
    '갭을 메우거나, 런을 밖으로 흘리거나, 위로 돌아 따라갑니다.',
  ],
  'm7Alpha.game.lbDrop.name': ['Coverage Drop', '커버리지 드롭'],
  'm7Alpha.game.lbDrop.description': [
    'Choose depth, match the route or rob the throwing lane.',
    '깊이를 정하고, 루트를 매치하거나, 패스 길목을 가로챕니다.',
  ],
  'm7Alpha.game.lbBlitz.name': ['Pressure', '압박'],
  'm7Alpha.game.lbBlitz.description': [
    'Time the blitz, pick the lane or peel with the back.',
    '블리츠 타이밍과 레인을 고르거나, 백을 따라 빠집니다.',
  ],
  'm7Alpha.game.edgeRush.name': ['Rush Move', '러시 무브'],
  'm7Alpha.game.edgeRush.description': [
    'Speed, power or counter against the tackle.',
    '태클을 상대로 스피드, 파워, 카운터 중에 고릅니다.',
  ],
  'm7Alpha.game.edgeContain.name': ['Contain or Chase', '컨테인 또는 추격'],
  'm7Alpha.game.edgeContain.description': [
    'Keep the edge, squeeze inside or chase the ball.',
    '엣지를 지킬지, 안으로 좁힐지, 공을 쫓을지 정합니다.',
  ],
  'm7Alpha.game.edgeOption.name': ['Option Responsibility', '옵션 책임'],
  'm7Alpha.game.edgeOption.description': [
    'Take the dive, the quarterback or the pitch.',
    '다이브, 쿼터백, 피치 중 누구를 맡을지 정합니다.',
  ],
  'm7Alpha.game.edgeFinish.name': ['Finish', '마무리'],
  'm7Alpha.game.edgeFinish.description': [
    'Wrap the sack, swipe for the strip or take away the throw.',
    '색을 감싸 끝내거나, 스트립을 노리거나, 패스 길을 막습니다.',
  ],
  'm7Alpha.training.lbRunFits.name': ['Run Fit Period', '런 피트 훈련'],
  'm7Alpha.training.lbRunFits.description': [
    'Keys, gap discipline and shedding against scout linemen.',
    '스카우트 라인맨을 상대로 신호 읽기, 갭 규율, 블록 벗기기를 반복합니다.',
  ],
  'm7Alpha.training.lbCoverageDrops.name': ['Coverage Drops', '커버리지 드롭 훈련'],
  'm7Alpha.training.lbCoverageDrops.description': [
    'Drop depth and route matching on air and in skeleton.',
    '드롭 깊이와 루트 매치를 반복합니다.',
  ],
  'm7Alpha.training.lbPressurePackage.name': ['Pressure Package', '압박 패키지 훈련'],
  'm7Alpha.training.lbPressurePackage.description': [
    'Blitz timing and finishing tackles at full speed.',
    '전속력으로 블리츠 타이밍과 마무리 태클을 반복합니다.',
  ],
  'm7Alpha.training.edgeGetOff.name': ['Get-Off Work', '겟오프 훈련'],
  'm7Alpha.training.edgeGetOff.description': [
    'First-step starts and bend drills around the bag.',
    '첫 스텝 스타트와 백을 도는 벤드 드릴.',
  ],
  'm7Alpha.training.edgeHandFighting.name': ['Hand Fighting', '핸드 파이팅 훈련'],
  'm7Alpha.training.edgeHandFighting.description': [
    'Power moves and counters against live tackles.',
    '실전 태클을 상대로 파워 무브와 카운터를 반복합니다.',
  ],
  'm7Alpha.training.edgeEdgeDiscipline.name': ['Edge Discipline', '엣지 규율 훈련'],
  'm7Alpha.training.edgeEdgeDiscipline.description': [
    'Setting the edge and finishing on the ball carrier.',
    '엣지를 세우고 볼 캐리어를 마무리합니다.',
  ],
  'm7Alpha.proficiency.lbRunFits.name': ['Run Fit Proficiency', '런 피트 숙련도'],
  'm7Alpha.proficiency.lbRunFits.description': [
    'Repeated run-fit periods make the work more efficient.',
    '런 피트 훈련을 반복할수록 효율이 오릅니다.',
  ],
  'm7Alpha.proficiency.lbCoverageDrops.name': ['Drop Proficiency', '드롭 숙련도'],
  'm7Alpha.proficiency.lbCoverageDrops.description': [
    'Repeated drop periods make the work more efficient.',
    '드롭 훈련을 반복할수록 효율이 오릅니다.',
  ],
  'm7Alpha.proficiency.lbPressurePackage.name': ['Pressure Proficiency', '압박 숙련도'],
  'm7Alpha.proficiency.lbPressurePackage.description': [
    'Repeated pressure periods make the work more efficient.',
    '압박 훈련을 반복할수록 효율이 오릅니다.',
  ],
  'm7Alpha.proficiency.edgeGetOff.name': ['Get-Off Proficiency', '겟오프 숙련도'],
  'm7Alpha.proficiency.edgeGetOff.description': [
    'Repeated get-off work makes the work more efficient.',
    '겟오프 훈련을 반복할수록 효율이 오릅니다.',
  ],
  'm7Alpha.proficiency.edgeHandFighting.name': ['Hand-Fighting Proficiency', '핸드 파이팅 숙련도'],
  'm7Alpha.proficiency.edgeHandFighting.description': [
    'Repeated hand fighting makes the work more efficient.',
    '핸드 파이팅을 반복할수록 효율이 오릅니다.',
  ],
  'm7Alpha.proficiency.edgeEdgeDiscipline.name': ['Edge Proficiency', '엣지 숙련도'],
  'm7Alpha.proficiency.edgeEdgeDiscipline.description': [
    'Repeated edge discipline makes the work more efficient.',
    '엣지 규율 훈련을 반복할수록 효율이 오릅니다.',
  ],
};

export const enUSM8PositionMessages = Object.fromEntries(
  Object.entries(entries).map(([key, [en]]) => [key, en]),
) as Readonly<Record<string, string>>;
export const koKRM8PositionMessages = Object.fromEntries(
  Object.entries(entries).map(([key, [, ko]]) => [key, ko]),
) as Readonly<Record<string, string>>;
