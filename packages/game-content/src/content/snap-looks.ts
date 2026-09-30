import type {
  SnapLookCatalogVNext,
  SnapLookDefinitionVNext,
  VNextPositionId,
} from '@project-saturday/game-core';

import { cbAlphaContent } from './cb-alpha.js';
import { edgeContent, lbContent } from './defenders.js';
import { gameContent } from './games.js';
import { qbAlphaContent } from './qb-alpha.js';
import { rbAlphaContent } from './rb-alpha.js';
import { SNAP_LOOK_FAMILIES, SNAP_LOOK_ROWS } from './snap-looks.generated.js';

/**
 * M11 snap looks. Base looks are the shipped patterns (name, clue tells and fits); new looks make
 * a family's third technique the winning read; disguises share a base look's alignment and first
 * tell while their later tells point to another read.
 */
interface CatalogPattern {
  readonly id: string;
  readonly nameKey: string;
  readonly clueIds: readonly string[];
  readonly decisionFits: readonly { readonly decisionId: string; readonly fit: number }[];
}
interface Catalog {
  readonly patterns: readonly CatalogPattern[];
  readonly clues: readonly { readonly id: string; readonly nameKey: string }[];
}

// Read lazily: bundlers may evaluate this module before the catalogs it reads.
const catalogs = (): Readonly<Record<VNextPositionId, Catalog>> => ({
  position_qb: qbAlphaContent as unknown as Catalog,
  position_rb: rbAlphaContent as unknown as Catalog,
  position_wr: gameContent as unknown as Catalog,
  position_cb: cbAlphaContent as unknown as Catalog,
  position_lb: lbContent as unknown as Catalog,
  position_edge: edgeContent as unknown as Catalog,
});

/**
 * WR patterns author score modifiers (−10…24); looks speak the kernels' 0–100 fit scale. The WR
 * kernel reads fit directly (targets, catch, turnovers), so its spread is the read's whole edge.
 */
const WR_RANK_FITS = [96, 66, 36] as const;

function patternOf(positionId: VNextPositionId, patternId: string): CatalogPattern {
  const pattern = catalogs()[positionId].patterns.find(({ id }) => id === patternId);
  if (pattern === undefined) throw new Error(`Missing snap-look pattern ${patternId}.`);
  return pattern;
}

function clueKey(positionId: VNextPositionId, clueId: string): string {
  const clue = catalogs()[positionId].clues.find(({ id }) => id === clueId);
  if (clue === undefined) throw new Error(`Missing snap-look clue ${clueId}.`);
  return clue.nameKey;
}

function baseFits(positionId: VNextPositionId, pattern: CatalogPattern) {
  if (positionId !== 'position_wr') return pattern.decisionFits.map((entry) => ({ ...entry }));
  const ranked = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit);
  return pattern.decisionFits.map(({ decisionId }) => ({
    decisionId,
    fit: WR_RANK_FITS[ranked.findIndex((entry) => entry.decisionId === decisionId)]!,
  }));
}

function resolveLooks(): readonly SnapLookDefinitionVNext[] {
  const resolved = new Map<string, SnapLookDefinitionVNext>();
  const ordered = [...SNAP_LOOK_ROWS].sort(
    (left, right) => Number(left.kind === 'disguise') - Number(right.kind === 'disguise'),
  );
  for (const row of ordered) {
    const shared = { id: row.id, positionId: row.positionId, familyId: row.familyId };
    if (row.kind === 'base') {
      const pattern = patternOf(row.positionId, row.patternId);
      const tells = row.tellKeys ?? pattern.clueIds.map((id) => clueKey(row.positionId, id));
      resolved.set(row.id, {
        ...shared,
        nameKey: pattern.nameKey,
        tellKeys: [tells[0]!, tells[1]!, tells[2] ?? tells[1]!],
        fits: baseFits(row.positionId, pattern),
        weight: row.weight,
        stance: row.stance,
        moves: row.moves,
      });
    } else if (row.kind === 'new') {
      resolved.set(row.id, {
        ...shared,
        nameKey: row.nameKey,
        tellKeys: [row.tellKeys[0]!, row.tellKeys[1]!, row.tellKeys[2]!],
        fits: row.fits,
        weight: row.weight,
        stance: row.stance,
        moves: row.moves,
      });
    } else {
      const base = resolved.get(row.of);
      const donor = row.fitsFrom === undefined ? undefined : resolved.get(row.fitsFrom);
      const fits = row.fits ?? donor?.fits;
      if (base === undefined || fits === undefined)
        throw new Error(`Snap-look disguise ${row.id} is missing its base or fits.`);
      resolved.set(row.id, {
        ...shared,
        nameKey: row.nameKey,
        tellKeys: [base.tellKeys[0], row.laterTellKeys[0]!, row.laterTellKeys[1]!],
        fits,
        weight: row.weight,
        stance: base.stance,
        // The shared picture: everything a thinly prepared athlete can see (pre-snap and first-tell
        // movements) is the base look's; only deeper tells expose the disguise's own movements.
        moves: [
          ...base.moves.filter(({ reveal }) => reveal <= 1),
          ...row.moves.filter(({ reveal }) => reveal >= 2),
        ],
      });
    }
  }
  return SNAP_LOOK_ROWS.map(({ id }) => resolved.get(id)!);
}

let resolved: readonly SnapLookDefinitionVNext[] | undefined;

/** Resolved on first read, after every catalog module has initialized. */
export const snapLookCatalogVNext: SnapLookCatalogVNext = {
  families: SNAP_LOOK_FAMILIES,
  get looks() {
    resolved ??= resolveLooks();
    return resolved;
  },
};
