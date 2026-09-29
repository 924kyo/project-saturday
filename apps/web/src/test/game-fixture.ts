import type { CareerRun } from '@project-saturday/game-core';

import { prepareCareerGame, resolveCareerKeySnap, startCareerGame } from '../career/career-ui';

export function completeShippedGame(career: CareerRun): CareerRun {
  const prepared = prepareCareerGame(career);
  if (!prepared.ok) throw new Error(`Game fixture preparation failed: ${prepared.reason}`);
  const started = startCareerGame(prepared.career);
  if (!started.ok) throw new Error(`Game fixture start failed: ${started.reason}`);
  let current = started.career;
  let resolvedSnapCount = 0;
  while (current.phase.type === 'KEY_SNAP') {
    const decisionId = current.phase.pendingSnap.decisionIds[0];
    const resolved = resolveCareerKeySnap(current, decisionId);
    if (!resolved.ok) throw new Error(`Game fixture snap failed: ${resolved.reason}`);
    current = resolved.career;
    resolvedSnapCount += 1;
    if (resolvedSnapCount > 12) throw new Error('Game fixture exceeded the key-snap bound.');
  }
  if (current.phase.type !== 'POST_GAME') {
    throw new Error(`Game fixture ended in ${current.phase.type}.`);
  }
  return current;
}
