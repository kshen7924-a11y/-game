/**
 * AssetRegistry — Centralized Art Sprite Resource Mapping Module
 *
 * Single source of truth for all sprite resource paths in the game:
 *  1. Character limbs, torso, head, backpack gear, hand poses & joint caps (LeftHand, RightHand, etc.)
 *  2. Biome wall backgrounds & scene plates (startLedge, climbingWall, wallDetailOverlay, summitNear, wideEnding)
 *  3. Semantic rock holds (jug, crimp, pinch, horn, sloper, undercling, ledge, sidepull, pocket, crack)
 *     plus hold state overlays (chalk, wet, crack1..3) and special gameplay holds (spring, swing, tremor, decoy)
 *  4. World props (pitonFresh, pitonRusty, climbot, bivouacCamp, bivouacFlag, summitCairn, summitFlag, cliffFlora)
 *
 * All renderers read exclusively through AssetRegistry (never hardcoded paths).
 * Replacing art later requires only updating the ArtAssetManifest registered via AssetRegistry.applyManifest()
 * or AssetRegistry.patchManifest().
 */

import type {
  ArtAssetManifest,
  BadgeSpriteMap,
  CharacterGenderPreviewMap,
  CharacterLimbKey,
  CharacterLimbSpriteMap,
  CharacterShowcasePreviewMap,
  HoldOverlayKey,
  HoldSpriteKey,
  HoldSpriteMap,
  RouteArtOverride,
  SpecialHoldSpriteKey,
  UiArtAssetMap,
  UiHudIconKey,
  VfxArtAssetMap,
  VfxSpriteKey,
  WallBackgroundLayerKey,
  WallBackgroundSpriteMap,
  WorldPropSpriteKey,
  WorldPropSpriteMap,
} from '../App';
import type {
  ClimberGender,
  ClimberSkinId,
  LoadoutId,
  OverallRatingGrade,
  RouteConfig,
  RouteId,
} from '../game/types';
import type {
  ArtPackId,
  HoldOverlayUrls,
  SpecialHoldUrls,
  VisualAtmosphereGrade,
} from './artPackAssets';
import { ROUTE_ART_THEMES } from './routeArtThemes';

// ============================================================================
// Built-in Default Art Pack Imports (Only module allowed to import raw PNGs)
// ============================================================================

// Snow Ridge Granite biome pack
import srStartUrl from './art-packs/snow-ridge-granite/01-起点.png';
import srWallUrl from './art-packs/snow-ridge-granite/02-攀爬岩壁.png';
import srSummitNearUrl from './art-packs/snow-ridge-granite/03-登顶近景.png';
import srWideEndingUrl from './art-packs/snow-ridge-granite/04-广角结尾.png';
import srHoldJugUrl from './art-packs/snow-ridge-granite/岩点单张/01-厚弧岩沿.png';
import srHoldCrimpUrl from './art-packs/snow-ridge-granite/岩点单张/02-薄片小边.png';
import srHoldPinchUrl from './art-packs/snow-ridge-granite/岩点单张/03-三角捏点.png';
import srHoldHornUrl from './art-packs/snow-ridge-granite/岩点单张/04-圆头岩角.png';
import srHoldSloperUrl from './art-packs/snow-ridge-granite/岩点单张/05-低弧斜面.png';
import srHoldUnderclingUrl from './art-packs/snow-ridge-granite/岩点单张/06-倒扣薄缘.png';
import srHoldLedgeUrl from './art-packs/snow-ridge-granite/岩点单张/07-双层阶块.png';
import srHoldSidepullUrl from './art-packs/snow-ridge-granite/岩点单张/08-竖向侧拉.png';
import srHoldPocketUrl from './art-packs/snow-ridge-granite/岩点单张/09-月牙凹窝.png';
import srHoldCrackUrl from './art-packs/snow-ridge-granite/岩点单张/10-斜向裂缝.png';

