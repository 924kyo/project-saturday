import type { SnapLookCatalogVNext } from './looks.js';
import type { DepthMovementReasonVNext } from './roles.js';
import type { InjuryAvailabilityEvidence, NewInjuryEvidence } from '../injuries/types.js';
import type { EventMechanicsDefinition } from '../events/types.js';
import type { ProgramId } from '../player/ids.js';
import type { CreatedPositionPlayerProfile } from '../player/position-creation.js';
import type { DepthRoleId } from '../programs/ids.js';
import type {
  PositionDepthUpdateEvidence,
  PositionOpportunityProjection,
  PositionRoomContext,
} from '../programs/position-room.js';
import type { RngSeed, RngState } from '../random/rng.js';
import type { SkillId } from '../skills/ids.js';
import type {
  PositionAlphaGameState,
  PositionAlphaSessionCommandMechanics,
} from '../season/position-alpha-session.js';
import type {
  WorldAlphaMechanicsDefinition,
  WorldAlphaSeasonState,
} from '../season/world-alpha.js';
import type { WorldVNextSeasonState } from '../season/world-vnext.js';
import type { NilOfferId, OffFieldBenefitId } from '../off-field/ids.js';
import type { NilEffectApplicationEvidenceV1 } from '../off-field/types.js';
import type { GameStakesVNext } from './stakes.js';
import type { WrAlphaGameState } from '../games/wr-alpha.js';
import type {
  DefenderDecisionDefinition,
  DefenderGameState,
  DefenderPatternDefinition,
  DefenderPositionId,
  DefenderSkillDefinition,
} from '../games/defender.js';
import type { DefenderEventDefinition, WeeklyEventDefinitionV2 } from '../games/defender-events.js';
import type {
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
} from '../games/types.js';
import type {
  CommonPositionProficiencyUses,
  PositionFocusEvidenceV2,
  PositionFocusId,
} from '../weekly/position-focus.js';
import type {
  PositionPracticeGradeProjection,
  PositionTrainingProficiencyUses,
} from '../weekly/position-training.js';

export const CAREER_VNEXT_MODEL = 'career_vnext' as const;
export const CAREER_VNEXT_VERSION = 3 as const;
export const CAREER_VNEXT_REGULAR_SEASON_WEEKS = 12 as const;
/** Bracket weeks after the regular season: first round, quarterfinal, semifinal, final. */
export const CAREER_VNEXT_POSTSEASON_WEEKS = 4 as const;
/** A college career is four seasons (freshman through senior). */
export const CAREER_VNEXT_SEASONS = 4 as const;
/** Every role gets at least this many Saturday decisions; sideline reps fill the gap. */
export const CAREER_VNEXT_MIN_GAME_DECISIONS = 2 as const;

/** Positions with a VNext game adapter. WR/LB/EDGE join through the same interface. */
export type VNextPositionId =
  'position_qb' | 'position_rb' | 'position_wr' | 'position_cb' | 'position_lb' | 'position_edge';

/** The shipped content bundle; VNext reuses catalogs, not the old aggregate. */
/** Authored catalogs for a front-seven position (M8). */
export interface DefenderCatalogVNext {
  readonly patterns: readonly DefenderPatternDefinition[];
  readonly decisions: readonly DefenderDecisionDefinition[];
  readonly skills: readonly (DefenderSkillDefinition & { readonly baseOfferWeight: number })[];
  readonly events: readonly DefenderEventDefinition[];
}

export type OffenseSchemeIdVNext =
  'scheme_spread' | 'scheme_pro_style' | 'scheme_power_run' | 'scheme_air_raid';
export type DefenseSchemeIdVNext = 'scheme_press_man' | 'scheme_zone_match' | 'scheme_pressure';
export type SchemeIdVNext = OffenseSchemeIdVNext | DefenseSchemeIdVNext;
export type DevelopmentTierIdVNext =
  'development_elite' | 'development_strong' | 'development_standard';
export type ExposureTierIdVNext = 'exposure_national' | 'exposure_regional' | 'exposure_local';
export type AcademicSupportIdVNext =
  'academics_strong' | 'academics_standard' | 'academics_limited';
