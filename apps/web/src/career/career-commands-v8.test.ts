import { describe, expect, it } from 'vitest';

import { playWrV8Path } from '../test/wr-v8-path';
import { dispatchWrUiCommandV8 } from './career-commands-v8';

describe('staged WR v8 aggregate UI command seam', () => {
  it.each(['ko-KR', 'en-US'])(
    'completes the actual two-season command path for %s',
    (locale) => {
      const { commands, phases, saves, session } = playWrV8Path({
        displayName: locale === 'ko-KR' ? '토요일 선수' : 'Saturday Player',
        seed: `wr-ui-v8:${locale}`,
        offseason: locale === 'ko-KR' ? 'stay' : 'transfer',
      });
      expect(session.career.phase.type).toBe('CAREER_COMPLETE');
      expect(session.career.gameCareerState.gamesPlayed).toBeGreaterThanOrEqual(24);
      expect(session.career.terminalReview?.seasons).toHaveLength(2);
      expect(saves).toBeGreaterThan(150);
      expect(commands.has('REVIEW_SEASON')).toBe(true);
      expect(commands.has('RETIRE')).toBe(true);
      expect(phases.has('GAME_PREVIEW')).toBe(true);
      const repeated = dispatchWrUiCommandV8(session, { type: 'RETIRE' });
      expect(repeated.ok).toBe(false);
      expect(repeated.session).toBe(session);
      const invalid = dispatchWrUiCommandV8(session, { type: 'START_GAME' });
      expect(invalid.ok).toBe(false);
      expect(invalid.session).toBe(session);
    },
    90_000,
  );
});
