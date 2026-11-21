export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'SUMMIT' | 'FALLEN';

export type LimbId = 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot';

export type HoldType =
  | 'jug'
  | 'crimp'
  | 'crack'
  | 'ice'
  | 'fragile'
  | 'ledge'
  | 'spring'
  | 'swing'
  | 'tremor';

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

export type LoadoutId = 'light' | 'balanced' | 'heavy' | 'free-solo';

export interface LoadoutConfig {
  id: LoadoutId;
  label: string;
  subtitle: string;
  pitonDelta: number;
  chalkDelta: number;
  drainMult: number;
  noProtection?: boolean;
}

export type ClimbStyle = 'onsight' | 'redpoint' | 'summit';

export type ClimberGender = 'male' | 'female';

export type ClimberSkinId = 'alpine-orange' | 'glacier-cyan';

export type ClimberHeadgearStyle =
  | 'beanie'
  | 'helmet'
  | 'expedition-cap'
  | 'pro-hood'
  | 'fur-beanie'
  | 'visor-cap';

export type ClimberPackStyle =
  | 'alpine'
  | 'ice-axe'
  | 'rope-coil'
  | 'pro-shell'
  | 'bivouac-roll'
  | 'minimal-sling';

export interface ClimberSkinConfig {
  id: ClimberSkinId;
  name: string;
  tag: string;
  subtitle: string;
  unlockCount: number;
  jacket: string;
  jacketShadow: string;
  accent: string;
  scarf: string;
  beanie: string;
  rope: string;
  /** Optional character art pack id bound to CHARACTER_ART_MANIFEST (defaults to id) */
  artPackId?: string;
  /** Optional procedural silhouette styling presets (used when PNG slots are not overridden) */
  headgear?: ClimberHeadgearStyle;
  packStyle?: ClimberPackStyle;
  pants?: string;
  shoe?: string;
}

export interface ClimbEvent {
  x: number;
  y: number;
  kind: 'piton' | 'slip' | 'dyno' | 'bivouac';
  label: string;
}

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

export type WeatherIncidentType = 'crosswind_gust' | 'icefall' | 'whiteout_squall';

export interface FallingRockProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  spin: number;
  kind: 'ice' | 'rock';
  hit?: boolean;
}

