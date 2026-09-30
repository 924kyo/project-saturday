import { mkdirSync, writeFileSync } from 'node:fs';

import { formatM10BalanceReport, runM10BalanceReport } from './simulations/m10-balance.js';

const reportsDirectory = new URL('../reports/', import.meta.url);
mkdirSync(reportsDirectory, { recursive: true });
writeFileSync(
  new URL('m10-balance.jsonl', reportsDirectory),
  `${formatM10BalanceReport(runM10BalanceReport())}\n`,
  'utf8',
);
