import { describe, expect, it } from 'vitest';

import { localeMessages } from '../locales/index.js';

const en = localeMessages['en-US'] as Readonly<Record<string, string>>;
const ko = localeMessages['ko-KR'] as Readonly<Record<string, string>>;

describe('M12 copy audit: scenes, tells and viewpoint agree (playtest report P3)', () => {
  it('names the drop-coverage look by the rushers the board shows', () => {
    // The look's board rushes the four linemen; "drop eight" would need only three.
    expect(en['v2.look.rbDropEight.name']).toBe('Drop seven');
    expect(en['v2.look.rbDropEight.tell2']).toBe('Only four rush.');
    expect(ko['v2.look.rbDropEight.name']).toBe('드롭 세븐');
  });

  it('places the closing-pursuit distance mid-run, not at the snap', () => {
    expect(en['v2.look.qbClosing.tell2']).toMatch(/^Mid-run/);
    expect(ko['v2.look.qbClosing.tell2']).toMatch(/^달리는 도중/);
  });

  it('keeps the WR release prompt neutral about where the corner lines up', () => {
    expect(en['v2.lookFamily.wrRelease.prompt']).not.toMatch(/waiting at the line/);
    expect(ko['v2.lookFamily.wrRelease.prompt']).not.toMatch(/라인에서 기다린다/);
  });

  it('never frames a weekly injury or a sideline read from the offense', () => {
    for (const [keyName, text] of Object.entries(en)) {
      if (keyName.startsWith('injuries.outcomes.') || keyName.startsWith('v2.gd.sideline'))
        expect(text, keyName).not.toMatch(/offensive opportunit|Reading the defense/i);
    }
  });
});