export type NilMarketIdVNext = 'nil_market_major' | 'nil_market_solid' | 'nil_market_small';

/** M12: what a program offers a player beyond its strength (generated content). */
export interface ProgramProfileVNext {
  readonly programId: ProgramId;
  readonly offenseSchemeId: OffenseSchemeIdVNext;
  readonly defenseSchemeId: DefenseSchemeIdVNext;
  readonly developmentTierId: DevelopmentTierIdVNext;
  readonly exposureTierId: ExposureTierIdVNext;
  readonly academicSupportId: AcademicSupportIdVNext;
  readonly nilMarketId: NilMarketIdVNext;
}

/** A scheme and the styles it suits or wastes (every other style is neutral). */
export interface SchemeDefinitionVNext {
  readonly id: SchemeIdVNext;
  readonly side: 'offense' | 'defense';
  readonly idealArchetypeIds: readonly string[];
  readonly poorArchetypeIds: readonly string[];
}

export type CareerVNextMechanics = PositionAlphaSessionCommandMechanics & {
  readonly defenders: Readonly<Record<DefenderPositionId, DefenderCatalogVNext>>;
  /** NIL offers whose authored copy belongs to specific positions (absent = every position). */
  readonly nilOfferPositions: Readonly<Record<string, readonly VNextPositionId[]>>;
  /** Hidden snap looks per decision family (M11): the winning read, tells and board picture. */
  readonly looks: SnapLookCatalogVNext;
  /** Generated `given|family` name pairs VNext never shows (they read as real people; M10). */
  readonly reservedNamePairs: readonly string[];
  /** M12: names a suggestion may use beyond the roster pool (absent = roster pool only). */
  readonly suggestedNames?: {
    readonly givenNameIds: readonly string[];
    readonly familyNameIds: readonly string[];
  };
  /**
   * M12 program profiles: scheme, development, exposure, academics and NIL market per program
   * (absent = every program neutral), and which archetypes each scheme suits.
   */
  readonly programProfiles?: readonly ProgramProfileVNext[];
  readonly schemes?: readonly SchemeDefinitionVNext[];
  /** The legacy mentor scene (M9): an alumnus of the current program checks in. */
  readonly legacyEvents: { readonly mentor: WeeklyEventDefinitionV2 };
  /** Shared campus-life events every position can draw (M8). */
  readonly life: { readonly events: readonly WeeklyEventDefinitionV2[] };
  /** The M8 64-program conference world, for a season that started there (M9 seasons use `world`). */
  readonly world64: WorldAlphaMechanicsDefinition;
  /** The 32-program alpha world, for a season a pre-M8 save started there (M8 seasons use `world`). */
  readonly legacyWorld: WorldAlphaMechanicsDefinition;
  readonly wr: {
    readonly events: readonly EventMechanicsDefinition[];
    readonly families: readonly KeySnapFamilyMechanicsDefinition[];
    readonly patterns: readonly KeySnapPatternMechanicsDefinition[];
  };
};

/** Engine state for any VNext position: shared QB/RB/CB kernels plus the WR kernel. */
export type VNextGameState =
  | PositionAlphaGameState
  | { readonly positionId: 'position_wr'; readonly game: WrAlphaGameState }
  | { readonly positionId: DefenderPositionId; readonly game: DefenderGameState };

export interface RecruitOfferVNext {
  readonly programId: ProgramId;
  readonly programRating: number;
  /** Exact preview of the room the player would join (same derived stream as commitment). */
  readonly preview: {
    readonly rank: number;
    readonly roleId: DepthRoleId;
    readonly opportunity: PositionOpportunityProjection;
    readonly playersAhead: number;
    readonly starterClassYear: 1 | 2 | 3 | 4;
  };
}

