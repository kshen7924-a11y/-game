/**
 * Development-Mode Transparent Physics Debug Overlay
 *
 * Strictly for `import.meta.env.DEV`. Renders a transparent world-aligned + screen-space
 * diagnostic canvas showing:
 *  1. Climber physics constraint boundaries (tether limits, anatomical bone circles, pelvis clamp box,
 *     support polygon, rope-catch pendulum arc, torso velocity & frame impulse Δv vectors)
 *  2. Dyno charge progress ring (dwell phase + charge arc, aim drift circle, leap vertical window,
 *     live Dyno flight trajectory)
 *  3. Limb grab judgment zones (joint reach radii, aim clamp envelope, cross-body & vertical posture
 *     cutoffs, pointer snap halo, per-hold hitbox & load evaluation tags)
 *  4. Compact translucent telemetry + 60-frame `vy` waveform for catching impulse spikes
 */

import {
  ARM_MAX_REACH,
  DYNO_EXTRA_REACH,
  dist,
  getShoulderAndHip,
  isDynoReachable,
  isStandingOnSpringHold,
  LEG_MAX_REACH,
  SHOULDER_HALF_W,
  TORSO_HEIGHT,
} from './ik';
import { MountainWorld } from './mountain';
import {
  CameraState,
  ClimberState,
  DynoChargeState,
  GamePhase,
  Hold,
  HoverInfo,
  LimbDragState,
  LimbId,
  Vec2,
} from './types';

const DYNO_DWELL_REF_SEC = 0.24;
const DYNO_DRIFT_LIMIT_PX = 48;
const PELVIS_MIN_X = -26;
const PELVIS_MAX_X = 26;
const PELVIS_MIN_Y = -18;
const PELVIS_MAX_Y = 22;
const VY_HISTORY_LEN = 64;

export interface PhysicsDebugTracker {
  prevVx: number;
  prevVy: number;
  initialized: boolean;
  lastDeltaVx: number;
  lastDeltaVy: number;
  lastDeltaMag: number;
  peakImpulseMag: number;
  peakImpulseVx: number;
  peakImpulseVy: number;
  peakImpulseTimerSec: number;
  peakImpulseTag: string;
  vyHistory: number[];
}

export function createPhysicsDebugTracker(): PhysicsDebugTracker {
  return {
    prevVx: 0,
    prevVy: 0,
    initialized: false,
    lastDeltaVx: 0,
    lastDeltaVy: 0,
    lastDeltaMag: 0,
    peakImpulseMag: 0,
    peakImpulseVx: 0,
    peakImpulseVy: 0,
    peakImpulseTimerSec: 0,
    peakImpulseTag: '',
    vyHistory: [],
  };
}

