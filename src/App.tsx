import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { SummitOverlay } from './components/SummitOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine, triggerHaptic } from './game/audio';
import {
  clampLimbTarget,
  clampPelvisOffset,
  dist,
  evaluateHoldGrab,
  getReachableHoldIds,
  isDynoReachable,
  isHoldReachable,
  updateClimberPhysics,
} from './game/ik';
import {
  CLIMBER_SKINS,
  estimateRoadbookStamina,
  evaluateClimbAssessment,
  generateMountain,
  generateSuggestedRoadbook,
  getDailyChallengeRoute,
  getRouteById,
  getWeatherAtAltitude,
  isRouteBookSupported,
  LOADOUT_OPTIONS,
  MountainWorld,
  PIXELS_PER_METER,
  ROUTES,
} from './game/mountain';
import { renderGameFrame } from './game/renderer';
import {
  ActiveWeather,
  AltitudeDifficultyBin,
  CameraState,
  ClimbAssessment,
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
  Particle,
  PelvisDragState,
  Piton,
  RouteConfig,
  RouteId,
  TutorialState,
  Vec2,
} from './game/types';

const BADGES_STORAGE_KEY = 'cairn_unlocked_badges_v1';
const STYLES_STORAGE_KEY = 'cairn_route_styles_v1';
const FREE_SOLO_STORAGE_KEY = 'cairn_free_solo_routes_v1';
const DAILY_STORAGE_KEY = 'cairn_daily_completed_v1';
const SKIN_STORAGE_KEY = 'cairn_selected_skin_v1';

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

