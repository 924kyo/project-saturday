import type { ProgramId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import type { MetaProfileV1 } from './types.js';

type Header = Pick<MetaProfileV1, 'revision' | 'programFamiliarity' | 'unlockedOptionIds'>;
/** Internal registration arithmetic shared by full-profile and indexed transports. */
export function registeredWrMetaHeader(
  source: Header,
  programs: readonly ProgramId[],
): Header | null {
  if (source.revision === Number.MAX_SAFE_INTEGER) return null;
  const familiarity = new Map(
    source.programFamiliarity.map(({ programId, completedCareers }) => [
      programId,
      completedCareers,
    ]),
  );
  for (const programId of new Set(programs)) {
    const current = familiarity.get(programId) ?? 0;
    if (current === Number.MAX_SAFE_INTEGER) return null;
    familiarity.set(programId, current + 1);
  }
  return {
    revision: source.revision + 1,
    unlockedOptionIds: [
      ...new Set([...source.unlockedOptionIds, 'legacy_option_alumni_history']),
    ].sort(compareCodeUnits),
    programFamiliarity: [...familiarity.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([programId, completedCareers]) => ({ programId, completedCareers })),
  };
}
