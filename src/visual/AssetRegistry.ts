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
  CharacterGenderPreviewMap,
  CharacterLimbKey,
  CharacterLimbSpriteMap,
  CharacterShowcasePreviewMap,
  HoldOverlayKey,
  HoldSpriteKey,
  HoldSpriteMap,
  SpecialHoldSpriteKey,
  WallBackgroundLayerKey,
  WallBackgroundSpriteMap,
  WorldPropSpriteKey,
  WorldPropSpriteMap,
} from '../App';
import type { ClimberGender, ClimberSkinId, RouteConfig } from '../game/types';
import type {
  ArtPackId,
  HoldOverlayUrls,
  SpecialHoldUrls,
  VisualAtmosphereGrade,
} from './artPackAssets';

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
    worldProps: {},
    atmosphere: {},
  };
}

export type AssetRegistryChangeScope = 'all' | 'walls' | 'holds' | 'character' | 'worldProps';
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
  worldProps?: Partial<WorldPropSpriteMap>;
  atmosphere?: Partial<Record<ArtPackId, VisualAtmosphereGrade>>;
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
    worldProps: { ...m.worldProps },
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

    if (patch.worldProps) {
      changedProps = true;
      this.manifest.worldProps = {
        ...this.manifest.worldProps,
        ...patch.worldProps,
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

    if (
      (changedWalls || changedHolds) &&
      (changedCharacter || changedProps)
    ) {
      this.emit('all');
    } else {
      if (changedWalls) this.emit('walls');
      if (changedHolds) this.emit('holds');
      if (changedCharacter) this.emit('character');
      if (changedProps) this.emit('worldProps');
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
  // Wall Background & Scene Plate Sprite Lookups
  // --------------------------------------------------------------------------

  getWallBackgroundMap(packId: ArtPackId): WallBackgroundSpriteMap {
    return this.manifest.walls[packId] ?? this.manifest.walls['snow-ridge-granite'];
  }

  getWallBackgroundPath(
    packId: ArtPackId,
    layer: WallBackgroundLayerKey
  ): string | undefined {
    return this.getWallBackgroundMap(packId)[layer];
  }

  getWideEndingPath(palette: RouteConfig['palette']): string {
    return this.getWallBackgroundMap(this.resolveBiomePackId(palette)).wideEnding;
  }

  getAtmosphereGrade(packId: ArtPackId): VisualAtmosphereGrade | undefined {
    return this.manifest.atmosphere[packId];
  }

  // --------------------------------------------------------------------------
  // Rock Hold Sprite Lookups (jug, crimp, pinch, sloper, crack, overlays, etc.)
  // --------------------------------------------------------------------------

  getHoldSpriteMap(packId: ArtPackId): HoldSpriteMap {
    return this.manifest.holds[packId] ?? this.manifest.holds['snow-ridge-granite'];
  }

  getHoldSpritePath(packId: ArtPackId, holdKey: HoldSpriteKey): string {
    return this.getHoldSpriteMap(packId)[holdKey];
  }

  /** Returns the calibrated 10-sprite tuple aligned 1:1 with HOLD_SPRITE_SPECS[0..9] */
  getOrderedHoldPaths(
    packId: ArtPackId
  ): readonly [string, string, string, string, string, string, string, string, string, string] {
    const map = this.getHoldSpriteMap(packId);
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

  getHoldOverlayPaths(packId: ArtPackId): HoldOverlayUrls {
    return this.getHoldSpriteMap(packId).overlays ?? {};
  }

  getHoldOverlayPath(packId: ArtPackId, overlayKey: HoldOverlayKey): string | undefined {
    return this.getHoldOverlayPaths(packId)[overlayKey];
  }

  getSpecialHoldPaths(packId: ArtPackId): SpecialHoldUrls {
    return this.getHoldSpriteMap(packId).special ?? {};
  }

  getSpecialHoldPath(packId: ArtPackId, specialKey: SpecialHoldSpriteKey): string | undefined {
    return this.getSpecialHoldPaths(packId)[specialKey];
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
}

export const AssetRegistry = new AssetRegistryStore();
