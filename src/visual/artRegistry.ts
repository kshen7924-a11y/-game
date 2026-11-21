/**
 * Unified Art Replacement Registry (Single Entry Point for Codex Art Pipeline)
 *
 * All visual assets — Walls, Holds, Hold State Overlays, World Props (Pitons/Climbot/Cairn/Flora),
 * Character Rigs/Skins, and Cairn Atmosphere Grading — can be registered or hot-swapped
 * strictly through this module without EVER touching gameplay logic (src/game/*) or App.tsx.
 */

export {
  AssetRegistry,
  ORDERED_HOLD_KEYS,
  createDefaultArtAssetManifest,
  type ArtAssetManifestPatch,
  type AssetRegistryChangeScope,
} from './AssetRegistry';

export {
  ART_PACK_MANIFEST,
  getDecodedArtPack,
  overrideHoldOverlay,
  preloadArtPackForPalette,
  registerArtPack,
  resolveArtPackId,
  resolveArtPackUrls,
  type ArtPackId,
  type ArtPackMetrics,
  type ArtPackUrls,
  type DecodedArtPack,
  type HoldOverlayUrls,
  type SpecialHoldUrls,
  type VisualAtmosphereGrade,
} from './artPackAssets';

export {
  HOLD_SPRITE_SPECS,
  type HoldSpriteSpec,
} from './holdSprites';

export {
  DEFAULT_WORLD_PROP_SPECS,
  WORLD_PROPS_MANIFEST,
  getDecodedWorldPropsPack,
  overrideWorldPropSlot,
  registerWorldPropsPack,
  type DecodedWorldPropsPack,
  type WorldPropSlot,
  type WorldPropSpriteSpec,
  type WorldPropsPackDefinition,
} from './worldPropsArt';

export {
  CHARACTER_ART_MANIFEST,
  CHARACTER_RIG_METRICS,
  DEFAULT_ANCHOR_SLOT_SPECS,
  DEFAULT_BONE_SLOT_SPECS,
  DEFAULT_JOINT_CAP_SPECS,
  getCharacterArtPackStatus,
  getDecodedCharacterArtPack,
  overrideCharacterArtSlot,
  preloadCharacterArtPack,
  registerCharacterArtPack,
  type CharacterAnchorSlot,
  type CharacterAnchorSpriteSpec,
  type CharacterArtPackDefinition,
  type CharacterBoneSlot,
  type CharacterBoneSpriteSpec,
  type CharacterHandPose,
  type CharacterHeadMood,
  type CharacterJointCap,
  type CharacterPartSlot,
  type DecodedCharacterArtPack,
} from './characterArtAssets';

import { VisualAtmosphereGrade } from './artPackAssets';

/**
 * Canonical Cairn Reference Visual Grading Preset
 * Calibrated directly against the Franco-Belgian ligne-claire Cairn reference:
 * cool teal-slate cel shadows, chalky sunlit limestone, crisp wall-projected shadows,
 * and minimal diegetic hold cues (no neon arcade rings).
 */
export const CAIRN_REFERENCE_ATMOSPHERE_GRADE: VisualAtmosphereGrade = {
  shadowWashColor: 'rgba(36, 62, 78, 0.05)',
  sunRimWashColor: 'rgba(232, 240, 234, 0.07)',
  castShadowColor: 'rgba(30, 58, 72, 0.44)',
  castShadowOffsetX: 10,
  castShadowOffsetY: 13,
  vignetteStrength: 0.72,
  wallGrainOpacity: 0.22,
  diegeticMinimalCues: true,
};
