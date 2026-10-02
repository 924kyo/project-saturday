/**
 * Where name suggestions continue from (M12). Kept on the device between visits so a new career
 * does not start from the same names; never part of a save and never gameplay.
 */
const KEY = 'project-saturday.name-cursor';

export function nextNameCursor(): number {
  let cursor: number | null = null;
  try {
    const stored = Number(globalThis.localStorage?.getItem(KEY));
    if (Number.isSafeInteger(stored) && stored > 0) cursor = stored;
  } catch {
    // Private mode or blocked storage: fall through to a fresh start.
  }
  if (cursor === null) {
    const draw = new Uint32Array(1);
    globalThis.crypto?.getRandomValues?.(draw);
    cursor = (draw[0] ?? 0) % 100_000;
  }
  const next = cursor + 1;
  try {
    globalThis.localStorage?.setItem(KEY, String(next));
  } catch {
    // The suggestion still works; it just restarts next visit.
  }
  return next;
}