export interface AthleteVNext {
  readonly profile: CreatedPositionPlayerProfile;
  readonly proficiencyUses: PositionTrainingProficiencyUses;
  readonly sharedProficiencyUses: CommonPositionProficiencyUses;
  readonly breakthroughGauge: number;
  /**
   * A generated name from the roster name pool (optional, rc.3): shown in the app language. A
   * typed name has none, and `profile.displayName` stays the name as created.
   */
  readonly nameTokens?: AthleteNameTokensVNext;
  /** M12: the creation choices beyond the identity (absent on earlier saves = none). */
  readonly creation?: AthleteCreationVNext;
}

/** M12 creation record: the player's own allocation and story-only choices. */
export interface AthleteCreationVNext {
  readonly allocation: Readonly<Record<string, number>>;
  readonly presetId: string | null;
  /** Allocation points beyond the base budget (legacy head start, Phase 8). */
  readonly bonusBudget: number;
  /** Optional home region: story only, never a rating (absent = not chosen). */
  readonly homeRegionId?: HomeRegionIdVNext;
}

export type HomeRegionIdVNext =
  'home_region_in_state' | 'home_region_out_of_state' | 'home_region_international';

export interface AthleteNameTokensVNext {
  readonly givenNameId: string;
  readonly familyNameId: string;
}

export interface BuildVNext {
  readonly equippedSkillIds: readonly [
    SkillId | null,
    SkillId | null,
    SkillId | null,
    SkillId | null,
  ];
  readonly ownedSkillIds: readonly SkillId[];
}

export interface PracticeReportVNext {
  readonly weekIndex: number;
  readonly focuses: readonly [
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
  ];
  readonly grade: PositionPracticeGradeProjection;
  /** Earned on last Saturday's sideline reps; added to this week's practice score. */
  readonly sidelineCredit: number;
  readonly practiceScore: number;
  readonly depth: PositionDepthUpdateEvidence;
  readonly gaugeBefore: number;
  readonly gaugeAfter: number;
  /** Off-field pull on the practice score: obligation time and the locker room (absent = 0). */
  readonly offFieldDelta?: number;
  /** One-use NIL benefits this week's plan used (absent = none). */
  readonly benefitsUsed?: readonly OffFieldBenefitId[];
  /** Weekly effects of an active NIL obligation (absent = none). */
  readonly obligationApplied?: readonly NilEffectApplicationEvidenceV1[];
  /** M12: the coach's midseason focus as this week settled it (absent = none active). */
  readonly coachFocus?: CoachFocusWeekVNext;
  /** M12 (ROLE-06): the component that decided a depth move (absent = held, or older saves). */
  readonly movementReason?: DepthMovementReasonVNext;
}

/** M12 development calendar: offseason programs (one per offseason). */
export type OffseasonProgramIdVNext =
  | 'offseason_strength'
  | 'offseason_speed'
  | 'offseason_film'
  | 'offseason_clinic'
  | 'offseason_classes';

/** The coach's midseason focus (M12): a drill to run in two of the next three weeks. */
export interface CoachFocusVNext {
  readonly seasonIndex: number;
  readonly focusId: string;
  readonly attributeId: string;
  readonly reason: 'KEY_ATTRIBUTE' | 'MISSED_READS';
  /** First week (season-local index) that counts, and the first week that no longer does. */
  readonly fromWeek: number;
  readonly untilWeek: number;
  readonly required: number;
  readonly done: number;
  readonly outcome: 'ACTIVE' | 'MET' | 'MISSED';
}

/** How a practice week moved the coach's focus. */
export interface CoachFocusWeekVNext {
  readonly counted: boolean;
  readonly done: number;
  readonly required: number;
  readonly outcome: CoachFocusVNext['outcome'];
  /** Applied only on the week the outcome settles. */
  readonly trustDelta: number;
  readonly xp: number;
  readonly gauge: number;
}

/** M12: the development calendar around the weekly plan (absent on earlier saves = nothing yet). */
export interface DevelopmentVNext {
  readonly camps: readonly {
    readonly seasonIndex: number;
    readonly focusIds: readonly string[];
    readonly practiceScore: number;
  }[];
  readonly reviews: readonly {
    readonly seasonIndex: number;
    readonly decision: 'ACCEPTED' | 'DECLINED';
  }[];
  readonly focus: CoachFocusVNext | null;
  readonly focusHistory: readonly CoachFocusVNext[];
  /** The offseason program chosen before season `seasonIndex`. */
  readonly offseason: readonly {
    readonly seasonIndex: number;
    readonly programId: OffseasonProgramIdVNext;
  }[];
}

