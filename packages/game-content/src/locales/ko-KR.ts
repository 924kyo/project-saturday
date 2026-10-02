import { koKREventBatchMessages } from './event-batch-ko-KR.js';
import { koKRInjuryBatchMessages } from './injury-batch-ko-KR.js';
import { koKRM6UiMessages } from './m6-ui-ko-KR.js';
import { koKRM7AlphaMessages } from './m7-alpha-ko-KR.js';
import { koKRM7WorldMessages } from './m7-world-ko-KR.js';
import { koKRM7QbMessages } from './m7-qb.js';
import { koKRM7RbMessages } from './m7-rb.js';
import { koKRM7CbMessages } from './m7-cb.js';
import { koKROffFieldBatchMessages } from './off-field-batch-ko-KR.js';
import { koKRHubMessages } from './m7-hub.js';
import { koKRWrTerminalMessages } from './m75-wr-terminal.js';
import { koKRVNextMessages } from './r-vnext.js';
import { koKRVNextWeekMessages } from './r-vnext-week.js';
import { koKRDefenderMessages } from './m8-defenders.js';
import { koKRDefenderUiMessages } from './m8-defenders-ui.js';
import { koKRWorldMessages } from './m8-world.js';
import { koKRWorldUiMessages } from './m8-world-ui.js';
import { koKRDraftUiMessages } from './m8-draft-ui.js';
import { koKRNilUiMessages } from './m8-nil-ui.js';
import { koKRLifeMessages } from './m8-life.js';
import { koKRAwardMessages } from './m9-awards.js';
import { koKRLegacyMessages } from './m9-legacy.js';
import { koKRM10Messages } from './m10-ui.js';
import { koKRM11LookMessages } from './m11-looks.js';
import { koKRM12Messages } from './m12-ui.js';
import { koKRM12MatchMessages } from './m12-match.js';
import { koKRM12DevelopmentMessages } from './m12-development.js';
import { koKRM12IdentityMessages } from './m12-identity.js';
import { koKRM12SchoolsMessages } from './m12-schools.js';
import { koKRM12RolesMessages } from './m12-roles.js';
import { koKRM12StoryMessages } from './m12-story.js';
import { koKRM12CardsMessages } from './m12-cards.js';
import { koKRM12ProgramMessages } from './m12-programs.js';
import { koKRM8PositionMessages } from './m8-positions.js';
import { m7BuildKo } from './m7-builds.js';
import { m7DirectKo } from './m7-direct.js';
import { m7GameDayKo } from './m7-game-day.js';
import { m7SeasonKo } from './m7-season.js';

