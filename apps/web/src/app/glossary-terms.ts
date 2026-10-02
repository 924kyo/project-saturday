/** The glossary's terms, in reading order (copy keys `v2.glossary.<term>.name|def`). */
export const GLOSSARY_TERMS = [
  'look',
  'tell',
  'read',
  'downDistance',
  'depthChart',
  'coachTrust',
  'preparation',
  'overall',
  'potential',
  'schemeFit',
  'insight',
  'mastery',
  'gauge',
  'nil',
  'portal',
] as const;

export type GlossaryTerm = (typeof GLOSSARY_TERMS)[number];

/** The key terms each screen links to its definition. */
export const SNAP_TERMS = [
  'look',
  'tell',
  'read',
  'downDistance',
] as const satisfies readonly GlossaryTerm[];
export const WEEK_TERMS = [
  'preparation',
  'coachTrust',
  'depthChart',
  'overall',
  'potential',
] as const satisfies readonly GlossaryTerm[];
export const BUILD_TERMS = [
  'gauge',
  'insight',
  'mastery',
] as const satisfies readonly GlossaryTerm[];
export const OFFSEASON_TERMS = [
  'portal',
  'schemeFit',
  'nil',
] as const satisfies readonly GlossaryTerm[];
