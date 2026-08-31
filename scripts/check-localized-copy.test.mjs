import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeLocalizedCopy } from './check-localized-copy.mjs';

describe('localized-copy AST guard', () => {
  it('rejects natural-language copy assigned before a JSX child or attribute use', () => {
    const source = `
      const actionCopy = 'Continue career';
      const accessibleCopy = 'Open player settings';
      export function Screen() {
        return <button aria-label={accessibleCopy}>{actionCopy}</button>;
      }
    `;

    assert.deepEqual(
      analyzeLocalizedCopy(source, 'indirect-copy.tsx').map(({ sink, value }) => ({
        sink,
        value,
      })),
      [
        { sink: 'JSX child expression', value: 'Continue career' },
        { sink: 'JSX aria-label attribute', value: 'Open player settings' },
      ],
    );
  });

  it('rejects copy hidden in conditional, template, object-property, and DOM flows', () => {
    const source = `
      const status = ready ? 'Ready for kickoff' : t('status.waiting');
      const card = { heading: \`Week \${weekIndex} recap\` };
      const browserTitle = 'Career dashboard';
      document.title = browserTitle;
      export const Screen = () => <Card heading={card.heading}>{status}</Card>;
    `;

    assert.deepEqual(
      analyzeLocalizedCopy(source, 'expression-copy.tsx').map(({ sink, value }) => ({
        sink,
        value,
      })),
      [
        { sink: 'JSX child expression', value: 'Ready for kickoff' },
        { sink: 'JSX heading attribute', value: '`Week ${weekIndex} recap`' },
        { sink: 'DOM title assignment', value: 'Career dashboard' },
      ],
    );
  });

  it('allows localization calls and explicit technical contexts', () => {
    const source = `
      import { tool } from 'technical-package';
      const title = t('app.title');
      const className = 'button primary';
      const selector = '#application-root';
      const storageKey = 'current-career';
      document.querySelector(selector);
      storage.get('settings', storageKey);
      console.error('Developer-only diagnostic');
      export function Screen() {
        return (
          <section
            id="career-panel"
            className={className}
            data-testid="career-panel"
            role="region"
            aria-labelledby="career-heading"
          >
            <h1 id="career-heading">{title}</h1>
            <span aria-hidden="true" />
          </section>
        );
      }
    `;

    assert.deepEqual(analyzeLocalizedCopy(source, 'localized-and-technical.tsx'), []);
  });

  it('scans TS browser sinks as well as TSX components', () => {
    const source = `
      const label = 'Retry autosave';
      element.setAttribute('aria-label', label);
      alert(t('save.failed'));
    `;

    assert.deepEqual(
      analyzeLocalizedCopy(source, 'browser-sink.ts').map(({ sink, value }) => ({ sink, value })),
      [{ sink: 'DOM aria-label attribute', value: 'Retry autosave' }],
    );
  });
});
