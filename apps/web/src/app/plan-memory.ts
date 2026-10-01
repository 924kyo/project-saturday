/**
 * The last locked-in weekly plan, per career, on this device (a convenience, not game state):
 * "Last week's plan" refills it. Storage can be unavailable, so every access is guarded.
 */
const keyFor = (careerId: string) => `project-saturday.lastPlan.${careerId}`;

export function readLastPlan(careerId: string): readonly string[] | null {
  try {
    const stored = globalThis.localStorage?.getItem(keyFor(careerId));
    if (stored === null || stored === undefined) return null;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((id) => typeof id === 'string')
      ? (parsed as string[])
      : null;
  } catch {
    return null;
  }
}

export function rememberPlan(careerId: string, plan: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(keyFor(careerId), JSON.stringify(plan));
  } catch {
    // A private window or blocked storage only loses the shortcut.
  }
}
