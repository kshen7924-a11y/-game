import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { IntroStillnessOverlay } from './components/IntroStillnessOverlay';
import { SummitOverlay } from './components/SummitOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine, stopHaptic, triggerHaptic, triggerHapticPreset } from './game/audio';
import {
  ARM_MAX_REACH,
  clampLimbTarget,
  clampPelvisOffset,
  computeNonlinearRestitution,
  dist,
  evaluateHoldGrab,
  getReachableHoldIds,
  HIP_HALF_W,
  isDynoReachable,
  isHoldReachable,
  isStandingOnSpringHold,
  LEG_MAX_REACH,
  SHOULDER_HALF_W,
  TORSO_HEIGHT,
  updateClimberPhysics,
} from './game/ik';
import {
  BADGES,
  CLIMBER_SKINS,
  evaluateClimbAssessment,
  generateMountain,
  getDailyChallengeRoute,
  getRouteById,
  getWeatherAtAltitude,
  hasHoldHintsEnabled,
  isMasterRoute,
  isRouteBookSupported,
  LOADOUT_OPTIONS,
  MountainWorld,
  PIXELS_PER_METER,
  ROUTES,
} from './game/mountain';
import {
  createPhysicsDebugTracker,
  renderPhysicsDebugOverlay,
} from './game/physicsDebugOverlay';
import { renderGameFrame } from './game/renderer';
import {
  ArtPackId,
  HoldOverlayUrls,
  preloadArtPackForRoute,
  SpecialHoldUrls,
  VisualAtmosphereGrade,
} from './visual/artPackAssets';
import { AssetRegistry } from './visual/AssetRegistry';
import { preloadCharacterArtPack } from './visual/characterArtAssets';
import {
  ActiveWeather,
  AltitudeDifficultyBin,
  CameraState,
  ClimbAssessment,
  ClimberGender,
  ClimberSkinId,
  ClimberState,
  ClimbEvent,
  ClimbStats,
  ClimbStyle,
  DynoChargeState,
  GamePhase,
  Hold,
  HoverInfo,
  LimbDragState,
  LimbId,
  LoadoutId,
  MicroWeatherWindow,
  OverallRatingGrade,
  Particle,
  PelvisDragState,
  Piton,
  RoadbookAttemptReview,
  RoadbookFallHotspot,
  RoadbookHealthDropRecord,
  RoadbookSavedSlot,
  RouteConfig,
  RouteId,
  RoutePitchSection,
  RouteRoadbookRecord,
  SummitSequenceStage,
  TutorialState,
  Vec2,
  WeatherIncidentState,
  WeatherIncidentType,
} from './game/types';

/**
 * Semantic character limb, torso, gear & state sprite keys.
 * Every slot maps 1:1 to IK joints/anchors so swapping character art never affects climbing physics.
 */
export type CharacterLimbKey =
  | 'LeftHand'
  | 'RightHand'
  | 'LeftFoot'
  | 'RightFoot'
  | 'LeftUpperArm'
  | 'RightUpperArm'
  | 'LeftForearm'
  | 'RightForearm'
  | 'LeftThigh'
  | 'RightThigh'
  | 'LeftCalf'
  | 'RightCalf'
  | 'Torso'
  | 'Pelvis'
  | 'Head'
  | 'Backpack'
  | 'BackpackGear'
  | 'ChalkBag'
  | 'Scarf'
  | 'HandOpen'
  | 'HandGrip'
  | 'HandChalked'
  | 'HandTaped'
  | 'HandStrained'
  | 'HeadCalm'
  | 'HeadStrained'
  | 'HeadExhausted'
  | 'JointElbow'
  | 'JointKnee';

export type CharacterLimbSpriteMap = Record<CharacterLimbKey, string | undefined>;

/** Scene-plate & rock wall background layers per biome */
export type WallBackgroundLayerKey =
  | 'startLedge'
  | 'climbingWall'
  | 'wallDetailOverlay'
  | 'summitNear'
  | 'wideEnding';

export interface WallBackgroundSpriteMap {
  startLedge: string;
  climbingWall: string;
  wallDetailOverlay?: string;
  summitNear: string;
  wideEnding: string;
}

/** Calibrated semantic rock hold sprite keys */
export type HoldSpriteKey =
  | 'jug'
  | 'crimp'
  | 'pinch'
  | 'horn'
  | 'sloper'
  | 'undercling'
  | 'ledge'
  | 'sidepull'
  | 'pocket'
  | 'crack';

export type HoldOverlayKey = keyof HoldOverlayUrls;
export type SpecialHoldSpriteKey = keyof SpecialHoldUrls;

export interface HoldSpriteMap {
  jug: string;
  crimp: string;
  pinch: string;
  horn: string;
  sloper: string;
  undercling: string;
  ledge: string;
  sidepull: string;
  pocket: string;
  crack: string;
  overlays?: Partial<HoldOverlayUrls>;
  special?: Partial<SpecialHoldUrls>;
}

/** Interactive & landmark world props */
export type WorldPropSpriteKey =
  | 'pitonFresh'
  | 'pitonRusty'
  | 'climbot'
  | 'bivouacCamp'
  | 'bivouacFlag'
  | 'summitCairn'
  | 'summitFlag'
  | 'cliffFlora';

export type WorldPropSpriteMap = Record<WorldPropSpriteKey, string | undefined>;

/**
 * Full-body back-standing character showcase artwork (角色设定页背面站立效果图).
 * Mapped by skinId × gender so the Character Setup panel displays final artwork PNGs
 * directly from AssetRegistry, falling back cleanly to the back-standing SVG silhouette.
 */
export type CharacterGenderPreviewMap = Partial<Record<ClimberGender, string>>;
export type CharacterShowcasePreviewMap = Record<ClimberSkinId, CharacterGenderPreviewMap>;

/** Ceremonial route summit medal artwork (512x512 PNG-32) keyed by RouteId */
export type BadgeSpriteMap = Partial<Record<RouteId, string>>;

/** In-game HUD tactical action icon slots */
export type UiHudIconKey =
  | 'piton'
  | 'chalk'
  | 'shake'
  | 'roadbook'
  | 'altitude'
  | 'lean';

/** Complete UI chrome, backdrop, emblem, loadout & rating stamp art slots */
export interface UiArtAssetMap {
  /** Hand-drawn game title wordmark/logo rendered in the hub header */
  titleLogo?: string;
  /** Seamless subtle parchment / watercolor paper background tile for cards & panels */
  parchmentTexture?: string;
  /** Daily Challenge banner background & emblem */
  dailyBanner?: string;
  dailyEmblem?: string;
  /** Alpine rock-ledge stage backdrop behind the back-standing character preview */
  characterStageBackdrop?: string;
  /** 4 bespoke hand-drawn loadout icons (light / balanced / heavy / free-solo) */
  loadoutIcons?: Partial<Record<LoadoutId, string>>;
  /** 6 bespoke HUD icon sprites */
  hudIcons?: Partial<Record<UiHudIconKey, string>>;
  /** 6 alpine wax-seal / metallic settlement rating stamps (SSS / S+ / S / A / B / C) */
  ratingStamps?: Partial<Record<OverallRatingGrade, string>>;
}

/** Weather, particle & climbing feedback VFX texture slots */
export type VfxSpriteKey =
  | 'chalkPuff'
  | 'sparkPiton'
  | 'rockDebris'
  | 'iceShard'
  | 'snowFlake'
  | 'rainStreak'
  | 'mistVeil'
  | 'windStreak'
  | 'dynoRing';

export type VfxArtAssetMap = Partial<Record<VfxSpriteKey, string>>;

/**
 * Per-level art override enabling progressive, route-by-route art replacement.
 * Any omitted field automatically inherits from the route's base biome pack.
 */
export interface RouteArtOverride {
  walls?: Partial<WallBackgroundSpriteMap>;
  holds?: Partial<Omit<HoldSpriteMap, 'overlays' | 'special'>> & {
    overlays?: Partial<HoldOverlayUrls>;
    special?: Partial<SpecialHoldUrls>;
  };
  atmosphere?: VisualAtmosphereGrade;
}

/**
 * Centralized Art Asset Manifest consumed by AssetRegistry.
 * Replace any character limb, back-standing showcase artwork, ceremonial route badge,
 * per-level route override, biome wall background, rock hold, overlay, world prop,
 * UI chrome/icon, or VFX texture by passing a patch to AssetRegistry.
 */
export interface ArtAssetManifest {
  version: string;
  styleDirection: 'cairn-ligne-claire' | 'alpine-painterly' | 'custom';
  character: {
    defaultSkinId: ClimberSkinId;
    skins: Record<ClimberSkinId, Partial<CharacterLimbSpriteMap>>;
    /** Optional gender-specific in-game limb overrides (e.g. female head/torso silhouette) */
    genderSkinOverrides?: Partial<
      Record<ClimberSkinId, Partial<Record<ClimberGender, Partial<CharacterLimbSpriteMap>>>>
    >;
    /** Back-standing character showcase artwork rendered in the Character Setup tab */
    previews: CharacterShowcasePreviewMap;
  };
  walls: Record<ArtPackId, WallBackgroundSpriteMap>;
  holds: Record<ArtPackId, HoldSpriteMap>;
  /** Per-route independent art overrides for gradual level-by-level art upgrades */
  routeOverrides: Partial<Record<RouteId, RouteArtOverride>>;
  /** Ceremonial summit medal artwork per real-world climbing route */
  badges: BadgeSpriteMap;
  worldProps: Partial<WorldPropSpriteMap>;
  /** Dedicated UI surfaces, logos, loadout icons, HUD icons & rating stamps */
  ui: UiArtAssetMap;
  /** Weather, chalk, debris, icefall & Dyno VFX sprite textures */
  vfx: VfxArtAssetMap;
  atmosphere: Partial<Record<ArtPackId, VisualAtmosphereGrade>>;
}

/** Active boot manifest registered into AssetRegistry at startup */
export const DEFAULT_ART_ASSET_MANIFEST: ArtAssetManifest = AssetRegistry.getDefaultManifest();
AssetRegistry.applyManifest(DEFAULT_ART_ASSET_MANIFEST);

const BADGES_STORAGE_KEY = 'cairn_unlocked_badges_v1';
const STYLES_STORAGE_KEY = 'cairn_route_styles_v1';
const FREE_SOLO_STORAGE_KEY = 'cairn_free_solo_routes_v1';
const DAILY_STORAGE_KEY = 'cairn_daily_completed_v1';
const SKIN_STORAGE_KEY = 'cairn_selected_skin_v1';
const NAME_STORAGE_KEY = 'cairn_climber_name_v1';
const GENDER_STORAGE_KEY = 'cairn_climber_gender_v1';
const ROADBOOK_STORAGE_KEY = 'cairn_route_roadbooks_v1';

function getRouteRoadbookKey(route: RouteConfig): string {
  return route.isDailyChallenge && route.dailyDateKey
    ? `daily-${route.dailyDateKey}`
    : route.id;
}

function createEmptyRoadbookRecord(): RouteRoadbookRecord {
  return {
    savedPins: [],
    savedAt: null,
    archives: [],
    lastAttempt: null,
    fallHotspots: [],
  };
}

