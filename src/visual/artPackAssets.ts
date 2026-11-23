import { RouteConfig, RouteId } from '../game/types';
import { AssetRegistry } from './AssetRegistry';
import {
  buildRouteThemedHoldCanvas,
  buildRouteThemedWallTile,
  getRouteArtTheme,
  RouteArtTheme,
} from './routeArtThemes';

export type ArtPackId =
  | 'snow-ridge-granite'
  | 'frost-crown-ice'
  | 'ridge-alpine'
  | 'slate-cliff';

/**
 * Optional Cairn-style graphic-novel atmospheric color grading & tactile grain settings.
 * Omit to keep raw painted plate colors; configure per ArtPack when adopting Cairn art direction.
 */
export interface VisualAtmosphereGrade {
  /** Subtle multiply/tint wash over rock wall (e.g. 'rgba(34, 58, 74, 0.08)') */
  shadowWashColor?: string;
  /** Subtle top-left sunlit highlight warmth (e.g. 'rgba(235, 244, 238, 0.08)') */
  sunRimWashColor?: string;
  /** Crisp cel-shaded cast shadow tint projected by climber & rope onto cliff (Cairn default: 'rgba(28, 56, 70, 0.44)') */
  castShadowColor?: string;
  /** Cast shadow X offset in world px (positive = down-right from upper-left sun) */
  castShadowOffsetX?: number;
  /** Cast shadow Y offset in world px */
  castShadowOffsetY?: number;
  /** Screen-space vignette intensity multiplier (default 1.0) */
  vignetteStrength?: number;
  /** Optional seamless paper/ink-grain overlay opacity over climbing wall (0..0.35) */
  wallGrainOpacity?: number;
  /** When true, tones down gamey neon rings in favor of Cairn graphic-novel ink/chalk diegetic cues */
  diegeticMinimalCues?: boolean;
}

/**
 * Optional transparent PNG overlays drawn on top of base hold sprites for tactile state feedback
 * (Cairn-style chalk smudges, rain sheen, and progressive fragile rock fractures).
 */
export interface HoldOverlayUrls {
  chalk?: string;
  wet?: string;
  crack1?: string;
  crack2?: string;
  crack3?: string;
}

/**
 * Optional dedicated transparent PNG silhouettes for special gameplay holds.
 * When omitted, the hold cleanly uses one of the 10 calibrated base holds + minimal cue icon.
 */
export interface SpecialHoldUrls {
  spring?: string;
  swing?: string;
  tremor?: string;
  decoy?: string;
}

export interface ArtPackMetrics {
  /** Normalized Y (0..1) of the walkable starting ledge surface in 01-start plate */
  startShelfSurfaceRatioY: number;
  /** Normalized X (0..1) of the climber standing spot on the crest in 03-summit-near */
  summitStandingRatioX: number;
  /** Normalized Y (0..1) of the standing ridge surface in 03-summit-near */
  summitStandingRatioY: number;
  /** Shared landmark focal point (0..1) in 04-wide-ending used for dissolve zoom alignment */
  wideFocalX: number;
  wideFocalY: number;
  /** Initial zoom multiplier on 04-wide-ending at dissolve start to match near-summit scale */
  wideDissolveStartScale: number;
  /** Sky top color above 03-summit-near to seamlessly extend sky on tall viewports */
  summitSkyTopColor: string;
  /** Fallback rock fill color while textures decode */
  fallbackWallColor: string;
  /** Subtle ambient rock plinth shadow color below starting ledge */
  plinthShadowColor: string;
}

export interface ArtPackUrls {
  id: ArtPackId;
  label: string;
  start: string;
  wall: string;
  /** Optional seamless graphic-novel ink-hatching / rock-grain detail plate layered subtly over wall */
  wallDetailOverlay?: string;
  summitNear: string;
  wideEnding: string;
  holds: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  /** Optional tactile hold overlays (chalk, wet sheen, 3-stage fragile fracture cracks) */
  holdOverlays?: HoldOverlayUrls;
  /** Optional custom sprites for dynamic/special holds (spring, swing, tremor, decoy) */
  specialHolds?: SpecialHoldUrls;
  /** Optional Cairn-style atmospheric color grading & grain tuning */
  atmosphereGrade?: VisualAtmosphereGrade;
  metrics: ArtPackMetrics;
}

