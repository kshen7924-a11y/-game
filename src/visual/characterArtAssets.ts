import {
  ARM_LOWER,
  ARM_UPPER,
  HIP_HALF_W,
  LEG_LOWER,
  LEG_UPPER,
  SHOULDER_HALF_W,
  TORSO_HEIGHT,
} from '../game/ik';
import { ClimberSkinId, Vec2 } from '../game/types';
import { AssetRegistry } from './AssetRegistry';

/**
 * Canonical Rig Metrics (1:1 synchronized with src/game/ik.ts).
 * All future character PNG/WebP art packs bind to these exact logical bone lengths
 * so replacing character art NEVER alters hitboxes, IK reach, or pointer drag controls.
 */
export const CHARACTER_RIG_METRICS = {
  /** Logical world-space unit reference height from shoe sole to crown of head */
  totalHeightWorldPx: 92,
  /** Recommended export resolution multiplier for crisp 2x/3x Retina rendering */
  recommendedExportScale: 4,
  torsoHeight: TORSO_HEIGHT,
  shoulderHalfWidth: SHOULDER_HALF_W,
  hipHalfWidth: HIP_HALF_W,
  upperArmLength: ARM_UPPER,
  forearmLength: ARM_LOWER,
  thighLength: LEG_UPPER,
  calfLength: LEG_LOWER,
} as const;

/** Two-point bone-driven limb segments (auto-rotated & length-matched to IK joints) */
export type CharacterBoneSlot =
  | 'upperArmL'
  | 'upperArmR'
  | 'forearmL'
  | 'forearmR'
  | 'thighL'
  | 'thighR'
  | 'calfL'
  | 'calfR';

/** Single-anchor body & equipment slots (attached to torso, neck, pelvis, wrist, or ankle) */
export type CharacterAnchorSlot =
  | 'head'
  | 'torso'
  | 'pelvisHarness'
  | 'backpack'
  | 'backpackGear'
  | 'chalkBag'
  | 'scarf'
  | 'handL'
  | 'handR'
  | 'footL'
  | 'footR';

export type CharacterPartSlot = CharacterBoneSlot | CharacterAnchorSlot;

export type CharacterHandPose = 'open' | 'grip' | 'chalked' | 'taped' | 'strained';
export type CharacterHeadMood = 'calm' | 'strained' | 'exhausted';
export type CharacterJointCap = 'elbow' | 'knee';

export interface CharacterBoneSpriteSpec {
  /** Transparent PNG/WebP URL (omit to use procedural painterly fallback for this slot) */
  url?: string;
  /** World-space thickness perpendicular to the bone axis */
  thickness: number;
  /** Length multiplier so joint caps overlap cleanly across elbows/knees (default 1.14) */
  lengthScale?: number;
  /** Normalized Y (0..1) on the vertical sprite where the start joint sits (default 0.14) */
  startPivotRatio?: number;
  /** Normalized Y (0..1) on the vertical sprite where the end joint sits (default 0.86) */
  endPivotRatio?: number;
  /** Mirror horizontally (allows a single left-side limb PNG to serve both sides) */
  flipX?: boolean;
}

export interface CharacterAnchorSpriteSpec {
  /** Transparent PNG/WebP URL (omit to use procedural painterly fallback for this slot) */
  url?: string;
  /** World-space render dimensions */
  width: number;
  height: number;
  /** Normalized pivot (0..1) mapped onto the rig anchor point */
  anchorX: number;
  anchorY: number;
  /** Optional local fine-tune offset in world units */
  offsetX?: number;
  offsetY?: number;
  /** Optional resting angle adjustment in radians */
  rotationOffsetRad?: number;
  /** Mirror horizontally */
  flipX?: boolean;
}

export interface CharacterArtPackDefinition {
  id: string;
  label: string;
  description?: string;
  /** Bone-driven limb sprites (expected vertical top-to-bottom orientation: start joint -> end joint) */
  boneParts?: Partial<Record<CharacterBoneSlot, CharacterBoneSpriteSpec>>;
  /** Anchor-driven torso, head, gear, hand & shoe sprites */
  anchorParts?: Partial<Record<CharacterAnchorSlot, CharacterAnchorSpriteSpec>>;
  /** Optional state-specific hand overrides (open / grip / chalked / taped / strained) */
  handVariants?: Partial<Record<CharacterHandPose, CharacterAnchorSpriteSpec>>;
  /** Optional Cairn-style fatigue/strain head variants (calm / strained / exhausted) */
  headVariants?: Partial<Record<CharacterHeadMood, CharacterAnchorSpriteSpec>>;
  /** Optional ligne-claire joint caps drawn cleanly over elbows & knees */
  jointCaps?: Partial<Record<CharacterJointCap, CharacterAnchorSpriteSpec>>;
}

