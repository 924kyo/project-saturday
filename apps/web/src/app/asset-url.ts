/** A public asset under the app's base path (`/` locally, `/<repo>/` on GitHub Pages). */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
