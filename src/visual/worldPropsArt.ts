/**
 * World Props Art Replacement System (Cairn-Ready)
 *
 * Pre-wires transparent PNG/WebP sprite replacement slots for all interactive & landmark
 * world props (pitons, rusty pitons, bivouac camp/flag, summit Cairn stones, summit pennant)
 * so Codex can replace them with Franco-Belgian graphic-novel / Cairn-style assets
 * without ever modifying climbing physics or gameplay logic.
 */

import { AssetRegistry } from './AssetRegistry';

export type WorldPropSlot =
  | 'pitonFresh'
  | 'pitonRusty'
  | 'climbot'
  | 'bivouacCamp'
  | 'bivouacFlag'
  | 'summitCairn'
  | 'summitFlag'
  | 'cliffFlora';

export interface WorldPropSpriteSpec {
  /** Transparent PNG/WebP URL (omit to use default procedural fallback) */
  url?: string;
  /** World-space draw width */
  width: number;
  /** World-space draw height */
  height: number;
  /** Normalized anchor X (0..1) aligned to world prop position */
  anchorX: number;
  /** Normalized anchor Y (0..1) aligned to world prop position */
  anchorY: number;
  /** Optional local fine-tune offset in world units */
  offsetX?: number;
  offsetY?: number;
  /** Optional base rotation offset in radians */
  rotationOffsetRad?: number;
}

export interface WorldPropsPackDefinition {
  id: string;
  label: string;
  props: Partial<Record<WorldPropSlot, WorldPropSpriteSpec>>;
}

export interface DecodedWorldPropsPack {
  id: string;
  definition: WorldPropsPackDefinition;
  imgs: Partial<Record<WorldPropSlot, HTMLImageElement | null>>;
  readyCount: number;
  totalConfigured: number;
}

/**
 * Canonical World Prop Dimensions & Anchors (recommended 4x Retina PNG export).
 */
export const DEFAULT_WORLD_PROP_SPECS: Record<WorldPropSlot, Omit<WorldPropSpriteSpec, 'url'>> = {
  /** Player-placed mechanical piton + carabiner ring (4x export: ~96 x 112 px) */
  pitonFresh: { width: 22, height: 26, anchorX: 0.5, anchorY: 0.36 },
  /** Weathered rusty old-route piton (4x export: ~96 x 112 px) */
  pitonRusty: { width: 22, height: 26, anchorX: 0.5, anchorY: 0.36 },
  /** Cairn-style mechanical belay/climbot unit tethered near active piton (4x export: ~192 x 224 px) */
  climbot: { width: 46, height: 54, anchorX: 0.35, anchorY: 0.32 },
  /** Compact alpine bivouac tent / camp gear resting on bivouac ledge (4x export: ~256 x 160 px) */
  bivouacCamp: { width: 64, height: 40, anchorX: 0.5, anchorY: 0.92 },
  /** Small bivouac checkpoint pennant planted on ledge (4x export: ~128 x 160 px) */
  bivouacFlag: { width: 32, height: 40, anchorX: 0.25, anchorY: 0.95 },
  /** Signature stacked summit Cairn stones (4x export: ~192 x 224 px) */
  summitCairn: { width: 48, height: 56, anchorX: 0.5, anchorY: 0.94 },
  /** Summit wind-whipped expedition pennant (4x export: ~256 x 288 px) */
  summitFlag: { width: 64, height: 72, anchorX: 0.16, anchorY: 0.96 },
  /** Stylized Franco-Belgian cel-shaded cliff plant / alpine tuft growing from rock crack (4x export: ~160 x 160 px) */
  cliffFlora: { width: 40, height: 40, anchorX: 0.5, anchorY: 0.82 },
};

export const WORLD_PROPS_MANIFEST: Record<string, WorldPropsPackDefinition> = {
  default: {
    id: 'default',
    label: '默认登山道具包（支持 Cairn 美术无缝替换）',
    props: {},
  },
};

let activeWorldPropsPackId = 'default';
const decodedCache = new Map<string, DecodedWorldPropsPack>();
const loadingStarted = new Set<string>();

AssetRegistry.subscribe((scope) => {
  if (scope === 'all' || scope === 'worldProps') {
    decodedCache.clear();
    loadingStarted.clear();
  }
});

