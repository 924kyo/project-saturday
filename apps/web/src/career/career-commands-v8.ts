import {
  acknowledgePostGameCareerV8,
  acknowledgePostGameSessionV8,
  completeWrTwoSeasonCareerV8,
  continueResolvedSnapV8,
  createCareerSession,
  enterWrTwoSeasonReviewV8,
  migrateCareerSessionV7ToV8,
  parseCareerSessionV8,
  resolveKeySnapV8,
  runCareerCommandV8,
  runSessionCommandV8,
  startGameV8,
  type CareerRun,
  type CareerRunV8,
  type CareerSession,
  type CareerSessionV8,
  type EventChoiceId,
  type InjuryChoiceId,
  type KeySnapDecisionId,
  type NilObligationResolutionId,
  type NilOfferDecisionId,
  type NilOfferId,
  type ProgramId,
  type RngSeed,
  type SkillId,
  type WeeklyActionId,
} from '@project-saturday/game-core';
import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
  skillMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import {
  advanceCareerWeek,
  beginCareerRecruiting,
  commitCareerActionDraft,
  commitCareerProgramChoice,
  createCareerFromDraft,
  prepareCareerGame,
  resolveCareerNextAction,
  type CreationDraft,
} from './career-ui';
import { chooseCareerSkillBreakthrough, setCareerEquippedSkillSlot } from './skill-ui';
import {
  bootstrapCareerNextSeason,
  bootstrapCareerSeason,
  completeShippedSeasonGameWeek,
  continueShippedSeasonWeek,
  decideCareerNilOffer,
  decideCareerOffseason,
  enterCareerSeasonReview,
  initializeCareerPostseason,
  projectCareerOffseason,
  resolveCareerNilObligation,
  resolveSeasonEventChoice,
  resolveSeasonInjuryChoice,
  type SeasonUiCommandResult,
} from './season-ui';

export const WR_V8_UI_MECHANICS = Object.freeze({
  tuning: gameTuning,
  families: keySnapFamilyMechanicsDefinitions,
  patterns: keySnapPatternMechanicsDefinitions,
  skills: skillMechanicsDefinitions,
});
export type WrUiCommandV8 =
  | {
      readonly type:
        | 'BEGIN_RECRUITING'
        | 'RESOLVE_ACTION'
        | 'ADVANCE_WEEK'
        | 'PREPARE_GAME'
        | 'START_GAME'
        | 'CONTINUE_SNAP'
        | 'BOOTSTRAP_SEASON'
        | 'CONTINUE_SEASON_WEEK'
        | 'ACKNOWLEDGE_GAME'
        | 'INITIALIZE_POSTSEASON'
        | 'REVIEW_SEASON'
        | 'PROJECT_OFFSEASON'
        | 'NEXT_SEASON'
        | 'RETIRE';
    }
  | { readonly type: 'CHOOSE_PROGRAM' | 'DECIDE_OFFSEASON'; readonly programId: ProgramId }
  | { readonly type: 'COMMIT_ACTIONS'; readonly actionIds: readonly WeeklyActionId[] }
  | { readonly type: 'CHOOSE_SKILL'; readonly skillId: SkillId }
  | { readonly type: 'EQUIP_SKILL'; readonly slotIndex: number; readonly skillId: SkillId | null }
  | { readonly type: 'CHOOSE_SNAP'; readonly decisionId: KeySnapDecisionId }
  | { readonly type: 'CHOOSE_EVENT'; readonly choiceId: EventChoiceId }
  | { readonly type: 'CHOOSE_INJURY'; readonly choiceId: InjuryChoiceId }
  | {
      readonly type: 'DECIDE_NIL';
      readonly offerId: NilOfferId;
      readonly decisionId: NilOfferDecisionId;
    }
  | { readonly type: 'RESOLVE_NIL'; readonly resolutionId: NilObligationResolutionId };
export type WrUiResultV8 =
  | { readonly ok: true; readonly session: CareerSessionV8 }
  | { readonly ok: false; readonly session: CareerSessionV8; readonly reason: string };
type CareerResult<TCareer> =
  { readonly ok: true; readonly career: TCareer } | { readonly ok: false; readonly reason: string };

export function createWrUiSessionV8(draft: CreationDraft, seed: RngSeed) {
  const created = createCareerFromDraft(draft, seed);
  return created.ok
    ? {
        ok: true as const,
        session: migrateCareerSessionV7ToV8(createCareerSession(created.career)),
      }
    : created;
}