function loadAllRoadbookRecords(): Record<string, RouteRoadbookRecord> {
  try {
    const raw = window.localStorage.getItem(ROADBOOK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, RouteRoadbookRecord>;
  } catch {
    return {};
  }
}

function loadRouteRoadbookRecord(route: RouteConfig): RouteRoadbookRecord {
  const key = getRouteRoadbookKey(route);
  const all = loadAllRoadbookRecords();
  const existing = all[key];
  if (!existing || typeof existing !== 'object') {
    return createEmptyRoadbookRecord();
  }
  return {
    savedPins: Array.isArray(existing.savedPins)
      ? existing.savedPins.filter((id): id is string => typeof id === 'string')
      : [],
    savedAt: typeof existing.savedAt === 'number' ? existing.savedAt : null,
    archives: Array.isArray(existing.archives)
      ? existing.archives
          .filter(
            (slot): slot is RoadbookSavedSlot =>
              Boolean(slot) &&
              typeof slot.id === 'string' &&
              typeof slot.label === 'string' &&
              Array.isArray(slot.pins)
          )
          .slice(0, 3)
      : [],
    lastAttempt:
      existing.lastAttempt && typeof existing.lastAttempt === 'object'
        ? existing.lastAttempt
        : null,
    fallHotspots: Array.isArray(existing.fallHotspots)
      ? existing.fallHotspots
          .filter(
            (spot): spot is RoadbookFallHotspot =>
              Boolean(spot) &&
              typeof spot.x === 'number' &&
              typeof spot.y === 'number' &&
              typeof spot.count === 'number'
          )
          .slice(0, 8)
      : [],
  };
}

function saveRouteRoadbookRecord(routeKey: string, record: RouteRoadbookRecord): void {
  try {
    const all = loadAllRoadbookRecords();
    all[routeKey] = record;
    window.localStorage.setItem(ROADBOOK_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function pinsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function downsampleTrail(points: Vec2[], maxCount = 120): Vec2[] {
  if (points.length <= maxCount) {
    return points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }
  const out: Vec2[] = [];
  const step = (points.length - 1) / (maxCount - 1);
  for (let i = 0; i < maxCount; i++) {
    const idx = i === maxCount - 1 ? points.length - 1 : Math.round(i * step);
    const p = points[idx];
    out.push({ x: Math.round(p.x), y: Math.round(p.y) });
  }
  return out;
}

const LEGACY_BADGE_MAP: Record<string, RouteId> = {
  '5.6': 'intro',
  '5.9': 'intermediate',
  '5.10b': 'intermediate-plus',
  '5.12a': 'master-1',
};

const STYLE_RANK: Record<ClimbStyle, number> = {
  summit: 1,
  redpoint: 2,
  onsight: 3,
};

// Strict hand-drag Dyno (leap-grab) charge tuning: prevents accidental hops on short holds
const DYNO_DWELL_DELAY_SEC = 0.24;
const DYNO_CHARGE_DURATION_NORMAL_SEC = 0.85;
const DYNO_CHARGE_DURATION_BOOST_SEC = 0.65;
const DYNO_MIN_RELEASE_PROGRESS = 1.0;
const DYNO_MIN_UPPER_DELTA_Y = 20;
const DYNO_AIM_DRIFT_LIMIT_PX = 48;

// Grounded climbing move tuning (strictly zero upward Impulse Y; climbing relies on CoM translation & limb constraints)
const HIGH_STEP_MIN_LIFT_PX = 20;
const HIGH_STEP_COOLDOWN_SEC = 2.2;

const SWING_IMPULSE_X = 8;
const SWING_MAX_VEL_X = 48;

// Mandatory pointer-move physical impulse threshold & airborne torsoVel.y mutation guards
const POINTER_IMPULSE_MAX_DELTA_Y = 0; // Vertical velocity increments are absorbed by physics constraints
const POINTER_IMPULSE_MAX_DELTA_X = 4;
const POINTER_RELEASE_MAX_TORSO_VY = 32;
const POINTER_IMPULSE_COOLDOWN_MS = 90;
const FALL_DYNO_MAX_POS_VY_SPIKE = 12;

type GrabAttemptOptions = {
  isDyno?: boolean;
  dynoCharge?: DynoChargeState | null;
};

function getDynamicDynoExtraReach(climber: ClimberState, holdsMap: Map<string, Hold>): number {
  return Math.min(
    18,
    (isStandingOnSpringHold(climber, holdsMap) ? 14 : 0) +
      ((climber.swingBoostTimer ?? 0) > 0 ? 8 : 0)
  );
}

function isValidHandDynoTarget(
  climber: ClimberState,
  holdsMap: Map<string, Hold>,
  limbId: LimbId,
  hold: Hold
): boolean {
  if (climber.isFalling || climber.dynoFlight || hold.broken) return false;
  const limb = climber.limbs[limbId];
  // Strictly hand-only and must target a higher hold meaningfully above torso
  if (!limb.isHand) return false;
  if (hold.y > climber.torsoPos.y - DYNO_MIN_UPPER_DELTA_Y) return false;
  // Already reachable holds must always execute normal grabs, never Dyno
  if (evaluateHoldGrab(climber, limbId, hold).ok) return false;
  const extraReach = getDynamicDynoExtraReach(climber, holdsMap);
  return isDynoReachable(climber, limbId, hold, extraReach);
}

function loadSavedBadges(): Set<RouteId> {
  try {
    const raw = window.localStorage.getItem(BADGES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    const validIds = new Set(ROUTES.map((r) => r.id));
    const result = new Set<RouteId>();
    for (const item of parsed) {
      const mapped = LEGACY_BADGE_MAP[item] ?? (item as RouteId);
      if (validIds.has(mapped)) {
        result.add(mapped);
      }
    }
    return result;
  } catch {
    return new Set();
  }
}

function loadSavedStyles(): Record<string, ClimbStyle> {
  try {
    const raw = window.localStorage.getItem(STYLES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ClimbStyle>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadSavedFreeSoloRoutes(): Set<RouteId> {
  try {
    const raw = window.localStorage.getItem(FREE_SOLO_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    const validIds = new Set(ROUTES.map((r) => r.id));
    return new Set(parsed.filter((id): id is RouteId => validIds.has(id as RouteId)));
  } catch {
    return new Set();
  }
}

function loadDailyCompleted(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function loadSavedSkin(): ClimberSkinId {
  try {
    const raw = window.localStorage.getItem(SKIN_STORAGE_KEY) as ClimberSkinId | null;
    if (raw && CLIMBER_SKINS.some((s) => s.id === raw)) return raw;
    return 'alpine-orange';
  } catch {
    return 'alpine-orange';
  }
}

function loadSavedClimberName(): string {
  try {
    const raw = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (raw && raw.trim().length > 0) return raw.trim().slice(0, 12);
    return '孤影';
  } catch {
    return '孤影';
  }
}

function loadSavedClimberGender(): ClimberGender {
  try {
    const raw = window.localStorage.getItem(GENDER_STORAGE_KEY);
    return raw === 'female' ? 'female' : 'male';
  } catch {
    return 'male';
  }
}

const HOLD_LABELS: Record<Hold['type'], string> = {
  jug: '稳固抓点',
  crack: '岩缝支点',
  crimp: '小指点(费力)',
  ice: '冰霜岩面(易滑)',
  fragile: '风化脆岩(易碎)',
  ledge: '安全平台',
  spring: '蹬跃踏点(弹射增距)',
  swing: '摆荡抓点(甩抓回耐)',
  tremor: '颤动支点(踩踏震动)',
};

const GRIP_LABELS: Record<NonNullable<Hold['gripKind']>, string> = {
  downpull: '',
  sidepullLeft: '左侧拉(宜右倾)',
  sidepullRight: '右侧拉(宜左倾)',
  undercling: '反扣(宜高脚)',
};

function describeHold(h: Hold): string {
  const parts = [HOLD_LABELS[h.type]];
  const gripNote = h.gripKind ? GRIP_LABELS[h.gripKind] : '';
  if (gripNote) parts.push(gripNote);
  if (h.wet) parts.push('渗水湿滑');
  return parts.join(' · ');
}

function createInitialClimber(
  world: MountainWorld,
  loadoutId: LoadoutId
): ClimberState {
  const loadout =
    LOADOUT_OPTIONS.find((l) => l.id === loadoutId) ?? LOADOUT_OPTIONS[1];

  const findNearest = (x: number, y: number): Hold => {
    let best = world.holds[0];
    let bestD = Infinity;
    for (const h of world.holds) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  };

  const lh = findNearest(-22, -64);
  const rh = findNearest(22, -68);
  const lf = findNearest(-22, -22);
  const rf = findNearest(22, -24);

  const isFreeSolo = !!loadout.noProtection || loadout.id === 'free-solo';

  return {
    torsoPos: { x: 0, y: -42 },
    torsoVel: { x: 0, y: 0 },
    leanAngle: 0,
    leanBias: 0,
    pelvisOffset: { x: 0, y: 0 },
    hipTwist: 0,
    wallHug: 0.5,
    lookAngle: 0,
    stamina: 100,
    maxStamina: 100,
    chalk: isFreeSolo ? 0 : 78,
    chalkUses: isFreeSolo ? 0 : Math.max(1, world.route.chalkUses + loadout.chalkDelta),
    pitonsLeft: isFreeSolo ? 0 : Math.max(1, world.route.pitons + loadout.pitonDelta),
    health: 100,
    isFalling: false,
    isResting: true,
    isStemming: false,
    ropeCatch: null,
    lastCheckpointY: 0,
    lastCheckpointX: 0,
    routeHistory: [{ x: 0, y: -42 }],
    limbs: {
      leftHand: {
        id: 'leftHand',
        label: '左手',
        isHand: true,
        isLeft: true,
        pos: { x: lh.x, y: lh.y },
        targetPos: { x: lh.x, y: lh.y },
        startPos: { x: lh.x, y: lh.y },
        reachT: 1,
        holdId: lh.id,
        load: 0,
        strain: 0,
        jitter: { x: 0, y: 0 },
      },
      rightHand: {
        id: 'rightHand',
        label: '右手',
        isHand: true,
        isLeft: false,
        pos: { x: rh.x, y: rh.y },
        targetPos: { x: rh.x, y: rh.y },
        startPos: { x: rh.x, y: rh.y },
        reachT: 1,
        holdId: rh.id,
        load: 0,
        strain: 0,
        jitter: { x: 0, y: 0 },
      },
      leftFoot: {
        id: 'leftFoot',
        label: '左脚',
        isHand: false,
        isLeft: true,
        pos: { x: lf.x, y: lf.y },
        targetPos: { x: lf.x, y: lf.y },
        startPos: { x: lf.x, y: lf.y },
        reachT: 1,
        holdId: lf.id,
        load: 0,
        strain: 0,
        jitter: { x: 0, y: 0 },
      },
      rightFoot: {
        id: 'rightFoot',
        label: '右脚',
        isHand: false,
        isLeft: false,
        pos: { x: rf.x, y: rf.y },
        targetPos: { x: rf.x, y: rf.y },
        startPos: { x: rf.x, y: rf.y },
        reachT: 1,
        holdId: rf.id,
        load: 0,
        strain: 0,
        jitter: { x: 0, y: 0 },
      },
    },
  };
}

function findTutorialHighlightHold(
  step: number,
  climber: ClimberState,
  world: MountainWorld,
  reachableIds: Set<string>
): string | null {
  if (step === 0) {
    let best: Hold | null = null;
    for (const h of world.holds) {
      if (!reachableIds.has(h.id)) continue;
      if (h.y < climber.torsoPos.y - 36) {
        if (!best || h.y < best.y) best = h;
      }
    }
    return best?.id ?? null;
  }
  if (step === 1) {
    const lowestFootY = Math.max(
      climber.limbs.leftFoot.pos.y,
      climber.limbs.rightFoot.pos.y
    );
    let best: Hold | null = null;
    for (const h of world.holds) {
      if (!reachableIds.has(h.id)) continue;
      if (h.y >= climber.torsoPos.y - 8 && h.y < lowestFootY - 12) {
        if (!best || h.y < best.y) best = h;
      }
    }
    return best?.id ?? null;
  }
  return null;
}

function pickTacticalHint(
  climber: ClimberState,
  world: MountainWorld,
  weather: ActiveWeather,
  pitons: Piton[],
  reachableIds: Set<string>
): string {
  const { leftHand, rightHand, leftFoot, rightFoot } = climber.limbs;
  const anchored = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
    (id) => climber.limbs[id].holdId !== null
  );
  const feetAnchored = (leftFoot.holdId ? 1 : 0) + (rightFoot.holdId ? 1 : 0);

  if (feetAnchored < 2 && anchored.length <= 3) {
    return '战术提示 · 双脚未踩稳会剧增手臂负荷，优先将悬空脚踩上附近岩点';
  }

  const generalReach =
    reachableIds.size > 0
      ? reachableIds
      : getReachableHoldIds(climber, world.holds, null);

  if (generalReach.size === 0) {
    const canDynoUp = world.holds.some(
      (h) =>
        !h.broken &&
        h.y < climber.torsoPos.y - 24 &&
        (isDynoReachable(climber, 'leftHand', h) ||
          isDynoReachable(climber, 'rightHand', h))
    );
    return canDynoUp
      ? '上方点偏远：拖腰顶髋，或拖手稳定悬停上方点蓄满跃抓'
      : '当前上方暂不可及：先抬高双脚，或拖动腰部移重心';
  }

  const upcomingHolds = world.holds.filter(
    (h) =>
      !h.broken &&
      h.y < climber.torsoPos.y + 12 &&
      h.y > climber.torsoPos.y - 118 &&
      Math.abs(h.x - climber.torsoPos.x) < 120
  );
  const nearbyDirectional = upcomingHolds.find(
    (h) =>
      h.gripKind === 'sidepullLeft' ||
      h.gripKind === 'sidepullRight' ||
      h.gripKind === 'undercling'
  );
  if (nearbyDirectional?.gripKind === 'sidepullLeft') {
    return '战术提示 · 前方为左侧拉点：拖动腰部安全带向右倾压，更容易稳稳锁住';
  }
  if (nearbyDirectional?.gripKind === 'sidepullRight') {
    return '战术提示 · 前方为右侧拉点：拖动腰部安全带向左倾压，更容易稳稳锁住';
  }
  if (nearbyDirectional?.gripKind === 'undercling') {
    return '战术提示 · 前方为反扣点：需先将双脚踩高顶稳，再借重心下压锁死抓点';
  }

  if (climber.stamina < 45 && anchored.length >= 3 && feetAnchored >= 1) {
    return '战术提示 · 手臂耐力偏低：三点稳固时可点上方「单手甩臂回耐」快速喘息';
  }

  const hasWetOrIceNear = upcomingHolds.some((h) => h.wet || h.type === 'ice');
  if (
    climber.chalk < 28 &&
    climber.chalkUses > 0 &&
    (weather.type === 'rain' || hasWetOrIceNear)
  ) {
    return '战术提示 · 岩面湿滑且镁粉见底：抓握前点右下「镁粉」避免指尖打滑';
  }

  const hasClosePiton = pitons.some(
    (p) =>
      p.integrity > 0 &&
      Math.hypot(p.x - climber.torsoPos.x, p.y - climber.torsoPos.y) <= 130
  );
  if (climber.pitonsLeft > 0 && !hasClosePiton && climber.torsoPos.y < -120) {
    return '战术提示 · 距上一枚岩钉已较远，难点路段前先点右下「岩钉」做保护';
  }

  if (upcomingHolds.some((h) => h.type === 'fragile')) {
    return '战术提示 · 周边存在风化脆岩(橙色)：避免久踩停靠，优先选择绿稳/蓝缝';
  }

  return isRouteBookSupported(world.route)
    ? '战术提示 · 难点路段可开启「路书·读线」提前规划抓点顺序'
    : '战术提示 · 观察上方绿稳/蓝缝支点，先抬高双脚再稳步伸手';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dailyRoute = useMemo(() => getDailyChallengeRoute(), []);

  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('intermediate');
  const [selectedLoadout, setSelectedLoadout] = useState<LoadoutId>('balanced');
  const [selectedSkin, setSelectedSkin] = useState<ClimberSkinId>(() => loadSavedSkin());
  const [climberName, setClimberName] = useState<string>(() => loadSavedClimberName());
  const [climberGender, setClimberGender] = useState<ClimberGender>(() => loadSavedClimberGender());
  const [completedRoutes, setCompletedRoutes] = useState<Set<RouteId>>(() =>
    loadSavedBadges()
  );
  const [bestStyles, setBestStyles] = useState<Record<string, ClimbStyle>>(() =>
    loadSavedStyles()
  );
  const [freeSoloRoutes, setFreeSoloRoutes] = useState<Set<RouteId>>(() =>
    loadSavedFreeSoloRoutes()
  );
  const [dailyCompleted, setDailyCompleted] = useState<Set<string>>(() =>
    loadDailyCompleted()
  );
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(false);
  const [achievedStyle, setAchievedStyle] = useState<ClimbStyle>('summit');

  const selectedLoadoutRef = useRef<LoadoutId>('balanced');
  const selectedSkinRef = useRef<ClimberSkinId>(selectedSkin);
  const climberGenderRef = useRef<ClimberGender>(climberGender);
  const displayClimberName = climberName.trim() || '孤影';

  const worldRef = useRef<MountainWorld>(generateMountain(getRouteById('intermediate')));
  const weatherRef = useRef<ActiveWeather>(
    getWeatherAtAltitude(worldRef.current, 0, 0)
  );
  const lastWeatherTypeRef = useRef<string>('clear');
  const holdsMapRef = useRef<Map<string, Hold>>(new Map());
  const climberRef = useRef<ClimberState>(
    createInitialClimber(worldRef.current, 'balanced')
  );
  const pitonsRef = useRef<Piton[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const reachableIdsRef = useRef<Set<string>>(new Set());
  const cameraRef = useRef<CameraState>({
    x: 0,
    y: -120,
    zoom: 0.9,
    targetX: 0,
    targetY: -100,
    targetZoom: 0.95,
    shake: 0,
  });

  const phaseRef = useRef<GamePhase>('TITLE_MENU');
  const lockedLimbRef = useRef<LimbId | null>(null);
  const hoverRef = useRef<HoverInfo | null>(null);
  const tutorialRef = useRef<TutorialState>({
    active: false,
    variant: undefined,
    step: 0,
    highlightHoldId: null,
  });
  const statsRef = useRef<ClimbStats>({
    altitudeM: 0,
    maxAltitudeM: 0,
    elapsedSec: 0,
    pitonsPlaced: 0,
    fallsCaught: 0,
    movesMade: 0,
    staminaSpent: 0,
    staminaRecovered: 0,
    staminaSamplesSum: 0,
    staminaSampleCount: 0,
    keyActionAttempts: 0,
    keyActionErrors: 0,
    betaPinsPlanned: 0,
    betaPinsFollowed: 0,
    roadbookFlowHits: 0,
  });

  const usedRouteReadRef = useRef(false);
  const routeEventsRef = useRef<ClimbEvent[]>([]);
  const dynoChargeRef = useRef<DynoChargeState | null>(null);
  const trailPlaybackProgressRef = useRef<number | null>(null);
  const isPlayingTrailRef = useRef(false);
  const heartbeatAccRef = useRef(0);
  const breathAccRef = useRef(1.2);
  const dynoFullNotifiedRef = useRef(false);
  const avalancheTimerRef = useRef(16);
  const rockEchoTimerRef = useRef(7.5);
  const betaPinsRef = useRef<string[]>([]);
  const betaCursorRef = useRef<number>(0);
  const attemptGrabbedHoldIdsRef = useRef<string[]>([]);
  const attemptHealthDropsRef = useRef<RoadbookHealthDropRecord[]>([]);
  const attemptMinHealthRef = useRef<number>(100);
  const attemptMinStaminaRef = useRef<number>(100);
  const lastStaminaWarnPosRef = useRef<Vec2 | null>(null);
  const attemptRecordedRef = useRef<boolean>(false);
  const roadbookRecordRef = useRef<RouteRoadbookRecord | null>(null);
  const showAttemptReviewRef = useRef<boolean>(true);
  const lastSlipNoteRef = useRef<string | null>(null);
  const lastLimbTapRef = useRef<{ limbId: LimbId; time: number } | null>(null);
  const staminaRateRef = useRef(0);
  const roadbookFlowTimerRef = useRef(0);
  const manualPelvisTimerRef = useRef(0);
  const flowComboRef = useRef(0);
  const lastMoveElapsedRef = useRef(-10);
  const lastHighStepElapsedRef = useRef(-10);
  const weatherIncidentRef = useRef<WeatherIncidentState | null>(null);
  const incidentCooldownRef = useRef(15);
  const lastIncidentTypeRef = useRef<WeatherIncidentType | null>(null);
  const incidentAppliedWetRef = useRef(false);
  const tremorSoundAccRef = useRef(0);
  const ropeCatchTimeRef = useRef(0);

  const stallTimerRef = useRef(0);
  const failSpotsByRouteRef = useRef<Record<string, number[]>>({});
  const warnedFailBandsRef = useRef<Set<number>>(new Set());
  const cruxWarnedBinsRef = useRef<Set<number>>(new Set());
  const lastHintElapsedRef = useRef(-30);
  const hintEvalAccRef = useRef(0);
  const hintHideTimerRef = useRef<number | null>(null);
  const tutorialAutoHideTimerRef = useRef<number | null>(null);

  const summitProgressRef = useRef(0);
  const summitStageRef = useRef<SummitSequenceStage>('PAN_REVEAL');
  const summitCamStartRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const fallStartYRef = useRef(0);
  const fallStartPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const pointerDownPosRef = useRef<Vec2 | null>(null);
  const peekPointerIdRef = useRef<number | null>(null);
  const activeLimbDragRef = useRef<LimbDragState | null>(null);
  const activePelvisDragRef = useRef<PelvisDragState | null>(null);
  const isDraggingPeekRef = useRef(false);
  const peekOffsetYRef = useRef(0);
  const isReadingRouteRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);
  const lastPointerImpulseMsRef = useRef(0);
  const lastSafeTorsoVelYRef = useRef(0);

  // 3-Second "岩间静谧" Pre-Climb Intro Cutscene + Dynamic Pacing / Micro-Weather Refs
  const INTRO_DURATION_SEC = 3.0;
  const introCutsceneRef = useRef<{
    active: boolean;
    elapsedSec: number;
    pendingRoadbook: boolean;
    startCamY: number;
    startZoom: number;
  }>({
    active: false,
    elapsedSec: 0,
    pendingRoadbook: false,
    startCamY: -220,
    startZoom: 0.72,
  });
  const microWindowRef = useRef<MicroWeatherWindow | null>(null);
  const microWindowCooldownRef = useRef(18);
  const activePitchIndexRef = useRef(0);
  const pitchBannerTimerRef = useRef<number | null>(null);
  const dynoChargeTickAccRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [introElapsed, setIntroElapsed] = useState<number | null>(null);
  const [pitchBanner, setPitchBanner] = useState<{
    name: string;
    subtitle: string;
    isCrux?: boolean;
    index: number;
  } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [activeDragReason, setActiveDragReason] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>(tutorialRef.current);
  const [tacticalHint, setTacticalHint] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [isReadingRoute, setIsReadingRoute] = useState(false);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [summitProgress, setSummitProgress] = useState(0);
  const [summitStage, setSummitStage] = useState<SummitSequenceStage>('PAN_REVEAL');
  const [betaPins, setBetaPins] = useState<string[]>([]);
  const [betaCursor, setBetaCursor] = useState(0);
  const [roadbookRecord, setRoadbookRecord] = useState<RouteRoadbookRecord | null>(null);
  const [showAttemptReview, setShowAttemptReview] = useState(true);
  const [fallDiagnosis, setFallDiagnosis] = useState<string | null>(null);
  const [climbAssessment, setClimbAssessment] = useState<ClimbAssessment | null>(null);
  const [, setHudTick] = useState(0);

  // Development-mode transparent physics debug overlay state (completely disabled in production)
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const physicsDebugTrackerRef = useRef(createPhysicsDebugTracker());
  const [showPhysicsDebug, setShowPhysicsDebug] = useState<boolean>(() => import.meta.env.DEV);
  const showPhysicsDebugRef = useRef<boolean>(import.meta.env.DEV);

  useEffect(() => {
    showPhysicsDebugRef.current = showPhysicsDebug;
  }, [showPhysicsDebug]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onDebugHotkey = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowPhysicsDebug((v) => !v);
      }
    };
    window.addEventListener('keydown', onDebugHotkey);
    return () => window.removeEventListener('keydown', onDebugHotkey);
  }, []);

  useEffect(() => {
    selectedLoadoutRef.current = selectedLoadout;
  }, [selectedLoadout]);

  useEffect(() => {
    selectedSkinRef.current = selectedSkin;
    preloadCharacterArtPack(selectedSkin);
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, selectedSkin);
    } catch {
      // Ignore storage error
    }
  }, [selectedSkin]);

  useEffect(() => {
    try {
      const normalized = climberName.trim().slice(0, 12);
      if (normalized) {
        window.localStorage.setItem(NAME_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(NAME_STORAGE_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }, [climberName]);

  useEffect(() => {
    climberGenderRef.current = climberGender;
    try {
      window.localStorage.setItem(GENDER_STORAGE_KEY, climberGender);
    } catch {
      // Ignore storage error
    }
  }, [climberGender]);

  useEffect(() => {
    preloadArtPackForRoute(worldRef.current.route);
    const map = new Map<string, Hold>();
    worldRef.current.holds.forEach((h) => map.set(h.id, h));
    holdsMapRef.current = map;
    reachableIdsRef.current = getReachableHoldIds(
      climberRef.current,
      worldRef.current.holds,
      null
    );
  }, []);

  const recordSummitSuccess = useCallback((route: RouteConfig, fallsCaught: number): ClimbStyle => {
    const style: ClimbStyle =
      !usedRouteReadRef.current && fallsCaught === 0
        ? 'onsight'
        : fallsCaught === 0
          ? 'redpoint'
          : 'summit';
    setAchievedStyle(style);

    setCompletedRoutes((prev) => {
      const wasNew = !prev.has(route.id);
      setNewlyUnlockedBadge(wasNew);
      if (!wasNew) return prev;
      const next = new Set(prev);
      next.add(route.id);
      try {
        window.localStorage.setItem(
          BADGES_STORAGE_KEY,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });

    setBestStyles((prev) => {
      const existing = prev[route.id];
      if (existing && STYLE_RANK[existing] >= STYLE_RANK[style]) {
        return prev;
      }
      const next = { ...prev, [route.id]: style };
      try {
        window.localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });

    if (selectedLoadoutRef.current === 'free-solo') {
      setFreeSoloRoutes((prev) => {
        if (prev.has(route.id)) return prev;
        const next = new Set(prev);
        next.add(route.id);
        try {
          window.localStorage.setItem(
            FREE_SOLO_STORAGE_KEY,
            JSON.stringify(Array.from(next))
          );
        } catch {
          // Ignore storage error
        }
        return next;
      });
    }

    if (route.isDailyChallenge && route.dailyDateKey) {
      const dateKey = route.dailyDateKey;
      setDailyCompleted((prev) => {
        if (prev.has(dateKey)) return prev;
        const next = new Set(prev);
        next.add(dateKey);
        try {
          window.localStorage.setItem(
            DAILY_STORAGE_KEY,
            JSON.stringify(Array.from(next))
          );
        } catch {
          // Ignore storage error
        }
        return next;
      });
    }
    return style;
  }, []);

  const showBanner = useCallback((msg: string, ms = 2200) => {
    setStatusBanner(msg);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setStatusBanner(null);
    }, ms);
  }, []);

  const dismissTacticalHint = useCallback(() => {
    setTacticalHint(null);
    if (hintHideTimerRef.current) {
      window.clearTimeout(hintHideTimerRef.current);
      hintHideTimerRef.current = null;
    }
  }, []);

  const showTacticalHint = useCallback((msg: string, ms = 6800) => {
    setTacticalHint(msg);
    lastHintElapsedRef.current = statsRef.current.elapsedSec;
    if (hintHideTimerRef.current) window.clearTimeout(hintHideTimerRef.current);
    hintHideTimerRef.current = window.setTimeout(() => {
      setTacticalHint(null);
    }, ms);
  }, []);

  const scheduleTutorialAutoFinish = useCallback((ms = 5500) => {
    if (tutorialAutoHideTimerRef.current) {
      window.clearTimeout(tutorialAutoHideTimerRef.current);
    }
    tutorialAutoHideTimerRef.current = window.setTimeout(() => {
      const doneTut: TutorialState = {
        active: false,
        variant: tutorialRef.current.variant,
        step: tutorialRef.current.step,
        highlightHoldId: null,
      };
      tutorialRef.current = doneTut;
      setTutorial(doneTut);
    }, ms);
  }, []);

  const advanceAdvancedTutorial = useCallback(
    (action: 'release' | 'pelvis' | 'grab_or_shake') => {
      const cur = tutorialRef.current;
      if (!cur.active || cur.variant !== 'advanced') return;

      if (cur.step === 0 && action === 'release') {
        const next: TutorialState = {
          active: true,
          variant: 'advanced',
          step: 1,
          highlightHoldId: null,
        };
        tutorialRef.current = next;
        setTutorial(next);
      } else if (cur.step === 1 && action === 'pelvis') {
        const next: TutorialState = {
          active: true,
          variant: 'advanced',
          step: 2,
          highlightHoldId: null,
        };
        tutorialRef.current = next;
        setTutorial(next);
      } else if (cur.step === 2 && action === 'grab_or_shake') {
        const next: TutorialState = {
          active: true,
          variant: 'advanced',
          step: 3,
          highlightHoldId: null,
        };
        tutorialRef.current = next;
        setTutorial(next);
        scheduleTutorialAutoFinish(5800);
      }
    },
    [scheduleTutorialAutoFinish]
  );

  const spawnParticles = useCallback(
    (
      x: number,
      y: number,
      count: number,
      kind: Particle['kind'],
      color: string,
      speed = 60
    ) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * speed;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (kind === 'chalk' ? 10 : 0),
          size:
            kind === 'ring'
              ? 6
              : kind === 'chalk'
                ? 3 + Math.random() * 4
                : 2 + Math.random() * 2.5,
          life: kind === 'ring' ? 0.35 : 0.45 + Math.random() * 0.38,
          maxLife: kind === 'ring' ? 0.35 : 0.83,
          color,
          outline: kind === 'dust',
          kind,
        });
      }
    },
    []
  );

  const recordCurrentAttempt = useCallback(
    (outcome: 'FALLEN' | 'SUMMIT' | 'ABORTED', diagnosis?: string | null) => {
      const route = worldRef.current.route;
      if (!isRouteBookSupported(route)) return;
      if (attemptRecordedRef.current) return;
      if (outcome === 'ABORTED' && statsRef.current.movesMade < 2) return;

      attemptRecordedRef.current = true;
      const climber = climberRef.current;
      const routeKey = getRouteRoadbookKey(route);
      const baseRecord = roadbookRecordRef.current ?? loadRouteRoadbookRecord(route);
      const now = Date.now();

      const resolvedFallPos: Vec2 | undefined =
        outcome === 'FALLEN'
          ? fallStartPosRef.current.y < -8
            ? {
                x: Math.round(fallStartPosRef.current.x),
                y: Math.round(fallStartPosRef.current.y),
              }
            : { x: Math.round(climber.torsoPos.x), y: Math.round(climber.torsoPos.y) }
          : undefined;

      const rawTrail = downsampleTrail(climber.routeHistory, 120);
      if (resolvedFallPos) {
        const lastPt = rawTrail[rawTrail.length - 1];
        if (!lastPt || Math.hypot(lastPt.x - resolvedFallPos.x, lastPt.y - resolvedFallPos.y) > 10) {
          rawTrail.push(resolvedFallPos);
        }
      }

      const review: RoadbookAttemptReview = {
        timestamp: now,
        outcome,
        maxAltitudeM: Number(statsRef.current.maxAltitudeM.toFixed(1)),
        routeHeightM: route.heightM,
        movesMade: statsRef.current.movesMade,
        elapsedSec: Math.round(statsRef.current.elapsedSec),
        fallPos: resolvedFallPos,
        fallDiagnosis: diagnosis ?? null,
        trail: rawTrail,
        grabbedHoldIds: attemptGrabbedHoldIdsRef.current.slice(-160),
        events: routeEventsRef.current.slice(-40),
        plannedPinsSnapshot: [...betaPinsRef.current],
        finalHealth: Math.round(climber.health),
        minHealth: Math.round(Math.min(attemptMinHealthRef.current, climber.health)),
        minStamina: Math.round(Math.min(attemptMinStaminaRef.current, climber.stamina)),
        healthDrops: attemptHealthDropsRef.current.slice(-32),
      };

      const nextHotspots: RoadbookFallHotspot[] = [...(baseRecord.fallHotspots ?? [])];
      if (resolvedFallPos) {
        const fallAltM = Number(Math.max(0, -resolvedFallPos.y / PIXELS_PER_METER).toFixed(1));
        const clusterIdx = nextHotspots.findIndex(
          (spot) => Math.hypot(spot.x - resolvedFallPos.x, spot.y - resolvedFallPos.y) <= 78
        );
        if (clusterIdx >= 0) {
          const prev = nextHotspots[clusterIdx];
          const nextCount = prev.count + 1;
          nextHotspots[clusterIdx] = {
            x: Math.round((prev.x * prev.count + resolvedFallPos.x) / nextCount),
            y: Math.round((prev.y * prev.count + resolvedFallPos.y) / nextCount),
            altitudeM: Number(((prev.altitudeM * prev.count + fallAltM) / nextCount).toFixed(1)),
            count: nextCount,
            lastTimestamp: now,
          };
        } else {
          nextHotspots.push({
            x: resolvedFallPos.x,
            y: resolvedFallPos.y,
            altitudeM: fallAltM,
            count: 1,
            lastTimestamp: now,
          });
        }
        nextHotspots.sort((a, b) => b.count - a.count || b.lastTimestamp - a.lastTimestamp);
        if (nextHotspots.length > 8) {
          nextHotspots.length = 8;
        }
      }

      const updated: RouteRoadbookRecord = {
        ...baseRecord,
        lastAttempt: review,
        fallHotspots: nextHotspots,
      };
      roadbookRecordRef.current = updated;
      setRoadbookRecord(updated);
      saveRouteRoadbookRecord(routeKey, updated);
    },
    []
  );

  const startRoute = useCallback(
    (
      route: RouteConfig,
      options?: { skipIntro?: boolean; openRoadbookAtY?: number }
    ) => {
      // Preserve mid-climb trace for roadbook review if restarting the same route
      if (
        phaseRef.current === 'PLAYING' &&
        worldRef.current.route.id === route.id &&
        statsRef.current.movesMade >= 2
      ) {
        recordCurrentAttempt('ABORTED');
      }

      soundEngine.init();
      setSelectedRouteId(route.id);

      const freshWorld = generateMountain(route);
      worldRef.current = freshWorld;
      weatherRef.current = getWeatherAtAltitude(freshWorld, 0, 0);
      lastWeatherTypeRef.current = weatherRef.current.type;
      setNewlyUnlockedBadge(false);
      const map = new Map<string, Hold>();
      freshWorld.holds.forEach((h) => map.set(h.id, h));
      holdsMapRef.current = map;

      const activeLoadout =
        LOADOUT_OPTIONS.find((l) => l.id === selectedLoadoutRef.current) ??
        LOADOUT_OPTIONS[1];
      const isFreeSolo = !!activeLoadout.noProtection;

      const freshClimber = createInitialClimber(freshWorld, selectedLoadoutRef.current);
      climberRef.current = freshClimber;
      fallStartYRef.current = freshClimber.torsoPos.y;
      fallStartPosRef.current = { x: freshClimber.torsoPos.x, y: freshClimber.torsoPos.y };
      pitonsRef.current = isFreeSolo ? [] : freshWorld.rustyPitons.map((p) => ({ ...p }));
      particlesRef.current = [];
      const initialLimb: LimbId | null = null;
      lockedLimbRef.current = initialLimb;
      hoverRef.current = null;
      dynoChargeRef.current = null;
      activeLimbDragRef.current = null;
      activePelvisDragRef.current = null;
      setActiveDragReason(null);
      usedRouteReadRef.current = false;
      routeEventsRef.current = [];

      const supportsBook = isRouteBookSupported(route);
      const loadedRecord = supportsBook ? loadRouteRoadbookRecord(route) : null;
      const validSavedPins = loadedRecord
        ? loadedRecord.savedPins.filter((id) => map.has(id))
        : [];
      roadbookRecordRef.current = loadedRecord;
      setRoadbookRecord(loadedRecord);
      betaPinsRef.current = validSavedPins;
      setBetaPins(validSavedPins);
      betaCursorRef.current = 0;
      setBetaCursor(0);
      attemptGrabbedHoldIdsRef.current = [];
      attemptHealthDropsRef.current = [];
      attemptMinHealthRef.current = freshClimber.health;
      attemptMinStaminaRef.current = freshClimber.stamina;
      lastStaminaWarnPosRef.current = null;
      attemptRecordedRef.current = false;
      const hasPrevAttempt = Boolean(loadedRecord?.lastAttempt);
      showAttemptReviewRef.current = hasPrevAttempt;
      setShowAttemptReview(hasPrevAttempt);

      lastSlipNoteRef.current = null;
      setFallDiagnosis(null);
      trailPlaybackProgressRef.current = null;
      isPlayingTrailRef.current = false;
      setIsPlayingTrail(false);
      summitProgressRef.current = 0;
      summitStageRef.current = 'PAN_REVEAL';
      summitCamStartRef.current = null;
      setSummitProgress(0);
      setSummitStage('PAN_REVEAL');
      preloadArtPackForRoute(route);

      const enterRoadbookDirectly = Boolean(options?.skipIntro && supportsBook);
      isReadingRouteRef.current = enterRoadbookDirectly;
      peekPointerIdRef.current = null;
      pointerDownPosRef.current = null;
      isDraggingPeekRef.current = false;
      setIsReadingRoute(enterRoadbookDirectly);

      const reachSet = getReachableHoldIds(freshClimber, freshWorld.holds, initialLimb);
      reachableIdsRef.current = reachSet;

      if (tutorialAutoHideTimerRef.current) {
        window.clearTimeout(tutorialAutoHideTimerRef.current);
        tutorialAutoHideTimerRef.current = null;
      }
      if (pitchBannerTimerRef.current) {
        window.clearTimeout(pitchBannerTimerRef.current);
        pitchBannerTimerRef.current = null;
      }
      stallTimerRef.current = 0;
      cruxWarnedBinsRef.current = new Set();
      warnedFailBandsRef.current = new Set();
      lastHintElapsedRef.current = -30;
      lastLimbTapRef.current = null;
      staminaRateRef.current = 0;
      roadbookFlowTimerRef.current = 0;
      manualPelvisTimerRef.current = 0;
      flowComboRef.current = 0;
      lastMoveElapsedRef.current = -10;
      lastHighStepElapsedRef.current = -10;
      weatherIncidentRef.current = null;
      incidentCooldownRef.current = 15;
      lastIncidentTypeRef.current = null;
      incidentAppliedWetRef.current = false;
      microWindowRef.current = null;
      microWindowCooldownRef.current = 16;
      activePitchIndexRef.current = 0;
      setPitchBanner(null);
      dynoChargeTickAccRef.current = 0;
      tremorSoundAccRef.current = 0;
      heartbeatAccRef.current = 0;
      breathAccRef.current = 1.4;
      dynoFullNotifiedRef.current = false;
      avalancheTimerRef.current = route.palette === 'glacial' ? 11 : 17;
      rockEchoTimerRef.current = 6.5;
      stopHaptic();
      dismissTacticalHint();

      const tutVariant: TutorialState['variant'] | undefined =
        route.id === 'kids' ? 'basic' : route.id === 'intro' ? 'advanced' : undefined;
      const tutActive = tutVariant !== undefined;
      const tutState: TutorialState = {
        active: tutActive,
        variant: tutVariant,
        step: 0,
        highlightHoldId:
          tutVariant === 'basic'
            ? findTutorialHighlightHold(0, freshClimber, freshWorld, reachSet)
            : null,
      };
      tutorialRef.current = tutState;
      setTutorial(tutState);

      const baseZoom = Math.min(1.04, Math.max(0.7, window.innerWidth / 440));
      if (enterRoadbookDirectly) {
        const baseCamY = freshClimber.torsoPos.y - 42;
        const minPeek = -(freshWorld.mountainHeight + freshClimber.torsoPos.y + 40);
        const targetPeek =
          typeof options?.openRoadbookAtY === 'number'
            ? Math.max(minPeek, Math.min(120, options.openRoadbookAtY - baseCamY))
            : 0;
        peekOffsetYRef.current = targetPeek;
        const initY = baseCamY + targetPeek;
        cameraRef.current = {
          x: 0,
          y: initY,
          zoom: baseZoom,
          targetX: 0,
          targetY: initY,
          targetZoom: baseZoom,
          shake: 0,
        };
        introCutsceneRef.current = {
          active: false,
          elapsedSec: INTRO_DURATION_SEC,
          pendingRoadbook: false,
          startCamY: initY,
          startZoom: baseZoom,
        };
        setIntroElapsed(null);
        showBanner(
          hasPrevAttempt
            ? '复盘模式 · 红色为坠落热点，黄色为体力/耐力风险区，可直接修改路书并存档'
            : '路书读线 · 点击岩点编排路线并存档',
          2800
        );
      } else {
        peekOffsetYRef.current = 0;
        const introStartZoom = baseZoom * 0.82;
        const introStartY = -Math.min(270, Math.max(200, freshWorld.mountainHeight * 0.25));
        cameraRef.current = {
          x: 0,
          y: introStartY,
          zoom: introStartZoom,
          targetX: 0,
          targetY: introStartY,
          targetZoom: introStartZoom,
          shake: 0,
        };
        introCutsceneRef.current = {
          active: true,
          elapsedSec: 0,
          pendingRoadbook: supportsBook,
          startCamY: introStartY,
          startZoom: introStartZoom,
        };
        setIntroElapsed(0);
        setStatusBanner(null);
        soundEngine.playStillnessIntro();
      }

      setFallDiagnosis(null);
      setClimbAssessment(null);
      statsRef.current = {
        altitudeM: 0,
        maxAltitudeM: 0,
        elapsedSec: 0,
        pitonsPlaced: 0,
        fallsCaught: 0,
        movesMade: 0,
        staminaSpent: 0,
        staminaRecovered: 0,
        staminaSamplesSum: 0,
        staminaSampleCount: 0,
        keyActionAttempts: 0,
        keyActionErrors: 0,
        betaPinsPlanned: validSavedPins.length,
        betaPinsFollowed: 0,
        roadbookFlowHits: 0,
      };

      phaseRef.current = 'PLAYING';
      setPhase('PLAYING');
      setHoverInfo(null);
      setSummitProgress(0);
      setHudTick((t) => t + 1);
    },
    [dismissTacticalHint, recordCurrentAttempt, showBanner]
  );

  const completeIntroCutscene = useCallback(() => {
    if (!introCutsceneRef.current.active) return;
    const { pendingRoadbook } = introCutsceneRef.current;
    introCutsceneRef.current.active = false;
    introCutsceneRef.current.elapsedSec = INTRO_DURATION_SEC;
    setIntroElapsed(null);

    const route = worldRef.current.route;
    const isFreeSolo = selectedLoadoutRef.current === 'free-solo';
    const tutVariant = tutorialRef.current.variant;
    const hasSaved = betaPinsRef.current.length > 0;
    const hasReview = Boolean(roadbookRecordRef.current?.lastAttempt);

    if (pendingRoadbook) {
      isReadingRouteRef.current = true;
      setIsReadingRoute(true);
    }

    // Snap camera target onto climber idle stance cleanly
    const responsiveZoom = Math.min(1.04, Math.max(0.7, window.innerWidth / 440));
    cameraRef.current.targetX = 0;
    cameraRef.current.targetY = -84;
    cameraRef.current.targetZoom = responsiveZoom;

    showBanner(
      pendingRoadbook
        ? hasSaved || hasReview
          ? `${route.tierLabel}（${route.grade}）· 已载入上次路书与复盘，可直接修改并存档`
          : isFreeSolo
            ? `${route.tierLabel}（${route.grade}）· 徒手开攀前读线：自定路书后开攀（无保护）`
            : `${route.tierLabel}（${route.grade}）· 开攀前读线：览壁辨岩并标定路书`
        : isFreeSolo
          ? `${route.tierLabel}（${route.grade}）· 徒手攀登：耗体-50%，无保护失败只能重头开始`
          : route.isDailyChallenge
            ? `每日挑战 · ${route.tierLabel}（${route.grade}）`
            : tutVariant === 'advanced'
              ? `${route.tierLabel}（${route.grade}）· 进阶教学：双击或拖离松手，拖动腰部移重心`
              : `${route.tierLabel}（${route.grade}）· 按住四肢关节拖向岩点抓握`,
      2900
    );
    setHudTick((t) => t + 1);
  }, [showBanner]);

  const handleToggleRouteRead = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || introCutsceneRef.current.active) return;
    if (!isRouteBookSupported(worldRef.current.route)) return;

    const next = !isReadingRouteRef.current;
    isReadingRouteRef.current = next;
    setIsReadingRoute(next);
    dynoChargeRef.current = null;
    activePelvisDragRef.current = null;
    if (activeLimbDragRef.current) {
      const dragged = climberRef.current.limbs[activeLimbDragRef.current.limbId];
      dragged.isDragging = false;
      if (dragged.holdId) {
        const kept = holdsMapRef.current.get(dragged.holdId);
        if (kept && !kept.broken) {
          dragged.pos = { x: kept.x, y: kept.y };
          dragged.targetPos = { x: kept.x, y: kept.y };
          dragged.reachT = 1;
        }
      }
      activeLimbDragRef.current = null;
      setActiveDragReason(null);
    }
    (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
      climberRef.current.limbs[id].isDragging = false;
    });
    peekPointerIdRef.current = null;
    pointerDownPosRef.current = null;
    isDraggingPeekRef.current = false;

    if (!next) {
      peekOffsetYRef.current = 0;
      hoverRef.current = null;
      setHoverInfo(null);
      showBanner(
        statsRef.current.movesMade === 0 ? '开始攀登！按路书稳步推进' : '继续攀爬',
        1400
      );
    } else {
      dismissTacticalHint();
      if (statsRef.current.movesMade > 0) {
        usedRouteReadRef.current = true;
      }
      // Preserve current camera position and zoom so holds never jump on enter; dragging still allowed
      showBanner('路书读线：上下滑屏或滚轮览壁，点岩点按序连线', 2600);
    }
  }, [dismissTacticalHint, showBanner]);

  const handleSelectLimb = useCallback((limb: LimbId | null) => {
    lockedLimbRef.current = limb;
    reachableIdsRef.current = getReachableHoldIds(
      climberRef.current,
      worldRef.current.holds,
      limb
    );
  }, []);

  const handleReleaseLimb = useCallback(
    (limbId: LimbId) => {
      if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;
      const limb = climber.limbs[limbId];
      if (!limb.holdId) return;

      const otherAnchored = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
        (id) => id !== limbId && climber.limbs[id].holdId !== null
      );
      const otherHands = otherAnchored.filter((id) => climber.limbs[id].isHand);
      if (!climber.isResting && (otherAnchored.length < 2 || otherHands.length === 0)) {
        showBanner('至少需保留 2 个支点且包含 1 只手才能独立松开', 1500);
        return;
      }

      limb.holdId = null;
      limb.isDragging = false;
      limb.reachT = 1;
      // Vertical velocity delta absorbed by overdamped physics solver (zero release spike)
      climber.torsoVel.y = Math.min(POINTER_RELEASE_MAX_TORSO_VY, Math.max(0, climber.torsoVel.y));
      climber.torsoVel.x = Math.max(-32, Math.min(32, climber.torsoVel.x + (limb.isLeft ? 4 : -4)));
      soundEngine.playLimbTick();
      triggerHapticPreset('tick');
      reachableIdsRef.current = getReachableHoldIds(
        climber,
        worldRef.current.holds,
        lockedLimbRef.current
      );
      stallTimerRef.current = 0;
      advanceAdvancedTutorial('release');
      showBanner(`${limb.label} 已独立松开`, 1300);
      setHudTick((t) => t + 1);
    },
    [advanceAdvancedTutorial, showBanner]
  );

  const handleSetLeanBias = useCallback(
    (bias: -1 | 0 | 1) => {
      if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;
      climber.leanBias = bias;
      climber.pelvisOffset = clampPelvisOffset({
        x: bias * 20,
        y: bias === 0 ? 0 : climber.pelvisOffset.y,
      });
      manualPelvisTimerRef.current = bias === 0 ? 0 : 3.2;
      soundEngine.playLimbTick();
      triggerHapticPreset('tick');
      reachableIdsRef.current = getReachableHoldIds(
        climber,
        worldRef.current.holds,
        lockedLimbRef.current
      );
      stallTimerRef.current = 0;
      if (bias !== 0) {
        advanceAdvancedTutorial('pelvis');
      }
      setHudTick((t) => t + 1);
    },
    [advanceAdvancedTutorial]
  );

  const handleClearBetaPins = useCallback(() => {
    betaPinsRef.current = [];
    setBetaPins([]);
    betaCursorRef.current = 0;
    setBetaCursor(0);
    soundEngine.playLimbTick();
    showBanner('已清空路书序列', 1300);
  }, [showBanner]);

  const handleUndoBetaPin = useCallback(() => {
    if (betaPinsRef.current.length === 0) return;
    const next = betaPinsRef.current.slice(0, -1);
    betaPinsRef.current = next;
    setBetaPins(next);
    const clampedCursor = Math.min(betaCursorRef.current, next.length);
    betaCursorRef.current = clampedCursor;
    setBetaCursor(clampedCursor);
    soundEngine.playLimbTick();
    showBanner(`已撤回至第 ${next.length} 步`, 1100);
  }, [showBanner]);

  const handleSaveRoadbook = useCallback(() => {
    const route = worldRef.current.route;
    if (!isRouteBookSupported(route)) return;
    const routeKey = getRouteRoadbookKey(route);
    const baseRecord = roadbookRecordRef.current ?? loadRouteRoadbookRecord(route);
    const pinsToSave = [...betaPinsRef.current];
    const now = Date.now();

    let nextArchives = [...baseRecord.archives];
    if (pinsToSave.length > 0) {
      const existingSameIdx = nextArchives.findIndex((s) => pinsEqual(s.pins, pinsToSave));
      if (existingSameIdx >= 0) {
        const matched: RoadbookSavedSlot = {
          ...nextArchives[existingSameIdx],
          updatedAt: now,
        };
        nextArchives = [
          matched,
          ...nextArchives.filter((_, i) => i !== existingSameIdx),
        ].slice(0, 3);
      } else {
        const versionNum =
          nextArchives.reduce((maxV, s) => {
            const m = s.label.match(/v(\d+)/i);
            return m ? Math.max(maxV, Number(m[1])) : maxV;
          }, 0) + 1;
        const newSlot: RoadbookSavedSlot = {
          id: `rb-${now}-${Math.random().toString(36).slice(2, 6)}`,
          label: `v${versionNum}`,
          updatedAt: now,
          pins: pinsToSave,
          bestAltitudeM: baseRecord.lastAttempt?.maxAltitudeM,
          summited: baseRecord.lastAttempt?.outcome === 'SUMMIT',
        };
        nextArchives = [newSlot, ...nextArchives].slice(0, 3);
      }
    }

    const updated: RouteRoadbookRecord = {
      ...baseRecord,
      savedPins: pinsToSave,
      savedAt: now,
      archives: nextArchives,
    };
    roadbookRecordRef.current = updated;
    setRoadbookRecord(updated);
    saveRouteRoadbookRecord(routeKey, updated);
    soundEngine.playLimbTick();
    triggerHapticPreset('tick');
    showBanner(
      pinsToSave.length > 0
        ? `路书已存档（共 ${pinsToSave.length} 步）`
        : '已保存空路书存档',
      1700
    );
  }, [showBanner]);

  const handleRevertRoadbook = useCallback(() => {
    const saved = roadbookRecordRef.current?.savedPins ?? [];
    const validSaved = saved.filter((id) => holdsMapRef.current.has(id));
    betaPinsRef.current = validSaved;
    setBetaPins(validSaved);
    const clampedCursor = Math.min(betaCursorRef.current, validSaved.length);
    betaCursorRef.current = clampedCursor;
    setBetaCursor(clampedCursor);
    soundEngine.playLimbTick();
    showBanner(`已还原至上次存档（${validSaved.length} 步）`, 1400);
  }, [showBanner]);

  const handleLoadRoadbookSlot = useCallback(
    (slotId: string) => {
      const slot = roadbookRecordRef.current?.archives.find((s) => s.id === slotId);
      if (!slot) return;
      const validPins = slot.pins.filter((id) => holdsMapRef.current.has(id));
      betaPinsRef.current = validPins;
      setBetaPins(validPins);
      betaCursorRef.current = 0;
      setBetaCursor(0);
      soundEngine.playLimbTick();
      showBanner(`已载入存档 ${slot.label}（${validPins.length} 步）`, 1500);
    },
    [showBanner]
  );

  const handleToggleAttemptReview = useCallback(() => {
    const next = !showAttemptReviewRef.current;
    showAttemptReviewRef.current = next;
    setShowAttemptReview(next);
    soundEngine.playLimbTick();
  }, []);

  const clampPeekOffset = useCallback((val: number): number => {
    const minPeek = isReadingRouteRef.current
      ? -(worldRef.current.mountainHeight + climberRef.current.torsoPos.y + 40)
      : -320;
    return Math.max(minPeek, Math.min(120, val));
  }, []);

  const handleFocusLastFall = useCallback(() => {
    const review = roadbookRecordRef.current?.lastAttempt;
    if (!review) return;
    const focusY =
      review.fallPos?.y ??
      (review.trail.length > 0 ? review.trail[review.trail.length - 1].y : null);
    if (focusY === null) return;
    const climberBaseCamY = climberRef.current.torsoPos.y - 42;
    peekOffsetYRef.current = clampPeekOffset(focusY - climberBaseCamY);
    if (!showAttemptReviewRef.current) {
      showAttemptReviewRef.current = true;
      setShowAttemptReview(true);
    }
    soundEngine.playLimbTick();
    showBanner(
      review.fallPos
        ? `已定位至上次坠落点（${review.maxAltitudeM.toFixed(1)}m）`
        : `已定位至上次轨迹终点（${review.maxAltitudeM.toFixed(1)}m）`,
      1600
    );
  }, [clampPeekOffset, showBanner]);

  const handleReviewRoadbookFromResult = useCallback(() => {
    const review = roadbookRecordRef.current?.lastAttempt;
    const focusY = review?.fallPos?.y;
    startRoute(worldRef.current.route, {
      skipIntro: true,
      openRoadbookAtY: typeof focusY === 'number' ? focusY : undefined,
    });
  }, [startRoute]);

  const handleJumpReadCamera = useCallback(
    (action: 'up' | 'down' | 'reset') => {
      if (action === 'reset') {
        peekOffsetYRef.current = 0;
        showBanner('视野已回到攀登位置', 1100);
      } else if (action === 'up') {
        peekOffsetYRef.current = clampPeekOffset(peekOffsetYRef.current - 210);
      } else {
        peekOffsetYRef.current = clampPeekOffset(peekOffsetYRef.current + 210);
      }
      soundEngine.playLimbTick();
    },
    [clampPeekOffset, showBanner]
  );

  const handleInspectAltitudeBin = useCallback(
    (bin: AltitudeDifficultyBin) => {
      if (phaseRef.current !== 'PLAYING' || !isReadingRouteRef.current) return;
      const midM = (bin.startM + bin.endM) * 0.5;
      const targetWorldY = -midM * PIXELS_PER_METER;
      const climberBaseCamY = climberRef.current.torsoPos.y - 42;
      peekOffsetYRef.current = clampPeekOffset(targetWorldY - climberBaseCamY);
      soundEngine.playLimbTick();
      showBanner(`预览 ${bin.startM}-${bin.endM}m · ${bin.challengeTag}`, 1600);
    },
    [clampPeekOffset, showBanner]
  );

  const handleShakeOutHand = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current || introCutsceneRef.current.active) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.dynoFlight) return;

    const anchored = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
      (id) => climber.limbs[id].holdId !== null
    );
    const anchoredFeet = anchored.filter((id) => !climber.limbs[id].isHand);
    const anchoredHands = anchored.filter((id) => climber.limbs[id].isHand);
    if (anchored.length < 3 || anchoredFeet.length === 0 || anchoredHands.length < 2) {
      showBanner('需双手抓稳且至少踩住一只脚才可松手甩臂', 1500);
      return;
    }

    const locked = lockedLimbRef.current;
    const targetHand: LimbId =
      locked && (locked === 'leftHand' || locked === 'rightHand') && climber.limbs[locked].holdId
        ? locked
        : anchoredHands.sort(
            (a, b) => climber.limbs[b].strain - climber.limbs[a].strain
          )[0];

    climber.limbs[targetHand].holdId = null;
    // Absorb vertical shake-out delta cleanly via physics solver (zero sudden velocity kick)
    climber.torsoVel.y = Math.min(POINTER_RELEASE_MAX_TORSO_VY, Math.max(0, climber.torsoVel.y));
    climber.torsoVel.x = Math.max(
      -30,
      Math.min(30, climber.torsoVel.x + (climber.limbs[targetHand].isLeft ? 4 : -4))
    );
    soundEngine.playLimbTick();
    soundEngine.playBreath(
      Math.max(0.35, 1 - climber.stamina / climber.maxStamina),
      'recovery',
      climberGenderRef.current
    );
    triggerHapticPreset('shakeOut');
    reachableIdsRef.current = getReachableHoldIds(
      climber,
      worldRef.current.holds,
      lockedLimbRef.current
    );
    stallTimerRef.current = 0;
    dismissTacticalHint();
    advanceAdvancedTutorial('grab_or_shake');
    showBanner(`${climber.limbs[targetHand].label} 松手甩臂恢复中`, 1500);
    setHudTick((t) => t + 1);
  }, [advanceAdvancedTutorial, dismissTacticalHint, showBanner]);

  const handlePlacePiton = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current || introCutsceneRef.current.active) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.pitonsLeft <= 0) return;

    climber.pitonsLeft -= 1;
    const px = climber.torsoPos.x;
    const py = climber.torsoPos.y - 6;
    pitonsRef.current.push({
      id: `piton-${Date.now()}-${Math.random()}`,
      x: px,
      y: py,
      angle: 0,
      integrity: 1,
    });
    statsRef.current.pitonsPlaced += 1;
    routeEventsRef.current.push({ x: px, y: py, kind: 'piton', label: '打入岩钉' });

    soundEngine.playPitonHammer();
    triggerHapticPreset('piton');
    spawnParticles(px, py, 10, 'spark', '#FBBF24', 90);
    spawnParticles(px, py, 1, 'ring', '#F59E0B', 0);
    cameraRef.current.shake = 5;
    stallTimerRef.current = 0;
    dismissTacticalHint();
    showBanner(`岩钉已固定（剩余 ${climber.pitonsLeft} 枚）`);

    if (
      tutorialRef.current.active &&
      tutorialRef.current.variant === 'basic' &&
      tutorialRef.current.step === 2
    ) {
      const nextTut: TutorialState = {
        active: true,
        variant: 'basic',
        step: 3,
        highlightHoldId: null,
      };
      tutorialRef.current = nextTut;
      setTutorial(nextTut);
    }

    setHudTick((t) => t + 1);
  }, [dismissTacticalHint, showBanner, spawnParticles]);

  const handleApplyChalk = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current || introCutsceneRef.current.active) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.chalkUses <= 0) return;

    climber.chalkUses -= 1;
    climber.chalk = 100;
    soundEngine.playChalk();
    triggerHapticPreset('chalk');

    const { leftHand, rightHand } = climber.limbs;
    spawnParticles(leftHand.pos.x, leftHand.pos.y, 12, 'chalk', '#F8FAFC', 50);
    spawnParticles(rightHand.pos.x, rightHand.pos.y, 12, 'chalk', '#F8FAFC', 50);

    if (leftHand.holdId) {
      const h = holdsMapRef.current.get(leftHand.holdId);
      if (h) h.chalked = true;
    }
    if (rightHand.holdId) {
      const h = holdsMapRef.current.get(rightHand.holdId);
      if (h) h.chalked = true;
    }

    stallTimerRef.current = 0;
    dismissTacticalHint();
    showBanner('双手已涂抹镁粉 · 抓握更稳');

    if (
      tutorialRef.current.active &&
      tutorialRef.current.variant === 'basic' &&
      tutorialRef.current.step === 3
    ) {
      const nextTut: TutorialState = {
        active: true,
        variant: 'basic',
        step: 4,
        highlightHoldId: null,
      };
      tutorialRef.current = nextTut;
      setTutorial(nextTut);
      scheduleTutorialAutoFinish(6000);
    }

    setHudTick((t) => t + 1);
  }, [dismissTacticalHint, scheduleTutorialAutoFinish, showBanner, spawnParticles]);

  const handleToggleTrailPlayback = useCallback(() => {
    if (phaseRef.current !== 'SUMMIT') return;
    if (isPlayingTrailRef.current) {
      isPlayingTrailRef.current = false;
      trailPlaybackProgressRef.current = null;
      setIsPlayingTrail(false);
    } else {
      isPlayingTrailRef.current = true;
      trailPlaybackProgressRef.current = 0.02;
      setIsPlayingTrail(true);
    }
  }, []);

  const handleRespawnCheckpoint = useCallback(() => {
    if (selectedLoadoutRef.current === 'free-solo') return;
    const climber = climberRef.current;
    const cpX = climber.lastCheckpointX;
    const cpY = climber.lastCheckpointY;

    const nearby = worldRef.current.holds
      .filter((h) => !h.broken && !h.isDecoy && Math.hypot(h.x - cpX, h.y - (cpY - 40)) < 115)
      .sort((a, b) => a.y - b.y);
    const pool = nearby.length >= 2
      ? nearby
      : worldRef.current.holds
          .filter((h) => !h.broken && Math.hypot(h.x - cpX, h.y - (cpY - 40)) < 125)
          .sort((a, b) => a.y - b.y);

    const topPair = pool.slice(0, 2).sort((a, b) => a.x - b.x);
    const botPair = pool.slice(Math.max(0, pool.length - 2)).sort((a, b) => a.x - b.x);
    const lh = topPair[0] ?? worldRef.current.holds[0];
    const rh = topPair[1] ?? topPair[0] ?? worldRef.current.holds[1];
    const lf = botPair[0] ?? lh;
    const rf = botPair[1] ?? botPair[0] ?? rh;

    climber.torsoPos = { x: cpX, y: cpY - 40 };
    fallStartYRef.current = cpY - 40;
    fallStartPosRef.current = { x: cpX, y: cpY - 40 };
    climber.torsoVel = { x: 0, y: 0 };
    climber.leanBias = 0;
    climber.pelvisOffset = { x: 0, y: 0 };
    climber.hipTwist = 0;
    climber.wallHug = 0.5;
    climber.stamina = 100;
    climber.health = 90;
    climber.isFalling = false;
    climber.dynoFlight = null;
    climber.ropeCatch = null;
    climber.isShakingOut = false;
    climber.flowCombo = 0;
    climber.swingBoostTimer = 0;
    manualPelvisTimerRef.current = 0;
    flowComboRef.current = 0;
    lastMoveElapsedRef.current = -10;
    lastHighStepElapsedRef.current = -10;
    weatherIncidentRef.current = null;
    incidentCooldownRef.current = 15;
    activeLimbDragRef.current = null;
    activePelvisDragRef.current = null;
    heartbeatAccRef.current = 0;
    breathAccRef.current = 1.4;
    dynoFullNotifiedRef.current = false;
    avalancheTimerRef.current = 14;
    rockEchoTimerRef.current = 7;
    stopHaptic();
    setActiveDragReason(null);
    lastSlipNoteRef.current = null;
    lastStaminaWarnPosRef.current = null;
    attemptRecordedRef.current = false;
    setFallDiagnosis(null);
    climber.pitonsLeft = Math.max(climber.pitonsLeft, 4);
    climber.chalkUses = Math.max(climber.chalkUses, 3);

    (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id, i) => {
      const targetHold = [lh, rh, lf, rf][i];
      climber.limbs[id] = {
        ...climber.limbs[id],
        pos: { x: targetHold.x, y: targetHold.y },
        targetPos: { x: targetHold.x, y: targetHold.y },
        startPos: { x: targetHold.x, y: targetHold.y },
        reachT: 1,
        holdId: targetHold.id,
        strain: 0,
        isDragging: false,
      };
    });

    phaseRef.current = 'PLAYING';
    setPhase('PLAYING');
    stallTimerRef.current = 0;
    dismissTacticalHint();
    showBanner('已返回最近休息台');
    setHudTick((t) => t + 1);
  }, [dismissTacticalHint, showBanner]);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  }, [muted]);

  const screenToWorld = useCallback((clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cam = cameraRef.current;
    return {
      x: (sx - rect.width * 0.5) / cam.zoom + cam.x,
      y: (sy - rect.height * 0.52) / cam.zoom + cam.y,
    };
  }, []);

  const findHoldHover = useCallback(
    (clientX: number, clientY: number, isTouch: boolean): HoverInfo | null => {
      if (phaseRef.current !== 'PLAYING') return null;
      const worldPos = screenToWorld(clientX, clientY);
      const climber = climberRef.current;

      const hitRadius = isTouch ? 48 : 36;
      let closestHold: Hold | null = null;
      let closestD = hitRadius;
      for (const h of worldRef.current.holds) {
        if (h.broken) continue;
        const d = Math.hypot(h.x - worldPos.x, h.y - worldPos.y);
        if (d < closestD) {
          closestD = d;
          closestHold = h;
        }
      }

      if (!closestHold) return null;

      const selected = lockedLimbRef.current;
      const showHints = hasHoldHintsEnabled(worldRef.current.route);
      if (isReadingRouteRef.current && isRouteBookSupported(worldRef.current.route)) {
        const curPins = betaPinsRef.current;
        const idx = curPins.indexOf(closestHold.id);
        const previewHint =
          idx === curPins.length - 1 && idx >= 0
            ? `第 ${idx + 1} 步 · 点击撤销`
            : idx >= 0
              ? `第 ${idx + 1} 步 · 点击移出路书`
              : `点击编入第 ${curPins.length + 1} 步`;
        return {
          hold: closestHold,
          suggestedLimb: selected ?? 'rightHand',
          reachable: true,
          dynoEligible: false,
          stabilityHint: previewHint,
          worldPos,
        };
      }

      if (!selected) {
        return {
          hold: closestHold,
          suggestedLimb: 'rightHand',
          reachable: false,
          dynoEligible: false,
          stabilityHint: showHints ? `${describeHold(closestHold)}` : '',
          worldPos,
        };
      }

      const evalRes = evaluateHoldGrab(climber, selected, closestHold);
      const reachable = evalRes.ok;
      const activeDrag = activeLimbDragRef.current;
      const isActivelyDraggingHand =
        activeDrag !== null &&
        activeDrag.hasMovedOut &&
        activeDrag.limbId === selected &&
        climber.limbs[selected].isHand;
      const dynoEligible =
        !reachable &&
        isActivelyDraggingHand &&
        isValidHandDynoTarget(climber, holdsMapRef.current, selected, closestHold);

      const stabilityHint = !showHints
        ? ''
        : reachable
          ? describeHold(closestHold)
          : dynoEligible
            ? `${describeHold(closestHold)} · 稳住长按蓄满松手跃抓`
            : evalRes.reason ?? '超出伸展极限 · 先抬脚或调重心';

      return {
        hold: closestHold,
        suggestedLimb: selected,
        reachable,
        dynoEligible,
        stabilityHint,
        worldPos,
      };
    },
    [screenToWorld]
  );

  const triggerSummit = useCallback(() => {
    if (phaseRef.current === 'SUMMIT') return;
    const world = worldRef.current;
    const climber = climberRef.current;
    const summitLedge = world.ledges.find((l) => l.isSummit);
    if (!summitLedge) return;

    isReadingRouteRef.current = false;
    setIsReadingRoute(false);
    dynoChargeRef.current = null;
    activeLimbDragRef.current = null;
    activePelvisDragRef.current = null;
    peekPointerIdRef.current = null;
    pointerDownPosRef.current = null;
    setActiveDragReason(null);
    peekOffsetYRef.current = 0;
    (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
      const limb = climber.limbs[id];
      limb.isDragging = false;
      limb.holdId = null;
      limb.strain = 0;
      limb.jitter = { x: 0, y: 0 };
    });
    climber.ropeCatch = null;
    climber.isFalling = false;
    climber.isShakingOut = false;
    climber.isStemming = false;
    climber.dynoFlight = null;
    weatherIncidentRef.current = null;
    if (bannerTimerRef.current) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setStatusBanner(null);
    // Snapshot live camera coordinates so the summit pan begins with zero jump
    summitCamStartRef.current = {
      x: cameraRef.current.x,
      y: cameraRef.current.y,
      zoom: cameraRef.current.zoom,
    };
    summitProgressRef.current = 0;
    summitStageRef.current = 'PAN_REVEAL';
    setSummitProgress(0);
    setSummitStage('PAN_REVEAL');
    phaseRef.current = 'SUMMIT';
    setPhase('SUMMIT');
    const style = recordSummitSuccess(world.route, statsRef.current.fallsCaught);
    setClimbAssessment(
      evaluateClimbAssessment(world, statsRef.current, style, selectedLoadoutRef.current)
    );

    const peakTopY = summitLedge.y - 15;
    climber.torsoPos = { x: summitLedge.x, y: peakTopY - 80 };
    climber.torsoVel = { x: 0, y: 0 };
    climber.leanAngle = 0;
    climber.lookAngle = -0.22;
    climber.pelvisOffset = { x: 0, y: 0 };
    climber.hipTwist = 0.08;
    climber.wallHug = 0.2;
    climber.limbs.leftFoot.pos = { x: summitLedge.x - 10, y: peakTopY - 2 };
    climber.limbs.rightFoot.pos = { x: summitLedge.x + 11, y: peakTopY - 2 };
    climber.limbs.leftHand.pos = { x: summitLedge.x - 18, y: peakTopY - 86 };
    climber.limbs.rightHand.pos = { x: summitLedge.x + 18, y: peakTopY - 86 };
    climber.routeHistory.push({ x: summitLedge.x, y: peakTopY - 48 });
    recordCurrentAttempt('SUMMIT');
    spawnParticles(summitLedge.x, peakTopY - 56, 22, 'spark', '#FDE68A', 96);
    soundEngine.playSummitChord();
    soundEngine.playBreath(0.36, 'recovery', climberGenderRef.current);
    triggerHapticPreset('summit');
  }, [recordCurrentAttempt, recordSummitSuccess, spawnParticles]);

  const handleAdvanceSummitStage = useCallback(() => {
    if (phaseRef.current !== 'SUMMIT') return;
    if (summitStageRef.current === 'PIONEER_REVEAL') {
      summitStageRef.current = 'QUOTE_REVEAL';
      setSummitStage('QUOTE_REVEAL');
      soundEngine.playLimbTick();
    } else if (summitStageRef.current === 'QUOTE_REVEAL') {
      summitStageRef.current = 'MODAL_READY';
      setSummitStage('MODAL_READY');
      soundEngine.playComboChime(4, 0);
    }
  }, []);

  const markRoadbookProgress = useCallback((hold: Hold) => {
    const curPins = betaPinsRef.current;
    const curCursor = betaCursorRef.current;
    const matchedIdx = curPins.indexOf(hold.id, curCursor);
    if (matchedIdx >= 0) {
      statsRef.current.betaPinsFollowed += 1;
      statsRef.current.roadbookFlowHits += 1;
      roadbookFlowTimerRef.current = 6.5;
      const nextCursor = Math.min(curPins.length, matchedIdx + 1);
      betaCursorRef.current = nextCursor;
      setBetaCursor(nextCursor);
    } else if (hold.isDecoy) {
      roadbookFlowTimerRef.current = 0;
    }
  }, []);

  const launchValidatedDyno = useCallback(
    (limbId: LimbId, hold: Hold, dynoCharge: DynoChargeState | null | undefined): boolean => {
      const climber = climberRef.current;
      // Hard invariant gate: Dyno only executes from a fully-charged hand drag onto a higher hold
      if (
        !dynoCharge ||
        dynoCharge.progress < DYNO_MIN_RELEASE_PROGRESS ||
        dynoCharge.limbId !== limbId ||
        dynoCharge.hold.id !== hold.id ||
        !isValidHandDynoTarget(climber, holdsMapRef.current, limbId, hold)
      ) {
        return false;
      }

      const limb = climber.limbs[limbId];
      statsRef.current.keyActionAttempts += 1;
      markRoadbookProgress(hold);

      const activeLoadout =
        LOADOUT_OPTIONS.find((l) => l.id === selectedLoadoutRef.current) ?? LOADOUT_OPTIONS[1];
      const onSpring = isStandingOnSpringHold(climber, holdsMapRef.current);
      const isSwingTarget = hold.type === 'swing';
      const prevDynoStamina = climber.stamina;
      const baseDynoCost = onSpring || isSwingTarget ? 7 : 13;
      climber.stamina = Math.max(0, climber.stamina - baseDynoCost * activeLoadout.drainMult);
      statsRef.current.staminaSpent += Math.max(0, prevDynoStamina - climber.stamina);

      const wetOrIceUnchalked = (hold.wet || hold.type === 'ice') && climber.chalk <= 18;
      const willSlip = wetOrIceUnchalked && Math.random() < 0.22;

      // Clear any pre-launch vertical velocity so dyno arc remains strictly controlled
      climber.torsoVel = { x: climber.torsoVel.x * 0.25, y: 0 };
      limb.startPos = { x: limb.pos.x, y: limb.pos.y };
      limb.holdId = null;

      // Release any anchored limbs that would over-stretch at the landing torso position
      const landingTorsoX = hold.x + (limbId === 'leftHand' ? 14 : -14);
      const landingTorsoY = hold.y + 32;
      (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((otherId) => {
        if (otherId === limbId) return;
        const other = climber.limbs[otherId];
        if (!other.holdId) return;
        const jx =
          landingTorsoX +
          (other.isHand
            ? other.isLeft
              ? -SHOULDER_HALF_W
              : SHOULDER_HALF_W
            : other.isLeft
              ? -HIP_HALF_W
              : HIP_HALF_W);
        const jy = landingTorsoY + (other.isHand ? -TORSO_HEIGHT * 0.48 : TORSO_HEIGHT * 0.46);
        const maxSpan = other.isHand ? ARM_MAX_REACH + 16 : LEG_MAX_REACH + 18;
        if (Math.hypot(other.pos.x - jx, other.pos.y - jy) > maxSpan) {
          other.holdId = null;
        }
      });

      climber.dynoFlight = {
        holdId: hold.id,
        limbId,
        startTorso: { x: climber.torsoPos.x, y: climber.torsoPos.y },
        targetPos: { x: hold.x, y: hold.y },
        t: 0,
        duration: onSpring ? 0.3 : isSwingTarget ? 0.31 : 0.34,
        willSlip,
        isSpringLaunch: onSpring,
        isSwingCatch: isSwingTarget,
      };

      if (onSpring) {
        soundEngine.playSpringLaunch();
        const springFoot =
          climber.limbs.leftFoot.holdId &&
          holdsMapRef.current.get(climber.limbs.leftFoot.holdId)?.type === 'spring'
            ? climber.limbs.leftFoot.pos
            : climber.limbs.rightFoot.pos;
        spawnParticles(springFoot.x, springFoot.y, 10, 'spark', '#4ADE80', 74);
        spawnParticles(springFoot.x, springFoot.y, 1, 'ring', '#22C55E', 0);
      } else {
        soundEngine.playDyno();
      }
      soundEngine.playBreath(
        Math.max(0.45, 1 - climber.stamina / climber.maxStamina),
        'exertion',
        climberGenderRef.current
      );
      triggerHapticPreset('dynoLaunch');
      routeEventsRef.current.push({
        x: hold.x,
        y: hold.y,
        kind: 'dyno',
        label: onSpring ? '蹬壁跃抓' : isSwingTarget ? '摆荡跃抓' : '腾空跃抓',
      });
      showBanner(onSpring ? '蹬壁跃抓' : isSwingTarget ? '摆荡跃抓' : '发力跃抓', 950);
      return true;
    },
    [markRoadbookProgress, showBanner, spawnParticles]
  );

  const attemptGrabHold = useCallback(
    (limbId: LimbId, hold: Hold, options?: GrabAttemptOptions): boolean => {
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return false;

      if (options?.isDyno) {
        return launchValidatedDyno(limbId, hold, options.dynoCharge);
      }

      const evalRes = evaluateHoldGrab(climber, limbId, hold);
      statsRef.current.keyActionAttempts += 1;
      if (!evalRes.ok) {
        statsRef.current.keyActionErrors += 1;
        // Preserve existing valid grip instead of dropping the player on a failed grab attempt
        const existingHold = climber.limbs[limbId].holdId
          ? holdsMapRef.current.get(climber.limbs[limbId].holdId!)
          : null;
        if (!existingHold || existingHold.broken) {
          climber.limbs[limbId].holdId = null;
        }
        soundEngine.playSlip();
        triggerHapticPreset('tick');
        spawnParticles(hold.x, hold.y, 4, 'dust', '#94A3B8', 28);
        showBanner(evalRes.reason ?? '抓握条件不足', 1700);
        return false;
      }

      const limb = climber.limbs[limbId];
      markRoadbookProgress(hold);

      const curAltRatio = Math.max(
        0,
        Math.min(1, -climber.torsoPos.y / worldRef.current.mountainHeight)
      );
      const isSnowy =
        hold.type === 'ice' ||
        weatherRef.current.type === 'snowstorm' ||
        (worldRef.current.route.palette === 'glacial' && curAltRatio > 0.3) ||
        curAltRatio > 0.72;
      const stereoPan = Math.max(-0.82, Math.min(0.82, (hold.x - climber.torsoPos.x) / 95));
      soundEngine.playGrab(hold.type, {
        isFoot: !limb.isHand,
        isSnowy,
        wet: !!hold.wet,
        pan: stereoPan,
        load: limb.load,
      });
      if (
        selectedLoadoutRef.current !== 'free-solo' &&
        dist(limb.pos, hold) >= 56
      ) {
        soundEngine.playGearClink(stereoPan, 0.55);
      }
      const grabHaptic =
        hold.type === 'ice'
          ? 'grabIce'
          : hold.type === 'fragile'
            ? 'grabFragile'
            : hold.type === 'tremor'
              ? 'grabTremor'
              : !limb.isHand
                ? 'grabFoot'
                : 'grabHand';
      triggerHapticPreset(grabHaptic);
      if (climber.stamina < 48 || (hold.type === 'crimp' && climber.stamina < 70)) {
        const grabExertion = Math.max(
          0.32,
          Math.min(1, 1 - climber.stamina / climber.maxStamina)
        );
        soundEngine.playBreath(grabExertion, 'exertion', climberGenderRef.current);
      }

      // Strip any residual upward velocity on grab so climbing never stacks into an unnatural hop
      if (climber.torsoVel.y < 0) {
        climber.torsoVel.y = 0;
      }

      limb.startPos = { x: limb.pos.x, y: limb.pos.y };
      limb.targetPos = { x: hold.x, y: hold.y };
      limb.reachT = 0;
      limb.holdId = hold.id;
      limb.strain = Math.max(0, limb.strain - 0.16);
      const grabbedIds = attemptGrabbedHoldIdsRef.current;
      if (grabbedIds[grabbedIds.length - 1] !== hold.id) {
        grabbedIds.push(hold.id);
      }

      // Flow Combo cadence boost for rhythmic consecutive moves
      const nowElapsed = statsRef.current.elapsedSec;
      if (nowElapsed - lastMoveElapsedRef.current <= 2.9 && statsRef.current.movesMade > 0) {
        flowComboRef.current = Math.min(8, flowComboRef.current + 1);
      } else {
        flowComboRef.current = 1;
      }
      lastMoveElapsedRef.current = nowElapsed;
      climber.flowCombo = flowComboRef.current;
      if (flowComboRef.current >= 2) {
        soundEngine.playComboChime(flowComboRef.current, stereoPan);
      }

      // Dynamic Move 1: High-Step Technique (pure stamina & hand-strain relief, zero upward Impulse Y)
      const isHighStepSurge =
        !limb.isHand &&
        hold.y <= climber.torsoPos.y + 4 &&
        limb.startPos.y - hold.y >= HIGH_STEP_MIN_LIFT_PX &&
        nowElapsed - lastHighStepElapsedRef.current >= HIGH_STEP_COOLDOWN_SEC &&
        (hold.type === 'jug' || hold.type === 'ledge' || hold.type === 'spring');

      if (isHighStepSurge) {
        lastHighStepElapsedRef.current = nowElapsed;
        climber.limbs.leftHand.strain *= 0.8;
        climber.limbs.rightHand.strain *= 0.8;
        const prevS = climber.stamina;
        climber.stamina = Math.min(climber.maxStamina, climber.stamina + 3);
        statsRef.current.staminaRecovered += Math.max(0, climber.stamina - prevS);
        soundEngine.playSpringLaunch();
        if (selectedLoadoutRef.current !== 'free-solo') {
          soundEngine.playGearClink(stereoPan, 0.72);
        }
        spawnParticles(hold.x, hold.y, 6, 'spark', '#4ADE80', 52);
        spawnParticles(hold.x, hold.y, 1, 'ring', '#4ADE80', 0);
        showBanner('高脚挂蹬 · 省力回耐 +3耐', 1100);
      } else if (hold.type === 'swing' && limb.isHand) {
        // Dynamic Move 2: Swing Hold Catch (gentle lateral sway + stamina recovery, strictly zero upward Impulse Y)
        const prevS = climber.stamina;
        climber.stamina = Math.min(climber.maxStamina, climber.stamina + 5);
        statsRef.current.staminaRecovered += Math.max(0, climber.stamina - prevS);
        climber.swingBoostTimer = 4.5;
        const swingDir = Math.sign(hold.x - climber.torsoPos.x) || (limb.isLeft ? -1 : 1);
        climber.torsoVel.x = Math.max(
          -SWING_MAX_VEL_X,
          Math.min(SWING_MAX_VEL_X, climber.torsoVel.x + swingDir * SWING_IMPULSE_X)
        );
        spawnParticles(hold.x, hold.y, 7, 'spark', '#38BDF8', 56);
        spawnParticles(hold.x, hold.y, 1, 'ring', '#22D3EE', 0);
        showBanner('摆荡抓点 · 回耐 +5', 1150);
      } else if (hold.type === 'spring' && !limb.isHand) {
        spawnParticles(hold.x, hold.y, 6, 'spark', '#4ADE80', 50);
        spawnParticles(hold.x, hold.y, 1, 'ring', '#22C55E', 0);
      } else if (hold.type === 'tremor') {
        soundEngine.playTremorRumble(hold.tremorFreq ?? 22, 0.35, !limb.isHand);
        spawnParticles(hold.x, hold.y, 7, 'dust', '#D8B4FE', 48);
        spawnParticles(hold.x, hold.y, 1, 'ring', '#E879F9', 0);
        tremorSoundAccRef.current = 0;
        showBanner(
          limb.isHand ? '颤动支点 · 岩体共振中，速换点' : '颤动支点 · 脚下震动加剧',
          1300
        );
      }

      if (climber.chalk > 15) {
        hold.chalked = true;
        spawnParticles(hold.x, hold.y, 7, 'chalk', '#F8FAFC', 40);
      } else {
        spawnParticles(hold.x, hold.y, 5, 'dust', '#C7BFB0', 34);
      }
      spawnParticles(hold.x, hold.y, 1, 'ring', '#F59E0B', 0);

      statsRef.current.movesMade += 1;
      stallTimerRef.current = 0;
      dismissTacticalHint();

      const lastCrumb = climber.routeHistory[climber.routeHistory.length - 1];
      if (!lastCrumb || dist(lastCrumb, climber.torsoPos) > 22) {
        climber.routeHistory.push({ x: climber.torsoPos.x, y: climber.torsoPos.y });
      }

      reachableIdsRef.current = getReachableHoldIds(
        climber,
        worldRef.current.holds,
        lockedLimbRef.current
      );

      if (tutorialRef.current.active) {
        if (tutorialRef.current.variant === 'advanced') {
          advanceAdvancedTutorial('grab_or_shake');
        } else {
          const curStep = tutorialRef.current.step;
          if (curStep === 0 && limb.isHand && hold.y < -82) {
            const nextHold = findTutorialHighlightHold(
              1,
              climber,
              worldRef.current,
              reachableIdsRef.current
            );
            const nextTut: TutorialState = {
              active: true,
              variant: 'basic',
              step: 1,
              highlightHoldId: nextHold,
            };
            tutorialRef.current = nextTut;
            setTutorial(nextTut);
          } else if (curStep === 1 && !limb.isHand && hold.y < -30) {
            const isFreeSoloNow = selectedLoadoutRef.current === 'free-solo';
            const nextTut: TutorialState = {
              active: true,
              variant: 'basic',
              step: isFreeSoloNow ? 4 : 2,
              highlightHoldId: null,
            };
            tutorialRef.current = nextTut;
            setTutorial(nextTut);
            if (isFreeSoloNow) scheduleTutorialAutoFinish(5500);
          }
        }
      }

      const summitLedge = worldRef.current.ledges.find((l) => l.isSummit);
      if (summitLedge && hold.y <= summitLedge.y + 12 && limb.isHand) {
        triggerSummit();
      }
      return true;
    },
    [
      advanceAdvancedTutorial,
      dismissTacticalHint,
      launchValidatedDyno,
      markRoadbookProgress,
      scheduleTutorialAutoFinish,
      showBanner,
      spawnParticles,
      triggerSummit,
    ]
  );

  // Tap-on-hold handler: strictly handles Roadbook pinning and normal reachable grabs (never Dyno)
  const executeGrabOnHover = useCallback(
    (info: HoverInfo | null) => {
      if (!info?.hold) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;

      if (isReadingRouteRef.current) {
        if (!isRouteBookSupported(worldRef.current.route)) return;
        const holdId = info.hold.id;
        const curPins = betaPinsRef.current;
        const existingIdx = curPins.indexOf(holdId);
        let nextPins: string[];
        if (existingIdx === curPins.length - 1 && existingIdx >= 0) {
          nextPins = curPins.slice(0, -1);
          showBanner(`已撤回第 ${existingIdx + 1} 步`, 1100);
        } else if (existingIdx >= 0) {
          nextPins = curPins.filter((id) => id !== holdId);
          showBanner(`已移出第 ${existingIdx + 1} 步`, 1100);
        } else {
          nextPins = [...curPins, holdId];
          statsRef.current.betaPinsPlanned += 1;
          showBanner(`已标记第 ${nextPins.length} 步`, 1100);
        }
        betaPinsRef.current = nextPins;
        setBetaPins(nextPins);
        const clampedCursor = Math.min(betaCursorRef.current, nextPins.length);
        betaCursorRef.current = clampedCursor;
        setBetaCursor(clampedCursor);
        soundEngine.playLimbTick();
        hoverRef.current = info;
        setHoverInfo(info);
        return;
      }

      if (!lockedLimbRef.current) {
        return;
      }

      if (!info.reachable) {
        const limbLabel = climber.limbs[info.suggestedLimb].label;
        const showHints = hasHoldHintsEnabled(worldRef.current.route);
        showBanner(
          info.dynoEligible
            ? '拖手瞄准高点长按蓄满后松手跃抓'
            : showHints && info.stabilityHint
              ? `${limbLabel}：${info.stabilityHint}`
              : `${limbLabel}：无法抓握此岩点`,
          1400
        );
        return;
      }

      if (attemptGrabHold(info.suggestedLimb, info.hold)) {
        handleSelectLimb(null);
      }
    },
    [attemptGrabHold, handleSelectLimb, showBanner]
  );

  // Unified Direct Limb Drag + Multi-Touch Isolated + Anti-Occlusion Mobile Pointer Handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      soundEngine.init();
      if (phaseRef.current !== 'PLAYING' || introCutsceneRef.current.active) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;

      // Strict pointerId uniqueness guard: one pointerId may never bind to multiple controls
      if (
        activeLimbDragRef.current?.pointerId === e.pointerId ||
        activePelvisDragRef.current?.pointerId === e.pointerId ||
        peekPointerIdRef.current === e.pointerId
      ) {
        return;
      }

      const isTouch = e.pointerType === 'touch';
      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (!isReadingRouteRef.current) {
        // 1. Direct Limb Hitbox (only if no other finger is already dragging a limb)
        if (!activeLimbDragRef.current) {
          const limbIds: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
          let hitLimb: LimbId | null = null;
          let minLimbD = isTouch ? 38 : 24;
          for (const id of limbIds) {
            const d = dist(worldPos, climber.limbs[id].pos);
            if (d < minLimbD) {
              minLimbD = d;
              hitLimb = id;
            }
          }

          if (hitLimb) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore capture errors on synthetic events
            }
            const limb = climber.limbs[hitLimb];
            limb.isDragging = true;
            activeLimbDragRef.current = {
              limbId: hitLimb,
              pointerId: e.pointerId,
              isTouch,
              originHoldId: limb.holdId,
              startWorldPos: worldPos,
              targetPos: { x: limb.pos.x, y: limb.pos.y },
              aimWorldPos: worldPos,
              snappedHold: null,
              canGrab: false,
              failReason: null,
              hasMovedOut: false,
            };
            handleSelectLimb(hitLimb);
            soundEngine.playLimbTick();
            triggerHapticPreset('tick');
            return;
          }
        }

        // 2. Pelvis / Center-of-Gravity Control Hitbox (supports concurrent multi-touch with a limb drag)
        if (!activePelvisDragRef.current) {
          const pelvisCenter: Vec2 = { x: climber.torsoPos.x, y: climber.torsoPos.y + 10 };
          const pelvisRadius = isTouch ? 34 : 22;
          if (dist(worldPos, pelvisCenter) <= pelvisRadius) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore capture errors on synthetic events
            }
            activePelvisDragRef.current = {
              pointerId: e.pointerId,
              startWorldPos: worldPos,
              startOffset: { ...climber.pelvisOffset },
            };
            soundEngine.playLimbTick();
            triggerHapticPreset('tick');
            return;
          }
        }
      }

      // If another pointer is actively manipulating a limb, pelvis, or peek view, ignore extraneous secondary background touch
      if (
        activeLimbDragRef.current !== null ||
        activePelvisDragRef.current !== null ||
        peekPointerIdRef.current !== null
      ) {
        return;
      }

      peekPointerIdRef.current = e.pointerId;
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingPeekRef.current = false;

      const info = findHoldHover(e.clientX, e.clientY, isTouch);
      hoverRef.current = info;
      setHoverInfo(info);
      // Background tap/press NEVER starts a Dyno charge — Dyno requires actively dragging a hand to an upper hold
      dynoChargeRef.current = null;
    },
    [findHoldHover, handleSelectLimb, screenToWorld]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const climber = climberRef.current;
      const isTouch = e.pointerType === 'touch';

      // Strict interception gate while falling or mid-dyno:
      // 1) Purge all active drag / charge / contact preview states so pointer moves cannot touch limbs
      // 2) Intercept any abnormal positive torsoVel.y mutation (or NaN spike) immediately
      if (climber.isFalling || climber.dynoFlight) {
        if (activeLimbDragRef.current) {
          climber.limbs[activeLimbDragRef.current.limbId].isDragging = false;
          activeLimbDragRef.current = null;
          setActiveDragReason(null);
        }
        (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
          climber.limbs[id].isDragging = false;
        });
        activePelvisDragRef.current = null;
        dynoChargeRef.current = null;
        hoverRef.current = null;

        const safeBaseVy = Number.isFinite(lastSafeTorsoVelYRef.current)
          ? lastSafeTorsoVelYRef.current
          : 0;
        if (!Number.isFinite(climber.torsoVel.y)) {
          climber.torsoVel.y = Math.max(0, safeBaseVy);
        } else if (climber.dynoFlight) {
          // Dyno flight velocity is strictly owned by the flight arc — reject any abnormal positive surge
          if (climber.torsoVel.y > Math.max(0, safeBaseVy) + FALL_DYNO_MAX_POS_VY_SPIKE) {
            climber.torsoVel.y = Math.max(0, safeBaseVy);
          }
          climber.torsoVel.y = Math.max(-95, Math.min(95, climber.torsoVel.y));
        } else {
          // Falling state: gravity evolves torsoVel.y smoothly in physics ticks, never via pointer events
          if (climber.torsoVel.y - safeBaseVy > FALL_DYNO_MAX_POS_VY_SPIKE) {
            climber.torsoVel.y = Math.min(
              climber.ropeCatch ? 220 : 460,
              Math.max(0, safeBaseVy + FALL_DYNO_MAX_POS_VY_SPIKE)
            );
          }
          if (climber.ropeCatch) {
            climber.torsoVel.y = Math.max(-28, Math.min(220, climber.torsoVel.y));
          }
        }
        return;
      }

      // Mandatory physical impulse threshold snapshot before any pointer-move interaction
      const preMoveVelX = Number.isFinite(climber.torsoVel.x) ? climber.torsoVel.x : 0;
      const preMoveVelY = Number.isFinite(climber.torsoVel.y) ? climber.torsoVel.y : 0;
      const enforcePointerImpulseThreshold = () => {
        if (climber.isFalling || climber.dynoFlight) {
          climber.torsoVel.y = Math.min(preMoveVelY, Math.max(-95, preMoveVelY));
          return;
        }
        if (!Number.isFinite(climber.torsoVel.y)) {
          climber.torsoVel.y = Math.min(POINTER_RELEASE_MAX_TORSO_VY, Math.max(0, preMoveVelY));
        } else {
          // Strictly energy-contractive vertical bound: allow damping toward 0,
          // completely block any positive downward spike OR upward catapult gain.
          const minAllowedVy = Math.min(0, preMoveVelY);
          const maxAllowedVy = Math.max(0, preMoveVelY) + POINTER_IMPULSE_MAX_DELTA_Y;
          climber.torsoVel.y = Math.max(minAllowedVy, Math.min(maxAllowedVy, climber.torsoVel.y));
        }
        if (!Number.isFinite(climber.torsoVel.x)) {
          climber.torsoVel.x = preMoveVelX;
        } else {
          const deltaVx = climber.torsoVel.x - preMoveVelX;
          if (Math.abs(deltaVx) > POINTER_IMPULSE_MAX_DELTA_X) {
            climber.torsoVel.x = preMoveVelX + Math.sign(deltaVx) * POINTER_IMPULSE_MAX_DELTA_X;
          }
        }
      };

      // Active pelvis/CoM drag handling (modifies player intent pelvisOffset, solved continuously by physics)
      const pelvisDrag = activePelvisDragRef.current;
      if (phaseRef.current === 'PLAYING' && pelvisDrag && pelvisDrag.pointerId === e.pointerId) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        if (!pelvisDrag.hasMoved && dist(worldPos, pelvisDrag.startWorldPos) > 6) {
          pelvisDrag.hasMoved = true;
        }
        const dx = worldPos.x - pelvisDrag.startWorldPos.x;
        const dy = worldPos.y - pelvisDrag.startWorldPos.y;
        const nextOffset = clampPelvisOffset({
          x: pelvisDrag.startOffset.x + dx,
          y: pelvisDrag.startOffset.y + dy,
        });
        climber.pelvisOffset = nextOffset;
        climber.leanBias = nextOffset.x < -8 ? -1 : nextOffset.x > 8 ? 1 : 0;
        manualPelvisTimerRef.current = 3.2;
        stallTimerRef.current = 0;
        reachableIdsRef.current = getReachableHoldIds(
          climber,
          worldRef.current.holds,
          lockedLimbRef.current
        );
        enforcePointerImpulseThreshold();
        return;
      }

      // Active direct limb drag handling (with touch fingertip anti-occlusion aim lift)
      const drag = activeLimbDragRef.current;
      if (phaseRef.current === 'PLAYING' && drag && drag.pointerId === e.pointerId) {
        const rawWorldPos = screenToWorld(e.clientX, e.clientY);
        const limb = climber.limbs[drag.limbId];
        const movedDist = dist(rawWorldPos, drag.startWorldPos);

        if (!drag.hasMovedOut && movedDist > (isTouch ? 12 : 10)) {
          drag.hasMovedOut = true;
          if (limb.holdId !== null) {
            const otherAnchored = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
              (id) => id !== drag.limbId && climber.limbs[id].holdId !== null
            );
            const otherAnchoredHands = otherAnchored.filter((id) => climber.limbs[id].isHand);
            const safeToDetach =
              otherAnchored.length >= 2 && (otherAnchoredHands.length >= 1 || climber.isResting);
            if (safeToDetach) {
              // Safe stance release: vertical torsoVel.y increment is completely absorbed by physics constraints
              limb.holdId = null;
              const nowMs = performance.now();
              const bodySpd = Math.hypot(preMoveVelX, preMoveVelY);
              const impulseAtten = computeNonlinearRestitution(bodySpd, movedDist * 0.14, 0.65);
              if (nowMs - lastPointerImpulseMsRef.current >= POINTER_IMPULSE_COOLDOWN_MS) {
                lastPointerImpulseMsRef.current = nowMs;
                const gatedDeltaX = Math.max(
                  -POINTER_IMPULSE_MAX_DELTA_X,
                  Math.min(POINTER_IMPULSE_MAX_DELTA_X, (limb.isLeft ? 3.5 : -3.5) * impulseAtten)
                );
                // Strictly zero positive torsoVel.y injection; damp downward drift & bleed upward velocity to 0
                climber.torsoVel.y =
                  preMoveVelY > 0
                    ? Math.min(POINTER_RELEASE_MAX_TORSO_VY, preMoveVelY * (1 - 0.35 * (1 - impulseAtten)))
                    : 0;
                climber.torsoVel.x = Math.max(-36, Math.min(36, preMoveVelX + gatedDeltaX));
              }
              reachableIdsRef.current = getReachableHoldIds(
                climber,
                worldRef.current.holds,
                drag.limbId
              );
            } else {
              // Preserve anchor while aiming if detaching would leave <2 supports or 0 hands
              showBanner(
                otherAnchoredHands.length === 0
                  ? '仅剩单手支撑 · 请直接拖到新岩点再松手，或先移另一只手'
                  : '仅剩 2 个支点 · 请直接拖到新岩点再松手，或先移动悬空肢体',
                1600
              );
            }
          }
        }

        // Progressive upward aim offset on touch screens prevents user's thumb from hiding target hold
        const zoom = cameraRef.current.zoom || 0.85;
        const liftRatio = isTouch ? Math.min(1, Math.max(0, (movedDist - 6) / 26)) : 0;
        const aimWorldPos: Vec2 = {
          x: rawWorldPos.x,
          y: rawWorldPos.y - liftRatio * (32 / zoom),
        };
        drag.aimWorldPos = aimWorldPos;

        const { clampedPos, aimPos } = clampLimbTarget(climber, drag.limbId, aimWorldPos);
        drag.targetPos = aimPos;

        // Search nearby hold for snap adsorption
        const prevSnapId = drag.snappedHold?.id ?? null;
        const snapRadius = isTouch ? 44 : 30;
        let closestHold: Hold | null = null;
        let bestD = snapRadius;
        for (const h of worldRef.current.holds) {
          if (h.broken) continue;
          const d = Math.hypot(h.x - aimWorldPos.x, h.y - aimWorldPos.y);
          if (d < bestD) {
            bestD = d;
            closestHold = h;
          }
        }

        if (closestHold) {
          const showHints = hasHoldHintsEnabled(worldRef.current.route);
          const evalRes = evaluateHoldGrab(climber, drag.limbId, closestHold);
          if (showHints && evalRes.ok && prevSnapId !== closestHold.id) {
            soundEngine.playLimbTick();
            triggerHapticPreset('tick');
          }
          drag.snappedHold = closestHold;
          drag.canGrab = evalRes.ok;
          drag.estimatedLoad = evalRes.estimatedLoad;
          drag.failReason = evalRes.reason;

          const dynoEligibleDrag =
            drag.hasMovedOut &&
            isValidHandDynoTarget(climber, holdsMapRef.current, drag.limbId, closestHold);

          setActiveDragReason(
            !showHints || evalRes.ok || dynoEligibleDrag ? null : evalRes.reason
          );

          if (evalRes.ok) {
            // Smooth magnetic snap toward hold while remaining clamped to anatomical bone length
            const magnetized = clampLimbTarget(climber, drag.limbId, {
              x: clampedPos.x * 0.25 + closestHold.x * 0.75,
              y: clampedPos.y * 0.25 + closestHold.y * 0.75,
            });
            limb.pos = magnetized.clampedPos;
            dynoChargeRef.current = null;
          } else {
            limb.pos = clampedPos;
            if (dynoEligibleDrag) {
              if (
                !dynoChargeRef.current ||
                dynoChargeRef.current.hold.id !== closestHold.id ||
                dynoChargeRef.current.limbId !== drag.limbId ||
                dynoChargeRef.current.pointerId !== e.pointerId
              ) {
                dynoChargeRef.current = {
                  hold: closestHold,
                  limbId: drag.limbId,
                  progress: 0,
                  dwellSec: 0,
                  pointerId: e.pointerId,
                };
              }
            } else {
              dynoChargeRef.current = null;
            }
          }

          const previewHover: HoverInfo = {
            hold: closestHold,
            suggestedLimb: drag.limbId,
            reachable: evalRes.ok,
            dynoEligible: dynoEligibleDrag,
            stabilityHint: !showHints
              ? ''
              : evalRes.ok
                ? describeHold(closestHold)
                : dynoEligibleDrag
                  ? `${describeHold(closestHold)} · 稳住长按蓄满跃抓`
                  : evalRes.reason ?? '无法抓握',
            worldPos: aimPos,
          };
          hoverRef.current = previewHover;
          setHoverInfo(previewHover);
        } else {
          limb.pos = clampedPos;
          drag.snappedHold = null;
          drag.canGrab = false;
          drag.estimatedLoad = undefined;
          drag.failReason = null;
          setActiveDragReason(null);
          dynoChargeRef.current = null;
          hoverRef.current = null;
          setHoverInfo(null);
        }

        const lookDx = aimPos.x - climber.torsoPos.x;
        climber.lookAngle = Math.max(-0.35, Math.min(0.35, lookDx * 0.004));
        enforcePointerImpulseThreshold();
        return;
      }

      if (
        phaseRef.current === 'PLAYING' &&
        pointerDownPosRef.current &&
        peekPointerIdRef.current === e.pointerId
      ) {
        const dy = e.clientY - pointerDownPosRef.current.y;
        const dx = e.clientX - pointerDownPosRef.current.x;
        if (isDraggingPeekRef.current || Math.hypot(dx, dy) > 14) {
          isDraggingPeekRef.current = true;
          dynoChargeRef.current = null;
          const zoom = cameraRef.current.zoom || 0.85;
          const minPeek = isReadingRouteRef.current
            ? -(worldRef.current.mountainHeight + climberRef.current.torsoPos.y + 40)
            : -320;
          peekOffsetYRef.current = Math.max(
            minPeek,
            Math.min(120, peekOffsetYRef.current - dy / zoom)
          );
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
      }

      if (activeLimbDragRef.current || activePelvisDragRef.current) {
        return;
      }

      const info = findHoldHover(e.clientX, e.clientY, isTouch);
      hoverRef.current = info;
      setHoverInfo(info);

      if (info?.hold && !isReadingRouteRef.current) {
        const dx = info.hold.x - climberRef.current.torsoPos.x;
        climberRef.current.lookAngle = Math.max(-0.35, Math.min(0.35, dx * 0.004));
      }
      enforcePointerImpulseThreshold();
    },
    [findHoldHover, screenToWorld, showBanner]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const climber = climberRef.current;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore capture release errors
      }

      // Finish active pelvis drag (quick tap without dragging restores smart centered CoM)
      const pelvisDrag = activePelvisDragRef.current;
      if (pelvisDrag && pelvisDrag.pointerId === e.pointerId) {
        activePelvisDragRef.current = null;
        if (pelvisDrag.hasMoved) {
          manualPelvisTimerRef.current = 3.2;
          stallTimerRef.current = 0;
          advanceAdvancedTutorial('pelvis');
        } else if (
          Math.abs(climber.pelvisOffset.x) > 3 ||
          Math.abs(climber.pelvisOffset.y) > 3
        ) {
          climber.pelvisOffset = { x: 0, y: 0 };
          climber.leanBias = 0;
          manualPelvisTimerRef.current = 0;
          soundEngine.playLimbTick();
          triggerHapticPreset('tick');
          reachableIdsRef.current = getReachableHoldIds(
            climber,
            worldRef.current.holds,
            lockedLimbRef.current
          );
          showBanner('重心已回中（恢复智能调节）', 1100);
        }
        setHudTick((t) => t + 1);
        return;
      }

      // Finish active limb drag first
      const drag = activeLimbDragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        activeLimbDragRef.current = null;
        climber.limbs[drag.limbId].isDragging = false;
        setActiveDragReason(null);

        const activeCharge = dynoChargeRef.current;
        dynoChargeRef.current = null;

        if (
          activeCharge &&
          activeCharge.pointerId === e.pointerId &&
          activeCharge.progress >= DYNO_MIN_RELEASE_PROGRESS &&
          activeCharge.limbId === drag.limbId &&
          drag.hasMovedOut &&
          drag.snappedHold?.id === activeCharge.hold.id
        ) {
          lastLimbTapRef.current = null;
          attemptGrabHold(drag.limbId, activeCharge.hold, {
            isDyno: true,
            dynoCharge: activeCharge,
          });
          handleSelectLimb(null);
          hoverRef.current = null;
          setHoverInfo(null);
          return;
        }

        if (!drag.hasMovedOut) {
          const limb = climber.limbs[drag.limbId];
          const nowMs = performance.now();
          if (
            limb.holdId !== null &&
            lastLimbTapRef.current?.limbId === drag.limbId &&
            nowMs - lastLimbTapRef.current.time <= 360
          ) {
            lastLimbTapRef.current = null;
            handleReleaseLimb(drag.limbId);
            handleSelectLimb(null);
            hoverRef.current = null;
            setHoverInfo(null);
            return;
          }
          lastLimbTapRef.current =
            limb.holdId !== null ? { limbId: drag.limbId, time: nowMs } : null;
          return;
        }

        lastLimbTapRef.current = null;
        const releasedLimb = climber.limbs[drag.limbId];
        if (drag.snappedHold) {
          const grabbed = attemptGrabHold(drag.limbId, drag.snappedHold);
          // If grab failed while 2-point protection kept originHoldId, restore visual pos cleanly onto origin hold
          if (!grabbed && releasedLimb.holdId) {
            const keptHold = holdsMapRef.current.get(releasedLimb.holdId);
            if (keptHold && !keptHold.broken) {
              releasedLimb.pos = { x: keptHold.x, y: keptHold.y };
              releasedLimb.targetPos = { x: keptHold.x, y: keptHold.y };
              releasedLimb.reachT = 1;
            }
          }
        } else if (releasedLimb.holdId) {
          // Dropped on empty rock while 2-point protection kept originHoldId: snap limb cleanly back to origin hold
          const keptHold = holdsMapRef.current.get(releasedLimb.holdId);
          if (keptHold && !keptHold.broken) {
            releasedLimb.pos = { x: keptHold.x, y: keptHold.y };
            releasedLimb.targetPos = { x: keptHold.x, y: keptHold.y };
            releasedLimb.reachT = 1;
          }
        } else if (drag.originHoldId !== null) {
          soundEngine.playLimbTick();
          triggerHapticPreset('tick');
          stallTimerRef.current = 0;
          advanceAdvancedTutorial('release');
        }
        handleSelectLimb(null);
        hoverRef.current = null;
        setHoverInfo(null);
        return;
      }

      if (peekPointerIdRef.current !== e.pointerId) {
        return;
      }

      peekPointerIdRef.current = null;

      if (phaseRef.current !== 'PLAYING' || e.button === 2) {
        pointerDownPosRef.current = null;
        isDraggingPeekRef.current = false;
        dynoChargeRef.current = null;
        return;
      }
      if (climber.isFalling || climber.dynoFlight) {
        dynoChargeRef.current = null;
        return;
      }

      const wasDraggingPeek = isDraggingPeekRef.current;
      isDraggingPeekRef.current = false;
      pointerDownPosRef.current = null;
      dynoChargeRef.current = null;

      if (wasDraggingPeek) {
        if (!isReadingRouteRef.current) {
          peekOffsetYRef.current = 0;
        }
        return;
      }

      const isTouch = e.pointerType === 'touch';
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const info = findHoldHover(e.clientX, e.clientY, isTouch);

      // Check Piton Recycling when tapping a player-placed piton within reach
      if (!isReadingRouteRef.current && (!info || !info.reachable)) {
        let recycleIdx = -1;
        let bestPitonD = isTouch ? 36 : 26;
        for (let i = 0; i < pitonsRef.current.length; i++) {
          const p = pitonsRef.current[i];
          if (p.isRusty || p.integrity <= 0) continue;
          const tapD = Math.hypot(p.x - worldPos.x, p.y - worldPos.y);
          const reachD = dist(p, climber.torsoPos);
          if (tapD < bestPitonD && reachD <= 74) {
            bestPitonD = tapD;
            recycleIdx = i;
          }
        }
        if (recycleIdx >= 0) {
          const removed = pitonsRef.current.splice(recycleIdx, 1)[0];
          climber.pitonsLeft += 1;
          soundEngine.playLimbTick();
          triggerHaptic(12, 'medium');
          spawnParticles(removed.x, removed.y, 8, 'spark', '#34D399', 65);
          showBanner(`已回收岩钉 +1（当前 ${climber.pitonsLeft} 枚）`, 1600);
          setHudTick((t) => t + 1);
          return;
        }
      }

      if (info?.hold) {
        executeGrabOnHover(info);
      }

      if (isTouch && !isReadingRouteRef.current) {
        hoverRef.current = null;
        setHoverInfo(null);
      }
    },
    [
      advanceAdvancedTutorial,
      attemptGrabHold,
      executeGrabOnHover,
      findHoldHover,
      handleReleaseLimb,
      handleSelectLimb,
      screenToWorld,
      showBanner,
      spawnParticles,
    ]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const pelvisDrag = activePelvisDragRef.current;
    if (pelvisDrag && pelvisDrag.pointerId === e.pointerId) {
      activePelvisDragRef.current = null;
    }
    const drag = activeLimbDragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const cancelledLimb = climberRef.current.limbs[drag.limbId];
      cancelledLimb.isDragging = false;
      if (cancelledLimb.holdId) {
        const keptHold = holdsMapRef.current.get(cancelledLimb.holdId);
        if (keptHold && !keptHold.broken) {
          cancelledLimb.pos = { x: keptHold.x, y: keptHold.y };
          cancelledLimb.targetPos = { x: keptHold.x, y: keptHold.y };
          cancelledLimb.reachT = 1;
        }
      }
      activeLimbDragRef.current = null;
      setActiveDragReason(null);
      hoverRef.current = null;
      setHoverInfo(null);
    }
    if (peekPointerIdRef.current === e.pointerId) {
      peekPointerIdRef.current = null;
      pointerDownPosRef.current = null;
      isDraggingPeekRef.current = false;
      if (!isReadingRouteRef.current) {
        peekOffsetYRef.current = 0;
      }
    }
    if (
      dynoChargeRef.current &&
      (dynoChargeRef.current.pointerId === undefined ||
        dynoChargeRef.current.pointerId === e.pointerId)
    ) {
      dynoChargeRef.current = null;
    }
  }, []);

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      soundEngine.init();
      handlePlacePiton();
    },
    [handlePlacePiton]
  );

  // Main 60fps Game Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAcc = 0;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = rawDt > 0 && Number.isFinite(rawDt) ? Math.min(0.05, Math.max(0.001, rawDt)) : 1 / 60;
      lastTime = now;
      const timeSec = now / 1000;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      const climber = climberRef.current;
      const world = worldRef.current;
      const cam = cameraRef.current;
      const curPhase = phaseRef.current;
      const mountainHeight = world.mountainHeight;

      const altM = Math.max(
        0,
        Math.min(world.route.heightM, -climber.torsoPos.y / PIXELS_PER_METER)
      );
      const altRatio = altM / world.route.heightM;
      const weather = getWeatherAtAltitude(world, altRatio, timeSec);
      weatherRef.current = weather;

      const windForce =
        (Math.sin(timeSec * 0.65) * (0.15 + altRatio * 0.75) +
          Math.sin(timeSec * 1.9) * altRatio * 0.3) *
        world.route.windMultiplier *
        (weather.type === 'snowstorm' ? 1.35 : weather.type === 'rain' ? 1.15 : 1);

      if (curPhase === 'PLAYING' && weather.type !== lastWeatherTypeRef.current) {
        lastWeatherTypeRef.current = weather.type;
        if (weather.type === 'mist') {
          showBanner(`天气变化 · 进入${weather.label}，视野略有受限`, 2400);
        } else if (weather.type === 'rain') {
          showBanner(`天气变化 · 遭遇${weather.label}，镁粉消耗加速！`, 2600);
        } else if (weather.type === 'snowstorm') {
          showBanner(`天气变化 · ${weather.label}来袭，注意视野与镁粉`, 2600);
        }
      }

      // Master-Tier ONLY Sudden Weather Incidents (Tiers 9-11; strictly zero incidents on all lower tiers)
      let effectiveWindForce = windForce;
      let effectiveWeather = weather;

      if (
        curPhase === 'PLAYING' &&
        !isReadingRouteRef.current &&
        !climber.isFalling &&
        isMasterRoute(world.route)
      ) {
        const curInc = weatherIncidentRef.current;
        if (!curInc) {
          if (!climber.isResting && altRatio >= 0.12 && altRatio <= 0.92) {
            incidentCooldownRef.current -= dt;
            if (incidentCooldownRef.current <= 0) {
              incidentCooldownRef.current = 15 + Math.random() * 7;
              const candidates: WeatherIncidentType[] = (
                ['crosswind_gust', 'icefall', 'whiteout_squall'] as WeatherIncidentType[]
              ).filter((k) => k !== lastIncidentTypeRef.current);
              const picked = candidates[Math.floor(Math.random() * candidates.length)];
              lastIncidentTypeRef.current = picked;
              incidentAppliedWetRef.current = false;

              const dir: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
              const laneX = Math.max(
                -150,
                Math.min(150, climber.torsoPos.x + (Math.random() - 0.5) * 28)
              );

              const nextIncident: WeatherIncidentState =
                picked === 'crosswind_gust'
                  ? {
                      type: 'crosswind_gust',
                      phase: 'telegraph',
                      label: '突发横风预警',
                      hint:
                        dir > 0
                          ? '强横风将向右吹袭 · 稳住三点或拖腰向左抗风'
                          : '强横风将向左吹袭 · 稳住三点或拖腰向右抗风',
                      timer: 0,
                      duration: 2.3,
                      direction: dir,
                      laneX,
                      laneWidth: 0,
                      projectiles: [],
                    }
                  : picked === 'icefall'
                    ? {
                        type: 'icefall',
                        phase: 'telegraph',
                        label: '高空落冰预警',
                        hint: '上方冰岩松动 · 速向左右移出红色警戒带！',
                        timer: 0,
                        duration: 2.5,
                        direction: dir,
                        laneX,
                        laneWidth: 84,
                        projectiles: [],
                        dodged: true,
                      }
                    : {
                        type: 'whiteout_squall',
                        phase: 'telegraph',
                        label: '冻雨白毛风骤起',
                        hint: '视野骤缩且附近岩点渗湿 · 注意提前涂镁粉',
                        timer: 0,
                        duration: 2.2,
                        direction: dir,
                        laneX,
                        laneWidth: 0,
                        projectiles: [],
                      };

              weatherIncidentRef.current = nextIncident;
              soundEngine.playIncidentWarning(picked);
              triggerHaptic([16, 22, 16], 'high');
              showBanner(`大师突发事故 · ${nextIncident.label}：${nextIncident.hint}`, 2600);
            }
          }
        } else {
          curInc.timer += dt;
          if (curInc.phase === 'telegraph') {
            if (curInc.timer >= curInc.duration) {
              curInc.phase = 'active';
              curInc.timer = 0;
              if (curInc.type === 'crosswind_gust') {
                curInc.label = '突发强横风';
                curInc.duration = 3.8;
                cam.shake = Math.max(cam.shake, 3.5);
              } else if (curInc.type === 'icefall') {
                curInc.label = '高空落冰坠落';
                curInc.duration = 2.4;
                const spawnTopY = cam.y - height / (2 * Math.max(0.45, cam.zoom)) - 35;
                curInc.projectiles = [0, 1, 2].map((idx) => ({
                  id: `ice-${Date.now()}-${idx}`,
                  x: curInc.laneX + (idx - 1) * (curInc.laneWidth * 0.28) + (Math.random() - 0.5) * 12,
                  y: spawnTopY - idx * 96 - Math.random() * 28,
                  vx: (Math.random() - 0.5) * 20,
                  vy: 375 + Math.random() * 95,
                  radius: 10 + Math.random() * 4,
                  rotation: Math.random() * Math.PI * 2,
                  spin: (Math.random() < 0.5 ? -1 : 1) * (3.5 + Math.random() * 3),
                  kind: world.route.palette === 'glacial' || altRatio > 0.5 ? 'ice' : 'rock',
                }));
              } else {
                curInc.label = '冻雨白毛风';
                curInc.duration = 4.6;
                if (!incidentAppliedWetRef.current) {
                  incidentAppliedWetRef.current = true;
                  let wetted = 0;
                  for (const h of world.holds) {
                    if (
                      !h.broken &&
                      !h.wet &&
                      h.type !== 'ledge' &&
                      h.type !== 'spring' &&
                      h.type !== 'swing' &&
                      Math.hypot(h.x - climber.torsoPos.x, h.y - climber.torsoPos.y) < 135
                    ) {
                      h.wet = true;
                      wetted += 1;
                      if (wetted >= 2) break;
                    }
                  }
                }
              }
            }
          } else {
            // Active phase effects
            if (curInc.type === 'crosswind_gust') {
              const env = Math.sin(Math.min(1, curInc.timer / curInc.duration) * Math.PI);
              effectiveWindForce += curInc.direction * 2.35 * (0.45 + 0.55 * env);
              cam.shake = Math.max(cam.shake, 1.4 * env);
              if (Math.random() < 0.45) {
                particlesRef.current.push({
                  x: cam.x - curInc.direction * (width / (2 * cam.zoom)) * 0.9,
                  y: cam.y + (Math.random() - 0.5) * (height / cam.zoom),
                  vx: curInc.direction * (360 + Math.random() * 140),
                  vy: 40 + Math.random() * 40,
                  size: 2.2,
                  life: 0.75,
                  maxLife: 0.75,
                  color: '#E2E8F0',
                  kind: 'snow',
                });
              }
            } else if (curInc.type === 'icefall') {
              for (const p of curInc.projectiles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rotation += p.spin * dt;
                if (!p.hit && dist(p, climber.torsoPos) < p.radius + 17) {
                  p.hit = true;
                  curInc.dodged = false;
                  soundEngine.playRockImpact();
                  soundEngine.playBreath(0.92, 'gasp', climberGenderRef.current);
                  triggerHapticPreset('rockImpact');
                  cam.shake = 11;
                  const prevIceHealth = climber.health;
                  climber.health = Math.max(8, climber.health - 12);
                  const iceHealthLost = Math.round(prevIceHealth - climber.health);
                  climber.stamina = Math.max(0, climber.stamina - 10);
                  attemptMinHealthRef.current = Math.min(attemptMinHealthRef.current, climber.health);
                  attemptMinStaminaRef.current = Math.min(attemptMinStaminaRef.current, climber.stamina);
                  if (iceHealthLost > 0) {
                    attemptHealthDropsRef.current.push({
                      x: Math.round(climber.torsoPos.x),
                      y: Math.round(climber.torsoPos.y),
                      altitudeM: Number(Math.max(0, -climber.torsoPos.y / PIXELS_PER_METER).toFixed(1)),
                      healthLost: iceHealthLost,
                      healthAfter: Math.round(climber.health),
                      staminaAfter: Math.round(climber.stamina),
                      kind: 'icefall',
                      label: `落冰 -${iceHealthLost}体`,
                    });
                  }
                  climber.torsoVel.y = Math.min(78, Math.max(0, climber.torsoVel.y + 32));
                  climber.torsoVel.x = Math.max(
                    -55,
                    Math.min(55, climber.torsoVel.x + (climber.torsoPos.x >= p.x ? 1 : -1) * 26)
                  );
                  spawnParticles(
                    p.x,
                    p.y,
                    14,
                    'spark',
                    p.kind === 'ice' ? '#BAE6FD' : '#D6D3D1',
                    110
                  );
                  showBanner('被高空落冰砸中！耐力 -10 · 体力 -12', 1800);
                }
              }
            } else if (curInc.type === 'whiteout_squall') {
              effectiveWeather = {
                ...weather,
                chalkDrainMult: weather.chalkDrainMult * 1.48,
                visibilityRadius: Math.min(weather.visibilityRadius, 0.44),
                fogOpacity: Math.max(weather.fogOpacity, 0.58),
              };
            }

            if (curInc.timer >= curInc.duration) {
              if (curInc.type === 'icefall' && curInc.dodged) {
                const prevS = climber.stamina;
                climber.stamina = Math.min(climber.maxStamina, climber.stamina + 5);
                statsRef.current.staminaRecovered += Math.max(0, climber.stamina - prevS);
                showBanner('惊险闪避高空落冰！耐力 +5', 1600);
              } else if (curInc.type === 'crosswind_gust') {
                showBanner('强横风已过 · 稳住节奏继续向上', 1500);
              }
              weatherIncidentRef.current = null;
            }
          }
        }
      } else if (!isMasterRoute(world.route) || climber.isFalling) {
        weatherIncidentRef.current = null;
      }

      const isIntroActive = curPhase === 'PLAYING' && introCutsceneRef.current.active;
      const isPausedReading = curPhase === 'PLAYING' && isReadingRouteRef.current;

      // Dynamic Micro-Weather Timing Windows (Wind Lull & Sunbreak) on active climbs
      if (
        curPhase === 'PLAYING' &&
        !isIntroActive &&
        !isPausedReading &&
        !climber.isFalling &&
        !weatherIncidentRef.current
      ) {
        const curWin = microWindowRef.current;
        if (!curWin) {
          if (!climber.isResting && altRatio >= 0.14 && altRatio <= 0.9) {
            microWindowCooldownRef.current -= dt;
            if (microWindowCooldownRef.current <= 0) {
              microWindowCooldownRef.current = 20 + Math.random() * 9;
              if (weather.type === 'rain' || weather.type === 'mist') {
                microWindowRef.current = {
                  kind: 'sunbreak',
                  label: '破云放晴窗口',
                  hint: '岩面暂干 · 顺势提速',
                  timer: 0,
                  duration: 8.0,
                };
                soundEngine.playAlpineHarmonic('sunbreak');
              } else if (world.route.windMultiplier >= 0.45) {
                microWindowRef.current = {
                  kind: 'wind_lull',
                  label: '风隙静默窗口',
                  hint: '山风骤歇 · 跃抓横移良机',
                  timer: 0,
                  duration: 5.5,
                };
              }
            }
          }
        } else {
          curWin.timer += dt;
          if (curWin.kind === 'wind_lull') {
            effectiveWindForce *= 0.14;
          } else if (curWin.kind === 'sunbreak') {
            effectiveWeather = {
              ...effectiveWeather,
              chalkDrainMult: Math.max(0.75, effectiveWeather.chalkDrainMult * 0.55),
              fogOpacity: effectiveWeather.fogOpacity * 0.42,
              visibilityRadius: Math.min(1.15, effectiveWeather.visibilityRadius + 0.24),
            };
          }
          if (curWin.timer >= curWin.duration) {
            microWindowRef.current = null;
          }
        }
      } else if (weatherIncidentRef.current || climber.isFalling) {
        microWindowRef.current = null;
      }

      const adrenalineDuck = isIntroActive
        ? 0.45
        : curPhase === 'PLAYING' && climber.isFalling
          ? 0.92
          : curPhase === 'PLAYING' && climber.stamina < 25
            ? ((25 - climber.stamina) / 25) * 0.72
            : 0;
      const windLullFactor = microWindowRef.current?.kind === 'wind_lull' ? 0.16 : 1;

      soundEngine.updateEnvironment(
        altRatio * world.route.windMultiplier,
        effectiveWindForce,
        effectiveWeather.type,
        effectiveWeather.intensity,
        altM,
        world.route.palette,
        adrenalineDuck,
        windLullFactor
      );

      // Altitude-coupled environmental soundscape events: distant avalanche rumbles & canyon rock echoes
      if (curPhase === 'PLAYING' && !isIntroActive && !isPausedReading && !climber.isFalling) {
        const altFactor = Math.min(1, altM / 120);
        const allowAvalanche =
          altM >= 12 || altRatio >= 0.22 || world.route.palette === 'glacial';
        if (allowAvalanche) {
          avalancheTimerRef.current -= dt;
          if (avalancheTimerRef.current <= 0) {
            const avalancheIntensity = Math.min(
              1,
              0.32 +
                altFactor * 0.42 +
                altRatio * 0.16 +
                (world.route.palette === 'glacial' ? 0.16 : 0) +
                (effectiveWeather.type === 'snowstorm' ? 0.2 * effectiveWeather.intensity : 0)
            );
            soundEngine.playDistantAvalanche(altM, avalancheIntensity);
            avalancheTimerRef.current = 25 - altFactor * 10 + Math.random() * 12;
          }
        }

        rockEchoTimerRef.current -= dt;
        if (rockEchoTimerRef.current <= 0) {
          soundEngine.playRockEchoAmbient(altM, world.route.palette);
          rockEchoTimerRef.current = 8 + Math.random() * 8.5;
        }
      }

      if (!isPausedReading) {
        if (effectiveWeather.type === 'rain') {
          const dropCount = Math.ceil(3 * effectiveWeather.intensity);
          for (let r = 0; r < dropCount; r++) {
            particlesRef.current.push({
              x: cam.x + (Math.random() - 0.5) * (width / cam.zoom) * 1.15,
              y: cam.y - (height / cam.zoom) * 0.55,
              vx: effectiveWindForce * 130 - 45,
              vy: 420 + Math.random() * 140,
              size: 1.5,
              life: 0.9,
              maxLife: 0.9,
              color: 'rgba(203, 213, 225, 0.72)',
              kind: 'rain',
            });
          }
        } else if (
          effectiveWeather.type === 'snowstorm' ||
          weatherIncidentRef.current?.type === 'whiteout_squall' ||
          ((world.route.palette === 'glacial' || altRatio > 0.55) && Math.random() < 0.32)
        ) {
          const flakeCount =
            effectiveWeather.type === 'snowstorm' ||
            weatherIncidentRef.current?.type === 'whiteout_squall'
              ? 4
              : 1;
          for (let f = 0; f < flakeCount; f++) {
            particlesRef.current.push({
              x: cam.x + (Math.random() - 0.5) * (width / cam.zoom) * 1.15,
              y: cam.y - (height / cam.zoom) * 0.55,
              vx: effectiveWindForce * 95 - (effectiveWeather.type === 'snowstorm' ? 45 : 18),
              vy: (effectiveWeather.type === 'snowstorm' ? 95 : 48) + Math.random() * 45,
              size: 2 + Math.random() * 2.4,
              life: 2.0,
              maxLife: 2.0,
              color: '#F8FAFC',
              kind: 'snow',
            });
          }
        }
      }

      if (curPhase === 'PLAYING') {
        if (introCutsceneRef.current.active) {
          // 3-second "岩间静谧" pre-climb intro: hold cliff establishing view, then pan cleanly to climber
          const intro = introCutsceneRef.current;
          intro.elapsedSec += dt;
          setIntroElapsed(intro.elapsedSec);
          const responsiveZoom = Math.min(1.04, Math.max(0.68, width / 440));
          const panStart = 0.85;
          const panRaw = Math.max(
            0,
            Math.min(1, (intro.elapsedSec - panStart) / Math.max(0.4, INTRO_DURATION_SEC - panStart))
          );
          const panU = panRaw * panRaw * panRaw * (panRaw * (panRaw * 6 - 15) + 10);
          cam.targetX = 0;
          cam.targetY = intro.startCamY + (-84 - intro.startCamY) * panU;
          cam.targetZoom =
            intro.startZoom + (responsiveZoom - intro.startZoom) * panU;

          if (intro.elapsedSec >= INTRO_DURATION_SEC) {
            completeIntroCutscene();
          }
        } else if (!isReadingRouteRef.current) {
          statsRef.current.elapsedSec += dt;
          statsRef.current.altitudeM = altM;
          if (altM > statsRef.current.maxAltitudeM) {
            statsRef.current.maxAltitudeM = altM;
          }

          // Signature Pitch Section Transition Detection & Nameplate Cue
          const pitches = world.pitchSections;
          if (pitches && pitches.length > 0 && statsRef.current.movesMade > 0) {
            const matchedPitch =
              pitches.find((p) => altRatio >= p.minRatio && altRatio < p.maxRatio) ??
              pitches[pitches.length - 1];
            if (matchedPitch && matchedPitch.index !== activePitchIndexRef.current) {
              activePitchIndexRef.current = matchedPitch.index;
              setPitchBanner({
                name: matchedPitch.name,
                subtitle: matchedPitch.subtitle,
                isCrux: matchedPitch.isCrux,
                index: matchedPitch.index,
              });
              if (pitchBannerTimerRef.current) {
                window.clearTimeout(pitchBannerTimerRef.current);
              }
              pitchBannerTimerRef.current = window.setTimeout(() => {
                setPitchBanner(null);
              }, 3600);
              if (matchedPitch.index > 0) {
                soundEngine.playAlpineHarmonic(matchedPitch.isCrux ? 'tension' : 'calm');
              }
            }
          }

          // Abandoned Wall Supply Cache Discovery (risk-reward flank detour)
          if (world.supplyCaches && world.supplyCaches.length > 0 && !climber.isFalling) {
            for (const cache of world.supplyCaches) {
              if (cache.collected) continue;
              const limbNear = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).some(
                (id) => dist(climber.limbs[id].pos, cache) <= 30
              );
              if (limbNear || dist(climber.torsoPos, cache) <= 38) {
                cache.collected = true;
                const isFreeSoloRun = selectedLoadoutRef.current === 'free-solo';
                soundEngine.playSupplyCollect();
                triggerHapticPreset('chalk');
                spawnParticles(
                  cache.x,
                  cache.y,
                  12,
                  'spark',
                  cache.reward === 'piton' ? '#FBBF24' : '#38BDF8',
                  68
                );
                spawnParticles(cache.x, cache.y, 1, 'ring', '#FDE68A', 0);
                routeEventsRef.current.push({
                  x: cache.x,
                  y: cache.y,
                  kind: 'supply',
                  label: cache.label,
                });
                if (isFreeSoloRun) {
                  const prevS = climber.stamina;
                  climber.stamina = Math.min(climber.maxStamina, climber.stamina + 14);
                  statsRef.current.staminaRecovered += Math.max(0, climber.stamina - prevS);
                  showBanner(
                    `发现「${cache.label}」· ${cache.note}（徒手振奋 +14耐）`,
                    3000
                  );
                } else if (cache.reward === 'piton') {
                  climber.pitonsLeft = Math.min(12, climber.pitonsLeft + 1);
                  showBanner(`发现「${cache.label}」· +1 岩钉（${cache.note}）`, 3000);
                } else {
                  climber.chalkUses = Math.min(8, climber.chalkUses + 1);
                  climber.chalk = Math.min(100, climber.chalk + 25);
                  showBanner(`发现「${cache.label}」· +1 镁粉（${cache.note}）`, 3000);
                }
              }
            }
          }

          if (manualPelvisTimerRef.current > 0) {
            manualPelvisTimerRef.current = Math.max(0, manualPelvisTimerRef.current - dt);
          }

          if (
            flowComboRef.current > 0 &&
            statsRef.current.elapsedSec - lastMoveElapsedRef.current > 3.4
          ) {
            flowComboRef.current = 0;
            climber.flowCombo = 0;
          }

          // Advance deliberate hand-drag Dyno charge (extended dwell debounce + full-charge duration)
          if (dynoChargeRef.current) {
            const charge = dynoChargeRef.current;
            const curDrag = activeLimbDragRef.current;
            const chargeValid =
              !isDraggingPeekRef.current &&
              !climber.isFalling &&
              !climber.dynoFlight &&
              curDrag !== null &&
              curDrag.hasMovedOut &&
              curDrag.pointerId === charge.pointerId &&
              curDrag.limbId === charge.limbId &&
              curDrag.snappedHold?.id === charge.hold.id &&
              curDrag.aimWorldPos !== undefined &&
              dist(curDrag.aimWorldPos, charge.hold) <= DYNO_AIM_DRIFT_LIMIT_PX &&
              isValidHandDynoTarget(climber, holdsMapRef.current, charge.limbId, charge.hold);
            if (!chargeValid) {
              dynoChargeRef.current = null;
              dynoFullNotifiedRef.current = false;
              dynoChargeTickAccRef.current = 0;
            } else {
              const nextDwell = (charge.dwellSec ?? 0) + dt;
              charge.dwellSec = nextDwell;
              if (nextDwell >= DYNO_DWELL_DELAY_SEC) {
                const hasBoost =
                  isStandingOnSpringHold(climber, holdsMapRef.current) ||
                  (climber.swingBoostTimer ?? 0) > 0 ||
                  charge.hold.type === 'swing';
                const chargeDuration = hasBoost
                  ? DYNO_CHARGE_DURATION_BOOST_SEC
                  : DYNO_CHARGE_DURATION_NORMAL_SEC;
                charge.progress = Math.min(1, charge.progress + dt / chargeDuration);
                if (charge.progress > 0.08 && charge.progress < DYNO_MIN_RELEASE_PROGRESS) {
                  dynoChargeTickAccRef.current += dt;
                  if (dynoChargeTickAccRef.current >= 0.19) {
                    dynoChargeTickAccRef.current = 0;
                    const pan = Math.max(
                      -0.82,
                      Math.min(0.82, (charge.hold.x - climber.torsoPos.x) / 95)
                    );
                    soundEngine.playDynoChargeTick(charge.progress, pan);
                  }
                }
                if (
                  charge.progress >= DYNO_MIN_RELEASE_PROGRESS &&
                  !dynoFullNotifiedRef.current
                ) {
                  dynoFullNotifiedRef.current = true;
                  soundEngine.playDynoReady();
                  triggerHapticPreset('dynoReady');
                }
              }
            }
          } else {
            dynoFullNotifiedRef.current = false;
            dynoChargeTickAccRef.current = 0;
          }

          // Adaptive heartbeat pulse coupled to stamina depletion, low health, and falling adrenaline
          attemptMinHealthRef.current = Math.min(attemptMinHealthRef.current, climber.health);
          attemptMinStaminaRef.current = Math.min(attemptMinStaminaRef.current, climber.stamina);
          if (
            !climber.isFalling &&
            !climber.isResting &&
            climber.stamina <= 16 &&
            statsRef.current.movesMade >= 1
          ) {
            const lastWarn = lastStaminaWarnPosRef.current;
            if (
              !lastWarn ||
              Math.hypot(climber.torsoPos.x - lastWarn.x, climber.torsoPos.y - lastWarn.y) >= 72
            ) {
              lastStaminaWarnPosRef.current = {
                x: Math.round(climber.torsoPos.x),
                y: Math.round(climber.torsoPos.y),
              };
              attemptHealthDropsRef.current.push({
                x: Math.round(climber.torsoPos.x),
                y: Math.round(climber.torsoPos.y),
                altitudeM: Number(Math.max(0, -climber.torsoPos.y / PIXELS_PER_METER).toFixed(1)),
                healthLost: 0,
                healthAfter: Math.round(climber.health),
                staminaAfter: Math.round(climber.stamina),
                kind: 'stamina_critical',
                label: `耐力临界 ${Math.round(climber.stamina)}%`,
              });
            }
          }
          const staminaPct = climber.stamina / climber.maxStamina;
          const healthPct = climber.health / 100;
          const lowStaminaStress = climber.stamina < 34 ? (34 - climber.stamina) / 34 : 0;
          const lowHealthStress = climber.health < 48 ? (48 - climber.health) / 48 : 0;
          const cardiacStress = climber.isFalling
            ? 1
            : Math.max(lowStaminaStress, lowHealthStress * 0.85);
          if (cardiacStress > 0.04) {
            heartbeatAccRef.current += dt;
            const hbInterval = 0.96 - cardiacStress * 0.4;
            if (heartbeatAccRef.current >= hbInterval) {
              heartbeatAccRef.current = 0;
              soundEngine.playHeartbeat(0.45 + cardiacStress * 0.55);
              if (cardiacStress > 0.58) {
                triggerHapticPreset('heartbeat');
              }
            }
          } else {
            heartbeatAccRef.current = 0.55;
          }

          // Continuous exertion-coupled breathing & panting system driven by stamina/health drain
          const staminaFatigue = Math.max(0, (0.78 - staminaPct) / 0.78);
          const healthFatigue = Math.max(0, 1 - healthPct) * 0.45;
          const drainStress =
            staminaRateRef.current < -0.5
              ? Math.min(0.32, Math.abs(staminaRateRef.current) * 0.08)
              : 0;
          const breathExertion = Math.min(
            1,
            staminaFatigue * 0.82 + healthFatigue + drainStress
          );
          if (!climber.isFalling) {
            if (
              (climber.isResting || climber.isShakingOut) &&
              (staminaPct < 0.92 || healthPct < 0.95)
            ) {
              breathAccRef.current += dt;
              if (breathAccRef.current >= 2.35) {
                breathAccRef.current = 0;
                soundEngine.playBreath(
                  Math.max(0.28, breathExertion),
                  'recovery',
                  climberGenderRef.current
                );
              }
            } else if (breathExertion >= 0.14) {
              breathAccRef.current += dt;
              const breathInterval = 2.75 - breathExertion * 1.72;
              if (breathAccRef.current >= breathInterval) {
                breathAccRef.current = 0;
                soundEngine.playBreath(breathExertion, 'normal', climberGenderRef.current);
              }
            } else {
              breathAccRef.current = Math.min(breathAccRef.current, 1.1);
            }
          }

          if (!climber.isFalling) {
            fallStartYRef.current = climber.torsoPos.y;
            fallStartPosRef.current = { x: climber.torsoPos.x, y: climber.torsoPos.y };
            const activeLoadout =
              LOADOUT_OPTIONS.find((l) => l.id === selectedLoadoutRef.current) ??
              LOADOUT_OPTIONS[1];

            roadbookFlowTimerRef.current = Math.max(0, roadbookFlowTimerRef.current - dt);
            const roadbookFlowBonus = Math.min(1, roadbookFlowTimerRef.current / 3.5);
            const manualPelvisOverride =
              activePelvisDragRef.current !== null || manualPelvisTimerRef.current > 0;

            const phys = updateClimberPhysics(
              climber,
              holdsMapRef.current,
              world.ledges,
              effectiveWindForce,
              world.route.drainMultiplier * activeLoadout.drainMult,
              effectiveWeather,
              dt,
              roadbookFlowBonus,
              manualPelvisOverride
            );

            // Track exact physical stamina expenditure, recovery & time-weighted average
            statsRef.current.staminaSpent += phys.staminaSpentDelta;
            statsRef.current.staminaRecovered += phys.staminaRecoveredDelta;
            staminaRateRef.current = phys.netStaminaRatePerSec;
            statsRef.current.staminaSamplesSum += climber.stamina * dt;
            statsRef.current.staminaSampleCount += dt;

            // Periodic resonant sound, tactile dust & micro camera tremor when standing on a Tremor Hold
            if (phys.activeTremor) {
              const { hold: tremorHold, intensity, isFoot } = phys.activeTremor;
              tremorSoundAccRef.current += dt;
              const pulseInterval = Math.max(0.16, 0.36 - intensity * 0.18);
              if (tremorSoundAccRef.current >= pulseInterval) {
                tremorSoundAccRef.current = 0;
                soundEngine.playTremorRumble(
                  tremorHold.tremorFreq ?? 22,
                  intensity,
                  isFoot
                );
                if (intensity > 0.45) {
                  triggerHaptic(8, 'low');
                }
                spawnParticles(
                  tremorHold.x + (Math.random() - 0.5) * 10,
                  tremorHold.y + 4,
                  intensity > 0.6 ? 4 : 2,
                  'dust',
                  intensity > 0.65 ? '#F0ABFC' : '#C4B5FD',
                  36
                );
              }
              cam.shake = Math.max(cam.shake, 0.75 + intensity * 2.1);
            } else {
              tremorSoundAccRef.current = 0.25;
            }

            // Escalating stone-fracture crack warnings on Fragile Holds
            if (phys.fragileCrackEvent) {
              const { stage, hold: crackHold } = phys.fragileCrackEvent;
              const pan = Math.max(-0.82, Math.min(0.82, (crackHold.x - climber.torsoPos.x) / 95));
              soundEngine.playFragileCrack(stage, pan);
              triggerHaptic(stage === 3 ? 14 : 7, stage === 3 ? 'high' : 'low');
              spawnParticles(
                crackHold.x,
                crackHold.y + 4,
                stage * 3,
                'dust',
                stage === 3 ? '#F59E0B' : '#CBD5E1',
                42
              );
            }

            reachableIdsRef.current = getReachableHoldIds(
              climber,
              world.holds,
              lockedLimbRef.current
            );

            if (phys.dynoLanded) {
              const { hold: landedHold, limbId: landedLimb, slipped } = phys.dynoLanded;
              if (slipped) {
                statsRef.current.keyActionErrors += 1;
                flowComboRef.current = 0;
                climber.flowCombo = 0;
                soundEngine.playSlip();
                soundEngine.playBreath(0.85, 'gasp', climberGenderRef.current);
                triggerHapticPreset('slip');
                spawnParticles(landedHold.x, landedHold.y, 12, 'dust', '#38BDF8', 85);
                lastSlipNoteRef.current = '腾空跃抓冰湿岩点且未涂镁粉，指尖打滑脱手';
                showBanner('跃抓打滑！冰湿岩面未擦镁粉', 1600);
              } else {
                const landPan = Math.max(
                  -0.82,
                  Math.min(0.82, (landedHold.x - climber.torsoPos.x) / 95)
                );
                soundEngine.playGrab(landedHold.type, {
                  isFoot: false,
                  isSnowy: landedHold.type === 'ice',
                  wet: !!landedHold.wet,
                  pan: landPan,
                  load: 0.9,
                });
                if (selectedLoadoutRef.current !== 'free-solo') {
                  soundEngine.playGearClink(landPan, 0.78);
                }
                triggerHapticPreset(landedHold.type === 'ice' ? 'grabIce' : 'grabHand');
                cam.shake = 4.5;
                spawnParticles(landedHold.x, landedHold.y, 10, 'chalk', '#F8FAFC', 55);
                spawnParticles(landedHold.x, landedHold.y, 1, 'ring', '#38BDF8', 0);
                statsRef.current.movesMade += 1;
                flowComboRef.current = Math.min(8, flowComboRef.current + 1);
                lastMoveElapsedRef.current = statsRef.current.elapsedSec;
                climber.flowCombo = flowComboRef.current;
                if (flowComboRef.current >= 2) {
                  soundEngine.playComboChime(flowComboRef.current, landPan);
                }

                if (landedHold.type === 'swing') {
                  const prevS = climber.stamina;
                  climber.stamina = Math.min(climber.maxStamina, climber.stamina + 6);
                  statsRef.current.staminaRecovered += Math.max(0, climber.stamina - prevS);
                  climber.swingBoostTimer = 4.5;
                  spawnParticles(landedHold.x, landedHold.y, 12, 'spark', '#22D3EE', 90);
                }

                climber.routeHistory.push({ x: climber.torsoPos.x, y: climber.torsoPos.y });
                const dynoGrabbedIds = attemptGrabbedHoldIdsRef.current;
                if (dynoGrabbedIds[dynoGrabbedIds.length - 1] !== landedHold.id) {
                  dynoGrabbedIds.push(landedHold.id);
                }
                const dynoPinIdx = betaPinsRef.current.indexOf(
                  landedHold.id,
                  betaCursorRef.current
                );
                if (dynoPinIdx >= 0) {
                  statsRef.current.betaPinsFollowed += 1;
                  statsRef.current.roadbookFlowHits += 1;
                  roadbookFlowTimerRef.current = 6.5;
                  const nextCursor = Math.min(betaPinsRef.current.length, dynoPinIdx + 1);
                  betaCursorRef.current = nextCursor;
                  setBetaCursor(nextCursor);
                } else if (landedHold.isDecoy) {
                  roadbookFlowTimerRef.current = 0;
                }

                // Ensure trailing foot catches a nearby reachable hold if over-stretched limbs detached during leap
                const anchoredAfter = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
                  (id) => climber.limbs[id].holdId !== null
                );
                if (anchoredAfter.length < 2) {
                  const targetFoot: LimbId = landedLimb === 'leftHand' ? 'rightFoot' : 'leftFoot';
                  const footCandidate = world.holds
                    .filter(
                      (h) =>
                        !h.broken &&
                        h.id !== landedHold.id &&
                        h.y > climber.torsoPos.y + 12 &&
                        Math.hypot(h.x - climber.torsoPos.x, h.y - (climber.torsoPos.y + 42)) <=
                          LEG_MAX_REACH + 16
                    )
                    .sort((a, b) => {
                      const decoyPenA = a.isDecoy ? 24 : 0;
                      const decoyPenB = b.isDecoy ? 24 : 0;
                      return (
                        Math.hypot(a.x - climber.torsoPos.x, a.y - (climber.torsoPos.y + 42)) +
                        decoyPenA -
                        (Math.hypot(b.x - climber.torsoPos.x, b.y - (climber.torsoPos.y + 42)) +
                          decoyPenB)
                      );
                    })[0];
                  if (footCandidate) {
                    const fLimb = climber.limbs[targetFoot];
                    fLimb.holdId = footCandidate.id;
                    fLimb.startPos = { x: footCandidate.x, y: footCandidate.y };
                    fLimb.pos = { x: footCandidate.x, y: footCandidate.y };
                    fLimb.targetPos = { x: footCandidate.x, y: footCandidate.y };
                    fLimb.reachT = 1;
                  }
                }

                showBanner(
                  landedHold.type === 'swing' ? '摆荡跃抓扣住 · 回耐 +5' : '跃抓扣住',
                  1100
                );
                const summitLedge = world.ledges.find((l) => l.isSummit);
                if (summitLedge && landedHold.y <= summitLedge.y + 12) {
                  triggerSummit();
                }
              }
              reachableIdsRef.current = getReachableHoldIds(
                climber,
                world.holds,
                lockedLimbRef.current
              );
            }

            if (phys.slippedLimb) {
              statsRef.current.keyActionErrors += 1;
              soundEngine.playSlip();
              soundEngine.playBreath(0.78, 'gasp', climberGenderRef.current);
              triggerHapticPreset('slip');
              const slippedLimbLabel = climber.limbs[phys.slippedLimb].label;
              const slippedPos = climber.limbs[phys.slippedLimb].pos;
              spawnParticles(slippedPos.x, slippedPos.y, 10, 'dust', '#D97706', 80);
              cam.shake = 7;
              routeEventsRef.current.push({
                x: slippedPos.x,
                y: slippedPos.y,
                kind: 'slip',
                label: '打滑脱手',
              });

              const reasonText =
                phys.slipReason === 'fragile_break'
                  ? `${slippedLimbLabel}踩压风化脆岩过久导致岩点碎裂`
                  : phys.slipReason === 'tremor_shake'
                    ? `${slippedLimbLabel}在颤动支点停留过久，被岩体剧烈震动甩滑脱开`
                    : phys.slipReason === 'ice_unchalked'
                      ? `${slippedLimbLabel}停在冰霜岩面且未涂镁粉导致打滑`
                      : phys.slipReason === 'wet_slip'
                        ? `${slippedLimbLabel}踩中渗水湿滑点且镁粉不足`
                        : phys.slipReason === 'direction_mismatch'
                          ? `${slippedLimbLabel}抓握侧拉/反扣点时重心方向相反，无法锁住受力`
                          : phys.slipReason === 'overload'
                            ? `${slippedLimbLabel}受力过载且重心失衡，发生滑脱`
                            : `耐力耗尽导致${slippedLimbLabel}无力脱手`;
              lastSlipNoteRef.current = reasonText;
              if (phys.slipReason === 'stamina_exhausted') {
                const lastWarn = lastStaminaWarnPosRef.current;
                if (
                  !lastWarn ||
                  Math.hypot(climber.torsoPos.x - lastWarn.x, climber.torsoPos.y - lastWarn.y) >= 48
                ) {
                  lastStaminaWarnPosRef.current = {
                    x: Math.round(climber.torsoPos.x),
                    y: Math.round(climber.torsoPos.y),
                  };
                  attemptHealthDropsRef.current.push({
                    x: Math.round(climber.torsoPos.x),
                    y: Math.round(climber.torsoPos.y),
                    altitudeM: Number(Math.max(0, -climber.torsoPos.y / PIXELS_PER_METER).toFixed(1)),
                    healthLost: 0,
                    healthAfter: Math.round(climber.health),
                    staminaAfter: 0,
                    kind: 'stamina_critical',
                    label: '耐力耗尽临界',
                  });
                }
              }
              const routeFailArr = (failSpotsByRouteRef.current[world.route.id] ??= []);
              routeFailArr.push(climber.torsoPos.y);
              showBanner(`${slippedLimbLabel} 打滑脱手！`, 1400);
            }

            if (phys.reachedLedge && !phys.reachedLedge.visited) {
              phys.reachedLedge.visited = true;
              const isFreeSoloRun = selectedLoadoutRef.current === 'free-solo';
              if (!isFreeSoloRun) {
                climber.lastCheckpointX = phys.reachedLedge.x;
                climber.lastCheckpointY = phys.reachedLedge.y;
              }
              if (phys.reachedLedge.isBivouac) {
                if (!isFreeSoloRun) {
                  climber.pitonsLeft = Math.min(12, climber.pitonsLeft + 2);
                  climber.chalkUses = Math.min(8, climber.chalkUses + 1);
                }
                routeEventsRef.current.push({
                  x: phys.reachedLedge.x,
                  y: phys.reachedLedge.y,
                  kind: 'bivouac',
                  label: phys.reachedLedge.label,
                });
                if (
                  weather.type === 'snowstorm' ||
                  world.route.palette === 'glacial' ||
                  altRatio > 0.6
                ) {
                  soundEngine.playSnowCrunch(0.85);
                }
                soundEngine.playBivouacChime();
                soundEngine.playBreath(0.42, 'recovery', climberGenderRef.current);
                triggerHaptic(15, 'medium');
                showBanner(
                  isFreeSoloRun
                    ? `抵达 ${phys.reachedLedge.label} · 徒手无保护，可原地喘息`
                    : `抵达 ${phys.reachedLedge.label} · 补给+2岩钉`,
                  2600
                );
              }
            }

            if (phys.triggeredFall) {
              // Immediately cancel any active pointer drag or dyno charge so falling state stays pristine
              if (activeLimbDragRef.current) {
                climber.limbs[activeLimbDragRef.current.limbId].isDragging = false;
                activeLimbDragRef.current = null;
                setActiveDragReason(null);
              }
              activePelvisDragRef.current = null;
              dynoChargeRef.current = null;
              (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
                climber.limbs[id].isDragging = false;
              });
              ropeCatchTimeRef.current = 0;

              if (!phys.slippedLimb) {
                statsRef.current.keyActionErrors += 1;
              }
              soundEngine.playSlip();
              soundEngine.playBreath(0.96, 'gasp', climberGenderRef.current);
              triggerHapticPreset('fall');
              const routeFailArr = (failSpotsByRouteRef.current[world.route.id] ??= []);
              routeFailArr.push(fallStartYRef.current);
              if (!lastSlipNoteRef.current) {
                lastSlipNoteRef.current = '支撑点少于 2 个，失去平衡脱壁坠落';
              }
              showBanner('失去支撑 · 坠落中！', 1600);
            }

            // Contextual Tactical Hint Evaluation (for stalls, repeated failure spots, and high-difficulty cruxes — never shows rigid tutorials on tier >= 3)
            if (!activeLimbDragRef.current && !activePelvisDragRef.current) {
              stallTimerRef.current += dt;
            } else {
              stallTimerRef.current = 0;
            }
            hintEvalAccRef.current += dt;
            if (hintEvalAccRef.current >= 0.6) {
              hintEvalAccRef.current = 0;
              const cooldownOk = statsRef.current.elapsedSec - lastHintElapsedRef.current >= 18;
              if (!tutorialRef.current.active && cooldownOk) {
                const fails = failSpotsByRouteRef.current[world.route.id] ?? [];
                const nearbyFails = fails.filter(
                  (fy) => Math.abs(fy - climber.torsoPos.y) < 95
                ).length;
                const failBand = Math.round(climber.torsoPos.y / 90);
                const bin = world.difficultyProfile.find(
                  (b) => altM >= b.startM && altM <= b.endM
                );
                const isCruxEntry =
                  !!bin &&
                  ((world.route.tier >= 5 && bin.difficulty >= 68) ||
                    (world.route.tier >= 7 && bin.difficulty >= 60)) &&
                  !cruxWarnedBinsRef.current.has(bin.index);

                const shouldHintStall = stallTimerRef.current >= 12.5;
                const shouldHintFail =
                  nearbyFails >= 2 && !warnedFailBandsRef.current.has(failBand);

                if (shouldHintStall || shouldHintFail || isCruxEntry) {
                  if (shouldHintFail) warnedFailBandsRef.current.add(failBand);
                  if (isCruxEntry && bin) cruxWarnedBinsRef.current.add(bin.index);
                  stallTimerRef.current = 0;
                  showTacticalHint(
                    pickTacticalHint(
                      climber,
                      world,
                      weather,
                      pitonsRef.current,
                      reachableIdsRef.current
                    )
                  );
                }
              }
            }

            const summitLedge = world.ledges.find((l) => l.isSummit);
            if (summitLedge && climber.torsoPos.y <= summitLedge.y - 6) {
              triggerSummit();
            }
          } else {
            staminaRateRef.current = 0;
            roadbookFlowTimerRef.current = 0;

            const fallSubSteps = Math.max(1, Math.ceil(dt / 0.016));
            const fallStepDt = dt / fallSubSteps;

            for (let step = 0; step < fallSubSteps; step++) {
              if (!climber.isFalling) break;

              climber.torsoVel.y = Math.min(460, climber.torsoVel.y + 620 * fallStepDt);
              climber.torsoPos.x += (climber.torsoVel.x + windForce * 16) * fallStepDt;
              climber.torsoPos.y += climber.torsoVel.y * fallStepDt;

              const fallDist = climber.torsoPos.y - fallStartYRef.current;

              // 1. Engage damped climbing rope arrest after real downward drop (never frame-0 snap/teleport)
              if (!climber.ropeCatch) {
                const catchingPiton = [...pitonsRef.current]
                  .reverse()
                  .find(
                    (p) =>
                      p.integrity > 0 &&
                      p.y <= fallStartYRef.current + 95 &&
                      (fallDist >= 24 || (climber.torsoPos.y >= p.y + 62 && climber.torsoVel.y >= 48)) &&
                      climber.torsoPos.y >= p.y + 52 &&
                      Math.abs(p.x - climber.torsoPos.x) < 120
                  );

                if (catchingPiton) {
                  if (catchingPiton.isRusty && !catchingPiton.reliable) {
                    catchingPiton.integrity = 0;
                    soundEngine.playSlip();
                    soundEngine.playBreath(0.95, 'gasp', climberGenderRef.current);
                    triggerHapticPreset('fall');
                    cam.shake = 10;
                    spawnParticles(catchingPiton.x, catchingPiton.y, 14, 'spark', '#D97706', 110);
                    lastSlipNoteRef.current = `${lastSlipNoteRef.current ? `${lastSlipNoteRef.current}；` : ''}下坠后依赖的锈蚀旧岩钉崩断`;
                    showBanner('锈蚀旧岩钉崩断！继续下坠！', 1800);
                  } else {
                    const wasRusty = !!catchingPiton.isRusty;
                    if (wasRusty) {
                      catchingPiton.integrity = 0;
                    }
                    // Strictly match actual catch distance so initial stretch is 0px (ZERO upward snap!)
                    const catchDist = dist(climber.torsoPos, catchingPiton);
                    const initialLen = Math.max(54, catchDist);
                    climber.ropeCatch = {
                      pitonId: catchingPiton.id,
                      anchor: { x: catchingPiton.x, y: catchingPiton.y },
                      ropeLen: initialLen,
                    };
                    ropeCatchTimeRef.current = 0;
                    // Absorb sudden arrest energy smoothly so climber transitions into a heavy pendulum
                    climber.torsoVel.y = Math.min(130, Math.max(12, climber.torsoVel.y * 0.45));
                    climber.torsoVel.x = Math.max(-75, Math.min(75, climber.torsoVel.x * 0.45));
                    const prevCatchHealth = climber.health;
                    climber.health = Math.max(0, climber.health - Math.min(22, 6 + fallDist * 0.04));
                    const catchHealthLost = Math.round(prevCatchHealth - climber.health);
                    climber.stamina = Math.max(32, climber.stamina);
                    attemptMinHealthRef.current = Math.min(attemptMinHealthRef.current, climber.health);
                    if (catchHealthLost > 0) {
                      const rx = Math.round(
                        fallStartPosRef.current.y < -8 ? fallStartPosRef.current.x : catchingPiton.x
                      );
                      const ry = Math.round(
                        fallStartPosRef.current.y < -8 ? fallStartPosRef.current.y : catchingPiton.y
                      );
                      attemptHealthDropsRef.current.push({
                        x: rx,
                        y: ry,
                        altitudeM: Number(Math.max(0, -ry / PIXELS_PER_METER).toFixed(1)),
                        healthLost: catchHealthLost,
                        healthAfter: Math.round(climber.health),
                        staminaAfter: Math.round(climber.stamina),
                        kind: 'rope_catch',
                        label: `冲坠 -${catchHealthLost}体`,
                      });
                    }
                    statsRef.current.fallsCaught += 1;
                    routeEventsRef.current.push({
                      x: catchingPiton.x,
                      y: catchingPiton.y,
                      kind: 'slip',
                      label: '冲坠拉停',
                    });
                    soundEngine.playRopeCatch();
                    soundEngine.playBreath(0.86, 'exertion', climberGenderRef.current);
                    triggerHapticPreset('ropeCatch');
                    cam.shake = 9;
                    spawnParticles(catchingPiton.x, catchingPiton.y, 12, 'spark', '#F97316', 105);
                    showBanner(
                      wasRusty
                        ? '古老旧岩钉拉住了下坠！（已弯曲报废）'
                        : '保护绳张紧缓冲中，顺势摆荡抓回岩点！',
                      2000
                    );
                  }
                } else if (climber.torsoPos.y > 0 || fallDist > 280) {
                  climber.isFalling = false;
                  climber.ropeCatch = null;
                  climber.torsoVel = { x: 0, y: 0 };
                  const prevFatalHealth = climber.health;
                  climber.health = 0;
                  attemptMinHealthRef.current = 0;
                  if (prevFatalHealth > 0) {
                    const rx = Math.round(
                      fallStartPosRef.current.y < -8 ? fallStartPosRef.current.x : climber.torsoPos.x
                    );
                    const ry = Math.round(
                      fallStartPosRef.current.y < -8 ? fallStartPosRef.current.y : climber.torsoPos.y
                    );
                    attemptHealthDropsRef.current.push({
                      x: rx,
                      y: ry,
                      altitudeM: Number(Math.max(0, -ry / PIXELS_PER_METER).toFixed(1)),
                      healthLost: Math.round(prevFatalHealth),
                      healthAfter: 0,
                      staminaAfter: Math.round(climber.stamina),
                      kind: 'fall_fatal',
                      label: `重坠 -${Math.round(prevFatalHealth)}体`,
                    });
                  }
                  cam.shake = 12;
                  soundEngine.playRopeCatch();
                  triggerHapticPreset('ropeCatch');
                  const fallDiag =
                    selectedLoadoutRef.current === 'free-solo'
                      ? `${lastSlipNoteRef.current ?? '高处失去支撑'}；徒手攀登无绳索与岩钉保护，只能从头重攀`
                      : `${lastSlipNoteRef.current ?? '高处失去支撑'}，且上方及横向范围内缺少已固定的岩钉保护`;
                  setFallDiagnosis(fallDiag);
                  recordCurrentAttempt('FALLEN', fallDiag);
                  phaseRef.current = 'FALLEN';
                  setPhase('FALLEN');
                  break;
                }
              }

              // 2. Physically constrained inextensible pendulum rope arrest (ZERO elastic slingshot or snap!)
              if (climber.isFalling && climber.ropeCatch) {
                const rc = climber.ropeCatch;
                ropeCatchTimeRef.current += fallStepDt;

                const curSpdBefore = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
                // Gently ease slack only at low speed so rope never yanks climber upward
                if (rc.ropeLen > 86 && curSpdBefore < 95) {
                  rc.ropeLen = Math.max(86, rc.ropeLen - 14 * fallStepDt);
                }

                const dx = rc.anchor.x - climber.torsoPos.x;
                const dy = rc.anchor.y - climber.torsoPos.y;
                const d = Math.hypot(dx, dy) || 1;
                if (d > rc.ropeLen) {
                  const nx = dx / d; // points from climber toward piton anchor
                  const ny = dy / d;
                  const stretch = d - rc.ropeLen;
                  // Bounded nonlinear position projection (<= 4.5px per substep -> zero sudden upward snap)
                  const rawProj = stretch * (0.42 / (1 + stretch * 0.055));
                  const proj = Math.min(4.5, rawProj);
                  climber.torsoPos.x += nx * proj;
                  climber.torsoPos.y += ny * proj;

                  // Nonlinear collision restitution: high-speed arrest collapses cleanly to zero bounce
                  const vRad = climber.torsoVel.x * nx + climber.torsoVel.y * ny;
                  if (vRad < 0) {
                    const arrestRestitution = computeNonlinearRestitution(-vRad, stretch, 0.04);
                    const cancelFactor = Math.min(1, 1 - arrestRestitution * 0.25);
                    climber.torsoVel.x -= nx * vRad * cancelFactor;
                    climber.torsoVel.y -= ny * vRad * cancelFactor;
                  }
                  // Bleed off inbound velocity nonlinearly so rope never catapults climber above piton
                  if (vRad > 14) {
                    const retainRatio = computeNonlinearRestitution(vRad, stretch, 0.22);
                    const excessIn = (vRad - 14) * (1 - retainRatio);
                    climber.torsoVel.x -= nx * excessIn;
                    climber.torsoVel.y -= ny * excessIn;
                  }
                }

                // Frame-rate-independent pendulum damping + strict speed & upward-velocity cap
                const damp = Math.exp(-3.8 * fallStepDt);
                climber.torsoVel.x *= damp;
                climber.torsoVel.y *= damp;
                climber.torsoVel.y = Math.max(-18, Math.min(200, climber.torsoVel.y));
                const spd = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
                if (spd > 190) {
                  const s = 190 / spd;
                  climber.torsoVel.x *= s;
                  climber.torsoVel.y *= s;
                }
                // Never allow rope swing to shoot above the piton anchor
                if (climber.torsoPos.y < rc.anchor.y + 30) {
                  climber.torsoPos.y = rc.anchor.y + 30;
                  climber.torsoVel.y = Math.max(0, climber.torsoVel.y);
                }
                climber.leanAngle = Math.max(-0.4, Math.min(0.4, -climber.torsoVel.x * 0.002));

                const settledSpeed = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
                if (
                  (ropeCatchTimeRef.current >= 0.45 &&
                    settledSpeed < 30 &&
                    climber.torsoPos.y >= rc.anchor.y + 36) ||
                  ropeCatchTimeRef.current >= 1.7
                ) {
                  climber.isFalling = false;
                  climber.ropeCatch = null;
                  climber.torsoVel = { x: 0, y: 0 };
                  climber.leanAngle = 0;
                  ropeCatchTimeRef.current = 0;

                  if (climber.health <= 0) {
                    const fallDiag = `${lastSlipNoteRef.current ?? '多次冲坠损耗体力'}，最终伤重不支`;
                    setFallDiagnosis(fallDiag);
                    recordCurrentAttempt('FALLEN', fallDiag);
                    phaseRef.current = 'FALLEN';
                    setPhase('FALLEN');
                  } else {
                    // Pick mutually reachable recovery holds around actual hanging spot (no cross-wall teleport!)
                    const hangHandTargetY = climber.torsoPos.y - 44;
                    const allCandidates = world.holds
                      .filter((h) => !h.broken)
                      .sort((a, b) => {
                        const decA = a.isDecoy ? 36 : 0;
                        const decB = b.isDecoy ? 36 : 0;
                        return (
                          Math.hypot(a.x - climber.torsoPos.x, a.y - hangHandTargetY) +
                          decA -
                          (Math.hypot(b.x - climber.torsoPos.x, b.y - hangHandTargetY) + decB)
                        );
                      });

                    let handPair: Hold[] = [];
                    if (allCandidates.length >= 2) {
                      const primary = allCandidates[0];
                      const partner =
                        allCandidates.slice(1).find(
                          (h) => Math.hypot(h.x - primary.x, h.y - primary.y) <= 118
                        ) ?? allCandidates[1];
                      handPair = [primary, partner].sort((a, b) => a.x - b.x);
                    }

                    if (handPair.length === 2) {
                      const midX = (handPair[0].x + handPair[1].x) * 0.5;
                      // Place torso at natural straight-arm dead-hang (+54) so next physics tick stays rock-still
                      const hangMidY = (handPair[0].y + handPair[1].y) * 0.5 + 54;
                      const shiftDx = midX - climber.torsoPos.x;
                      const shiftDy = hangMidY - climber.torsoPos.y;
                      const shiftDist = Math.hypot(shiftDx, shiftDy);
                      // Only nudge minimally if close; never visually catapult across the wall
                      if (shiftDist > 16 && shiftDist <= 95) {
                        const maxNudge = 24;
                        const ratio = Math.min(1, maxNudge / shiftDist);
                        climber.torsoPos = {
                          x: climber.torsoPos.x + shiftDx * ratio,
                          y: climber.torsoPos.y + shiftDy * ratio,
                        };
                      } else if (shiftDist > 95) {
                        // Hung over an empty gap far from rock holds: settle smoothly right below the pair
                        climber.torsoPos = { x: midX, y: hangMidY };
                      }
                      const lh = climber.limbs.leftHand;
                      lh.holdId = handPair[0].id;
                      lh.pos = { x: handPair[0].x, y: handPair[0].y };
                      lh.startPos = { x: handPair[0].x, y: handPair[0].y };
                      lh.targetPos = { x: handPair[0].x, y: handPair[0].y };
                      lh.reachT = 1;

                      const rh = climber.limbs.rightHand;
                      rh.holdId = handPair[1].id;
                      rh.pos = { x: handPair[1].x, y: handPair[1].y };
                      rh.startPos = { x: handPair[1].x, y: handPair[1].y };
                      rh.targetPos = { x: handPair[1].x, y: handPair[1].y };
                      rh.reachT = 1;
                    }
                    showBanner('保护绳已稳住摆荡！快把双脚踩上岩点', 2000);
                  }
                  break;
                }
              }
            }

            if (climber.isFalling) {
              (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
                const l = climber.limbs[id];
                l.holdId = null;
                l.pos.x += (climber.torsoPos.x + (l.isLeft ? -18 : 18) - l.pos.x) * Math.min(1, dt * 12);
                l.pos.y += (climber.torsoPos.y + (l.isHand ? -26 : 32) - l.pos.y) * Math.min(1, dt * 12);
              });
            }
          }
          // Track validated post-physics torsoVel.y for airborne pointer-move spike interception
          lastSafeTorsoVelYRef.current = Number.isFinite(climber.torsoVel.y)
            ? climber.torsoVel.y
            : 0;
        }

        if (!introCutsceneRef.current.active) {
          const responsiveZoom = Math.min(1.04, Math.max(0.68, width / 440));
          // Keep identical camera zoom in Route-Reading mode so original-position holds never jump
          const readZoomMult = 1;
          const activeDrag = activeLimbDragRef.current;
          const dragLeadX =
            activeDrag?.hasMovedOut && activeDrag.aimWorldPos
              ? Math.max(-20, Math.min(20, (activeDrag.aimWorldPos.x - climber.torsoPos.x) * 0.16))
              : 0;
          const dragLeadY =
            activeDrag?.hasMovedOut && activeDrag.aimWorldPos
              ? Math.max(-28, Math.min(18, (activeDrag.aimWorldPos.y - climber.torsoPos.y) * 0.2))
              : 0;
          cam.targetX = climber.torsoPos.x * 0.72 + dragLeadX;
          cam.targetY = climber.torsoPos.y - 42 + peekOffsetYRef.current + dragLeadY;
          cam.targetZoom = responsiveZoom * readZoomMult;
        }
      } else if (curPhase === 'SUMMIT') {
        summitProgressRef.current = Math.min(1, summitProgressRef.current + dt * 0.14);
        const sp = summitProgressRef.current;
        const summitLedge = world.ledges.find((l) => l.isSummit);
        const peakX = summitLedge?.x ?? 0;
        const peakTopY = (summitLedge?.y ?? -mountainHeight) - 15;

        // Animate triumphant standing celebration directly on the highest summit point
        const riseRaw = Math.min(1, sp / 0.14);
        const smoothRise = riseRaw * riseRaw * riseRaw * (riseRaw * (riseRaw * 6 - 15) + 10);
        const cheerWave = Math.sin(timeSec * 2.4) * 2.2;
        const swayX = Math.sin(timeSec * 1.25) * 1.3;
        climber.torsoPos = { x: peakX + swayX * 0.35, y: peakTopY - 80 };
        climber.leanAngle = Math.sin(timeSec * 1.25) * 0.025;
        climber.lookAngle = -0.22 + Math.sin(timeSec * 1.7) * 0.035;
        climber.hipTwist = 0.06;
        climber.wallHug = 0.2;
        climber.pelvisOffset = { x: swayX * 0.35, y: 0 };
        climber.limbs.leftFoot.pos = { x: peakX - 10, y: peakTopY - 2 };
        climber.limbs.rightFoot.pos = { x: peakX + 11, y: peakTopY - 2 };
        climber.limbs.leftHand.pos = {
          x: peakX - (18 + 8 * smoothRise) + swayX * 0.5,
          y: peakTopY - (86 + 38 * smoothRise) + cheerWave * 0.5,
        };
        climber.limbs.rightHand.pos = {
          x: peakX + (18 + 9 * smoothRise) + swayX * 0.5,
          y: peakTopY - (86 + 42 * smoothRise) - cheerWave * 0.5,
        };

        // Stage 1 (PAN_REVEAL): Smooth crest beat followed by panoramic pan & exponential optical pull-back
        // unveiling the full mountain silhouette before transitioning to the inspirational quote.
        const responsiveSummitZoom = Math.min(1.04, Math.max(0.68, width / 440));
        const fitHeightZoom = (height * 0.72) / (mountainHeight + 240);
        const fitWidthZoom = (width * 0.72) / 560;
        const fullMountainZoom = Math.max(0.14, Math.min(fitHeightZoom, fitWidthZoom, 0.48));

        if (isPlayingTrailRef.current) {
          // Explicit post-summit route trail replay zooms out to display the full climbed path
          cam.targetX = peakX * 0.22;
          cam.targetY = -mountainHeight * 0.5;
          cam.targetZoom = fullMountainZoom;
        } else {
          const snap = summitCamStartRef.current ?? {
            x: peakX,
            y: peakTopY - 56,
            zoom: Math.min(0.96, responsiveSummitZoom * 0.92),
          };
          const crestTargetX = peakX;
          const crestTargetY = peakTopY - 56;
          const crestTargetZoom = Math.min(0.96, responsiveSummitZoom * 0.92);

          // Beat A (0.00 -> 0.14): Gentle framing glide onto the climber standing on the summit crest
          const crestRaw = Math.max(0, Math.min(1, sp / 0.14));
          const crestU = crestRaw * crestRaw * crestRaw * (crestRaw * (crestRaw * 6 - 15) + 10);
          const framedX = snap.x + (crestTargetX - snap.x) * crestU;
          const framedY = snap.y + (crestTargetY - snap.y) * crestU;
          const framedZoom = snap.zoom * Math.pow(crestTargetZoom / Math.max(0.1, snap.zoom), crestU);

          // Beat B (0.14 -> 0.86): Continuous quintic panoramic pan + exponential zoom-out
          // revealing the full mountain face & silhouette before settling cleanly.
          const panRaw = Math.max(0, Math.min(1, (sp - 0.14) / 0.72));
          const panU = panRaw * panRaw * panRaw * (panRaw * (panRaw * 6 - 15) + 10);

          const panoramicZoom = Math.max(
            fullMountainZoom,
            Math.min(crestTargetZoom * 0.48, Math.max(0.24, responsiveSummitZoom * 0.36))
          );
          const panoramicY = Math.max(crestTargetY + 140, -mountainHeight * 0.46);
          const panoramicArcX = Math.sin(panU * Math.PI) * (-peakX * 0.18);

          cam.targetX = framedX * (1 - panU) + panoramicArcX;
          cam.targetY = framedY + (panoramicY - framedY) * panU;
          cam.targetZoom = framedZoom * Math.pow(panoramicZoom / Math.max(0.1, framedZoom), panU);
        }

        if (isPlayingTrailRef.current && trailPlaybackProgressRef.current !== null) {
          trailPlaybackProgressRef.current = Math.min(
            1,
            trailPlaybackProgressRef.current + dt * 0.17
          );
          if (trailPlaybackProgressRef.current >= 1) {
            isPlayingTrailRef.current = false;
            setIsPlayingTrail(false);
          }
        }
      } else if (curPhase === 'TITLE_MENU') {
        const previewZoom = Math.min(0.95, Math.max(0.65, width / 460));
        cam.targetX = Math.sin(timeSec * 0.25) * 24;
        cam.targetY = -120 + Math.sin(timeSec * 0.4) * 14;
        cam.targetZoom = previewZoom;
      }

      const summitPullBlend =
        curPhase === 'SUMMIT'
          ? Math.max(0, Math.min(1, (summitProgressRef.current - 0.14) / 0.36))
          : 0;
      const camLerp =
        curPhase === 'SUMMIT'
          ? isPlayingTrailRef.current
            ? 2.2
            : 2.8 - summitPullBlend * 0.55
          : isDraggingPeekRef.current
            ? 14
            : 4.6;
      const zoomLerp =
        curPhase === 'SUMMIT'
          ? isPlayingTrailRef.current
            ? 2.0
            : 2.6 - summitPullBlend * 0.55
          : 4.2;
      cam.x += (cam.targetX - cam.x) * Math.min(1, dt * camLerp);
      cam.y += (cam.targetY - cam.y) * Math.min(1, dt * camLerp);
      cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * zoomLerp);
      cam.shake = Math.max(0, cam.shake - dt * 28);

      // Promote Summit sequence PAN_REVEAL -> PIONEER_REVEAL (Act 1) strictly after the panoramic pan
      // has completed and the camera has settled onto the full mountain silhouette.
      if (curPhase === 'SUMMIT' && summitStageRef.current === 'PAN_REVEAL') {
        const sp = summitProgressRef.current;
        const cameraSettled =
          Math.abs(cam.targetX - cam.x) < 16 &&
          Math.abs(cam.targetY - cam.y) < 18 &&
          Math.abs(cam.targetZoom - cam.zoom) < 0.02;
        if ((sp >= 0.86 && cameraSettled) || sp >= 0.94) {
          summitStageRef.current = 'PIONEER_REVEAL';
          setSummitStage('PIONEER_REVEAL');
        }
      }

      if (!isPausedReading) {
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const pt = particlesRef.current[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          if (pt.kind === 'dust' || pt.kind === 'spark') {
            pt.vy += 170 * dt;
          }
          pt.life -= dt;
          if (pt.life <= 0) {
            particlesRef.current.splice(i, 1);
          }
        }
      }

      const activeSkin =
        CLIMBER_SKINS.find((s) => s.id === selectedSkinRef.current) ?? CLIMBER_SKINS[0];

      const nearbyRecyclable = pitonsRef.current.find(
        (p) => !p.isRusty && p.integrity > 0 && dist(p, climber.torsoPos) <= 74
      );

      ctx.save();
      ctx.scale(dpr, dpr);
      renderGameFrame({
        ctx,
        width,
        height,
        world,
        climber,
        pitons: pitonsRef.current,
        particles: particlesRef.current,
        camera: cam,
        hover: hoverRef.current,
        reachableIds: reachableIdsRef.current,
        tutorialHoldId: tutorialRef.current.active ? tutorialRef.current.highlightHoldId : null,
        lockedLimb: lockedLimbRef.current,
        phase: curPhase,
        timeSec,
        windForce: effectiveWindForce,
        weather: effectiveWeather,
        weatherIncident: weatherIncidentRef.current,
        microWindow: microWindowRef.current,
        isReadingRoute: isReadingRouteRef.current,
        summitProgress: summitProgressRef.current,
        skin: activeSkin,
        gender: climberGenderRef.current,
        dynoCharge: dynoChargeRef.current,
        routeEvents: routeEventsRef.current,
        trailPlaybackProgress: trailPlaybackProgressRef.current,
        nearbyRecyclablePitonId: nearbyRecyclable?.id ?? null,
        betaPins: betaPinsRef.current,
        betaCursor: betaCursorRef.current,
        attemptReview: roadbookRecordRef.current?.lastAttempt ?? null,
        fallHotspots: roadbookRecordRef.current?.fallHotspots ?? [],
        showAttemptReview: showAttemptReviewRef.current,
        activeLimbDrag: activeLimbDragRef.current,
        activePelvisDrag: activePelvisDragRef.current,
        highlightPelvis:
          tutorialRef.current.active &&
          tutorialRef.current.variant === 'advanced' &&
          tutorialRef.current.step === 1,
        isFreeSolo: selectedLoadoutRef.current === 'free-solo',
      });
      ctx.restore();

      // Development-mode transparent physics debug layer (0-frame lag, synced 1:1 with main camera)
      if (import.meta.env.DEV && debugCanvasRef.current) {
        const dbgCanvas = debugCanvasRef.current;
        const targetW = Math.round(width * dpr);
        const targetH = Math.round(height * dpr);
        if (dbgCanvas.width !== targetW || dbgCanvas.height !== targetH) {
          dbgCanvas.width = targetW;
          dbgCanvas.height = targetH;
        }
        const dbgCtx = dbgCanvas.getContext('2d');
        if (dbgCtx) {
          dbgCtx.save();
          dbgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (showPhysicsDebugRef.current) {
            renderPhysicsDebugOverlay({
              ctx: dbgCtx,
              width,
              height,
              dt,
              world,
              holdsMap: holdsMapRef.current,
              climber,
              camera: cam,
              phase: curPhase,
              lockedLimb: lockedLimbRef.current,
              hover: hoverRef.current,
              reachableIds: reachableIdsRef.current,
              activeLimbDrag: activeLimbDragRef.current,
              dynoCharge: dynoChargeRef.current,
              tracker: physicsDebugTrackerRef.current,
            });
          } else {
            dbgCtx.clearRect(0, 0, width, height);
          }
          dbgCtx.restore();
        }
      }

      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.07) {
        hudSyncAcc = 0;
        if (curPhase === 'SUMMIT') {
          setSummitProgress(summitProgressRef.current);
        }
        setHudTick((t) => (t + 1) % 100000);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [completeIntroCutscene, recordCurrentAttempt, showBanner, showTacticalHint, spawnParticles, triggerSummit]);

  // PC Keyboard Shortcuts for fast commercial play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'PLAYING') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();

      if (introCutsceneRef.current.active) {
        if (
          (key === ' ' || key === 'enter' || key === 'escape') &&
          introCutsceneRef.current.elapsedSec >= 0.55
        ) {
          e.preventDefault();
          completeIntroCutscene();
        }
        return;
      }

      if (key === ' ' || (key === 'enter' && isReadingRouteRef.current)) {
        if (isRouteBookSupported(worldRef.current.route)) {
          e.preventDefault();
          handleToggleRouteRead();
        }
      } else if (isReadingRouteRef.current && (key === 'w' || key === 'arrowup')) {
        e.preventDefault();
        handleJumpReadCamera('up');
      } else if (isReadingRouteRef.current && (key === 's' || key === 'arrowdown')) {
        e.preventDefault();
        handleJumpReadCamera('down');
      } else if (isReadingRouteRef.current && (key === 'z' || key === 'backspace')) {
        e.preventDefault();
        handleUndoBetaPin();
      } else if (key === '1' || key === 'q') {
        handleSelectLimb('leftHand');
      } else if (key === '2' || key === 'e') {
        handleSelectLimb('rightHand');
      } else if (key === '3' || key === 'a') {
        handleSelectLimb('leftFoot');
      } else if (key === '4' || key === 'd') {
        handleSelectLimb('rightFoot');
      } else if (key === 'backspace' || key === 'delete') {
        if (lockedLimbRef.current) {
          e.preventDefault();
          handleReleaseLimb(lockedLimbRef.current);
        }
      } else if (key === 'escape' || key === 'tab') {
        e.preventDefault();
        handleSelectLimb(null);
      } else if (key === 'arrowleft' || key === 'z') {
        handleSetLeanBias(-1);
      } else if (key === 'arrowup' || key === 'w') {
        const c = climberRef.current;
        if (!c.isFalling && !c.dynoFlight && !isReadingRouteRef.current) {
          c.pelvisOffset = clampPelvisOffset({ x: c.pelvisOffset.x, y: c.pelvisOffset.y - 14 });
          manualPelvisTimerRef.current = 3.2;
          reachableIdsRef.current = getReachableHoldIds(c, worldRef.current.holds, lockedLimbRef.current);
        }
      } else if (key === 's') {
        const c = climberRef.current;
        if (!c.isFalling && !c.dynoFlight && !isReadingRouteRef.current) {
          c.pelvisOffset = clampPelvisOffset({ x: c.pelvisOffset.x, y: c.pelvisOffset.y + 14 });
          manualPelvisTimerRef.current = 3.2;
          reachableIdsRef.current = getReachableHoldIds(c, worldRef.current.holds, lockedLimbRef.current);
        }
      } else if (key === 'arrowdown' || key === 'x') {
        const c = climberRef.current;
        if (!c.isFalling && !c.dynoFlight && !isReadingRouteRef.current) {
          c.pelvisOffset.y = 0;
          handleSetLeanBias(0);
        }
      } else if (key === 'arrowright' || key === 'c') {
        handleSetLeanBias(1);
      } else if (key === 'f') {
        handlePlacePiton();
      } else if (key === 'v' || key === 'g') {
        handleApplyChalk();
      } else if (key === 'r') {
        handleShakeOutHand();
      }
    };

    const onWindowBlur = () => {
      if (activeLimbDragRef.current) {
        const dragged = climberRef.current.limbs[activeLimbDragRef.current.limbId];
        dragged.isDragging = false;
        if (dragged.holdId) {
          const keptHold = holdsMapRef.current.get(dragged.holdId);
          if (keptHold && !keptHold.broken) {
            dragged.pos = { x: keptHold.x, y: keptHold.y };
            dragged.targetPos = { x: keptHold.x, y: keptHold.y };
            dragged.reachT = 1;
          }
        }
        activeLimbDragRef.current = null;
        setActiveDragReason(null);
      }
      (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
        climberRef.current.limbs[id].isDragging = false;
      });
      activePelvisDragRef.current = null;
      peekPointerIdRef.current = null;
      pointerDownPosRef.current = null;
      isDraggingPeekRef.current = false;
      dynoChargeRef.current = null;
      dynoFullNotifiedRef.current = false;
      lastLimbTapRef.current = null;
      stopHaptic();
      if (!isReadingRouteRef.current) {
        peekOffsetYRef.current = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [
    completeIntroCutscene,
    handleApplyChalk,
    handleJumpReadCamera,
    handlePlacePiton,
    handleReleaseLimb,
    handleSelectLimb,
    handleSetLeanBias,
    handleShakeOutHand,
    handleToggleRouteRead,
    handleUndoBetaPin,
  ]);

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'PLAYING' || !isReadingRouteRef.current) return;
      const zoom = cameraRef.current.zoom || 0.7;
      peekOffsetYRef.current = clampPeekOffset(peekOffsetYRef.current + (e.deltaY * 0.75) / zoom);
    },
    [clampPeekOffset]
  );

  const isFreeSoloLoadout = selectedLoadout === 'free-solo';
  const hasCheckpoint = !isFreeSoloLoadout && climberRef.current.lastCheckpointY < 0;
  const activeRoute = worldRef.current.route;
  const supportsRouteBook = isRouteBookSupported(activeRoute);
  const showHoldHints = hasHoldHintsEnabled(activeRoute);
  const isPreClimbReading = supportsRouteBook && isReadingRoute && statsRef.current.movesMade === 0;
  const savedRoadbookPins = roadbookRecord?.savedPins ?? [];
  const hasSavedRoadbook = savedRoadbookPins.length > 0;
  const hasUnsavedRoadbook = !pinsEqual(betaPins, savedRoadbookPins);
  const betaRemainingCount = Math.max(0, betaPins.length - betaCursor);
  const nearbyRecyclablePiton = pitonsRef.current.some(
    (p) => !p.isRusty && p.integrity > 0 && dist(p, climberRef.current.torsoPos) <= 74
  );
  const climberSnap = climberRef.current;
  const anchoredLimbsList = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
    (id) => climberSnap.limbs[id].holdId !== null
  );
  const canShakeOut =
    !climberSnap.isFalling &&
    !climberSnap.isResting &&
    !climberSnap.isShakingOut &&
    !climberSnap.dynoFlight &&
    anchoredLimbsList.length >= 3 &&
    anchoredLimbsList.some((id) => !climberSnap.limbs[id].isHand) &&
    anchoredLimbsList.some((id) => climberSnap.limbs[id].isHand) &&
    (climberSnap.stamina < 72 ||
      climberSnap.limbs.leftHand.strain > 0.3 ||
      climberSnap.limbs.rightHand.strain > 0.3);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#141820]">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onContextMenu={handleCanvasContextMenu}
        onWheel={handleCanvasWheel}
        style={{ touchAction: 'none' }}
        className={`block h-full w-full ${
          phase === 'PLAYING'
            ? isReadingRoute
              ? hoverInfo?.hold
                ? 'cursor-pointer'
                : 'cursor-crosshair'
              : !showHoldHints
                ? 'cursor-crosshair'
                : hoverInfo?.hold
                  ? hoverInfo.reachable || hoverInfo.dynoEligible
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed'
                  : 'cursor-crosshair'
            : 'cursor-default'
        }`}
      />

      {phase === 'PLAYING' && (() => {
        const activeBadge = BADGES.find((b) => b.id === activeRoute.id) ?? BADGES[0];
        const curAltRatioHud = Math.max(
          0,
          Math.min(1, statsRef.current.altitudeM / Math.max(1, activeRoute.heightM))
        );
        const pitchSections = worldRef.current.pitchSections ?? [];
        const currentPitch: RoutePitchSection | null =
          pitchSections.find((p) => curAltRatioHud >= p.minRatio && curAltRatioHud < p.maxRatio) ??
          pitchSections[pitchSections.length - 1] ??
          null;
        const bivouacRatios = worldRef.current.ledges
          .filter((l) => l.isBivouac && l.id !== 'base-camp')
          .map((l) => Math.max(0, Math.min(1, -l.y / Math.max(1, worldRef.current.mountainHeight))));

        return (
          <>
            <GameHUD
              route={activeRoute}
              climberName={displayClimberName}
              climberGender={climberGender}
              difficultyProfile={worldRef.current.difficultyProfile}
              weather={weatherRef.current}
              weatherIncident={weatherIncidentRef.current}
              microWindow={microWindowRef.current}
              introActive={introElapsed !== null}
              currentPitch={currentPitch}
              pitchBanner={pitchBanner}
              pitchSections={pitchSections}
              bivouacRatios={bivouacRatios}
              climber={climberRef.current}
              stats={statsRef.current}
              hover={hoverInfo}
              tutorial={tutorial}
              muted={muted}
              supportsRouteBook={supportsRouteBook}
              isReadingRoute={isReadingRoute}
              isPreClimbReading={isPreClimbReading}
              dynoProgress={
                dynoChargeRef.current && dynoChargeRef.current.progress > 0.01
                  ? dynoChargeRef.current.progress
                  : null
              }
              isDraggingLimb={activeLimbDragRef.current !== null}
              nearbyRecyclablePiton={nearbyRecyclablePiton}
              betaPinsCount={betaPins.length}
              betaRemainingCount={betaRemainingCount}
              betaCursorStep={betaCursor}
              hasUnsavedRoadbook={hasUnsavedRoadbook}
              hasSavedRoadbook={hasSavedRoadbook}
              roadbookArchives={roadbookRecord?.archives ?? []}
              lastAttemptReview={roadbookRecord?.lastAttempt ?? null}
              showAttemptReview={showAttemptReview}
              canShakeOut={canShakeOut}
              onPlacePiton={handlePlacePiton}
              onApplyChalk={handleApplyChalk}
              onToggleRouteRead={handleToggleRouteRead}
              onClearBetaPins={handleClearBetaPins}
              onUndoBetaPin={handleUndoBetaPin}
              onSaveRoadbook={handleSaveRoadbook}
              onRevertRoadbook={handleRevertRoadbook}
              onLoadRoadbookSlot={handleLoadRoadbookSlot}
              onToggleAttemptReview={handleToggleAttemptReview}
              onFocusLastFall={handleFocusLastFall}
              onJumpReadCamera={handleJumpReadCamera}
              onInspectBin={handleInspectAltitudeBin}
              onShakeOutHand={handleShakeOutHand}
              onToggleMute={handleToggleMute}
              onRestart={() => startRoute(worldRef.current.route)}
              activeDragReason={activeDragReason}
              tacticalHint={tacticalHint}
              onDismissHint={dismissTacticalHint}
              isFreeSolo={isFreeSoloLoadout}
              staminaRatePerSec={staminaRateRef.current}
              roadbookFlowActive={roadbookFlowTimerRef.current > 0.2}
              onSpringHold={isStandingOnSpringHold(climberRef.current, holdsMapRef.current)}
              onBackToMenu={() => {
                if (statsRef.current.movesMade >= 2) {
                  recordCurrentAttempt('ABORTED');
                }
                introCutsceneRef.current.active = false;
                setIntroElapsed(null);
                microWindowRef.current = null;
                setPitchBanner(null);
                isReadingRouteRef.current = false;
                setIsReadingRoute(false);
                dynoChargeRef.current = null;
                dynoFullNotifiedRef.current = false;
                activeLimbDragRef.current = null;
                activePelvisDragRef.current = null;
                weatherIncidentRef.current = null;
                manualPelvisTimerRef.current = 0;
                peekPointerIdRef.current = null;
                pointerDownPosRef.current = null;
                stopHaptic();
                setActiveDragReason(null);
                peekOffsetYRef.current = 0;
                setStatusBanner(null);
                phaseRef.current = 'TITLE_MENU';
                setPhase('TITLE_MENU');
              }}
            />

            {introElapsed !== null && (
              <IntroStillnessOverlay
                route={activeRoute}
                badge={activeBadge}
                elapsedSec={introElapsed}
                durationSec={INTRO_DURATION_SEC}
                bestStyle={bestStyles[activeRoute.id]}
                isFreeSolo={isFreeSoloLoadout}
                isFreeSoloCleared={freeSoloRoutes.has(activeRoute.id)}
                onSkip={completeIntroCutscene}
              />
            )}
          </>
        );
      })()}

      {statusBanner && introElapsed === null && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[max(0.375rem,env(safe-area-inset-top))] z-30 flex justify-center px-3"
        >
          <div className="max-w-[min(92vw,420px)] truncate whitespace-nowrap border border-amber-400/45 bg-[#141820]/86 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-amber-200 shadow-sm backdrop-blur-sm">
            {statusBanner}
          </div>
        </div>
      )}

      {phase === 'TITLE_MENU' && (
        <TitleOverlay
          selectedRouteId={selectedRouteId}
          completedRoutes={completedRoutes}
          bestStyles={bestStyles}
          freeSoloRoutes={freeSoloRoutes}
          dailyRoute={dailyRoute}
          dailyCompleted={
            dailyRoute.dailyDateKey ? dailyCompleted.has(dailyRoute.dailyDateKey) : false
          }
          selectedLoadout={selectedLoadout}
          selectedSkin={selectedSkin}
          climberName={climberName}
          climberGender={climberGender}
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            const r = getRouteById(id);
            preloadArtPackForRoute(r);
            worldRef.current = generateMountain(r);
          }}
          onSelectLoadout={setSelectedLoadout}
          onSelectSkin={setSelectedSkin}
          onChangeClimberName={(name) => setClimberName(name.slice(0, 12))}
          onSelectGender={setClimberGender}
          onStart={startRoute}
        />
      )}

      {(phase === 'SUMMIT' || phase === 'FALLEN') && (
        <SummitOverlay
          phase={phase}
          route={activeRoute}
          climberName={displayClimberName}
          climberGender={climberGender}
          stats={statsRef.current}
          climbStyle={achievedStyle}
          summitProgress={summitProgress}
          summitStage={summitStage}
          onAdvanceSummitStage={handleAdvanceSummitStage}
          hasCheckpoint={hasCheckpoint}
          newlyUnlockedBadge={newlyUnlockedBadge}
          isPlayingTrail={isPlayingTrail}
          fallDiagnosis={fallDiagnosis}
          assessment={climbAssessment}
          isFreeSolo={isFreeSoloLoadout}
          supportsRouteBook={supportsRouteBook}
          onReviewRoadbook={handleReviewRoadbookFromResult}
          onToggleTrailPlayback={handleToggleTrailPlayback}
          onRespawnCheckpoint={handleRespawnCheckpoint}
          onRestart={() => startRoute(worldRef.current.route)}
          onNextRoute={(next) => startRoute(next)}
          onBackToMenu={() => {
            isPlayingTrailRef.current = false;
            trailPlaybackProgressRef.current = null;
            summitProgressRef.current = 0;
            summitStageRef.current = 'PAN_REVEAL';
            summitCamStartRef.current = null;
            setSummitProgress(0);
            setSummitStage('PAN_REVEAL');
            setIsPlayingTrail(false);
            setStatusBanner(null);
            dynoFullNotifiedRef.current = false;
            stopHaptic();
            phaseRef.current = 'TITLE_MENU';
            setPhase('TITLE_MENU');
          }}
        />
      )}
      {import.meta.env.DEV && showPhysicsDebug && (
        <canvas
          ref={debugCanvasRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        />
      )}

      {import.meta.env.DEV && (phase === 'PLAYING' || phase === 'FALLEN') && (
        <button
          type="button"
          onClick={() => setShowPhysicsDebug((v) => !v)}
          className={`fixed top-2 right-2.5 z-40 border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide backdrop-blur-xs transition-colors ${
            showPhysicsDebug
              ? 'border-sky-400/70 bg-slate-950/75 text-sky-300'
              : 'border-slate-500/50 bg-slate-950/55 text-slate-300 hover:text-white'
          }`}
          title="切换开发模式物理调试图层 (F3)"
        >
          {showPhysicsDebug ? '物理调试: 开 [F3]' : '物理调试: 关 [F3]'}
        </button>
      )}
    </main>
  );
}
