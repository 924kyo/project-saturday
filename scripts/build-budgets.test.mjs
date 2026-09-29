import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyJavaScriptBudgets } from './build-budgets.mjs';

const assets = [
  { name: 'index-a.js', bytes: 100_000 },
  { name: 'App-b.js', bytes: 500_000 },
  { name: 'vendor-c.js', bytes: 50_000 },
];
const worker = assets.map(({ name }) => name).join(',');
describe('production JavaScript budgets', () => {
  it('accepts bounded lazy chunks precached exactly once', () => {
    verifyJavaScriptBudgets(assets, '<script src="index-a.js"></script>', worker);
  });
  it('rejects absent, oversized and invalid-size chunks', () => {
    assert.throws(() => verifyJavaScriptBudgets([], '', worker), /No emitted/);
    for (const bytes of [500_001, 0, -1, NaN])
      assert.throws(
        () => verifyJavaScriptBudgets([{ ...assets[0], bytes }, ...assets.slice(1)], '', worker),
        /budget|invalid size/,
      );
  });
  it('rejects missing or duplicate offline resources', () => {
    assert.throws(() => verifyJavaScriptBudgets(assets, '', ''), /precached/);
    assert.throws(() => verifyJavaScriptBudgets(assets, '', worker + worker), /precached/);
  });
  it('rejects missing or creation-preloaded career screens', () => {
    assert.throws(
      () =>
        verifyJavaScriptBudgets(
          assets.filter(({ name }) => !name.startsWith('App-')),
          '',
          worker,
        ),
      /Missing lazy/,
    );
    for (const screen of assets.slice(1, 2))
      assert.throws(
        () =>
          verifyJavaScriptBudgets(
            assets,
            `<link rel="modulepreload" href="${screen.name}">`,
            worker,
          ),
        /eagerly loaded/,
      );
  });
});