export interface DecodedCharacterArtPack {
  id: string;
  definition: CharacterArtPackDefinition;
  boneImgs: Partial<Record<CharacterBoneSlot, HTMLImageElement | null>>;
  anchorImgs: Partial<Record<CharacterAnchorSlot, HTMLImageElement | null>>;
  handVariantImgs: Partial<Record<CharacterHandPose, HTMLImageElement | null>>;
  headVariantImgs: Partial<Record<CharacterHeadMood, HTMLImageElement | null>>;
  jointCapImgs: Partial<Record<CharacterJointCap, HTMLImageElement | null>>;
  readyCount: number;
  totalConfigured: number;
}

/**
 * Default Slot Layout & Anchor Presets for Art Production.
 * Artists dropping transparent PNGs into `src/visual/character-packs/<pack-id>/`
 * can reuse these exact world-space dimensions and pivot ratios.
 */
export const DEFAULT_BONE_SLOT_SPECS: Record<CharacterBoneSlot, Omit<CharacterBoneSpriteSpec, 'url'>> = {
  upperArmL: { thickness: 11.5, lengthScale: 1.16, startPivotRatio: 0.14, endPivotRatio: 0.86 },
  upperArmR: { thickness: 11.5, lengthScale: 1.16, startPivotRatio: 0.14, endPivotRatio: 0.86, flipX: true },
  forearmL: { thickness: 9.5, lengthScale: 1.14, startPivotRatio: 0.14, endPivotRatio: 0.86 },
  forearmR: { thickness: 9.5, lengthScale: 1.14, startPivotRatio: 0.14, endPivotRatio: 0.86, flipX: true },
  thighL: { thickness: 13.2, lengthScale: 1.16, startPivotRatio: 0.14, endPivotRatio: 0.86 },
  thighR: { thickness: 13.2, lengthScale: 1.16, startPivotRatio: 0.14, endPivotRatio: 0.86, flipX: true },
  calfL: { thickness: 11.0, lengthScale: 1.14, startPivotRatio: 0.14, endPivotRatio: 0.86 },
  calfR: { thickness: 11.0, lengthScale: 1.14, startPivotRatio: 0.14, endPivotRatio: 0.86, flipX: true },
};

export const DEFAULT_ANCHOR_SLOT_SPECS: Record<CharacterAnchorSlot, Omit<CharacterAnchorSpriteSpec, 'url'>> = {
  head: { width: 24, height: 26, anchorX: 0.5, anchorY: 0.64 },
  torso: { width: 32, height: 48, anchorX: 0.5, anchorY: 0.5 },
  pelvisHarness: { width: 30, height: 14, anchorX: 0.5, anchorY: 0.45 },
  backpack: { width: 30, height: 38, anchorX: 0.5, anchorY: 0.56 },
  /** Wide Cairn-style horizontal pack pole, coiled terracotta rope & dangling pouches */
  backpackGear: { width: 68, height: 44, anchorX: 0.5, anchorY: 0.52 },
  chalkBag: { width: 11, height: 13, anchorX: 0.5, anchorY: 0.12 },
  scarf: { width: 26, height: 18, anchorX: 0.78, anchorY: 0.25 },
  handL: { width: 12, height: 11, anchorX: 0.45, anchorY: 0.5 },
  handR: { width: 12, height: 11, anchorX: 0.45, anchorY: 0.5, flipX: true },
  footL: { width: 17, height: 10, anchorX: 0.46, anchorY: 0.5 },
  footR: { width: 17, height: 10, anchorX: 0.46, anchorY: 0.5, flipX: true },
};

export const DEFAULT_JOINT_CAP_SPECS: Record<CharacterJointCap, Omit<CharacterAnchorSpriteSpec, 'url'>> = {
  elbow: { width: 10, height: 10, anchorX: 0.5, anchorY: 0.5 },
  knee: { width: 12, height: 12, anchorX: 0.5, anchorY: 0.5 },
};

/**
 * Character Art Pack Registry.
 * Any slot with a `url` automatically overrides that body part with the decoded PNG sprite;
 * omitted slots cleanly render via the upgraded painterly procedural character renderer.
 *
 * Example future drop-in:
 *   import heroHeadUrl from './character-packs/alpine-orange/head.png';
 *   CHARACTER_ART_MANIFEST['alpine-orange'].anchorParts = {
 *     head: { ...DEFAULT_ANCHOR_SLOT_SPECS.head, url: heroHeadUrl },
 *   };
 */
