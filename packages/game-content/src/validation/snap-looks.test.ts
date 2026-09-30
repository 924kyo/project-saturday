import { describe, expect, it } from 'vitest';
import {
  SNAP_LOOK_ACTORS,
  SNAP_LOOK_MOVES,
  SNAP_LOOK_STANCES,
  bestDecisionOfLook,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type SnapLookStanceKey,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';
import { snapLookCatalogVNext } from '../content/snap-looks.js';
import { localeMessages } from '../locales/index.js';

/**
 * M11 snap looks: every decision family hides several pictures, each with one winning read, and
 * disguises that share a picture but not an answer. Reading the look wins; memorizing does not.
 */
const IDENTITIES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_wr', 'archetype_wr_deep_threat'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_lb', 'archetype_lb_run_stopper'],
  ['position_edge', 'archetype_edge_speed_rusher'],
] as const;

const identity = (positionId: string, archetypeId: string) =>
  ({
    displayName: 'Look Tester',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  }) as PositionPlayerCreationIdentity;

const { looks, families } = snapLookCatalogVNext;

describe('snap look catalog', () => {
  it('gives every decision family five looks and every technique a turn as the answer', () => {
    const byFamily = new Map<string, typeof looks>();
    for (const look of looks)
      byFamily.set(look.familyId, [...(byFamily.get(look.familyId) ?? []), look]);
    expect(byFamily.size).toBe(24);
    for (const [familyId, entries] of byFamily) {
      expect(entries.length, familyId).toBe(5);
      expect(families[familyId], familyId).toBeDefined();
      const decisions = new Set(entries[0]!.fits.map(({ decisionId }) => decisionId));
      expect(decisions.size).toBe(3);
      const answers = new Set(entries.map(bestDecisionOfLook));
      expect(answers, familyId).toEqual(decisions);
      for (const look of entries) {
        expect(new Set(look.fits.map(({ decisionId }) => decisionId))).toEqual(decisions);
        const sorted = [...look.fits].sort((left, right) => right.fit - left.fit);
        expect(sorted[0]!.fit, look.id).toBeGreaterThanOrEqual(85);
        expect(sorted[0]!.fit - sorted[1]!.fit, look.id).toBeGreaterThanOrEqual(5);
        for (const { fit } of look.fits) expect(fit).toBeGreaterThanOrEqual(0);
        for (const { fit } of look.fits) expect(fit).toBeLessThanOrEqual(100);
      }
    }
  });

  it('builds disguises that share a picture and a first tell but not the answer', () => {
    const disguises = looks.filter((look) => look.weight === 2);
    expect(disguises.length).toBe(48);
    for (const disguise of disguises) {
      const twin = looks.find(
        (look) =>
          look !== disguise &&
          look.familyId === disguise.familyId &&
          look.tellKeys[0] === disguise.tellKeys[0] &&
          JSON.stringify(look.stance) === JSON.stringify(disguise.stance),
      );
      expect(twin, disguise.id).toBeDefined();
      expect(bestDecisionOfLook(twin!), disguise.id).not.toBe(bestDecisionOfLook(disguise));
      // The truth only shows once enough tells are read.
      expect(
        disguise.moves.some(({ reveal }) => reveal >= 2),
        disguise.id,
      ).toBe(true);
    }
  });

  it('uses only the shared board vocabulary and paired copy', () => {
    const en = localeMessages['en-US'] as Record<string, string>;
    const ko = localeMessages['ko-KR'] as Record<string, string>;
    for (const look of looks) {
      for (const key of [look.nameKey, ...look.tellKeys]) {
        expect(en[key], `${look.id} ${key}`).toBeTruthy();
        expect(ko[key], `${look.id} ${key}`).toBeTruthy();
      }
      for (const move of look.moves) {
        expect(SNAP_LOOK_ACTORS, look.id).toContain(move.actor);
        expect(SNAP_LOOK_MOVES, look.id).toContain(move.to);
      }
      for (const [key, value] of Object.entries(look.stance))
        expect(SNAP_LOOK_STANCES[key as SnapLookStanceKey], look.id).toContain(value);
    }
    for (const family of Object.values(families))
      for (const key of [family.nameKey, family.promptKey]) {
        expect(en[key], key).toBeTruthy();
        expect(ko[key], key).toBeTruthy();
      }
  });
});

