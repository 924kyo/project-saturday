import type { ProgramId } from '../player/ids';

export interface CurrentProgramCareerSource {
  readonly programId: ProgramId | null;
}

export interface CurrentProgramLifecycleSource {
  readonly lifecycle: {
    readonly currentProgramId: ProgramId;
  };
}

export type CurrentProgramSource = CurrentProgramCareerSource | CurrentProgramLifecycleSource;

/** Select current team membership without consulting immutable recruiting-origin evidence. */
export function selectCurrentProgramId(source: CurrentProgramSource): ProgramId | null {
  return 'lifecycle' in source ? source.lifecycle.currentProgramId : source.programId;
}
