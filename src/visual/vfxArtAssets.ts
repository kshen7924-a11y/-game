/**
 * VFX & Per-Route Ambient Detail Art Replacement Module
 *
 * Centralizes decoded PNG/WebP sprite loading for all weather transitions, gameplay particles,
 * and per-route ambient motion details (birds, autumn leaves, waterfall mist, cliff grass,
 * aurora ribbons, spindrift, banner-cloud plumes, stardust, dawn motes, etc.).
 *
 * Art teams only need to drop transparent PNGs into AssetRegistry.patchManifest({ vfx: { ... } })
 * or routeOverrides[routeId].vfx — all animations, anchor positions, wind physics & weather fades
 * automatically use the supplied texture, and gracefully fall back to procedural placeholders
 * whenever a slot is not yet populated.
 */

import type { VfxSpriteKey } from '../App';
import type { RouteId } from '../game/types';
import { AssetRegistry } from './AssetRegistry';

export interface VfxSpriteSpec {
  /** Logical base draw width in world or screen px */
  width: number;
  /** Logical base draw height in world or screen px */
  height: number;
  /** Normalized horizontal pivot (0..1) */
  anchorX: number;
  /** Normalized vertical pivot (0..1) */
  anchorY: number;
  /** Recommended export resolution for art production spec */
  recommendedPx: string;
  /** Optional canvas blend mode hint */
  composite?: GlobalCompositeOperation;
}

export const DEFAULT_VFX_SPRITE_SPECS: Record<VfxSpriteKey, VfxSpriteSpec> = {
  // Core gameplay & weather VFX (existing + upgraded transition slots)
  chalkPuff: { width: 30, height: 30, anchorX: 0.5, anchorY: 0.5, recommendedPx: '256×256' },
  sparkPiton: { width: 22, height: 22, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128', composite: 'lighter' },
  rockDebris: { width: 20, height: 20, anchorX: 0.5, anchorY: 0.5, recommendedPx: '256×256' },
  iceShard: { width: 28, height: 48, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×256' },
  snowFlake: { width: 16, height: 16, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128' },
  rainStreak: { width: 10, height: 44, anchorX: 0.5, anchorY: 0.5, recommendedPx: '64×256' },
  mistVeil: { width: 420, height: 210, anchorX: 0.5, anchorY: 0.5, recommendedPx: '1024×512' },
  windStreak: { width: 140, height: 34, anchorX: 0.5, anchorY: 0.5, recommendedPx: '512×128' },
  dynoRing: { width: 64, height: 64, anchorX: 0.5, anchorY: 0.5, recommendedPx: '256×256' },
  sunShaft: { width: 280, height: 640, anchorX: 0.5, anchorY: 0.0, recommendedPx: '512×1024', composite: 'screen' },
  rainSplash: { width: 22, height: 14, anchorX: 0.5, anchorY: 0.72, recommendedPx: '128×128' },
  weatherFrontCloud: { width: 720, height: 360, anchorX: 0.5, anchorY: 0.5, recommendedPx: '1024×512' },

  // Per-route ambient motion detail slots (drop-in swappable per global or routeOverrides[routeId].vfx)
  ambientBird: { width: 44, height: 22, anchorX: 0.5, anchorY: 0.5, recommendedPx: '256×128' },
  ambientAutumnLeaf: { width: 20, height: 20, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128' },
  ambientWaterfallMist: { width: 220, height: 320, anchorX: 0.5, anchorY: 0.5, recommendedPx: '512×768' },
  ambientCliffGrass: { width: 46, height: 36, anchorX: 0.15, anchorY: 0.86, recommendedPx: '256×192' },
  ambientWaterDrip: { width: 10, height: 26, anchorX: 0.5, anchorY: 0.2, recommendedPx: '64×128' },
  ambientCloudWisp: { width: 320, height: 120, anchorX: 0.5, anchorY: 0.5, recommendedPx: '768×256' },
  ambientStardust: { width: 18, height: 18, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128', composite: 'screen' },
  ambientSandDust: { width: 36, height: 18, anchorX: 0.5, anchorY: 0.5, recommendedPx: '256×128' },
  ambientAuroraRibbon: { width: 520, height: 180, anchorX: 0.5, anchorY: 0.5, recommendedPx: '1024×384', composite: 'screen' },
  ambientIceCrystal: { width: 20, height: 20, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128', composite: 'screen' },
  ambientSpindrift: { width: 180, height: 64, anchorX: 0.25, anchorY: 0.5, recommendedPx: '512×192' },
  ambientBannerPlume: { width: 360, height: 130, anchorX: 0.08, anchorY: 0.56, recommendedPx: '1024×384' },
  ambientDawnMote: { width: 20, height: 20, anchorX: 0.5, anchorY: 0.5, recommendedPx: '128×128', composite: 'screen' },
};

export interface DecodedVfxPack {
  routeId?: RouteId;
  imgs: Partial<Record<VfxSpriteKey, HTMLImageElement | null>>;
  readyCount: number;
  totalConfigured: number;
}

const vfxCache = new Map<string, DecodedVfxPack>();
const vfxLoading = new Set<string>();

AssetRegistry.subscribe((scope) => {
  if (scope === 'all' || scope === 'vfx' || scope === 'walls') {
    vfxCache.clear();
    vfxLoading.clear();
  }
});

function loadVfxImage(url: string, onReady: (img: HTMLImageElement) => void): void {
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

export function getDecodedVfxPack(routeId?: RouteId): DecodedVfxPack {
  const cacheKey = routeId ?? '__global__';
  let pack = vfxCache.get(cacheKey);
  if (!pack) {
    pack = {
      routeId,
      imgs: {},
      readyCount: 0,
      totalConfigured: 0,
    };
    vfxCache.set(cacheKey, pack);
  }

  if (!vfxLoading.has(cacheKey)) {
    vfxLoading.add(cacheKey);
    const mergedMap = AssetRegistry.getVfxAssetMap(routeId);
    const target = pack;
    (Object.entries(mergedMap) as [VfxSpriteKey, string | undefined][]).forEach(([key, url]) => {
      if (!url) return;
      target.totalConfigured += 1;
      target.imgs[key] = null;
      loadVfxImage(url, (img) => {
        target.imgs[key] = img;
        target.readyCount += 1;
      });
    });
  }

  return pack;
}

/**
 * Draws a registered VFX / ambient detail PNG sprite if available.
 * Returns true when drawn so callers skip the procedural placeholder fallback.
 */
export function drawVfxSprite(
  ctx: CanvasRenderingContext2D,
  pack: DecodedVfxPack,
  key: VfxSpriteKey,
  x: number,
  y: number,
  width: number,
  height: number,
  rotationRad = 0,
  alpha = 1,
  scaleX = 1,
  scaleY = 1
): boolean {
  const img = pack.imgs[key];
  if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0 || alpha <= 0.004) {
    return false;
  }
  const spec = DEFAULT_VFX_SPRITE_SPECS[key];
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (spec.composite) {
    ctx.globalCompositeOperation = spec.composite;
  }
  ctx.translate(x, y);
  if (rotationRad !== 0) {
    ctx.rotate(rotationRad);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }
  ctx.drawImage(
    img,
    -width * spec.anchorX,
    -height * spec.anchorY,
    width,
    height
  );
  ctx.restore();
  return true;
}
