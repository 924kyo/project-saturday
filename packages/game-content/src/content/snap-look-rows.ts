import type { SnapLookMove, SnapLookStance, VNextPositionId } from '@project-saturday/game-core';

/** Authoring rows written by scripts/generate-snap-looks.py (see snap-looks.ts for resolution). */
interface RowBase {
  readonly id: string;
  readonly positionId: VNextPositionId;
  readonly familyId: string;
  readonly weight: number;
  readonly moves: readonly SnapLookMove[];
}

type Fit = { readonly decisionId: string; readonly fit: number };

export type SnapLookRowVNext =
  | (RowBase & {
      readonly kind: 'base';
      /** The shipped pattern this look is: its name, tells and (0–100) fits. */
      readonly patternId: string;
      readonly stance: SnapLookStance;
      /** Authored tells replacing the pattern's clue labels (WR). */
      readonly tellKeys?: readonly string[];
    })
  | (RowBase & {
      readonly kind: 'new';
      readonly nameKey: string;
      readonly tellKeys: readonly string[];
      readonly fits: readonly Fit[];
      readonly stance: SnapLookStance;
    })
  | (RowBase & {
      readonly kind: 'disguise';
      /** The base look whose alignment and first tell this look shares. */
      readonly of: string;
      readonly nameKey: string;
      readonly laterTellKeys: readonly string[];
      readonly fits?: readonly Fit[];
      readonly fitsFrom?: string;
    });
