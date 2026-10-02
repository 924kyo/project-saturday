/**
 * M12 roles and depth copy (Phase 5): role security, why the chart moved, role-aware snap moments
 * and the pregame involvement line.
 */
type Pair = readonly [en: string, ko: string];

const rows = {
  'v2.roleStatus.secure': [
    'Role secure: {name} would need {points} points on you to move past.',
    '역할 안정: {name} 선수가 앞지르려면 {points}점을 더 따라잡아야 합니다.',
  ],
  'v2.roleStatus.contested': [
    'Role contested: {name} is {points} points from moving past you. Lead by {secure} more to be secure. Their edge: {component}.',
    '역할 경쟁 중: {name} 선수가 {points}점만 더 오르면 순위가 바뀝니다. {secure}점 더 앞서면 안정권입니다. 상대 강점: {component}.',
  ],
  'v2.roleStatus.atRisk': [
    'Role at risk: {name} already grades higher; {points} more points and they move past you. Recovery: win back {secure} points, starting with {component}.',
    '역할 위기: {name} 선수가 이미 평가에서 앞서 있고 {points}점만 더 오르면 순위가 바뀝니다. 회복: {component}부터 {secure}점을 되찾으세요.',
  ],
  'v2.roleStatus.bottom': [
    'No one below you on the chart: every move from here is up.',
    '내 아래에 선수가 없습니다. 이제 위로 올라갈 일만 남았습니다.',
  ],
  'v2.roleStatus.label': ['Role security', '역할 안정성'],
  'v2.roleStatus.chip.secure': ['Secure', '안정'],
  'v2.roleStatus.chip.contested': ['Contested', '경쟁 중'],
  'v2.roleStatus.chip.atRisk': ['At risk', '위기'],
  'v2.report.reason.yours': ['Deciding factor: your {component}', '결정적 요인: 나의 {component}'],
  'v2.report.reason.theirs': [
    'Deciding factor: {name}’s {component}',
    '결정적 요인: {name} 선수의 {component}',
  ],
  'v2.report.reason.rivalForm': [
    'Deciding factor: {name}’s practice form this week',
    '결정적 요인: 이번 주 {name} 선수의 연습 컨디션',
  ],
  'v2.snapMoment.closingDrive': ['Closing drive', '마지막 드라이브'],
  'v2.snapMoment.rotationSeries': ['Rotation series', '로테이션 시리즈'],
  'v2.snapMoment.latePackage': ['Late package', '후반 패키지'],
  'v2.pregame.involvement.starter': [
    'Starter: you play throughout and are on the field for the closing drive ({min}–{max} live snaps).',
    '주전: 경기 내내 뛰며 마지막 드라이브에도 나섭니다 (실시간 스냅 {min}–{max}).',
  ],
  'v2.pregame.involvement.rotation': [
    'Rotation: you come in for series in the middle quarters ({min}–{max} live snaps).',
    '로테이션: 2–3쿼터에 시리즈 단위로 투입됩니다 (실시간 스냅 {min}–{max}).',
  ],
  'v2.pregame.involvement.reserve': [
    'Reserve: package snaps late in the game ({min}–{max} live snaps).',
    '백업: 경기 후반 패키지 플레이에 나섭니다 (실시간 스냅 {min}–{max}).',
  ],
  'v2.pregame.involvement.developmental': [
    'Developmental: a late package if the game allows ({min}–{max} live snaps).',
    '육성: 경기 상황이 허락하면 후반 패키지에 나섭니다 (실시간 스냅 {min}–{max}).',
  ],
} as const satisfies Record<string, Pair>;

function messages(index: 0 | 1) {
  return Object.fromEntries(Object.entries(rows).map(([key, pair]) => [key, pair[index]])) as {
    readonly [K in keyof typeof rows]: string;
  };
}

export const enUSM12RolesMessages = messages(0);
export const koKRM12RolesMessages = messages(1);
