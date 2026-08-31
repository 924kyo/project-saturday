import {
  ATTRIBUTE_PROGRESS_XP_BOUNDS,
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  CAREER_SCHEMA_VERSION,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  HEIGHT_CM_BOUNDS,
  PERSONALITY_TRAIT_INCOMPATIBILITIES,
  PLAYER_ATTRIBUTE_IDS,
  POSITION_WR_ID,
  WEIGHT_KG_BOUNDS,
  createRng,
  createWrCareer,
  deriveCareerId,
  derivePlayerId,
  deriveWrOverall,
  isCareerRun,
  parseCareerRunV2,
  validateCareerRun,
  type CreateWrCareerInput,
  type InitialAttributeRatings,
  type PersonalityTraitId,
  type PersonalityCreationProfile,
  type PlayerCreationIssueCode,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

type DeepMutable<T> = T extends object ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> } : T;

function baseRatings(rating = 60): InitialAttributeRatings {
  return Object.fromEntries(
    PLAYER_ATTRIBUTE_IDS.map((attributeId) => [attributeId, rating]),
  ) as unknown as InitialAttributeRatings;
}

function personalityProfile(
  id: PersonalityTraitId,
  delta: number,
  incompatibleTraitIds: readonly PersonalityTraitId[] = PERSONALITY_TRAIT_INCOMPATIBILITIES[id],
): DeepMutable<PersonalityCreationProfile> {
  return {
    id,
    attributeModifiers: [{ attributeId: 'attribute_composure', delta }],
    stateModifiers: [],
    grantedTagIds: [`tag_${id}`],
    incompatibleTraitIds: [...incompatibleTraitIds],
  };
}

function validInput(): CreateWrCareerInput {
  return {
    careerSeed: 'm1-domain-fixture',
    identity: {
      displayName: '민준 Carter',
      archetypeId: 'archetype_wr_deep_threat',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_competitive', 'personality_quiet'],
      appearance: {
        skinToneId: 'skin_tone_04',
        faceId: 'face_02',
        hairStyleId: 'hair_style_short_curls',
        hairColorId: 'hair_color_black',
        bodyTypeId: 'body_type_lean',
        eyeBlackId: 'eye_black_single',
        armSleevesId: null,
        glovesId: 'gloves_standard',
        visorId: null,
        wristTapeId: 'wrist_tape_white',
        towelId: null,
        jerseyFitId: 'jersey_fit_fitted',
        footwearId: 'footwear_low_cut',
      },
      heightCm: 188,
      weightKg: 86,
    },
    mechanics: {
      baseAttributeRatings: baseRatings(),
      baseState: {
        state_body: 80,
        state_confidence: 50,
        state_coach_trust: 10,
        state_brand: 5,
        state_gpa: 3,
      },
      archetypeProfile: {
        id: 'archetype_wr_deep_threat',
        attributeModifiers: [
          { attributeId: 'attribute_speed', delta: 6 },
          { attributeId: 'attribute_wr_catch_in_traffic', delta: -2 },
        ],
        stateModifiers: [],
        grantedTagIds: ['tag_archetype_deep_threat'],
      },
      backgroundProfile: {
        id: 'background_late_bloomer',
        attributeModifiers: [
          { attributeId: 'attribute_work_ethic', delta: 4 },
          { attributeId: 'attribute_burst', delta: -1 },
        ],
        stateModifiers: [{ stateId: 'state_confidence', delta: -3 }],
        grantedTagIds: ['tag_background_late_bloomer'],
      },
      personalityProfiles: [
        personalityProfile('personality_competitive', 2),
        personalityProfile('personality_quiet', -1, ['personality_social']),
      ],
    },
  };
}

function expectSuccess(input: CreateWrCareerInput = validInput()) {
  const result = createWrCareer(input);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.career;
}

function issueCodes(input: CreateWrCareerInput): readonly PlayerCreationIssueCode[] {
  const result = createWrCareer(input);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected player creation to fail.');
  }
  return result.issues.map((issue) => issue.code);
}

function cloneInput(): DeepMutable<CreateWrCareerInput> {
  return JSON.parse(JSON.stringify(validInput())) as DeepMutable<CreateWrCareerInput>;
}

