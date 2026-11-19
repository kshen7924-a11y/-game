import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { SummitOverlay } from './components/SummitOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine } from './game/audio';
import {
  dist,
  getReachableHoldIds,
  isHoldReachable,
  pickBestLimbForHold,
  updateClimberPhysics,
} from './game/ik';
import {
  generateMountain,
  getRouteById,
  getWeatherAtAltitude,
  MountainWorld,
  PIXELS_PER_METER,
  ROUTES,
} from './game/mountain';
import { renderGameFrame } from './game/renderer';
import {
  ActiveWeather,
  CameraState,
  ClimberState,
  ClimbStats,
  GamePhase,
  Hold,
  HoverInfo,
  LimbId,
  Particle,
  Piton,
  RouteConfig,
  RouteId,
  TutorialState,
  Vec2,
} from './game/types';

const BADGES_STORAGE_KEY = 'cairn_unlocked_badges_v1';

const LEGACY_BADGE_MAP: Record<string, RouteId> = {
  '5.6': 'intro',
  '5.9': 'intermediate',
  '5.10b': 'intermediate-plus',
  '5.12a': 'master-1',
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

const HOLD_LABELS: Record<Hold['type'], string> = {
  jug: '稳固抓点',
  crack: '岩缝支点',
  crimp: '小指点 (费力)',
  ice: '冰霜岩面 (易滑)',
  fragile: '风化脆岩 (会碎裂)',
  ledge: '安全平台',
};

function createInitialClimber(world: MountainWorld): ClimberState {
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
    lookAngle: 0,
    stamina: 100,
    maxStamina: 100,
    chalk: 78,
    chalkUses: world.route.chalkUses,
    pitonsLeft: world.route.pitons,
    health: 100,
    isFalling: false,
    isResting: true,
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
    // Best reachable hold well above torso
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
    // Best reachable foot hold higher than current lowest foot
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

  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('kids');
  const [completedRoutes, setCompletedRoutes] = useState<Set<RouteId>>(() =>
    loadSavedBadges()
  );
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(false);

  const worldRef = useRef<MountainWorld>(generateMountain(ROUTES[0]));
  const weatherRef = useRef<ActiveWeather>(
    getWeatherAtAltitude(worldRef.current, 0, 0)
  );
  const lastWeatherTypeRef = useRef<string>('clear');
  const holdsMapRef = useRef<Map<string, Hold>>(new Map());
  const climberRef = useRef<ClimberState>(createInitialClimber(worldRef.current));
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
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [summitProgress, setSummitProgress] = useState(0);
  const [, setHudTick] = useState(0);

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

  const markRouteCompleted = useCallback((routeId: RouteId) => {
    setCompletedRoutes((prev) => {
      const wasNew = !prev.has(routeId);
      setNewlyUnlockedBadge(wasNew);
      if (!wasNew) return prev;
      const next = new Set(prev);
      next.add(routeId);
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

      const freshClimber = createInitialClimber(freshWorld);
      climberRef.current = freshClimber;
      pitonsRef.current = [];
      particlesRef.current = [];
      const initialLimb: LimbId | null = route.tier >= 3 ? 'rightHand' : null;
      lockedLimbRef.current = initialLimb;
      hoverRef.current = null;
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
        route.tier >= 3
          ? `${route.tierLabel}（${route.grade}）· 左下摇杆快切四肢，右上可暂停读线`
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
    if (!next) {
      peekOffsetYRef.current = 0;
      hoverRef.current = null;
      setHoverInfo(null);
      showBanner('继续攀爬', 1200);
    } else {
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

  const handlePlacePiton = useCallback(() => {
    if (phaseRef.current !== 'PLAYING' || isReadingRouteRef.current) return;
    const climber = climberRef.current;
    if (climber.isFalling || climber.pitonsLeft <= 0) return;

    climber.pitonsLeft -= 1;
    pitonsRef.current.push({
      id: `piton-${Date.now()}-${Math.random()}`,
      x: climber.torsoPos.x,
      y: climber.torsoPos.y - 6,
      angle: 0,
      integrity: 1,
    });
    statsRef.current.pitonsPlaced += 1;

    soundEngine.playPitonHammer();
    spawnParticles(climber.torsoPos.x, climber.torsoPos.y - 6, 10, 'spark', '#FBBF24', 90);
    spawnParticles(climber.torsoPos.x, climber.torsoPos.y - 6, 1, 'ring', '#F59E0B', 0);
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
    climber.stamina = 100;
    climber.health = 90;
    climber.isFalling = false;
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

      const suggestedLimb = pickBestLimbForHold(
        climber,
        closestHold,
        lockedLimbRef.current
      );
      const reachable = isHoldReachable(climber, suggestedLimb, closestHold);
      const stabilityHint = reachable
        ? HOLD_LABELS[closestHold.type]
        : isReadingRouteRef.current
          ? `${HOLD_LABELS[closestHold.type]}（上方路线点）`
          : '超出伸展极限 · 先上移双脚';

      return {
        hold: closestHold,
        suggestedLimb,
        reachable,
        stabilityHint,
        worldPos,
      };
    },
    [screenToWorld]
  );

  const executeGrabOnHover = useCallback(
    (info: HoverInfo | null) => {
      if (!info?.hold) return;
      const climber = climberRef.current;
      if (climber.isFalling) return;

      // Route-Reading acts as a tactical PAUSE: tapping holds only inspects type & sightlines
      if (isReadingRouteRef.current) {
        hoverRef.current = info;
        setHoverInfo(info);
        showBanner(`${HOLD_LABELS[info.hold.type]} · 已标出可达连线（点击「继续攀爬」恢复）`, 1800);
        return;
      }

      if (!info.reachable) {
        const limbLabel = climber.limbs[info.suggestedLimb].label;
        showBanner(`${limbLabel}够不到该岩点 · 用左下摇杆切换其他肢体`, 1600);
        return;
      }

      const hold = info.hold;
      const limbId = info.suggestedLimb;
      const limb = climber.limbs[limbId];

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

      soundEngine.playGrab(hold.type);
      statsRef.current.movesMade += 1;

      const lastCrumb = climber.routeHistory[climber.routeHistory.length - 1];
      if (!lastCrumb || dist(lastCrumb, climber.torsoPos) > 22) {
        climber.routeHistory.push({ x: climber.torsoPos.x, y: climber.torsoPos.y });
      }

      // Sticky limb selection: keep manual joystick limb locked instead of snapping back to 智能
      reachableIdsRef.current = getReachableHoldIds(
        climber,
        worldRef.current.holds,
        lockedLimbRef.current
      );

      // Advance Tutorial steps cleanly
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

      // Summit check
      const summitLedge = worldRef.current.ledges.find((l) => l.isSummit);
      if (summitLedge && hold.y <= summitLedge.y + 12 && limb.isHand) {
        isReadingRouteRef.current = false;
        setIsReadingRoute(false);
        peekOffsetYRef.current = 0;
        phaseRef.current = 'SUMMIT';
        setPhase('SUMMIT');
        markRouteCompleted(worldRef.current.route.id);
        climber.torsoPos = { x: summitLedge.x, y: summitLedge.y - 38 };
        climber.leanAngle = 0;
        climber.limbs.leftFoot.pos = { x: summitLedge.x - 14, y: summitLedge.y - 4 };
        climber.limbs.rightFoot.pos = { x: summitLedge.x + 14, y: summitLedge.y - 4 };
        climber.limbs.leftHand.pos = { x: summitLedge.x - 24, y: summitLedge.y - 54 };
        climber.limbs.rightHand.pos = { x: summitLedge.x + 24, y: summitLedge.y - 56 };
        climber.routeHistory.push({ x: summitLedge.x, y: summitLedge.y - 38 });
        soundEngine.playSummitChord();
        showBanner('登顶成功！', 3000);
      }
    },
    [handleSelectLimb, markRouteCompleted, showBanner, spawnParticles]
  );

  // Unified Mobile Touch + Mouse Pointer Handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      soundEngine.init();
      if (phaseRef.current !== 'PLAYING') return;
      const climber = climberRef.current;
      if (climber.isFalling) return;

      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingPeekRef.current = false;

      const isTouch = e.pointerType === 'touch';
      const info = findHoldHover(e.clientX, e.clientY, isTouch);
      hoverRef.current = info;
      setHoverInfo(info);
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

      // Update head look angle subtly toward hovered hold
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
        return;
      }
      const climber = climberRef.current;
      if (climber.isFalling) return;

      const wasDraggingPeek = isDraggingPeekRef.current;
      isDraggingPeekRef.current = false;
      pointerDownPosRef.current = null;

      if (wasDraggingPeek) {
        if (!isReadingRouteRef.current) {
          peekOffsetYRef.current = 0;
        }
        return;
      }

      const isTouch = e.pointerType === 'touch';
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const info = findHoldHover(e.clientX, e.clientY, isTouch);

      // Check direct tap on climber limb joint if not paused in route reading
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
    [executeGrabOnHover, findHoldHover, handleSelectLimb, screenToWorld, showBanner]
  );

  const handlePointerCancel = useCallback(() => {
    pointerDownPosRef.current = null;
    isDraggingPeekRef.current = false;
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

      soundEngine.updateWind(altRatio * world.route.windMultiplier, windForce);

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

      // Dynamic Rain / Snow Particles driven by Weather System (frozen while paused in Route-Reading)
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

          if (!climber.isFalling) {
            fallStartYRef.current = climber.torsoPos.y;

            const phys = updateClimberPhysics(
              climber,
              holdsMapRef.current,
              world.ledges,
              windForce,
              world.route.drainMultiplier,
              weather,
              dt
            );

            reachableIdsRef.current = getReachableHoldIds(
              climber,
              world.holds,
              lockedLimbRef.current
            );

            if (phys.slippedLimb) {
              soundEngine.playSlip();
              const slippedPos = climber.limbs[phys.slippedLimb].pos;
              spawnParticles(slippedPos.x, slippedPos.y, 10, 'dust', '#D97706', 80);
              cam.shake = 7;
              showBanner(`${climber.limbs[phys.slippedLimb].label} 打滑脱手！`, 1400);
            }

            if (phys.reachedLedge && !phys.reachedLedge.visited) {
              phys.reachedLedge.visited = true;
              climber.lastCheckpointX = phys.reachedLedge.x;
              climber.lastCheckpointY = phys.reachedLedge.y;
              if (phys.reachedLedge.isBivouac) {
                climber.pitonsLeft = Math.min(10, climber.pitonsLeft + 2);
                climber.chalkUses = Math.min(6, climber.chalkUses + 1);
                showBanner(`抵达 ${phys.reachedLedge.label} · 补给+2岩钉`, 2600);
              }
            }

            if (phys.triggeredFall) {
              soundEngine.playSlip();
              showBanner('失去支撑 · 坠落中！', 1600);
            }

            const summitLedge = world.ledges.find((l) => l.isSummit);
            if (summitLedge && climber.torsoPos.y <= summitLedge.y - 6) {
              isReadingRouteRef.current = false;
              setIsReadingRoute(false);
              peekOffsetYRef.current = 0;
              phaseRef.current = 'SUMMIT';
              setPhase('SUMMIT');
              markRouteCompleted(world.route.id);
              climber.torsoPos = { x: summitLedge.x, y: summitLedge.y - 38 };
              climber.leanAngle = 0;
              climber.routeHistory.push({ x: summitLedge.x, y: summitLedge.y - 38 });
              soundEngine.playSummitChord();
              showBanner('登顶成功！', 3000);
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

            const lastPiton = pitonsRef.current[pitonsRef.current.length - 1];
            const fallDist = climber.torsoPos.y - fallStartYRef.current;

            if (
              lastPiton &&
              lastPiton.y <= fallStartYRef.current + 115 &&
              climber.torsoPos.y >= lastPiton.y + 84
            ) {
              climber.isFalling = false;
              climber.torsoVel = { x: 0, y: 0 };
              climber.torsoPos.x = lastPiton.x;
              climber.torsoPos.y = lastPiton.y + 66;
              climber.health = Math.max(0, climber.health - Math.min(22, 6 + fallDist * 0.04));
              climber.stamina = Math.max(32, climber.stamina);
              statsRef.current.fallsCaught += 1;

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
              cam.shake = 13;
              spawnParticles(lastPiton.x, lastPiton.y, 12, 'spark', '#F97316', 105);

              if (climber.health <= 0) {
                phaseRef.current = 'FALLEN';
                setPhase('FALLEN');
              } else {
                showBanner('保护绳成功拉住下坠！快把脚踩上岩点', 2200);
              }
            } else if (climber.torsoPos.y > 0 || fallDist > 280) {
              climber.isFalling = false;
              climber.health = 0;
              cam.shake = 16;
              soundEngine.playRopeCatch();
              phaseRef.current = 'FALLEN';
              setPhase('FALLEN');
            }
          }
        }

        // Mobile-first adaptive framing + Route-Reading zoom/pan
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
  }, [markRouteCompleted, showBanner, spawnParticles]);

  const hasCheckpoint = climberRef.current.lastCheckpointY < 0;
  const activeRoute = getRouteById(selectedRouteId);

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
              ? hoverInfo.reachable
                ? 'cursor-pointer'
                : 'cursor-not-allowed'
              : 'cursor-crosshair'
            : 'cursor-default'
        }`}
      />

      {phase === 'PLAYING' && (
        <GameHUD
          route={worldRef.current.route}
          difficultyProfile={worldRef.current.difficultyProfile}
          weather={weatherRef.current}
          climber={climberRef.current}
          stats={statsRef.current}
          lockedLimb={lockedLimb}
          hover={hoverInfo}
          tutorial={tutorial}
          muted={muted}
          isReadingRoute={isReadingRoute}
          statusBanner={statusBanner}
          onSelectLimb={handleSelectLimb}
          onPlacePiton={handlePlacePiton}
          onApplyChalk={handleApplyChalk}
          onToggleRouteRead={handleToggleRouteRead}
          onToggleMute={handleToggleMute}
          onRestart={() => startRoute(worldRef.current.route)}
          onBackToMenu={() => {
            isReadingRouteRef.current = false;
            setIsReadingRoute(false);
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
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            const r = getRouteById(id);
            worldRef.current = generateMountain(r);
          }}
          onStart={startRoute}
        />
      )}

      {(phase === 'SUMMIT' || phase === 'FALLEN') && (
        <SummitOverlay
          phase={phase}
          route={activeRoute}
          stats={statsRef.current}
          summitProgress={summitProgress}
          hasCheckpoint={hasCheckpoint}
          newlyUnlockedBadge={newlyUnlockedBadge}
          onRespawnCheckpoint={handleRespawnCheckpoint}
          onRestart={() => startRoute(worldRef.current.route)}
          onNextRoute={(next) => startRoute(next)}
          onBackToMenu={() => {
            phaseRef.current = 'TITLE_MENU';
            setPhase('TITLE_MENU');
          }}
        />
      )}
    </main>
  );
}
