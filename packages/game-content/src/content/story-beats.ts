import type { StoryBeatDefinitionVNext } from '@project-saturday/game-core';

/**
 * M12 story beats (Phase 6): what happens with the cast when the season gives a reason. Each beat
 * has 2–4 choices; some exist only for a personality (REL-05) or a recruiting background (CRE-04),
 * and the captain vote's choices depend on the room's vote. The rules (when a beat fires, what
 * memory changes its text, how choices apply) live in game-core `vnext/story.ts`; copy keys are
 * `v2.story.<beat>.*` in `locales/m12-story.ts`.
 */
export const storyBeatsVNext: readonly StoryBeatDefinitionVNext[] = [
  {
    id: 'beat_season_opener',
    trigger: 'season_opener',
    choices: [
      {
        id: 'choice_set_the_tone',
        effects: { confidence: 4, relationships: [{ role: 'captain', delta: 5 }] },
      },
      { id: 'choice_quiet_work', effects: { preparation: 6, coachTrust: 2 } },
      {
        id: 'choice_call_home',
        requires: {
          backgroundIds: ['background_small_town_star', 'background_under_recruited_athlete'],
        },
        effects: { confidence: 6 },
      },
      {
        id: 'choice_carry_the_name',
        requires: { backgroundIds: ['background_legacy_recruit', 'background_blue_chip_star'] },
        effects: { brand: 3, confidence: -1, relationships: [{ role: 'reporter', delta: 5 }] },
      },
      {
        id: 'choice_prove_the_growth',
        requires: { backgroundIds: ['background_late_bloomer'] },
        effects: { preparation: 4, confidence: 2 },
      },
      {
        id: 'choice_mark_the_rival',
        requires: { traitIds: ['personality_competitive', 'personality_hot_headed'] },
        effects: { confidence: 5, relationships: [{ role: 'rival', delta: -8 }] },
      },
    ],
  },
  {
    id: 'beat_rival_passed_you',
    trigger: 'rival_passed_you',
    choices: [
      {
        id: 'choice_congratulate',
        effects: { confidence: -2, relationships: [{ role: 'rival', delta: 10 }] },
      },
      { id: 'choice_ask_the_coach', effects: { coachTrust: 3, preparation: 6 } },
      {
        id: 'choice_vow_to_take_it_back',
        effects: { confidence: 5, relationships: [{ role: 'rival', delta: -10 }], flag: 'vow' },
      },
      {
        id: 'choice_extra_reps',
        requires: { traitIds: ['personality_competitive', 'personality_disciplined'] },
        effects: { body: -8, preparation: 8, coachTrust: 2 },
      },
    ],
  },
  {
    id: 'beat_you_passed_rival',
    trigger: 'you_passed_rival',
    choices: [
      {
        id: 'choice_stay_humble',
        effects: {
          relationships: [
            { role: 'rival', delta: 8 },
            { role: 'captain', delta: 5 },
          ],
        },
      },
      {
        id: 'choice_talk_it_up',
        effects: {
          brand: 3,
          relationships: [
            { role: 'rival', delta: -10 },
            { role: 'reporter', delta: 5 },
          ],
        },
      },
      {
        id: 'choice_lift_him_up',
        requires: { traitIds: ['personality_leader', 'personality_social'] },
        effects: { lockerRoom: 5, relationships: [{ role: 'rival', delta: 12 }] },
      },
    ],
  },
  {
    id: 'beat_defend_spot',
    trigger: 'defend_spot',
    choices: [
      { id: 'choice_extra_film', effects: { preparation: 6, body: -3 } },
      { id: 'choice_lean_on_the_coach', effects: { coachTrust: 2, confidence: 2 } },
      {
        id: 'choice_mentor_the_backup',
        effects: { lockerRoom: 5, relationships: [{ role: 'rival', delta: 8 }] },
      },
    ],
  },
  {
    id: 'beat_interview',
    trigger: 'interview',
    choices: [
      {
        id: 'choice_tone_confident',
        effects: { brand: 2, relationships: [{ role: 'reporter', delta: 5 }], tone: 'confident' },
      },
      {
        id: 'choice_tone_humble',
        effects: { coachTrust: 2, relationships: [{ role: 'captain', delta: 5 }], tone: 'humble' },
      },
      {
        id: 'choice_tone_fiery',
        effects: {
          brand: 3,
          coachTrust: -2,
          relationships: [{ role: 'rival', delta: -5 }],
          tone: 'fiery',
        },
      },
    ],
  },
  {
    id: 'beat_captain_vote',
    trigger: 'captain_vote',
    choices: [
      {
        id: 'choice_accept_the_c',
        requires: { elected: true },
        effects: { confidence: 3, lockerRoom: 8, flag: 'captain' },
      },
      {
        id: 'choice_share_the_c',
        requires: { elected: true },
        effects: { lockerRoom: 4, relationships: [{ role: 'captain', delta: 8 }], flag: 'captain' },
      },
      {
        id: 'choice_back_the_captain',
        requires: { elected: false },
        effects: { lockerRoom: 3, relationships: [{ role: 'captain', delta: 8 }] },
      },
      { id: 'choice_lead_by_example', requires: { elected: false }, effects: { preparation: 5 } },
    ],
  },
  {
    id: 'beat_mentor_freshman',
    trigger: 'mentor_freshman',
    choices: [
      {
        id: 'choice_take_him_under_your_wing',
        effects: {
          preparation: -3,
          lockerRoom: 5,
          relationships: [{ role: 'captain', delta: 4 }],
          flag: 'mentor',
        },
      },
      {
        id: 'choice_mentor_naturally',
        requires: { traitIds: ['personality_leader', 'personality_social'] },
        effects: { lockerRoom: 6, relationships: [{ role: 'captain', delta: 5 }], flag: 'mentor' },
      },
      { id: 'choice_own_work_first', effects: { preparation: 5 } },
    ],
  },
  {
    id: 'beat_fresh_start',
    trigger: 'fresh_start',
    choices: [
      { id: 'choice_earn_their_trust', effects: { coachTrust: 4, body: -6 } },
      { id: 'choice_learn_the_playbook', effects: { preparation: 6 } },
      {
        id: 'choice_win_the_room',
        requires: { traitIds: ['personality_social', 'personality_leader'] },
        effects: { lockerRoom: 6, relationships: [{ role: 'captain', delta: 5 }] },
      },
    ],
  },
  {
    id: 'beat_loyalty',
    trigger: 'loyalty',
    choices: [
      {
        id: 'choice_recommit',
        effects: { coachTrust: 3, relationships: [{ role: 'captain', delta: 5 }] },
      },
      {
        id: 'choice_raise_the_bar',
        effects: { confidence: 4, relationships: [{ role: 'rival', delta: -5 }] },
      },
    ],
  },
];

const camel = (id: string, prefix: string) =>
  id
    .slice(prefix.length)
    .split('_')
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('');

/** Copy keys for a beat (labels only; no rule reads them). */
export function storyKeysVNext(beatId: string) {
  const base = `v2.story.${camel(beatId, 'beat_')}`;
  return {
    title: `${base}.title`,
    body: `${base}.body`,
    variant: (variant: string) => `${base}.variant.${camel(variant, '')}`,
    choice: (choiceId: string) => `${base}.choice.${camel(choiceId, 'choice_')}`,
  };
}

/** The variants each beat's text can take (memory, background, interview kind). */
export const STORY_VARIANTS_VNEXT: Readonly<Record<string, readonly string[]>> = {
  beat_season_opener: [
    'blue_chip_star',
    'late_bloomer',
    'small_town_star',
    'legacy_recruit',
    'under_recruited_athlete',
  ],
  beat_rival_passed_you: ['fiery'],
  beat_you_passed_rival: ['vow', 'fiery'],
  beat_interview: ['big_game', 'tough_loss', 'upset_win'],
  beat_fresh_start: ['farewell'],
};
