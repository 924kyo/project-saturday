export const JAVASCRIPT_CHUNK_LIMIT_BYTES = 500_000;

/** Guard actual emitted files, not compressed estimates or advisory bundler output. */
export function verifyJavaScriptBudgets(assets, html, serviceWorker) {
  const scripts = assets.filter(({ name }) => name.endsWith('.js'));
  if (scripts.length === 0) throw new Error('No emitted JavaScript assets.');
  for (const { name, bytes } of scripts) {
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > JAVASCRIPT_CHUNK_LIMIT_BYTES)
      throw new Error(
        `JavaScript chunk exceeds the 500 kB budget or has invalid size: ${name} (${bytes}).`,
      );
    if (serviceWorker.split(name).length - 1 !== 1)
      throw new Error(`JavaScript chunk must be precached exactly once: ${name}.`);
  }
  for (const prefix of ['CareerScreen-', 'PositionAlphaCareerV2-']) {
    const screen = scripts.find(({ name }) => name.startsWith(prefix));
    if (screen === undefined) throw new Error(`Missing lazy career screen: ${prefix}.`);
    if (html.includes(screen.name))
      throw new Error(`Career screen is eagerly loaded by creation HTML: ${screen.name}.`);
  }
}
