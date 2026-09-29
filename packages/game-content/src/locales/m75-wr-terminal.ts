export const koKRWrTerminalMessages = {
  'career.game.phase.resolved': '스냅 결과',
  'career.game.resolved.title': '스냅 결과 확인',
  'career.game.resolved.help': '이 결과는 이미 저장되었습니다. 확인한 뒤 경기를 이어 가세요.',
  'career.game.resolved.choice': '내 선택: {decision}',
  'career.game.resolved.outcome': '{result} · {yards}야드',
  'career.game.resolved.driveFinish': '이번 드라이브의 남은 플레이는 팀이 이어서 진행합니다.',
  'career.game.resolved.continue': '경기 계속하기',
  'career.season.finalReview.title': '대학 커리어 결산',
  'career.season.finalReview.help':
    '두 시즌의 기록이 모두 확정되었습니다. 은퇴하면 이 선수가 동문 기록에 남습니다.',
  'career.season.finalReview.season': '{number}시즌 · {program}',
  'career.season.finalReview.seasonProduction': '시즌 리시빙',
  'career.season.finalReview.totals': '커리어 통산',
  'career.season.finalReview.totalRecord':
    '출전 경기 {games} · 팀 전적 {wins}승 {losses}패 {ties}무',
  'career.season.finalReview.retire': '은퇴하고 동문 기록에 남기기',
  'career.season.complete.programs': '소속 프로그램: {programs}',
  'career.season.complete.seasons': '{count}시즌 커리어',
} as const;

export const enUSWrTerminalMessages = {
  'career.game.phase.resolved': 'Snap result',
  'career.game.resolved.title': 'See how the snap played out',
  'career.game.resolved.help': 'This result is already saved. Review it, then continue the game.',
  'career.game.resolved.choice': 'Your choice: {decision}',
  'career.game.resolved.outcome': '{result} · {yards} yd',
  'career.game.resolved.driveFinish':
    'Your team plays out the rest of this drive without another snap for you.',
  'career.game.resolved.continue': 'Continue the game',
  'career.season.finalReview.title': 'Review your college career',
  'career.season.finalReview.help':
    'Both seasons are final. Retiring records this athlete in your alumni history.',
  'career.season.finalReview.season': 'Season {number} · {program}',
  'career.season.finalReview.seasonProduction': 'Season receiving',
  'career.season.finalReview.totals': 'Career totals',
  'career.season.finalReview.totalRecord':
    '{games} games played · team record {wins}-{losses}-{ties}',
  'career.season.finalReview.retire': 'Retire and join alumni history',
  'career.season.complete.programs': 'Programs: {programs}',
  'career.season.complete.seasons': '{count}-season career',
} as const satisfies Record<keyof typeof koKRWrTerminalMessages, string>;
