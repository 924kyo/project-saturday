import type { MessageKey } from './ko-KR.js';
import { enUSEventBatchMessages } from './event-batch-en-US.js';
import { enUSInjuryBatchMessages } from './injury-batch-en-US.js';
import { enUSM6UiMessages } from './m6-ui-en-US.js';
import { enUSM7AlphaMessages } from './m7-alpha-en-US.js';
import { enUSM7WorldMessages } from './m7-world-en-US.js';
import { enUSM7QbMessages } from './m7-qb.js';
import { enUSM7RbMessages } from './m7-rb.js';
import { enUSM7CbMessages } from './m7-cb.js';
import { enUSOffFieldBatchMessages } from './off-field-batch-en-US.js';
import { enUSHubMessages } from './m7-hub.js';
import { enUSWrTerminalMessages } from './m75-wr-terminal.js';
import { enUSVNextMessages } from './r-vnext.js';
import { enUSVNextWeekMessages } from './r-vnext-week.js';
import { enUSDefenderMessages } from './m8-defenders.js';
import { enUSDefenderUiMessages } from './m8-defenders-ui.js';
import { enUSWorldMessages } from './m8-world.js';
import { enUSWorldUiMessages } from './m8-world-ui.js';
import { enUSDraftUiMessages } from './m8-draft-ui.js';
import { enUSNilUiMessages } from './m8-nil-ui.js';
import { enUSLifeMessages } from './m8-life.js';
import { enUSAwardMessages } from './m9-awards.js';
import { enUSLegacyMessages } from './m9-legacy.js';
import { enUSM8PositionMessages } from './m8-positions.js';
import { m7BuildEn } from './m7-builds.js';
import { m7DirectEn } from './m7-direct.js';
import { m7GameDayEn } from './m7-game-day.js';
import { m7SeasonEn } from './m7-season.js';

