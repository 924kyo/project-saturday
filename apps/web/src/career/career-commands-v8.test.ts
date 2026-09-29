import { describe, expect, it } from 'vitest';
import { parseCareerSessionV8, type CareerSessionV8 } from '@project-saturday/game-core';
import { createDefaultCreationDraft } from './career-ui';
import {
  createWrUiSessionV8,
  dispatchWrUiCommandV8,
  WR_V8_UI_MECHANICS,
  type WrUiCommandV8,
} from './career-commands-v8';

describe('staged WR v8 aggregate UI command seam', () => {
  it.each(['ko-KR', 'en-US'])(
    'completes the actual two-season command path for %s',
    (locale) => {
      const created = createWrUiSessionV8(
        {
          ...createDefaultCreationDraft(),
          personalityTraitIds: ['personality_competitive', 'personality_leader'],
          displayName: locale === 'ko-KR' ? '토요일 선수' : 'Saturday Player',
        },
        `wr-ui-v8:${locale}`,
      );
      if (!created.ok) throw new Error('Creation failed');
      let session: CareerSessionV8 = created.session;
      let saves = 0;
      const phases = new Set<string>();
      const commands = new Set<string>();
      function act(command: WrUiCommandV8) {
        const result = dispatchWrUiCommandV8(session, command);
        if (!result.ok)
          throw new Error(
            `${locale}:${session.career.weekIndex}:${session.career.phase.type}:${command.type}:${result.reason}`,
          );
        const parsed = parseCareerSessionV8(JSON.stringify(result.session), WR_V8_UI_MECHANICS);
        if (!parsed.ok) throw new Error(parsed.reason);
        expect(parsed.session).toEqual(result.session);
        session = parsed.session;
        commands.add(command.type);
        saves += 1;
      }
      for (
        let step = 0;
        step < 1600 && session.career.phase.type !== 'CAREER_COMPLETE';
        step += 1
      ) {
        const career = session.career;
        const phase = career.phase;
        phases.add(phase.type);
        switch (phase.type) {
          case 'PLAN_ACTIONS': {
            if (career.recruitingState.type === 'NOT_STARTED') {
              act({ type: 'BEGIN_RECRUITING' });
              break;
            }
            if (career.recruitingState.type === 'CHOOSING') {
              act({
                type: 'CHOOSE_PROGRAM',
                programId: career.recruitingState.offers[0]!.programId,
              });
              break;
            }
            if (career.seasonCareerState.bootstrapStatus === 'PENDING') {
              act({ type: 'BOOTSTRAP_SEASON' });
              break;
            }
            const calendar = session.world.calendar;
            if (
              calendar.type === 'ACTIVE' &&
              calendar.stage === 'POSTSEASON' &&
              calendar.postseason.type !== 'ACTIVE'
            ) {
              act({
                type:
                  calendar.postseason.type === 'COMPLETE'
                    ? 'REVIEW_SEASON'
                    : 'INITIALIZE_POSTSEASON',
              });
              break;
            }
            const nil = career.offFieldCareerState.nil;
            if (
              'bootstrapStatus' in nil &&
              nil.bootstrapStatus === 'ACTIVE' &&
              nil.pendingOffers.length > 0
            ) {
              act({
                type: 'DECIDE_NIL',
                offerId: nil.pendingOffers[0]!.offerId,
                decisionId: 'DECLINE',
              });
              break;
            }
            const plan: WrUiCommandV8 = {
              type: 'COMMIT_ACTIONS',
              actionIds: ['action_route_drills', 'action_film_study', 'action_recovery'],
            };
            const possible = dispatchWrUiCommandV8(session, plan);
            if (possible.ok) act(plan);
            else {
              expect(possible.session).toBe(session);
              act({
                type: 'COMMIT_ACTIONS',
                actionIds: ['action_film_study', 'action_study_hall', 'action_recovery'],
              });
            }
            break;
          }
          case 'RESOLVE_ACTIONS':
            act({ type: 'RESOLVE_ACTION' });
            break;
          case 'WEEK_END':
            act({ type: 'CONTINUE_SEASON_WEEK' });
            break;
          case 'EVENT_CHOICE':
            act({ type: 'CHOOSE_EVENT', choiceId: phase.pendingEvent.choiceIds[0]! });
            break;
          case 'INJURY_CHOICE':
            act({ type: 'CHOOSE_INJURY', choiceId: 'injury_choice_play_limited' });
            break;
          case 'SKILL_BREAKTHROUGH': {
            const skillId = phase.offer.offeredSkillIds[0];
            act({ type: 'CHOOSE_SKILL', skillId });
            const slot = session.career.player.skillState.equippedSkillIds.findIndex(
              (value) => value === null,
            );
            if (slot >= 0 && !session.career.player.skillState.equippedSkillIds.includes(skillId))
              act({ type: 'EQUIP_SKILL', slotIndex: slot, skillId });
            break;
          }
          case 'GAME_PREVIEW':
            act({ type: 'START_GAME' });
            break;
          case 'KEY_SNAP':
            act({ type: 'CHOOSE_SNAP', decisionId: phase.pendingSnap.decisionIds[0] });
            break;
          case 'SNAP_RESOLVED':
            act({ type: 'CONTINUE_SNAP' });
            break;
          case 'POST_GAME':
            act({ type: 'ACKNOWLEDGE_GAME' });
            break;
          case 'SEASON_REVIEW': {
            if (career.terminalReview !== undefined) {
              act({ type: 'RETIRE' });
              break;
            }
            const offseason = career.offFieldCareerState.offseason;
            if (offseason.status === 'NOT_STARTED') act({ type: 'PROJECT_OFFSEASON' });
            else if (offseason.status === 'PROJECTED')
              act({
                type: 'DECIDE_OFFSEASON',
                programId:
                  locale === 'ko-KR'
                    ? career.programId!
                    : offseason.transferProjection.transferOptions[0].programId,
              });
            else act({ type: 'NEXT_SEASON' });
            break;
          }
        }
      }
      expect(session.career.phase.type).toBe('CAREER_COMPLETE');
      expect(session.career.gameCareerState.gamesPlayed).toBeGreaterThanOrEqual(24);
      expect(session.career.terminalReview?.seasons).toHaveLength(2);
      expect(saves).toBeGreaterThan(150);
      expect(commands.has('REVIEW_SEASON')).toBe(true);
      expect(commands.has('RETIRE')).toBe(true);
      expect(phases.has('GAME_PREVIEW')).toBe(true);
      const repeated = dispatchWrUiCommandV8(session, { type: 'RETIRE' });
      expect(repeated.ok).toBe(false);
      expect(repeated.session).toBe(session);
      const invalid = dispatchWrUiCommandV8(session, { type: 'START_GAME' });
      expect(invalid.ok).toBe(false);
      expect(invalid.session).toBe(session);
    },
    90_000,
  );
});
