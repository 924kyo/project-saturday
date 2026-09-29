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
export const CAREER_VNEXT_VERSION = 1 as const;
export const CAREER_VNEXT_REGULAR_SEASON_WEEKS = 12 as const;
/** Every role gets at least this many Saturday decisions; sideline reps fill the gap. */
export const CAREER_VNEXT_MIN_GAME_DECISIONS = 2 as const;

/** Positions with a VNext game adapter. WR/LB/EDGE join through the same interface. */
export type VNextPositionId = 'position_qb' | 'position_rb' | 'position_wr' | 'position_cb';

/** The shipped content bundle; VNext reuses catalogs, not the old aggregate. */
export type CareerVNextMechanics = PositionAlphaSessionCommandMechanics & {
  readonly wr: {
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
}

export interface GameRecapVNext {
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
  readonly body: { readonly before: number; readonly after: number };
  readonly confidence: { readonly before: number; readonly after: number };
  readonly recordAfter: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly rankAfter: number | null;
}

export type FlowVNext =
  | { readonly type: 'RECRUITING' }
  | { readonly type: 'WEEK_PLAN' }
  | { readonly type: 'PRACTICE_REPORT'; readonly report: PracticeReportVNext }
  | { readonly type: 'GAME'; readonly game: GameDayVNext }
  | { readonly type: 'POST_GAME'; readonly recap: GameRecapVNext }
  | { readonly type: 'SEASON_END' };

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
  };
  readonly flow: FlowVNext;
  readonly log: readonly GameRecapVNext[];
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