const HOLD_LABELS: Record<Hold['type'], string> = {
  jug: '稳固抓点',
  crack: '岩缝支点',
  crimp: '小指点(费力)',
  ice: '冰霜岩面(易滑)',
  fragile: '风化脆岩(易碎)',
  ledge: '安全平台',
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
      ? '战术提示 · 上方点偏远：拖移腰部向上顶髋，或选定手后长按上方点蓄力跃抓'
      : '战术提示 · 当前上方暂不可及：先抬高双脚一格，或拖动腰部向侧/上方移重心';
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
    return '战术提示 · 岩面湿滑且防粉见底：抓握前点右下「防粉」避免指尖打滑';
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

  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('kids');
  const [selectedLoadout, setSelectedLoadout] = useState<LoadoutId>('balanced');
  const [selectedSkin, setSelectedSkin] = useState<ClimberSkinId>(() => loadSavedSkin());
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

  const worldRef = useRef<MountainWorld>(generateMountain(ROUTES[0]));
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
  const betaPinsRef = useRef<string[]>([]);
  const lastSlipNoteRef = useRef<string | null>(null);
  const lastLimbTapRef = useRef<{ limbId: LimbId; time: number } | null>(null);
  const staminaRateRef = useRef(0);
  const roadbookFlowTimerRef = useRef(0);

  const stallTimerRef = useRef(0);
  const failSpotsByRouteRef = useRef<Record<string, number[]>>({});
  const warnedFailBandsRef = useRef<Set<number>>(new Set());
  const cruxWarnedBinsRef = useRef<Set<number>>(new Set());
  const lastHintElapsedRef = useRef(-30);
  const hintEvalAccRef = useRef(0);
  const hintHideTimerRef = useRef<number | null>(null);
  const tutorialAutoHideTimerRef = useRef<number | null>(null);

  const summitProgressRef = useRef(0);
  const fallStartYRef = useRef(0);
  const pointerDownPosRef = useRef<Vec2 | null>(null);
  const peekPointerIdRef = useRef<number | null>(null);
  const activeLimbDragRef = useRef<LimbDragState | null>(null);
  const activePelvisDragRef = useRef<PelvisDragState | null>(null);
  const isDraggingPeekRef = useRef(false);
  const peekOffsetYRef = useRef(0);
  const isReadingRouteRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [lockedLimb, setLockedLimb] = useState<LimbId | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [activeDragReason, setActiveDragReason] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>(tutorialRef.current);
  const [tacticalHint, setTacticalHint] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [isReadingRoute, setIsReadingRoute] = useState(false);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [summitProgress, setSummitProgress] = useState(0);
  const [betaPins, setBetaPins] = useState<string[]>([]);
  const [fallDiagnosis, setFallDiagnosis] = useState<string | null>(null);
  const [climbAssessment, setClimbAssessment] = useState<ClimbAssessment | null>(null);
  const [, setHudTick] = useState(0);

  useEffect(() => {
    selectedLoadoutRef.current = selectedLoadout;
  }, [selectedLoadout]);

  useEffect(() => {
    selectedSkinRef.current = selectedSkin;
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, selectedSkin);
    } catch {
      // Ignore storage error
    }
  }, [selectedSkin]);

  useEffect(() => {
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

  const startRoute = useCallback(
    (route: RouteConfig) => {
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
      betaPinsRef.current = [];
      setBetaPins([]);
      lastSlipNoteRef.current = null;
      setFallDiagnosis(null);
      trailPlaybackProgressRef.current = null;
      isPlayingTrailRef.current = false;
      setIsPlayingTrail(false);
      summitProgressRef.current = 0;
      const supportsBook = isRouteBookSupported(route);
      isReadingRouteRef.current = supportsBook;
      peekOffsetYRef.current = supportsBook ? -140 : 0;
      peekPointerIdRef.current = null;
      pointerDownPosRef.current = null;
      isDraggingPeekRef.current = false;
      setIsReadingRoute(supportsBook);

      const reachSet = getReachableHoldIds(freshClimber, freshWorld.holds, initialLimb);
      reachableIdsRef.current = reachSet;

      if (tutorialAutoHideTimerRef.current) {
        window.clearTimeout(tutorialAutoHideTimerRef.current);
        tutorialAutoHideTimerRef.current = null;
      }
      stallTimerRef.current = 0;
      cruxWarnedBinsRef.current = new Set();
      warnedFailBandsRef.current = new Set();
      lastHintElapsedRef.current = -30;
      lastLimbTapRef.current = null;
      staminaRateRef.current = 0;
      roadbookFlowTimerRef.current = 0;
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
      const startZoom = supportsBook ? baseZoom * 0.65 : baseZoom;
      const startCamY = supportsBook ? -185 : -85;
      cameraRef.current = {
        x: 0,
        y: startCamY,
        zoom: startZoom,
        targetX: 0,
        targetY: startCamY,
        targetZoom: startZoom,
        shake: 0,
      };

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
        betaPinsPlanned: 0,
        betaPinsFollowed: 0,
        roadbookFlowHits: 0,
      };

      phaseRef.current = 'PLAYING';
      setPhase('PLAYING');
      setLockedLimb(initialLimb);
      setHoverInfo(null);
      setSummitProgress(0);
      setHudTick((t) => t + 1);
      showBanner(
        supportsBook
          ? isFreeSolo
            ? `${route.tierLabel}（${route.grade}）· 徒手开攀前读线：规划路书后开始攀登（耗体-50%，无保护）`
            : `${route.tierLabel}（${route.grade}）· 开攀前读线：滑动览壁并点选岩点规划路书`
          : isFreeSolo
            ? `${route.tierLabel}（${route.grade}）· 徒手攀登：耗体-50%，无保护失败只能重头开始`
            : route.isDailyChallenge
              ? `每日挑战 · ${route.tierLabel}（${route.grade}）`
              : tutVariant === 'advanced'
                ? `${route.tierLabel}（${route.grade}）· 进阶教学：双击或拖离松手，拖动腰部移重心`
                : `${route.tierLabel}（${route.grade}）· 按住四肢关节拖向岩点抓握`,
        3000
      );
    },
    [dismissTacticalHint, showBanner]
  );

  const handleToggleRouteRead = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    if (!isRouteBookSupported(worldRef.current.route)) return;

    const next = !isReadingRouteRef.current;
    isReadingRouteRef.current = next;
    setIsReadingRoute(next);
    dynoChargeRef.current = null;
    activePelvisDragRef.current = null;
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
      peekOffsetYRef.current = -140;
      showBanner('路书读线：上下滑屏或滚轮览壁，点岩点按序连线', 2600);
    }
  }, [dismissTacticalHint, showBanner]);

  const handleSelectLimb = useCallback((limb: LimbId | null) => {
    lockedLimbRef.current = limb;
    setLockedLimb(limb);
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

      limb.holdId = null;
      limb.isDragging = false;
      limb.reachT = 1;
      climber.torsoVel.y += 18;
      climber.torsoVel.x += limb.isLeft ? 15 : -15;
      soundEngine.playLimbTick();
      triggerHaptic(10);
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
      soundEngine.playLimbTick();
      triggerHaptic(6);
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
    soundEngine.playLimbTick();
    showBanner('已清空路书序列', 1300);
  }, [showBanner]);

  const handleUndoBetaPin = useCallback(() => {
    if (betaPinsRef.current.length === 0) return;
    const next = betaPinsRef.current.slice(0, -1);
    betaPinsRef.current = next;
    setBetaPins(next);
    soundEngine.playLimbTick();
    showBanner(`已撤回至第 ${next.length} 步`, 1100);
  }, [showBanner]);

  const handleAutoSuggestBetaPins = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || !isRouteBookSupported(worldRef.current.route)) return;
    const world = worldRef.current;
    const climber = climberRef.current;
    const suggested = generateSuggestedRoadbook(
      world,
      climber.torsoPos,
      10,
      selectedLoadoutRef.current
    );
    if (suggested.length === 0) {
      showBanner('附近已接近顶峰平台，可直接向上抓取登顶', 1500);
      return;
    }
    usedRouteReadRef.current = true;
    betaPinsRef.current = suggested;
    setBetaPins(suggested);
    statsRef.current.betaPinsPlanned += suggested.length;
    peekOffsetYRef.current = Math.min(peekOffsetYRef.current, -140);
    soundEngine.playLimbTick();
    triggerHaptic(10);
    showBanner(`已生成 ${suggested.length} 步最优参考路书（已自动避开干扰死胡同）`, 2300);
  }, [showBanner]);

  const clampPeekOffset = useCallback((val: number): number => {
    const minPeek = isReadingRouteRef.current
      ? -(worldRef.current.mountainHeight + climberRef.current.torsoPos.y + 40)
      : -320;
    return Math.max(minPeek, Math.min(120, val));
  }, []);

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
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.dynoFlight) return;

    const anchored = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
      (id) => climber.limbs[id].holdId !== null
    );
    const anchoredFeet = anchored.filter((id) => !climber.limbs[id].isHand);
    const anchoredHands = anchored.filter((id) => climber.limbs[id].isHand);
    if (anchored.length < 3 || anchoredFeet.length === 0 || anchoredHands.length === 0) {
      showBanner('需至少稳住双脚和一只手才可松手甩臂', 1500);
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
    climber.torsoVel.y += 16;
    climber.torsoVel.x += climber.limbs[targetHand].isLeft ? 14 : -14;
    soundEngine.playLimbTick();
    triggerHaptic(10);
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
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
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
    triggerHaptic([14, 24, 18]);
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
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.chalkUses <= 0) return;

    climber.chalkUses -= 1;
    climber.chalk = 100;
    soundEngine.playChalk();
    triggerHaptic(10);

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
    showBanner('双手已涂抹防滑粉 · 抓握更稳');

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
      .filter((h) => !h.broken && Math.hypot(h.x - cpX, h.y - (cpY - 40)) < 115)
      .sort((a, b) => a.y - b.y);

    const lh = nearby[0] ?? worldRef.current.holds[0];
    const rh = nearby[1] ?? nearby[0] ?? worldRef.current.holds[1];
    const lf = nearby[nearby.length - 2] ?? lh;
    const rf = nearby[nearby.length - 1] ?? rh;

    climber.torsoPos = { x: cpX, y: cpY - 40 };
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
    activeLimbDragRef.current = null;
    activePelvisDragRef.current = null;
    setActiveDragReason(null);
    lastSlipNoteRef.current = null;
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
      if (isReadingRouteRef.current && isRouteBookSupported(worldRef.current.route)) {
        let previewHint = `${describeHold(closestHold)} · 点击编入路书`;
        const curPins = betaPinsRef.current;
        const idx = curPins.indexOf(closestHold.id);
        if (idx === curPins.length - 1 && idx >= 0) {
          previewHint = `${describeHold(closestHold)} · 点击撤销第 ${idx + 1} 步`;
        } else if (idx >= 0) {
          previewHint = `${describeHold(closestHold)} · 点击移除第 ${idx + 1} 步`;
        } else if (curPins.length > 0) {
          const prevHold = holdsMapRef.current.get(curPins[curPins.length - 1]);
          if (prevHold) {
            const stepD = Math.round(Math.hypot(closestHold.x - prevHold.x, closestHold.y - prevHold.y));
            const spanDesc =
              stepD > 132 ? '跨度过大' : stepD > 95 ? '长距/跃' : '稳妥';
            previewHint = `${describeHold(closestHold)} · 距上步${stepD}px(${spanDesc})`;
          }
        }
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
          stabilityHint: `${describeHold(closestHold)} · 请按住四肢关节拖向岩点`,
          worldPos,
        };
      }

      const evalRes = evaluateHoldGrab(climber, selected, closestHold);
      const reachable = evalRes.ok;
      const dynoEligible = !reachable && isDynoReachable(climber, selected, closestHold);

      const stabilityHint = reachable
        ? describeHold(closestHold)
        : dynoEligible
          ? `${describeHold(closestHold)} · 长按蓄力跃抓`
          : evalRes.reason ?? '超出伸展极限 · 先上移双脚或调重心';

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
    summitProgressRef.current = 0;
    setSummitProgress(0);
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
    spawnParticles(summitLedge.x, peakTopY - 56, 22, 'spark', '#FDE68A', 96);
    soundEngine.playSummitChord();
    triggerHaptic([25, 40, 25, 40, 60]);
    showBanner('登顶成功！站上最高点', 3200);
  }, [recordSummitSuccess, showBanner, spawnParticles]);

  const attemptGrabHold = useCallback(
    (limbId: LimbId, hold: Hold, isDyno = false): boolean => {
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return false;

      if (!isDyno) {
        const evalRes = evaluateHoldGrab(climber, limbId, hold);
        statsRef.current.keyActionAttempts += 1;
        if (!evalRes.ok) {
          statsRef.current.keyActionErrors += 1;
          climber.limbs[limbId].holdId = null;
          soundEngine.playSlip();
          triggerHaptic(8);
          spawnParticles(hold.x, hold.y, 4, 'dust', '#94A3B8', 28);
          showBanner(evalRes.reason ?? '抓握条件不足', 1700);
          return false;
        }
      } else {
        statsRef.current.keyActionAttempts += 1;
      }

      const limb = climber.limbs[limbId];

      // Auto-check off completed Roadbook pin if grabbed & trigger speed/rhythm flow bonus
      const pinIdx = betaPinsRef.current.indexOf(hold.id);
      if (pinIdx >= 0) {
        statsRef.current.betaPinsFollowed += 1;
        statsRef.current.roadbookFlowHits += 1;
        roadbookFlowTimerRef.current = 6.5;
        const remainingPins =
          pinIdx <= 1
            ? betaPinsRef.current.slice(pinIdx + 1)
            : betaPinsRef.current.filter((id) => id !== hold.id);
        betaPinsRef.current = remainingPins;
        setBetaPins(remainingPins);
      } else if (hold.isDecoy) {
        roadbookFlowTimerRef.current = 0;
        if (
          selectedLoadoutRef.current === 'free-solo' &&
          (hold.type === 'fragile' || hold.type === 'ice' || hold.wet)
        ) {
          showBanner('误入高危干扰点 · 徒手无保护注意防滑与退路！', 1800);
        }
      }

      if (isDyno) {
        const activeLoadout =
          LOADOUT_OPTIONS.find((l) => l.id === selectedLoadoutRef.current) ??
          LOADOUT_OPTIONS[1];
        const prevDynoStamina = climber.stamina;
        climber.stamina = Math.max(0, climber.stamina - 14 * activeLoadout.drainMult);
        statsRef.current.staminaSpent += Math.max(0, prevDynoStamina - climber.stamina);
        const wetOrIceUnchalked = (hold.wet || hold.type === 'ice') && climber.chalk <= 18;
        const willSlip = wetOrIceUnchalked && Math.random() < 0.22;

        limb.startPos = { x: limb.pos.x, y: limb.pos.y };
        limb.holdId = null;
        climber.dynoFlight = {
          holdId: hold.id,
          limbId,
          startTorso: { x: climber.torsoPos.x, y: climber.torsoPos.y },
          targetPos: { x: hold.x, y: hold.y },
          t: 0,
          duration: 0.32,
          willSlip,
        };
        soundEngine.playDyno();
        triggerHaptic([12, 24, 15]);
        routeEventsRef.current.push({ x: hold.x, y: hold.y, kind: 'dyno', label: '腾空跃抓' });
        showBanner('发力腾跃！', 900);
        return true;
      }

      const curAltRatio = Math.max(
        0,
        Math.min(1, -climber.torsoPos.y / worldRef.current.mountainHeight)
      );
      const isSnowy =
        hold.type === 'ice' ||
        weatherRef.current.type === 'snowstorm' ||
        (worldRef.current.route.palette === 'glacial' && curAltRatio > 0.3) ||
        curAltRatio > 0.72;
      soundEngine.playGrab(hold.type, {
        isFoot: !limb.isHand,
        isSnowy,
        wet: !!hold.wet,
      });
      triggerHaptic(10);

      limb.startPos = { x: limb.pos.x, y: limb.pos.y };
      limb.targetPos = { x: hold.x, y: hold.y };
      limb.reachT = 0;
      limb.holdId = hold.id;
      limb.strain = Math.max(0, limb.strain - 0.16);

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
    [advanceAdvancedTutorial, dismissTacticalHint, scheduleTutorialAutoFinish, showBanner, spawnParticles, triggerSummit]
  );

  const executeGrabOnHover = useCallback(
    (info: HoverInfo | null, isDyno = false) => {
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
          showBanner(`已撤回第 ${existingIdx + 1} 步路书`, 1200);
        } else if (existingIdx >= 0) {
          nextPins = curPins.filter((id) => id !== holdId);
          showBanner(`已移除第 ${existingIdx + 1} 步路书`, 1200);
        } else {
          const prevHold =
            curPins.length > 0 ? holdsMapRef.current.get(curPins[curPins.length - 1]) : null;
          nextPins = [...curPins, holdId];
          statsRef.current.betaPinsPlanned += 1;
          if (prevHold) {
            const stepD = Math.hypot(info.hold.x - prevHold.x, info.hold.y - prevHold.y);
            if (stepD > 132) {
              showBanner(
                `第 ${nextPins.length} 步 · 注意：跨度过大(${Math.round(stepD)}px)，建议中间补点`,
                2200
              );
            } else if (stepD > 95) {
              showBanner(
                `第 ${nextPins.length} 步 · 长距(${Math.round(stepD)}px)，攀时需移重心或跃抓`,
                1900
              );
            } else {
              showBanner(`第 ${nextPins.length} 步 · ${describeHold(info.hold)}（衔接稳妥）`, 1600);
            }
          } else {
            showBanner(`第 1 步 · ${describeHold(info.hold)}`, 1600);
          }
        }
        betaPinsRef.current = nextPins;
        setBetaPins(nextPins);
        soundEngine.playLimbTick();
        hoverRef.current = info;
        setHoverInfo(info);
        return;
      }

      if (!lockedLimbRef.current) {
        showBanner('请按住四肢关节拖向目标岩点（或点选肢体后再点岩点）', 1600);
        return;
      }

      if (!info.reachable && !isDyno) {
        const limbLabel = climber.limbs[info.suggestedLimb].label;
        showBanner(
          info.dynoEligible
            ? '长按该岩点约 0.4 秒可蓄力腾空跃抓 (Dyno)'
            : `${limbLabel}：${info.stabilityHint}`,
          1600
        );
        return;
      }

      if (attemptGrabHold(info.suggestedLimb, info.hold, isDyno)) {
        handleSelectLimb(null);
      }
    },
    [attemptGrabHold, handleSelectLimb, showBanner]
  );

  // Unified Direct Limb Drag + Multi-Touch Isolated + Anti-Occlusion Mobile Pointer Handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      soundEngine.init();
      if (phaseRef.current !== 'PLAYING') return;
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
            triggerHaptic(8);
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
            triggerHaptic(6);
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

      if (
        !isReadingRouteRef.current &&
        lockedLimbRef.current &&
        info?.hold &&
        !info.reachable &&
        info.dynoEligible
      ) {
        dynoChargeRef.current = {
          hold: info.hold,
          limbId: lockedLimbRef.current,
          progress: 0,
          pointerId: e.pointerId,
        };
      } else {
        dynoChargeRef.current = null;
      }
    },
    [findHoldHover, handleSelectLimb, screenToWorld]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const climber = climberRef.current;
      const isTouch = e.pointerType === 'touch';

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
        stallTimerRef.current = 0;
        reachableIdsRef.current = getReachableHoldIds(
          climber,
          worldRef.current.holds,
          lockedLimbRef.current
        );
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
          // Immediately release contact constraint when dragged off hold
          if (limb.holdId !== null) {
            limb.holdId = null;
            climber.torsoVel.y += 16;
            climber.torsoVel.x += limb.isLeft ? 13 : -13;
            const remainingCount = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
              (id) => climber.limbs[id].holdId !== null
            ).length;
            if (remainingCount < 2) {
              showBanner('仅剩少于 2 个支点！注意优先移动悬空手脚', 1500);
            }
            reachableIdsRef.current = getReachableHoldIds(
              climber,
              worldRef.current.holds,
              drag.limbId
            );
          }
        }

        // Progressive upward aim offset on touch screens prevents user's thumb from hiding target hold
        const zoom = cameraRef.current.zoom || 0.85;
        const liftRatio = isTouch ? Math.min(1, Math.max(0, (movedDist - 4) / 22)) : 0;
        const aimWorldPos: Vec2 = {
          x: rawWorldPos.x,
          y: rawWorldPos.y - liftRatio * (38 / zoom),
        };
        drag.aimWorldPos = aimWorldPos;

        const { clampedPos, aimPos } = clampLimbTarget(climber, drag.limbId, aimWorldPos);
        drag.targetPos = aimPos;

        // Search nearby hold for snap adsorption
        const prevSnapId = drag.snappedHold?.id ?? null;
        const snapRadius = isTouch ? 48 : 30;
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
          const evalRes = evaluateHoldGrab(climber, drag.limbId, closestHold);
          if (evalRes.ok && prevSnapId !== closestHold.id) {
            soundEngine.playLimbTick();
            triggerHaptic(5);
          }
          drag.snappedHold = closestHold;
          drag.canGrab = evalRes.ok;
          drag.estimatedLoad = evalRes.estimatedLoad;
          drag.failReason = evalRes.reason;
          setActiveDragReason(evalRes.ok ? null : evalRes.reason);

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
            if (isDynoReachable(climber, drag.limbId, closestHold)) {
              if (!dynoChargeRef.current || dynoChargeRef.current.hold.id !== closestHold.id) {
                dynoChargeRef.current = {
                  hold: closestHold,
                  limbId: drag.limbId,
                  progress: 0,
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
            dynoEligible: !evalRes.ok && isDynoReachable(climber, drag.limbId, closestHold),
            stabilityHint: evalRes.ok ? describeHold(closestHold) : evalRes.reason ?? '无法抓握',
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

      // Finish active pelvis drag (quick tap without dragging smoothly re-centers pelvis)
      const pelvisDrag = activePelvisDragRef.current;
      if (pelvisDrag && pelvisDrag.pointerId === e.pointerId) {
        activePelvisDragRef.current = null;
        if (pelvisDrag.hasMoved) {
          stallTimerRef.current = 0;
          advanceAdvancedTutorial('pelvis');
        } else if (
          Math.abs(climber.pelvisOffset.x) > 3 ||
          Math.abs(climber.pelvisOffset.y) > 3
        ) {
          climber.pelvisOffset = { x: 0, y: 0 };
          climber.leanBias = 0;
          soundEngine.playLimbTick();
          triggerHaptic(6);
          reachableIdsRef.current = getReachableHoldIds(
            climber,
            worldRef.current.holds,
            lockedLimbRef.current
          );
          showBanner('重心已回中', 1100);
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

        if (activeCharge && activeCharge.progress >= 0.85 && activeCharge.limbId === drag.limbId) {
          lastLimbTapRef.current = null;
          attemptGrabHold(drag.limbId, activeCharge.hold, true);
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
          showBanner(
            limb.holdId !== null
              ? `已选定 ${limb.label} · 双击或拖至空处松开，或拖向岩点抓握`
              : `已选定 ${limb.label} · 拖向或点选高亮岩点抓握`,
            1500
          );
          return;
        }

        lastLimbTapRef.current = null;
        if (drag.snappedHold) {
          attemptGrabHold(drag.limbId, drag.snappedHold, false);
        } else if (drag.originHoldId !== null) {
          soundEngine.playLimbTick();
          triggerHaptic(8);
          stallTimerRef.current = 0;
          advanceAdvancedTutorial('release');
          showBanner(`${climber.limbs[drag.limbId].label} 已松开`, 1200);
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

      const activeCharge =
        dynoChargeRef.current &&
        (dynoChargeRef.current.pointerId === undefined ||
          dynoChargeRef.current.pointerId === e.pointerId)
          ? dynoChargeRef.current
          : null;
      dynoChargeRef.current = null;

      if (wasDraggingPeek) {
        if (!isReadingRouteRef.current) {
          peekOffsetYRef.current = 0;
        }
        return;
      }

      // Check completed Dyno charge launch
      if (activeCharge && !isReadingRouteRef.current) {
        if (activeCharge.progress >= 0.85) {
          attemptGrabHold(activeCharge.limbId, activeCharge.hold, true);
          return;
        }
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
          triggerHaptic(12);
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
      climberRef.current.limbs[drag.limbId].isDragging = false;
      activeLimbDragRef.current = null;
      setActiveDragReason(null);
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
      const dt = Math.min(0.05, (now - lastTime) / 1000);
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

      soundEngine.updateEnvironment(
        altRatio * world.route.windMultiplier,
        windForce,
        weather.type,
        weather.intensity
      );

      if (curPhase === 'PLAYING' && weather.type !== lastWeatherTypeRef.current) {
        lastWeatherTypeRef.current = weather.type;
        if (weather.type === 'mist') {
          showBanner(`天气变化 · 进入${weather.label}，视野略有受限`, 2400);
        } else if (weather.type === 'rain') {
          showBanner(`天气变化 · 遭遇${weather.label}，防滑粉消耗加速！`, 2600);
        } else if (weather.type === 'snowstorm') {
          showBanner(`天气变化 · ${weather.label}来袭，注意视野与防滑粉`, 2600);
        }
      }

      const isPausedReading = curPhase === 'PLAYING' && isReadingRouteRef.current;
      if (!isPausedReading) {
        if (weather.type === 'rain') {
          const dropCount = Math.ceil(3 * weather.intensity);
          for (let r = 0; r < dropCount; r++) {
            particlesRef.current.push({
              x: cam.x + (Math.random() - 0.5) * (width / cam.zoom) * 1.15,
              y: cam.y - (height / cam.zoom) * 0.55,
              vx: windForce * 130 - 45,
              vy: 420 + Math.random() * 140,
              size: 1.5,
              life: 0.9,
              maxLife: 0.9,
              color: 'rgba(203, 213, 225, 0.72)',
              kind: 'rain',
            });
          }
        } else if (
          weather.type === 'snowstorm' ||
          ((world.route.palette === 'glacial' || altRatio > 0.55) && Math.random() < 0.32)
        ) {
          const flakeCount = weather.type === 'snowstorm' ? 3 : 1;
          for (let f = 0; f < flakeCount; f++) {
            particlesRef.current.push({
              x: cam.x + (Math.random() - 0.5) * (width / cam.zoom) * 1.15,
              y: cam.y - (height / cam.zoom) * 0.55,
              vx: windForce * 95 - (weather.type === 'snowstorm' ? 45 : 18),
              vy: (weather.type === 'snowstorm' ? 95 : 48) + Math.random() * 45,
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
        if (!isReadingRouteRef.current) {
          statsRef.current.elapsedSec += dt;
          statsRef.current.altitudeM = altM;
          if (altM > statsRef.current.maxAltitudeM) {
            statsRef.current.maxAltitudeM = altM;
          }

          // Advance Dyno hold-to-lunge charge
          if (dynoChargeRef.current && !isDraggingPeekRef.current && !climber.isFalling) {
            dynoChargeRef.current.progress = Math.min(
              1,
              dynoChargeRef.current.progress + dt / 0.38
            );
          }

          // Low stamina / falling subtle heartbeat pulse
          if (climber.stamina < 28 || climber.isFalling) {
            heartbeatAccRef.current += dt;
            if (heartbeatAccRef.current >= 0.85) {
              heartbeatAccRef.current = 0;
              soundEngine.playHeartbeat();
            }
          } else {
            heartbeatAccRef.current = 0.6;
          }

          if (!climber.isFalling) {
            fallStartYRef.current = climber.torsoPos.y;
            const activeLoadout =
              LOADOUT_OPTIONS.find((l) => l.id === selectedLoadoutRef.current) ??
              LOADOUT_OPTIONS[1];

            roadbookFlowTimerRef.current = Math.max(0, roadbookFlowTimerRef.current - dt);
            const roadbookFlowBonus = Math.min(1, roadbookFlowTimerRef.current / 3.5);

            const phys = updateClimberPhysics(
              climber,
              holdsMapRef.current,
              world.ledges,
              windForce,
              world.route.drainMultiplier * activeLoadout.drainMult,
              weather,
              dt,
              roadbookFlowBonus
            );

            // Track exact physical stamina expenditure, recovery & time-weighted average
            statsRef.current.staminaSpent += phys.staminaSpentDelta;
            statsRef.current.staminaRecovered += phys.staminaRecoveredDelta;
            staminaRateRef.current = phys.netStaminaRatePerSec;
            statsRef.current.staminaSamplesSum += climber.stamina * dt;
            statsRef.current.staminaSampleCount += dt;

            reachableIdsRef.current = getReachableHoldIds(
              climber,
              world.holds,
              lockedLimbRef.current
            );

            if (phys.dynoLanded) {
              const { hold: landedHold, limbId: landedLimb, slipped } = phys.dynoLanded;
              if (slipped) {
                statsRef.current.keyActionErrors += 1;
                soundEngine.playSlip();
                triggerHaptic([20, 30, 20]);
                spawnParticles(landedHold.x, landedHold.y, 12, 'dust', '#38BDF8', 85);
                lastSlipNoteRef.current = '腾空跃抓冰湿岩点且未涂防滑粉，指尖打滑脱手';
                showBanner('跃抓打滑！冰湿岩面未擦防滑粉', 1600);
              } else {
                soundEngine.playGrab(landedHold.type, {
                  isFoot: false,
                  isSnowy: landedHold.type === 'ice',
                  wet: !!landedHold.wet,
                });
                triggerHaptic([14, 18]);
                cam.shake = 4.5;
                spawnParticles(landedHold.x, landedHold.y, 10, 'chalk', '#F8FAFC', 55);
                spawnParticles(landedHold.x, landedHold.y, 1, 'ring', '#38BDF8', 0);
                statsRef.current.movesMade += 1;
                climber.routeHistory.push({ x: climber.torsoPos.x, y: climber.torsoPos.y });
                const dynoPinIdx = betaPinsRef.current.indexOf(landedHold.id);
                if (dynoPinIdx >= 0) {
                  statsRef.current.betaPinsFollowed += 1;
                  statsRef.current.roadbookFlowHits += 1;
                  roadbookFlowTimerRef.current = 6.5;
                  const remaining =
                    dynoPinIdx <= 1
                      ? betaPinsRef.current.slice(dynoPinIdx + 1)
                      : betaPinsRef.current.filter((id) => id !== landedHold.id);
                  betaPinsRef.current = remaining;
                  setBetaPins(remaining);
                } else if (landedHold.isDecoy) {
                  roadbookFlowTimerRef.current = 0;
                }

                // Ensure trailing foot stays supported if stretched out during jump
                const anchoredAfter = (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).filter(
                  (id) => climber.limbs[id].holdId !== null
                );
                if (anchoredAfter.length < 2) {
                  const footCandidate = world.holds
                    .filter((h) => !h.broken && h.id !== landedHold.id && h.y > climber.torsoPos.y + 10)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - climber.torsoPos.x, a.y - (climber.torsoPos.y + 42)) -
                        Math.hypot(b.x - climber.torsoPos.x, b.y - (climber.torsoPos.y + 42))
                    )[0];
                  if (footCandidate) {
                    const targetFoot = landedLimb === 'leftHand' ? 'rightFoot' : 'leftFoot';
                    const fLimb = climber.limbs[targetFoot];
                    fLimb.holdId = footCandidate.id;
                    fLimb.startPos = { x: fLimb.pos.x, y: fLimb.pos.y };
                    fLimb.targetPos = { x: footCandidate.x, y: footCandidate.y };
                    fLimb.reachT = 0;
                  }
                }

                showBanner('动态跃抓稳稳扣住！', 1400);
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
              triggerHaptic([20, 30, 20]);
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
                  : phys.slipReason === 'ice_unchalked'
                    ? `${slippedLimbLabel}停在冰霜岩面且未涂防滑粉导致打滑`
                    : phys.slipReason === 'wet_slip'
                      ? `${slippedLimbLabel}踩中渗水湿滑点且防滑粉不足`
                      : phys.slipReason === 'direction_mismatch'
                        ? `${slippedLimbLabel}抓握侧拉/反扣点时重心方向相反，无法锁住受力`
                        : phys.slipReason === 'overload'
                          ? `${slippedLimbLabel}受力过载且重心失衡，发生滑脱`
                          : `耐力耗尽导致${slippedLimbLabel}无力脱手`;
              lastSlipNoteRef.current = reasonText;
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
                triggerHaptic(15);
                showBanner(
                  isFreeSoloRun
                    ? `抵达 ${phys.reachedLedge.label} · 徒手无保护，可原地喘息`
                    : `抵达 ${phys.reachedLedge.label} · 补给+2岩钉`,
                  2600
                );
              }
            }

            if (phys.triggeredFall) {
              if (!phys.slippedLimb) {
                statsRef.current.keyActionErrors += 1;
              }
              soundEngine.playSlip();
              triggerHaptic([30, 30, 30]);
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
            climber.torsoVel.y += 620 * dt;
            climber.torsoPos.x += climber.torsoVel.x * dt + windForce * 18 * dt;
            climber.torsoPos.y += climber.torsoVel.y * dt;

            (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
              const l = climber.limbs[id];
              l.holdId = null;
              l.pos.x += (climber.torsoPos.x + (l.isLeft ? -18 : 18) - l.pos.x) * Math.min(1, dt * 12);
              l.pos.y += (climber.torsoPos.y + (l.isHand ? -26 : 32) - l.pos.y) * Math.min(1, dt * 12);
            });

            const fallDist = climber.torsoPos.y - fallStartYRef.current;

            // 1. Engage elastic climbing rope arrest when passing a placed piton (zero-teleport)
            if (!climber.ropeCatch) {
              const catchingPiton = [...pitonsRef.current]
                .reverse()
                .find(
                  (p) =>
                    p.integrity > 0 &&
                    p.y <= fallStartYRef.current + 115 &&
                    climber.torsoPos.y >= p.y + 52 &&
                    Math.abs(p.x - climber.torsoPos.x) < 120
                );

              if (catchingPiton) {
                if (catchingPiton.isRusty && !catchingPiton.reliable) {
                  catchingPiton.integrity = 0;
                  soundEngine.playSlip();
                  triggerHaptic([30, 20, 40]);
                  cam.shake = 10;
                  spawnParticles(catchingPiton.x, catchingPiton.y, 14, 'spark', '#D97706', 110);
                  lastSlipNoteRef.current = `${lastSlipNoteRef.current ? `${lastSlipNoteRef.current}；` : ''}下坠后依赖的锈蚀旧岩钉崩断`;
                  showBanner('锈蚀旧岩钉崩断！继续下坠！', 1800);
                } else {
                  const wasRusty = !!catchingPiton.isRusty;
                  if (wasRusty) {
                    catchingPiton.integrity = 0;
                  }
                  const initialLen = Math.min(
                    76,
                    Math.max(54, dist(climber.torsoPos, catchingPiton) * 0.94)
                  );
                  climber.ropeCatch = {
                    pitonId: catchingPiton.id,
                    anchor: { x: catchingPiton.x, y: catchingPiton.y },
                    ropeLen: initialLen,
                  };
                  climber.health = Math.max(0, climber.health - Math.min(22, 6 + fallDist * 0.04));
                  climber.stamina = Math.max(32, climber.stamina);
                  statsRef.current.fallsCaught += 1;
                  routeEventsRef.current.push({
                    x: catchingPiton.x,
                    y: catchingPiton.y,
                    kind: 'slip',
                    label: '冲坠拉停',
                  });
                  soundEngine.playRopeCatch();
                  triggerHaptic([35, 25, 45]);
                  cam.shake = 13;
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
                climber.health = 0;
                cam.shake = 16;
                soundEngine.playRopeCatch();
                triggerHaptic([60, 40, 80]);
                setFallDiagnosis(
                  selectedLoadoutRef.current === 'free-solo'
                    ? `${lastSlipNoteRef.current ?? '高处失去支撑'}；徒手攀登无绳索与岩钉保护，只能从头重攀`
                    : `${lastSlipNoteRef.current ?? '高处失去支撑'}，且上方及横向范围内缺少已固定的岩钉保护`
                );
                phaseRef.current = 'FALLEN';
                setPhase('FALLEN');
              }
            }

            // 2. Continuous elastic rope tension + pendulum swing settlement (no position teleport)
            if (climber.isFalling && climber.ropeCatch) {
              const rc = climber.ropeCatch;
              const dx = rc.anchor.x - climber.torsoPos.x;
              const dy = rc.anchor.y - climber.torsoPos.y;
              const d = Math.hypot(dx, dy) || 1;
              if (d > rc.ropeLen) {
                const stretch = d - rc.ropeLen;
                const nx = dx / d;
                const ny = dy / d;
                const ropeAccel = stretch * 105;
                climber.torsoVel.x += nx * ropeAccel * dt;
                climber.torsoVel.y += ny * ropeAccel * dt;
                // Damp radial rebound while preserving pendulum tangential swing
                const vRad = climber.torsoVel.x * nx + climber.torsoVel.y * ny;
                if (vRad < 0) {
                  climber.torsoVel.x -= nx * vRad * Math.min(1, dt * 12);
                  climber.torsoVel.y -= ny * vRad * Math.min(1, dt * 12);
                }
              }
              climber.torsoVel.x *= Math.max(0, 1 - dt * 3.0);
              climber.torsoVel.y *= Math.max(0, 1 - dt * 3.0);
              climber.leanAngle = Math.max(-0.42, Math.min(0.42, -climber.torsoVel.x * 0.0022));

              const speed = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
              if (speed < 36 && climber.torsoPos.y >= rc.anchor.y + 34) {
                climber.isFalling = false;
                climber.ropeCatch = null;

                if (climber.health <= 0) {
                  setFallDiagnosis(
                    `${lastSlipNoteRef.current ?? '多次冲坠损耗体力'}，最终伤重不支`
                  );
                  phaseRef.current = 'FALLEN';
                  setPhase('FALLEN');
                } else {
                  const nearestHolds = world.holds
                    .filter((h) => !h.broken)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - climber.torsoPos.x, a.y - climber.torsoPos.y) -
                        Math.hypot(b.x - climber.torsoPos.x, b.y - climber.torsoPos.y)
                    );

                  if (nearestHolds[0]) {
                    const lh = climber.limbs.leftHand;
                    lh.holdId = nearestHolds[0].id;
                    lh.startPos = { x: lh.pos.x, y: lh.pos.y };
                    lh.targetPos = { x: nearestHolds[0].x, y: nearestHolds[0].y };
                    lh.reachT = 0;
                  }
                  if (nearestHolds[1]) {
                    const rh = climber.limbs.rightHand;
                    rh.holdId = nearestHolds[1].id;
                    rh.startPos = { x: rh.pos.x, y: rh.pos.y };
                    rh.targetPos = { x: nearestHolds[1].x, y: nearestHolds[1].y };
                    rh.reachT = 0;
                  }
                  showBanner('保护绳已稳住摆荡！快把双脚踩上岩点', 2000);
                }
              }
            }
          }
        }

        const responsiveZoom = Math.min(1.04, Math.max(0.68, width / 440));
        const readZoomMult = isReadingRouteRef.current ? 0.65 : 1;
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
      } else if (curPhase === 'SUMMIT') {
        summitProgressRef.current = Math.min(1, summitProgressRef.current + dt * 0.165);
        const summitLedge = world.ledges.find((l) => l.isSummit);
        const peakX = summitLedge?.x ?? 0;
        const peakTopY = (summitLedge?.y ?? -mountainHeight) - 15;

        // Animate triumphant standing celebration directly on the highest summit point
        const riseT = Math.min(1, summitProgressRef.current / 0.12);
        const smoothRise = riseT * riseT * (3 - 2 * riseT);
        const cheerWave = Math.sin(timeSec * 2.6) * 2.4;
        const swayX = Math.sin(timeSec * 1.35) * 1.4;
        climber.torsoPos = { x: peakX + swayX * 0.35, y: peakTopY - 80 };
        climber.leanAngle = Math.sin(timeSec * 1.35) * 0.03;
        climber.lookAngle = -0.22 + Math.sin(timeSec * 1.9) * 0.04;
        climber.hipTwist = 0.08;
        climber.wallHug = 0.2;
        climber.pelvisOffset = { x: swayX * 0.35, y: 0 };
        climber.limbs.leftFoot.pos = { x: peakX - 10, y: peakTopY - 2 };
        climber.limbs.rightFoot.pos = { x: peakX + 11, y: peakTopY - 2 };
        climber.limbs.leftHand.pos = {
          x: peakX - (18 + 8 * smoothRise) + swayX * 0.5,
          y: peakTopY - (86 + 39 * smoothRise) + cheerWave * 0.55,
        };
        climber.limbs.rightHand.pos = {
          x: peakX + (18 + 9 * smoothRise) + swayX * 0.5,
          y: peakTopY - (86 + 43 * smoothRise) - cheerWave * 0.55,
        };

        // Two-stage summit camera: hold close spotlight shot briefly, then zoom far out to reveal entire peak
        if (summitProgressRef.current < 0.25) {
          const responsiveZoom = Math.min(1.06, Math.max(0.7, width / 440));
          cam.targetX = peakX;
          cam.targetY = peakTopY - 64;
          cam.targetZoom = Math.min(0.94, responsiveZoom * 0.88);
        } else {
          const fitHeightZoom = (height * 0.68) / (mountainHeight + 220);
          const fitWidthZoom = (width * 0.7) / 560;
          const fullMountainZoom = Math.max(0.12, Math.min(fitHeightZoom, fitWidthZoom, 0.48));
          cam.targetX = peakX * 0.25;
          cam.targetY = -mountainHeight * 0.52;
          cam.targetZoom = fullMountainZoom;
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

      const isSummitCloseShot = curPhase === 'SUMMIT' && summitProgressRef.current < 0.25;
      const camLerp =
        curPhase === 'SUMMIT'
          ? isSummitCloseShot
            ? 2.8
            : 1.3
          : isDraggingPeekRef.current
            ? 14
            : 4.6;
      const zoomLerp =
        curPhase === 'SUMMIT' ? (isSummitCloseShot ? 2.4 : 1.15) : 4.2;
      cam.x += (cam.targetX - cam.x) * Math.min(1, dt * camLerp);
      cam.y += (cam.targetY - cam.y) * Math.min(1, dt * camLerp);
      cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * zoomLerp);
      cam.shake = Math.max(0, cam.shake - dt * 28);

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
        windForce,
        weather,
        isReadingRoute: isReadingRouteRef.current,
        summitProgress: summitProgressRef.current,
        skin: activeSkin,
        dynoCharge: dynoChargeRef.current,
        routeEvents: routeEventsRef.current,
        trailPlaybackProgress: trailPlaybackProgressRef.current,
        nearbyRecyclablePitonId: nearbyRecyclable?.id ?? null,
        betaPins: betaPinsRef.current,
        activeLimbDrag: activeLimbDragRef.current,
        activePelvisDrag: activePelvisDragRef.current,
        highlightPelvis:
          tutorialRef.current.active &&
          tutorialRef.current.variant === 'advanced' &&
          tutorialRef.current.step === 1,
        isFreeSolo: selectedLoadoutRef.current === 'free-solo',
      });
      ctx.restore();

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
  }, [showBanner, showTacticalHint, spawnParticles, triggerSummit]);

  // PC Keyboard Shortcuts for fast commercial play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'PLAYING') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();

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
        if (!c.isFalling && !isReadingRouteRef.current) {
          c.pelvisOffset = clampPelvisOffset({ x: c.pelvisOffset.x, y: c.pelvisOffset.y - 14 });
          reachableIdsRef.current = getReachableHoldIds(c, worldRef.current.holds, lockedLimbRef.current);
        }
      } else if (key === 's') {
        const c = climberRef.current;
        if (!c.isFalling && !isReadingRouteRef.current) {
          c.pelvisOffset = clampPelvisOffset({ x: c.pelvisOffset.x, y: c.pelvisOffset.y + 14 });
          reachableIdsRef.current = getReachableHoldIds(c, worldRef.current.holds, lockedLimbRef.current);
        }
      } else if (key === 'arrowdown' || key === 'x') {
        climberRef.current.pelvisOffset.y = 0;
        handleSetLeanBias(0);
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

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
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
  const isPreClimbReading = supportsRouteBook && isReadingRoute && statsRef.current.movesMade === 0;
  const nextBetaHold =
    supportsRouteBook && betaPins.length > 0 ? holdsMapRef.current.get(betaPins[0]) : undefined;
  const nextBetaHoldHint =
    nextBetaHold && !nextBetaHold.broken ? describeHold(nextBetaHold) : null;
  const roadbookEstimate =
    phase === 'PLAYING' && supportsRouteBook && (isReadingRoute || betaPins.length > 0)
      ? estimateRoadbookStamina(
          worldRef.current,
          betaPins,
          climberRef.current,
          weatherRef.current,
          selectedLoadout
        )
      : null;
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
            ? hoverInfo?.hold
              ? hoverInfo.reachable || hoverInfo.dynoEligible
                ? 'cursor-pointer'
                : 'cursor-not-allowed'
              : 'cursor-crosshair'
            : 'cursor-default'
        }`}
      />

      {phase === 'PLAYING' && (
        <GameHUD
          route={activeRoute}
          difficultyProfile={worldRef.current.difficultyProfile}
          weather={weatherRef.current}
          climber={climberRef.current}
          stats={statsRef.current}
          lockedLimb={lockedLimb}
          hover={hoverInfo}
          tutorial={tutorial}
          muted={muted}
          supportsRouteBook={supportsRouteBook}
          isReadingRoute={isReadingRoute}
          isPreClimbReading={isPreClimbReading}
          dynoProgress={dynoChargeRef.current?.progress ?? null}
          nearbyRecyclablePiton={nearbyRecyclablePiton}
          betaPinsCount={betaPins.length}
          nextBetaHoldHint={nextBetaHoldHint}
          canShakeOut={canShakeOut}
          statusBanner={statusBanner}
          onSelectLimb={handleSelectLimb}
          onReleaseLimb={handleReleaseLimb}
          onSetLeanBias={handleSetLeanBias}
          onPlacePiton={handlePlacePiton}
          onApplyChalk={handleApplyChalk}
          onToggleRouteRead={handleToggleRouteRead}
          onClearBetaPins={handleClearBetaPins}
          onUndoBetaPin={handleUndoBetaPin}
          onAutoSuggestBetaPins={handleAutoSuggestBetaPins}
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
          roadbookEstimate={roadbookEstimate}
          roadbookFlowActive={roadbookFlowTimerRef.current > 0.2}
          onBackToMenu={() => {
            isReadingRouteRef.current = false;
            setIsReadingRoute(false);
            dynoChargeRef.current = null;
            activeLimbDragRef.current = null;
            activePelvisDragRef.current = null;
            peekPointerIdRef.current = null;
            pointerDownPosRef.current = null;
            setActiveDragReason(null);
            peekOffsetYRef.current = 0;
            phaseRef.current = 'TITLE_MENU';
            setPhase('TITLE_MENU');
          }}
        />
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
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            const r = getRouteById(id);
            worldRef.current = generateMountain(r);
          }}
          onSelectLoadout={setSelectedLoadout}
          onSelectSkin={setSelectedSkin}
          onStart={startRoute}
        />
      )}

      {(phase === 'SUMMIT' || phase === 'FALLEN') && (
        <SummitOverlay
          phase={phase}
          route={activeRoute}
          stats={statsRef.current}
          climbStyle={achievedStyle}
          summitProgress={summitProgress}
          hasCheckpoint={hasCheckpoint}
          newlyUnlockedBadge={newlyUnlockedBadge}
          isPlayingTrail={isPlayingTrail}
          fallDiagnosis={fallDiagnosis}
          assessment={climbAssessment}
          isFreeSolo={isFreeSoloLoadout}
          onToggleTrailPlayback={handleToggleTrailPlayback}
          onRespawnCheckpoint={handleRespawnCheckpoint}
          onRestart={() => startRoute(worldRef.current.route)}
          onNextRoute={(next) => startRoute(next)}
          onBackToMenu={() => {
            isPlayingTrailRef.current = false;
            trailPlaybackProgressRef.current = null;
            setIsPlayingTrail(false);
            phaseRef.current = 'TITLE_MENU';
            setPhase('TITLE_MENU');
          }}
        />
      )}
    </main>
  );
}