describe('WR player creation', () => {
  it('creates a strict schema-v2 WR career with all specified attribute groups', () => {
    const career = expectSuccess();

    expect(career.schemaVersion).toBe(CAREER_SCHEMA_VERSION);
    expect(career.programId).toBeNull();
    expect(career.weekIndex).toBe(0);
    expect(career.recentWeeklyActionIds).toEqual([]);
    expect(career.lastPassiveBodyRecovery).toBeNull();
    expect(career.player.positionId).toBe(POSITION_WR_ID);
    expect(career.player.skillState).toEqual({
      acquisitions: [],
      equippedSkillIds: [null, null, null, null],
    });
    expect(Object.keys(career.player.attributes.physical)).toHaveLength(6);
    expect(Object.keys(career.player.attributes.mental)).toHaveLength(4);
    expect(Object.keys(career.player.attributes.wr)).toHaveLength(6);
    expect(career.player.attributes.physical.attribute_speed).toEqual({ rating: 66, xp: 0 });
    expect(career.player.attributes.physical.attribute_burst.rating).toBe(59);
    expect(career.player.attributes.mental.attribute_work_ethic.rating).toBe(64);
    expect(career.player.attributes.mental.attribute_composure.rating).toBe(61);
    expect(career.player.attributes.wr.attribute_wr_catch_in_traffic.rating).toBe(58);
    expect(career.player.state.confidence).toBe(47);
    expect(career.rng).toEqual(createRng('m1-domain-fixture'));
    expect(career.rng.drawCount).toBe(0);
    expect(career.player).not.toHaveProperty('overall');
    expect(deriveWrOverall(career)).toBe(61);
  });

  it('derives replay-stable IDs and accepts valid supplied IDs without consuming RNG', () => {
    const input = validInput();
    const replay = expectSuccess(input);

    expect(replay.id).toBe(deriveCareerId(input.careerSeed));
    expect(replay.player.id).toBe(derivePlayerId(input.careerSeed));
    expect(replay.id).toBe('career_0a313b49512b6234');
    expect(replay.player.id).toBe('player_68c0fffda3247aaa');
    expect(expectSuccess(input)).toEqual(replay);

    const editedIdentity = cloneInput();
    editedIdentity.identity.displayName = 'A Different Athlete Name';
    editedIdentity.identity.heightCm = 201;
    editedIdentity.identity.appearance.faceId = 'face_99';
    expect(expectSuccess(editedIdentity).player.id).toBe(replay.player.id);

    const supplied = expectSuccess({
      ...input,
      careerId: 'career_user_slot_01',
      playerId: 'player_user_identity_01',
    });
    expect(supplied.id).toBe('career_user_slot_01');
    expect(supplied.player.id).toBe('player_user_identity_01');
    expect(supplied.rng.drawCount).toBe(0);
  });

  it('canonicalizes unordered personality/profile inputs to the same immutable state', () => {
    const firstInput = validInput();
    const reversedInput: CreateWrCareerInput = {
      ...firstInput,
      identity: {
        ...firstInput.identity,
        personalityTraitIds: ['personality_quiet', 'personality_competitive'],
      },
      mechanics: {
        ...firstInput.mechanics,
        personalityProfiles: [
          firstInput.mechanics.personalityProfiles[1],
          firstInput.mechanics.personalityProfiles[0],
        ],
      },
    };

    const first = expectSuccess(firstInput);
    const reversed = expectSuccess(reversedInput);
    expect(reversed).toEqual(first);
    expect(reversed.player.personalityTraitIds).toEqual([
      'personality_competitive',
      'personality_quiet',
    ]);
    expect(reversed.player.tagIds).toEqual([
      'tag_archetype_deep_threat',
      'tag_background_late_bloomer',
      'tag_personality_competitive',
      'tag_personality_quiet',
    ]);
  });

  it('copies and deeply freezes every created collection without mutating creation input', () => {
    const input = validInput();
    const before = JSON.stringify(input);
    const career = expectSuccess(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(career)).toBe(true);
    expect(Object.isFrozen(career.player)).toBe(true);
    expect(Object.isFrozen(career.player.appearance)).toBe(true);
    expect(Object.isFrozen(career.player.personalityTraitIds)).toBe(true);
    expect(Object.isFrozen(career.player.tagIds)).toBe(true);
    expect(Object.isFrozen(career.player.attributes.physical.attribute_speed)).toBe(true);
    expect(Object.isFrozen(career.player.skillState)).toBe(true);
    expect(Object.isFrozen(career.player.skillState.equippedSkillIds)).toBe(true);
    expect(() => {
      (career.player.state as { body: number }).body = 0;
    }).toThrow(TypeError);
    expect(career.player.state.body).toBe(80);
  });

  it('keeps all centralized permanent and temporary values within their declared bounds', () => {
    expect(ATTRIBUTE_RATING_BOUNDS).toEqual({ min: 0, max: 100 });
    expect(ATTRIBUTE_PROGRESS_XP_BOUNDS).toEqual({ min: 0, max: 99 });
    expect(BODY_BOUNDS).toEqual({ min: 0, max: 100 });
    expect(CONFIDENCE_BOUNDS).toEqual({ min: 0, max: 100 });
    expect(COACH_TRUST_BOUNDS).toEqual({ min: 0, max: 100 });
    expect(BRAND_BOUNDS).toEqual({ min: 0, max: 100 });
    expect(GPA_BOUNDS).toEqual({ min: 0, max: 4 });
    expect(HEIGHT_CM_BOUNDS).toEqual({ min: 150, max: 215 });
    expect(WEIGHT_KG_BOUNDS).toEqual({ min: 55, max: 150 });
    for (const valueBounds of [
      ATTRIBUTE_RATING_BOUNDS,
      ATTRIBUTE_PROGRESS_XP_BOUNDS,
      BODY_BOUNDS,
      CONFIDENCE_BOUNDS,
      COACH_TRUST_BOUNDS,
      BRAND_BOUNDS,
      GPA_BOUNDS,
      HEIGHT_CM_BOUNDS,
      WEIGHT_KG_BOUNDS,
    ]) {
      expect(Object.isFrozen(valueBounds)).toBe(true);
    }
  });

  it('rejects final attribute and state totals outside bounds instead of clamping', () => {
    const attributeInput = cloneInput();
    (attributeInput.mechanics.baseAttributeRatings as Record<string, number>)['attribute_speed'] =
      100;
    expect(issueCodes(attributeInput)).toContain('creation.out_of_bounds');

    const stateInput = cloneInput();
    (stateInput.mechanics.baseState as Record<string, number>)['state_body'] = 100;
    stateInput.mechanics.personalityProfiles[0].stateModifiers = [
      { stateId: 'state_body', delta: 1 },
    ];
    expect(issueCodes(stateInput)).toContain('creation.out_of_bounds');

    const gpaInput = cloneInput();
    gpaInput.mechanics.personalityProfiles[0].stateModifiers = [
      { stateId: 'state_gpa', delta: 1.25 },
    ];
    expect(issueCodes(gpaInput)).toContain('creation.out_of_bounds');
  });

  it('rejects malformed baselines, seeds, stable IDs, appearance IDs, names, and dimensions', () => {
    const malformed = cloneInput();
    malformed.careerSeed = -1;
    malformed.careerId = 'bad_id' as `career_${string}`;
    malformed.playerId = 'player_Bad' as `player_${string}`;
    malformed.identity.displayName = ' padded ';
    malformed.identity.heightCm = HEIGHT_CM_BOUNDS.max + 1;
    malformed.identity.weightKg = WEIGHT_KG_BOUNDS.min - 1;
    malformed.identity.appearance.hairStyleId = 'face_wrong_namespace' as `hair_style_${string}`;
    (malformed.mechanics.baseAttributeRatings as Record<string, number>)['attribute_wr_hands'] =
      100.5;
    (malformed.mechanics.baseState as Record<string, number>)['state_gpa'] = 5;

    expect(issueCodes(malformed)).toEqual(
      expect.arrayContaining([
        'creation.invalid_appearance_id',
        'creation.invalid_baseline',
        'creation.invalid_body_measurement',
        'creation.invalid_display_name',
        'creation.invalid_seed',
        'creation.invalid_stable_id',
      ]),
    );
  });

  it('requires exactly two distinct controlled personality traits with matching profiles', () => {
    const duplicate = cloneInput();
    duplicate.identity.personalityTraitIds = ['personality_competitive', 'personality_competitive'];
    duplicate.mechanics.personalityProfiles = [
      personalityProfile('personality_competitive', 2),
      personalityProfile('personality_competitive', -1),
    ];
    expect(issueCodes(duplicate)).toEqual(
      expect.arrayContaining(['creation.duplicate_personality']),
    );

    const mismatch = cloneInput();
    mismatch.mechanics.personalityProfiles[1] = personalityProfile('personality_leader', 1);
    expect(issueCodes(mismatch)).toContain('creation.profile_mismatch');

    const uncontrolled = cloneInput();
    uncontrolled.identity.personalityTraitIds[1] = 'personality_unknown' as never;
    expect(issueCodes(uncontrolled)).toContain('creation.invalid_identity_id');
  });

  it('rejects authoritative incompatibilities in either selection order and profile order', () => {
    for (const reverse of [false, true]) {
      const input = cloneInput();
      const quiet = personalityProfile('personality_quiet', 2);
      const social = personalityProfile('personality_social', -1);
      input.identity.personalityTraitIds = reverse
        ? ['personality_social', 'personality_quiet']
        : ['personality_quiet', 'personality_social'];
      input.mechanics.personalityProfiles = reverse ? [social, quiet] : [quiet, social];

      const result = createWrCareer(input);
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          issues: expect.arrayContaining([
            {
              code: 'creation.incompatible_personality',
              path: 'identity.personalityTraitIds',
            },
          ]),
        }),
      );
      expect(Object.isFrozen(result)).toBe(true);
      if (!result.ok) {
        expect(Object.isFrozen(result.issues)).toBe(true);
        expect(Object.isFrozen(result.issues[0])).toBe(true);
        expect(() => {
          (result.issues[0] as { path: string }).path = 'mutated';
        }).toThrow(TypeError);
      }
    }
  });

  it('cannot bypass authoritative compatibility by clearing supplied profile conflicts', () => {
    const input = cloneInput();
    input.identity.personalityTraitIds = ['personality_quiet', 'personality_social'];
    input.mechanics.personalityProfiles = [
      personalityProfile('personality_quiet', 2, []),
      personalityProfile('personality_social', -1, []),
    ];

    expect(issueCodes(input)).toEqual(
      expect.arrayContaining(['creation.incompatible_personality', 'creation.profile_mismatch']),
    );
  });

  it('requires every selected identity profile to change initial numeric state', () => {
    for (const profilePath of [
      'archetype',
      'background',
      'firstPersonality',
      'secondPersonality',
    ] as const) {
      const input = cloneInput();
      const profile =
        profilePath === 'archetype'
          ? input.mechanics.archetypeProfile
          : profilePath === 'background'
            ? input.mechanics.backgroundProfile
            : profilePath === 'firstPersonality'
              ? input.mechanics.personalityProfiles[0]
              : input.mechanics.personalityProfiles[1];
      profile.attributeModifiers = [];
      profile.stateModifiers = [];
      profile.grantedTagIds = ['tag_future_event_only'];

      expect(issueCodes(input)).toContain('creation.profile_has_no_initial_effect');
    }
  });

  it('rejects duplicate modifier targets, zero/non-finite modifiers, and invalid tags', () => {
    const input = cloneInput();
    input.mechanics.archetypeProfile.attributeModifiers = [
      { attributeId: 'attribute_speed', delta: 2 },
      { attributeId: 'attribute_speed', delta: 1 },
      { attributeId: 'attribute_burst', delta: 0 },
    ];
    input.mechanics.backgroundProfile.stateModifiers = [
      { stateId: 'state_confidence', delta: Number.NaN },
    ];
    input.mechanics.personalityProfiles[0].grantedTagIds = ['not_a_tag' as `tag_${string}`];

    expect(issueCodes(input)).toEqual(
      expect.arrayContaining([
        'creation.duplicate_modifier',
        'creation.invalid_modifier',
        'creation.invalid_tag',
      ]),
    );
  });
});

