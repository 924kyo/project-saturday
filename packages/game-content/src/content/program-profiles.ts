import type {
  ProgramProfileVNext,
  SchemeDefinitionVNext,
  SchemeIdVNext,
} from '@project-saturday/game-core';

import { PROGRAM_PROFILE_ROWS } from './program-profiles.generated.js';

/**
 * M12 program profiles (Phase 4, playtest report "offers need genuine tradeoffs"): every program's
 * schemes, development, exposure, academic support and NIL market. The table is generated
 * (`scripts/generate-program-profiles.py`); the rules that read it live in game-core
 * (`vnext/programs.ts`). Presentation reads the same table for its labels only.
 */
export type ProgramProfileRowVNext = ProgramProfileVNext;

export const programProfilesVNext: readonly ProgramProfileVNext[] = PROGRAM_PROFILE_ROWS;

/** Which styles each scheme suits or wastes. Every style is ideal in exactly one scheme. */
export const schemesVNext: readonly SchemeDefinitionVNext[] = [
  {
    id: 'scheme_spread',
    side: 'offense',
    idealArchetypeIds: [
      'archetype_qb_dual_threat',
      'archetype_rb_all_purpose',
      'archetype_wr_route_technician',
    ],
    poorArchetypeIds: ['archetype_rb_power_back'],
  },
  {
    id: 'scheme_pro_style',
    side: 'offense',
    idealArchetypeIds: ['archetype_qb_field_general', 'archetype_wr_possession_receiver'],
    poorArchetypeIds: ['archetype_qb_dual_threat'],
  },
  {
    id: 'scheme_power_run',
    side: 'offense',
    idealArchetypeIds: ['archetype_rb_power_back'],
    poorArchetypeIds: ['archetype_qb_gunslinger', 'archetype_wr_deep_threat'],
  },
  {
    id: 'scheme_air_raid',
    side: 'offense',
    idealArchetypeIds: [
      'archetype_qb_gunslinger',
      'archetype_rb_elusive_back',
      'archetype_wr_deep_threat',
    ],
    poorArchetypeIds: ['archetype_rb_power_back'],
  },
  {
    id: 'scheme_press_man',
    side: 'defense',
    idealArchetypeIds: [
      'archetype_cb_press_man',
      'archetype_lb_run_stopper',
      'archetype_edge_power_rusher',
    ],
    poorArchetypeIds: ['archetype_cb_zone_technician', 'archetype_lb_coverage_backer'],
  },
  {
    id: 'scheme_zone_match',
    side: 'defense',
    idealArchetypeIds: [
      'archetype_cb_zone_technician',
      'archetype_lb_coverage_backer',
      'archetype_edge_edge_setter',
    ],
    poorArchetypeIds: ['archetype_cb_press_man', 'archetype_lb_hybrid_blitzer'],
  },
  {
    id: 'scheme_pressure',
    side: 'defense',
    idealArchetypeIds: [
      'archetype_cb_ball_hawk',
      'archetype_lb_hybrid_blitzer',
      'archetype_edge_speed_rusher',
    ],
    poorArchetypeIds: ['archetype_lb_run_stopper', 'archetype_edge_edge_setter'],
  },
];

const camel = (id: string, prefix: string) =>
  id
    .slice(prefix.length)
    .split('_')
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('');

/** Copy keys for the profile values (labels only; no rule reads them). */
export function schemeNameKeyVNext(id: SchemeIdVNext): string {
  return `v2.programProfile.scheme.${camel(id, 'scheme_')}`;
}

const FACET_PREFIX = {
  development: 'development_',
  exposure: 'exposure_',
  academics: 'academics_',
  nilMarket: 'nil_market_',
} as const;

export function profileValueKeyVNext(facet: keyof typeof FACET_PREFIX, id: string): string {
  return `v2.programProfile.${facet}.${camel(id, FACET_PREFIX[facet])}`;
}
