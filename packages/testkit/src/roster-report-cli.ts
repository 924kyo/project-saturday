import { mkdirSync, writeFileSync } from 'node:fs';

import {
  formatM7_5RosterIdentityReport,
  runM7_5RosterIdentityReport,
} from './simulations/m7-5-roster-identity.js';

const reportsDirectory = new URL('../reports/', import.meta.url);
const reportFile = new URL('m7-5-roster-identity.jsonl', reportsDirectory);
mkdirSync(reportsDirectory, { recursive: true });
writeFileSync(
  reportFile,
  `${formatM7_5RosterIdentityReport(runM7_5RosterIdentityReport())}\n`,
  'utf8',
);