/** Preseason camp (M12): three emphases at boosted XP before week one; a first role battle. */
export interface CampReportVNext {
  readonly seasonIndex: number;
  readonly focuses: readonly [
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
  ];
  readonly grade: PositionPracticeGradeProjection;
  readonly practiceScore: number;
  readonly depth: PositionDepthUpdateEvidence;
  readonly gaugeBefore: number;
  readonly gaugeAfter: number;
  /** The XP multiplier camp applied (potential × camp), permille. */
  readonly xpPermille: number;
  /** M12 (ROLE-06): the component that decided a depth move (absent = held). */
  readonly movementReason?: DepthMovementReasonVNext;
}

/** The midseason checkpoint (M12): where the season stands and the coach's suggested focus. */
export interface MidseasonReviewVNext {
  readonly seasonIndex: number;
  readonly weekIndex: number;
  readonly record: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly liveSnaps: number;
  readonly sharpReads: number;
  readonly averageGrade: number | null;
  readonly overall: { readonly start: number; readonly now: number };
  readonly depthRank: { readonly start: number; readonly now: number };
  readonly suggestion: Pick<CoachFocusVNext, 'focusId' | 'attributeId' | 'reason'>;
  readonly decision: 'ACCEPTED' | 'DECLINED' | null;
}

/** NIL and the locker room in VNext (absent on pre-M8 saves = the empty baseline). */
export interface NilVNext {
  readonly fundsUsd: number;
  readonly benefits: readonly {
    readonly benefitId: OffFieldBenefitId;
    readonly quantity: number;
  }[];
  /** The teammate-leader relationship, 0-100. */
  readonly lockerRoom: number;
  readonly obligation: {
    readonly offerId: NilOfferId;
    readonly weeksRemaining: number;
    readonly focusCost: number;
  } | null;
  readonly history: readonly {
    readonly offerId: NilOfferId;
    readonly outcome: 'ACCEPTED' | 'DECLINED' | 'FULFILLED';
    readonly seasonIndex: number;
    readonly weekIndex: number;
  }[];
}

export interface NilOfferSceneVNext {
  readonly offerId: NilOfferId;
  readonly weekIndex: number;
  readonly decision: 'ACCEPTED' | 'DECLINED' | null;
  readonly applied: readonly NilEffectApplicationEvidenceV1[];
}

export type SidelineRepGradeVNext = 'SHARP' | 'SOLID' | 'MISSED';

export interface SidelineRepVNext {
  readonly repIndex: number;
  readonly period: 1 | 2 | 3 | 4;
  readonly patternId: string;
  readonly familyId: string;
  readonly decisionIds: readonly [string, string, string];
  readonly revealedClueIds: readonly string[];
  readonly chosenDecisionId: string | null;
  readonly grade: SidelineRepGradeVNext | null;
  readonly bestDecisionId: string;
  readonly solidDecisionIds: readonly string[];
}

export type GameSlotVNext =
  | { readonly kind: 'SIDELINE'; readonly repIndex: number }
  | { readonly kind: 'LIVE'; readonly snapIndex: number };

export interface GameDayVNext {
  readonly weekIndex: number;
  readonly fixtureId: string;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly stage: 'PREGAME' | 'SNAP' | 'RESULT' | 'FINAL';
  readonly engine: VNextGameState | null;
  readonly sideline: readonly SidelineRepVNext[];
  /** Ordered Saturday decisions; `cursor` indexes the current or last resolved slot. */
  readonly slots: readonly GameSlotVNext[];
  readonly cursor: number;
  /** Set when an academic checkpoint this week found the player ineligible (absent = eligible). */
  readonly academicHold?: boolean;
  /** Postseason round for weeks after the regular season (absent = regular season). */
  readonly round?: PostseasonRoundVNext;
  /**
   * M12: the look each live snap was played against, in snap order (present on games kicked off
   * after M12; absent = looks are derived as before).
   */
  readonly lookIds?: readonly (string | null)[];
  /** M12: looks from the athlete's previous two games, avoided while a fresh look remains. */
  readonly avoidLookIds?: readonly string[];
}