export interface PhysicsDebugRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dt: number;
  world: MountainWorld;
  holdsMap: Map<string, Hold>;
  climber: ClimberState;
  camera: CameraState;
  phase: GamePhase;
  lockedLimb: LimbId | null;
  hover: HoverInfo | null;
  reachableIds: Set<string>;
  activeLimbDrag: LimbDragState | null;
  dynoCharge: DynoChargeState | null;
  tracker: PhysicsDebugTracker;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
  headSize = 6
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1.5) return;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - Math.cos(ang - 0.45) * headSize,
    y2 - Math.sin(ang - 0.45) * headSize
  );
  ctx.lineTo(
    x2 - Math.cos(ang + 0.45) * headSize,
    y2 - Math.sin(ang + 0.45) * headSize
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWorldTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  invZoom: number
) {
  ctx.save();
  const fontSize = Math.max(8, 10 * invZoom);
  ctx.font = `600 ${fontSize.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const padX = 4 * invZoom;
  const padY = 2 * invZoom;
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;
  ctx.fillStyle = 'rgba(10, 15, 24, 0.78)';
  ctx.fillRect(x - boxW * 0.5, y - boxH * 0.5, boxW, boxH);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.7, 0.9 * invZoom);
  ctx.strokeRect(x - boxW * 0.5, y - boxH * 0.5, boxW, boxH);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.4 * invZoom);
  ctx.restore();
}

export function renderPhysicsDebugOverlay(params: PhysicsDebugRenderParams): void {
  const {
    ctx,
    width,
    height,
    dt,
    world,
    holdsMap,
    climber,
    camera,
    phase,
    lockedLimb,
    hover,
    reachableIds,
    activeLimbDrag,
    dynoCharge,
    tracker,
  } = params;

  ctx.clearRect(0, 0, width, height);
  if (phase !== 'PLAYING' && phase !== 'FALLEN') return;

  // --------------------------------------------------------------------------
  // 1. Update Impulse / Velocity Anomaly Tracker
  // --------------------------------------------------------------------------
  const vx = Number.isFinite(climber.torsoVel.x) ? climber.torsoVel.x : 0;
  const vy = Number.isFinite(climber.torsoVel.y) ? climber.torsoVel.y : 0;
  const speed = Math.hypot(vx, vy);

  if (!tracker.initialized) {
    tracker.prevVx = vx;
    tracker.prevVy = vy;
    tracker.initialized = true;
  }

  const dvx = vx - tracker.prevVx;
  const dvy = vy - tracker.prevVy;
  const dMag = Math.hypot(dvx, dvy);
  tracker.lastDeltaVx = dvx;
  tracker.lastDeltaVy = dvy;
  tracker.lastDeltaMag = dMag;
  tracker.prevVx = vx;
  tracker.prevVy = vy;

  tracker.vyHistory.push(vy);
  if (tracker.vyHistory.length > VY_HISTORY_LEN) {
    tracker.vyHistory.shift();
  }

  const isGrounded = !climber.isFalling && !climber.dynoFlight;
  const hasAnomalySpike =
    (isGrounded && (dMag > 36 || vy < -38)) ||
    (!Number.isFinite(climber.torsoVel.x) || !Number.isFinite(climber.torsoVel.y));

  if (hasAnomalySpike || dMag > 55) {
    const tag =
      !Number.isFinite(climber.torsoVel.x) || !Number.isFinite(climber.torsoVel.y)
        ? 'NaN VEL'
        : isGrounded && vy < -38
          ? `UPWARD SPIKE vy=${vy.toFixed(1)}`
          : `Δv SPIKE ${dMag.toFixed(1)}`;
    if (dMag >= tracker.peakImpulseMag || tracker.peakImpulseTimerSec <= 0) {
      tracker.peakImpulseMag = dMag;
      tracker.peakImpulseVx = dvx;
      tracker.peakImpulseVy = dvy;
      tracker.peakImpulseTag = tag;
      tracker.peakImpulseTimerSec = 2.2;
    }
  } else if (tracker.peakImpulseTimerSec > 0) {
    tracker.peakImpulseTimerSec = Math.max(0, tracker.peakImpulseTimerSec - dt);
    if (tracker.peakImpulseTimerSec === 0) {
      tracker.peakImpulseMag = 0;
      tracker.peakImpulseTag = '';
    }
  }

  const invZoom = 1 / Math.max(0.2, camera.zoom);
  const joints = getShoulderAndHip(climber);
  const activeLimbId: LimbId | null =
    activeLimbDrag?.limbId ?? dynoCharge?.limbId ?? lockedLimb ?? hover?.suggestedLimb ?? null;
  const onSpringHold = isStandingOnSpringHold(climber, holdsMap);
  const springExtraRange = onSpringHold ? 16 : 0;

  const anchoredIds = (Object.keys(climber.limbs) as LimbId[]).filter(
    (id) => climber.limbs[id].holdId !== null
  );

  // --------------------------------------------------------------------------
  // 2. World-Space Transparent Debug Geometry
  // --------------------------------------------------------------------------
  ctx.save();
  ctx.translate(width * 0.5, height * 0.52);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 2A. Support Polygon Span & CoM Plumb Line
  if (anchoredIds.length > 0) {
    const xs = anchoredIds.map((id) => climber.limbs[id].pos.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const centerX = (minX + maxX) * 0.5;
    const baseY = climber.torsoPos.y + TORSO_HEIGHT * 0.52;

    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.48)';
    ctx.lineWidth = 2 * invZoom;
    ctx.beginPath();
    ctx.moveTo(minX, baseY);
    ctx.lineTo(maxX, baseY);
    ctx.stroke();

    // Vertical support center line
    ctx.setLineDash([4 * invZoom, 4 * invZoom]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.1 * invZoom;
    ctx.beginPath();
    ctx.moveTo(centerX, climber.torsoPos.y - 75);
    ctx.lineTo(centerX, climber.torsoPos.y + 85);
    ctx.stroke();
    ctx.restore();
  }

  // 2B. Pelvis Offset Clamp Box ([-26..26], [-18..22]) around neutral torso center
  {
    const px = climber.pelvisOffset?.x ?? 0;
    const py = climber.pelvisOffset?.y ?? 0;
    const neutralX = climber.torsoPos.x - px;
    const neutralY = climber.torsoPos.y - py;
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.52)';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.06)';
    ctx.lineWidth = 1.1 * invZoom;
    ctx.setLineDash([3 * invZoom, 3 * invZoom]);
    const bx = neutralX + PELVIS_MIN_X;
    const by = neutralY + PELVIS_MIN_Y;
    const bw = PELVIS_MAX_X - PELVIS_MIN_X;
    const bh = PELVIS_MAX_Y - PELVIS_MIN_Y;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);

    // Current pelvis offset vector
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.beginPath();
    ctx.moveTo(neutralX, neutralY);
    ctx.lineTo(climber.torsoPos.x, climber.torsoPos.y);
    ctx.stroke();

    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(climber.torsoPos.x, climber.torsoPos.y, 3.2 * invZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2C. Anatomical Bone Limits & Physics Tether Constraint Boundaries for All 4 Limbs
  const limbMeta: Array<{
    id: LimbId;
    root: Vec2;
    boneMax: number;
    tetherMax: number;
    grabMax: number;
    shortLabel: string;
  }> = [
    {
      id: 'leftHand',
      root: joints.leftShoulder,
      boneMax: ARM_MAX_REACH,
      tetherMax: ARM_MAX_REACH + 18,
      grabMax: ARM_MAX_REACH + 16,
      shortLabel: 'LH',
    },
    {
      id: 'rightHand',
      root: joints.rightShoulder,
      boneMax: ARM_MAX_REACH,
      tetherMax: ARM_MAX_REACH + 18,
      grabMax: ARM_MAX_REACH + 16,
      shortLabel: 'RH',
    },
    {
      id: 'leftFoot',
      root: joints.leftHip,
      boneMax: LEG_MAX_REACH,
      tetherMax: LEG_MAX_REACH + 20,
      grabMax: LEG_MAX_REACH + 16,
      shortLabel: 'LF',
    },
    {
      id: 'rightFoot',
      root: joints.rightHip,
      boneMax: LEG_MAX_REACH,
      tetherMax: LEG_MAX_REACH + 20,
      grabMax: LEG_MAX_REACH + 16,
      shortLabel: 'RF',
    },
  ];

  for (const m of limbMeta) {
    const limb = climber.limbs[m.id];
    const isActive = activeLimbId === m.id;
    const isAnchored = limb.holdId !== null;
    const curDist = dist(m.root, limb.pos);
    const tetherRatio = curDist / m.tetherMax;

    ctx.save();
    // Subtle bone-limit circle
    ctx.strokeStyle = isActive
      ? 'rgba(52, 211, 153, 0.36)'
      : 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = (isActive ? 1.2 : 0.8) * invZoom;
    ctx.setLineDash([2 * invZoom, 3 * invZoom]);
    ctx.beginPath();
    ctx.arc(m.root.x, m.root.y, m.boneMax, 0, Math.PI * 2);
    ctx.stroke();

    // Physics tether constraint ring (highlights amber/magenta when taut!)
    const isTaut = isAnchored && tetherRatio >= 0.92;
    const isOverTether = isAnchored && curDist > m.tetherMax;
    ctx.strokeStyle = isOverTether
      ? 'rgba(244, 63, 94, 0.85)'
      : isTaut
        ? 'rgba(251, 191, 36, 0.65)'
        : isActive
          ? 'rgba(34, 211, 238, 0.55)'
          : 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = (isOverTether ? 2.0 : isActive || isTaut ? 1.3 : 0.8) * invZoom;
    ctx.setLineDash([5 * invZoom, 4 * invZoom]);
    ctx.beginPath();
    ctx.arc(m.root.x, m.root.y, m.tetherMax, 0, Math.PI * 2);
    ctx.stroke();

    // Joint origin dot
    ctx.setLineDash([]);
    ctx.fillStyle = isActive ? '#34D399' : '#38BDF8';
    ctx.beginPath();
    ctx.arc(m.root.x, m.root.y, 2.6 * invZoom, 0, Math.PI * 2);
    ctx.fill();

    // Taut tether tension vector (exposes exact tether-projection pulls!)
    if (isAnchored && tetherRatio >= 0.88) {
      ctx.strokeStyle = isOverTether
        ? 'rgba(244, 63, 94, 0.92)'
        : 'rgba(251, 191, 36, 0.78)';
      ctx.lineWidth = (isOverTether ? 2.2 : 1.4) * invZoom;
      ctx.beginPath();
      ctx.moveTo(m.root.x, m.root.y);
      ctx.lineTo(limb.pos.x, limb.pos.y);
      ctx.stroke();
      if (isOverTether) {
        drawWorldTag(
          ctx,
          (m.root.x + limb.pos.x) * 0.5,
          (m.root.y + limb.pos.y) * 0.5,
          `TETHER +${(curDist - m.tetherMax).toFixed(1)}px`,
          '#FB7185',
          invZoom
        );
      }
    }

    // Per-limb live load badge
    if (isAnchored) {
      const loadColor =
        limb.load > 1.05 ? '#FB7185' : limb.load > 0.78 ? '#FBBF24' : '#67E8F9';
      drawWorldTag(
        ctx,
        limb.pos.x + (limb.isLeft ? -22 : 22) * invZoom,
        limb.pos.y + (limb.isHand ? -14 : 14) * invZoom,
        `${m.shortLabel} ${limb.load.toFixed(2)}`,
        loadColor,
        invZoom
      );
    }
    ctx.restore();
  }

  // 2D. Active Limb Grab Judgment Envelope + Cross-Body / Vertical Posture Cutoff Planes
  if (activeLimbId) {
    const activeMeta = limbMeta.find((m) => m.id === activeLimbId)!;
    const isHand = activeLimbId === 'leftHand' || activeLimbId === 'rightHand';
    const isLeft = activeLimbId === 'leftHand' || activeLimbId === 'leftFoot';
    const maxAim = isHand ? ARM_MAX_REACH + 34 : LEG_MAX_REACH + 34;

    ctx.save();
    // Exact reachable grab radius around joint
    ctx.fillStyle = 'rgba(52, 211, 153, 0.05)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.lineWidth = 1.5 * invZoom;
    ctx.beginPath();
    ctx.arc(activeMeta.root.x, activeMeta.root.y, activeMeta.grabMax, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Outer aim clamp limit circle (from clampLimbTarget)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.lineWidth = 1 * invZoom;
    ctx.setLineDash([3 * invZoom, 5 * invZoom]);
    ctx.beginPath();
    ctx.arc(activeMeta.root.x, activeMeta.root.y, maxAim, 0, Math.PI * 2);
    ctx.stroke();

    // Anti-cross-body vertical cutoff line
    const oppLimb = isHand
      ? isLeft
        ? climber.limbs.rightHand
        : climber.limbs.leftHand
      : isLeft
        ? climber.limbs.rightFoot
        : climber.limbs.leftFoot;
    if (oppLimb.holdId !== null) {
      const margin = isHand ? 14 : 12;
      const limitX = isLeft ? oppLimb.pos.x + margin : oppLimb.pos.x - margin;
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.55)';
      ctx.lineWidth = 1.2 * invZoom;
      ctx.setLineDash([4 * invZoom, 3 * invZoom]);
      ctx.beginPath();
      ctx.moveTo(limitX, climber.torsoPos.y - 110);
      ctx.lineTo(limitX, climber.torsoPos.y + 110);
      ctx.stroke();
    }

    // Vertical human posture cutoff plane (hands <= torso.y+34, feet >= torso.y-4)
    const postureY = isHand ? climber.torsoPos.y + 34 : climber.torsoPos.y - 4;
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
    ctx.lineWidth = 1.1 * invZoom;
    ctx.setLineDash([6 * invZoom, 4 * invZoom]);
    ctx.beginPath();
    ctx.moveTo(climber.torsoPos.x - 110, postureY);
    ctx.lineTo(climber.torsoPos.x + 110, postureY);
    ctx.stroke();
    ctx.restore();

    // Dyno Reach Envelope & Vertical Leap Cap (for hands)
    if (isHand && (activeLimbDrag || dynoCharge)) {
      const shoulderOffsetX =
        (isLeft ? -SHOULDER_HALF_W : SHOULDER_HALF_W) + climber.leanBias * 12;
      const dynoOrigin: Vec2 = {
        x: climber.torsoPos.x + shoulderOffsetX,
        y: climber.torsoPos.y - TORSO_HEIGHT * 0.48,
      };
      const maxDynoDist = Math.min(
        134,
        ARM_MAX_REACH + DYNO_EXTRA_REACH + 10 + springExtraRange
      );
      const maxVerticalLeap = springExtraRange > 0 ? 128 : 112;

      ctx.save();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.62)';
      ctx.fillStyle = 'rgba(167, 139, 250, 0.04)';
      ctx.lineWidth = 1.4 * invZoom;
      ctx.setLineDash([7 * invZoom, 4 * invZoom]);
      ctx.beginPath();
      ctx.arc(dynoOrigin.x, dynoOrigin.y, maxDynoDist, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Dyno vertical band [torso.y - 18 .. torso.y - maxVerticalLeap]
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
      ctx.lineWidth = 1 * invZoom;
      ctx.beginPath();
      ctx.moveTo(dynoOrigin.x - maxDynoDist, climber.torsoPos.y - 18);
      ctx.lineTo(dynoOrigin.x + maxDynoDist, climber.torsoPos.y - 18);
      ctx.moveTo(dynoOrigin.x - maxDynoDist, climber.torsoPos.y - maxVerticalLeap);
      ctx.lineTo(dynoOrigin.x + maxDynoDist, climber.torsoPos.y - maxVerticalLeap);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2E. Pointer Snap Capture Radius Halo (exact 44px touch / 30px mouse capture zone)
  if (activeLimbDrag?.aimWorldPos) {
    const snapRadius = activeLimbDrag.isTouch ? 44 : 30;
    const aim = activeLimbDrag.aimWorldPos;
    ctx.save();
    ctx.strokeStyle = activeLimbDrag.snappedHold
      ? activeLimbDrag.canGrab
        ? 'rgba(52, 211, 153, 0.9)'
        : 'rgba(251, 113, 133, 0.9)'
      : 'rgba(148, 163, 184, 0.65)';
    ctx.fillStyle = activeLimbDrag.canGrab
      ? 'rgba(52, 211, 153, 0.08)'
      : 'rgba(251, 113, 133, 0.06)';
    ctx.lineWidth = 1.4 * invZoom;
    ctx.setLineDash([4 * invZoom, 3 * invZoom]);
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, snapRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crosshair at aimWorldPos
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(aim.x - 5 * invZoom, aim.y);
    ctx.lineTo(aim.x + 5 * invZoom, aim.y);
    ctx.moveTo(aim.x, aim.y - 5 * invZoom);
    ctx.lineTo(aim.x, aim.y + 5 * invZoom);
    ctx.stroke();

    if (activeLimbDrag.snappedHold) {
      const sh = activeLimbDrag.snappedHold;
      ctx.strokeStyle = activeLimbDrag.canGrab
        ? 'rgba(52, 211, 153, 0.85)'
        : 'rgba(251, 113, 133, 0.85)';
      ctx.lineWidth = 1.5 * invZoom;
      ctx.beginPath();
      ctx.moveTo(aim.x, aim.y);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      drawWorldTag(
        ctx,
        sh.x,
        sh.y - sh.radius - 13 * invZoom,
        activeLimbDrag.canGrab
          ? `GRAB OK L=${(activeLimbDrag.estimatedLoad ?? 0).toFixed(2)}`
          : `BLOCKED L=${(activeLimbDrag.estimatedLoad ?? 0).toFixed(2)}`,
        activeLimbDrag.canGrab ? '#34D399' : '#FB7185',
        invZoom
      );
    }
    ctx.restore();
  }

  // 2F. Per-Hold Hitboxes & Reach / Dyno Classification within 240px of Climber
  for (const h of world.holds) {
    if (h.broken) continue;
    const dTorso = dist(h, climber.torsoPos);
    if (dTorso > 240) continue;

    const isReach = reachableIds.has(h.id);
    const isDynoCand =
      !isReach &&
      activeLimbId !== null &&
      (activeLimbId === 'leftHand' || activeLimbId === 'rightHand') &&
      isDynoReachable(climber, activeLimbId, h, springExtraRange);
    const isSnapped = activeLimbDrag?.snappedHold?.id === h.id;

    ctx.save();
    ctx.strokeStyle = isSnapped
      ? activeLimbDrag?.canGrab
        ? '#34D399'
        : '#FB7185'
      : isReach
        ? 'rgba(52, 211, 153, 0.72)'
        : isDynoCand
          ? 'rgba(167, 139, 250, 0.82)'
          : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = (isSnapped ? 2.1 : isReach || isDynoCand ? 1.3 : 0.8) * invZoom;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Center contact dot
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 1.8 * invZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2G. Dyno Charge Progress Ring (Dwell + Charge + Aim Drift Circle)
  if (dynoCharge) {
    const h = dynoCharge.hold;
    const dwell = dynoCharge.dwellSec ?? 0;
    const dwellFrac = Math.max(0, Math.min(1, dwell / DYNO_DWELL_REF_SEC));
    const chargeFrac = Math.max(0, Math.min(1, dynoCharge.progress));
    const isReady = chargeFrac >= 1;

    ctx.save();
    // Aim drift tolerance boundary (48px)
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.42)';
    ctx.lineWidth = 1.1 * invZoom;
    ctx.setLineDash([4 * invZoom, 4 * invZoom]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, DYNO_DRIFT_LIMIT_PX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Base ring track
    const ringR = h.radius + 14;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 5 * invZoom;
    ctx.beginPath();
    ctx.arc(h.x, h.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dwell arc (amber)
    if (dwellFrac > 0.01) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 2.4 * invZoom;
      ctx.beginPath();
      ctx.arc(
        h.x,
        h.y,
        ringR - 4.5 * invZoom,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + Math.PI * 2 * dwellFrac
      );
      ctx.stroke();
    }

    // Outer charge progress arc (cyan -> emerald READY)
    if (chargeFrac > 0.005) {
      ctx.strokeStyle = isReady ? '#34D399' : '#22D3EE';
      ctx.lineWidth = 4.2 * invZoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(
        h.x,
        h.y,
        ringR,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + Math.PI * 2 * chargeFrac
      );
      ctx.stroke();
    }

    // Live drift distance line
    let driftStr = '';
    if (activeLimbDrag?.aimWorldPos) {
      const driftPx = dist(activeLimbDrag.aimWorldPos, h);
      driftStr = ` drift:${driftPx.toFixed(0)}/${DYNO_DRIFT_LIMIT_PX}`;
      ctx.strokeStyle =
        driftPx > DYNO_DRIFT_LIMIT_PX * 0.8
          ? 'rgba(251, 113, 133, 0.85)'
          : 'rgba(167, 139, 250, 0.7)';
      ctx.lineWidth = 1.2 * invZoom;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(activeLimbDrag.aimWorldPos.x, activeLimbDrag.aimWorldPos.y);
      ctx.stroke();
    }

    drawWorldTag(
      ctx,
      h.x,
      h.y - ringR - 14 * invZoom,
      `DYNO ${Math.round(chargeFrac * 100)}%${isReady ? ' READY' : ` dw:${dwell.toFixed(2)}s`}${driftStr}`,
      isReady ? '#34D399' : '#22D3EE',
      invZoom
    );
    ctx.restore();
  }

  // 2H. Active Dyno Flight Trajectory
  if (climber.dynoFlight) {
    const df = climber.dynoFlight;
    ctx.save();
    ctx.strokeStyle = df.willSlip ? 'rgba(251, 113, 133, 0.9)' : 'rgba(52, 211, 153, 0.9)';
    ctx.lineWidth = 1.8 * invZoom;
    ctx.setLineDash([5 * invZoom, 3 * invZoom]);
    ctx.beginPath();
    ctx.moveTo(df.startTorso.x, df.startTorso.y);
    ctx.lineTo(df.targetPos.x, df.targetPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    drawWorldTag(
      ctx,
      df.targetPos.x,
      df.targetPos.y - 18 * invZoom,
      `FLIGHT ${Math.round((df.t / Math.max(0.01, df.duration)) * 100)}%${df.willSlip ? ' SLIP!' : ''}`,
      df.willSlip ? '#FB7185' : '#34D399',
      invZoom
    );
    ctx.restore();
  }

  // 2I. Rope Catch Pendulum Radius Constraint
  if (climber.ropeCatch) {
    const rc = climber.ropeCatch;
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.lineWidth = 1.4 * invZoom;
    ctx.setLineDash([6 * invZoom, 4 * invZoom]);
    ctx.beginPath();
    ctx.arc(rc.anchor.x, rc.anchor.y, rc.ropeLen, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawWorldTag(
      ctx,
      rc.anchor.x,
      rc.anchor.y - 14 * invZoom,
      `ROPE R=${rc.ropeLen.toFixed(0)}px`,
      '#FACC15',
      invZoom
    );
    ctx.restore();
  }

  // 2J. Live Torso Velocity Vector & Frame Impulse Δv Vector
  {
    const velScale = 0.6;
    const velColor = hasAnomalySpike
      ? '#F43F5E'
      : speed > 65 || (isGrounded && vy < -24)
        ? '#FBBF24'
        : '#22D3EE';
    drawArrow(
      ctx,
      climber.torsoPos.x,
      climber.torsoPos.y,
      climber.torsoPos.x + vx * velScale,
      climber.torsoPos.y + vy * velScale,
      velColor,
      2.2 * invZoom,
      7 * invZoom
    );

    if (tracker.lastDeltaMag > 8) {
      drawArrow(
        ctx,
        climber.torsoPos.x,
        climber.torsoPos.y,
        climber.torsoPos.x + tracker.lastDeltaVx * 0.9,
        climber.torsoPos.y + tracker.lastDeltaVy * 0.9,
        '#F43F5E',
        1.8 * invZoom,
        6 * invZoom
      );
    }
  }

  ctx.restore();

  // --------------------------------------------------------------------------
  // 3. Screen-Space Translucent Telemetry & Impulse Waveform HUD
  // --------------------------------------------------------------------------
  const panelW = Math.min(264, width - 20);
  const panelH = 152;
  const panelX = width - panelW - 10;
  const panelY = 48;

  ctx.save();
  ctx.fillStyle = 'rgba(9, 14, 24, 0.72)';
  ctx.strokeStyle =
    tracker.peakImpulseTimerSec > 0
      ? 'rgba(244, 63, 94, 0.85)'
      : 'rgba(56, 189, 248, 0.42)';
  ctx.lineWidth = 1.2;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const pad = 8;
  let cy = panelY + 7;

  // Header
  ctx.fillStyle = '#38BDF8';
  ctx.fillText(
    `DEV PHYSICS DEBUG  [F3]  ${climber.isFalling ? 'FALL' : climber.dynoFlight ? 'DYNO-AIR' : 'GROUND'}`,
    panelX + pad,
    cy
  );
  cy += 14;

  // Pos & Vel
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(
    `POS (${climber.torsoPos.x.toFixed(1)}, ${climber.torsoPos.y.toFixed(1)})  ANCH:${anchoredIds.length}`,
    panelX + pad,
    cy
  );
  cy += 13;

  ctx.fillStyle = hasAnomalySpike ? '#FB7185' : '#67E8F9';
  ctx.fillText(
    `VEL (${vx.toFixed(1)}, ${vy.toFixed(1)}) |v|=${speed.toFixed(1)}`,
    panelX + pad,
    cy
  );
  cy += 13;

  // Impulse Delta & Peak Spike Alert
  ctx.fillStyle = tracker.peakImpulseTimerSec > 0 ? '#FB7185' : '#94A3B8';
  const spikeLine =
    tracker.peakImpulseTimerSec > 0
      ? `ALERT: ${tracker.peakImpulseTag} (${tracker.peakImpulseVx.toFixed(0)},${tracker.peakImpulseVy.toFixed(0)})`
      : `ΔV/f (${dvx.toFixed(1)}, ${dvy.toFixed(1)}) |Δ|=${dMag.toFixed(1)}`;
  ctx.fillText(spikeLine, panelX + pad, cy);
  cy += 14;

  // Active Limb Grab & Dyno Status Line
  const dynoStr = dynoCharge
    ? `DYNO ${Math.round(dynoCharge.progress * 100)}%`
    : 'DYNO idle';
  const grabStr = activeLimbDrag?.snappedHold
    ? `${activeLimbDrag.limbId.slice(0, 2).toUpperCase()}:${activeLimbDrag.canGrab ? 'OK' : 'NO'}(L${(activeLimbDrag.estimatedLoad ?? 0).toFixed(2)})`
    : activeLimbId
      ? `LIMB:${activeLimbId}`
      : 'LIMB:auto';
  ctx.fillStyle = dynoCharge ? '#34D399' : '#CBD5E1';
  ctx.fillText(`${grabStr}  |  ${dynoStr}`, panelX + pad, cy);
  cy += 15;

  // 60-Frame Vertical Velocity (vy) Waveform Graph (catches upward/downward impulse spikes!)
  const graphX = panelX + pad;
  const graphY = cy;
  const graphW = panelW - pad * 2;
  const graphH = 44;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(graphX, graphY, graphW, graphH);

  // Zero velocity reference line & -40 upward spike threshold
  const mapVyToY = (val: number) => {
    const clamped = Math.max(-120, Math.min(120, val));
    return graphY + graphH * 0.5 + (clamped / 120) * (graphH * 0.45);
  };
  const zeroY = mapVyToY(0);
  const upThreshY = mapVyToY(-40);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.beginPath();
  ctx.moveTo(graphX, zeroY);
  ctx.lineTo(graphX + graphW, zeroY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(graphX, upThreshY);
  ctx.lineTo(graphX + graphW, upThreshY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (tracker.vyHistory.length > 1) {
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < tracker.vyHistory.length; i++) {
      const gx = graphX + (i / (VY_HISTORY_LEN - 1)) * graphW;
      const gy = mapVyToY(tracker.vyHistory[i]);
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(148, 163, 184, 0.78)';
  ctx.font = '500 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('vy (-120..+120)', graphX + 3, graphY + 2);
  ctx.fillStyle = 'rgba(244, 63, 94, 0.8)';
  ctx.fillText('-40', graphX + graphW - 18, upThreshY - 8);

  // Compact Legend Row
  const legY = graphY + graphH + 7;
  ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#34D399';
  ctx.fillText('●抓握范围', panelX + pad, legY);
  ctx.fillStyle = '#38BDF8';
  ctx.fillText('●物理约束', panelX + pad + 62, legY);
  ctx.fillStyle = '#A78BFA';
  ctx.fillText('●Dyno环', panelX + pad + 124, legY);
  ctx.fillStyle = '#FB7185';
  ctx.fillText('●冲量异常', panelX + pad + 182, legY);

  ctx.restore();
}
