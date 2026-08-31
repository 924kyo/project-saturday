import { mkdirSync, writeFileSync } from 'node:fs';

import {
  formatM1DevelopmentSimulationReport,
  runM1DevelopmentSimulationReport,
} from './simulations/m1-development.js';
import { formatM2SkillBuildReport, runM2SkillBuildReport } from './simulations/m2-skill-build.js';

const reportsDirectory = new URL('../reports/', import.meta.url);
const m1ReportFile = new URL('m1-development-baseline.jsonl', reportsDirectory);
const m2ReportFile = new URL('m2-skill-build-baseline.jsonl', reportsDirectory);
const m1Report = runM1DevelopmentSimulationReport();
const m2Report = runM2SkillBuildReport();

mkdirSync(reportsDirectory, { recursive: true });
writeFileSync(m1ReportFile, `${formatM1DevelopmentSimulationReport(m1Report)}\n`, 'utf8');
writeFileSync(m2ReportFile, `${formatM2SkillBuildReport(m2Report)}\n`, 'utf8');