describe('career invariants and serialization', () => {
  it('accepts an exact JSON round-trip and rejects extra properties', () => {
    const career = expectSuccess();
    const serialized = JSON.stringify(career);
    const restored: unknown = JSON.parse(serialized);

    expect(serialized).not.toContain('undefined');
    expect(validateCareerRun(restored)).toEqual({ ok: true, issues: [] });
    expect(isCareerRun(restored)).toBe(true);

    const withDerivedOverall = restored as { player: Record<string, unknown> };
    withDerivedOverall.player['overall'] = 99;
    expect(validateCareerRun(withDerivedOverall)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.unknown_field', path: 'career.player.overall' },
        ]),
      }),
    );

    const withRngMetadata = JSON.parse(serialized) as { rng: Record<string, unknown> };
    withRngMetadata.rng['debugLabel'] = 'not part of schema v1';
    expect(validateCareerRun(withRngMetadata)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.unknown_field', path: 'career.rng.debugLabel' },
        ]),
      }),
    );
  });

  it('rejects every protected bound and impossible max-rating progress combination', () => {
    const tampered = JSON.parse(JSON.stringify(expectSuccess())) as {
      player: {
        attributes: {
          physical: Record<string, { rating: number; xp: number }>;
        };
        state: Record<string, number>;
      };
    };
    tampered.player.attributes.physical['attribute_speed'] = { rating: 100, xp: 1 };
    tampered.player.state['body'] = -1;
    tampered.player.state['confidence'] = 101;
    tampered.player.state['coachTrust'] = -1;
    tampered.player.state['brand'] = 101;
    tampered.player.state['gpa'] = 4.01;

    const result = validateCareerRun(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([
          'career.player.attributes.physical.attribute_speed',
          'career.player.state.body',
          'career.player.state.brand',
          'career.player.state.coachTrust',
          'career.player.state.confidence',
          'career.player.state.gpa',
        ]),
      );
    }
  });

  it('rejects noncanonical/duplicate identity collections and invalid continuation state', () => {
    const tampered = JSON.parse(JSON.stringify(expectSuccess())) as {
      rng: { state: number[] };
      player: { personalityTraitIds: string[]; tagIds: string[] };
    };
    tampered.player.personalityTraitIds.reverse();
    tampered.player.tagIds = ['tag_repeat', 'tag_repeat'];
    tampered.rng.state = [0, 0, 0, 0];

    const result = validateCareerRun(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          {
            code: 'invariant.noncanonical_order',
            path: 'career.player.personalityTraitIds',
          },
          { code: 'invariant.duplicate_value', path: 'career.player.tagIds.1' },
          { code: 'invariant.invalid_value', path: 'career.rng' },
        ]),
      );
    }
  });

  it('rejects an incompatible personality pair in a raw schema-v2 career', () => {
    const tampered = JSON.parse(JSON.stringify(expectSuccess())) as {
      player: { personalityTraitIds: string[] };
    };
    tampered.player.personalityTraitIds = ['personality_quiet', 'personality_social'];

    expect(validateCareerRun(tampered)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          {
            code: 'invariant.invalid_combination',
            path: 'career.player.personalityTraitIds',
          },
        ]),
      }),
    );
  });
});

