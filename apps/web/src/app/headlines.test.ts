import { describe, expect, it } from 'vitest';

import { playHeadlineKey } from './content';

describe('play headlines lead with the decisive event (playtest report #3)', () => {
  it('names a fumble before the yards for every fumble-capable result', () => {
    expect(playHeadlineKey('position_qb', 'SACK', -5, 'TURNOVER')).toBe('v2.play.sackFumble');
    expect(playHeadlineKey('position_qb', 'SCRAMBLE', 6, 'TURNOVER')).toBe('v2.play.runFumble');
    expect(playHeadlineKey('position_rb', 'RUSH', 12, 'TURNOVER')).toBe('v2.play.runFumble');
    // The receiving fumble the regression pass could not reach in play.
    expect(playHeadlineKey('position_rb', 'RECEPTION', 9, 'TURNOVER')).toBe('v2.play.catchFumble');
    expect(playHeadlineKey('position_cb', 'FORCED_FUMBLE', 2, 'TURNOVER')).toBe(
      'v2.play.cb.forcedFumble',
    );
  });

  it('keeps the yardage headline when the ball was secured', () => {
    expect(playHeadlineKey('position_rb', 'RECEPTION', 9, 'GAIN')).not.toBe('v2.play.catchFumble');
  });
});