/** Unselected aggregate command seam: owning kernels remain the only source of rules/RNG. */
export function dispatchWrUiCommandV8(
  session: CareerSessionV8,
  command: WrUiCommandV8,
): WrUiResultV8 {
  const fail = (reason: string): WrUiResultV8 => Object.freeze({ ok: false, session, reason });
  const publishCareer = (result: CareerResult<CareerRunV8>): WrUiResultV8 => {
    if (!result.ok) return fail(result.reason);
    const parsed = parseCareerSessionV8({ ...session, career: result.career }, WR_V8_UI_MECHANICS);
    return parsed.ok ? parsed : fail(parsed.reason);
  };
  const career = (operation: (source: CareerRun) => CareerResult<CareerRun>) =>
    publishCareer(runCareerCommandV8(session.career, WR_V8_UI_MECHANICS, operation));
  const aggregate = (operation: (source: CareerSession) => SeasonUiCommandResult): WrUiResultV8 => {
    const result = runSessionCommandV8(session, WR_V8_UI_MECHANICS, operation);
    return result.ok ? result : fail(result.reason);
  };
  try {
    switch (command.type) {
      case 'BEGIN_RECRUITING':
        return career(beginCareerRecruiting);
      case 'CHOOSE_PROGRAM':
        return career((source) => commitCareerProgramChoice(source, command.programId));
      case 'COMMIT_ACTIONS':
        return career((source) => commitCareerActionDraft(source, command.actionIds));
      case 'RESOLVE_ACTION':
        return career(resolveCareerNextAction);
      case 'ADVANCE_WEEK':
        return session.career.phase.type === 'POST_GAME'
          ? publishCareer(
              acknowledgePostGameCareerV8(session.career, WR_V8_UI_MECHANICS, advanceCareerWeek),
            )
          : career(advanceCareerWeek);
      case 'CHOOSE_SKILL':
        return career((source) => chooseCareerSkillBreakthrough(source, command.skillId));
      case 'EQUIP_SKILL':
        return career((source) =>
          setCareerEquippedSkillSlot(source, command.slotIndex, command.skillId),
        );
      case 'PREPARE_GAME':
        return career(prepareCareerGame);
      case 'START_GAME':
        return publishCareer(startGameV8(session.career, WR_V8_UI_MECHANICS));
      case 'CHOOSE_SNAP':
        return publishCareer(
          resolveKeySnapV8(session.career, command.decisionId, WR_V8_UI_MECHANICS),
        );
      case 'CONTINUE_SNAP':
        return publishCareer(continueResolvedSnapV8(session.career, WR_V8_UI_MECHANICS));
      case 'BOOTSTRAP_SEASON':
        return aggregate(bootstrapCareerSeason);
      case 'CONTINUE_SEASON_WEEK':
        return aggregate(continueShippedSeasonWeek);
      case 'CHOOSE_EVENT':
        return aggregate((source) => resolveSeasonEventChoice(source, command.choiceId));
      case 'CHOOSE_INJURY':
        return aggregate((source) => resolveSeasonInjuryChoice(source, command.choiceId));
      case 'ACKNOWLEDGE_GAME': {
        const result = acknowledgePostGameSessionV8(
          session,
          WR_V8_UI_MECHANICS,
          completeShippedSeasonGameWeek,
        );
        return result.ok ? result : fail(result.reason);
      }
      case 'INITIALIZE_POSTSEASON':
        return aggregate(initializeCareerPostseason);
      case 'REVIEW_SEASON':
        return session.career.seasonCareerState.bootstrapStatus === 'ACTIVE' &&
          session.career.seasonCareerState.seasonsCompleted === 1
          ? enterWrTwoSeasonReviewV8(session)
          : aggregate(enterCareerSeasonReview);
      case 'PROJECT_OFFSEASON':
        return aggregate(projectCareerOffseason);
      case 'DECIDE_OFFSEASON':
        return aggregate((source) => decideCareerOffseason(source, command.programId));
      case 'NEXT_SEASON':
        return aggregate(bootstrapCareerNextSeason);
      case 'DECIDE_NIL':
        return aggregate((source) =>
          decideCareerNilOffer(source, command.offerId, command.decisionId),
        );
      case 'RESOLVE_NIL':
        return aggregate((source) => resolveCareerNilObligation(source, command.resolutionId));
      case 'RETIRE':
        return completeWrTwoSeasonCareerV8(session, CONTENT_COMPATIBILITY_VERSION);
      default:
        return fail('v8.invalid_command');
    }
  } catch {
    return fail('v8.command_failed');
  }
}
