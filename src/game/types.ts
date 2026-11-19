export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'SUMMIT' | 'FALLEN';

export type LimbId = 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot';

export type HoldType = 'jug' | 'crimp' | 'crack' | 'ice' | 'fragile' | 'ledge';

export type RouteId =
  | 'kids'
  | 'intro'
  | 'beginner'
  | 'beginner-plus'
  | 'intermediate'
  | 'intermediate-plus'
  | 'advanced'
  | 'advanced-crux'
  | 'master-1'
  | 'master-2'
  | 'master-3';

export type WeatherType = 'clear' | 'mist' | 'rain' | 'snowstorm';

export interface WeatherStage {
  minRatio: number;
  maxRatio: number;
  type: WeatherType;
  label: string;
  intensity: number;
  chalkDrainMult: number;
  /** Normalized screen radius (0.35..1.2) for clear visibility around climber */
  visibilityRadius: number;
  fogOpacity: number;
}

export interface ActiveWeather {
  type: WeatherType;
  label: string;
  intensity: number;
  chalkDrainMult: number;
  visibilityRadius: number;
  fogOpacity: number;
}

export interface AltitudeDifficultyBin {
  index: number;
  startM: number;
  endM: number;
  /** Normalized difficulty 0..100 combining hold types, route-reading branches, and weather */
  difficulty: number;
  challengeTag: string;
  hasBivouac: boolean;
  weatherType: WeatherType;
}

export interface BadgeInfo {
  id: RouteId;
  tier: number;
  tierLabel: string;
  title: string;
  subtitle: string;
  grade: string;
  accentColor: string;
}

export interface RouteConfig {
  id: RouteId;
  tier: number;
  tierLabel: string;
  grade: string;
  name: string;
  subtitle: string;
  description: string;
  heightM: number;
  drainMultiplier: number;
  windMultiplier: number;
  pitons: number;
  chalkUses: number;
  hasTutorial: boolean;
  palette: 'granite' | 'ridge' | 'slate' | 'glacial';
  seed: number;
  summitImage: string;
  weatherStages: WeatherStage[];
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Hold {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: HoldType;
  shapeVariant: number;
  stability: number;
  angle: number;
  depth: number;
  crackProgress: number;
  broken: boolean;
  chalked: boolean;
  zone: number;
}

export interface Ledge {
  id: string;
  x: number;
  y: number;
  width: number;
  label: string;
  isSummit?: boolean;
  isBivouac?: boolean;
  visited: boolean;
}

export interface Piton {
  id: string;
  x: number;
  y: number;
  angle: number;
  integrity: number;
}

export interface LimbState {
  id: LimbId;
  label: string;
  isHand: boolean;
  isLeft: boolean;
  pos: Vec2;
  targetPos: Vec2;
  startPos: Vec2;
  reachT: number;
  holdId: string | null;
  load: number;
  strain: number;
  jitter: Vec2;
}

export interface ClimberState {
  torsoPos: Vec2;
  torsoVel: Vec2;
  leanAngle: number;
  lookAngle: number;
  stamina: number;
  maxStamina: number;
  chalk: number;
  chalkUses: number;
  pitonsLeft: number;
  health: number;
  isFalling: boolean;
  isResting: boolean;
  limbs: Record<LimbId, LimbState>;
  lastCheckpointY: number;
  lastCheckpointX: number;
  routeHistory: Vec2[];
}

export interface RockFacet {
  points: Vec2[];
  sidePoints: Vec2[];
  fill: string;
  sideFill: string;
  rimHighlight: boolean;
  hasHatching: boolean;
  snowCap?: Vec2[];
  mossPatch?: Vec2[];
}

export interface DistantPeak {
  points: Vec2[];
  shade: string;
  rimShade: string;
  parallax: number;
}

export interface CloudBand {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  parallax: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  outline?: boolean;
  kind: 'chalk' | 'dust' | 'spark' | 'snow' | 'rain' | 'ring';
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  shake: number;
}

export interface ClimbStats {
  altitudeM: number;
  maxAltitudeM: number;
  elapsedSec: number;
  pitonsPlaced: number;
  fallsCaught: number;
  movesMade: number;
}

export interface HoverInfo {
  hold: Hold | null;
  suggestedLimb: LimbId;
  reachable: boolean;
  stabilityHint: string;
  worldPos: Vec2;
}

export interface TutorialState {
  active: boolean;
  step: number;
  highlightHoldId: string | null;
}