// Frost Crown Ice biome pack
import fcStartUrl from './art-packs/frost-crown-ice/01-起步.png';
import fcWallUrl from './art-packs/frost-crown-ice/02-攀爬冰岩壁.png';
import fcSummitNearUrl from './art-packs/frost-crown-ice/03-登顶近景.png';
import fcWideEndingUrl from './art-packs/frost-crown-ice/04-广角结尾.png';
import fcHoldJugUrl from './art-packs/frost-crown-ice/岩点单张/01-覆冰厚弧岩沿.png';
import fcHoldCrimpUrl from './art-packs/frost-crown-ice/岩点单张/02-覆冰薄片小边.png';
import fcHoldPinchUrl from './art-packs/frost-crown-ice/岩点单张/03-覆冰三角捏点.png';
import fcHoldHornUrl from './art-packs/frost-crown-ice/岩点单张/04-覆冰圆头岩角.png';
import fcHoldSloperUrl from './art-packs/frost-crown-ice/岩点单张/05-覆冰低弧斜面.png';
import fcHoldUnderclingUrl from './art-packs/frost-crown-ice/岩点单张/06-覆冰倒扣薄缘.png';
import fcHoldLedgeUrl from './art-packs/frost-crown-ice/岩点单张/07-覆冰双层阶块.png';
import fcHoldSidepullUrl from './art-packs/frost-crown-ice/岩点单张/08-覆冰竖向侧拉.png';
import fcHoldPocketUrl from './art-packs/frost-crown-ice/岩点单张/09-覆冰月牙凹窝.png';
import fcHoldCrackUrl from './art-packs/frost-crown-ice/岩点单张/10-覆冰斜向裂缝.png';

/**
 * Canonical 10-slot semantic hold ordering synchronized with HOLD_SPRITE_SPECS[0..9].
 * Artists & Codex configure holds by semantic key (jug, crimp, pinch, sloper, crack, etc.)
 * rather than fragile numeric indices.
 */
export const ORDERED_HOLD_KEYS: readonly [
  'jug',
  'crimp',
  'pinch',
  'horn',
  'sloper',
  'undercling',
  'ledge',
  'sidepull',
  'pocket',
  'crack',
] = [
  'jug',
  'crimp',
  'pinch',
  'horn',
  'sloper',
  'undercling',
  'ledge',
  'sidepull',
  'pocket',
  'crack',
] as const;

const SNOW_RIDGE_WALLS: WallBackgroundSpriteMap = {
  startLedge: srStartUrl,
  climbingWall: srWallUrl,
  wallDetailOverlay: undefined,
  summitNear: srSummitNearUrl,
  wideEnding: srWideEndingUrl,
};

const FROST_CROWN_WALLS: WallBackgroundSpriteMap = {
  startLedge: fcStartUrl,
  climbingWall: fcWallUrl,
  wallDetailOverlay: undefined,
  summitNear: fcSummitNearUrl,
  wideEnding: fcWideEndingUrl,
};

const SNOW_RIDGE_HOLDS: HoldSpriteMap = {
  jug: srHoldJugUrl,
  crimp: srHoldCrimpUrl,
  pinch: srHoldPinchUrl,
  horn: srHoldHornUrl,
  sloper: srHoldSloperUrl,
  undercling: srHoldUnderclingUrl,
  ledge: srHoldLedgeUrl,
  sidepull: srHoldSidepullUrl,
  pocket: srHoldPocketUrl,
  crack: srHoldCrackUrl,
  overlays: {},
  special: {},
};

const FROST_CROWN_HOLDS: HoldSpriteMap = {
  jug: fcHoldJugUrl,
  crimp: fcHoldCrimpUrl,
  pinch: fcHoldPinchUrl,
  horn: fcHoldHornUrl,
  sloper: fcHoldSloperUrl,
  undercling: fcHoldUnderclingUrl,
  ledge: fcHoldLedgeUrl,
  sidepull: fcHoldSidepullUrl,
  pocket: fcHoldPocketUrl,
  crack: fcHoldCrackUrl,
  overlays: {},
  special: {},
};

function createEmptyLimbMap(): Partial<CharacterLimbSpriteMap> {
  return {};
}