function play(positionId: string, archetypeId: string, seed: string, weeks: number) {
  const who = identity(positionId, archetypeId);
  const mechanics = buildCareerVNextMechanics(who)!;
  const ok = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    return result.career;
  };
  let career = ok(createCareerVNext({ seed, identity: who }, mechanics));
  const strongest = [...career.recruiting.offers].sort(
    (left, right) => left.preview.rank - right.preview.rank,
  )[0]!;
  career = ok(commitProgramVNext(career, strongest.programId, mechanics));
  const reads: string[] = [];
  const answers = new Map<string, Set<string>>();
  for (let guard = 0; guard < 4_000 && career.season.weekIndex < weeks; guard += 1) {
    const flow = career.flow;
    if (flow.type === 'WEEK_PLAN') {
      const open = focusDefinitionsVNext(career, mechanics)
        .filter(({ id }) => isFocusAvailableVNext(career, id, mechanics))
        .map(({ id }) => id);
      const plan: string[] = [open[0]!, 'action_film_study', 'action_recovery'].filter((id) =>
        (open as readonly string[]).includes(id),
      );
      while (plan.length < 3) plan.push(open[plan.length]!);
      career = ok(planWeekVNext(career, plan as typeof open, mechanics));
    } else if (flow.type === 'PRACTICE_REPORT') career = ok(toGameDayVNext(career, mechanics));
    else if (flow.type === 'BREAKTHROUGH')
      career = ok(
        flow.offer.chosenSkillId === null
          ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
          : toGameDayVNext(career, mechanics),
      );
    else if (flow.type === 'EVENT')
      career = ok(
        flow.event.chosenChoiceId === null
          ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
          : toGameDayVNext(career, mechanics),
      );
    else if (flow.type === 'NIL')
      career = ok(
        flow.offer.decision === null
          ? chooseNilVNext(career, false, mechanics)
          : toGameDayVNext(career, mechanics),
      );
    else if (flow.type === 'INJURY')
      career = ok(
        flow.report.availability === null
          ? chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics)
          : toGameDayVNext(career, mechanics),
      );
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') career = ok(kickoffVNext(career, mechanics));
      else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career, mechanics)!;
        // Read the look: the best read is only knowable from the hidden picture itself.
        const lookId = frame.look!.lookId;
        const look = snapLookCatalogVNext.looks.find(({ id }) => id === lookId)!;
        const best = bestDecisionOfLook(look);
        answers.set(frame.familyId, (answers.get(frame.familyId) ?? new Set()).add(best));
        career = ok(chooseSnapVNext(career, best, mechanics));
        const resolved = projectSnapBoardFrame(career, mechanics)!;
        expect(resolved.look!.reveal!.bestDecisionId).toBe(best);
        reads.push(
          resolved.kind === 'LIVE' ? resolved.result!.readQuality : resolved.result!.grade,
        );
      } else career = ok(continueGameVNext(career, mechanics));
    } else if (flow.type === 'POST_GAME') career = ok(nextWeekVNext(career, mechanics));
    else break;
  }
  return { reads, answers };
}

describe('reading the look', () => {
  it.each(IDENTITIES)(
    'grades the look’s answer as a sharp read (%s)',
    (positionId, archetypeId) => {
      const { reads, answers } = play(positionId, archetypeId, `looks-${positionId}`, 8);
      expect(reads.length).toBeGreaterThan(8);
      expect(reads.every((grade) => grade === 'SHARP')).toBe(true);
      // The same family asks for different answers on different Saturdays.
      expect([...answers.values()].some((set) => set.size >= 2)).toBe(true);
    },
  );
});
