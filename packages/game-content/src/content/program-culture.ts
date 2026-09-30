import type { ProgramId } from '@project-saturday/game-core';

import { PROGRAM_CULTURE_ROWS, PROGRAM_EMBLEMS } from './program-culture.generated.js';

/**
 * Program culture (presentation only): a mascot, a tradition and atmosphere tags for every program.
 * It never changes ratings, offers or results. Mascots map to one of 24 emblem types, so a small
 * art set tinted in each program's colors covers the world (`docs/design/ASSET_LIST.md`).
 */
export interface ProgramCultureRow {
  readonly programId: string;
  readonly mascotKey: string;
  readonly emblem: (typeof PROGRAM_EMBLEMS)[number];
  readonly tradition: string;
  readonly atmospheres: readonly string[];
}

export interface ProgramCultureVNext {
  readonly mascotKey: string;
  readonly emblem: (typeof PROGRAM_EMBLEMS)[number];
  readonly traditionKey: string;
  readonly atmosphereKeys: readonly string[];
}

export { PROGRAM_EMBLEMS };

const byId = new Map(PROGRAM_CULTURE_ROWS.map((row) => [row.programId, row]));

export function programCultureVNext(programId: ProgramId | string): ProgramCultureVNext | null {
  const row = byId.get(programId);
  if (row === undefined) return null;
  return {
    mascotKey: row.mascotKey,
    emblem: row.emblem,
    traditionKey: `v2.tradition.${row.tradition}`,
    atmosphereKeys: row.atmospheres.map((tag) => `v2.atmosphere.${tag}`),
  };
}

export const programCultureRowsVNext = PROGRAM_CULTURE_ROWS;
