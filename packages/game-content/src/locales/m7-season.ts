export const m7SeasonKo = {
  'm7Direct.season.build': '이 시즌을 마친 스킬 빌드',
  'm7Direct.season.careerTotals': '동문 커리어 통산 기록',
  'm7Direct.season.championships': '전국 우승: {count}회',
  'm7Direct.season.regular': '정규 시즌을 마치며',
  'm7Direct.season.worldRound': '플레이오프 진행',
  'm7Direct.season.review': '시즌 최종 기록',
  'm7Direct.season.beginHelp':
    '정규 시즌 성적이 확정되었습니다. 플레이오프 대진을 확인하세요. 팀에 경기가 배정되면 직접 활동을 준비하고 키 스냅을 선택합니다.',
  'm7Direct.season.begin': '플레이오프 대진 확인',
  'm7Direct.season.worldOnly':
    '이번 라운드에는 우리 팀 경기가 없습니다. 다른 팀의 결과만 진행하며 선수의 훈련, 경기 기록과 성장에는 변화가 없습니다.',
  'm7Direct.season.advanceWorld': '다른 팀의 라운드 결과 확인',
  'm7Direct.season.fixture': '{home} 대 {away}',
  'm7Direct.season.champion': '이번 시즌 챔피언: {program}',
  'm7Direct.season.saveReview': '시즌 기록 저장하고 다음 단계로',
  'm7Direct.season.summary': '{season}번째 시즌 · {program}',
  'm7Direct.season.performance': '경기 {games}회 · 평균 경기 평가 {grade}',
  'm7Direct.season.role': '팀 내 역할',
  'm7Direct.season.injuries': '부상으로 출전하지 못한 주: {count}',
  'm7Direct.season.retireHelp':
    '두 시즌의 대학 커리어를 마쳤습니다. 실제 성적과 스킬 빌드, 프로그램 이력을 동문 기록으로 남깁니다.',
  'm7Direct.season.retire': '커리어 마치고 동문 기록 저장',
  'm7Direct.season.legacyFinal':
    '이전 저장 형식에서 이미 확정된 마지막 결정을 마무리합니다. 원래의 전환 및 동문 기록 규칙을 유지하며 추가 시즌 경기는 시작하지 않습니다.',
  'm7Direct.season.legacyChoice': '저장된 마지막 결정 확인',
  'm7Direct.season.comparisonHelp':
    '잔류와 세 이적 후보의 저장된 근거를 비교하세요. 예상 역할은 약속이 아닙니다. 포지션 경쟁 압력이 높을수록 출전 경쟁이 치열합니다.',
  'm7Direct.season.roomPressure': '포지션 경쟁 압력',
  'm7Direct.season.rating': '포지션 레이팅',
  'm7Direct.season.staff': '코치진 연속성',
  'm7Direct.season.relationships': '관계 점수',
  'm7Direct.season.familiarity': '익숙함 점수',
  'm7Direct.season.hub': '커리어 허브로',
} as const;

export const m7SeasonEn = {
  'm7Direct.season.build': 'Skill build at the end of this season',
  'm7Direct.season.careerTotals': 'Alumni career totals',
  'm7Direct.season.championships': 'National championships: {count}',
  'm7Direct.season.regular': 'Closing the regular season',
  'm7Direct.season.worldRound': 'Playoff round',
  'm7Direct.season.review': 'Final season record',
  'm7Direct.season.beginHelp':
    'The regular-season record is final. Check the playoff bracket. If your team has a fixture, prepare your focuses and choose your key snaps directly.',
  'm7Direct.season.begin': 'Check the playoff bracket',
  'm7Direct.season.worldOnly':
    'Your team has no fixture in this round. Only other teams’ results advance; your athlete’s training, game record, and growth do not change.',
  'm7Direct.season.advanceWorld': 'See the other teams’ round results',
  'm7Direct.season.fixture': '{home} vs {away}',
  'm7Direct.season.champion': 'Season champion: {program}',
  'm7Direct.season.saveReview': 'Save the season record and continue',
  'm7Direct.season.summary': 'Season {season} · {program}',
  'm7Direct.season.performance': '{games} games · average Game Grade {grade}',
  'm7Direct.season.role': 'Team role',
  'm7Direct.season.injuries': 'Weeks unavailable through injury: {count}',
  'm7Direct.season.retireHelp':
    'Your two-season college career is complete. Preserve your actual results, skill build, and program history as an alumnus.',
  'm7Direct.season.retire': 'Finish the career and save alumni history',
  'm7Direct.season.legacyFinal':
    'Finish the final decision already saved in the earlier format. Its original transition and alumni rules are preserved; no additional season is played.',
  'm7Direct.season.legacyChoice': 'Confirm the saved final decision',
  'm7Direct.season.comparisonHelp':
    'Compare the saved evidence for Stay and three transfer options. A projected role is not a promise. Higher room pressure means tougher competition for playing time.',
  'm7Direct.season.roomPressure': 'Position-room pressure',
  'm7Direct.season.rating': 'Position rating',
  'm7Direct.season.staff': 'Staff continuity',
  'm7Direct.season.relationships': 'Relationship score',
  'm7Direct.season.familiarity': 'Familiarity score',
  'm7Direct.season.hub': 'Return to Career Hub',
} as const satisfies Record<keyof typeof m7SeasonKo, string>;
