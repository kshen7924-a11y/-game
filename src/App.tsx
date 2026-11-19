import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { SummitOverlay } from './components/SummitOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine, triggerHaptic } from './game/audio';
import {
  dist,
  getReachableHoldIds,
  isDynoReachable,
  isHoldReachable,
  pickBestLimbForHold,
  updateClimberPhysics,
} from './game/ik';
import {
  CLIMBER_SKINS,
  generateMountain,
  getDailyChallengeRoute,
  getRouteById,
  getWeatherAtAltitude,
  LOADOUT_OPTIONS,
  MountainWorld,
  PIXELS_PER_METER,
  ROUTES,
} from './game/mountain';
import { renderGameFrame } from './game/renderer';
import {
  ActiveWeather,
  CameraState,
  ClimberSkinId,
  ClimberState,
  ClimbEvent,
  ClimbStats,
  ClimbStyle,
  DynoChargeState,
  GamePhase,
  Hold,
  HoverInfo,
  LimbId,
  LoadoutId,
  Particle,
  Piton,
  RouteConfig,
  RouteId,
  TutorialState,
  Vec2,
} from './game/types';

const BADGES_STORAGE_KEY = 'cairn_unlocked_badges_v1';
const STYLES_STORAGE_KEY = 'cairn_route_styles_v1';
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

  return {
    torsoPos: { x: 0, y: -42 },
    torsoVel: { x: 0, y: 0 },
    leanAngle: 0,
    leanBias: 0,
    lookAngle: 0,
    stamina: 100,
    maxStamina: 100,
    chalk: 78,
    chalkUses: Math.max(1, world.route.chalkUses + loadout.chalkDelta),
    pitonsLeft: Math.max(1, world.route.pitons + loadout.pitonDelta),
    health: 100,
    isFalling: false,
    isResting: true,
    isStemming: false,
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
  });

  const usedRouteReadRef = useRef(false);
  const routeEventsRef = useRef<ClimbEvent[]>([]);
  const dynoChargeRef = useRef<DynoChargeState | null>(null);
  const trailPlaybackProgressRef = useRef<number | null>(null);
  const isPlayingTrailRef = useRef(false);
  const heartbeatAccRef = useRef(0);
  const betaPinsRef = useRef<string[]>([]);
  const lastSlipNoteRef = useRef<string | null>(null);

  const summitProgressRef = useRef(0);
  const fallStartYRef = useRef(0);
  const pointerDownPosRef = useRef<Vec2 | null>(null);
  const isDraggingPeekRef = useRef(false);
  const peekOffsetYRef = useRef(0);
  const isReadingRouteRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [lockedLimb, setLockedLimb] = useState<LimbId | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>(tutorialRef.current);
  const [muted, setMuted] = useState(false);
  const [isReadingRoute, setIsReadingRoute] = useState(false);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [summitProgress, setSummitProgress] = useState(0);
  const [betaPins, setBetaPins] = useState<string[]>([]);
  const [fallDiagnosis, setFallDiagnosis] = useState<string | null>(null);
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

  const recordSummitSuccess = useCallback((route: RouteConfig, fallsCaught: number) => {
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
  }, []);

  const showBanner = useCallback((msg: string, ms = 2200) => {
    setStatusBanner(msg);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setStatusBanner(null);
    }, ms);
  }, []);

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

      const freshClimber = createInitialClimber(freshWorld, selectedLoadoutRef.current);
      climberRef.current = freshClimber;
      pitonsRef.current = freshWorld.rustyPitons.map((p) => ({ ...p }));
      particlesRef.current = [];
      const initialLimb: LimbId | null = route.tier >= 3 ? 'rightHand' : null;
      lockedLimbRef.current = initialLimb;
      hoverRef.current = null;
      dynoChargeRef.current = null;
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
      isReadingRouteRef.current = false;
      peekOffsetYRef.current = 0;
      isDraggingPeekRef.current = false;
      setIsReadingRoute(false);

      const reachSet = getReachableHoldIds(freshClimber, freshWorld.holds, initialLimb);
      reachableIdsRef.current = reachSet;

      const tutActive = route.hasTutorial;
      const tutState: TutorialState = {
        active: tutActive,
        step: 0,
        highlightHoldId: tutActive
          ? findTutorialHighlightHold(0, freshClimber, freshWorld, reachSet)
          : null,
      };
      tutorialRef.current = tutState;
      setTutorial(tutState);

      const baseZoom = Math.min(1.04, Math.max(0.7, window.innerWidth / 440));
      cameraRef.current = {
        x: 0,
        y: -85,
        zoom: baseZoom,
        targetX: 0,
        targetY: -85,
        targetZoom: baseZoom,
        shake: 0,
      };

      statsRef.current = {
        altitudeM: 0,
        maxAltitudeM: 0,
        elapsedSec: 0,
        pitonsPlaced: 0,
        fallsCaught: 0,
        movesMade: 0,
      };

      phaseRef.current = 'PLAYING';
      setPhase('PLAYING');
      setLockedLimb(initialLimb);
      setHoverInfo(null);
      setSummitProgress(0);
      setHudTick((t) => t + 1);
      showBanner(
        route.isDailyChallenge
          ? `每日挑战 · ${route.tierLabel}（${route.grade}）`
          : route.tier >= 3
            ? `${route.tierLabel}（${route.grade}）· 左下切肢 · 右上调重心与读线`
            : `${route.tierLabel}（${route.grade}）· ${route.name}（目标 ${route.heightM}m）`,
        2600
      );
    },
    [showBanner]
  );

  const handleToggleRouteRead = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    const next = !isReadingRouteRef.current;
    isReadingRouteRef.current = next;
    setIsReadingRoute(next);
    dynoChargeRef.current = null;
    if (!next) {
      peekOffsetYRef.current = 0;
      hoverRef.current = null;
      setHoverInfo(null);
      showBanner('继续攀爬', 1200);
    } else {
      usedRouteReadRef.current = true;
      peekOffsetYRef.current = -160;
      showBanner('已暂停 · 读线模式：上下滑屏看全线，点岩点可测连线', 2600);
    }
  }, [showBanner]);

  const handleSelectLimb = useCallback((limb: LimbId | null) => {
    lockedLimbRef.current = limb;
    setLockedLimb(limb);
    reachableIdsRef.current = getReachableHoldIds(
      climberRef.current,
      worldRef.current.holds,
      limb
    );
  }, []);

  const handleSetLeanBias = useCallback(
    (bias: -1 | 0 | 1) => {
      if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;
      climber.leanBias = bias;
      soundEngine.playLimbTick();
      triggerHaptic(6);
      reachableIdsRef.current = getReachableHoldIds(
        climber,
        worldRef.current.holds,
        lockedLimbRef.current
      );
      setHudTick((t) => t + 1);
    },
    []
  );

  const handleClearBetaPins = useCallback(() => {
    betaPinsRef.current = [];
    setBetaPins([]);
    soundEngine.playLimbTick();
    showBanner('已清空手绘路书标记', 1400);
  }, [showBanner]);

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
    soundEngine.playLimbTick();
    triggerHaptic(10);
    reachableIdsRef.current = getReachableHoldIds(
      climber,
      worldRef.current.holds,
      lockedLimbRef.current
    );
    showBanner(`${climber.limbs[targetHand].label} 松手甩臂恢复中`, 1500);
    setHudTick((t) => t + 1);
  }, [showBanner]);

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
    showBanner(`岩钉已固定（剩余 ${climber.pitonsLeft} 枚）`);

    if (tutorialRef.current.active && tutorialRef.current.step === 2) {
      const nextTut: TutorialState = { active: true, step: 3, highlightHoldId: null };
      tutorialRef.current = nextTut;
      setTutorial(nextTut);
    }

    setHudTick((t) => t + 1);
  }, [showBanner, spawnParticles]);

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

    showBanner('双手已涂抹防滑粉 · 抓握更稳');

    if (tutorialRef.current.active && tutorialRef.current.step === 3) {
      const nextTut: TutorialState = { active: true, step: 4, highlightHoldId: null };
      tutorialRef.current = nextTut;
      setTutorial(nextTut);
    }

    setHudTick((t) => t + 1);
  }, [showBanner, spawnParticles]);

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
    climber.stamina = 100;
    climber.health = 90;
    climber.isFalling = false;
    climber.dynoFlight = null;
    climber.isShakingOut = false;
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
      };
    });

    phaseRef.current = 'PLAYING';
    setPhase('PLAYING');
    showBanner('已返回最近休息台');
    setHudTick((t) => t + 1);
  }, [showBanner]);

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

      let suggestedLimb = pickBestLimbForHold(
        climber,
        closestHold,
        lockedLimbRef.current
      );
      let reachable = isHoldReachable(climber, suggestedLimb, closestHold);

      let dynoEligible = false;
      if (!reachable) {
        if (lockedLimbRef.current) {
          dynoEligible = isDynoReachable(climber, lockedLimbRef.current, closestHold);
        } else {
          for (const handId of ['leftHand', 'rightHand'] as LimbId[]) {
            if (isDynoReachable(climber, handId, closestHold)) {
              dynoEligible = true;
              suggestedLimb = handId;
              break;
            }
          }
        }
      }

      const stabilityHint = reachable
        ? describeHold(closestHold)
        : isReadingRouteRef.current
          ? `${describeHold(closestHold)}（上方路线点）`
          : dynoEligible
            ? `${describeHold(closestHold)} · 长按蓄力跃抓`
            : '超出伸展极限 · 先上移双脚或调重心';

      return {
        hold: closestHold,
        suggestedLimb,
        reachable,
        dynoEligible,
        stabilityHint,
        worldPos,
      };
    },
    [screenToWorld]
  );

  const triggerSummit = useCallback(() => {
    const world = worldRef.current;
    const climber = climberRef.current;
    const summitLedge = world.ledges.find((l) => l.isSummit);
    if (!summitLedge) return;

    isReadingRouteRef.current = false;
    setIsReadingRoute(false);
    dynoChargeRef.current = null;
    peekOffsetYRef.current = 0;
    phaseRef.current = 'SUMMIT';
    setPhase('SUMMIT');
    recordSummitSuccess(world.route, statsRef.current.fallsCaught);
    climber.torsoPos = { x: summitLedge.x, y: summitLedge.y - 38 };
    climber.leanAngle = 0;
    climber.limbs.leftFoot.pos = { x: summitLedge.x - 14, y: summitLedge.y - 4 };
    climber.limbs.rightFoot.pos = { x: summitLedge.x + 14, y: summitLedge.y - 4 };
    climber.limbs.leftHand.pos = { x: summitLedge.x - 24, y: summitLedge.y - 54 };
    climber.limbs.rightHand.pos = { x: summitLedge.x + 24, y: summitLedge.y - 56 };
    climber.routeHistory.push({ x: summitLedge.x, y: summitLedge.y - 38 });
    soundEngine.playSummitChord();
    triggerHaptic([25, 40, 25, 40, 60]);
    showBanner('登顶成功！', 3000);
  }, [recordSummitSuccess, showBanner]);

  const executeGrabOnHover = useCallback(
    (info: HoverInfo | null, isDyno = false) => {
      if (!info?.hold) return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;

      if (isReadingRouteRef.current) {
        const holdId = info.hold.id;
        const existingIdx = betaPinsRef.current.indexOf(holdId);
        let nextPins: string[];
        if (existingIdx >= 0) {
          nextPins = betaPinsRef.current.filter((id) => id !== holdId);
          showBanner(`已取消第 ${existingIdx + 1} 号路书标记`, 1400);
        } else {
          nextPins = [...betaPinsRef.current, holdId];
          showBanner(`已标记路书第 ${nextPins.length} 步 · ${describeHold(info.hold)}`, 1800);
        }
        betaPinsRef.current = nextPins;
        setBetaPins(nextPins);
        soundEngine.playLimbTick();
        hoverRef.current = info;
        setHoverInfo(info);
        return;
      }

      if (!info.reachable && !isDyno) {
        const limbLabel = climber.limbs[info.suggestedLimb].label;
        showBanner(
          info.dynoEligible
            ? `长按该岩点约 0.4 秒可蓄力腾空跃抓 (Dyno)`
            : `${limbLabel}够不到该岩点 · 可切换肢体或调重心`,
          1600
        );
        return;
      }

      const hold = info.hold;
      const limbId = info.suggestedLimb;
      const limb = climber.limbs[limbId];

      // Auto-check off completed Beta chalk pin if grabbed
      if (betaPinsRef.current.includes(hold.id)) {
        const remainingPins = betaPinsRef.current.filter((id) => id !== hold.id);
        betaPinsRef.current = remainingPins;
        setBetaPins(remainingPins);
      }

      if (isDyno) {
        climber.stamina = Math.max(0, climber.stamina - 14);
        const wetOrIceUnchalked = (hold.wet || hold.type === 'ice') && climber.chalk <= 18;
        const willSlip = wetOrIceUnchalked && Math.random() < 0.22;

        // Launch genuine two-stage airborne Dyno flight!
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
        return;
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
            step: 1,
            highlightHoldId: nextHold,
          };
          tutorialRef.current = nextTut;
          setTutorial(nextTut);
        } else if (curStep === 1 && !limb.isHand && hold.y < -30) {
          const nextTut: TutorialState = {
            active: true,
            step: 2,
            highlightHoldId: null,
          };
          tutorialRef.current = nextTut;
          setTutorial(nextTut);
        }
      }

      const summitLedge = worldRef.current.ledges.find((l) => l.isSummit);
      if (summitLedge && hold.y <= summitLedge.y + 12 && limb.isHand) {
        triggerSummit();
      }
    },
    [showBanner, spawnParticles, triggerSummit]
  );

  // Unified Mobile Touch + Mouse Pointer Handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      soundEngine.init();
      if (phaseRef.current !== 'PLAYING') return;
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) return;

      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingPeekRef.current = false;

      const isTouch = e.pointerType === 'touch';
      const info = findHoldHover(e.clientX, e.clientY, isTouch);
      hoverRef.current = info;
      setHoverInfo(info);

      if (!isReadingRouteRef.current && info?.hold && !info.reachable && info.dynoEligible) {
        dynoChargeRef.current = {
          hold: info.hold,
          limbId: info.suggestedLimb,
          progress: 0,
        };
      } else {
        dynoChargeRef.current = null;
      }
    },
    [findHoldHover]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current === 'PLAYING' && pointerDownPosRef.current) {
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

      const isTouch = e.pointerType === 'touch';
      const info = findHoldHover(e.clientX, e.clientY, isTouch);
      hoverRef.current = info;
      setHoverInfo(info);

      if (info?.hold && !isReadingRouteRef.current) {
        const dx = info.hold.x - climberRef.current.torsoPos.x;
        climberRef.current.lookAngle = Math.max(-0.35, Math.min(0.35, dx * 0.004));
      }
    },
    [findHoldHover]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'PLAYING' || e.button === 2) {
        pointerDownPosRef.current = null;
        isDraggingPeekRef.current = false;
        dynoChargeRef.current = null;
        return;
      }
      const climber = climberRef.current;
      if (climber.isFalling || climber.dynoFlight) {
        dynoChargeRef.current = null;
        return;
      }

      const wasDraggingPeek = isDraggingPeekRef.current;
      isDraggingPeekRef.current = false;
      pointerDownPosRef.current = null;

      const activeCharge = dynoChargeRef.current;
      dynoChargeRef.current = null;

      if (wasDraggingPeek) {
        if (!isReadingRouteRef.current) {
          peekOffsetYRef.current = 0;
        }
        return;
      }

      // Check completed Dyno charge launch first
      if (activeCharge && !isReadingRouteRef.current) {
        if (activeCharge.progress >= 0.85) {
          executeGrabOnHover(
            {
              hold: activeCharge.hold,
              suggestedLimb: activeCharge.limbId,
              reachable: false,
              dynoEligible: true,
              stabilityHint: describeHold(activeCharge.hold),
              worldPos: { x: activeCharge.hold.x, y: activeCharge.hold.y },
            },
            true
          );
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

      // Direct tap on climber limb joint
      if (!isReadingRouteRef.current && (!info || !info.reachable)) {
        const limbIds: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
        let clickedLimb: LimbId | null = null;
        let minLimbD = isTouch ? 28 : 22;
        for (const id of limbIds) {
          const d = dist(worldPos, climber.limbs[id].pos);
          if (d < minLimbD) {
            minLimbD = d;
            clickedLimb = id;
          }
        }
        if (clickedLimb) {
          const nextLock = lockedLimbRef.current === clickedLimb ? null : clickedLimb;
          soundEngine.playLimbTick();
          triggerHaptic(8);
          handleSelectLimb(nextLock);
          if (nextLock) {
            showBanner(`已选定 ${climber.limbs[nextLock].label} · 轻点目标岩点`, 1400);
          }
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
    [executeGrabOnHover, findHoldHover, handleSelectLimb, screenToWorld, showBanner, spawnParticles]
  );

  const handlePointerCancel = useCallback(() => {
    pointerDownPosRef.current = null;
    isDraggingPeekRef.current = false;
    dynoChargeRef.current = null;
    if (!isReadingRouteRef.current) {
      peekOffsetYRef.current = 0;
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

            const phys = updateClimberPhysics(
              climber,
              holdsMapRef.current,
              world.ledges,
              windForce,
              world.route.drainMultiplier * activeLoadout.drainMult,
              weather,
              dt
            );

            reachableIdsRef.current = getReachableHoldIds(
              climber,
              world.holds,
              lockedLimbRef.current
            );

            if (phys.dynoLanded) {
              const { hold: landedHold, limbId: landedLimb, slipped } = phys.dynoLanded;
              if (slipped) {
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
                    climber.limbs[targetFoot].holdId = footCandidate.id;
                    climber.limbs[targetFoot].pos = { x: footCandidate.x, y: footCandidate.y };
                    climber.limbs[targetFoot].targetPos = { x: footCandidate.x, y: footCandidate.y };
                    climber.limbs[targetFoot].reachT = 1;
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
                        : `耐力耗尽导致${slippedLimbLabel}无力脱手`;
              lastSlipNoteRef.current = reasonText;
              showBanner(`${slippedLimbLabel} 打滑脱手！`, 1400);
            }

            if (phys.reachedLedge && !phys.reachedLedge.visited) {
              phys.reachedLedge.visited = true;
              climber.lastCheckpointX = phys.reachedLedge.x;
              climber.lastCheckpointY = phys.reachedLedge.y;
              if (phys.reachedLedge.isBivouac) {
                climber.pitonsLeft = Math.min(12, climber.pitonsLeft + 2);
                climber.chalkUses = Math.min(8, climber.chalkUses + 1);
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
                showBanner(`抵达 ${phys.reachedLedge.label} · 补给+2岩钉`, 2600);
              }
            }

            if (phys.triggeredFall) {
              soundEngine.playSlip();
              triggerHaptic([30, 30, 30]);
              if (!lastSlipNoteRef.current) {
                lastSlipNoteRef.current = '支撑点少于 2 个，失去平衡脱壁坠落';
              }
              showBanner('失去支撑 · 坠落中！', 1600);
            }

            const summitLedge = world.ledges.find((l) => l.isSummit);
            if (summitLedge && climber.torsoPos.y <= summitLedge.y - 6) {
              triggerSummit();
            }
          } else {
            climber.torsoVel.y += 620 * dt;
            climber.torsoPos.x += climber.torsoVel.x * dt + windForce * 18 * dt;
            climber.torsoPos.y += climber.torsoVel.y * dt;

            (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
              const l = climber.limbs[id];
              l.holdId = null;
              l.pos.x += (climber.torsoPos.x + (l.isLeft ? -18 : 18) - l.pos.x) * dt * 12;
              l.pos.y += (climber.torsoPos.y + (l.isHand ? -26 : 32) - l.pos.y) * dt * 12;
            });

            const fallDist = climber.torsoPos.y - fallStartYRef.current;
            const catchingPiton = [...pitonsRef.current]
              .reverse()
              .find(
                (p) =>
                  p.integrity > 0 &&
                  p.y <= fallStartYRef.current + 115 &&
                  climber.torsoPos.y >= p.y + 84 &&
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
                if (catchingPiton.isRusty) {
                  catchingPiton.integrity = 0;
                }
                climber.isFalling = false;
                climber.torsoVel = { x: 0, y: 0 };
                climber.torsoPos.x = catchingPiton.x;
                climber.torsoPos.y = catchingPiton.y + 66;
                climber.health = Math.max(0, climber.health - Math.min(22, 6 + fallDist * 0.04));
                climber.stamina = Math.max(32, climber.stamina);
                statsRef.current.fallsCaught += 1;
                routeEventsRef.current.push({
                  x: catchingPiton.x,
                  y: catchingPiton.y,
                  kind: 'slip',
                  label: '冲坠拉停',
                });

                const nearestHolds = world.holds
                  .filter((h) => !h.broken)
                  .sort(
                    (a, b) =>
                      Math.hypot(a.x - climber.torsoPos.x, a.y - climber.torsoPos.y) -
                      Math.hypot(b.x - climber.torsoPos.x, b.y - climber.torsoPos.y)
                  );

                if (nearestHolds[0]) {
                  climber.limbs.leftHand.holdId = nearestHolds[0].id;
                  climber.limbs.leftHand.pos = { x: nearestHolds[0].x, y: nearestHolds[0].y };
                  climber.limbs.leftHand.targetPos = { x: nearestHolds[0].x, y: nearestHolds[0].y };
                  climber.limbs.leftHand.reachT = 1;
                }
                if (nearestHolds[1]) {
                  climber.limbs.rightHand.holdId = nearestHolds[1].id;
                  climber.limbs.rightHand.pos = { x: nearestHolds[1].x, y: nearestHolds[1].y };
                  climber.limbs.rightHand.targetPos = { x: nearestHolds[1].x, y: nearestHolds[1].y };
                  climber.limbs.rightHand.reachT = 1;
                }

                soundEngine.playRopeCatch();
                triggerHaptic([35, 25, 45]);
                cam.shake = 13;
                spawnParticles(catchingPiton.x, catchingPiton.y, 12, 'spark', '#F97316', 105);

                if (climber.health <= 0) {
                  setFallDiagnosis(
                    `${lastSlipNoteRef.current ?? '多次冲坠损耗体力'}，最终伤重不支`
                  );
                  phaseRef.current = 'FALLEN';
                  setPhase('FALLEN');
                } else {
                  showBanner(
                    catchingPiton.isRusty
                      ? '古老旧岩钉拉住了下坠！（已弯曲报废）'
                      : '保护绳成功拉住下坠！快把脚踩上岩点',
                    2200
                  );
                }
              }
            } else if (climber.torsoPos.y > 0 || fallDist > 280) {
              climber.isFalling = false;
              climber.health = 0;
              cam.shake = 16;
              soundEngine.playRopeCatch();
              triggerHaptic([60, 40, 80]);
              setFallDiagnosis(
                `${lastSlipNoteRef.current ?? '高处失去支撑'}，且上方及横向范围内缺少已固定的岩钉保护`
              );
              phaseRef.current = 'FALLEN';
              setPhase('FALLEN');
            }
          }
        }

        const responsiveZoom = Math.min(1.04, Math.max(0.68, width / 440));
        const readZoomMult = isReadingRouteRef.current ? 0.65 : 1;
        cam.targetX = climber.torsoPos.x * 0.72;
        cam.targetY = climber.torsoPos.y - 42 + peekOffsetYRef.current;
        cam.targetZoom = responsiveZoom * readZoomMult;
      } else if (curPhase === 'SUMMIT') {
        summitProgressRef.current = Math.min(1, summitProgressRef.current + dt * 0.25);
        const fitHeightZoom = (height * 0.76) / mountainHeight;
        const fitWidthZoom = (width * 0.72) / 560;
        const fullMountainZoom = Math.min(fitHeightZoom, fitWidthZoom, 0.52);
        cam.targetX = 0;
        cam.targetY = -mountainHeight * 0.48;
        cam.targetZoom = fullMountainZoom;

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

      const camLerp = curPhase === 'SUMMIT' ? 1.4 : isDraggingPeekRef.current ? 14 : 4.6;
      cam.x += (cam.targetX - cam.x) * Math.min(1, dt * camLerp);
      cam.y += (cam.targetY - cam.y) * Math.min(1, dt * camLerp);
      cam.zoom +=
        (cam.targetZoom - cam.zoom) * Math.min(1, dt * (curPhase === 'SUMMIT' ? 1.25 : 4.2));
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
  }, [showBanner, spawnParticles, triggerSummit]);

  // PC Keyboard Shortcuts for fast commercial play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'PLAYING') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();

      if (key === ' ') {
        e.preventDefault();
        handleToggleRouteRead();
      } else if (key === '1' || key === 'q') {
        handleSelectLimb('leftHand');
      } else if (key === '2' || key === 'e') {
        handleSelectLimb('rightHand');
      } else if (key === '3' || key === 'a') {
        handleSelectLimb('leftFoot');
      } else if (key === '4' || key === 'd') {
        handleSelectLimb('rightFoot');
      } else if (key === 'escape' || key === 'tab') {
        e.preventDefault();
        handleSelectLimb(null);
      } else if (key === 'arrowleft' || key === 'z') {
        handleSetLeanBias(-1);
      } else if (key === 'arrowdown' || key === 'x') {
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
    handlePlacePiton,
    handleSelectLimb,
    handleSetLeanBias,
    handleShakeOutHand,
    handleToggleRouteRead,
  ]);

  const hasCheckpoint = climberRef.current.lastCheckpointY < 0;
  const activeRoute = worldRef.current.route;
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
        onContextMenu={handleCanvasContextMenu}
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
          isReadingRoute={isReadingRoute}
          dynoProgress={dynoChargeRef.current?.progress ?? null}
          nearbyRecyclablePiton={nearbyRecyclablePiton}
          betaPinsCount={betaPins.length}
          canShakeOut={canShakeOut}
          statusBanner={statusBanner}
          onSelectLimb={handleSelectLimb}
          onSetLeanBias={handleSetLeanBias}
          onPlacePiton={handlePlacePiton}
          onApplyChalk={handleApplyChalk}
          onToggleRouteRead={handleToggleRouteRead}
          onClearBetaPins={handleClearBetaPins}
          onShakeOutHand={handleShakeOutHand}
          onToggleMute={handleToggleMute}
          onRestart={() => startRoute(worldRef.current.route)}
          onBackToMenu={() => {
            isReadingRouteRef.current = false;
            setIsReadingRoute(false);
            dynoChargeRef.current = null;
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