export interface WeatherIncidentState {
  type: WeatherIncidentType;
  phase: 'telegraph' | 'active';
  label: string;
  hint: string;
  timer: number;
  duration: number;
  direction: -1 | 1;
  laneX: number;
  laneWidth: number;
  projectiles: FallingRockProjectile[];
  dodged?: boolean;
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
  isDailyChallenge?: boolean;
  dailyDateKey?: string;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type HoldGripKind =
  | 'downpull'
  | 'sidepullLeft'
  | 'sidepullRight'
  | 'undercling';

export interface Hold {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: HoldType;
  gripKind?: HoldGripKind;
  shapeVariant: number;
  stability: number;
  angle: number;
  depth: number;
  crackProgress: number;
  broken: boolean;
  chalked: boolean;
  wet?: boolean;
  zone: number;
  isDecoy?: boolean;
  /** Resonant vibration frequency (rad/s) for 'tremor' holds */
  tremorFreq?: number;
  /** Dynamic 0..1 vibration buildup when stepped on or gripped */
  tremorEnergy?: number;
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
  isRusty?: boolean;
  reliable?: boolean;
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
  isDragging?: boolean;
}

export interface LimbDragState {
  limbId: LimbId;
  pointerId: number;
  isTouch?: boolean;
  originHoldId: string | null;
  startWorldPos: Vec2;
  targetPos: Vec2;
  aimWorldPos?: Vec2;
  snappedHold: Hold | null;
  canGrab: boolean;
  estimatedLoad?: number;
  failReason: string | null;
  hasMovedOut: boolean;
}

export interface PelvisDragState {
  pointerId: number;
  startWorldPos: Vec2;
  startOffset: Vec2;
  hasMoved?: boolean;
}

export interface RopeCatchState {
  pitonId: string;
  anchor: Vec2;
  ropeLen: number;
}

export interface DynoFlightState {
  holdId: string;
  limbId: LimbId;
  startTorso: Vec2;
  targetPos: Vec2;
  t: number;
  duration: number;
  willSlip: boolean;
  isSpringLaunch?: boolean;
  isSwingCatch?: boolean;
}

export interface ClimberState {
  torsoPos: Vec2;
  torsoVel: Vec2;
  leanAngle: number;
  leanBias: -1 | 0 | 1;
  pelvisOffset: Vec2;
  hipTwist: number;
  wallHug: number;
  lookAngle: number;
  stamina: number;
  maxStamina: number;
  chalk: number;
  chalkUses: number;
  pitonsLeft: number;
  health: number;
  isFalling: boolean;
  isResting: boolean;
  isStemming?: boolean;
  isShakingOut?: boolean;
  flowCombo?: number;
  swingBoostTimer?: number;
  dynoFlight?: DynoFlightState | null;
  ropeCatch?: RopeCatchState | null;
  limbs: Record<LimbId, LimbState>;
  lastCheckpointY: number;
  lastCheckpointX: number;
  routeHistory: Vec2[];
}

export interface DynoChargeState {
  hold: Hold;
  limbId: LimbId;
  progress: number;
  dwellSec?: number;
  pointerId?: number;
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
  shadowShade: string;
  parallax: number;
  hasSnow?: boolean;
  hasHatching?: boolean;
}

export interface CloudBand {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  parallax: number;
  opacity: number;
  kind?: 'cumulus' | 'cirrus';
}

export interface DistantBird {
  x: number;
  y: number;
  speed: number;
  parallax: number;
  scale: number;
  flapSpeed: number;
  phase: number;
  dir: 1 | -1;
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

export interface RouteWallAnalysis {
  holdsPer10M: number;
  avgUpperStepPx: number;
  sparseSectionRatio: number;
  densityLabel: '密集支点' | '适中节奏' | '稀疏长距' | '绝壁稀缺';
  baseTechnicalScore: number;
}

export type OverallRatingGrade = 'SSS' | 'S+' | 'S' | 'A' | 'B' | 'C';

export interface RoadbookStaminaEstimate {
  pinCount: number;
  totalAscentM: number;
  estimatedDrain: number;
  estimatedRecovery: number;
  netStaminaChange: number;
  projectedRemainingStamina: number;
  estimatedTimeSec: number;
  decoyHitsCount: number;
  riskySpanCount: number;
  verdictLabel: string;
  freeSoloNote?: string;
}

export interface ClimbAssessment {
  assessedGrade: string;
  gradeDeltaLabel: string;
  overallScore: number;
  ratingGrade: OverallRatingGrade;
  ratingTitle: string;
  staminaConsumedTotal: number;
  staminaRecoveredTotal: number;
  netStaminaTotal: number;
  staminaConsumedPer10M: number;
  avgStaminaRemainingPct: number;
  keyActionMistakeRatePct: number;
  holdDensityLabel: RouteWallAnalysis['densityLabel'];
  summaryNote: string;
  roadbookNote?: string;
  isFreeSolo?: boolean;
  tributeNote?: string;
}

export interface ClimbStats {
  altitudeM: number;
  maxAltitudeM: number;
  elapsedSec: number;
  pitonsPlaced: number;
  fallsCaught: number;
  movesMade: number;
  staminaSpent: number;
  staminaRecovered: number;
  staminaSamplesSum: number;
  staminaSampleCount: number;
  keyActionAttempts: number;
  keyActionErrors: number;
  betaPinsPlanned: number;
  betaPinsFollowed: number;
  roadbookFlowHits: number;
}

export interface HoverInfo {
  hold: Hold | null;
  suggestedLimb: LimbId;
  reachable: boolean;
  dynoEligible?: boolean;
  stabilityHint: string;
  worldPos: Vec2;
}

export interface TutorialState {
  active: boolean;
  variant?: 'basic' | 'advanced';
  step: number;
  highlightHoldId: string | null;
}