export type PostseasonRoundVNext = 'FIRST_ROUND' | 'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL';

/** Carried from a weekly event choice into the next kickoff only. */
export interface GameModifiersVNext {
  readonly clueBonus: number;
  readonly decisionScoreFlat: number;
  readonly exposureReductionPermille: number;
}

/** Applied (post-clamp) consequences of an event choice, for truthful presentation. */
export interface EventEffectsVNext {
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly brand: number;
  readonly gpaMilli: number;
  readonly gauge: number;
  readonly modifiers: GameModifiersVNext;
}

export interface WeeklyEventVNext {
  readonly weekIndex: number;
  readonly eventId: string;
  readonly choiceIds: readonly string[];
  readonly chosenChoiceId: string | null;
  readonly effects: EventEffectsVNext | null;
  /** The alumnus behind a legacy mentor scene (absent on every other event). */
  readonly mentorCareerId?: string;
}

export interface BreakthroughOfferVNext {
  readonly weekIndex: number;
  readonly skillIds: readonly string[];
  readonly chosenSkillId: string | null;
  /** Slot the new card went into, or null when every slot was full (it waits in the collection). */
  readonly slotIndex: number | null;
}

export interface InjuryReportVNext {
  readonly weekIndex: number;
  readonly outcome: 'INJURY' | 'ONGOING';
  readonly injury: NewInjuryEvidence;
  /** Null until the player picks rest or play-limited for a limiting injury. */
  readonly availability: InjuryAvailabilityEvidence | null;
}

/** Health and off-field carry-over between weeks. */
export interface ConditionVNext {
  readonly injury: NewInjuryEvidence | null;
  readonly injuryHistory: readonly NewInjuryEvidence[];
  /** This week's settled availability; null means fully available. */
  readonly availability: InjuryAvailabilityEvidence | null;
  readonly recentEvents: readonly { readonly eventId: string; readonly weekIndex: number }[];
  readonly eventHistory: readonly {
    readonly eventId: string;
    readonly choiceId: string;
    readonly weekIndex: number;
  }[];
  readonly nextGameModifiers: GameModifiersVNext;
}

export interface GameRecapVNext {
  /** Season of the game (absent in logs written before v3 = season 0). */
  readonly seasonIndex?: number;
  readonly round?: PostseasonRoundVNext;
  readonly weekIndex: number;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly playerScore: number;
  readonly opponentScore: number;
  readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
  readonly liveSnapCount: number;
  readonly sideline: readonly SidelineRepVNext[];
  /** Completed engine game (summary, plays with tactical results, growth). */
  readonly engine: VNextGameState;
  readonly coachTrust: { readonly before: number; readonly after: number };
  /** The staff's grade: the engine grade weighted toward neutral on few live snaps (absent = none). */
  readonly coachGrade?: number | null;
  /**
   * What the staff weighed (playtest round 2, optional): the calibrated box score and the mean
   * read grade of the live snaps, each 0-100, before the live-snap volume prior.
   */
  readonly gradeParts?: { readonly box: number; readonly reads: number | null };
  readonly body: { readonly before: number; readonly after: number };
  readonly confidence: { readonly before: number; readonly after: number };
  readonly recordAfter: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly rankAfter: number | null;
  /** Stakes as they stood at kickoff (rivalry and rankings before this result). */
  readonly stakes: GameStakesVNext | null;
  /** True when the game was missed through academic ineligibility (absent = false). */
  readonly academicHold?: boolean;
  /** True when a regulation tie was decided in overtime (M8; absent = regulation). */
  readonly overtime?: boolean;
  /** M12: the look each live snap was played against (absent before M12). */
  readonly lookIds?: readonly (string | null)[];
  readonly availabilityId:
    'injury_availability_full' | 'injury_availability_limited' | 'injury_availability_out';
}

