import { describe, expect, it } from 'vitest';

import { selectCurrentProgramId } from '../src/programs/current-program';

describe('current program selector', () => {
  it('selects active WR membership rather than requiring recruiting origin evidence', () => {
    expect(selectCurrentProgramId({ programId: 'program_northstar_state' })).toBe(
      'program_northstar_state',
    );
    expect(selectCurrentProgramId({ programId: null })).toBeNull();
  });

  it('selects the active added-position lifecycle membership', () => {
    expect(
      selectCurrentProgramId({
        lifecycle: { currentProgramId: 'program_ember_peak_polytechnic' },
      }),
    ).toBe('program_ember_peak_polytechnic');
  });
});