export const enUSMessages = {
  ...m7GameDayEn,
  ...m7SeasonEn,
  ...m7DirectEn,
  ...m7BuildEn,
  ...enUSHubMessages,
  ...enUSWrTerminalMessages,
  ...enUSVNextMessages,
  ...enUSVNextWeekMessages,
  ...enUSM8PositionMessages,
  ...enUSDefenderMessages,
  ...enUSDefenderUiMessages,
  ...enUSWorldMessages,
  ...enUSWorldUiMessages,
  ...enUSDraftUiMessages,
  ...enUSNilUiMessages,
  ...enUSLifeMessages,
  ...enUSAwardMessages,
  ...enUSLegacyMessages,
  ...enUSEventBatchMessages,
  ...enUSInjuryBatchMessages,
  ...enUSM6UiMessages,
  ...enUSM7AlphaMessages,
  ...enUSM7WorldMessages,
  ...enUSM7QbMessages,
  ...enUSM7RbMessages,
  ...enUSM7CbMessages,
  ...enUSOffFieldBatchMessages,
  'app.statusLabel': 'Foundation status',
  'app.statusReady': 'Local career systems ready',
  'app.subtitle': 'Build a college football career that is entirely your own.',
  'app.title': 'Project Saturday',
  'app.validationSummary':
    '{count, plural, =0 {No content issues} one {# content issue} other {# content issues}}',
  'creation.appearance.armSleeves.both': 'Both arms',
  'creation.appearance.armSleeves.left': 'Left arm',
  'creation.appearance.armSleeves.right': 'Right arm',
  'creation.appearance.bodyTypes.balanced': 'Balanced',
  'creation.appearance.bodyTypes.broad': 'Broad',
  'creation.appearance.bodyTypes.lean': 'Lean',
  'creation.appearance.eyeBlack.stripes': 'Two stripes',
  'creation.appearance.eyeBlack.wide': 'Wide',
  'creation.appearance.faces.angular': 'Angular',
  'creation.appearance.faces.oval': 'Oval',
  'creation.appearance.faces.round': 'Round',
  'creation.appearance.faces.square': 'Square',
  'creation.appearance.fields.armSleeves': 'Arm sleeves',
  'creation.appearance.fields.bodyType': 'Body type',
  'creation.appearance.fields.eyeBlack': 'Eye black',
  'creation.appearance.fields.face': 'Face shape',
  'creation.appearance.fields.footwear': 'Footwear',
  'creation.appearance.fields.gloves': 'Gloves',
  'creation.appearance.fields.hairColor': 'Hair color',
  'creation.appearance.fields.hairStyle': 'Hair style',
  'creation.appearance.fields.heightCm': 'Height (cm)',
  'creation.appearance.fields.jerseyFit': 'Jersey fit',
  'creation.appearance.fields.skinTone': 'Skin tone',
  'creation.appearance.fields.towel': 'Towel',
  'creation.appearance.fields.visor': 'Visor',
  'creation.appearance.fields.weightKg': 'Weight (kg)',
  'creation.appearance.fields.wristTape': 'Wrist tape',
  'creation.appearance.footwear.high': 'High cut',
  'creation.appearance.footwear.low': 'Low cut',
  'creation.appearance.footwear.mid': 'Mid cut',
  'creation.appearance.gloves.accent': 'Accent color',
  'creation.appearance.gloves.dark': 'Dark',
  'creation.appearance.gloves.light': 'Light',
  'creation.appearance.hairColors.black': 'Black',
  'creation.appearance.hairColors.brown': 'Brown',
  'creation.appearance.hairColors.darkBrown': 'Dark brown',
  'creation.appearance.hairColors.lightBrown': 'Light brown',
  'creation.appearance.hairStyles.braids': 'Braids',
  'creation.appearance.hairStyles.closeCrop': 'Close crop',
  'creation.appearance.hairStyles.locs': 'Locs',
  'creation.appearance.hairStyles.mediumCurls': 'Medium curls',
  'creation.appearance.hairStyles.shaved': 'Shaved',
  'creation.appearance.hairStyles.shortCurls': 'Short curls',
  'creation.appearance.jerseyFits.loose': 'Loose fit',
  'creation.appearance.jerseyFits.standard': 'Standard fit',
  'creation.appearance.jerseyFits.tight': 'Tight fit',
  'creation.appearance.options.none': 'None',
  'creation.appearance.skinTones.dark': 'Very deep',
  'creation.appearance.skinTones.deep': 'Deep',
  'creation.appearance.skinTones.light': 'Light',
  'creation.appearance.skinTones.lightMedium': 'Light medium',
  'creation.appearance.skinTones.medium': 'Medium',
  'creation.appearance.skinTones.mediumDeep': 'Medium deep',
  'creation.appearance.towels.center': 'Center',
  'creation.appearance.towels.left': 'Left',
  'creation.appearance.towels.right': 'Right',
  'creation.appearance.visors.clear': 'Clear',
  'creation.appearance.visors.smoke': 'Smoke',
  'creation.appearance.wristTape.both': 'Both wrists',
  'creation.appearance.wristTape.left': 'Left wrist',
  'creation.appearance.wristTape.right': 'Right wrist',
  'career.attributes.agility': 'Agility',
  'career.attributes.blocking': 'Blocking',
  'career.attributes.burst': 'Burst',
  'career.attributes.catchInTraffic': 'Catch in Traffic',
  'career.attributes.composure': 'Composure',
  'career.attributes.conditioning': 'Conditioning',
  'career.attributes.discipline': 'Discipline',
  'career.attributes.durability': 'Durability',
  'career.attributes.footballIq': 'Football IQ',
  'career.attributes.hands': 'Hands',
  'career.attributes.release': 'Release',
  'career.attributes.routeRunning': 'Route Running',
  'career.attributes.speed': 'Speed',
  'career.attributes.strength': 'Strength',
  'career.attributes.workEthic': 'Work Ethic',
  'career.attributes.yac': 'Yards After Catch',
  'career.boot.loadFailed': 'Your saved career could not be loaded. You can create a new career.',
  'career.boot.loading': 'Checking for a saved career…',
  'career.boot.noValidSave': 'No usable save was found, so new career creation is available.',
  'career.boot.partialLoad': 'Some storage was unavailable, but a verified career was loaded.',
  'career.boot.recovered': 'Your career was recovered from the latest valid autosave.',
  'career.command.failed':
    'That step cannot be completed from the current phase. Please try again.',
  'career.home.help': 'See your athlete, current state, and the next career decision.',
  'career.home.next': 'Next up',
  'career.home.next.skills': 'Choose your breakthrough',
  'career.home.next.team': 'Continue program decision',
  'career.home.next.week': 'Open this week',
  'career.home.title': 'Career home',
  'career.navigation.home': 'Home',
  'career.navigation.label': 'Career destinations',
  'career.navigation.player': 'Player',
  'career.navigation.skills': 'Skills',
  'career.navigation.team': 'Team',
  'career.navigation.week': 'Week',
  'career.skills.empty': 'Your first breakthrough will begin your skill build.',
  'career.skills.pageHelp': 'Review your active build, inventory, and breakthrough choices.',
  'career.skills.pageTitle': 'Skill build',
  'career.skills.breakthrough.confirm': 'Learn selected skill',
  'career.skills.breakthrough.help':
    'Your completed weeks filled the gauge and shaped this saved offer. Choose one new skill.',
  'career.skills.breakthrough.legend': 'Choose one skill card',
  'career.skills.breakthrough.saving': 'Saving skill…',
  'career.skills.effects.applied': 'Applied skill effects',
  'career.skills.effects.body': '{skill}: Body {value}',
  'career.skills.effects.bodyCost': '{skill}: Body cost {value}',
  'career.skills.effects.gpa': '{skill}: GPA {value}',
  'career.skills.effects.confidence': '{skill}: Confidence {value}',
  'career.skills.effects.practice': '{skill}: Practice Grade input {value}',
  'career.skills.effects.preparation': '{skill}: Preparation {value}',
  'career.skills.effects.passiveBody': '{skill}: passive Body recovery {value}',
  'career.skills.effects.xp': '{skill}: attribute XP {value}',
  'career.skills.inventory.acquired': 'Earned after week {count}',
  'career.skills.inventory.count': '{count} owned',
  'career.skills.inventory.equipped': 'Equipped in slot {count}',
  'career.skills.inventory.help':
    'Your four slots define the active build. A change saves immediately.',
  'career.skills.inventory.locked': 'You can change the loadout only while planning actions.',
  'career.skills.inventory.owned': 'Owned skills',
  'career.skills.inventory.title': 'Skills and loadout',
  'career.skills.gauge.aria': 'Breakthrough Gauge: {current} of {required}',
  'career.skills.gauge.help':
    '{remaining} more points unlock an offer. Development, coach progress, mindset, Body management, game day, and life can all contribute.',
  'career.skills.gauge.label': 'Next reward',
  'career.skills.gauge.latestEvidence': 'Week {count} progress',
  'career.skills.gauge.noEvidence': 'Complete a week to reveal what advances your next skill.',
  'career.skills.gauge.noPoints':
    'No breakthrough progress this week. Try a different weekly balance.',
  'career.skills.gauge.points': '+{count} gauge points',
  'career.skills.gauge.ready': 'Breakthrough ready',
  'career.skills.gauge.readyHelp':
    'The earned offer is saved. Its three cards reflect the progress sources below.',
  'career.skills.gauge.source.body': 'Body management',
  'career.skills.gauge.source.development': 'Development',
  'career.skills.gauge.source.gameDay': 'Game day',
  'career.skills.gauge.source.life': 'Academics & life',
  'career.skills.gauge.source.mindset': 'Mindset',
  'career.skills.gauge.source.roleCoach': 'Role & coach',
  'career.skills.gauge.title': 'Breakthrough Gauge',
  'career.skills.gauge.triggerEvidence': 'Breakthrough earned after week {count}',
  'career.skills.gauge.value': '{current} / {required}',
  'career.skills.passive.applied': 'Body recovery applied',
  'career.skills.passive.bodyChange': 'Body {before} → {after} ({delta})',
  'career.skills.passive.preview': 'Recovery on advance',
  'career.skills.slot.empty': 'No skill equipped',
  'career.skills.slot.label': 'Skill slot {count}',
  'career.skills.slot.open': 'Open slot',
  'career.skills.tradeoff': 'Tradeoff',
  'career.creation.appearance.help': 'Appearance choices never change player performance.',
  'career.creation.appearance.title': 'Player appearance',
  'career.creation.archetype': 'WR archetype',
  'career.creation.background': 'Recruiting background',
  'career.creation.body.help':
    'Height and weight are stored with your player profile as part of their identity.',
  'career.creation.body.title': 'Body measurements',
  'career.creation.creating': 'Saving career…',
  'career.creation.displayName': 'Player name',
  'career.creation.errors.body': 'Enter height and weight within the available ranges.',
  'career.creation.errors.heading': 'Check your player details.',
  'career.creation.errors.mechanics': 'The selected player combination could not be assembled.',
  'career.creation.errors.name':
    'Enter a name from 1 to 40 characters with no leading or trailing spaces.',
  'career.creation.errors.personalities': 'Choose exactly two compatible personality traits.',
  'career.creation.errors.player':
    'Player creation failed. Check the selected details and try again.',
  'career.creation.eyebrow': 'New career',
  'career.creation.heightImperial': 'Height',
  'career.creation.heightMetric': 'Height (cm)',
  'career.creation.identity.title': 'Who is your player?',
  'career.creation.intro':
    'Background, personality, and play style create a distinct starting point.',
  'career.creation.legacy.eyebrow': 'Your program history',
  'career.creation.legacy.help':
    '{name} remains visible as an alumnus. This new player still earns every rating, skill, role, and snap.',
  'career.creation.legacy.title': '{count} completed career in your history',
  'career.creation.personality': 'Two personality traits',
  'career.creation.personalityCount': '{count} of {total} selected',
  'career.creation.personalityHelp':
    'Conflicting traits are disabled. Select an active trait again to remove it.',
  'career.creation.personalityUnavailable': 'Unavailable with the current selection',
  'career.creation.preview.help': 'Appearance updates here as you make each choice.',
  'career.creation.preview.title': 'Live player preview',
  'career.creation.preview.unnamed': 'Your new WR',
  'career.creation.steps.appearance': 'Step 2 · Appearance',
  'career.creation.steps.body': 'Step 3 · Body',
  'career.creation.steps.identity': 'Step 1 · Identity',
  'career.creation.submit': 'Start WR career',
  'career.creation.title': 'Create your WR',
  'career.creation.weightImperial': 'Weight (lb)',
  'career.creation.weightMetric': 'Weight (kg)',
  'career.player.appearance': 'Appearance details',
  'career.player.attributeXp': '{count} XP',
  'career.player.attributes': 'All ratings',
  'career.player.body': 'Body',
  'career.player.brand': 'Brand',
  'career.player.coachTrust': 'Coach Trust',
  'career.player.confidence': 'Confidence',
  'career.player.preparation': 'Preparation',
  'career.player.portraitLabel': '{name}, saved player appearance',
  'career.player.gpa': 'GPA',
  'career.player.height': 'Height',
  'career.player.overall': 'OVR',
  'career.player.profile': 'Player profile',
  'career.player.profileLabel': 'Identity and growth',
  'career.player.proficiency.currentBenefit': 'Current benefit: {value} attribute XP',
  'career.player.proficiency.help':
    'Repeated focused work improves how efficiently that training develops attributes.',
  'career.player.proficiency.label': 'Training familiarity',
  'career.player.proficiency.level': 'Level {count}',
  'career.player.proficiency.max': 'Maximum proficiency reached',
  'career.player.proficiency.nextBenefit': 'Level {level}: {value} attribute XP',
  'career.player.proficiency.nextThreshold':
    '{uses} uses · next at {count} ({remaining} remaining)',
  'career.player.proficiency.progressAria': '{action}: {uses} completed uses',
  'career.player.proficiency.title': 'Training proficiency',
  'career.player.progression.help':
    '{archetype} emphasis: {attributes}. Every bar shows progress toward the next rating.',
  'career.player.progression.key': 'Archetype focus',
  'career.player.progression.label': 'Attribute development',
  'career.player.progression.title': 'Ratings and XP',
  'career.player.status': 'Key player status',
  'career.player.week': 'Week {count}',
  'career.player.weight': 'Weight',
  'career.position.wr': 'Wide Receiver',
  'career.progress.aria': '{name}: {current} of {required} XP',
  'career.progress.maxRating': 'Maximum rating',
  'career.progress.ratingGain': 'Rating +{count}',
  'career.progress.toNextRating': '{count} XP to rating {rating}',
  'career.progress.xp': '{current} / {required} XP',
  'career.program.depth.practiceForm': 'Practice Form',
  'career.program.depth.outlookHelp':
    'Your rank and the program rotation set this range. Personnel and game context can change the actual total.',
  'career.program.depth.outlookRole': 'WR{rank} · {role}',
  'career.program.depth.outlookTitle': 'Projected participation',
  'career.program.depth.rank': 'WR{count}',
  'career.program.depth.role': 'Current role',
  'career.program.depth.snaps': 'Projected snaps',
  'career.program.depth.title': 'WR depth chart',
  'career.program.opportunity.advancement':
    '{name} at WR{rank} is the next player between you and a promotion.',
  'career.program.opportunity.cause.depth':
    'Talent Fit, Coach Trust, Practice Form, Scheme Fit, and readiness shape the depth order.',
  'career.program.opportunity.cause.formTrust':
    'Practice Grade updates recent Practice Form and can move Coach Trust.',
  'career.program.opportunity.cause.practiceGrade':
    'Focus choices, Body, role-adjusted Preparation, and Confidence create Practice Grade.',
  'career.program.opportunity.cause.snaps':
    'Depth rank and the program rotation policy set the projected participation range.',
  'career.program.opportunity.factor.coachTrust': 'Coach Trust',
  'career.program.opportunity.factor.experienceReadiness': 'Experience readiness',
  'career.program.opportunity.factor.practiceForm': 'Practice Form',
  'career.program.opportunity.factor.schemeFit': 'Scheme Fit',
  'career.program.opportunity.factor.talentFit': 'Talent Fit',
  'career.program.opportunity.factorHelp':
    'These labels compare saved evaluation factors, not a decimal composite score.',
  'career.program.opportunity.relation.competitorEdge': 'Target leads',
  'career.program.opportunity.relation.even': 'Even',
  'career.program.opportunity.relation.playerEdge': 'You lead',
  'career.program.opportunity.roleSecurity':
    '{name} at WR{rank} is the nearest pressure on your current spot.',
  'career.program.opportunity.suggestionsTitle': 'What to work on next',
  'career.program.opportunity.suggestion.coachTrust':
    'Stack stronger Practice Grades; weekly results can build Coach Trust.',
  'career.program.opportunity.suggestion.experienceReadiness':
    'Make available football snaps count; participation builds game readiness.',
  'career.program.opportunity.suggestion.practiceForm':
    'Keep weekly grades strong; recent Practice Form carries across weeks.',
  'career.program.opportunity.suggestion.schemeFit':
    'Develop toward this offense’s featured WR profile to close the system-fit gap.',
  'career.program.opportunity.suggestion.sustainEdge':
    'Repeat a strong Practice Grade and stay ready; a narrow edge must still clear the movement threshold.',
  'career.program.opportunity.suggestion.talentFit':
    'Train the WR attributes emphasized by this offense to improve Talent Fit.',
  'career.program.opportunity.title': 'Next competition',
  'career.program.opportunity.whyTitle': 'Why you are WR{rank}',
  'career.program.movement.demoted': 'You moved down the depth chart',
  'career.program.movement.held': 'You held your current rank',
  'career.program.movement.heldReason':
    'The evaluation gap did not clear the required change threshold.',
  'career.program.movement.gradeBase': 'Team practice baseline',
  'career.program.movement.gradeBreakdown': 'How Practice Grade was calculated',
  'career.program.movement.gradeFocus': 'Three focus blocks',
  'career.program.movement.gradeFormula':
    'Base + focus + Body + role-adjusted Preparation + Confidence. The total is capped from 0 to 100.',
  'career.program.movement.promoted': 'You moved up the depth chart',
  'career.program.movement.rank': 'WR{before} → WR{after}',
  'career.program.movement.weeklyPractice': 'Practice Grade',
  'career.program.projectedDepth.developmental': 'Long-term development path',
  'career.program.projectedDepth.reserve': 'Reserve competition path',
  'career.program.projectedDepth.rotation': 'Rotation competition path',
  'career.program.projectedDepth.starter': 'Starter competition path',
  'career.program.rating.academics': 'Academics',
  'career.program.rating.development': 'Player development',
  'career.program.rating.nil': 'NIL market',
  'career.program.rating.prestige': 'Prestige',
  'career.program.recruiting.commit': 'Choose this program',
  'career.program.recruiting.eyebrow': 'Program recruiting',
  'career.program.recruiting.help':
    'You can commit only once. Compare prestige, opportunity, and development together.',
  'career.program.recruiting.legend': 'Choose one of five offers',
  'career.program.recruiting.profile': 'Recruit profile',
  'career.program.recruiting.projectedDepth': 'Projected depth path',
  'career.program.recruiting.saving': 'Saving program…',
  'career.program.recruiting.schemeFit': 'Scheme Fit',
  'career.program.recruiting.score': 'Recruit score {count}',
  'career.program.recruiting.startAction': 'View program offers',
  'career.program.recruiting.startHelp':
    'Your existing progress is preserved. Review the offers determined by this player profile.',
  'career.program.recruiting.startTitle': 'It is time to choose a college program',
  'career.program.recruiting.tier.developmental': 'Developmental recruit',
  'career.program.recruiting.tier.national': 'National recruit',
  'career.program.recruiting.tier.priority': 'Priority recruit',
  'career.program.recruiting.title': 'Choose your first program',
  'career.program.role.developmental': 'Developmental',
  'career.program.role.reserve': 'Reserve',
  'career.program.role.rotation': 'Rotation',
  'career.program.role.starter': 'Starter',
  'career.program.room.competitorName': '{given} {family}',
  'career.program.room.count': '{count} WRs',
  'career.program.room.meta': 'Year {classYear} · {role}',
  'career.program.room.score': 'Evaluation {value}',
  'career.program.room.title': 'WR room',
  'career.program.room.you': '(You)',
  'career.program.strength.builder': 'Builder',
  'career.program.strength.contender': 'Contender',
  'career.program.strength.national': 'National',
  'career.program.traits': 'Program traits',
  'career.save.failed':
    'Progress could not be saved. The next step is blocked until saving succeeds.',
  'career.save.reload': 'Reload saved career',
  'career.save.retry': 'Retry save',
  'career.units.feet': 'Feet',
  'career.units.inches': 'Inches',
  'career.game.keySnap.title': 'Play the key snap',
  'career.game.grade.developing': 'Developing',
  'career.game.grade.elite': 'Elite',
  'career.game.grade.poor': 'Poor',
  'career.game.grade.solid': 'Solid',
  'career.game.grade.strong': 'Strong',
  'career.game.information.diagnostic': 'Diagnostic read',
  'career.game.information.filmApplied': 'This week’s Film Study is helping the read.',
  'career.game.information.filmNotApplied': 'No Film Study bonus applies to this snap.',
  'career.game.information.noClues': 'No reliable coverage clue is visible yet.',
  'career.game.information.partial': 'Partial read',
  'career.game.information.title': 'Snap information',
  'career.game.information.uncertain': 'Uncertain',
  'career.game.keySnap.choose': 'Choose the receiver technique you will execute on this snap.',
  'career.game.lastPlay': 'Previous snap: {result} · {yards} yd',
  'career.game.matchup': 'Game matchup',
  'career.game.matchupVersus': 'VS',
  'career.game.no': 'No',
  'career.game.opportunityProgress': 'Key snap {count}/{total}',
  'career.game.phase.keySnap': 'Key snap',
  'career.game.phase.postGame': 'Postgame',
  'career.game.phase.preview': 'Game preview',
  'career.game.play.drop': 'Drop',
  'career.game.play.incomplete': 'Incomplete',
  'career.game.play.notTargeted': 'Not targeted',
  'career.game.play.reception': 'Reception',
  'career.game.play.touchdown': 'Touchdown',
  'career.game.play.turnover': 'Turnover',
  'career.game.postGame.attributeXp': '+{count} game XP',
  'career.game.postGame.continue': 'Finish review and advance',
  'career.game.postGame.grade': 'Performance grade',
  'career.game.postGame.gradeHelp':
    'Production, mistakes, and decision fit are evaluated against your opportunity count.',
  'career.game.postGame.growth': 'Game impact',
  'career.game.postGame.noAttributeXp':
    'No offensive opportunity means no attribute XP was awarded.',
  'career.game.postGame.playResult': '{result} · {yards} yd · decision fit {fit}',
  'career.game.postGame.plays': 'Review key-snap log',
  'career.game.postGame.record': 'Career record {wins}-{losses}-{ties}',
  'career.game.postGame.stats': 'Receiving line',
  'career.game.postGame.title': 'Game result',
  'career.game.preview.filmStudy': 'Film Study',
  'career.game.preview.help': 'Review this week’s readiness and earned role before kickoff.',
  'career.game.preview.opportunities': 'Expected key snaps',
  'career.game.preview.opportunityHelp':
    'Each listed opportunity asks for one meaningful receiver decision.',
  'career.game.preview.open': 'Open Game Day',
  'career.game.preview.role': 'Game role',
  'career.game.preview.start': 'Start game',
  'career.game.preview.title': 'Next game',
  'career.game.preview.zeroOpportunity':
    'You have no offensive key snap, but role-appropriate participation and feedback will still be recorded.',
  'career.game.result.loss': 'Loss',
  'career.game.result.tie': 'Tie',
  'career.game.result.win': 'Win',
  'career.game.saving': 'Saving game…',
  'career.game.scoreboard': 'Game score',
  'career.game.situation': 'Q{period} {clock} · down {down} and {distance} · yard line {yardLine}',
  'career.game.stats.drops': 'Drops',
  'career.game.stats.receptions': 'Receptions',
  'career.game.stats.targets': 'Targets',
  'career.game.stats.touchdowns': 'Touchdowns',
  'career.game.stats.turnovers': 'Turnovers',
  'career.game.stats.yards': 'Receiving yards',
  'career.game.venue.away': 'Away game',
  'career.game.venue.home': 'Home game',
  'career.game.yes': 'Yes',
  'career.week.addAction': 'Add focus',
  'career.week.commit': 'Commit three focus blocks',
  'career.week.draft.empty': 'Choose a focus',
  'career.week.draft.moveDown': 'Move down one slot',
  'career.week.draft.moveUp': 'Move up one slot',
  'career.week.draft.remove': 'Remove {action}',
  'career.week.end.advance': 'Advance to next week',
  'career.week.end.help': 'Review all three focus consequences and your football outcome.',
  'career.week.end.passiveRecovery': 'Advancing restores {count} Body for the next week.',
  'career.week.end.preparationRollover':
    'Preparation carries partway toward neutral next week: {before} → {after}.',
  'career.week.end.title': 'Week summary',
  'career.week.breakthrough.title': 'Skill breakthrough',
  'career.week.phase.breakthrough': 'Breakthrough',
  'career.week.phase.end': 'Week end',
  'career.week.phase.plan': 'Weekly focus',
  'career.week.phase.resolve': 'Focus resolution',
  'career.week.phaseLabel': 'Current phase',
  'career.week.plan.help':
    'Team practice is implicit. Choose three discretionary focus blocks; they resolve in order and may repeat.',
  'career.week.plan.title': 'Choose this week’s focus',
  'career.week.preview': 'Base change before equipped skills',
  'career.week.practiceImpact': 'Practice Grade focus',
  'career.week.queue.complete': 'Complete',
  'career.week.queue.current': 'Up next',
  'career.week.queue.waiting': 'Waiting',
  'career.week.remaining': 'Actions left',
  'career.week.resolve.next': 'Resolve next focus',
  'career.week.resolve.title': 'Resolve your focus blocks',
  'career.week.result.actionNumber': 'Focus {count}',
  'career.week.result.appliedXp': '+{count} applied XP',
  'career.week.result.bodyEfficiency': 'Body efficiency: {value}',
  'career.week.result.breakdown': 'XP calculation',
  'career.week.result.latest': 'Latest consequence',
  'career.week.result.proficiency': 'Training proficiency',
  'career.week.result.proficiencyLevel': 'Level {before} → {after}',
  'career.week.result.proficiencyUses': 'Uses {before} → {after}',
  'career.week.result.xpBreakdown': 'Base {base} · awarded {awarded} · applied {applied}',
  'career.week.saving': 'Saving…',
  'career.week.strategyStatus': 'Current weekly strategy state',
  'creation.archetypes.deepThreat.description':
    'Starts with elite Speed and Burst, trading away Hands and Catch in Traffic.',
  'creation.archetypes.deepThreat.name': 'Deep Threat',
  'creation.archetypes.possessionReceiver.description':
    'Starts with reliable Hands, contested-catch skill, and Strength, but less Speed and Burst.',
  'creation.archetypes.possessionReceiver.name': 'Possession Receiver',
  'creation.archetypes.routeTechnician.description':
    'Starts with polished Route Running and Release, trading away some Speed and Strength.',
  'creation.archetypes.routeTechnician.name': 'Route Technician',
  'creation.backgrounds.blueChipStar.description':
    'Arrives with polished Burst and Release under high expectations, but less Durability and Blocking preparation.',
  'creation.backgrounds.blueChipStar.name': 'Blue-Chip Star',
  'creation.backgrounds.lateBloomer.description':
    'Developed late with less technical polish, but brings strong Work Ethic and Conditioning.',
  'creation.backgrounds.lateBloomer.name': 'Late Bloomer',
  'creation.backgrounds.legacyRecruit.description':
    'Grew up around football with advanced Football IQ and Composure, but needs more Strength and Conditioning under family expectations.',
  'creation.backgrounds.legacyRecruit.name': 'Legacy Recruit',
  'creation.backgrounds.smallTownStar.description':
    'Proved capable of catching and creating yards, but has less exposure to complex schemes and refined releases.',
  'creation.backgrounds.smallTownStar.name': 'Small-Town Star',
  'creation.backgrounds.underRecruitedAthlete.description':
    'Brings Agility and Work Ethic, but starts raw in Route Running and Hands.',
  'creation.backgrounds.underRecruitedAthlete.name': 'Under-Recruited Athlete',
  'creation.personalities.competitive.description':
    'Draws extra Work Ethic from competition, but begins slightly worn down from pushing too hard.',
  'creation.personalities.competitive.name': 'Competitive',
  'creation.personalities.confident.description':
    'Starts with high Confidence, but early certainty can cost some Composure under pressure.',
  'creation.personalities.confident.name': 'Confident',
  'creation.personalities.disciplined.description':
    'Begins with strong Discipline, but a cautious approach leaves initial Confidence slightly lower.',
  'creation.personalities.disciplined.name': 'Disciplined',
  'creation.personalities.hotHeaded.description':
    'Feeds Confidence with emotional energy, but lower Discipline can invite volatile moments.',
  'creation.personalities.hotHeaded.name': 'Hot-Headed',
  'creation.personalities.independent.description':
    'Drives personal training with extra Work Ethic, but needs more time to build Coach Trust.',
  'creation.personalities.independent.name': 'Independent',
  'creation.personalities.leader.description':
    'Earns early Coach Trust by setting the tone, but extra responsibility leaves Body slightly lower.',
  'creation.personalities.leader.name': 'Leader',
  'creation.personalities.quiet.description':
    'Observes calmly with extra Composure, but a low profile slows early Brand growth.',
  'creation.personalities.quiet.name': 'Quiet',
  'creation.personalities.social.description':
    'Builds an early Brand through campus connections, but the commitments slightly reduce starting GPA.',
  'creation.personalities.social.name': 'Social',
  'help.close': 'Close',
  'help.guides': 'Guide topics',
  'help.intro':
    'Review what each system changes, or ask a guide to appear again on its contextual screen.',
  'help.label': 'Support',
  'help.open': 'Help',
  'help.replayAll': 'Show all guides again',
  'help.replayTopic': 'Show this guide in context',
  'help.title': 'Help & settings',
  'locale.enUS': 'English',
  'locale.koKR': 'Korean',
  'locale.label': 'Language',
  'onboarding.complete': 'Got it',
  'onboarding.creation.consequence':
    'Archetype, background, and personality change starting ratings, state, tags, recruiting fit, and later eligibility. Your saved appearance stays with this career.',
  'onboarding.creation.purpose':
    'Create one athlete whose identity and development path will carry through the whole career.',
  'onboarding.creation.title': 'Build a distinct athlete',
  'onboarding.label': 'Quick guide',
  'onboarding.skills.consequence':
    'What you do each week fills the Breakthrough Gauge and makes related cards more likely to appear. Equipped cards can change development, role and trust, game day, mindset, body, and life decisions.',
  'onboarding.skills.purpose':
    'Build a four-card loadout around the career you want, then earn deliberate breakthrough choices.',
  'onboarding.skills.title': 'Shape your build',
  'onboarding.skipAll': 'Skip all guides',
  'onboarding.team.consequence':
    'Talent fit, Coach Trust, Practice Form, scheme fit, and readiness determine depth rank. Position-coach, teammate, and competitor relationships also change trust, transfer information, and opportunity snaps.',
  'onboarding.team.purpose':
    'Use Team to understand your current opportunity and what is likely to earn a larger role.',
  'onboarding.team.title': 'Read the depth path',
  'onboarding.week.consequence':
    'Three focus blocks change Body, Preparation, Confidence, GPA, XP, and Practice Grade. Academic checkpoints can remove game opportunities, while accepted NIL commitments use focus and must be fulfilled or defaulted each due week.',
  'onboarding.week.purpose':
    'Choose the extra work and recovery that define this week; the team schedule happens automatically.',
  'onboarding.week.title': 'Set weekly priorities',
  'skills.balancedCalendarB.description': 'Study Hall also restores 8 Body.',
  'skills.balancedCalendarB.name': 'Balanced Calendar',
  'skills.broadHorizonB.description':
    'Planning three distinct training actions grants 15% more training XP, while repeating a training action grants 10% less XP.',
  'skills.broadHorizonB.name': 'Broad Horizon',
  'skills.compressedRecoveryS.description':
    'Training costs 20% less Body, but week-end passive Body recovery is reduced by 6.',
  'skills.compressedRecoveryS.name': 'Compressed Recovery',
  'skills.coverageLedgerB.description':
    'Film Study grants 10% more XP and reveals one additional coverage clue on an eligible key snap.',
  'skills.coverageLedgerB.name': 'Coverage Ledger',
  'skills.edgeOfFocusA.description':
    'At 40 Body or lower, training grants 25% more XP but costs 25% more Body.',
  'skills.edgeOfFocusA.name': 'Edge of Focus',
  'skills.emptyTankRepsA.description':
    'At 35 Body or lower, training grants 30% more XP but costs 20% more Body.',
  'skills.emptyTankRepsA.name': 'Empty-Tank Reps',
  'skills.family.body': 'Body',
  'skills.family.development': 'Development',
  'skills.family.roleCoach': 'Role / Coach',
  'skills.family.gameDay': 'Game Day',
  'skills.family.life': 'Life',
  'skills.family.mindset': 'Mindset',
  'skills.firstStepLabB.description':
    'Release Drills grant 20% more attribute XP but cost 10% more Body.',
  'skills.firstStepLabB.name': 'First-Step Lab',
  'skills.fullRouteCircuitA.description':
    'Extra Practice grants 25% more attribute XP but costs 20% more Body.',
  'skills.fullRouteCircuitA.name': 'Full-Route Circuit',
  'skills.grade.a': 'Grade A',
  'skills.grade.b': 'Grade B',
  'skills.grade.c': 'Grade C',
  'skills.grade.s': 'Grade S',
  'skills.highPointWagerA.description':
    'Catch Work grants 10% more XP. Aggressive contested catches gain 8 percentage points of success, but tipped-turnover risk gains 5 points.',
  'skills.highPointWagerA.name': 'High-Point Wager',
  'skills.lateSetEngineB.description': 'At 60 Body or higher, training costs 15% less Body.',
  'skills.lateSetEngineB.name': 'Late-Set Engine',
  'skills.oneMoreRepC.description':
    'The second and third use of the same training action this week grant 12% more XP.',
  'skills.oneMoreRepC.name': 'One More Rep',
  'skills.openFieldDareS.description':
    'Speed Work grants 10% more XP. Aggressive yards after catch increase by 20%, but fumble risk increases by 25%.',
  'skills.openFieldDareS.name': 'Open-Field Dare',
  'skills.recoveryWindowC.description': 'Recovery restores 8 additional Body.',
  'skills.recoveryWindowC.name': 'Recovery Window',
  'skills.resetRitualB.description': 'Training immediately after Recovery grants 15% more XP.',
  'skills.resetRitualB.name': 'Reset Ritual',
  'skills.routeNotebookC.description': 'Route Drills grant 15% more attribute XP.',
  'skills.routeNotebookC.name': 'Route Notebook',
  'skills.secureHandsRoutineB.description':
    'Catch Work grants 15% more attribute XP and costs 10% less Body.',
  'skills.secureHandsRoutineB.name': 'Secure Hands Routine',
  'skills.studyBufferC.description': 'Study Hall grants an additional 0.05 GPA.',
  'skills.studyBufferC.name': 'Study Buffer',
  'skills.twoTrackWeekA.description':
    'Study Hall grants 0.05 less GPA, but the training action immediately after it grants 25% more XP.',
  'skills.twoTrackWeekA.name': 'Two-Track Week',
  'skills.assignmentEchoC.description':
    'Film Study grants +3 Preparation and improves assignment reliability on eligible key snaps.',
  'skills.assignmentEchoC.name': 'Assignment Echo',
  'skills.cleanInstallB.description':
    'Route Drills and Release Drills add +2 Practice impact for committed players.',
  'skills.cleanInstallB.name': 'Clean Install',
  'skills.packageMemoryB.description':
    'Film Study grants +4 Preparation and improves package-snap opportunity.',
  'skills.packageMemoryB.name': 'Package Memory',
  'skills.quietCheckinC.description':
    'Recovery grants +5 Confidence and offsets 1 point of its Practice impact.',
  'skills.quietCheckinC.name': 'Quiet Check-in',
  'skills.trustWindowA.description':
    'Extra Practice adds +4 Practice impact but costs 3 Confidence.',
  'skills.trustWindowA.name': 'Trust Window',
  'skills.signalReaderA.description':
    'Film Study grants +6 Preparation and improves assignment reliability and pressure composure.',
  'skills.signalReaderA.name': 'Signal Reader',
  'skills.coachesKeyS.description':
    'Film Study and Extra Practice grant +5 Preparation and +5 Practice impact but cost 4 Confidence; package and pressure opportunities improve.',
  'skills.coachesKeyS.name': "Coach's Key",
  'skills.composureAnchorB.description':
    'Film Study and Recovery grant +5 Confidence and improve pressure composure.',
  'skills.composureAnchorB.name': 'Composure Anchor',
  'skills.campusBridgeB.description':
    'Study Hall grants an additional 0.05 GPA; eligible NIL rewards improve by 10%, positive relationship gains improve by 20%, and a campus-event option becomes available.',
  'skills.campusBridgeB.name': 'Campus Bridge',
  'skills.stemLibraryC.description': 'Route Drills and Release Drills earn 8% more attribute XP.',
  'skills.stemLibraryC.name': 'Stem Library',
  'skills.catchPointMapB.description':
    'Hands & Catch Work earns 15% more attribute XP and +2 Preparation.',
  'skills.catchPointMapB.name': 'Catch-Point Map',
  'skills.accelerationLadderB.description':
    'Speed Work earns 20% more attribute XP but its Body cost is 10% greater.',
  'skills.accelerationLadderB.name': 'Acceleration Ladder',
  'skills.techniqueChainA.description':
    'With three distinct weekly actions, training earns 20% more attribute XP and +2 Practice impact.',
  'skills.techniqueChainA.name': 'Technique Chain',
  'skills.sidelineCompassC.description':
    'Route Drills earn 8% more attribute XP and assignment execution improves on Game Day.',
  'skills.sidelineCompassC.name': 'Sideline Compass',
  'skills.leverageSnapshotC.description':
    'Film Study grants +2 Preparation and reveals an extra coverage clue when eligible.',
  'skills.leverageSnapshotC.name': 'Leverage Snapshot',
  'skills.lateHandsB.description':
    'Hands & Catch Work earns 10% more attribute XP and contested-catch execution improves.',
  'skills.lateHandsB.name': 'Late Hands',
  'skills.stemPressureB.description':
    'Release Drills earn 10% more attribute XP and package-snap opportunity improves.',
  'skills.stemPressureB.name': 'Stem Pressure',
  'skills.redZonePatienceA.description':
    'Hands & Catch Work grants +3 Confidence; contested catches and pressure execution improve.',
  'skills.redZonePatienceA.name': 'Red-Zone Patience',
  'skills.scrambleCompassA.description':
    'Film Study grants +4 Preparation, reveals an extra coverage clue, and improves assignment execution.',
  'skills.scrambleCompassA.name': 'Scramble Compass',
  'skills.fourthQuarterSparkS.description':
    'Speed Work earns 10% more attribute XP and open-field yardage improves, but fumble risk rises 15%.',
  'skills.fourthQuarterSparkS.name': 'Fourth-Quarter Spark',
  'skills.trainingBufferB.description':
    'Recovery grants +4 additional Body and weekly injury risk is reduced by 20%.',
  'skills.trainingBufferB.name': 'Training Buffer',
  'skills.nextSnapResetA.description':
    'Recovery grants +4 Confidence and pressure execution improves on Game Day.',
  'skills.nextSnapResetA.name': 'Next-Snap Reset',
  'gameContent.clues.headUpLeverage.description':
    'The defender is square and can close either direction.',
  'gameContent.clues.headUpLeverage.name': 'Head-up leverage',
  'gameContent.clues.insideLeverage.description':
    'The defender is taking away the inside path first.',
  'gameContent.clues.insideLeverage.name': 'Inside leverage',
  'gameContent.clues.offMan.description': 'The defender has cushion and is reading your movement.',
  'gameContent.clues.offMan.name': 'Off man',
  'gameContent.clues.outsideLeverage.description':
    'The defender is taking away the outside path first.',
  'gameContent.clues.outsideLeverage.name': 'Outside leverage',
  'gameContent.clues.pressMan.description':
    'The defender is close to the line and disrupting your first move.',
  'gameContent.clues.pressMan.name': 'Press man',
  'gameContent.clues.singleHighZone.description':
    'One deep safety remains over the middle of the zone shell.',
  'gameContent.clues.singleHighZone.name': 'Single-high zone',
  'gameContent.clues.twoHighZone.description':
    'Two deep safeties are dividing the space over the top.',
  'gameContent.clues.twoHighZone.name': 'Two-high zone',
  'gameContent.decisions.attackHighPoint.description':
    'Claim the ball at its highest point before the defender can finish.',
  'gameContent.decisions.attackHighPoint.name': 'Attack the high point',
  'gameContent.decisions.burstUpfield.description':
    'Accelerate at once and attack the remaining vertical grass.',
  'gameContent.decisions.burstUpfield.name': 'Burst upfield',
  'gameContent.decisions.crossFace.description':
    'Cross the defender’s face and claim the opposite space first.',
  'gameContent.decisions.crossFace.name': 'Cross the face',
  'gameContent.decisions.cutbackLane.description':
    'Use the pursuit angle to switch into the cutback lane.',
  'gameContent.decisions.cutbackLane.name': 'Take the cutback',
  'gameContent.decisions.handClear.description':
    'Clear the contact with your hands and reclaim your body line.',
  'gameContent.decisions.handClear.name': 'Clear the hands',
  'gameContent.decisions.lateHands.description':
    'Hide your hands until arrival so the defender reacts late.',
  'gameContent.decisions.lateHands.name': 'Show late hands',
  'gameContent.decisions.patientFeint.description':
    'Stay patient and move the defender’s balance with a feint.',
  'gameContent.decisions.patientFeint.name': 'Use a patient feint',
  'gameContent.decisions.protectBall.description':
    'Prioritize two-hand ball security over extra yards.',
  'gameContent.decisions.protectBall.name': 'Protect the ball',
  'gameContent.decisions.secureFrame.description':
    'Use your frame to shield contact and build a stable catch window.',
  'gameContent.decisions.secureFrame.name': 'Secure with your frame',
  'gameContent.decisions.settleWindow.description':
    'Stop in the zone window and show the quarterback a clean target.',
  'gameContent.decisions.settleWindow.name': 'Settle in the window',
  'gameContent.decisions.speedRelease.description':
    'Use two explosive steps to win before contact lands.',
  'gameContent.decisions.speedRelease.name': 'Use a speed release',
  'gameContent.decisions.stackDefender.description':
    'Take the defender’s path and preserve a two-way break.',
  'gameContent.decisions.stackDefender.name': 'Stack the defender',
  'gameContent.families.catch.description':
    'Read the ball flight and contact, then choose how to finish the catch.',
  'gameContent.families.catch.name': 'Catch approach',
  'gameContent.families.release.description':
    'Choose an individual line-release technique, not the team play call.',
  'gameContent.families.release.name': 'Release technique',
  'gameContent.families.route.description':
    'Adjust your stem and arrival point to the defender’s leverage.',
  'gameContent.families.route.name': 'Route response',
  'gameContent.families.yac.description':
    'Balance extra yards against ball security after the catch.',
  'gameContent.families.yac.name': 'After-catch choice',
  'gameContent.patterns.boundaryJam.description':
    'Create the first pocket of space without losing the boundary timing.',
  'gameContent.patterns.boundaryJam.name': 'Boundary checkpoint',
  'gameContent.patterns.boundaryWindow.description':
    'The pass arrives through a narrow throwing window by the boundary.',
  'gameContent.patterns.boundaryWindow.name': 'Boundary window',
  'gameContent.patterns.closingSafety.description':
    'As you finish the catch, a deep defender closes from straight ahead.',
  'gameContent.patterns.closingSafety.name': 'Closing safety',
  'gameContent.patterns.nickelCrossface.description':
    'From the slot, you run level with a defender toward the break point.',
  'gameContent.patterns.nickelCrossface.name': 'Nickel break',
  'gameContent.patterns.pursuitAngle.description':
    'After a short catch, a second defender builds a pursuit angle.',
  'gameContent.patterns.pursuitAngle.name': 'Pursuit angle',
  'gameContent.patterns.reducedSplit.description':
    'From a reduced split, choose the first beat of your route entry.',
  'gameContent.patterns.reducedSplit.name': 'Reduced-split entry',
  'gameContent.patterns.seamCollision.description':
    'A deep ball between the hashes drops toward the contact point.',
  'gameContent.patterns.seamCollision.name': 'Seam collision point',
  'gameContent.patterns.twoHighVoid.description':
    'At intermediate depth, find the same open space as your quarterback.',
  'gameContent.patterns.twoHighVoid.name': 'Intermediate void',
  'gameContent.participation.offensiveRole.description':
    'Your earned offensive package created the key-snap opportunities shown in this game.',
  'gameContent.participation.offensiveRole.name': 'Offensive role',
  'gameContent.participation.specialTeams.description':
    'You contributed on coverage and return-unit assignments without recording an offensive target.',
  'gameContent.participation.specialTeams.name': 'Special-teams work',
  'gameContent.participation.packageReps.description':
    'You dressed for a limited receiver package, but the game script did not call your number.',
  'gameContent.participation.packageReps.name': 'Package readiness',
  'gameContent.participation.lateReps.description':
    'You took late snaps to reinforce alignment and tempo without an official target.',
  'gameContent.participation.lateReps.name': 'Late-game reps',
  'gameContent.participation.sidelineLearning.description':
    'You tracked coverage adjustments with the position group and prepared for the next call.',
  'gameContent.participation.sidelineLearning.name': 'Sideline reads',
  'gameContent.participation.scoutPreparation.description':
    'Your game-day contribution came through opponent-look preparation and developmental reps.',
  'gameContent.participation.scoutPreparation.name': 'Scout preparation',
  'programWorld.defenseStyles.matchZone.description':
    'Adjusts zone responsibilities to the route distribution of the receiving corps.',
  'programWorld.defenseStyles.matchZone.name': 'Match Zone',
  'programWorld.defenseStyles.multiple.description':
    'Changes fronts and coverages broadly according to opponent and situation.',
  'programWorld.defenseStyles.multiple.name': 'Multiple',
  'programWorld.defenseStyles.pressureFront.description':
    'Attacks the offensive front and forces the ball out under pressure.',
  'programWorld.defenseStyles.pressureFront.name': 'Pressure Front',
  'programWorld.defenseStyles.twoHigh.description':
    'Protects deep space and patiently limits short gains from two-high shells.',
  'programWorld.defenseStyles.twoHigh.name': 'Two-High',
  'programWorld.offenseStyles.balancedTempo.description':
    'Uses a flexible tempo and meaningful work for several receiver roles.',
  'programWorld.offenseStyles.balancedTempo.name': 'Balanced Tempo',
  'programWorld.offenseStyles.powerPlayAction.description':
    'Builds contested and intermediate timing routes behind a physical run threat.',
  'programWorld.offenseStyles.powerPlayAction.name': 'Power Play-Action',
  'programWorld.offenseStyles.precisionSpread.description':
    'Attacks space in layers through polished releases and exact route timing.',
  'programWorld.offenseStyles.precisionSpread.name': 'Precision Spread',
  'programWorld.offenseStyles.spaceMotion.description':
    'Uses motion and wide spacing to create open grass for quick, agile receivers.',
  'programWorld.offenseStyles.spaceMotion.name': 'Space Motion',
  'programWorld.offenseStyles.verticalStretch.description':
    'Continuously threatens defensive depth through receiver speed and releases.',
  'programWorld.offenseStyles.verticalStretch.name': 'Vertical Stretch',
  'programWorld.programs.emberPeakPolytechnic.description':
    'A mountain technical program that turns overlooked players into contributors through physical, methodical development.',
  'programWorld.programs.emberPeakPolytechnic.name': 'Ember Peak Polytechnic',
  'programWorld.programs.emberPeakPolytechnic.shortName': 'Ember Peak',
  'programWorld.programs.capitalCommonwealth.description':
    'A national power where metropolitan resources, demanding academics, and enormous expectations converge.',
  'programWorld.programs.capitalCommonwealth.name': 'Capital Commonwealth',
  'programWorld.programs.capitalCommonwealth.shortName': 'Capital',
  'programWorld.programs.cascadeTech.description':
    'A northwestern program that develops receivers through engineering-minded training and inventive motion.',
  'programWorld.programs.cascadeTech.name': 'Cascade Tech',
  'programWorld.programs.cascadeTech.shortName': 'Cascade',
  'programWorld.programs.gulfMeridian.description':
    'A Gulf-region power that draws from a deep talent base and expects to contend every season.',
  'programWorld.programs.gulfMeridian.name': 'Gulf Meridian',
  'programWorld.programs.gulfMeridian.shortName': 'Meridian',
  'programWorld.programs.highDesertState.description':
    'A rising state program that gives new players opportunity in an aggressive downfield attack.',
  'programWorld.programs.highDesertState.name': 'High Desert State',
  'programWorld.programs.highDesertState.shortName': 'High Desert',
  'programWorld.programs.ironwood.description':
    'A traditional power shaped by physical training, steady leadership, and veteran competition.',
  'programWorld.programs.ironwood.name': 'Ironwood',
  'programWorld.programs.ironwood.shortName': 'Ironwood',
  'programWorld.programs.lakefrontUnion.description':
    'A Great Lakes contender built on patient development and a balanced offensive identity.',
  'programWorld.programs.lakefrontUnion.name': 'Lakefront Union',
  'programWorld.programs.lakefrontUnion.shortName': 'Lakefront',
  'programWorld.programs.northstarCollege.description':
    'A small academic college offering a patient growth path and a low-noise football environment.',
  'programWorld.programs.northstarCollege.name': 'Northstar College',
  'programWorld.programs.northstarCollege.shortName': 'Northstar',
  'programWorld.programs.prairieForge.description':
    'A heartland program that turns raw prospects into rotation players through stable coaching and hard work.',
  'programWorld.programs.prairieForge.name': 'Prairie Forge',
  'programWorld.programs.prairieForge.shortName': 'Prairie Forge',
  'programWorld.programs.redwoodBay.description':
    'An ambitious contender combining a coastal spotlight with a fast downfield offense.',
  'programWorld.programs.redwoodBay.name': 'Redwood Bay',
  'programWorld.programs.redwoodBay.shortName': 'Redwood',
  'programWorld.programs.solisCoast.description':
    'A coastal national power fueled by a major market and an inventive space-based offense.',
  'programWorld.programs.solisCoast.name': 'Solis Coast',
  'programWorld.programs.solisCoast.shortName': 'Solis',
  'programWorld.programs.crownSound.description':
    'An Atlantic contender balancing regional roots, stable coaching, and open competition.',
  'programWorld.programs.crownSound.name': 'Crown Sound University',
  'programWorld.programs.crownSound.shortName': 'Crown Sound',
  'programWorld.regions.appalachian.description':
    'Mountain towns and close-knit football communities define this region.',
  'programWorld.regions.appalachian.name': 'Appalachian',
  'programWorld.regions.atlantic.description':
    'Coastal cities meet established inland football communities in this region.',
  'programWorld.regions.atlantic.name': 'Atlantic',
  'programWorld.regions.cascade.description':
    'Rainy northwestern cities and mountain country share this recruiting region.',
  'programWorld.regions.cascade.name': 'Cascade',
  'programWorld.regions.greatLakes.description':
    'Cold weather and industrial cities support a physical football culture.',
  'programWorld.regions.greatLakes.name': 'Great Lakes',
  'programWorld.regions.gulf.description':
    'Warm coastal communities and a deep high-school talent pool fill this region.',
  'programWorld.regions.gulf.name': 'Gulf',
  'programWorld.regions.highDesert.description':
    'High-elevation cities and wide dry landscapes make up this region.',
  'programWorld.regions.highDesert.name': 'High Desert',
  'programWorld.regions.pacificCoast.description':
    'Major markets and fast football cultures line this western coastal region.',
  'programWorld.regions.pacificCoast.name': 'Pacific Coast',
  'programWorld.regions.prairie.description':
    'Open plains and tightly connected communities shape this inland region.',
  'programWorld.regions.prairie.name': 'Prairie',
  'programWorld.roster.family.adeyemi': 'Adeyemi',
  'programWorld.roster.family.alvarez': 'Alvarez',
  'programWorld.roster.family.banks': 'Banks',
  'programWorld.roster.family.bennett': 'Bennett',
  'programWorld.roster.family.brooks': 'Brooks',
  'programWorld.roster.family.carter': 'Carter',
  'programWorld.roster.family.chen': 'Chen',
  'programWorld.roster.family.coleman': 'Coleman',
  'programWorld.roster.family.dawson': 'Dawson',
  'programWorld.roster.family.diaz': 'Diaz',
  'programWorld.roster.family.ellis': 'Ellis',
  'programWorld.roster.family.ford': 'Ford',
  'programWorld.roster.family.freeman': 'Freeman',
  'programWorld.roster.family.grant': 'Grant',
  'programWorld.roster.family.griffin': 'Griffin',
  'programWorld.roster.family.harris': 'Harris',
  'programWorld.roster.family.hayes': 'Hayes',
  'programWorld.roster.family.ibarra': 'Ibarra',
  'programWorld.roster.family.jackson': 'Jackson',
  'programWorld.roster.family.kim': 'Kim',
  'programWorld.roster.family.king': 'King',
  'programWorld.roster.family.lawson': 'Lawson',
  'programWorld.roster.family.mitchell': 'Mitchell',
  'programWorld.roster.family.nguyen': 'Nguyen',
  'programWorld.roster.family.okafor': 'Okafor',
  'programWorld.roster.family.patel': 'Patel',
  'programWorld.roster.family.quinn': 'Quinn',
  'programWorld.roster.family.reed': 'Reed',
  'programWorld.roster.family.robinson': 'Robinson',
  'programWorld.roster.family.santos': 'Santos',
  'programWorld.roster.family.walker': 'Walker',
  'programWorld.roster.family.young': 'Young',
  'programWorld.roster.given.adrian': 'Adrian',
  'programWorld.roster.given.amari': 'Amari',
  'programWorld.roster.given.anton': 'Anton',
  'programWorld.roster.given.bryce': 'Bryce',
  'programWorld.roster.given.caleb': 'Caleb',
  'programWorld.roster.given.cameron': 'Cameron',
  'programWorld.roster.given.darius': 'Darius',
  'programWorld.roster.given.desmond': 'Desmond',
  'programWorld.roster.given.devon': 'Devon',
  'programWorld.roster.given.elias': 'Elias',
  'programWorld.roster.given.emmett': 'Emmett',
  'programWorld.roster.given.everett': 'Everett',
  'programWorld.roster.given.felix': 'Felix',
  'programWorld.roster.given.gabriel': 'Gabriel',
  'programWorld.roster.given.henry': 'Henry',
  'programWorld.roster.given.isaiah': 'Isaiah',
  'programWorld.roster.given.jalen': 'Jalen',
  'programWorld.roster.given.jamir': 'Jamir',
  'programWorld.roster.given.jordan': 'Jordan',
  'programWorld.roster.given.kai': 'Kai',
  'programWorld.roster.given.keon': 'Keon',
  'programWorld.roster.given.leon': 'Leon',
  'programWorld.roster.given.malik': 'Malik',
  'programWorld.roster.given.marcus': 'Marcus',
  'programWorld.roster.given.miles': 'Miles',
  'programWorld.roster.given.nico': 'Nico',
  'programWorld.roster.given.noah': 'Noah',
  'programWorld.roster.given.omar': 'Omar',
  'programWorld.roster.given.quincy': 'Quincy',
  'programWorld.roster.given.roman': 'Roman',
  'programWorld.roster.given.terrell': 'Terrell',
  'programWorld.roster.given.zayne': 'Zayne',
  'programWorld.rotationPolicies.balanced.description':
    'Centers the starters while assigning steady snaps to the upper rotation.',
  'programWorld.rotationPolicies.balanced.name': 'Balanced Rotation',
  'programWorld.rotationPolicies.tight.description':
    'Concentrates most receiver snaps among the most proven players.',
  'programWorld.rotationPolicies.tight.name': 'Tight Rotation',
  'programWorld.rotationPolicies.wide.description':
    'Distributes roles and snaps across a broader group of receivers.',
  'programWorld.rotationPolicies.wide.name': 'Wide Rotation',
  'programWorld.traits.academicStandard.description':
    'Demanding academic expectations add weight to choices away from practice.',
  'programWorld.traits.academicStandard.name': 'Academic Standard',
  'programWorld.traits.creativeScheme.description':
    'Varied alignments and motion find new uses for each receiver profile.',
  'programWorld.traits.creativeScheme.name': 'Creative Scheme',
  'programWorld.traits.developmentLab.description':
    'Detailed training and feedback support long-term player growth.',
  'programWorld.traits.developmentLab.name': 'Development Lab',
  'programWorld.traits.donorMarket.description':
    'A deep supporter market expands brand opportunity and expectations together.',
  'programWorld.traits.donorMarket.name': 'Donor Market',
  'programWorld.traits.nationalExpectations.description':
    'Every season begins with an expectation to compete on the national stage.',
  'programWorld.traits.nationalExpectations.name': 'National Expectations',
  'programWorld.traits.openCompetition.description':
    'Current preparation and practice matter more than prior recruiting reputation.',
  'programWorld.traits.openCompetition.name': 'Open Competition',
  'programWorld.traits.patientPath.description':
    'The staff favors staged development and role growth over instant results.',
  'programWorld.traits.patientPath.name': 'Patient Path',
  'programWorld.traits.physicalCulture.description':
    'Demanding strength work and contested-play technique shape the room.',
  'programWorld.traits.physicalCulture.name': 'Physical Culture',
  'programWorld.traits.proWorkshop.description':
    'Technique and preparation are refined with the next level in mind.',
  'programWorld.traits.proWorkshop.name': 'Pro Workshop',
  'programWorld.traits.quietFocus.description':
    'A low-noise environment makes it easier to focus on academics and individual growth.',
  'programWorld.traits.quietFocus.name': 'Quiet Focus',
  'programWorld.traits.rebuildEnergy.description':
    'Emerging players can earn early opportunity and responsibility in a changing program.',
  'programWorld.traits.rebuildEnergy.name': 'Rebuild Energy',
  'programWorld.traits.regionalRoots.description':
    'Strong ties to local communities and talent define the program identity.',
  'programWorld.traits.regionalRoots.name': 'Regional Roots',
  'programWorld.traits.spotlightMarket.description':
    'Major-market attention reaches both game day and everyday campus life.',
  'programWorld.traits.spotlightMarket.name': 'Spotlight Market',
  'programWorld.traits.stableStaff.description':
    'Consistent teaching provides a predictable environment for development.',
  'programWorld.traits.stableStaff.name': 'Stable Staff',
  'programWorld.traits.tempoIdentity.description':
    'Fast operation and a high snap count define the offensive rhythm.',
  'programWorld.traits.tempoIdentity.name': 'Tempo Identity',
  'programWorld.traits.veteranLoyalty.description':
    'Experience and accumulated trust carry real weight in role decisions.',
  'programWorld.traits.veteranLoyalty.name': 'Veteran Loyalty',
  'events.campInstall.choices.extraReps.description':
    'Stay for another install period: Preparation +8, Coach Trust +4, Body -7.',
  'events.campInstall.choices.extraReps.name': 'Take the extra reps',
  'events.campInstall.choices.reset.description':
    'Protect tomorrow’s work: Body +9, Confidence +3, Preparation -2.',
  'events.campInstall.choices.reset.name': 'Reset for tomorrow',
  'events.campInstall.description':
    'The receivers can stay after practice to rehearse a new adjustment, but your legs are already carrying the week.',
  'events.campInstall.name': 'One More Install Period',
  'events.spotlight.choices.accept.description':
    'Use the media window: Brand +8, Confidence +4, Preparation -5.',
  'events.spotlight.choices.accept.name': 'Step into the interview',
  'events.spotlight.choices.decline.description':
    'Return to the game plan: Preparation +7, Coach Trust +3, Brand -2.',
  'events.spotlight.choices.decline.name': 'Keep the focus inside',
  'events.spotlight.description':
    'A student broadcaster offers a featured interview before this spotlight game, competing with your final film window.',
  'events.spotlight.name': 'The Spotlight Window',
  'events.teamVoice.choices.checkIns.description':
    'Talk with teammates one by one: Coach Trust +3, Breakthrough +8, Preparation +2.',
  'events.teamVoice.choices.checkIns.name': 'Make quiet check-ins',
  'events.teamVoice.choices.roomMessage.description':
    'Address the full receiver room: Confidence +5, Coach Trust +5, Body -3.',
  'events.teamVoice.choices.roomMessage.name': 'Speak to the room',
  'events.teamVoice.description':
    'A tense practice leaves the receiver room looking for someone who can set the next tone.',
  'events.teamVoice.name': 'A Voice After Practice',
  'career.event.choice.title': 'Choose your response',
  'career.event.phase.choice': 'Weekly Event',
  'career.injury.choice.title': 'Choose an availability plan',
  'career.injury.phase.choice': 'Recovery Decision',
  'career.season.complete.title': 'Career complete',
  'career.season.availability': 'Availability',
  'career.season.availability.full': 'Full availability',
  'career.season.bootstrap.action': 'Begin fall camp',
  'career.season.bootstrap.help':
    'Open the saved season calendar. Camp develops your player and role before the 12-game schedule.',
  'career.season.bootstrap.title': 'Your season is ready',
  'career.season.complete.heading': '{name} joins your alumni history',
  'career.season.complete.help':
    'This career is saved as history. Its legacy expands what future careers can recognize without granting automatic power.',
  'career.season.complete.history': 'Alumni history ({count})',
  'career.season.complete.legacyHelp':
    'The next career can see this alumnus and program familiarity. Ratings, skills, trust, and depth role still must be earned.',
  'career.season.complete.legacyTitle': 'History-first legacy unlocked',
  'career.season.complete.nextCareer': 'Start another career',
  'career.season.complete.statLine': '{catches} REC · {yards} YDS · {touchdowns} TD',
  'career.season.effect': '{label} {value}',
  'career.season.effectSeparator': ' · ',
  'career.season.injuryOpportunityCap':
    'If you play, key-snap opportunities are capped at {count}.',
  'career.season.label': 'Season',
  'career.season.nextOpponent': 'Next opponent',
  'career.season.noOpponent': 'No player game scheduled',
  'career.season.notAvailable': '—',
  'career.season.phase.complete': 'Alumni Legacy',
  'career.season.phase.review': 'Season Review',
  'career.season.postseason.action': 'Set the postseason field',
  'career.season.postseason.help':
    'The top four programs enter the fictional semifinal bracket. Other careers close with their truthful regular-season finish.',
  'career.season.postseason.title': 'The postseason field is set by the standings',
  'career.season.progress.camp': 'Camp round {current} of {total}',
  'career.season.progress.complete': 'Season schedule complete',
  'career.season.progress.pending': 'Calendar not started',
  'career.season.progress.postseason': 'Postseason round {current} of {total}',
  'career.season.progress.regular': 'Regular-season week {current} of {total}',
  'career.season.rank': 'Standing',
  'career.season.rankValue': '#{rank}',
  'career.season.record': 'Program record',
  'career.season.recordValue': '{wins}-{losses}-{ties}',
  'career.season.review.bestGame': 'Best game: {grade} grade · {catches} catches · {yards} yards',
  'career.season.review.completeCareer': 'Save career to alumni history',
  'career.season.review.games': 'Games played',
  'career.season.review.grade': 'Average grade',
  'career.season.review.injuries': 'Injuries',
  'career.season.review.injuryValue': '{count} injuries · {weeks} weeks missed',
  'career.season.review.open': 'Open season review',
  'career.season.review.rank': 'Regular-season rank',
  'career.season.review.ready':
    'Your program result and player journey are ready for one final review before the alumni save.',
  'career.season.review.receiving': 'Receiving production',
  'career.season.review.receivingValue': '{catches} REC · {yards} YDS · {touchdowns} TD',
  'career.season.review.record': 'Program finish: {wins}-{losses}-{ties}',
  'career.season.review.role': 'Final role',
  'career.season.review.title': 'Review your season',
  'career.season.risk': 'Latest weekly injury risk: {value}',
  'career.season.stage.camp': 'Fall Camp',
  'career.season.stage.pending': 'Season Setup',
  'career.season.stage.postseason': 'Postseason',
  'career.season.stage.regular': 'Regular Season',
  'career.season.standings.open': 'Top-four standings',
  'career.season.weekBoundary.action': 'Continue to weekly event and availability',
  'season.camp.competition.description':
    'Role pressure rises as practice evidence begins separating the receiver room.',
  'season.camp.competition.name': 'Camp Competition',
  'season.camp.dressRehearsal.description':
    'The final camp week tests game readiness before the regular season opens.',
  'season.camp.dressRehearsal.name': 'Dress Rehearsal',
  'season.camp.install.description':
    'Learn the system, establish your weekly rhythm, and make a first impression.',
  'season.camp.install.name': 'System Install',
  'season.outcomes.champion.description':
    'Won both postseason games and finished the season as national champion.',
  'season.outcomes.champion.name': 'National Champion',
  'season.outcomes.regularSeasonComplete.description':
    'Completed the full regular season outside the four-team postseason field.',
  'season.outcomes.regularSeasonComplete.name': 'Regular Season Complete',
  'season.outcomes.runnerUp.description':
    'Reached the national final and completed the season as runner-up.',
  'season.outcomes.runnerUp.name': 'National Runner-Up',
  'season.outcomes.semifinalExit.description':
    'Qualified for the postseason and completed the season in the semifinal.',
  'season.outcomes.semifinalExit.name': 'Postseason Semifinalist',
  'season.postseason.final.description':
    'The semifinal winners meet for the championship of this fictional season.',
  'season.postseason.final.name': 'National Final',
  'season.postseason.semifinal.description':
    'The top four programs enter seeded matchups: first against fourth and second against third.',
  'season.postseason.semifinal.name': 'National Semifinals',
  'season.regular.round1.description':
    'The opening slate turns camp progress into the first live depth-role test.',
  'season.regular.round1.name': 'Regular Season Week 1',
  'season.regular.round10.description':
    'Late-season opportunity carries extra weight as the postseason field narrows.',
  'season.regular.round10.name': 'Regular Season Week 10',
  'season.regular.round11.description':
    'The round-robin closes with standings position still available to earn.',
  'season.regular.round11.name': 'Regular Season Week 11',
  'season.regular.round12.description':
    'Six original rivalries close the regular season under a shared spotlight.',
  'season.regular.round12.name': 'Rivalry Week',
  'season.regular.round2.description':
    'Early evidence starts turning first impressions into stable football roles.',
  'season.regular.round2.name': 'Regular Season Week 2',
  'season.regular.round3.description':
    'Preparation and availability matter as opponents begin exposing tendencies.',
  'season.regular.round3.name': 'Regular Season Week 3',
  'season.regular.round4.description':
    'The first month closes with depth movement and team records taking shape.',
  'season.regular.round4.name': 'Regular Season Week 4',
  'season.regular.round5.description':
    'Midseason approaches with development choices competing against fresh-game readiness.',
  'season.regular.round5.name': 'Regular Season Week 5',
  'season.regular.round6.description':
    'Every program reaches the midpoint with a distinct record and role trajectory.',
  'season.regular.round6.name': 'Regular Season Week 6',
  'season.regular.round7.description':
    'The second half rewards players who can sustain trust, Body, and execution.',
  'season.regular.round7.name': 'Regular Season Week 7',
  'season.regular.round8.description':
    'Standings pressure grows while each receiver still has weekly work to win.',
  'season.regular.round8.name': 'Regular Season Week 8',
  'season.regular.round9.description':
    'The final third begins with less room to recover lost team or player momentum.',
  'season.regular.round9.name': 'Regular Season Week 9',
  'season.standings.tiebreakExplanation':
    'Programs are ordered by wins, then head-to-head result when available, schedule strength, and stable program ID.',
  'season.verticalSlice.description':
    'Three fall-camp rounds, twelve games, and a four-team fictional postseason form one complete WR season.',
  'season.verticalSlice.name': 'Saturday Circuit Season',
  'pwa.dismissAction': 'Later',
  'pwa.updateAction': 'Update',
  'pwa.updateAvailable': 'A new version is ready.',
  'storage.degradedWarning':
    'Browser storage is unavailable. Changes in this session may be lost when you close this window.',
  'weeklyActions.extraPractice.description':
    'Spreads work across Route Running, Release, and Hands at the highest Body cost.',
  'weeklyActions.extraPractice.name': 'Extra Practice',
  'weeklyActions.filmStudy.description':
    'Spends a little Body to analyze film and improve Football IQ.',
  'weeklyActions.filmStudy.name': 'Film Study',
  'weeklyActions.handsCatchWork.description':
    'Spends Body to sharpen reliable catching fundamentals.',
  'weeklyActions.handsCatchWork.name': 'Hands and Catch Work',
  'weeklyActions.recovery.description':
    'Trades training time for rest and treatment that restores substantial Body.',
  'weeklyActions.recovery.name': 'Recovery',
  'weeklyActions.releaseDrills.description':
    'Spends Body to sharpen releases at the line of scrimmage.',
  'weeklyActions.releaseDrills.name': 'Release Drills',
  'weeklyActions.routeDrills.description': 'Spends Body to practice more precise Route Running.',
  'weeklyActions.routeDrills.name': 'Route Drills',
  'weeklyActions.speedWork.description':
    'Uses a demanding workout to improve Speed and Burst at a high Body cost.',
  'weeklyActions.speedWork.name': 'Speed Work',
  'weeklyActions.studyHall.description': 'Sets aside academic time to improve GPA.',
  'weeklyActions.studyHall.name': 'Study Hall',
  'weeklyActions.weightRoom.description':
    'Builds Strength and Durability together at a substantial Body cost.',
  'weeklyActions.weightRoom.name': 'Weight Room',
} as const satisfies Record<MessageKey, string>;