export interface DecodedArtPack {
  id: ArtPackId;
  routeId?: RouteId;
  routeTheme?: RouteArtTheme;
  urls: ArtPackUrls;
  startImg: HTMLImageElement | null;
  wallImg: HTMLImageElement | null;
  wallDetailOverlayImg: HTMLImageElement | null;
  summitNearImg: HTMLImageElement | null;
  wideEndingImg: HTMLImageElement | null;
  holdImgs: (HTMLImageElement | null)[];
  /** Pre-baked route-mineral tinted hold canvases aligned 1:1 with holdImgs[0..9] */
  routeHoldCanvases: (HTMLCanvasElement | null)[];
  holdOverlayImgs: Partial<Record<keyof HoldOverlayUrls, HTMLImageElement | null>>;
  specialHoldImgs: Partial<Record<keyof SpecialHoldUrls, HTMLImageElement | null>>;
  /** Cached offscreen seamless vertical-looping wall tile (built once on decode) */
  seamlessWallTile: HTMLCanvasElement | null;
  /** Cached offscreen start plate with top edge feathered into climbing wall */
  startPlateFeathered: HTMLCanvasElement | null;
  /** Cached offscreen near-summit plate with bottom rock edge feathered into climbing wall */
  summitNearFeathered: HTMLCanvasElement | null;
  readyCount: number;
  totalCount: number;
  wideReady: boolean;
}

interface ArtPackStaticMetadata {
  label: string;
  metrics: ArtPackMetrics;
}

const ART_PACK_METADATA: Record<ArtPackId, ArtPackStaticMetadata> = {
  'snow-ridge-granite': {
    label: '雪脊花岗岩',
    metrics: {
      startShelfSurfaceRatioY: 0.855,
      // Standing centered on the broad sunlit granite crest right of the V-notch (~0.31) and beneath snow cornice
      summitStandingRatioX: 0.55,
      summitStandingRatioY: 0.425,
      // V-notch (~0.47, 0.375) + right snow cornice (~0.68, 0.345) shared alignment center
      wideFocalX: 0.56,
      wideFocalY: 0.365,
      wideDissolveStartScale: 1.34,
      summitSkyTopColor: '#457FC6',
      fallbackWallColor: '#A6937E',
      plinthShadowColor: '#5A4F44',
    },
  },
  'frost-crown-ice': {
    label: '霜冠冰岩',
    metrics: {
      startShelfSurfaceRatioY: 0.855,
      // Broad U-shaped saddle between left dark granite shoulder (~0.20) and tall right icy cornice (~0.80)
      summitStandingRatioX: 0.46,
      summitStandingRatioY: 0.328,
      // Saddle (~0.53, 0.29) + right ice cornice (~0.76, 0.205) + diagonal blue ice cascade
      wideFocalX: 0.58,
      wideFocalY: 0.285,
      wideDissolveStartScale: 1.32,
      summitSkyTopColor: '#6B7F91',
      fallbackWallColor: '#76828E',
      plinthShadowColor: '#46525E',
    },
  },
  'ridge-alpine': {
    label: '高山刃脊（预留槽位）',
    metrics: {
      startShelfSurfaceRatioY: 0.855,
      summitStandingRatioX: 0.55,
      summitStandingRatioY: 0.425,
      wideFocalX: 0.56,
      wideFocalY: 0.365,
      wideDissolveStartScale: 1.34,
      summitSkyTopColor: '#457FC6',
      fallbackWallColor: '#A6937E',
      plinthShadowColor: '#5A4F44',
    },
  },
  'slate-cliff': {
    label: '青灰板岩绝壁（预留槽位）',
    metrics: {
      startShelfSurfaceRatioY: 0.855,
      summitStandingRatioX: 0.55,
      summitStandingRatioY: 0.425,
      wideFocalX: 0.56,
      wideFocalY: 0.365,
      wideDissolveStartScale: 1.34,
      summitSkyTopColor: '#457FC6',
      fallbackWallColor: '#A6937E',
      plinthShadowColor: '#5A4F44',
    },
  },
};

/**
 * Resolves the complete ArtPackUrls for a biome (optionally merged with per-route art overrides)
 * purely from AssetRegistry (zero hardcoded PNG paths).
 */
