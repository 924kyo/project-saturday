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
import type { WorldAlphaSeasonState } from '../season/world-alpha.js';
import type { GameStakesVNext } from './stakes.js';
import type { WrAlphaGameState } from '../games/wr-alpha.js';
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
/** Semifinal and final follow the regular season for the four qualifiers. */
export const CAREER_VNEXT_POSTSEASON_WEEKS = 2 as const;
/** A college career is four seasons (freshman through senior). */
export const CAREER_VNEXT_SEASONS = 4 as const;
/** Every role gets at least this many Saturday decisions; sideline reps fill the gap. */
export const CAREER_VNEXT_MIN_GAME_DECISIONS = 2 as const;

/** Positions with a VNext game adapter. WR/LB/EDGE join through the same interface. */
export type VNextPositionId = 'position_qb' | 'position_rb' | 'position_wr' | 'position_cb';

/** The shipped content bundle; VNext reuses catalogs, not the old aggregate. */
export type CareerVNextMechanics = PositionAlphaSessionCommandMechanics & {
  readonly wr: {
    readonly events: readonly EventMechanicsDefinition[];
    readonly families: readonly KeySnapFamilyMechanicsDefinition[];
    readonly patterns: readonly KeySnapPatternMechanicsDefinition[];
  };
};

/** Engine state for any VNext position: shared QB/RB/CB kernels plus the WR kernel. */
export type VNextGameState =
  PositionAlphaGameState | { readonly positionId: 'position_wr'; readonly game: WrAlphaGameState };

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
}

export type PostseasonRoundVNext = 'SEMIFINAL' | 'FINAL';

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
  readonly body: { readonly before: number; readonly after: number };
  readonly confidence: { readonly before: number; readonly after: number };
  readonly recordAfter: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly rankAfter: number | null;
  /** Stakes as they stood at kickoff (rivalry and rankings before this result). */
  readonly stakes: GameStakesVNext | null;
  /** True when the game was missed through academic ineligibility (absent = false). */
  readonly academicHold?: boolean;
  readonly availabilityId:
    'injury_availability_full' | 'injury_availability_limited' | 'injury_availability_out';
}

export type SeasonFinishVNext = 'CHAMPION' | 'RUNNER_UP' | 'SEMIFINAL' | 'MISSED';

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
  readonly games: number;
  readonly liveGames: number;
  readonly statTotals: readonly StatTotalVNext[];
  readonly overall: { readonly start: number; readonly end: number };
  readonly depthRank: { readonly start: number; readonly end: number };
  readonly cardsOwned: number;
  readonly injuries: number;
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
}

export type FlowVNext =
  | { readonly type: 'RECRUITING' }
  | { readonly type: 'WEEK_PLAN' }
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
    readonly world: WorldAlphaSeasonState | null;
    /** Sideline credit earned last Saturday, consumed by the next practice week. */
    readonly sidelineCredit: number;
    /** Where the season began, for the season review. */
    readonly startOverall: number;
    readonly startRank: number;
  };
  readonly condition: ConditionVNext;
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