export const koKRMessages = {
  ...m7SeasonKo,
  ...m7GameDayKo,
  ...m7DirectKo,
  ...m7BuildKo,
  ...koKRHubMessages,
  ...koKRWrTerminalMessages,
  ...koKRVNextMessages,
  ...koKRVNextWeekMessages,
  ...koKRM8PositionMessages,
  ...koKRDefenderMessages,
  ...koKRDefenderUiMessages,
  ...koKRWorldMessages,
  ...koKRWorldUiMessages,
  ...koKRDraftUiMessages,
  ...koKRNilUiMessages,
  ...koKRLifeMessages,
  ...koKRAwardMessages,
  ...koKRLegacyMessages,
  ...koKRM10Messages,
  ...koKRM11LookMessages,
  ...koKRM12Messages,
  ...koKRM12MatchMessages,
  ...koKRM12DevelopmentMessages,
  ...koKRM12IdentityMessages,
  ...koKRM12SchoolsMessages,
  ...koKRM12RolesMessages,
  ...koKRM12StoryMessages,
  ...koKRM12CardsMessages,
  ...koKRM12ProgramMessages,
  ...koKREventBatchMessages,
  ...koKRInjuryBatchMessages,
  ...koKRM6UiMessages,
  ...koKRM7AlphaMessages,
  ...koKRM7WorldMessages,
  ...koKRM7QbMessages,
  ...koKRM7RbMessages,
  ...koKRM7CbMessages,
  ...koKROffFieldBatchMessages,
  'app.statusLabel': '준비 상태',
  'app.statusReady': '로컬 커리어 시스템 준비 완료',
  'app.subtitle': '당신만의 대학 풋볼 커리어를 만들어 보세요.',
  'app.title': 'Project Saturday',
  'app.validationSummary': '{count, plural, other {콘텐츠 문제 #개}}',
  'creation.appearance.armSleeves.both': '양팔',
  'creation.appearance.armSleeves.left': '왼팔',
  'creation.appearance.armSleeves.right': '오른팔',
  'creation.appearance.bodyTypes.balanced': '균형형',
  'creation.appearance.bodyTypes.broad': '넓은 체형',
  'creation.appearance.bodyTypes.lean': '슬림형',
  'creation.appearance.eyeBlack.stripes': '두 줄',
  'creation.appearance.eyeBlack.wide': '넓게',
  'creation.appearance.faces.angular': '각진형',
  'creation.appearance.faces.oval': '타원형',
  'creation.appearance.faces.round': '둥근형',
  'creation.appearance.faces.square': '사각형',
  'creation.appearance.fields.armSleeves': '팔 슬리브',
  'creation.appearance.fields.bodyType': '체형',
  'creation.appearance.fields.eyeBlack': '아이 블랙',
  'creation.appearance.fields.face': '얼굴형',
  'creation.appearance.fields.footwear': '풋웨어',
  'creation.appearance.fields.gloves': '글러브',
  'creation.appearance.fields.hairColor': '머리색',
  'creation.appearance.fields.hairStyle': '헤어스타일',
  'creation.appearance.fields.heightCm': '키 (cm)',
  'creation.appearance.fields.jerseyFit': '저지 핏',
  'creation.appearance.fields.skinTone': '피부 톤',
  'creation.appearance.fields.towel': '타월',
  'creation.appearance.fields.visor': '바이저',
  'creation.appearance.fields.weightKg': '몸무게 (kg)',
  'creation.appearance.fields.wristTape': '손목 테이프',
  'creation.appearance.footwear.high': '하이 컷',
  'creation.appearance.footwear.low': '로우 컷',
  'creation.appearance.footwear.mid': '미드 컷',
  'creation.appearance.gloves.accent': '포인트 색상',
  'creation.appearance.gloves.dark': '어두운 색상',
  'creation.appearance.gloves.light': '밝은 색상',
  'creation.appearance.hairColors.black': '검정',
  'creation.appearance.hairColors.brown': '갈색',
  'creation.appearance.hairColors.darkBrown': '짙은 갈색',
  'creation.appearance.hairColors.lightBrown': '밝은 갈색',
  'creation.appearance.hairStyles.braids': '브레이드',
  'creation.appearance.hairStyles.closeCrop': '짧게 자른 머리',
  'creation.appearance.hairStyles.locs': '록스',
  'creation.appearance.hairStyles.mediumCurls': '중간 길이 곱슬머리',
  'creation.appearance.hairStyles.shaved': '삭발',
  'creation.appearance.hairStyles.shortCurls': '짧은 곱슬머리',
  'creation.appearance.jerseyFits.loose': '여유 있는 핏',
  'creation.appearance.jerseyFits.standard': '기본 핏',
  'creation.appearance.jerseyFits.tight': '밀착 핏',
  'creation.appearance.options.none': '없음',
  'creation.appearance.skinTones.dark': '매우 짙은 톤',
  'creation.appearance.skinTones.deep': '짙은 톤',
  'creation.appearance.skinTones.light': '밝은 톤',
  'creation.appearance.skinTones.lightMedium': '밝은 중간 톤',
  'creation.appearance.skinTones.medium': '중간 톤',
  'creation.appearance.skinTones.mediumDeep': '짙은 중간 톤',
  'creation.appearance.towels.center': '가운데',
  'creation.appearance.towels.left': '왼쪽',
  'creation.appearance.towels.right': '오른쪽',
  'creation.appearance.visors.clear': '투명',
  'creation.appearance.visors.smoke': '스모크',
  'creation.appearance.wristTape.both': '양쪽',
  'creation.appearance.wristTape.left': '왼쪽',
  'creation.appearance.wristTape.right': '오른쪽',
  'career.attributes.agility': '민첩성',
  'career.attributes.blocking': '블로킹',
  'career.attributes.burst': '폭발력',
  'career.attributes.catchInTraffic': '경합 캐치',
  'career.attributes.composure': '침착성',
  'career.attributes.conditioning': '체력',
  'career.attributes.discipline': '절제력',
  'career.attributes.durability': '내구도',
  'career.attributes.footballIq': '풋볼 IQ',
  'career.attributes.hands': '캐치',
  'career.attributes.release': '릴리스',
  'career.attributes.routeRunning': '루트 러닝',
  'career.attributes.speed': '스피드',
  'career.attributes.strength': '힘',
  'career.attributes.workEthic': '훈련 태도',
  'career.attributes.yac': '캐치 후 전진',
  'career.boot.loadFailed': '저장된 커리어를 불러오지 못했습니다. 새 커리어를 만들 수 있습니다.',
  'career.boot.loading': '저장된 커리어를 확인하고 있습니다…',
  'career.boot.noValidSave': '사용할 수 있는 저장본이 없어 새 커리어 만들기를 열었습니다.',
  'career.boot.partialLoad': '일부 저장소를 읽지 못했지만 확인된 커리어를 불러왔습니다.',
  'career.boot.recovered': '최근 정상 자동 저장본에서 커리어를 복구했습니다.',
  'career.command.failed': '현재 단계에서는 이 진행을 완료할 수 없습니다. 다시 시도해 주세요.',
  'career.home.help': '선수와 현재 상태, 다음 커리어 결정을 한눈에 확인하세요.',
  'career.home.next': '다음 할 일',
  'career.home.next.skills': '브레이크스루 선택하기',
  'career.home.next.team': '프로그램 결정 계속하기',
  'career.home.next.week': '이번 주 열기',
  'career.home.title': '커리어 홈',
  'career.navigation.home': '홈',
  'career.navigation.label': '커리어 메뉴',
  'career.navigation.player': '선수',
  'career.navigation.skills': '스킬',
  'career.navigation.team': '팀',
  'career.navigation.week': '주간',
  'career.skills.empty': '첫 브레이크스루를 달성하면 스킬 빌드가 시작됩니다.',
  'career.skills.pageHelp': '현재 빌드와 보유 스킬, 브레이크스루 선택을 확인하세요.',
  'career.skills.pageTitle': '스킬 빌드',
  'career.skills.breakthrough.confirm': '선택한 스킬 습득',
  'career.skills.breakthrough.help':
    '완료한 주간 활동이 게이지를 채우고 저장된 제안의 구성을 결정했습니다. 새 스킬 하나를 선택하세요.',
  'career.skills.breakthrough.legend': '스킬 카드 하나 선택',
  'career.skills.breakthrough.saving': '스킬 저장 중…',
  'career.skills.effects.applied': '적용된 스킬 효과',
  'career.skills.effects.body': '{skill}: 몸 상태 {value}',
  'career.skills.effects.bodyCost': '{skill}: 몸 상태 소모 {value}',
  'career.skills.effects.gpa': '{skill}: GPA {value}',
  'career.skills.effects.confidence': '{skill}: 자신감 {value}',
  'career.skills.effects.practice': '{skill}: 연습 평가 반영값 {value}',
  'career.skills.effects.preparation': '{skill}: 준비도 {value}',
  'career.skills.effects.passiveBody': '{skill}: 주간 회복량 {value}',
  'career.skills.effects.xp': '{skill}: 능력치 XP {value}',
  'career.skills.inventory.acquired': '{count}주차 종료 후 획득',
  'career.skills.inventory.count': '{count}개 보유',
  'career.skills.inventory.equipped': '{count}번 슬롯에 장착',
  'career.skills.inventory.help':
    '네 슬롯에 장착한 스킬이 현재 빌드를 결정합니다. 변경하면 즉시 저장됩니다.',
  'career.skills.inventory.locked': '행동 계획 단계에서만 장착 스킬을 바꿀 수 있습니다.',
  'career.skills.inventory.owned': '보유 스킬',
  'career.skills.inventory.title': '스킬과 장착 슬롯',
  'career.skills.gauge.aria': '브레이크스루 게이지: {required} 중 {current}',
  'career.skills.gauge.help':
    '{remaining}포인트를 더 모으면 제안이 열립니다. 성장, 코치 평가, 멘탈, 몸 관리, 경기, 학교생활이 모두 기여할 수 있습니다.',
  'career.skills.gauge.label': '다음 보상',
  'career.skills.gauge.latestEvidence': '{count}주차 진행 내역',
  'career.skills.gauge.noEvidence':
    '한 주를 완료하면 다음 스킬에 기여한 요소를 확인할 수 있습니다.',
  'career.skills.gauge.noPoints':
    '이번 주에는 게이지가 오르지 않았습니다. 주간 활동의 균형을 바꿔 보세요.',
  'career.skills.gauge.points': '게이지 +{count}포인트',
  'career.skills.gauge.ready': '브레이크스루 준비 완료',
  'career.skills.gauge.readyHelp':
    '획득한 제안은 저장되었습니다. 아래 진행 요소가 세 카드 구성에 반영됩니다.',
  'career.skills.gauge.source.body': '몸 관리',
  'career.skills.gauge.source.development': '선수 성장',
  'career.skills.gauge.source.gameDay': '경기 활약',
  'career.skills.gauge.source.life': '학업과 생활',
  'career.skills.gauge.source.mindset': '멘탈',
  'career.skills.gauge.source.roleCoach': '역할과 코치',
  'career.skills.gauge.title': '브레이크스루 게이지',
  'career.skills.gauge.triggerEvidence': '{count}주차 종료 후 브레이크스루 달성',
  'career.skills.gauge.value': '{current} / {required}',
  'career.skills.passive.applied': '몸 상태 회복 적용',
  'career.skills.passive.bodyChange': '몸 상태 {before} → {after} ({delta})',
  'career.skills.passive.preview': '다음 주 진행 시 회복',
  'career.skills.slot.empty': '장착 스킬 없음',
  'career.skills.slot.label': '스킬 슬롯 {count}',
  'career.skills.slot.open': '빈 슬롯',
  'career.skills.tradeoff': '장단점',
  'career.creation.appearance.help': '외형 선택은 경기 능력에 영향을 주지 않습니다.',
  'career.creation.appearance.title': '선수 외형',
  'career.creation.archetype': 'WR 아키타입',
  'career.creation.background': '리크루팅 배경',
  'career.creation.body.help': '키와 몸무게는 선수 프로필에 저장되며 외형 정체성을 구성합니다.',
  'career.creation.body.title': '신체 정보',
  'career.creation.creating': '커리어 저장 중…',
  'career.creation.displayName': '선수 이름',
  'career.creation.errors.body': '키와 몸무게를 허용 범위 안에서 입력해 주세요.',
  'career.creation.errors.heading': '선수 정보를 확인해 주세요.',
  'career.creation.errors.mechanics': '선택한 선수 조합을 구성할 수 없습니다.',
  'career.creation.errors.name': '앞뒤 공백 없이 1자 이상 40자 이하의 이름을 입력해 주세요.',
  'career.creation.errors.personalities': '서로 어울리는 성격 두 가지를 선택해 주세요.',
  'career.creation.errors.player': '선수 생성에 실패했습니다. 입력값을 다시 확인해 주세요.',
  'career.creation.eyebrow': '새로운 커리어',
  'career.creation.heightImperial': '키',
  'career.creation.heightMetric': '키 (cm)',
  'career.creation.identity.title': '어떤 선수인가요?',
  'career.creation.intro': '배경과 성격, 플레이 스타일이 다른 출발점을 만듭니다.',
  'career.creation.legacy.eyebrow': '나의 프로그램 역사',
  'career.creation.legacy.help':
    '{name} 선수가 동문으로 남아 있습니다. 새 선수의 능력치, 스킬, 역할, 스냅은 다시 쌓아야 합니다.',
  'career.creation.legacy.title': '완료한 커리어 {count}개가 기록되어 있습니다',
  'career.creation.personality': '성격 두 가지',
  'career.creation.personalityCount': '{count} / {total} 선택',
  'career.creation.personalityHelp':
    '서로 충돌하는 성격은 선택할 수 없습니다. 선택한 항목을 다시 누르면 해제됩니다.',
  'career.creation.personalityUnavailable': '현재 선택과 함께 사용할 수 없음',
  'career.creation.preview.help': '외형을 선택할 때마다 선수 모습이 바로 바뀝니다.',
  'career.creation.preview.title': '선수 미리보기',
  'career.creation.preview.unnamed': '새로운 WR',
  'career.creation.steps.appearance': '2단계 · 외형',
  'career.creation.steps.body': '3단계 · 신체',
  'career.creation.steps.identity': '1단계 · 정체성',
  'career.creation.submit': 'WR 커리어 시작',
  'career.creation.title': '나만의 WR을 만드세요',
  'career.creation.weightImperial': '몸무게',
  'career.creation.weightMetric': '몸무게 (kg)',
  'career.player.appearance': '외형 상세',
  'career.player.attributeXp': 'XP {count}',
  'career.player.attributes': '전체 능력치',
  'career.player.body': '몸 상태',
  'career.player.brand': '브랜드',
  'career.player.coachTrust': '코치 신뢰',
  'career.player.confidence': '자신감',
  'career.player.preparation': '준비도',
  'career.player.portraitLabel': '{name} 선수의 저장된 외형',
  'career.player.gpa': 'GPA',
  'career.player.height': '키',
  'career.player.overall': 'OVR',
  'career.player.profile': '선수 프로필',
  'career.player.profileLabel': '정체성과 성장',
  'career.player.proficiency.currentBenefit': '현재 효과: 능력치 XP {value}',
  'career.player.proficiency.help':
    '같은 집중 훈련을 반복하면 해당 훈련의 능력치 성장 효율이 높아집니다.',
  'career.player.proficiency.label': '훈련 적응도',
  'career.player.proficiency.level': '레벨 {count}',
  'career.player.proficiency.max': '최고 숙련도에 도달했습니다',
  'career.player.proficiency.nextBenefit': '레벨 {level}: 능력치 XP {value}',
  'career.player.proficiency.nextThreshold':
    '{uses}회 사용 · {count}회에 다음 단계 (앞으로 {remaining}회)',
  'career.player.proficiency.progressAria': '{action}: 현재 {uses}회 완료',
  'career.player.proficiency.title': '훈련 숙련도',
  'career.player.progression.help':
    '{archetype} 중점 능력치는 {attributes}입니다. 각 막대는 다음 능력치까지의 진행도를 보여 줍니다.',
  'career.player.progression.key': '아키타입 중점',
  'career.player.progression.label': '능력치 성장',
  'career.player.progression.title': '능력치와 XP',
  'career.player.status': '선수 핵심 상태',
  'career.player.week': '{count}주차',
  'career.player.weight': '몸무게',
  'career.position.wr': '와이드 리시버',
  'career.progress.aria': '{name}: XP {current} / {required}',
  'career.progress.maxRating': '최고 능력치',
  'career.progress.ratingGain': '능력치 +{count}',
  'career.progress.toNextRating': '능력치 {rating}까지 XP {count}',
  'career.progress.xp': 'XP {current} / {required}',
  'career.program.depth.practiceForm': '훈련 폼',
  'career.program.depth.outlookHelp':
    '현재 순위와 프로그램 로테이션이 이 범위를 정합니다. 패키지와 경기 상황에 따라 실제 스냅 수는 달라질 수 있습니다.',
  'career.program.depth.outlookRole': 'WR{rank} · {role}',
  'career.program.depth.outlookTitle': '예상 출전 비중',
  'career.program.depth.rank': 'WR{count}',
  'career.program.depth.role': '현재 역할',
  'career.program.depth.snaps': '예상 출전 스냅',
  'career.program.depth.title': 'WR 뎁스 차트',
  'career.program.opportunity.advancement':
    'WR{rank} {name} 선수가 다음 승격을 위해 넘어야 할 상대입니다.',
  'career.program.opportunity.cause.depth':
    '재능 적합도, 코치 신뢰, 훈련 폼, 전술 적합도, 경험 준비도가 뎁스 순서를 만듭니다.',
  'career.program.opportunity.cause.formTrust':
    '훈련 등급은 최근 훈련 폼을 갱신하고 코치 신뢰를 움직일 수 있습니다.',
  'career.program.opportunity.cause.practiceGrade':
    '집중 활동, 몸 상태, 역할별 준비도, 자신감이 훈련 등급을 만듭니다.',
  'career.program.opportunity.cause.snaps':
    '뎁스 순위와 프로그램 로테이션 정책이 예상 출전 범위를 정합니다.',
  'career.program.opportunity.factor.coachTrust': '코치 신뢰',
  'career.program.opportunity.factor.experienceReadiness': '경험 준비도',
  'career.program.opportunity.factor.practiceForm': '훈련 폼',
  'career.program.opportunity.factor.schemeFit': '전술 적합도',
  'career.program.opportunity.factor.talentFit': '재능 적합도',
  'career.program.opportunity.factorHelp':
    '저장된 평가 요소의 방향을 비교하며, 소수점 종합 점수는 표시하지 않습니다.',
  'career.program.opportunity.relation.competitorEdge': '상대 우세',
  'career.program.opportunity.relation.even': '대등',
  'career.program.opportunity.relation.playerEdge': '내 우세',
  'career.program.opportunity.roleSecurity':
    'WR{rank} {name} 선수가 현재 자리를 가장 가까이에서 추격하고 있습니다.',
  'career.program.opportunity.suggestionsTitle': '다음에 보완할 점',
  'career.program.opportunity.suggestion.coachTrust':
    '더 좋은 훈련 등급을 쌓으세요. 매주 결과가 코치 신뢰를 높일 수 있습니다.',
  'career.program.opportunity.suggestion.experienceReadiness':
    '주어진 풋볼 스냅을 살리세요. 실제 출전이 경기 준비도를 키웁니다.',
  'career.program.opportunity.suggestion.practiceForm':
    '매주 훈련 등급을 높게 유지하세요. 최근 훈련 폼은 다음 주에도 이어집니다.',
  'career.program.opportunity.suggestion.schemeFit':
    '이 공격 전술이 중시하는 WR 특성에 맞춰 성장해 전술 적합도 차이를 줄이세요.',
  'career.program.opportunity.suggestion.sustainEdge':
    '좋은 훈련 등급을 반복하고 준비 상태를 지키세요. 근소한 우세도 순위 변경 기준을 넘어야 합니다.',
  'career.program.opportunity.suggestion.talentFit':
    '이 공격 전술이 중시하는 WR 능력치를 훈련해 재능 적합도를 높이세요.',
  'career.program.opportunity.title': '다음 경쟁 상대',
  'career.program.opportunity.whyTitle': '현재 WR{rank}인 이유',
  'career.program.movement.demoted': '뎁스 차트에서 내려갔습니다',
  'career.program.movement.held': '현재 순위를 지켰습니다',
  'career.program.movement.heldReason': '평가 차이가 순위 변경 기준을 넘지 못했습니다.',
  'career.program.movement.gradeBase': '팀 훈련 기본점수',
  'career.program.movement.gradeBreakdown': '훈련 등급 계산 방식',
  'career.program.movement.gradeFocus': '세 가지 집중 활동',
  'career.program.movement.gradeFormula':
    '기본점수 + 집중 활동 + 몸 상태 + 역할별 준비도 + 자신감으로 계산하며, 합계는 0~100 범위입니다.',
  'career.program.movement.promoted': '뎁스 차트에서 올라갔습니다',
  'career.program.movement.rank': 'WR{before} → WR{after}',
  'career.program.movement.weeklyPractice': '훈련 등급',
  'career.program.projectedDepth.developmental': '장기 육성 경로',
  'career.program.projectedDepth.reserve': '리저브 경쟁 경로',
  'career.program.projectedDepth.rotation': '로테이션 경쟁 경로',
  'career.program.projectedDepth.starter': '스타터 경쟁 경로',
  'career.program.rating.academics': '학업',
  'career.program.rating.development': '선수 육성',
  'career.program.rating.nil': 'NIL 시장',
  'career.program.rating.prestige': '명성',
  'career.program.recruiting.commit': '이 프로그램 선택',
  'career.program.recruiting.eyebrow': '프로그램 리크루팅',
  'career.program.recruiting.help':
    '제안은 한 번만 선택할 수 있습니다. 명성과 출전 기회, 성장 환경을 함께 비교하세요.',
  'career.program.recruiting.legend': '다섯 개 제안 중 하나 선택',
  'career.program.recruiting.profile': '유망주 프로필',
  'career.program.recruiting.projectedDepth': '예상 뎁스 경로',
  'career.program.recruiting.saving': '프로그램 저장 중…',
  'career.program.recruiting.schemeFit': '전술 적합도',
  'career.program.recruiting.score': '리크루트 점수 {count}',
  'career.program.recruiting.startAction': '프로그램 제안 확인',
  'career.program.recruiting.startHelp':
    '이전 저장본의 진행은 그대로 유지됐습니다. 현재 선수 프로필로 결정된 제안을 확인하세요.',
  'career.program.recruiting.startTitle': '대학 프로그램을 선택할 차례입니다',
  'career.program.recruiting.tier.developmental': '육성형 유망주',
  'career.program.recruiting.tier.national': '전국급 유망주',
  'career.program.recruiting.tier.priority': '우선 영입 유망주',
  'career.program.recruiting.title': '첫 프로그램을 선택하세요',
  'career.program.role.developmental': '육성',
  'career.program.role.reserve': '리저브',
  'career.program.role.rotation': '로테이션',
  'career.program.role.starter': '스타터',
  'career.program.room.competitorName': '{given} {family}',
  'career.program.room.count': 'WR {count}명',
  'career.program.room.meta': '{classYear}학년 · {role}',
  'career.program.room.score': '평가 {value}',
  'career.program.room.title': 'WR 포지션 룸',
  'career.program.room.you': '(나)',
  'career.program.strength.builder': '성장형',
  'career.program.strength.contender': '상위 경쟁권',
  'career.program.strength.national': '전국 우승권',
  'career.program.traits': '프로그램 특성',
  'career.save.failed':
    '진행 상황을 저장하지 못했습니다. 저장이 완료될 때까지 다음 단계로 진행할 수 없습니다.',
  'career.save.reload': '저장본 다시 불러오기',
  'career.save.retry': '저장 다시 시도',
  'career.units.feet': '피트',
  'career.units.inches': '인치',
  'career.game.keySnap.title': '핵심 스냅 플레이',
  'career.game.grade.developing': '성장 필요',
  'career.game.grade.elite': '최상급',
  'career.game.grade.poor': '아쉬움',
  'career.game.grade.solid': '안정적',
  'career.game.grade.strong': '강한 경기력',
  'career.game.information.diagnostic': '정확한 진단',
  'career.game.information.filmApplied': '이번 주 필름 스터디가 판독에 반영되었습니다.',
  'career.game.information.filmNotApplied': '이번 스냅에는 필름 스터디 보너스가 없습니다.',
  'career.game.information.noClues': '확실한 커버리지 단서는 아직 보이지 않습니다.',
  'career.game.information.partial': '부분 판독',
  'career.game.information.title': '스냅 정보',
  'career.game.information.uncertain': '불확실',
  'career.game.keySnap.choose': '이 스냅에서 실행할 리시버 기술을 선택하세요.',
  'career.game.lastPlay': '직전 스냅: {result} · {yards}야드',
  'career.game.matchup': '경기 대진',
  'career.game.matchupVersus': 'VS',
  'career.game.no': '아니요',
  'career.game.opportunityProgress': '키 스냅 {count}/{total}',
  'career.game.phase.keySnap': '핵심 스냅',
  'career.game.phase.postGame': '경기 종료',
  'career.game.phase.preview': '경기 프리뷰',
  'career.game.play.drop': '드롭',
  'career.game.play.incomplete': '패스 실패',
  'career.game.play.notTargeted': '타깃 없음',
  'career.game.play.reception': '리셉션',
  'career.game.play.touchdown': '터치다운',
  'career.game.play.turnover': '턴오버',
  'career.game.postGame.attributeXp': '경기 XP +{count}',
  'career.game.postGame.continue': '경기 정리 후 다음 주로',
  'career.game.postGame.grade': '퍼포먼스 등급',
  'career.game.postGame.gradeHelp': '생산성, 실수, 선택 적합도를 기회 수에 맞춰 평가합니다.',
  'career.game.postGame.growth': '경기 영향',
  'career.game.postGame.noAttributeXp': '공격 기회가 없어 능력치 XP는 오르지 않았습니다.',
  'career.game.postGame.playResult': '{result} · {yards}야드 · 선택 적합도 {fit}',
  'career.game.postGame.plays': '키 스냅 기록 보기',
  'career.game.postGame.record': '커리어 전적 {wins}승 {losses}패 {ties}무',
  'career.game.postGame.stats': '리시빙 기록',
  'career.game.postGame.title': '경기 결과',
  'career.game.preview.filmStudy': '필름 스터디',
  'career.game.preview.help': '이번 주 준비와 확보한 역할을 확인한 뒤 경기를 시작하세요.',
  'career.game.preview.opportunities': '예상 키 스냅',
  'career.game.preview.opportunityHelp': '표시된 기회마다 한 명의 리시버로서 중요한 선택을 합니다.',
  'career.game.preview.open': '게임 데이 열기',
  'career.game.preview.role': '경기 역할',
  'career.game.preview.start': '경기 시작',
  'career.game.preview.title': '다음 경기',
  'career.game.preview.zeroOpportunity':
    '공격 키 스냅은 없지만 현재 역할에 맞는 경기 참여와 피드백이 기록됩니다.',
  'career.game.result.loss': '패배',
  'career.game.result.tie': '무승부',
  'career.game.result.win': '승리',
  'career.game.saving': '경기 저장 중…',
  'career.game.scoreboard': '경기 점수',
  'career.game.situation': '{period}쿼터 {clock} · {down}다운 {distance}야드 · {yardLine}야드 지점',
  'career.game.stats.drops': '드롭',
  'career.game.stats.receptions': '리셉션',
  'career.game.stats.targets': '타깃',
  'career.game.stats.touchdowns': '터치다운',
  'career.game.stats.turnovers': '턴오버',
  'career.game.stats.yards': '리시빙 야드',
  'career.game.venue.away': '원정 경기',
  'career.game.venue.home': '홈 경기',
  'career.game.yes': '예',
  'career.week.addAction': '집중 활동 추가',
  'career.week.commit': '집중 활동 세 개 확정',
  'career.week.draft.empty': '집중 활동을 선택하세요',
  'career.week.draft.moveDown': '한 칸 아래로 이동',
  'career.week.draft.moveUp': '한 칸 위로 이동',
  'career.week.draft.remove': '{action} 삭제',
  'career.week.end.advance': '다음 주로 진행',
  'career.week.end.help': '세 가지 집중 활동의 결과와 풋볼 결과를 확인하세요.',
  'career.week.end.passiveRecovery': '다음 주로 넘어가면 몸 상태를 {count} 회복합니다.',
  'career.week.end.preparationRollover':
    '다음 주 준비도는 중립값을 향해 일부 이월됩니다: {before} → {after}.',
  'career.week.end.title': '주간 정리',
  'career.week.breakthrough.title': '스킬 브레이크스루',
  'career.week.phase.breakthrough': '브레이크스루',
  'career.week.phase.end': '주간 종료',
  'career.week.phase.plan': '주간 집중 활동',
  'career.week.phase.resolve': '집중 활동 진행',
  'career.week.phaseLabel': '현재 단계',
  'career.week.plan.help':
    '팀 훈련은 자동으로 진행됩니다. 추가로 집중할 활동 세 개를 고르세요. 순서대로 진행되며 중복 선택할 수 있습니다.',
  'career.week.plan.title': '이번 주 집중 활동을 정하세요',
  'career.week.preview': '장착 스킬 적용 전 기본 변화',
  'career.week.practiceImpact': '훈련 등급 집중 활동',
  'career.week.queue.complete': '완료',
  'career.week.queue.current': '다음 행동',
  'career.week.queue.waiting': '대기',
  'career.week.remaining': '남은 행동',
  'career.week.resolve.next': '다음 집중 활동 진행',
  'career.week.resolve.title': '집중 활동 진행',
  'career.week.result.actionNumber': '{count}번째 집중 활동',
  'career.week.result.appliedXp': '적용 XP +{count}',
  'career.week.result.bodyEfficiency': '몸 상태 효율: {value}',
  'career.week.result.breakdown': 'XP 계산 상세',
  'career.week.result.latest': '방금 얻은 결과',
  'career.week.result.proficiency': '훈련 숙련도',
  'career.week.result.proficiencyLevel': '레벨 {before} → {after}',
  'career.week.result.proficiencyUses': '사용 {before} → {after}',
  'career.week.result.xpBreakdown': '기본 {base} · 획득 {awarded} · 적용 {applied}',
  'career.week.saving': '저장 중…',
  'career.week.strategyStatus': '현재 주간 전략 상태',
  'creation.archetypes.deepThreat.description':
    '스피드와 폭발력이 뛰어난 대신 캐치와 경합 캐치가 낮은 상태로 시작합니다.',
  'creation.archetypes.deepThreat.name': '딥 스렛',
  'creation.archetypes.possessionReceiver.description':
    '확실한 캐치와 경합 능력, 힘이 강한 대신 스피드와 폭발력이 낮은 상태로 시작합니다.',
  'creation.archetypes.possessionReceiver.name': '포제션 리시버',
  'creation.archetypes.routeTechnician.description':
    '정교한 루트 러닝과 릴리스가 강점이지만 스피드와 힘은 낮은 상태로 시작합니다.',
  'creation.archetypes.routeTechnician.name': '루트 테크니션',
  'creation.backgrounds.blueChipStar.description':
    '폭발력과 릴리스가 다듬어진 최상급 유망주입니다. 높은 기대를 받지만 내구성과 블로킹 준비는 부족합니다.',
  'creation.backgrounds.blueChipStar.name': '최상급 유망주',
  'creation.backgrounds.lateBloomer.description':
    '성장 시기가 늦어 기본기는 덜 다듬어졌지만 강한 훈련 태도와 체력을 갖췄습니다.',
  'creation.backgrounds.lateBloomer.name': '늦게 핀 유망주',
  'creation.backgrounds.legacyRecruit.description':
    '풋볼 환경에서 자라 경기 이해와 침착함이 뛰어납니다. 대신 힘과 체력 기반은 더 길러야 하며 가족의 기대를 받습니다.',
  'creation.backgrounds.legacyRecruit.name': '레거시 유망주',
  'creation.backgrounds.smallTownStar.description':
    '공을 잡고 전진하는 능력은 검증됐지만 복잡한 전술과 세련된 릴리스 경험은 부족합니다.',
  'creation.backgrounds.smallTownStar.name': '작은 도시의 스타',
  'creation.backgrounds.underRecruitedAthlete.description':
    '민첩성과 훈련 의지는 강하지만 루트 러닝과 캐치 기본기는 아직 거칩니다.',
  'creation.backgrounds.underRecruitedAthlete.name': '저평가된 운동 능력형 유망주',
  'creation.personalities.competitive.description':
    '경쟁에서 훈련 동력을 얻지만 시작부터 스스로를 몰아붙여 몸 상태가 조금 낮습니다.',
  'creation.personalities.competitive.name': '경쟁적',
  'creation.personalities.confident.description':
    '높은 자신감으로 시작하지만 확신이 앞서 위기에서의 침착함은 조금 낮습니다.',
  'creation.personalities.confident.name': '자신감 넘침',
  'creation.personalities.disciplined.description':
    '규칙적인 준비로 절제력이 높지만 조심스러운 출발 탓에 초기 자신감은 조금 낮습니다.',
  'creation.personalities.disciplined.name': '절제된',
  'creation.personalities.hotHeaded.description':
    '감정의 에너지로 자신감을 얻지만 절제력이 낮아 돌발 상황에 휘말릴 수 있습니다.',
  'creation.personalities.hotHeaded.name': '다혈질',
  'creation.personalities.independent.description':
    '스스로 훈련을 밀고 나가지만 코치진과 신뢰를 쌓는 데 더 많은 시간이 필요합니다.',
  'creation.personalities.independent.name': '독립적',
  'creation.personalities.leader.description':
    '솔선수범해 코치의 초기 신뢰를 얻지만 추가로 팀을 챙기느라 몸 상태가 조금 낮습니다.',
  'creation.personalities.leader.name': '리더',
  'creation.personalities.quiet.description':
    '차분하게 상황을 읽어 침착함이 높지만 낮은 노출도로 브랜드 출발은 느립니다.',
  'creation.personalities.quiet.name': '과묵한',
  'creation.personalities.social.description':
    '교류를 즐겨 브랜드 기반을 빠르게 만들지만 초기 학업 성적에는 작은 부담이 생깁니다.',
  'creation.personalities.social.name': '사교적',
  'help.close': '닫기',
  'help.guides': '안내 주제',
  'help.intro':
    '각 시스템이 바꾸는 것을 다시 읽거나, 해당 화면에서 안내를 다시 표시할 수 있습니다.',
  'help.label': '지원',
  'help.open': '도움말',
  'help.replayAll': '모든 안내 다시 보기',
  'help.replayTopic': '해당 화면에서 다시 보기',
  'help.title': '도움말 및 설정',
  'locale.enUS': '영어',
  'locale.koKR': '한국어',
  'locale.label': '언어',
  'onboarding.complete': '알겠어요',
  'onboarding.creation.consequence':
    '아키타입, 배경, 성격은 시작 능력치와 상태, 태그, 리크루팅 적합도, 이후의 자격 조건을 바꿉니다. 저장한 외형은 이 커리어에서 계속 유지됩니다.',
  'onboarding.creation.purpose':
    '커리어 전체에서 정체성과 성장 경로가 이어질 한 명의 선수를 만드세요.',
  'onboarding.creation.title': '뚜렷한 선수를 만드세요',
  'onboarding.label': '빠른 안내',
  'onboarding.skills.consequence':
    '매주의 행동이 돌파 게이지를 채우고 관련 카드가 등장할 가능성을 높입니다. 장착 카드는 성장, 역할과 신뢰, 경기, 멘탈, 몸 관리, 생활 선택을 바꿀 수 있습니다.',
  'onboarding.skills.purpose':
    '원하는 커리어에 맞는 4장 빌드를 만들고, 기다려 온 돌파 선택을 획득하세요.',
  'onboarding.skills.title': '나만의 빌드를 설계하세요',
  'onboarding.skipAll': '모든 안내 건너뛰기',
  'onboarding.team.consequence':
    '재능 적합도, 코치 신뢰, 연습 폼, 전술 적합도, 준비도가 뎁스 순위를 정합니다. 포지션 코치, 동료, 경쟁자와의 관계도 신뢰, 이적 정보와 출전 스냅을 바꿉니다.',
  'onboarding.team.purpose':
    '팀 화면에서 현재 기회와 더 큰 역할을 얻는 데 도움이 될 요소를 확인하세요.',
  'onboarding.team.title': '뎁스 경로를 읽으세요',
  'onboarding.week.consequence':
    '세 집중 블록은 몸 상태, 준비도, 자신감, GPA, XP와 연습 등급을 바꿉니다. 학업 평가는 경기 기회를 없앨 수 있고, 수락한 NIL 약속은 집중력을 쓰며 해당 주마다 이행하거나 불이행해야 합니다.',
  'onboarding.week.purpose':
    '팀 일정은 자동으로 진행됩니다. 이번 주를 결정할 추가 훈련과 회복을 선택하세요.',
  'onboarding.week.title': '주간 우선순위를 정하세요',
  'skills.balancedCalendarB.description': '학업 보충을 할 때 몸 상태를 8 회복합니다.',
  'skills.balancedCalendarB.name': '균형 잡힌 일정',
  'skills.broadHorizonB.description':
    '서로 다른 훈련 행동 세 가지를 계획하면 훈련 XP가 15% 증가하고, 같은 훈련을 반복하면 해당 XP가 10% 감소합니다.',
  'skills.broadHorizonB.name': '넓은 시야',
  'skills.compressedRecoveryS.description':
    '훈련의 몸 상태 소모가 20% 줄어들지만 주간 종료 회복량이 6 줄어듭니다.',
  'skills.compressedRecoveryS.name': '압축 회복',
  'skills.coverageLedgerB.description':
    '필름 스터디 XP가 10% 증가하고, 적용 가능한 키 스냅에서 커버리지 단서를 하나 더 확인합니다.',
  'skills.coverageLedgerB.name': '커버리지 노트',
  'skills.edgeOfFocusA.description':
    '몸 상태가 40 이하이면 훈련 XP가 25% 증가하지만 몸 상태 소모도 25% 늘어납니다.',
  'skills.edgeOfFocusA.name': '몰입의 경계',
  'skills.emptyTankRepsA.description':
    '몸 상태가 35 이하이면 훈련 XP가 30% 증가하지만 몸 상태 소모도 20% 늘어납니다.',
  'skills.emptyTankRepsA.name': '한계 반복',
  'skills.family.body': '몸 관리',
  'skills.family.development': '성장',
  'skills.family.roleCoach': '역할 / 코치',
  'skills.family.gameDay': '경기',
  'skills.family.life': '생활',
  'skills.family.mindset': '멘탈',
  'skills.firstStepLabB.description':
    '릴리스 훈련의 능력치 XP가 20% 증가하지만 몸 상태 소모도 10% 늘어납니다.',
  'skills.firstStepLabB.name': '첫 스텝 연구실',
  'skills.fullRouteCircuitA.description':
    '추가 훈련의 능력치 XP가 25% 증가하지만 몸 상태 소모도 20% 늘어납니다.',
  'skills.fullRouteCircuitA.name': '풀 루트 서킷',
  'skills.grade.a': 'A 등급',
  'skills.grade.b': 'B 등급',
  'skills.grade.c': 'C 등급',
  'skills.grade.s': 'S 등급',
  'skills.highPointWagerA.description':
    '캐치 훈련 XP가 10% 증가합니다. 공격적인 경합 캐치 성공 확률이 8%p 높아지지만 팁 턴오버 위험도 5%p 높아집니다.',
  'skills.highPointWagerA.name': '하이포인트 승부수',
  'skills.lateSetEngineB.description':
    '몸 상태가 60 이상이면 훈련의 몸 상태 소모가 15% 줄어듭니다.',
  'skills.lateSetEngineB.name': '후반 세트 엔진',
  'skills.oneMoreRepC.description':
    '같은 훈련 행동을 이번 주 두 번째 또는 세 번째로 실행하면 XP가 12% 증가합니다.',
  'skills.oneMoreRepC.name': '한 번 더',
  'skills.openFieldDareS.description':
    '스피드 훈련 XP가 10% 증가합니다. 공격적인 캐치 후 전진 거리가 20% 늘어나지만 펌블 위험도 25% 증가합니다.',
  'skills.openFieldDareS.name': '오픈필드 승부수',
  'skills.recoveryWindowC.description': '회복 행동으로 몸 상태를 8 더 회복합니다.',
  'skills.recoveryWindowC.name': '회복 타이밍',
  'skills.resetRitualB.description': '회복 바로 다음에 실행하는 훈련의 XP가 15% 증가합니다.',
  'skills.resetRitualB.name': '리셋 루틴',
  'skills.routeNotebookC.description': '루트 훈련으로 얻는 능력치 XP가 15% 증가합니다.',
  'skills.routeNotebookC.name': '루트 노트',
  'skills.secureHandsRoutineB.description':
    '캐치 훈련의 능력치 XP가 15% 증가하고 몸 상태 소모가 10% 줄어듭니다.',
  'skills.secureHandsRoutineB.name': '안정 캐치 루틴',
  'skills.studyBufferC.description': '학업 보충으로 얻는 GPA가 0.05 더 증가합니다.',
  'skills.studyBufferC.name': '학업 안전망',
  'skills.twoTrackWeekA.description':
    '학업 보충의 GPA 증가량이 0.05 줄어들지만, 바로 다음 훈련의 XP가 25% 증가합니다.',
  'skills.twoTrackWeekA.name': '투트랙 주간',
  'skills.assignmentEchoC.description':
    '필름 스터디가 준비도 +3을 제공하고 해당 핵심 스냅의 과제 수행 안정성을 높입니다.',
  'skills.assignmentEchoC.name': '과제 복기',
  'skills.cleanInstallB.description':
    '루트 훈련과 릴리스 훈련이 커밋 이후 훈련 영향도 +2를 제공합니다.',
  'skills.cleanInstallB.name': '깔끔한 설치',
  'skills.packageMemoryB.description':
    '필름 스터디가 준비도 +4를 제공하고 패키지 스냅 기회를 높입니다.',
  'skills.packageMemoryB.name': '패키지 기억',
  'skills.quietCheckinC.description':
    '회복이 자신감 +5를 제공하고 훈련 영향도 손실 1점을 상쇄합니다.',
  'skills.quietCheckinC.name': '조용한 면담',
  'skills.trustWindowA.description':
    '추가 훈련의 훈련 영향도가 +4 증가하지만 자신감이 3 감소합니다.',
  'skills.trustWindowA.name': '신뢰의 창',
  'skills.signalReaderA.description':
    '필름 스터디가 준비도 +6을 제공하고 과제 수행 안정성과 압박 대처를 높입니다.',
  'skills.signalReaderA.name': '사인 리더',
  'skills.coachesKeyS.description':
    '필름 스터디와 추가 훈련이 준비도 +5와 훈련 영향도 +5를 제공하지만 자신감이 4 감소하며, 패키지와 압박 상황 기회가 향상됩니다.',
  'skills.coachesKeyS.name': '코치의 열쇠',
  'skills.composureAnchorB.description':
    '필름 스터디와 회복이 자신감 +5를 제공하고 압박 상황의 침착함을 높입니다.',
  'skills.composureAnchorB.name': '침착함의 닻',
  'skills.campusBridgeB.description':
    '학업 보충의 GPA가 0.05 더 증가하고, 해당 NIL 보상이 10%, 긍정적 관계 상승이 20% 늘며 캠퍼스 이벤트 선택지 하나가 열립니다.',
  'skills.campusBridgeB.name': '캠퍼스 연결고리',
  'skills.stemLibraryC.description': '루트 훈련과 릴리스 훈련의 능력치 XP가 8% 증가합니다.',
  'skills.stemLibraryC.name': '스템 라이브러리',
  'skills.catchPointMapB.description':
    '핸즈·캐치 훈련의 능력치 XP가 15% 증가하고 준비도가 2 상승합니다.',
  'skills.catchPointMapB.name': '캐치 지점 지도',
  'skills.accelerationLadderB.description':
    '스피드 훈련의 능력치 XP가 20% 증가하지만 Body 소모가 10% 커집니다.',
  'skills.accelerationLadderB.name': '가속 사다리',
  'skills.techniqueChainA.description':
    '주간 행동 세 가지가 모두 다르면 훈련 능력치 XP가 20% 증가하고 훈련 영향도가 2 상승합니다.',
  'skills.techniqueChainA.name': '테크닉 체인',
  'skills.sidelineCompassC.description':
    '루트 훈련의 능력치 XP가 8% 증가하고 경기에서 배정 수행력이 향상됩니다.',
  'skills.sidelineCompassC.name': '사이드라인 나침반',
  'skills.leverageSnapshotC.description':
    '필름 스터디가 준비도 +2를 제공하고 가능한 상황에서 커버리지 단서를 하나 더 보여 줍니다.',
  'skills.leverageSnapshotC.name': '레버리지 스냅샷',
  'skills.lateHandsB.description':
    '핸즈·캐치 훈련의 능력치 XP가 10% 증가하고 경합 캐치 수행력이 향상됩니다.',
  'skills.lateHandsB.name': '늦은 손',
  'skills.stemPressureB.description':
    '릴리스 훈련의 능력치 XP가 10% 증가하고 패키지 스냅 기회가 향상됩니다.',
  'skills.stemPressureB.name': '스템 압박',
  'skills.redZonePatienceA.description':
    '핸즈·캐치 훈련이 자신감 +3을 제공하고 경합 캐치와 압박 상황 수행력이 향상됩니다.',
  'skills.redZonePatienceA.name': '레드존 인내심',
  'skills.scrambleCompassA.description':
    '필름 스터디가 준비도 +4를 제공하고 커버리지 단서를 하나 더 보여 주며 배정 수행력을 높입니다.',
  'skills.scrambleCompassA.name': '스크램블 나침반',
  'skills.fourthQuarterSparkS.description':
    '스피드 훈련의 능력치 XP가 10% 증가하고 오픈 필드 야드가 늘지만 펌블 위험도 15% 상승합니다.',
  'skills.fourthQuarterSparkS.name': '4쿼터 불꽃',
  'skills.trainingBufferB.description':
    '회복이 Body를 4 더 회복시키고 주간 부상 위험을 20% 낮춥니다.',
  'skills.trainingBufferB.name': '훈련 완충대',
  'skills.nextSnapResetA.description':
    '회복이 자신감 +4를 제공하고 경기의 압박 상황 수행력을 높입니다.',
  'skills.nextSnapResetA.name': '다음 스냅 리셋',
  'gameContent.clues.headUpLeverage.description':
    '수비수가 정면에서 양쪽 방향을 모두 막고 있습니다.',
  'gameContent.clues.headUpLeverage.name': '정면 레버리지',
  'gameContent.clues.insideLeverage.description': '수비수가 안쪽 길을 먼저 막고 있습니다.',
  'gameContent.clues.insideLeverage.name': '안쪽 레버리지',
  'gameContent.clues.offMan.description': '수비수가 간격을 두고 움직임을 읽으려 합니다.',
  'gameContent.clues.offMan.name': '오프 맨',
  'gameContent.clues.outsideLeverage.description': '수비수가 바깥쪽 길을 먼저 막고 있습니다.',
  'gameContent.clues.outsideLeverage.name': '바깥쪽 레버리지',
  'gameContent.clues.pressMan.description': '수비수가 라인 가까이 붙어 첫 동작을 방해하려 합니다.',
  'gameContent.clues.pressMan.name': '프레스 맨',
  'gameContent.clues.singleHighZone.description':
    '깊은 중앙에 세이프티 한 명이 남는 지역 수비 형태입니다.',
  'gameContent.clues.singleHighZone.name': '싱글 하이 존',
  'gameContent.clues.twoHighZone.description': '두 명의 깊은 세이프티가 위쪽 공간을 나눠 지킵니다.',
  'gameContent.clues.twoHighZone.name': '투 하이 존',
  'gameContent.decisions.attackHighPoint.description':
    '가장 높은 지점에서 공을 선점해 수비수보다 먼저 끝냅니다.',
  'gameContent.decisions.attackHighPoint.name': '하이 포인트 공략',
  'gameContent.decisions.burstUpfield.description':
    '한 번에 속도를 올려 남은 수직 공간을 파고듭니다.',
  'gameContent.decisions.burstUpfield.name': '직선 가속',
  'gameContent.decisions.crossFace.description':
    '수비수의 앞을 가로질러 반대편 공간을 먼저 차지합니다.',
  'gameContent.decisions.crossFace.name': '앞면 가로지르기',
  'gameContent.decisions.cutbackLane.description':
    '추격 각도를 이용해 반대쪽 컷백 통로로 전환합니다.',
  'gameContent.decisions.cutbackLane.name': '컷백 통로',
  'gameContent.decisions.handClear.description':
    '손 싸움으로 접촉을 걷어내고 몸의 중심선을 되찾습니다.',
  'gameContent.decisions.handClear.name': '손 걷어내기',
  'gameContent.decisions.lateHands.description':
    '공이 도착할 때까지 손을 숨겨 수비수의 반응을 늦춥니다.',
  'gameContent.decisions.lateHands.name': '늦은 손',
  'gameContent.decisions.patientFeint.description':
    '급히 열지 않고 페인트로 수비수의 중심을 먼저 움직입니다.',
  'gameContent.decisions.patientFeint.name': '인내심 있는 페인트',
  'gameContent.decisions.protectBall.description': '추가 야드보다 두 손 볼 보안을 우선합니다.',
  'gameContent.decisions.protectBall.name': '볼 보호',
  'gameContent.decisions.secureFrame.description':
    '몸으로 접촉을 차단하고 안정적인 캐치 틀을 만듭니다.',
  'gameContent.decisions.secureFrame.name': '몸으로 보호',
  'gameContent.decisions.settleWindow.description':
    '지역 수비 사이의 빈 창에서 멈춰 쿼터백에게 표적을 보여 줍니다.',
  'gameContent.decisions.settleWindow.name': '빈 창에 정착',
  'gameContent.decisions.speedRelease.description':
    '첫 두 걸음의 폭발력으로 접촉 전에 수비수를 지나칩니다.',
  'gameContent.decisions.speedRelease.name': '스피드 릴리스',
  'gameContent.decisions.stackDefender.description':
    '수비수의 진로 위를 차지해 양쪽으로 꺾을 수 있는 위치를 만듭니다.',
  'gameContent.decisions.stackDefender.name': '수비수 스택',
  'gameContent.families.catch.description': '공의 궤적과 접촉을 읽고 캐치 방식을 선택합니다.',
  'gameContent.families.catch.name': '캐치 접근',
  'gameContent.families.release.description':
    '플레이콜이 아니라 라인에서 수비를 푸는 개인 기술을 선택합니다.',
  'gameContent.families.release.name': '릴리스 기술',
  'gameContent.families.route.description': '수비 레버리지에 맞춰 스템과 도착 지점을 조정합니다.',
  'gameContent.families.route.name': '루트 대응',
  'gameContent.families.yac.description': '캐치 뒤 추가 야드와 볼 보안 사이의 균형을 선택합니다.',
  'gameContent.families.yac.name': '캐치 후 전진',
  'gameContent.patterns.boundaryJam.description':
    '사이드라인 쪽에서 루트 타이밍을 살릴 첫 공간을 만들어야 합니다.',
  'gameContent.patterns.boundaryJam.name': '경계선 첫 관문',
  'gameContent.patterns.boundaryWindow.description': '경계선 쪽 좁은 투구 창으로 공이 들어옵니다.',
  'gameContent.patterns.boundaryWindow.name': '경계선 투구 창',
  'gameContent.patterns.closingSafety.description':
    '캐치를 마치자 깊은 수비수가 정면에서 거리를 좁힙니다.',
  'gameContent.patterns.closingSafety.name': '다가오는 세이프티',
  'gameContent.patterns.nickelCrossface.description':
    '슬롯에서 브레이크 지점까지 수비수와 나란히 달립니다.',
  'gameContent.patterns.nickelCrossface.name': '니켈 브레이크',
  'gameContent.patterns.pursuitAngle.description':
    '짧은 캐치 뒤 두 번째 수비수가 추격 각도를 만들고 있습니다.',
  'gameContent.patterns.pursuitAngle.name': '추격 각도',
  'gameContent.patterns.reducedSplit.description':
    '좁은 스플릿에서 루트로 들어가는 첫 박자를 선택해야 합니다.',
  'gameContent.patterns.reducedSplit.name': '리듀스드 스플릿 진입',
  'gameContent.patterns.seamCollision.description': '해시 사이 깊은 공이 접촉 지점으로 떨어집니다.',
  'gameContent.patterns.seamCollision.name': '심 충돌 지점',
  'gameContent.patterns.twoHighVoid.description':
    '중간 깊이에서 쿼터백과 같은 빈 공간을 읽어야 합니다.',
  'gameContent.patterns.twoHighVoid.name': '중간 지역 빈 공간',
  'gameContent.participation.offensiveRole.description':
    '확보한 공격 패키지 역할만큼 이번 경기의 키 스냅 기회가 주어졌습니다.',
  'gameContent.participation.offensiveRole.name': '공격 역할',
  'gameContent.participation.specialTeams.description':
    '공격 타깃은 없었지만 커버와 리턴 유닛 임무로 경기에 기여했습니다.',
  'gameContent.participation.specialTeams.name': '스페셜팀 임무',
  'gameContent.participation.packageReps.description':
    '제한된 리시버 패키지를 준비했지만 경기 흐름상 호출 기회는 오지 않았습니다.',
  'gameContent.participation.packageReps.name': '패키지 준비',
  'gameContent.participation.lateReps.description':
    '공식 타깃 없이 후반 스냅에서 정렬과 템포를 익혔습니다.',
  'gameContent.participation.lateReps.name': '경기 후반 스냅',
  'gameContent.participation.sidelineLearning.description':
    '포지션 동료들과 커버리지 변화를 읽으며 다음 호출을 준비했습니다.',
  'gameContent.participation.sidelineLearning.name': '사이드라인 리딩',
  'gameContent.participation.scoutPreparation.description':
    '상대 전술 재현 준비와 육성 스냅이 이번 경기일의 기여였습니다.',
  'gameContent.participation.scoutPreparation.name': '상대 전술 준비',
  'programWorld.defenseStyles.matchZone.description':
    '리시버의 루트 분배에 맞춰 지역 수비 책임을 바꾸는 유연한 수비입니다.',
  'programWorld.defenseStyles.matchZone.name': '매치 존',
  'programWorld.defenseStyles.multiple.description':
    '상대와 상황에 따라 전선과 커버리지를 폭넓게 바꾸는 수비입니다.',
  'programWorld.defenseStyles.multiple.name': '멀티플',
  'programWorld.defenseStyles.pressureFront.description':
    '공격 전선을 압박해 빠른 판단을 강요하는 공격적인 수비입니다.',
  'programWorld.defenseStyles.pressureFront.name': '프런트 압박',
  'programWorld.defenseStyles.twoHigh.description':
    '깊은 공간을 지키고 짧은 전진을 차분히 제한하는 수비입니다.',
  'programWorld.defenseStyles.twoHigh.name': '투하이',
  'programWorld.offenseStyles.balancedTempo.description':
    '다양한 리시버 역할과 유연한 템포를 함께 활용합니다.',
  'programWorld.offenseStyles.balancedTempo.name': '밸런스 템포',
  'programWorld.offenseStyles.powerPlayAction.description':
    '강한 러닝 위협 뒤에서 몸싸움과 중거리 타이밍 루트를 만듭니다.',
  'programWorld.offenseStyles.powerPlayAction.name': '파워 플레이액션',
  'programWorld.offenseStyles.precisionSpread.description':
    '정교한 릴리스와 루트 타이밍으로 공간을 단계적으로 공략합니다.',
  'programWorld.offenseStyles.precisionSpread.name': '프리시전 스프레드',
  'programWorld.offenseStyles.spaceMotion.description':
    '모션과 넓은 간격으로 빠르고 민첩한 리시버에게 빈 공간을 만듭니다.',
  'programWorld.offenseStyles.spaceMotion.name': '스페이스 모션',
  'programWorld.offenseStyles.verticalStretch.description':
    '스피드와 릴리스로 수비의 깊이를 끊임없이 위협합니다.',
  'programWorld.offenseStyles.verticalStretch.name': '버티컬 스트레치',
  'programWorld.programs.emberPeakPolytechnic.description':
    '산악 지역의 강인함과 체계적인 육성을 앞세워 무명 선수를 성장시키는 공대 프로그램입니다.',
  'programWorld.programs.emberPeakPolytechnic.name': '엠버 피크 공과대',
  'programWorld.programs.emberPeakPolytechnic.shortName': '엠버 피크',
  'programWorld.programs.capitalCommonwealth.description':
    '대도시 자원, 높은 학업 기준, 전국적인 기대가 한곳에 모인 강호입니다.',
  'programWorld.programs.capitalCommonwealth.name': '캐피털 커먼웰스',
  'programWorld.programs.capitalCommonwealth.shortName': '캐피털',
  'programWorld.programs.cascadeTech.description':
    '공학적인 훈련 방식과 창의적인 모션 공격으로 리시버를 다듬는 북서부 프로그램입니다.',
  'programWorld.programs.cascadeTech.name': '캐스케이드 공과대',
  'programWorld.programs.cascadeTech.shortName': '캐스케이드',
  'programWorld.programs.gulfMeridian.description':
    '걸프 지역의 풍부한 인재와 치열한 경쟁을 바탕으로 매년 정상을 요구하는 강호입니다.',
  'programWorld.programs.gulfMeridian.name': '걸프 메리디언',
  'programWorld.programs.gulfMeridian.shortName': '메리디언',
  'programWorld.programs.highDesertState.description':
    '넓은 필드와 과감한 딥 패스로 새로운 기회를 주는 성장 중인 주립 프로그램입니다.',
  'programWorld.programs.highDesertState.name': '하이 데저트 주립',
  'programWorld.programs.highDesertState.shortName': '하이 데저트',
  'programWorld.programs.ironwood.description':
    '신체적인 훈련, 안정된 운영, 베테랑 중심의 경쟁 문화를 지닌 전통 강호입니다.',
  'programWorld.programs.ironwood.name': '아이언우드',
  'programWorld.programs.ironwood.shortName': '아이언우드',
  'programWorld.programs.lakefrontUnion.description':
    '차분한 선수 육성과 균형 잡힌 공격으로 꾸준히 상위권을 노리는 호반 프로그램입니다.',
  'programWorld.programs.lakefrontUnion.name': '레이크프런트 유니언',
  'programWorld.programs.lakefrontUnion.shortName': '레이크프런트',
  'programWorld.programs.northstarCollege.description':
    '높은 학업 기준과 인내심 있는 성장 경로를 제공하는 소규모 명문 대학입니다.',
  'programWorld.programs.northstarCollege.name': '노스스타 칼리지',
  'programWorld.programs.northstarCollege.shortName': '노스스타',
  'programWorld.programs.prairieForge.description':
    '근면한 지역 문화와 안정된 코칭으로 원석을 로테이션 자원으로 만드는 프로그램입니다.',
  'programWorld.programs.prairieForge.name': '프레리 포지',
  'programWorld.programs.prairieForge.shortName': '프레리 포지',
  'programWorld.programs.redwoodBay.description':
    '해안 대도시의 주목도와 빠른 공격을 결합한 야심 찬 컨텐더입니다.',
  'programWorld.programs.redwoodBay.name': '레드우드 베이',
  'programWorld.programs.redwoodBay.shortName': '레드우드',
  'programWorld.programs.solisCoast.description':
    '풍부한 시장 자원과 창의적인 스페이스 공격으로 전국 무대를 겨냥하는 해안 강호입니다.',
  'programWorld.programs.solisCoast.name': '솔리스 코스트',
  'programWorld.programs.solisCoast.shortName': '솔리스',
  'programWorld.programs.crownSound.description':
    '지역 기반, 안정된 코칭, 열린 경쟁을 조화시킨 대서양 연안의 강팀입니다.',
  'programWorld.programs.crownSound.name': '크라운 사운드 대학교',
  'programWorld.programs.crownSound.shortName': '크라운 사운드',
  'programWorld.regions.appalachian.description':
    '산악 도시와 작은 풋볼 공동체가 이어지는 지역입니다.',
  'programWorld.regions.appalachian.name': '애팔래치아',
  'programWorld.regions.atlantic.description':
    '해안 도시와 오래된 내륙 풋볼 문화가 만나는 지역입니다.',
  'programWorld.regions.atlantic.name': '애틀랜틱',
  'programWorld.regions.cascade.description':
    '비가 잦은 북서부 도시와 산악권을 아우르는 지역입니다.',
  'programWorld.regions.cascade.name': '캐스케이드',
  'programWorld.regions.greatLakes.description':
    '추운 날씨와 공업 도시의 강인한 풋볼 문화가 자리한 지역입니다.',
  'programWorld.regions.greatLakes.name': '그레이트 레이크스',
  'programWorld.regions.gulf.description':
    '따뜻한 해안과 풍부한 고교 인재 풀이 이어지는 지역입니다.',
  'programWorld.regions.gulf.name': '걸프',
  'programWorld.regions.highDesert.description': '고지대 도시와 넓은 건조 지형을 품은 지역입니다.',
  'programWorld.regions.highDesert.name': '하이 데저트',
  'programWorld.regions.pacificCoast.description':
    '대형 시장과 빠른 풋볼 문화가 공존하는 서부 해안 지역입니다.',
  'programWorld.regions.pacificCoast.name': '퍼시픽 코스트',
  'programWorld.regions.prairie.description':
    '넓은 평원과 긴밀한 지역 공동체가 이어지는 내륙 지역입니다.',
  'programWorld.regions.prairie.name': '프레리',
  'programWorld.roster.family.adeyemi': '아데예미',
  'programWorld.roster.family.alvarez': '알바레스',
  'programWorld.roster.family.banks': '뱅크스',
  'programWorld.roster.family.bennett': '베넷',
  'programWorld.roster.family.brooks': '브룩스',
  'programWorld.roster.family.carter': '카터',
  'programWorld.roster.family.chen': '천',
  'programWorld.roster.family.coleman': '콜먼',
  'programWorld.roster.family.dawson': '도슨',
  'programWorld.roster.family.diaz': '디아스',
  'programWorld.roster.family.ellis': '엘리스',
  'programWorld.roster.family.ford': '포드',
  'programWorld.roster.family.freeman': '프리먼',
  'programWorld.roster.family.grant': '그랜트',
  'programWorld.roster.family.griffin': '그리핀',
  'programWorld.roster.family.harris': '해리스',
  'programWorld.roster.family.hayes': '헤이스',
  'programWorld.roster.family.ibarra': '이바라',
  'programWorld.roster.family.jackson': '잭슨',
  'programWorld.roster.family.kim': '김',
  'programWorld.roster.family.king': '킹',
  'programWorld.roster.family.lawson': '로슨',
  'programWorld.roster.family.mitchell': '미첼',
  'programWorld.roster.family.nguyen': '응우옌',
  'programWorld.roster.family.okafor': '오카포',
  'programWorld.roster.family.patel': '파텔',
  'programWorld.roster.family.quinn': '퀸',
  'programWorld.roster.family.reed': '리드',
  'programWorld.roster.family.robinson': '로빈슨',
  'programWorld.roster.family.santos': '산토스',
  'programWorld.roster.family.walker': '워커',
  'programWorld.roster.family.young': '영',
  'programWorld.roster.given.adrian': '에이드리언',
  'programWorld.roster.given.amari': '아마리',
  'programWorld.roster.given.anton': '안톤',
  'programWorld.roster.given.bryce': '브라이스',
  'programWorld.roster.given.caleb': '케일럽',
  'programWorld.roster.given.cameron': '캐머런',
  'programWorld.roster.given.darius': '다리우스',
  'programWorld.roster.given.desmond': '데즈먼드',
  'programWorld.roster.given.devon': '데번',
  'programWorld.roster.given.elias': '일라이어스',
  'programWorld.roster.given.emmett': '에밋',
  'programWorld.roster.given.everett': '에버렛',
  'programWorld.roster.given.felix': '펠릭스',
  'programWorld.roster.given.gabriel': '게이브리얼',
  'programWorld.roster.given.henry': '헨리',
  'programWorld.roster.given.isaiah': '아이제이아',
  'programWorld.roster.given.jalen': '제일런',
  'programWorld.roster.given.jamir': '자미르',
  'programWorld.roster.given.jordan': '조던',
  'programWorld.roster.given.kai': '카이',
  'programWorld.roster.given.keon': '키온',
  'programWorld.roster.given.leon': '리언',
  'programWorld.roster.given.malik': '말릭',
  'programWorld.roster.given.marcus': '마커스',
  'programWorld.roster.given.miles': '마일스',
  'programWorld.roster.given.nico': '니코',
  'programWorld.roster.given.noah': '노아',
  'programWorld.roster.given.omar': '오마르',
  'programWorld.roster.given.quincy': '퀸시',
  'programWorld.roster.given.roman': '로먼',
  'programWorld.roster.given.terrell': '터렐',
  'programWorld.roster.given.zayne': '제인',
  'programWorld.rotationPolicies.balanced.description':
    '주전에게 중심을 두되 상위 로테이션에도 꾸준한 스냅을 배분합니다.',
  'programWorld.rotationPolicies.balanced.name': '균형 로테이션',
  'programWorld.rotationPolicies.tight.description':
    '검증된 상위 리시버에게 대부분의 스냅을 집중합니다.',
  'programWorld.rotationPolicies.tight.name': '집중 로테이션',
  'programWorld.rotationPolicies.wide.description':
    '여러 리시버에게 역할과 스냅을 폭넓게 나눕니다.',
  'programWorld.rotationPolicies.wide.name': '폭넓은 로테이션',
  'programWorld.traits.academicStandard.description':
    '높은 학업 기대가 훈련 외 선택에도 무게를 더합니다.',
  'programWorld.traits.academicStandard.name': '높은 학업 기준',
  'programWorld.traits.creativeScheme.description':
    '다양한 정렬과 모션으로 리시버의 장점을 새롭게 활용합니다.',
  'programWorld.traits.creativeScheme.name': '창의적 스킴',
  'programWorld.traits.developmentLab.description':
    '세밀한 훈련과 피드백으로 장기적인 성장을 끌어냅니다.',
  'programWorld.traits.developmentLab.name': '육성 연구소',
  'programWorld.traits.donorMarket.description':
    '풍부한 후원 시장이 브랜드 기회와 기대를 함께 키웁니다.',
  'programWorld.traits.donorMarket.name': '후원 시장',
  'programWorld.traits.nationalExpectations.description':
    '매 시즌 전국 무대의 성과를 당연하게 요구합니다.',
  'programWorld.traits.nationalExpectations.name': '전국급 기대',
  'programWorld.traits.openCompetition.description':
    '명성보다 현재의 준비도와 훈련 성과로 역할을 경쟁합니다.',
  'programWorld.traits.openCompetition.name': '열린 경쟁',
  'programWorld.traits.patientPath.description':
    '즉각적인 결과보다 단계적인 성장과 역할 확대를 중시합니다.',
  'programWorld.traits.patientPath.name': '인내의 성장 경로',
  'programWorld.traits.physicalCulture.description':
    '강도 높은 신체 훈련과 접촉 상황의 완성도를 강조합니다.',
  'programWorld.traits.physicalCulture.name': '피지컬 문화',
  'programWorld.traits.proWorkshop.description':
    '상위 무대를 겨냥한 기술과 준비 과정을 체계적으로 다듬습니다.',
  'programWorld.traits.proWorkshop.name': '프로 워크숍',
  'programWorld.traits.quietFocus.description':
    '외부 소음보다 학업과 개인 성장에 집중하기 좋은 환경입니다.',
  'programWorld.traits.quietFocus.name': '차분한 집중',
  'programWorld.traits.rebuildEnergy.description':
    '새로운 주축이 될 선수에게 이른 기회와 책임을 제공합니다.',
  'programWorld.traits.rebuildEnergy.name': '재건의 에너지',
  'programWorld.traits.regionalRoots.description':
    '지역 공동체와 인재 기반의 유대가 프로그램 정체성을 만듭니다.',
  'programWorld.traits.regionalRoots.name': '지역의 뿌리',
  'programWorld.traits.spotlightMarket.description':
    '큰 시장의 관심이 경기와 일상 모두를 빠르게 비춥니다.',
  'programWorld.traits.spotlightMarket.name': '스포트라이트 시장',
  'programWorld.traits.stableStaff.description':
    '일관된 지도 철학이 예측 가능한 성장 환경을 제공합니다.',
  'programWorld.traits.stableStaff.name': '안정된 스태프',
  'programWorld.traits.tempoIdentity.description':
    '빠른 운영과 많은 스냅이 공격의 기본 리듬입니다.',
  'programWorld.traits.tempoIdentity.name': '템포 정체성',
  'programWorld.traits.veteranLoyalty.description':
    '경험과 꾸준한 신뢰를 쌓은 선수에게 우선권을 줍니다.',
  'programWorld.traits.veteranLoyalty.name': '베테랑 신뢰',
  'events.campInstall.choices.extraReps.description':
    '설치 훈련을 더 소화합니다: 준비도 +8, 코치 신뢰 +4, 몸 상태 -7.',
  'events.campInstall.choices.extraReps.name': '추가 반복 훈련을 한다',
  'events.campInstall.choices.reset.description':
    '내일 훈련을 위해 회복합니다: 몸 상태 +9, 자신감 +3, 준비도 -2.',
  'events.campInstall.choices.reset.name': '내일을 위해 회복한다',
  'events.campInstall.description':
    '리시버들이 훈련 뒤에 남아 새 조정 사항을 반복하려 하지만, 이번 주 훈련으로 다리는 이미 무겁습니다.',
  'events.campInstall.name': '한 번 더 하는 설치 훈련',
  'events.spotlight.choices.accept.description':
    '미디어 기회를 활용합니다: 브랜드 +8, 자신감 +4, 준비도 -5.',
  'events.spotlight.choices.accept.name': '인터뷰에 나선다',
  'events.spotlight.choices.decline.description':
    '게임 플랜으로 돌아갑니다: 준비도 +7, 코치 신뢰 +3, 브랜드 -2.',
  'events.spotlight.choices.decline.name': '팀 내부의 준비에 집중한다',
  'events.spotlight.description':
    '학생 방송국이 주목 경기 전 특집 인터뷰를 제안했습니다. 마지막 필름 분석 시간과 겹칩니다.',
  'events.spotlight.name': '스포트라이트의 시간',
  'events.teamVoice.choices.checkIns.description':
    '동료들과 한 명씩 대화합니다: 코치 신뢰 +3, 돌파 진척도 +8, 준비도 +2.',
  'events.teamVoice.choices.checkIns.name': '조용히 한 명씩 살핀다',
  'events.teamVoice.choices.roomMessage.description':
    '리시버 룸 전체에 말합니다: 자신감 +5, 코치 신뢰 +5, 몸 상태 -3.',
  'events.teamVoice.choices.roomMessage.name': '모두에게 이야기한다',
  'events.teamVoice.description':
    '긴장감이 남은 훈련 뒤, 리시버 룸은 다음 분위기를 정해 줄 누군가를 바라봅니다.',
  'events.teamVoice.name': '훈련 뒤의 한마디',
  'career.event.choice.title': '대응을 선택하세요',
  'career.event.phase.choice': '주간 이벤트',
  'career.injury.choice.title': '출전 계획을 선택하세요',
  'career.injury.phase.choice': '회복 결정',
  'career.season.complete.title': '커리어 완료',
  'career.season.availability': '출전 가능 상태',
  'career.season.availability.full': '정상 출전 가능',
  'career.season.bootstrap.action': '가을 캠프 시작',
  'career.season.bootstrap.help':
    '저장된 시즌 일정을 엽니다. 12경기 일정에 앞서 캠프에서 선수와 역할을 성장시킵니다.',
  'career.season.bootstrap.title': '시즌을 시작할 준비가 됐습니다',
  'career.season.complete.heading': '{name} 선수가 동문 기록에 합류했습니다',
  'career.season.complete.help':
    '이 커리어는 역사로 저장됩니다. 레거시는 다음 커리어가 알아볼 가능성을 넓히지만 자동 전력을 주지 않습니다.',
  'career.season.complete.history': '동문 기록 ({count}명)',
  'career.season.complete.legacyHelp':
    '다음 커리어에서 이 동문과 프로그램 친숙도를 확인할 수 있습니다. 능력치, 스킬, 신뢰, 뎁스 역할은 다시 얻어야 합니다.',
  'career.season.complete.legacyTitle': '역사 중심 레거시 해금',
  'career.season.complete.nextCareer': '새 커리어 시작',
  'career.season.complete.statLine': '리셉션 {catches} · {yards}야드 · TD {touchdowns}',
  'career.season.effect': '{label} {value}',
  'career.season.effectSeparator': ' · ',
  'career.season.injuryOpportunityCap': '출전하면 핵심 스냅 기회가 최대 {count}회로 제한됩니다.',
  'career.season.label': '시즌',
  'career.season.nextOpponent': '다음 상대',
  'career.season.noOpponent': '예정된 선수 경기가 없습니다',
  'career.season.notAvailable': '—',
  'career.season.phase.complete': '동문 레거시',
  'career.season.phase.review': '시즌 결산',
  'career.season.postseason.action': '포스트시즌 대진 확정',
  'career.season.postseason.help':
    '상위 4개 프로그램이 이 가상 시즌의 준결승 대진에 진출합니다. 진출하지 못한 커리어도 정규 시즌 성적 그대로 마무리됩니다.',
  'career.season.postseason.title': '순위표로 포스트시즌 진출 팀을 확정합니다',
  'career.season.progress.camp': '캠프 {current} / {total}라운드',
  'career.season.progress.complete': '시즌 일정 완료',
  'career.season.progress.pending': '일정 시작 전',
  'career.season.progress.postseason': '포스트시즌 {current} / {total}라운드',
  'career.season.progress.regular': '정규 시즌 {current} / {total}주차',
  'career.season.rank': '순위',
  'career.season.rankValue': '{rank}위',
  'career.season.record': '프로그램 성적',
  'career.season.recordValue': '{wins}승 {losses}패 {ties}무',
  'career.season.review.bestGame': '최고 경기: 평점 {grade} · 리셉션 {catches} · {yards}야드',
  'career.season.review.completeCareer': '커리어를 동문 기록에 저장',
  'career.season.review.games': '출전 경기',
  'career.season.review.grade': '평균 평점',
  'career.season.review.injuries': '부상',
  'career.season.review.injuryValue': '{count}회 · 결장 {weeks}주',
  'career.season.review.open': '시즌 결산 열기',
  'career.season.review.rank': '정규 시즌 순위',
  'career.season.review.ready':
    '동문 기록을 저장하기 전에 프로그램 성적과 선수의 여정을 마지막으로 확인하세요.',
  'career.season.review.receiving': '리시빙 생산성',
  'career.season.review.receivingValue': '리셉션 {catches} · {yards}야드 · TD {touchdowns}',
  'career.season.review.record': '프로그램 최종 성적: {wins}승 {losses}패 {ties}무',
  'career.season.review.role': '최종 역할',
  'career.season.review.title': '이번 시즌을 돌아보세요',
  'career.season.risk': '최근 주간 부상 위험: {value}',
  'career.season.stage.camp': '가을 캠프',
  'career.season.stage.pending': '시즌 준비',
  'career.season.stage.postseason': '포스트시즌',
  'career.season.stage.regular': '정규 시즌',
  'career.season.standings.open': '상위 4팀 순위',
  'career.season.weekBoundary.action': '주간 이벤트와 출전 상태 확인',
  'season.camp.competition.description':
    '훈련 근거가 리시버 룸의 순서를 가르기 시작하며 역할 경쟁이 치열해집니다.',
  'season.camp.competition.name': '캠프 경쟁',
  'season.camp.dressRehearsal.description':
    '정규 시즌 개막 전 마지막 캠프 주간에서 실전 준비도를 점검합니다.',
  'season.camp.dressRehearsal.name': '최종 리허설',
  'season.camp.install.description':
    '시스템을 익히고 주간 리듬을 세우며 코칭스태프에게 첫인상을 남깁니다.',
  'season.camp.install.name': '시스템 설치',
  'season.outcomes.champion.description':
    '포스트시즌 두 경기를 모두 이기고 전국 챔피언으로 시즌을 마쳤습니다.',
  'season.outcomes.champion.name': '전국 챔피언',
  'season.outcomes.regularSeasonComplete.description':
    '4팀 포스트시즌 진출권 밖에서 정규 시즌 전체 일정을 완주했습니다.',
  'season.outcomes.regularSeasonComplete.name': '정규 시즌 완주',
  'season.outcomes.runnerUp.description': '전국 결승에 진출해 준우승으로 시즌을 마쳤습니다.',
  'season.outcomes.runnerUp.name': '전국 준우승',
  'season.outcomes.semifinalExit.description': '포스트시즌에 진출해 준결승에서 시즌을 마쳤습니다.',
  'season.outcomes.semifinalExit.name': '포스트시즌 준결승 진출',
  'season.postseason.final.description':
    '준결승 승리 팀들이 이 가상 시즌의 챔피언 자리를 두고 맞붙습니다.',
  'season.postseason.final.name': '전국 결승',
  'season.postseason.semifinal.description':
    '상위 4개 프로그램이 1번 대 4번, 2번 대 3번 시드 대진으로 맞붙습니다.',
  'season.postseason.semifinal.name': '전국 준결승',
  'season.regular.round1.description':
    '개막 일정에서 캠프 성과가 첫 실전 뎁스 역할 시험으로 이어집니다.',
  'season.regular.round1.name': '정규 시즌 1주차',
  'season.regular.round10.description':
    '포스트시즌 경쟁이 좁혀지면서 시즌 막판의 기회가 더 큰 무게를 가집니다.',
  'season.regular.round10.name': '정규 시즌 10주차',
  'season.regular.round11.description':
    '라운드 로빈 마지막 주에도 순위표에서 차지할 자리가 남아 있습니다.',
  'season.regular.round11.name': '정규 시즌 11주차',
  'season.regular.round12.description':
    '여섯 개의 독창적인 라이벌전이 공동 스포트라이트 아래 정규 시즌을 마무리합니다.',
  'season.regular.round12.name': '라이벌 주간',
  'season.regular.round2.description':
    '초반의 근거가 첫인상을 안정적인 풋볼 역할로 바꾸기 시작합니다.',
  'season.regular.round2.name': '정규 시즌 2주차',
  'season.regular.round3.description':
    '상대가 성향을 드러내기 시작하면서 준비도와 출전 가능 상태가 중요해집니다.',
  'season.regular.round3.name': '정규 시즌 3주차',
  'season.regular.round4.description': '첫 한 달이 끝나며 뎁스 이동과 팀 성적의 윤곽이 잡힙니다.',
  'season.regular.round4.name': '정규 시즌 4주차',
  'season.regular.round5.description':
    '시즌 중반을 앞두고 성장 선택과 다음 경기 준비가 서로 경쟁합니다.',
  'season.regular.round5.name': '정규 시즌 5주차',
  'season.regular.round6.description':
    '모든 프로그램이 서로 다른 성적과 역할 궤적을 안고 반환점에 도달합니다.',
  'season.regular.round6.name': '정규 시즌 6주차',
  'season.regular.round7.description':
    '후반기는 신뢰, 몸 상태, 수행력을 꾸준히 유지한 선수에게 보답합니다.',
  'season.regular.round7.name': '정규 시즌 7주차',
  'season.regular.round8.description':
    '순위 경쟁의 압박이 커져도 각 리시버에게는 매주 따낼 일이 남아 있습니다.',
  'season.regular.round8.name': '정규 시즌 8주차',
  'season.regular.round9.description':
    '마지막 3분의 1 구간에는 팀과 선수의 잃은 흐름을 되찾을 여유가 줄어듭니다.',
  'season.regular.round9.name': '정규 시즌 9주차',
  'season.standings.tiebreakExplanation':
    '승수, 적용 가능한 상대 전적, 일정 강도, 안정적인 프로그램 ID 순으로 순위를 정합니다.',
  'season.verticalSlice.description':
    '가을 캠프 3라운드, 12경기, 4팀 가상 포스트시즌으로 한 번의 완전한 WR 시즌을 구성합니다.',
  'season.verticalSlice.name': '새터데이 서킷 시즌',
  'pwa.dismissAction': '나중에',
  'pwa.updateAction': '업데이트',
  'pwa.updateAvailable': '새 버전을 사용할 수 있습니다.',
  'storage.degradedWarning':
    '브라우저 저장소를 사용할 수 없어 이번 세션의 변경 사항은 창을 닫으면 사라질 수 있습니다.',
  'weeklyActions.extraPractice.description':
    '루트 러닝, 릴리스, 캐치를 함께 훈련하지만 몸 상태를 가장 많이 소모합니다.',
  'weeklyActions.extraPractice.name': '추가 훈련',
  'weeklyActions.filmStudy.description':
    '몸 상태를 조금 소모해 필름을 분석하고 풋볼 IQ를 높입니다.',
  'weeklyActions.filmStudy.name': '필름 스터디',
  'weeklyActions.handsCatchWork.description': '몸 상태를 소모해 안정적인 캐치 기본기를 다듬습니다.',
  'weeklyActions.handsCatchWork.name': '캐치 훈련',
  'weeklyActions.recovery.description': '훈련 대신 휴식과 관리를 선택해 몸 상태를 크게 회복합니다.',
  'weeklyActions.recovery.name': '회복',
  'weeklyActions.releaseDrills.description':
    '몸 상태를 소모해 라인 오브 스크리미지에서의 릴리스를 다듬습니다.',
  'weeklyActions.releaseDrills.name': '릴리스 훈련',
  'weeklyActions.routeDrills.description': '몸 상태를 소모해 더 정교한 루트 러닝을 연습합니다.',
  'weeklyActions.routeDrills.name': '루트 훈련',
  'weeklyActions.speedWork.description':
    '몸 상태 소모가 큰 고강도 훈련으로 스피드와 폭발력을 높입니다.',
  'weeklyActions.speedWork.name': '스피드 훈련',
  'weeklyActions.studyHall.description': '학업 시간을 확보해 GPA를 높입니다.',
  'weeklyActions.studyHall.name': '학업 보충',
  'weeklyActions.weightRoom.description': '힘과 내구도를 함께 단련하지만 몸 상태 소모가 큽니다.',
  'weeklyActions.weightRoom.name': '웨이트 트레이닝',
} as const;

export type MessageKey = keyof typeof koKRMessages;