export function resolveArtPackUrls(packId: ArtPackId, routeId?: RouteId): ArtPackUrls {
  const walls = AssetRegistry.getWallBackgroundMap(packId, routeId);
  const holds = AssetRegistry.getOrderedHoldPaths(packId, routeId);
  const holdOverlays = AssetRegistry.getHoldOverlayPaths(packId, routeId);
  const specialHolds = AssetRegistry.getSpecialHoldPaths(packId, routeId);
  const atmosphereGrade = AssetRegistry.getAtmosphereGrade(packId, routeId);
  const meta = ART_PACK_METADATA[packId] ?? ART_PACK_METADATA['snow-ridge-granite'];
  const routeTheme = routeId ? getRouteArtTheme(routeId) : undefined;
  const resolvedMetrics: ArtPackMetrics = routeTheme
    ? {
        ...meta.metrics,
        wideFocalX: routeTheme.wideFocalX,
        wideFocalY: routeTheme.wideFocalY,
        wideDissolveStartScale: routeTheme.wideDissolveStartScale,
        summitSkyTopColor: routeTheme.skyTopColor,
        fallbackWallColor: routeTheme.wallFallbackColor,
        plinthShadowColor: routeTheme.wallShadowColor,
      }
    : meta.metrics;

  return {
    id: packId,
    label: meta.label,
    start: walls.startLedge,
    wall: walls.climbingWall,
    wallDetailOverlay: walls.wallDetailOverlay,
    summitNear: walls.summitNear,
    wideEnding: walls.wideEnding,
    holds,
    holdOverlays,
    specialHolds,
    atmosphereGrade,
    metrics: resolvedMetrics,
  };
}

/** Snapshot view kept synced with AssetRegistry for legacy consumers */
export const ART_PACK_MANIFEST: Record<ArtPackId, ArtPackUrls> = {
  'snow-ridge-granite': resolveArtPackUrls('snow-ridge-granite'),
  'frost-crown-ice': resolveArtPackUrls('frost-crown-ice'),
  'ridge-alpine': resolveArtPackUrls('ridge-alpine'),
  'slate-cliff': resolveArtPackUrls('slate-cliff'),
};

function syncArtPackManifestSnapshots(): void {
  (Object.keys(ART_PACK_METADATA) as ArtPackId[]).forEach((id) => {
    ART_PACK_MANIFEST[id] = resolveArtPackUrls(id);
  });
}

export function resolveArtPackId(palette: RouteConfig['palette']): ArtPackId {
  return AssetRegistry.resolveBiomePackId(palette);
}

export function getWideEndingImageUrl(palette: RouteConfig['palette'], routeId?: RouteId): string {
  return AssetRegistry.getWideEndingPath(palette, routeId);
}

/**
 * Hot-register or replace an entire terrain ArtPack via AssetRegistry.
 * Safe to invoke at boot or runtime without touching gameplay/physics code.
 */
export function registerArtPack(pack: ArtPackUrls): void {
  ART_PACK_METADATA[pack.id] = {
    label: pack.label,
    metrics: pack.metrics,
  };
  AssetRegistry.patchManifest({
    walls: {
      [pack.id]: {
        startLedge: pack.start,
        climbingWall: pack.wall,
        wallDetailOverlay: pack.wallDetailOverlay,
        summitNear: pack.summitNear,
        wideEnding: pack.wideEnding,
      },
    },
    holds: {
      [pack.id]: {
        jug: pack.holds[0],
        crimp: pack.holds[1],
        pinch: pack.holds[2],
        horn: pack.holds[3],
        sloper: pack.holds[4],
        undercling: pack.holds[5],
        ledge: pack.holds[6],
        sidepull: pack.holds[7],
        pocket: pack.holds[8],
        crack: pack.holds[9],
        overlays: pack.holdOverlays,
        special: pack.specialHolds,
      },
    },
    atmosphere: pack.atmosphereGrade ? { [pack.id]: pack.atmosphereGrade } : undefined,
  });
}

/**
 * Modular overlay override API: attach or swap a single hold state overlay (chalk/wet/crack1..3)
 * on one or all terrain art packs through AssetRegistry.
 */
export function overrideHoldOverlay(
  packId: ArtPackId | 'all',
  slot: keyof HoldOverlayUrls,
  url: string
): void {
  const targets: ArtPackId[] =
    packId === 'all' ? (Object.keys(ART_PACK_METADATA) as ArtPackId[]) : [packId];
  const holdsPatch: Partial<Record<ArtPackId, { overlays: Partial<HoldOverlayUrls> }>> = {};
  for (const id of targets) {
    holdsPatch[id] = { overlays: { [slot]: url } };
  }
  AssetRegistry.patchManifest({ holds: holdsPatch });
}

const packCache = new Map<string, DecodedArtPack>();
const loadingStarted = new Set<string>();

