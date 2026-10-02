import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { OfferPips } from './OfferDetails';

const PREVIEW = {
  rank: 2,
  roleId: 'depth_role_rotation',
  opportunity: {} as never,
  playersAhead: 1,
  starterClassYear: 4,
} as const;

describe('offer pips (REC-06)', () => {
  it('name the strength and playing-time values for assistive tech', async () => {
    const i18n = await createAppI18n('en-US');
    render(
      <I18nextProvider i18n={i18n}>
        <OfferPips
          offer={{
            programRating: 78,
            preview: PREVIEW,
          }}
        />
      </I18nextProvider>,
    );
    // (78 − 50) / 7 → 4 of 5; rank 2 → 6 − ceil(2 / 1.6) = 4 of 5.
    expect(screen.getByRole('img', { name: 'Team strength 4 of 5' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Playing time 4 of 5' })).toBeInTheDocument();
  });
});