export function createDefaultArtAssetManifest(): ArtAssetManifest {
  return {
    version: '1.0.0',
    styleDirection: 'cairn-ligne-claire',
    character: {
      defaultSkinId: 'alpine-orange',
      skins: {
        'alpine-orange': createEmptyLimbMap(),
        'glacier-cyan': createEmptyLimbMap(),
      },
      genderSkinOverrides: {},
      previews: {
        'alpine-orange': { male: undefined, female: undefined },
        'glacier-cyan': { male: undefined, female: undefined },
      },
    },
    walls: {
      'snow-ridge-granite': { ...SNOW_RIDGE_WALLS },
      'frost-crown-ice': { ...FROST_CROWN_WALLS },
      // Reserved biome slots (inherit granite until dedicated Cairn biome plates are supplied)
      'ridge-alpine': { ...SNOW_RIDGE_WALLS },
      'slate-cliff': { ...SNOW_RIDGE_WALLS },
    },
    holds: {
      'snow-ridge-granite': {
        ...SNOW_RIDGE_HOLDS,
        overlays: {},
        special: {},
      },
      'frost-crown-ice': {
        ...FROST_CROWN_HOLDS,
        overlays: {},
        special: {},
      },
      'ridge-alpine': {
        ...SNOW_RIDGE_HOLDS,
        overlays: {},
        special: {},
      },
      'slate-cliff': {
        ...SNOW_RIDGE_HOLDS,
        overlays: {},
        special: {},
      },
    },
    routeOverrides: (Object.keys(ROUTE_ART_THEMES) as RouteId[]).reduce(
      (acc, rId) => {
        const theme = ROUTE_ART_THEMES[rId];
        acc[rId] = {
          walls: {
            wideEnding: theme.wideEndingUrl,
          },
          atmosphere: { ...theme.atmosphere },
        };
        return acc;
      },
      {} as Partial<Record<RouteId, RouteArtOverride>>
    ),
    badges: {},
    worldProps: {},
    ui: {
      loadoutIcons: {},
      hudIcons: {},
      ratingStamps: {},
    },
    vfx: {},
    atmosphere: {},
  };
}

export type AssetRegistryChangeScope =
  | 'all'
  | 'walls'
  | 'holds'
  | 'character'
  | 'worldProps'
  | 'badges'
  | 'ui'
  | 'vfx';
type AssetRegistryListener = (scope: AssetRegistryChangeScope) => void;

export interface ArtAssetManifestPatch {
  version?: string;
  styleDirection?: ArtAssetManifest['styleDirection'];
  character?: {
    defaultSkinId?: ClimberSkinId;
    skins?: Partial<Record<ClimberSkinId, Partial<CharacterLimbSpriteMap>>>;
    genderSkinOverrides?: Partial<
      Record<ClimberSkinId, Partial<Record<ClimberGender, Partial<CharacterLimbSpriteMap>>>>
    >;
    previews?: Partial<Record<ClimberSkinId, CharacterGenderPreviewMap>>;
  };
  walls?: Partial<Record<ArtPackId, Partial<WallBackgroundSpriteMap>>>;
  holds?: Partial<
    Record<
      ArtPackId,
      Partial<Omit<HoldSpriteMap, 'overlays' | 'special'>> & {
        overlays?: Partial<HoldOverlayUrls>;
        special?: Partial<SpecialHoldUrls>;
      }
    >
  >;
  routeOverrides?: Partial<Record<RouteId, RouteArtOverride>>;
  badges?: BadgeSpriteMap;
  worldProps?: Partial<WorldPropSpriteMap>;
  ui?: UiArtAssetMap;
  vfx?: VfxArtAssetMap;
  atmosphere?: Partial<Record<ArtPackId, VisualAtmosphereGrade>>;
}

function cloneRouteOverride(override: RouteArtOverride): RouteArtOverride {
  return {
    ...(override.walls ? { walls: { ...override.walls } } : {}),
    ...(override.holds
      ? {
          holds: {
            ...override.holds,
            ...(override.holds.overlays ? { overlays: { ...override.holds.overlays } } : {}),
            ...(override.holds.special ? { special: { ...override.holds.special } } : {}),
          },
        }
      : {}),
    ...(override.vfx ? { vfx: { ...override.vfx } } : {}),
    ...(override.atmosphere ? { atmosphere: { ...override.atmosphere } } : {}),
  };
}

