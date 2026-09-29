import type {
  PositionSkillOfferDefinitionV2,
  SkillBreakthroughSourceId,
  SkillFamilyId,
} from '@project-saturday/game-core';
import { qbAlphaSkills } from './qb-alpha.js';
import { rbAlphaSkills } from './rb-alpha.js';
import { cbAlphaSkills } from './cb-alpha.js';

const SOURCE_BY_FAMILY: Readonly<Record<SkillFamilyId, SkillBreakthroughSourceId>> = {
  skill_family_development: 'breakthrough_source_development',
  skill_family_role_coach: 'breakthrough_source_role_coach',
  skill_family_game_day: 'breakthrough_source_game_day',
  skill_family_mindset: 'breakthrough_source_mindset',
  skill_family_body: 'breakthrough_source_body',
  skill_family_life: 'breakthrough_source_life',
};
const BASE_WEIGHT_BY_GRADE = {
  skill_grade_c: 100,
  skill_grade_b: 70,
  skill_grade_a: 40,
  skill_grade_s: 15,
} as const;

/** Current-only authored acquisition weights; original IDs, grades and game/event effects stay literal. */
export const positionSkillOffers: readonly PositionSkillOfferDefinitionV2[] = [
  ...qbAlphaSkills,
  ...rbAlphaSkills,
  ...cbAlphaSkills,
].map((card) => ({
  id: card.id,
  positionId: card.positionId,
  gradeId: card.gradeId,
  familyId: card.familyId,
  baseOfferWeight: BASE_WEIGHT_BY_GRADE[card.gradeId],
  sourceId: SOURCE_BY_FAMILY[card.familyId],
  sourceWeightBonus: 4,
}));
