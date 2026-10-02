import { useEffect, useState } from 'react';
import { appearanceCatalogVNext } from '@project-saturday/game-content/content';

import { assetUrl } from '../app/asset-url';

/**
 * Per-face placement for the painted bust (Round 3 v3, `art/portrait/portrait-overlays.json`).
 * The owner's file is authoritative: values are read as supplied and never inferred. Hair takes
 * the face's `hair` matrix, mustache its `mustache` matrix, and the other facial hair `facialHair`.
 */
export const PORTRAIT_CANVAS = { width: 512, height: 640 } as const;

/**
 * The art release the portrait layers and their placement belong to. Bump it whenever same-path
 * portrait art or the placement file is replaced, so no browser cache mixes two releases.
 */
export const PORTRAIT_ART_RELEASE = 'r3v3';

/** Canvas/CSS order [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type OverlayMatrix = readonly [number, number, number, number, number, number];

export interface FaceOverlays {
  readonly hair: OverlayMatrix;
  readonly facialHair: OverlayMatrix;
  readonly mustache: OverlayMatrix;
}

/** Keyed by the face's file stem (`oval`, `identity_07`). */
export type PortraitOverlays = Readonly<Record<string, FaceOverlays>>;

export type PortraitOverlaysResult =
  | { readonly ok: true; readonly faces: PortraitOverlays }
  | { readonly ok: false; readonly issues: readonly string[] };

const MATRICES = ['hair', 'facialHair', 'mustache'] as const;

/** Every selectable face needs an entry. */
export const PORTRAIT_FACE_KEYS: readonly string[] = appearanceCatalogVNext.faceId.options.map(
  ({ id }) => id.slice('face_'.length),
);

const sameList = (value: unknown, expected: readonly unknown[]) =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((entry, index) => entry === expected[index]);

function matrixOf(value: unknown): OverlayMatrix | null {
  return Array.isArray(value) &&
    value.length === 6 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? (value as unknown as OverlayMatrix)
    : null;
}

/** Validates the supplied file: the v3 frame, and three six-number matrices for every face. */
export function parsePortraitOverlays(
  value: unknown,
  faceKeys: readonly string[] = PORTRAIT_FACE_KEYS,
): PortraitOverlaysResult {
  const issues: string[] = [];
  if (typeof value !== 'object' || value === null) return { ok: false, issues: ['not_object'] };
  const file = value as Readonly<Record<string, unknown>>;
  if (file['schemaVersion'] !== 3) issues.push('schema_version');
  if (!sameList(file['canvas'], [PORTRAIT_CANVAS.width, PORTRAIT_CANVAS.height]))
    issues.push('canvas');
  if (!sameList(file['matrixOrder'], ['a', 'b', 'c', 'd', 'e', 'f'])) issues.push('matrix_order');
  if (!sameList(file['transformOrigin'], [0, 0])) issues.push('transform_origin');
  const faces = file['faces'];
  if (typeof faces !== 'object' || faces === null)
    return { ok: false, issues: [...issues, 'faces'] };
  const parsed: Record<string, FaceOverlays> = {};
  for (const face of faceKeys) {
    const entry = (faces as Readonly<Record<string, unknown>>)[face];
    if (typeof entry !== 'object' || entry === null) {
      issues.push(`face_missing:${face}`);
      continue;
    }
    const matrices: Partial<Record<(typeof MATRICES)[number], OverlayMatrix>> = {};
    for (const name of MATRICES) {
      const matrix = matrixOf((entry as Readonly<Record<string, unknown>>)[name]);
      if (matrix === null) issues.push(`matrix_invalid:${face}.${name}`);
      else matrices[name] = matrix;
    }
    if (matrices.hair && matrices.facialHair && matrices.mustache)
      parsed[face] = matrices as FaceOverlays;
  }
  return issues.length === 0 ? { ok: true, faces: parsed } : { ok: false, issues };
}

/**
 * The CSS transform for one overlay layer that fills the bust box (origin 0 0). The linear part is
 * the matrix itself; the translation is given as a share of the 512 × 640 canvas, so the common
 * display scale G applies after the local placement M (G × M) at every size, exactly once.
 */
export function overlayTransform([a, b, c, d, e, f]: OverlayMatrix): string {
  const x = (e / PORTRAIT_CANVAS.width) * 100;
  const y = (f / PORTRAIT_CANVAS.height) * 100;
  return `translate(${x}%, ${y}%) matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
}

/** A public portrait file of the current art release. */
export function portraitArtUrl(path: string): string {
  return `${assetUrl(`art/portrait/${path}`)}?v=${PORTRAIT_ART_RELEASE}`;
}

let pending: Promise<PortraitOverlaysResult> | null = null;

/** Loads the placement file once per art release (callers share the result). */
export function loadPortraitOverlays(
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> = (url) =>
    fetch(url),
): Promise<PortraitOverlaysResult> {
  pending ??= fetcher(portraitArtUrl('portrait-overlays.json'))
    .then(async (response) =>
      response.ok
        ? parsePortraitOverlays(await response.json())
        : ({ ok: false, issues: ['unavailable'] } as const),
    )
    .catch(() => ({ ok: false, issues: ['unavailable'] }) as const);
  return pending;
}

/** Test seam: forget the loaded file. */
export function resetPortraitOverlays(): void {
  pending = null;
}

/** The validated placement, or null while it loads or when it is missing or invalid. */
export function usePortraitOverlays(): PortraitOverlays | null {
  const [faces, setFaces] = useState<PortraitOverlays | null>(null);
  useEffect(() => {
    let live = true;
    void loadPortraitOverlays().then((result) => {
      if (live && result.ok) setFaces(result.faces);
    });
    return () => {
      live = false;
    };
  }, []);
  return faces;
}