function cloneManifest(m: ArtAssetManifest): ArtAssetManifest {
  const skins = {} as Record<ClimberSkinId, Partial<CharacterLimbSpriteMap>>;
  (Object.keys(m.character.skins) as ClimberSkinId[]).forEach((skinId) => {
    skins[skinId] = { ...m.character.skins[skinId] };
  });

  const genderSkinOverrides: NonNullable<ArtAssetManifest['character']['genderSkinOverrides']> = {};
  if (m.character.genderSkinOverrides) {
    (Object.keys(m.character.genderSkinOverrides) as ClimberSkinId[]).forEach((skinId) => {
      const genderMap = m.character.genderSkinOverrides?.[skinId];
      if (!genderMap) return;
      genderSkinOverrides[skinId] = {
        ...(genderMap.male ? { male: { ...genderMap.male } } : {}),
        ...(genderMap.female ? { female: { ...genderMap.female } } : {}),
      };
    });
  }

  const previews = {} as CharacterShowcasePreviewMap;
  (Object.keys(m.character.previews) as ClimberSkinId[]).forEach((skinId) => {
    previews[skinId] = { ...(m.character.previews[skinId] ?? {}) };
  });

  const walls = {} as Record<ArtPackId, WallBackgroundSpriteMap>;
  (Object.keys(m.walls) as ArtPackId[]).forEach((packId) => {
    walls[packId] = { ...m.walls[packId] };
  });

  const holds = {} as Record<ArtPackId, HoldSpriteMap>;
  (Object.keys(m.holds) as ArtPackId[]).forEach((packId) => {
    holds[packId] = {
      ...m.holds[packId],
      overlays: { ...(m.holds[packId].overlays ?? {}) },
      special: { ...(m.holds[packId].special ?? {}) },
    };
  });

  const routeOverrides: Partial<Record<RouteId, RouteArtOverride>> = {};
  (Object.keys(m.routeOverrides ?? {}) as RouteId[]).forEach((routeId) => {
    const ov = m.routeOverrides?.[routeId];
    if (ov) routeOverrides[routeId] = cloneRouteOverride(ov);
  });

  const atmosphere: Partial<Record<ArtPackId, VisualAtmosphereGrade>> = {};
  (Object.keys(m.atmosphere) as ArtPackId[]).forEach((packId) => {
    const grade = m.atmosphere[packId];
    if (grade) atmosphere[packId] = { ...grade };
  });

  return {
    version: m.version,
    styleDirection: m.styleDirection,
    character: {
      defaultSkinId: m.character.defaultSkinId,
      skins,
      genderSkinOverrides,
      previews,
    },
    walls,
    holds,
    routeOverrides,
    badges: { ...(m.badges ?? {}) },
    worldProps: { ...m.worldProps },
    ui: {
      ...(m.ui ?? {}),
      loadoutIcons: { ...(m.ui?.loadoutIcons ?? {}) },
      hudIcons: { ...(m.ui?.hudIcons ?? {}) },
      ratingStamps: { ...(m.ui?.ratingStamps ?? {}) },
    },
    vfx: { ...(m.vfx ?? {}) },
    atmosphere,
  };
}

class AssetRegistryStore {
  private manifest: ArtAssetManifest = createDefaultArtAssetManifest();
  private listeners = new Set<AssetRegistryListener>();

  private emit(scope: AssetRegistryChangeScope): void {
    this.listeners.forEach((listener) => listener(scope));
  }

