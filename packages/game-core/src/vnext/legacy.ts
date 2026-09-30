import type { ProgramId } from '../player/ids.js';
import type {
  AlumniVNext,
  CareerVNext,
  LegacyAlumnusVNext,
  LegacyVNext,
  VNextPositionId,
} from './types.js';
import { isVNextPositionId } from './common.js';

/**
 * Legacy history (M9). A new career saves a bounded snapshot of the Alumni Wall, so everything
 * legacy shapes (program familiarity, mentors, cameos) is deterministic from the career's own save.
 * Legacy is information and story only: it never adds ratings or starting power.
 */
export const VNEXT_LEGACY_TUNING = Object.freeze({
  snapshotLimit: 20,
  mentorChancePermille: 150,
  mentorCooldownWeeks: 6,
});

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.slice(0, 80) : fallback;
const count = (value: unknown): number =>
  Number.isSafeInteger(value) && (value as number) >= 0 ? Math.min(value as number, 999) : 0;

/** Snapshot of stored plaques (defensive: plaques come from device storage). */
export function snapshotLegacyVNext(alumni: readonly AlumniVNext[] | undefined): LegacyVNext {
  const entries: LegacyAlumnusVNext[] = [];
  for (const entry of (alumni ?? []).slice(-VNEXT_LEGACY_TUNING.snapshotLimit)) {
    if (typeof entry?.careerId !== 'string' || !isVNextPositionId(entry.positionId)) continue;
    entries.push({
      careerId: text(entry.careerId),
      displayName: text(entry.displayName),
      positionId: entry.positionId as VNextPositionId,
      programIds: (Array.isArray(entry.programIds) ? entry.programIds : [])
        .filter((id): id is ProgramId => typeof id === 'string')
        .slice(0, 4),
      seasons: count(entry.seasons),
      championships: count(entry.championships),
      conferenceTitles: count(entry.conferenceTitles),
      awards: Array.isArray(entry.awards) ? count(entry.awards.length) : 0,
      draftRound:
        entry.draft !== undefined && Number.isSafeInteger(entry.draft.round)
          ? (entry.draft.round as number)
          : null,
      ...(entry.ending === undefined ? {} : { ending: entry.ending }),
    });
  }
  return { alumni: entries };
}

/** Alumni who played for a program, oldest first (the career's own snapshot only). */
export function programAlumniVNext(
  career: Pick<CareerVNext, 'legacy'>,
  programId: ProgramId,
): readonly LegacyAlumnusVNext[] {
  return (career.legacy?.alumni ?? []).filter((entry) => entry.programIds.includes(programId));
}

export interface RecordBookEntryVNext {
  readonly recordId:
    | 'record_championships'
    | 'record_conference_titles'
    | 'record_awards'
    | 'record_best_pick'
    | 'record_wins'
    | 'record_live_games'
    | `record_stat_${string}`;
  readonly careerId: string;
  readonly displayName: string;
  readonly positionId: VNextPositionId;
  readonly value: number;
  /** For stat records, the stat field the value belongs to. */
  readonly field?: string;
}

/** The record book: the best career mark in each category across every plaque (ties: earliest). */
export function recordBookVNext(alumni: readonly AlumniVNext[]): readonly RecordBookEntryVNext[] {
  const valid = alumni.filter(
    (entry) => typeof entry?.careerId === 'string' && isVNextPositionId(entry.positionId),
  );
  const records: RecordBookEntryVNext[] = [];
  const best = (
    recordId: RecordBookEntryVNext['recordId'],
    value: (entry: AlumniVNext) => number | null,
    lowerIsBetter = false,
    field?: string,
  ) => {
    let holder: AlumniVNext | null = null;
    let top = 0;
    for (const entry of valid) {
      const current = value(entry);
      if (current === null || current <= 0) continue;
      if (holder === null || (lowerIsBetter ? current < top : current > top)) {
        holder = entry;
        top = current;
      }
    }
    if (holder !== null)
      records.push({
        recordId,
        careerId: holder.careerId,
        displayName: holder.displayName,
        positionId: holder.positionId,
        value: top,
        ...(field === undefined ? {} : { field }),
      });
  };
  best('record_championships', ({ championships }) => championships);
  best('record_conference_titles', ({ conferenceTitles }) => conferenceTitles ?? 0);
  best('record_awards', ({ awards }) => awards?.length ?? 0);
  best('record_best_pick', ({ draft }) => draft?.pick ?? null, true);
  best('record_wins', ({ record }) => record.wins);
  best('record_live_games', ({ liveGames }) => liveGames);
  const fields = [
    ...new Set(valid.flatMap(({ statTotals }) => statTotals.map(({ field }) => field))),
  ].sort();
  for (const field of fields)
    best(
      `record_stat_${field}`,
      ({ statTotals }) => statTotals.find((total) => total.field === field)?.value ?? null,
      false,
      field,
    );
  return records;
}