function resolveMergedWorldPropsDefinition(packId: string): WorldPropsPackDefinition {
  const baseDef = WORLD_PROPS_MANIFEST[packId] ?? WORLD_PROPS_MANIFEST.default;
  const regMap = AssetRegistry.getWorldPropMap();
  const mergedProps: Partial<Record<WorldPropSlot, WorldPropSpriteSpec>> = {
    ...baseDef.props,
  };
  (Object.keys(DEFAULT_WORLD_PROP_SPECS) as WorldPropSlot[]).forEach((slot) => {
    const regUrl = regMap[slot];
    if (regUrl) {
      mergedProps[slot] = {
        ...DEFAULT_WORLD_PROP_SPECS[slot],
        ...(mergedProps[slot] ?? {}),
        url: regUrl,
      };
    }
  });
  return {
    ...baseDef,
    props: mergedProps,
  };
}

function loadPropImage(url: string, onReady: (img: HTMLImageElement) => void): void {
  if (typeof Image === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  let settled = false;
  const finish = () => {
    if (settled) return;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      settled = true;
      onReady(img);
    }
  };
  img.onload = () => {
    if (typeof img.decode === 'function') {
      img.decode().then(finish).catch(finish);
    } else {
      finish();
    }
  };
  img.src = url;
  if (img.complete && img.naturalWidth > 0) {
    finish();
  }
}

export function registerWorldPropsPack(
  definition: WorldPropsPackDefinition,
  activate = true
): void {
  WORLD_PROPS_MANIFEST[definition.id] = definition;
  decodedCache.delete(definition.id);
  loadingStarted.delete(definition.id);
  if (activate) {
    activeWorldPropsPackId = definition.id;
  }
}

export function overrideWorldPropSlot(
  slot: WorldPropSlot,
  spec: WorldPropSpriteSpec,
  packId = activeWorldPropsPackId
): void {
  const existing = WORLD_PROPS_MANIFEST[packId] ?? {
    id: packId,
    label: packId,
    props: {},
  };
  WORLD_PROPS_MANIFEST[packId] = {
    ...existing,
    props: {
      ...existing.props,
      [slot]: spec,
    },
  };
  decodedCache.delete(packId);
  loadingStarted.delete(packId);
  getDecodedWorldPropsPack(packId);
}

export function getDecodedWorldPropsPack(
  packId = activeWorldPropsPackId
): DecodedWorldPropsPack {
  const resolvedId = WORLD_PROPS_MANIFEST[packId] ? packId : 'default';
  let pack = decodedCache.get(resolvedId);
  if (!pack) {
    pack = {
      id: resolvedId,
      definition: resolveMergedWorldPropsDefinition(resolvedId),
      imgs: {},
      readyCount: 0,
      totalConfigured: 0,
    };
    decodedCache.set(resolvedId, pack);
  }

  if (!loadingStarted.has(resolvedId)) {
    loadingStarted.add(resolvedId);
    const target = pack;
    (Object.entries(target.definition.props) as [WorldPropSlot, WorldPropSpriteSpec | undefined][]).forEach(
      ([slot, spec]) => {
        if (!spec?.url) return;
        target.totalConfigured += 1;
        target.imgs[slot] = null;
        loadPropImage(spec.url, (img) => {
          target.imgs[slot] = img;
          target.readyCount += 1;
        });
      }
    );
  }

  return pack;
}

/**
 * Draws a configured world prop sprite anchored cleanly at (x, y).
 * Returns true if the sprite was drawn, false if no custom asset is loaded yet (caller uses fallback).
 */
export function drawWorldPropSprite(
  ctx: CanvasRenderingContext2D,
  pack: DecodedWorldPropsPack,
  slot: WorldPropSlot,
  x: number,
  y: number,
  rotationRad = 0,
  scale = 1
): boolean {
  const img = pack.imgs[slot];
  if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return false;
  }
  const spec = pack.definition.props[slot] ?? DEFAULT_WORLD_PROP_SPECS[slot];
  ctx.save();
  ctx.translate(x + (spec.offsetX ?? 0), y + (spec.offsetY ?? 0));
  ctx.rotate(rotationRad + (spec.rotationOffsetRad ?? 0));
  ctx.scale(scale, scale);
  ctx.drawImage(
    img,
    -spec.width * spec.anchorX,
    -spec.height * spec.anchorY,
    spec.width,
    spec.height
  );
  ctx.restore();
  return true;
}
