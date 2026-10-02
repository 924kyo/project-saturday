import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAppearance } from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content';
import { appearanceCatalogVNext } from '@project-saturday/game-content/content';

import { AthletePortrait } from './AthletePortrait';
import {
  loadPortraitOverlays,
  overlayTransform,
  parsePortraitOverlays,
  PORTRAIT_FACE_KEYS,
  resetPortraitOverlays,
  type OverlayMatrix,
} from './portrait-overlays';

const supplied = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../public/art/portrait/portrait-overlays.json'), 'utf8'),
) as {
  faces: Record<string, Record<'hair' | 'facialHair' | 'mustache', OverlayMatrix>>;
};
const clone = () => JSON.parse(JSON.stringify(supplied)) as typeof supplied;

describe('portrait placement file (Round 3 v3)', () => {
  it('validates the supplied file for all 16 faces and keeps its values as supplied', () => {
    expect(PORTRAIT_FACE_KEYS).toHaveLength(16);
    const result = parsePortraitOverlays(supplied);
    if (!result.ok) throw new Error(result.issues.join());
    for (const face of PORTRAIT_FACE_KEYS)
      expect(result.faces[face], face).toEqual(supplied.faces[face]);
  });

  it('rejects a missing face, a malformed matrix and a different frame', () => {
    const missing = clone();
    delete missing.faces['identity_07'];
    expect(parsePortraitOverlays(missing)).toEqual({
      ok: false,
      issues: ['face_missing:identity_07'],
    });
    const short = clone();
    short.faces['round']!.hair = [1, 0, 0, 1, 0] as never;
    const notFinite = clone();
    notFinite.faces['oval']!.mustache = [1, 0, 0, 1, Number.NaN, 0];
    const text = clone();
    text.faces['square']!.facialHair = ['1', 0, 0, 1, 0, 0] as never;
    expect(parsePortraitOverlays(short)).toMatchObject({ issues: ['matrix_invalid:round.hair'] });
    expect(parsePortraitOverlays(notFinite)).toMatchObject({
      issues: ['matrix_invalid:oval.mustache'],
    });
    expect(parsePortraitOverlays(text)).toMatchObject({
      issues: ['matrix_invalid:square.facialHair'],
    });
    expect(parsePortraitOverlays({ ...clone(), schemaVersion: 2 })).toMatchObject({
      issues: ['schema_version'],
    });
    expect(
      parsePortraitOverlays({ ...clone(), matrixOrder: ['a', 'c', 'b', 'd', 'e', 'f'] }),
    ).toMatchObject({ issues: ['matrix_order'] });
    expect(parsePortraitOverlays({ ...clone(), transformOrigin: [256, 320] })).toMatchObject({
      issues: ['transform_origin'],
    });
    expect(parsePortraitOverlays(null)).toMatchObject({ ok: false });
  });

  it('reports a missing or unreadable file instead of inventing placement', async () => {
    resetPortraitOverlays();
    expect(await loadPortraitOverlays(async () => ({ ok: false, json: async () => ({}) }))).toEqual(
      { ok: false, issues: ['unavailable'] },
    );
    resetPortraitOverlays();
    expect(
      await loadPortraitOverlays(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError('bad json');
        },
      })),
    ).toEqual({ ok: false, issues: ['unavailable'] });
    resetPortraitOverlays();
    expect(await loadPortraitOverlays(() => Promise.reject(new Error('offline')))).toEqual({
      ok: false,
      issues: ['unavailable'],
    });
    resetPortraitOverlays();
  });

  it('places a canvas point at G × M for any display size, with origin 0 0', () => {
    const matrix = supplied.faces['identity_01']!.hair;
    const [a, b, c, d, e, f] = matrix;
    const css = overlayTransform(matrix);
    const parts = /translate\((.+)%, (.+)%\) matrix\((.+), (.+), (.+), (.+), 0, 0\)/.exec(css);
    if (parts === null) throw new Error(css);
    const [tx, ty, la, lb, lc, ld] = parts.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (const scale of [0.5, 0.75, 1.25]) {
      const width = 512 * scale;
      const height = 640 * scale;
      for (const [x, y] of [
        [0, 0],
        [256, 320],
        [512, 640],
        [97, 411],
      ] as const) {
        // The layer box is the canvas at this size; the point sits at scale × (x, y) in it.
        const px = x * scale;
        const py = y * scale;
        const screenX = (tx / 100) * width + la * px + lc * py;
        const screenY = (ty / 100) * height + lb * px + ld * py;
        expect(screenX).toBeCloseTo(scale * (a * x + c * y + e), 6);
        expect(screenY).toBeCloseTo(scale * (b * x + d * y + f), 6);
      }
    }
  });
});

const ROUND_BEARD = { faceId: 'face_round', facialHairId: 'facial_hair_beard' } as const;
const FACE_12 = { faceId: 'face_identity_12' } as const;