AssetRegistry.subscribe((scope) => {
  if (scope === 'all' || scope === 'walls' || scope === 'holds') {
    syncArtPackManifestSnapshots();
    packCache.clear();
    loadingStarted.clear();
  }
});

function createOffscreenCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Builds a one-time cached vertically seamless wall tile from the climbing wall PNG.
 * Overlaps the bottom strip smoothly onto the top via linear alpha feather so the wrap
 * seam falls between adjacent rows of the original painting (zero visible horizontal seam).
 */
function buildSeamlessWallTile(wallImg: HTMLImageElement): HTMLCanvasElement | null {
  const w = wallImg.naturalWidth;
  const h = wallImg.naturalHeight;
  if (w <= 0 || h <= 0) return null;

  const overlap = Math.max(64, Math.round(h * 0.16));
  const tileH = h - overlap;
  const tileCanvas = createOffscreenCanvas(w, tileH);
  const stripCanvas = createOffscreenCanvas(w, overlap);
  if (!tileCanvas || !stripCanvas) return null;

  const tctx = tileCanvas.getContext('2d');
  const sctx = stripCanvas.getContext('2d');
  if (!tctx || !sctx) return null;

  // Base body: rows [0 .. tileH - 1]
  tctx.drawImage(wallImg, 0, 0, w, tileH, 0, 0, w, tileH);

  // Extract bottom strip: rows [tileH .. h - 1]
  sctx.drawImage(wallImg, 0, tileH, w, overlap, 0, 0, w, overlap);
  // Mask strip with smooth top-to-bottom alpha ramp (1.0 at y=0 -> 0.0 at y=overlap)
  sctx.globalCompositeOperation = 'destination-in';
  const grad = sctx.createLinearGradient(0, 0, 0, overlap);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.48)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, w, overlap);

  // Composite feathered bottom strip onto top of tile so row(tileH - 1) seamlessly meets row(0)
  tctx.drawImage(stripCanvas, 0, 0);
  return tileCanvas;
}

/**
 * Builds a one-time cached plate with softly alpha-feathered top and/or bottom edges
 * so start/summit plates blend invisibly into the tiled climbing wall.
 *
 * IMPORTANT: Canvas 2D 'destination-in' clears every pixel outside the drawn shape, so we MUST
 * apply a SINGLE full-canvas gradient with a SINGLE fillRect(0, 0, w, h) — never two fillRects!
 */