export type SeasonFinishVNext =
  'CHAMPION' | 'RUNNER_UP' | 'SEMIFINAL' | 'QUARTERFINAL' | 'FIRST_ROUND' | 'MISSED';

export interface StatTotalVNext {
  readonly field: string;
  readonly value: number;
}

/** The season as it ended: team outcome and the athlete's year, all from saved facts. */
export interface SeasonReviewVNext {
  readonly seasonIndex: number;
  readonly programId: ProgramId;
  readonly record: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly finalRank: number | null;
  readonly finish: SeasonFinishVNext;
  readonly championProgramId: ProgramId;
  /** Conference title (conference-world seasons; absent on pre-M8 seasons). */
  readonly conferenceChampion?: boolean;
  readonly games: number;
  readonly liveGames: number;
  readonly statTotals: readonly StatTotalVNext[];
  readonly overall: { readonly start: number; readonly end: number };
  readonly depthRank: { readonly start: number; readonly end: number };
  readonly cardsOwned: number;
  readonly injuries: number;
  /** Mean staff grade over live games this season (absent before M8; null with no live games). */
  readonly averageGrade?: number | null;
  /** Pro Draft stock after this season (absent before M8). */
  readonly draftStock?: DraftStockVNext;
  /** Fictional season awards from saved facts (absent before M9). */
  readonly awards?: readonly AwardIdVNext[];
}

export type AwardIdVNext =
  | 'award_position_qb'
  | 'award_position_rb'
  | 'award_position_wr'
  | 'award_position_cb'
  | 'award_position_lb'
  | 'award_position_edge'
  | 'award_conference_player_of_year'
  | 'award_all_american'
  | 'award_all_conference_first'
  | 'award_all_conference_second'
  | 'award_freshman_all_american'
  | 'award_title_game_mvp';

export type DraftStockBandVNext = 'ROUND_1' | 'ROUNDS_2_3' | 'ROUNDS_4_7' | 'UNDRAFTED';

/** A transparent stock score over saved facts; the projection shown is the band. */
export interface DraftStockVNext {
  readonly score: number;
  readonly band: DraftStockBandVNext;
  readonly factors: {
    readonly ability: number;
    readonly production: number;
    readonly exposure: number;
    readonly experience: number;
    readonly bigGames: number;
    readonly durability: number;
    /** Awards credit (absent before M9). */
    readonly awards?: number;
  };
}

/** Round and overall pick, or undrafted (both null). */
export interface DraftResultVNext {
  readonly round: number | null;
  readonly pick: number | null;
  readonly stockScore: number;
}

export type CareerEndingVNext = 'GRADUATED' | 'DECLARED' | 'RETIRED';

/** A plaque as a new career saw it (a bounded, sanitized snapshot). */
export interface LegacyAlumnusVNext {
  readonly careerId: string;
  readonly displayName: string;
  readonly positionId: VNextPositionId;
  readonly programIds: readonly ProgramId[];
  readonly seasons: number;
  readonly championships: number;
  readonly conferenceTitles: number;
  readonly awards: number;
  readonly draftRound: number | null;
  readonly ending?: CareerEndingVNext;
}

export interface LegacyVNext {
  readonly alumni: readonly LegacyAlumnusVNext[];
}

export interface OffseasonOptionVNext {
  readonly programId: ProgramId;
  readonly kind: 'STAY' | 'TRANSFER';
  readonly programRating: number;
  readonly preview: RecruitOfferVNext['preview'];
}

/** Permanent record of a finished career, shown on the Alumni Wall. */
export interface AlumniVNext {
  readonly careerId: string;
  readonly displayName: string;
  readonly positionId: VNextPositionId;
  readonly archetypeId: string;
  readonly programIds: readonly ProgramId[];
  readonly seasons: number;
  readonly championships: number;
  readonly bestFinish: SeasonFinishVNext;
  readonly record: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly liveGames: number;
  readonly statTotals: readonly StatTotalVNext[];
  readonly finalOverall: number;
  readonly bestDepthRank: number;
  /** Every season award, in season order (absent before M9). */
  readonly awards?: readonly AwardIdVNext[];
  /** Conference titles won (absent before M9). */
  readonly conferenceTitles?: number;
  /** How the college career ended and the Pro Draft outcome (absent before M8). */
  readonly ending?: CareerEndingVNext;
  readonly draft?: DraftResultVNext;
}