export const CHARACTER_ART_MANIFEST: Record<string, CharacterArtPackDefinition> = {
  'alpine-orange': {
    id: 'alpine-orange',
    label: '山脊经典 · 默认穿搭一',
    description: '蓝橙高山冲锋衣 + 护目镜绒帽 + 探险背包',
    boneParts: {},
    anchorParts: {},
    handVariants: {},
  },
  'glacier-cyan': {
    id: 'glacier-cyan',
    label: '极光冰青 · 默认穿搭二',
    description: '冰青高寒冲锋衣 + 头灯防撞盔 + 外挂冰镐包',
    boneParts: {},
    anchorParts: {},
    handVariants: {},
  },
};

function resolveMergedCharacterDefinition(packId: string): CharacterArtPackDefinition {
  const baseDef = CHARACTER_ART_MANIFEST[packId] ?? CHARACTER_ART_MANIFEST['alpine-orange'];
  const regMap = AssetRegistry.getCharacterLimbMap(packId);

  const boneParts: Partial<Record<CharacterBoneSlot, CharacterBoneSpriteSpec>> = {
    ...(baseDef.boneParts ?? {}),
  };
  const anchorParts: Partial<Record<CharacterAnchorSlot, CharacterAnchorSpriteSpec>> = {
    ...(baseDef.anchorParts ?? {}),
  };
  const handVariants: Partial<Record<CharacterHandPose, CharacterAnchorSpriteSpec>> = {
    ...(baseDef.handVariants ?? {}),
  };
  const headVariants: Partial<Record<CharacterHeadMood, CharacterAnchorSpriteSpec>> = {
    ...(baseDef.headVariants ?? {}),
  };
  const jointCaps: Partial<Record<CharacterJointCap, CharacterAnchorSpriteSpec>> = {
    ...(baseDef.jointCaps ?? {}),
  };

  const applyBone = (slot: CharacterBoneSlot, url?: string) => {
    if (!url) return;
    boneParts[slot] = { ...DEFAULT_BONE_SLOT_SPECS[slot], ...(boneParts[slot] ?? {}), url };
  };
  const applyAnchor = (slot: CharacterAnchorSlot, url?: string) => {
    if (!url) return;
    anchorParts[slot] = { ...DEFAULT_ANCHOR_SLOT_SPECS[slot], ...(anchorParts[slot] ?? {}), url };
  };
  const applyHandPose = (pose: CharacterHandPose, url?: string) => {
    if (!url) return;
    handVariants[pose] = { ...DEFAULT_ANCHOR_SLOT_SPECS.handL, ...(handVariants[pose] ?? {}), url };
  };
  const applyHeadMood = (mood: CharacterHeadMood, url?: string) => {
    if (!url) return;
    headVariants[mood] = { ...DEFAULT_ANCHOR_SLOT_SPECS.head, ...(headVariants[mood] ?? {}), url };
  };
  const applyJointCap = (joint: CharacterJointCap, url?: string) => {
    if (!url) return;
    jointCaps[joint] = { ...DEFAULT_JOINT_CAP_SPECS[joint], ...(jointCaps[joint] ?? {}), url };
  };

  // Map canonical ArtAssetManifest limb keys -> rig bone/anchor/state slots
  applyBone('upperArmL', regMap.LeftUpperArm);
  applyBone('upperArmR', regMap.RightUpperArm ?? regMap.LeftUpperArm);
  applyBone('forearmL', regMap.LeftForearm);
  applyBone('forearmR', regMap.RightForearm ?? regMap.LeftForearm);
  applyBone('thighL', regMap.LeftThigh);
  applyBone('thighR', regMap.RightThigh ?? regMap.LeftThigh);
  applyBone('calfL', regMap.LeftCalf);
  applyBone('calfR', regMap.RightCalf ?? regMap.LeftCalf);

  applyAnchor('handL', regMap.LeftHand);
  applyAnchor('handR', regMap.RightHand ?? regMap.LeftHand);
  applyAnchor('footL', regMap.LeftFoot);
  applyAnchor('footR', regMap.RightFoot ?? regMap.LeftFoot);
  applyAnchor('torso', regMap.Torso);
  applyAnchor('pelvisHarness', regMap.Pelvis);
  applyAnchor('head', regMap.Head);
  applyAnchor('backpack', regMap.Backpack);
  applyAnchor('backpackGear', regMap.BackpackGear);
  applyAnchor('chalkBag', regMap.ChalkBag);
  applyAnchor('scarf', regMap.Scarf);

  applyHandPose('open', regMap.HandOpen);
  applyHandPose('grip', regMap.HandGrip);
  applyHandPose('chalked', regMap.HandChalked);
  applyHandPose('taped', regMap.HandTaped);
  applyHandPose('strained', regMap.HandStrained);

  applyHeadMood('calm', regMap.HeadCalm);
  applyHeadMood('strained', regMap.HeadStrained);
  applyHeadMood('exhausted', regMap.HeadExhausted);

  applyJointCap('elbow', regMap.JointElbow);
  applyJointCap('knee', regMap.JointKnee);

  return {
    ...baseDef,
    boneParts,
    anchorParts,
    handVariants,
    headVariants,
    jointCaps,
  };
}