  /** Subscribe decoder caches to manifest hot-swaps */
  subscribe(listener: AssetRegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Returns a fresh clone of the built-in default manifest */
  getDefaultManifest(): ArtAssetManifest {
    return createDefaultArtAssetManifest();
  }

  /** Returns the currently active centralized manifest */
  getManifest(): ArtAssetManifest {
    return this.manifest;
  }

  /** Replace the entire active ArtAssetManifest (e.g. from App.tsx boot or Codex art pack swap) */
  applyManifest(nextManifest: ArtAssetManifest): void {
    this.manifest = cloneManifest(nextManifest);
    this.emit('all');
  }

  /** Incrementally override subsets of character limbs, wall plates, holds, props, or grading */
  patchManifest(patch: ArtAssetManifestPatch): void {
    if (patch.version) this.manifest.version = patch.version;
    if (patch.styleDirection) this.manifest.styleDirection = patch.styleDirection;

    let changedWalls = false;
    let changedHolds = false;
    let changedCharacter = false;
    let changedProps = false;
    let changedBadges = false;
    let changedUi = false;
    let changedVfx = false;

    if (patch.character) {
      changedCharacter = true;
      if (patch.character.defaultSkinId) {
        this.manifest.character.defaultSkinId = patch.character.defaultSkinId;
      }
      if (patch.character.skins) {
        (Object.keys(patch.character.skins) as ClimberSkinId[]).forEach((skinId) => {
          const skinPatch = patch.character?.skins?.[skinId];
          if (!skinPatch) return;
          this.manifest.character.skins[skinId] = {
            ...(this.manifest.character.skins[skinId] ?? {}),
            ...skinPatch,
          };
        });
      }
      if (patch.character.genderSkinOverrides) {
        this.manifest.character.genderSkinOverrides =
          this.manifest.character.genderSkinOverrides ?? {};
        (Object.keys(patch.character.genderSkinOverrides) as ClimberSkinId[]).forEach((skinId) => {
          const genderPatch = patch.character?.genderSkinOverrides?.[skinId];
          if (!genderPatch) return;
          const prev = this.manifest.character.genderSkinOverrides?.[skinId] ?? {};
          this.manifest.character.genderSkinOverrides![skinId] = {
            ...prev,
            ...(genderPatch.male
              ? { male: { ...(prev.male ?? {}), ...genderPatch.male } }
              : {}),
            ...(genderPatch.female
              ? { female: { ...(prev.female ?? {}), ...genderPatch.female } }
              : {}),
          };
        });
      }
      if (patch.character.previews) {
        (Object.keys(patch.character.previews) as ClimberSkinId[]).forEach((skinId) => {
          const previewPatch = patch.character?.previews?.[skinId];
          if (!previewPatch) return;
          this.manifest.character.previews[skinId] = {
            ...(this.manifest.character.previews[skinId] ?? {}),
            ...previewPatch,
          };
        });
      }
    }

    if (patch.walls) {
      changedWalls = true;
      (Object.keys(patch.walls) as ArtPackId[]).forEach((packId) => {
        const wallPatch = patch.walls?.[packId];
        if (!wallPatch) return;
        this.manifest.walls[packId] = {
          ...this.manifest.walls[packId],
          ...wallPatch,
        };
      });
    }

    if (patch.holds) {
      changedHolds = true;
      (Object.keys(patch.holds) as ArtPackId[]).forEach((packId) => {
        const holdPatch = patch.holds?.[packId];
        if (!holdPatch) return;
        const prev = this.manifest.holds[packId];
        this.manifest.holds[packId] = {
          ...prev,
          ...holdPatch,
          overlays: {
            ...(prev.overlays ?? {}),
            ...(holdPatch.overlays ?? {}),
          },
          special: {
            ...(prev.special ?? {}),
            ...(holdPatch.special ?? {}),
          },
        };
      });
    }

    if (patch.routeOverrides) {
      changedWalls = true;
      changedHolds = true;
      (Object.keys(patch.routeOverrides) as RouteId[]).forEach((routeId) => {
        const ovPatch = patch.routeOverrides?.[routeId];
        if (!ovPatch) return;
        if (ovPatch.vfx) changedVfx = true;
        const prev = this.manifest.routeOverrides[routeId] ?? {};
        this.manifest.routeOverrides[routeId] = {
          walls: ovPatch.walls ? { ...(prev.walls ?? {}), ...ovPatch.walls } : prev.walls,
          holds: ovPatch.holds
            ? {
                ...(prev.holds ?? {}),
                ...ovPatch.holds,
                overlays: {
                  ...(prev.holds?.overlays ?? {}),
                  ...(ovPatch.holds.overlays ?? {}),
                },
                special: {
                  ...(prev.holds?.special ?? {}),
                  ...(ovPatch.holds.special ?? {}),
                },
              }
            : prev.holds,
          vfx: ovPatch.vfx ? { ...(prev.vfx ?? {}), ...ovPatch.vfx } : prev.vfx,
          atmosphere: ovPatch.atmosphere
            ? { ...(prev.atmosphere ?? {}), ...ovPatch.atmosphere }
            : prev.atmosphere,
        };
      });
    }

    if (patch.badges) {
      changedBadges = true;
      this.manifest.badges = {
        ...this.manifest.badges,
        ...patch.badges,
      };
    }

    if (patch.worldProps) {
      changedProps = true;
      this.manifest.worldProps = {
        ...this.manifest.worldProps,
        ...patch.worldProps,
      };
    }

    if (patch.ui) {
      changedUi = true;
      const prevUi = this.manifest.ui ?? {};
      this.manifest.ui = {
        ...prevUi,
        ...patch.ui,
        loadoutIcons: {
          ...(prevUi.loadoutIcons ?? {}),
          ...(patch.ui.loadoutIcons ?? {}),
        },
        hudIcons: {
          ...(prevUi.hudIcons ?? {}),
          ...(patch.ui.hudIcons ?? {}),
        },
        ratingStamps: {
          ...(prevUi.ratingStamps ?? {}),
          ...(patch.ui.ratingStamps ?? {}),
        },
      };
    }

    if (patch.vfx) {
      changedVfx = true;
      this.manifest.vfx = {
        ...(this.manifest.vfx ?? {}),
        ...patch.vfx,
      };
    }

    if (patch.atmosphere) {
      changedWalls = true;
      (Object.keys(patch.atmosphere) as ArtPackId[]).forEach((packId) => {
        const grade = patch.atmosphere?.[packId];
        if (!grade) return;
        this.manifest.atmosphere[packId] = { ...grade };
      });
    }

    const changeGroups =
      Number(changedWalls || changedHolds) +
      Number(changedCharacter) +
      Number(changedProps) +
      Number(changedBadges) +
      Number(changedUi) +
      Number(changedVfx);
    if (changeGroups > 1) {
      this.emit('all');
    } else {
      if (changedWalls) this.emit('walls');
      if (changedHolds) this.emit('holds');
      if (changedCharacter) this.emit('character');
      if (changedProps) this.emit('worldProps');
      if (changedBadges) this.emit('badges');
      if (changedUi) this.emit('ui');
      if (changedVfx) this.emit('vfx');
    }
  }

  // --------------------------------------------------------------------------
  // Biome Resolution
  // --------------------------------------------------------------------------

  resolveBiomePackId(palette: RouteConfig['palette']): ArtPackId {
    switch (palette) {
      case 'glacial':
        return 'frost-crown-ice';
      case 'ridge':
        return 'ridge-alpine';
      case 'slate':
        return 'slate-cliff';
      case 'granite':
      default:
        return 'snow-ridge-granite';
    }
  }

  // --------------------------------------------------------------------------
  // Character Limb & Rig Sprite Lookups (LeftHand, RightHand, Torso, etc.)
  // --------------------------------------------------------------------------

  getCharacterLimbMap(skinId: ClimberSkinId | string): Partial<CharacterLimbSpriteMap> {
    const skins = this.manifest.character.skins as Record<
      string,
      Partial<CharacterLimbSpriteMap> | undefined
    >;
    return skins[skinId] ?? skins[this.manifest.character.defaultSkinId] ?? {};
  }

  getCharacterLimbPath(
    skinId: ClimberSkinId | string,
    limbKey: CharacterLimbKey
  ): string | undefined {
    return this.getCharacterLimbMap(skinId)[limbKey];
  }

  setCharacterLimbPath(
    skinId: ClimberSkinId,
    limbKey: CharacterLimbKey,
    url: string | undefined
  ): void {
    this.patchManifest({
      character: {
        skins: {
          [skinId]: { [limbKey]: url },
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // Character Setup Back-Standing Showcase Artwork Lookups
  // --------------------------------------------------------------------------

  getCharacterPreviewMap(skinId: ClimberSkinId): CharacterGenderPreviewMap {
    return (
      this.manifest.character.previews[skinId] ??
      this.manifest.character.previews[this.manifest.character.defaultSkinId] ??
      {}
    );
  }

  getCharacterPreviewPath(skinId: ClimberSkinId, gender: ClimberGender): string | undefined {
    const map = this.getCharacterPreviewMap(skinId);
    return map[gender] ?? map.male ?? map.female;
  }

  setCharacterPreviewPath(
    skinId: ClimberSkinId,
    gender: ClimberGender,
    url: string | undefined
  ): void {
    this.patchManifest({
      character: {
        previews: {
          [skinId]: { [gender]: url },
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // Wall Background & Scene Plate Sprite Lookups (with optional Per-Route Overrides)
  // --------------------------------------------------------------------------

  getRouteOverride(routeId: RouteId): RouteArtOverride | undefined {
    return this.manifest.routeOverrides[routeId];
  }

  hasRouteOverride(routeId: RouteId): boolean {
    const ov = this.manifest.routeOverrides[routeId];
    if (!ov) return false;
    return Boolean(
      (ov.walls && Object.values(ov.walls).some(Boolean)) ||
        (ov.holds &&
          (ORDERED_HOLD_KEYS.some((k) => Boolean(ov.holds?.[k])) ||
            (ov.holds.overlays && Object.values(ov.holds.overlays).some(Boolean)) ||
            (ov.holds.special && Object.values(ov.holds.special).some(Boolean)))) ||
        (ov.vfx && Object.values(ov.vfx).some(Boolean)) ||
        ov.atmosphere
    );
  }

  getWallBackgroundMap(packId: ArtPackId, routeId?: RouteId): WallBackgroundSpriteMap {
    const base = this.manifest.walls[packId] ?? this.manifest.walls['snow-ridge-granite'];
    const ovWalls = routeId ? this.manifest.routeOverrides[routeId]?.walls : undefined;
    if (!ovWalls) return base;
    return {
      startLedge: ovWalls.startLedge ?? base.startLedge,
      climbingWall: ovWalls.climbingWall ?? base.climbingWall,
      wallDetailOverlay: ovWalls.wallDetailOverlay ?? base.wallDetailOverlay,
      summitNear: ovWalls.summitNear ?? base.summitNear,
      wideEnding: ovWalls.wideEnding ?? base.wideEnding,
    };
  }

  getWallBackgroundPath(
    packId: ArtPackId,
    layer: WallBackgroundLayerKey,
    routeId?: RouteId
  ): string | undefined {
    return this.getWallBackgroundMap(packId, routeId)[layer];
  }

  getWideEndingPath(palette: RouteConfig['palette'], routeId?: RouteId): string {
    return this.getWallBackgroundMap(this.resolveBiomePackId(palette), routeId).wideEnding;
  }

  getAtmosphereGrade(packId: ArtPackId, routeId?: RouteId): VisualAtmosphereGrade | undefined {
    const base = this.manifest.atmosphere[packId];
    const ovAtmos = routeId ? this.manifest.routeOverrides[routeId]?.atmosphere : undefined;
    if (!ovAtmos) return base;
    return { ...(base ?? {}), ...ovAtmos };
  }

  // --------------------------------------------------------------------------
  // Rock Hold Sprite Lookups (jug, crimp, pinch, sloper, crack, overlays, etc.)
  // --------------------------------------------------------------------------

  getHoldSpriteMap(packId: ArtPackId, routeId?: RouteId): HoldSpriteMap {
    const base = this.manifest.holds[packId] ?? this.manifest.holds['snow-ridge-granite'];
    const ovHolds = routeId ? this.manifest.routeOverrides[routeId]?.holds : undefined;
    if (!ovHolds) return base;
    return {
      jug: ovHolds.jug ?? base.jug,
      crimp: ovHolds.crimp ?? base.crimp,
      pinch: ovHolds.pinch ?? base.pinch,
      horn: ovHolds.horn ?? base.horn,
      sloper: ovHolds.sloper ?? base.sloper,
      undercling: ovHolds.undercling ?? base.undercling,
      ledge: ovHolds.ledge ?? base.ledge,
      sidepull: ovHolds.sidepull ?? base.sidepull,
      pocket: ovHolds.pocket ?? base.pocket,
      crack: ovHolds.crack ?? base.crack,
      overlays: { ...(base.overlays ?? {}), ...(ovHolds.overlays ?? {}) },
      special: { ...(base.special ?? {}), ...(ovHolds.special ?? {}) },
    };
  }

  getHoldSpritePath(packId: ArtPackId, holdKey: HoldSpriteKey, routeId?: RouteId): string {
    return this.getHoldSpriteMap(packId, routeId)[holdKey];
  }

  /** Returns the calibrated 10-sprite tuple aligned 1:1 with HOLD_SPRITE_SPECS[0..9] */
  getOrderedHoldPaths(
    packId: ArtPackId,
    routeId?: RouteId
  ): readonly [string, string, string, string, string, string, string, string, string, string] {
    const map = this.getHoldSpriteMap(packId, routeId);
    return [
      map.jug,
      map.crimp,
      map.pinch,
      map.horn,
      map.sloper,
      map.undercling,
      map.ledge,
      map.sidepull,
      map.pocket,
      map.crack,
    ];
  }

  getHoldOverlayPaths(packId: ArtPackId, routeId?: RouteId): HoldOverlayUrls {
    return this.getHoldSpriteMap(packId, routeId).overlays ?? {};
  }

  getHoldOverlayPath(
    packId: ArtPackId,
    overlayKey: HoldOverlayKey,
    routeId?: RouteId
  ): string | undefined {
    return this.getHoldOverlayPaths(packId, routeId)[overlayKey];
  }

  getSpecialHoldPaths(packId: ArtPackId, routeId?: RouteId): SpecialHoldUrls {
    return this.getHoldSpriteMap(packId, routeId).special ?? {};
  }

  getSpecialHoldPath(
    packId: ArtPackId,
    specialKey: SpecialHoldSpriteKey,
    routeId?: RouteId
  ): string | undefined {
    return this.getSpecialHoldPaths(packId, routeId)[specialKey];
  }

  // --------------------------------------------------------------------------
  // Ceremonial Route Summit Badge Lookups
  // --------------------------------------------------------------------------

  getBadgeSpriteMap(): BadgeSpriteMap {
    return this.manifest.badges;
  }

  getBadgeSpritePath(routeId: RouteId): string | undefined {
    return this.manifest.badges[routeId];
  }

  setBadgeSpritePath(routeId: RouteId, url: string | undefined): void {
    this.patchManifest({
      badges: {
        [routeId]: url,
      },
    });
  }

  // --------------------------------------------------------------------------
  // World Props Lookups (pitonFresh, climbot, summitCairn, etc.)
  // --------------------------------------------------------------------------

  getWorldPropMap(): Partial<WorldPropSpriteMap> {
    return this.manifest.worldProps;
  }

  getWorldPropPath(propKey: WorldPropSpriteKey): string | undefined {
    return this.manifest.worldProps[propKey];
  }

  // --------------------------------------------------------------------------
  // UI Chrome, Stage Backdrops, Loadout Icons, HUD Icons & Rating Stamps
  // --------------------------------------------------------------------------

  getUiAssetMap(): UiArtAssetMap {
    return this.manifest.ui;
  }

  getUiAssetPath(
    key: 'titleLogo' | 'parchmentTexture' | 'dailyBanner' | 'dailyEmblem' | 'characterStageBackdrop'
  ): string | undefined {
    return this.manifest.ui[key];
  }

  getLoadoutIconPath(loadoutId: LoadoutId): string | undefined {
    return this.manifest.ui.loadoutIcons?.[loadoutId];
  }

  getHudIconPath(key: UiHudIconKey): string | undefined {
    return this.manifest.ui.hudIcons?.[key];
  }

  getRatingStampPath(grade: OverallRatingGrade): string | undefined {
    return this.manifest.ui.ratingStamps?.[grade];
  }

  // --------------------------------------------------------------------------
  // Weather, Particle & Climbing Feedback VFX Textures
  // --------------------------------------------------------------------------

  getVfxAssetMap(routeId?: RouteId): VfxArtAssetMap {
    const base = this.manifest.vfx;
    const ovVfx = routeId ? this.manifest.routeOverrides[routeId]?.vfx : undefined;
    if (!ovVfx) return base;
    return { ...base, ...ovVfx };
  }

  getVfxAssetPath(key: VfxSpriteKey, routeId?: RouteId): string | undefined {
    return this.getVfxAssetMap(routeId)[key];
  }
}

export const AssetRegistry = new AssetRegistryStore();
