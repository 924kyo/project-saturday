export interface AttributeGrowth {
  readonly attributeId: string;
  readonly ratingBefore: number;
  readonly ratingAfter: number;
  readonly xpBefore: number;
  readonly xpAfter: number;
  readonly gained: number;
}

interface XpEvidence {
  readonly attributeId: string;
  /** Kernels name it one way or the other; the XP that actually landed. */
  readonly appliedXp?: number;
  readonly awardedXp?: number;
  readonly ratingBefore: number;
  readonly ratingAfter: number;
  readonly xpBefore: number;
  readonly xpAfter: number;
}

/** Merges XP evidence per attribute (first before, last after), most improved first. */
export function mergeGrowth(entries: readonly XpEvidence[]): readonly AttributeGrowth[] {
  const byId = new Map<string, AttributeGrowth>();
  for (const entry of entries) {
    const known = byId.get(entry.attributeId);
    byId.set(entry.attributeId, {
      attributeId: entry.attributeId,
      ratingBefore: known?.ratingBefore ?? entry.ratingBefore,
      xpBefore: known?.xpBefore ?? entry.xpBefore,
      ratingAfter: entry.ratingAfter,
      xpAfter: entry.xpAfter,
      gained: (known?.gained ?? 0) + (entry.appliedXp ?? entry.awardedXp ?? 0),
    });
  }
  return [...byId.values()]
    .filter(({ gained }) => gained > 0)
    .sort(
      (a, b) =>
        b.ratingAfter - b.ratingBefore - (a.ratingAfter - a.ratingBefore) || b.gained - a.gained,
    );
}