export type FlowVNext =
  | { readonly type: 'RECRUITING' }
  | { readonly type: 'WEEK_PLAN' }
  /** M12 preseason camp: the report is null until the emphases are chosen. */
  | { readonly type: 'CAMP'; readonly report: CampReportVNext | null }
  /** M12 midseason checkpoint after week six. */
  | { readonly type: 'MIDSEASON'; readonly review: MidseasonReviewVNext }
  | { readonly type: 'PRACTICE_REPORT'; readonly report: PracticeReportVNext }
  | {
      readonly type: 'BREAKTHROUGH';
      readonly offer: BreakthroughOfferVNext;
      readonly trainingLoad: number;
    }
  | {
      readonly type: 'EVENT';
      readonly event: WeeklyEventVNext;
      /** Practice load carried into the pregame injury check. */
      readonly trainingLoad: number;
    }
  | {
      readonly type: 'NIL';
      readonly offer: NilOfferSceneVNext;
      readonly trainingLoad: number;
    }
  | { readonly type: 'INJURY'; readonly report: InjuryReportVNext }
  | { readonly type: 'GAME'; readonly game: GameDayVNext }
  | { readonly type: 'POST_GAME'; readonly recap: GameRecapVNext }
  /** Legacy v2 end-of-regular-season stop; `nextWeek()` continues into the postseason. */
  | { readonly type: 'SEASON_END' }
  | { readonly type: 'SEASON_REVIEW'; readonly review: SeasonReviewVNext }
  | { readonly type: 'OFFSEASON'; readonly options: readonly OffseasonOptionVNext[] }
  | { readonly type: 'CAREER_COMPLETE'; readonly alumni: AlumniVNext };

export interface CareerVNext {
  readonly model: typeof CAREER_VNEXT_MODEL;
  readonly version: typeof CAREER_VNEXT_VERSION;
  readonly careerId: string;
  readonly seed: RngSeed;
  readonly revision: number;
  readonly contentVersion: number;
  readonly rng: { readonly career: RngState };
  readonly athlete: AthleteVNext;
  readonly build: BuildVNext;
  readonly recruiting: {
    readonly offers: readonly RecruitOfferVNext[];
    readonly committedProgramId: ProgramId | null;
  };
  readonly program: { readonly programId: ProgramId; readonly room: PositionRoomContext } | null;
  readonly season: {
    readonly index: number;
    readonly weekIndex: number;
    /** The conference world (M8 on) or, for a season begun before M8, the alpha world. */
    readonly world: WorldAlphaSeasonState | WorldVNextSeasonState | null;
    /** Sideline credit earned last Saturday, consumed by the next practice week. */
    readonly sidelineCredit: number;
    /** Where the season began, for the season review. */
    readonly startOverall: number;
    readonly startRank: number;
  };
  readonly condition: ConditionVNext;
  /** NIL, benefits and the locker room (M8; absent on earlier saves). */
  readonly nil?: NilVNext;
  /** The Alumni Wall as it stood when this career began (M9; absent on earlier saves). */
  readonly legacy?: LegacyVNext;
  /** M12: camp, midseason focus and offseason programs (absent on earlier saves). */
  readonly development?: DevelopmentVNext;
  readonly flow: FlowVNext;
  readonly log: readonly GameRecapVNext[];
  /** One review per completed season. */
  readonly history: readonly SeasonReviewVNext[];
}

export type CareerVNextFailure =
  | 'career_vnext.invalid_input'
  | 'career_vnext.invalid_phase'
  | 'career_vnext.invalid_choice'
  | 'career_vnext.engine_failed';

export type CareerVNextResult =
  | { readonly ok: true; readonly career: CareerVNext }
  | { readonly ok: false; readonly reason: CareerVNextFailure };

export type FocusIdVNext = PositionFocusId;
