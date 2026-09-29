import { mkdirSync, writeFileSync } from 'node:fs';

import {
  formatM1DevelopmentSimulationReport,
  runM1DevelopmentSimulationReport,
} from './simulations/m1-development.js';
import { formatM2SkillBuildReport, runM2SkillBuildReport } from './simulations/m2-skill-build.js';
import { formatM3DepthReport, runM3DepthReport } from './simulations/m3-depth.js';
import {
  formatM3_5SkillEcologyReport,
  runM3_5SkillEcologyReport,
} from './simulations/m3-5-skill-ecology.js';
import { formatM4GameReport, runM4GameReport } from './simulations/m4-game.js';
import { formatM5SeasonReport, runM5SeasonReport } from './simulations/m5-season.js';
import {
  formatM6OffFieldTransferReport,
  runM6OffFieldTransferReport,
} from './simulations/m6-off-field-transfer.js';
import {
  formatM7FourPositionReport,
  runM7FourPositionReport,
} from './simulations/m7-four-position.js';

const reportsDirectory = new URL('../reports/', import.meta.url);
const m1ReportFile = new URL('m1-development-baseline.jsonl', reportsDirectory);
const m2ReportFile = new URL('m2-skill-build-baseline.jsonl', reportsDirectory);
const m3ReportFile = new URL('m3-depth-baseline.jsonl', reportsDirectory);
const m3_5ReportFile = new URL('m3-5-skill-ecology.jsonl', reportsDirectory);
const m4ReportFile = new URL('m4-game-baseline.jsonl', reportsDirectory);
const m5ReportFile = new URL('m5-season-baseline.jsonl', reportsDirectory);
const m6ReportFile = new URL('m6-off-field-transfer-baseline.jsonl', reportsDirectory);
const m7ReportFile = new URL('m7-four-position-alpha.jsonl', reportsDirectory);
const m1Report = runM1DevelopmentSimulationReport();
const m2Report = runM2SkillBuildReport();
const m3Report = runM3DepthReport();
const m3_5Report = runM3_5SkillEcologyReport();
const m4Report = runM4GameReport();
const m5Report = runM5SeasonReport();
const m6Report = runM6OffFieldTransferReport();
const m7Report = runM7FourPositionReport();

mkdirSync(reportsDirectory, { recursive: true });
writeFileSync(m1ReportFile, `${formatM1DevelopmentSimulationReport(m1Report)}\n`, 'utf8');
writeFileSync(m2ReportFile, `${formatM2SkillBuildReport(m2Report)}\n`, 'utf8');
writeFileSync(m3ReportFile, `${formatM3DepthReport(m3Report)}\n`, 'utf8');
writeFileSync(m3_5ReportFile, `${formatM3_5SkillEcologyReport(m3_5Report)}\n`, 'utf8');
writeFileSync(m4ReportFile, `${formatM4GameReport(m4Report)}\n`, 'utf8');
writeFileSync(m5ReportFile, `${formatM5SeasonReport(m5Report)}\n`, 'utf8');
writeFileSync(m6ReportFile, `${formatM6OffFieldTransferReport(m6Report)}\n`, 'utf8');
writeFileSync(m7ReportFile, `${formatM7FourPositionReport(m7Report)}\n`, 'utf8');