export function getCharacterArtPackStatus(packId: ClimberSkinId | string): {
  configuredSlots: number;
  hasCustomArt: boolean;
} {
  const def = resolveMergedCharacterDefinition(packId);
  const boneCount = Object.values(def.boneParts ?? {}).filter((s) => !!s?.url).length;
  const anchorCount = Object.values(def.anchorParts ?? {}).filter((s) => !!s?.url).length;
  const handCount = Object.values(def.handVariants ?? {}).filter((s) => !!s?.url).length;
  const headCount = Object.values(def.headVariants ?? {}).filter((s) => !!s?.url).length;
  const jointCount = Object.values(def.jointCaps ?? {}).filter((s) => !!s?.url).length;
  const configuredSlots = boneCount + anchorCount + handCount + headCount + jointCount;
  return { configuredSlots, hasCustomArt: configuredSlots > 0 };
}

const decodedCache = new Map<string, DecodedCharacterArtPack>();
const loadingStarted = new Set<string>();

AssetRegistry.subscribe((scope) => {
  if (scope === 'all' || scope === 'character') {
    decodedCache.clear();
    loadingStarted.clear();
  }
});

function loadCharacterImage(url: string, onReady: (img: HTMLImageElement) => void): void {
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

/**
 * Register or replace an entire CharacterArtPackDefinition at runtime or app boot.
 * Supports expanding character rosters (new skins/characters/collabs) with zero core-code edits.
 */
export function registerCharacterArtPack(definition: CharacterArtPackDefinition): void {
  CHARACTER_ART_MANIFEST[definition.id] = definition;
  decodedCache.delete(definition.id);
  loadingStarted.delete(definition.id);
}

/**
 * Modular slot override API: hot-swap a single part (e.g., helmet, backpack, jacket, shoes)
 * for mix-and-match cosmetics or live artist asset preview without touching IK/controls.
 */
export function overrideCharacterArtSlot(
  packId: string,
  slot: CharacterPartSlot,
  spec: CharacterBoneSpriteSpec | CharacterAnchorSpriteSpec
): void {
  const existing = CHARACTER_ART_MANIFEST[packId] ?? {
    id: packId,
    label: packId,
    boneParts: {},
    anchorParts: {},
    handVariants: {},
  };

  if (slot in DEFAULT_BONE_SLOT_SPECS) {
    existing.boneParts = {
      ...existing.boneParts,
      [slot as CharacterBoneSlot]: spec as CharacterBoneSpriteSpec,
    };
  } else {
    existing.anchorParts = {
      ...existing.anchorParts,
      [slot as CharacterAnchorSlot]: spec as CharacterAnchorSpriteSpec,
    };
  }

  CHARACTER_ART_MANIFEST[packId] = existing;
  decodedCache.delete(packId);
  loadingStarted.delete(packId);
  getDecodedCharacterArtPack(packId);
}

export function getDecodedCharacterArtPack(packId: ClimberSkinId | string): DecodedCharacterArtPack {
  const resolvedId = CHARACTER_ART_MANIFEST[packId] ? packId : 'alpine-orange';
  let pack = decodedCache.get(resolvedId);
  if (!pack) {
    const def = resolveMergedCharacterDefinition(resolvedId);
    pack = {
      id: resolvedId,
      definition: def,
      boneImgs: {},
      anchorImgs: {},
      handVariantImgs: {},
      headVariantImgs: {},
      jointCapImgs: {},
      readyCount: 0,
      totalConfigured: 0,
    };
    decodedCache.set(resolvedId, pack);
  }

  if (!loadingStarted.has(resolvedId)) {
    loadingStarted.add(resolvedId);
    const target = pack;
    const def = target.definition;

    if (def.boneParts) {
      (Object.entries(def.boneParts) as [CharacterBoneSlot, CharacterBoneSpriteSpec | undefined][]).forEach(
        ([slot, spec]) => {
          if (!spec?.url) return;
          target.totalConfigured += 1;
          target.boneImgs[slot] = null;
          loadCharacterImage(spec.url, (img) => {
            target.boneImgs[slot] = img;
            target.readyCount += 1;
          });
        }
      );
    }

    if (def.anchorParts) {
      (
        Object.entries(def.anchorParts) as [
          CharacterAnchorSlot,
          CharacterAnchorSpriteSpec | undefined,
        ][]
      ).forEach(([slot, spec]) => {
        if (!spec?.url) return;
        target.totalConfigured += 1;
        target.anchorImgs[slot] = null;
        loadCharacterImage(spec.url, (img) => {
          target.anchorImgs[slot] = img;
          target.readyCount += 1;
        });
      });
    }

    if (def.handVariants) {
      (
        Object.entries(def.handVariants) as [
          CharacterHandPose,
          CharacterAnchorSpriteSpec | undefined,
        ][]
      ).forEach(([pose, spec]) => {
        if (!spec?.url) return;
        target.totalConfigured += 1;
        target.handVariantImgs[pose] = null;
        loadCharacterImage(spec.url, (img) => {
          target.handVariantImgs[pose] = img;
          target.readyCount += 1;
        });
      });
    }

    if (def.headVariants) {
      (
        Object.entries(def.headVariants) as [
          CharacterHeadMood,
          CharacterAnchorSpriteSpec | undefined,
        ][]
      ).forEach(([mood, spec]) => {
        if (!spec?.url) return;
        target.totalConfigured += 1;
        target.headVariantImgs[mood] = null;
        loadCharacterImage(spec.url, (img) => {
          target.headVariantImgs[mood] = img;
          target.readyCount += 1;
        });
      });
    }

    if (def.jointCaps) {
      (
        Object.entries(def.jointCaps) as [
          CharacterJointCap,
          CharacterAnchorSpriteSpec | undefined,
        ][]
      ).forEach(([joint, spec]) => {
        if (!spec?.url) return;
        target.totalConfigured += 1;
        target.jointCapImgs[joint] = null;
        loadCharacterImage(spec.url, (img) => {
          target.jointCapImgs[joint] = img;
          target.readyCount += 1;
        });
      });
    }
  }

  return pack;
}

export function preloadCharacterArtPack(packId: ClimberSkinId | string): DecodedCharacterArtPack {
  return getDecodedCharacterArtPack(packId);
}

/**
 * Renders a 2-point bone-driven limb PNG aligned seamlessly between IK start & end joints.
 * Expects sprite art drawn vertically downward (start joint near top, end joint near bottom).
 */
export function drawBoneSegmentSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spec: CharacterBoneSpriteSpec,
  start: Vec2,
  end: Vec2
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const boneLen = Math.hypot(dx, dy);
  if (boneLen < 0.5) return;

  const angle = Math.atan2(dy, dx) - Math.PI * 0.5;
  const startPivot = spec.startPivotRatio ?? 0.14;
  const endPivot = spec.endPivotRatio ?? 0.86;
  const pivotSpan = Math.max(0.2, endPivot - startPivot);
  const drawH = (boneLen / pivotSpan) * (spec.lengthScale ?? 1.0);
  const drawW = spec.thickness;

  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(angle);
  if (spec.flipX) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, -drawW * 0.5, -drawH * startPivot, drawW, drawH);
  ctx.restore();
}

/**
 * Renders an anchor-mounted character part PNG (head, torso, backpack, harness, hand, foot)
 * respecting normalized pivot, rotation, twist squash/stretch, and horizontal mirroring.
 */
export function drawAnchorPartSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spec: CharacterAnchorSpriteSpec,
  x: number,
  y: number,
  rotationRad = 0,
  scaleX = 1,
  scaleY = 1
): void {
  ctx.save();
  ctx.translate(x + (spec.offsetX ?? 0), y + (spec.offsetY ?? 0));
  ctx.rotate(rotationRad + (spec.rotationOffsetRad ?? 0));
  ctx.scale(spec.flipX ? -scaleX : scaleX, scaleY);
  ctx.drawImage(
    img,
    -spec.width * spec.anchorX,
    -spec.height * spec.anchorY,
    spec.width,
    spec.height
  );
  ctx.restore();
}