describe('current schema-v2 career parsing', () => {
  it('deeply clones and freezes valid object and JSON inputs', () => {
    const source = JSON.parse(JSON.stringify(expectSuccess())) as Record<string, unknown>;
    const fromObject = parseCareerRunV2(source);
    const fromJson = parseCareerRunV2(JSON.stringify(source));

    expect(fromObject).toEqual(fromJson);
    expect(fromObject.ok).toBe(true);
    if (!fromObject.ok) {
      return;
    }

    expect(fromObject.career).not.toBe(source);
    expect(Object.isFrozen(fromObject.career)).toBe(true);
    expect(Object.isFrozen(fromObject.career.player.attributes.wr)).toBe(true);
    source['weekIndex'] = 99;
    expect(fromObject.career.weekIndex).toBe(0);
  });

  it('distinguishes malformed JSON, unsupported versions, and invalid current data', () => {
    expect(parseCareerRunV2('{')).toEqual({
      ok: false,
      reason: 'career_parse.invalid_json',
      issues: [],
    });

    const unsupported = JSON.parse(JSON.stringify(expectSuccess())) as {
      schemaVersion: number;
    };
    unsupported.schemaVersion = 3;
    expect(parseCareerRunV2(unsupported)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });

    const invalid = JSON.parse(JSON.stringify(expectSuccess())) as {
      player: { state: { body: number } };
    };
    invalid.player.state.body = 101;
    expect(parseCareerRunV2(invalid)).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'career_parse.invalid_career',
        issues: expect.arrayContaining([
          { code: 'invariant.out_of_bounds', path: 'career.player.state.body' },
        ]),
      }),
    );
  });

  it('never treats a version-zero payload as an implicit migration', () => {
    const legacyLike = JSON.parse(JSON.stringify(expectSuccess())) as {
      schemaVersion: number;
    };
    legacyLike.schemaVersion = 0;

    expect(parseCareerRunV2(legacyLike)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
  });

  it('snapshots accessor-backed input once before validation', () => {
    const accessorBacked = JSON.parse(JSON.stringify(expectSuccess())) as {
      player: { state: Record<string, unknown> };
    };
    let bodyReads = 0;
    Object.defineProperty(accessorBacked.player.state, 'body', {
      enumerable: true,
      get: () => {
        bodyReads += 1;
        return bodyReads === 1 ? 80 : 101;
      },
    });

    const parsed = parseCareerRunV2(accessorBacked);
    expect(parsed).toEqual(expect.objectContaining({ ok: true }));
    expect(bodyReads).toBe(1);
    if (parsed.ok) {
      expect(parsed.career.player.state.body).toBe(80);
    }
  });
});