describe('painted bust composition', () => {
  const pending: HTMLImageElement[] = [];
  class ControlledImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    constructor() {
      pending.push(this as unknown as HTMLImageElement);
    }
  }
  const loadAll = () =>
    act(() => {
      for (const image of pending.splice(0)) image.onload?.(new Event('load'));
    });

  beforeEach(() => {
    resetPortraitOverlays();
    vi.stubGlobal('Image', ControlledImage);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => supplied })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    pending.length = 0;
    resetPortraitOverlays();
  });

  const appearance = (patch: Partial<PlayerAppearance>): PlayerAppearance => ({
    ...defaultWrAppearance,
    armSleevesId: null,
    eyeBlackId: 'eye_black_stripes',
    towelId: null,
    ...patch,
  });
  const layers = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('.athlete-portrait__layer')].map((element) => ({
      src: element.getAttribute('data-layer-src') ?? element.style.maskImage,
      transform: element.style.transform,
    }));

  it('stacks the v3 order, applies each face matrix once, and switches faces atomically', async () => {
    const first = appearance({
      faceId: 'face_identity_01',
      hairStyleId: 'hair_style_two_block',
      hairColorId: 'hair_color_platinum',
      facialHairId: 'facial_hair_mustache',
    });
    const { container, rerender } = render(<AthletePortrait appearance={first} label="A" />);
    // The drawn figure stands in until the placement and every layer have loaded.
    expect(container.querySelector('.athlete-portrait--painted')).toBeNull();
    await act(async () => {});
    await loadAll();
    const one = supplied.faces['identity_01']!;
    expect(layers(container)).toEqual([
      { src: expect.stringContaining('skin/balanced-'), transform: '' },
      { src: expect.stringContaining('jersey/balanced.webp'), transform: '' },
      { src: expect.stringContaining('jersey/balanced-trim.webp'), transform: '' },
      { src: expect.stringContaining('head/identity_01-'), transform: '' },
      {
        src: expect.stringContaining('facial-hair/mustache-platinum.webp'),
        transform: overlayTransform(one.mustache),
      },
      {
        src: expect.stringContaining('hair/two_block-platinum.webp'),
        transform: overlayTransform(one.hair),
      },
      { src: expect.stringContaining('eye-black/stripes.webp'), transform: '' },
    ]);

    // A face switch keeps the last complete bust until the new one has fully loaded.
    rerender(<AthletePortrait appearance={{ ...first, ...ROUND_BEARD }} label="A" />);
    expect(layers(container)[3]!.src).toContain('head/identity_01-');
    expect(layers(container)[5]!.transform).toBe(overlayTransform(one.hair));
    await loadAll();
    const round = supplied.faces['round']!;
    const after = layers(container);
    expect(after[3]!.src).toContain('head/round-');
    expect(after[4]).toEqual({
      src: expect.stringContaining('facial-hair/beard-platinum.webp'),
      transform: overlayTransform(round.facialHair),
    });
    expect(after[5]!.transform).toBe(overlayTransform(round.hair));
    expect(after.filter(({ transform }) => transform !== '')).toHaveLength(2);
  });

  it('never shows a partial bust when a layer fails, and stays drawn without placement', async () => {
    const { container } = render(<AthletePortrait appearance={appearance(FACE_12)} label="B" />);
    await act(async () => {});
    act(() => {
      pending[0]!.onerror?.(new Event('error'));
      for (const image of pending.splice(1)) image.onload?.(new Event('load'));
    });
    expect(container.querySelector('.athlete-portrait--painted')).toBeNull();

    resetPortraitOverlays();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    const missing = render(<AthletePortrait appearance={appearance({})} label="C" />);
    await act(async () => {});
    await loadAll();
    expect(missing.container.querySelector('.athlete-portrait--painted')).toBeNull();
  });

  it('resolves a painted file for every face, hairstyle, color, facial hair, tone and build', () => {
    const art = path.resolve(__dirname, '../../public/art/portrait');
    const stems = (options: readonly { readonly id: string | null }[], prefix: string) =>
      options.flatMap(({ id }) => (id === null ? [] : [id.slice(prefix.length)]));
    const catalog = appearanceCatalogVNext;
    const tones = stems(catalog.skinToneId.options, 'skin_tone_');
    const colors = stems(catalog.hairColorId.options, 'hair_color_');
    const builds = stems(catalog.bodyTypeId.options, 'body_type_');
    expect([tones.length, colors.length, builds.length]).toEqual([6, 8, 3]);
    const expected = [
      ...stems(catalog.faceId.options, 'face_').flatMap((face) =>
        tones.map((tone) => `head/${face}-${tone}.webp`),
      ),
      ...stems(catalog.hairStyleId.options, 'hair_style_').flatMap((style) =>
        colors.map((color) => `hair/${style}-${color}.webp`),
      ),
      ...stems(catalog.facialHairId.options, 'facial_hair_').flatMap((style) =>
        colors.map((color) => `facial-hair/${style}-${color}.webp`),
      ),
      ...builds.flatMap((build) => [
        ...tones.map((tone) => `skin/${build}-${tone}.webp`),
        `jersey/${build}.webp`,
        `jersey/${build}-trim.webp`,
      ]),
      'eye-black/stripes.webp',
      'eye-black/wide.webp',
    ];
    // 96 heads, 112 hair, 32 facial hair, 18 skin, 6 jersey and 2 eye black.
    expect(expected).toHaveLength(266);
    expect(expected.filter((file) => !existsSync(path.join(art, file)))).toEqual([]);
  });
});