function buildFeatheredPlate(
  img: HTMLImageElement | HTMLCanvasElement,
  topFeatherRatio: number,
  bottomFeatherRatio: number
): HTMLCanvasElement | null {
  const w = img instanceof HTMLCanvasElement ? img.width : img.naturalWidth;
  const h = img instanceof HTMLCanvasElement ? img.height : img.naturalHeight;
  if (w <= 0 || h <= 0) return null;

  const canvas = createOffscreenCanvas(w, h);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (topFeatherRatio > 0) {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(topFeatherRatio * 0.45, 'rgba(0, 0, 0, 0.52)');
    grad.addColorStop(topFeatherRatio, 'rgba(0, 0, 0, 1)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  }

  if (bottomFeatherRatio > 0) {
    grad.addColorStop(1 - bottomFeatherRatio, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(1 - bottomFeatherRatio * 0.45, 'rgba(0, 0, 0, 0.52)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

function loadAndDecodeImage(
  url: string,
  onReady: (img: HTMLImageElement) => void
): void {
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
      img
        .decode()
        .then(finish)
        .catch(finish);
    } else {
      finish();
    }
  };
  img.src = url;
  if (img.complete && img.naturalWidth > 0) {
    finish();
  }
}

export function getDecodedArtPack(packId: ArtPackId, routeId?: RouteId): DecodedArtPack {
  const activeRouteId = routeId;
  const routeTheme = activeRouteId ? getRouteArtTheme(activeRouteId) : undefined;
  const cacheKey = activeRouteId ? `${packId}::${activeRouteId}` : packId;
  let pack = packCache.get(cacheKey);
  if (!pack) {
    const urls = resolveArtPackUrls(packId, activeRouteId);
    const overlayCount = Object.values(urls.holdOverlays ?? {}).filter(Boolean).length;
    const specialCount = Object.values(urls.specialHolds ?? {}).filter(Boolean).length;
    const detailCount = urls.wallDetailOverlay ? 1 : 0;
    pack = {
      id: packId,
      routeId: activeRouteId,
      routeTheme,
      urls,
      startImg: null,
      wallImg: null,
      wallDetailOverlayImg: null,
      summitNearImg: null,
      wideEndingImg: null,
      holdImgs: new Array<HTMLImageElement | null>(10).fill(null),
      routeHoldCanvases: new Array<HTMLCanvasElement | null>(10).fill(null),
      holdOverlayImgs: {},
      specialHoldImgs: {},
      seamlessWallTile: null,
      startPlateFeathered: null,
      summitNearFeathered: null,
      readyCount: 0,
      totalCount: 14 + overlayCount + specialCount + detailCount,
      wideReady: false,
    };
    packCache.set(cacheKey, pack);
  }

  if (!loadingStarted.has(cacheKey)) {
    loadingStarted.add(cacheKey);
    const targetPack = pack;
    const urls = targetPack.urls;

    loadAndDecodeImage(urls.wall, (img) => {
      targetPack.wallImg = img;
      const baseTile = buildSeamlessWallTile(img);
      targetPack.seamlessWallTile =
        baseTile && targetPack.routeTheme
          ? buildRouteThemedWallTile(baseTile, targetPack.routeTheme)
          : baseTile;
      targetPack.readyCount += 1;
    });

    if (urls.wallDetailOverlay) {
      loadAndDecodeImage(urls.wallDetailOverlay, (img) => {
        targetPack.wallDetailOverlayImg = img;
        targetPack.readyCount += 1;
      });
    }

    loadAndDecodeImage(urls.start, (img) => {
      targetPack.startImg = img;
      // Theme opaque start plate first, THEN feather top 18% & bottom 5% so edges blend invisibly into the climbing wall
      let startSource: HTMLImageElement | HTMLCanvasElement = img;
      if (targetPack.routeTheme) {
        const opaqueStart = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
        const octx = opaqueStart?.getContext('2d');
        if (opaqueStart && octx) {
          octx.drawImage(img, 0, 0);
          startSource = buildRouteThemedWallTile(opaqueStart, targetPack.routeTheme);
        }
      }
      targetPack.startPlateFeathered = buildFeatheredPlate(startSource, 0.18, 0.05);
      targetPack.readyCount += 1;
    });

    loadAndDecodeImage(urls.summitNear, (img) => {
      targetPack.summitNearImg = img;
      // Keep top 82% (sky, distant peaks, summit crest & upper rock) 100% opaque, feather bottom 18% into 02-wall
      targetPack.summitNearFeathered = buildFeatheredPlate(img, 0, 0.18);
      targetPack.readyCount += 1;
    });

    loadAndDecodeImage(urls.wideEnding, (img) => {
      targetPack.wideEndingImg = img;
      targetPack.wideReady = true;
      targetPack.readyCount += 1;
    });

    urls.holds.forEach((holdUrl, idx) => {
      loadAndDecodeImage(holdUrl, (img) => {
        targetPack.holdImgs[idx] = img;
        targetPack.routeHoldCanvases[idx] = targetPack.routeTheme
          ? buildRouteThemedHoldCanvas(img, targetPack.routeTheme)
          : null;
        targetPack.readyCount += 1;
      });
    });

    if (urls.holdOverlays) {
      (Object.entries(urls.holdOverlays) as [keyof HoldOverlayUrls, string | undefined][]).forEach(
        ([slot, overlayUrl]) => {
          if (!overlayUrl) return;
          targetPack.holdOverlayImgs[slot] = null;
          loadAndDecodeImage(overlayUrl, (img) => {
            targetPack.holdOverlayImgs[slot] = img;
            targetPack.readyCount += 1;
          });
        }
      );
    }

    if (urls.specialHolds) {
      (Object.entries(urls.specialHolds) as [keyof SpecialHoldUrls, string | undefined][]).forEach(
        ([slot, specialUrl]) => {
          if (!specialUrl) return;
          targetPack.specialHoldImgs[slot] = null;
          loadAndDecodeImage(specialUrl, (img) => {
            targetPack.specialHoldImgs[slot] = img;
            targetPack.readyCount += 1;
          });
        }
      );
    }
  }

  return pack;
}

export function getDecodedArtPackForRoute(route: RouteConfig): DecodedArtPack {
  return getDecodedArtPack(resolveArtPackId(route.palette), route.id);
}

export function preloadArtPackForRoute(route: RouteConfig): DecodedArtPack {
  return getDecodedArtPackForRoute(route);
}

export function preloadArtPackForPalette(palette: RouteConfig['palette']): DecodedArtPack {
  return getDecodedArtPack(resolveArtPackId(palette));
}
