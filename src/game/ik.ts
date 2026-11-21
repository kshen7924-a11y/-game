import { ClimberState, Hold, Ledge, LimbId, Vec2 } from './types';

export const TORSO_HEIGHT = 44;
export const SHOULDER_HALF_W = 13;
export const HIP_HALF_W = 9;
export const ARM_UPPER = 30;
export const ARM_LOWER = 28;
export const ARM_MAX_REACH = ARM_UPPER + ARM_LOWER;
export const LEG_UPPER = 34;
export const LEG_LOWER = 32;
export const LEG_MAX_REACH = LEG_UPPER + LEG_LOWER;

export const EFFECTIVE_ARM_REACH = 98;
export const EFFECTIVE_LEG_REACH = 106;
export const DYNO_EXTRA_REACH = 26;

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Nonlinear collision restitution attenuation with strict micro-contact deadzone:
 * - Micro-contacts / tiny grazes (< 6 px/s) are aggressively suppressed so jitter never resonates
 * - Medium & high-speed or deep-penetration contacts collapse super-linearly to 0 (fully inelastic)
 */
export function computeNonlinearRestitution(
  impactSpeed: number,
  penetrationDepth = 0,
  baseRestitution = 0.16
): number {
  const speed = Math.max(0, Number.isFinite(impactSpeed) ? impactSpeed : 0);
  const depth = Math.max(0, Number.isFinite(penetrationDepth) ? penetrationDepth : 0);
  // Smooth cubic micro-contact deadzone (< 8 px/s): eliminates tiny-graze jitter resonance with zero discontinuity
  const microNorm = Math.min(1, speed / 8);
  const microSuppression = microNorm * microNorm * microNorm;
  // Steep exponential + quadratic decay for medium/high speed and penetration depth
  const speedDecay = Math.exp(-speed * 0.05) / (1 + Math.pow(speed / 16, 2));
  const depthDecay = Math.exp(-depth * 0.24);
  const result = baseRestitution * microSuppression * speedDecay * depthDecay;
  return result < 0.0005 ? 0 : Math.min(baseRestitution, result);
}

export const MIN_ELBOW_KNEE_ANGLE = 0.42; // ~24 deg full bend
export const MAX_ELBOW_KNEE_ANGLE = 2.93; // ~168 deg soft hyperextension limit

export function clampPelvisOffset(offset: Vec2): Vec2 {
  return {
    x: Math.max(-26, Math.min(26, offset.x)),
    y: Math.max(-18, Math.min(22, offset.y)),
  };
}

export function solveTwoBoneIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: number
): { joint: Vec2; end: Vec2 } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy);

  // Enforce elbow/knee interior flexion bounds via law of cosines
  const minFlexD = Math.sqrt(
    Math.max(4, len1 * len1 + len2 * len2 - 2 * len1 * len2 * Math.cos(MIN_ELBOW_KNEE_ANGLE))
  );
  const maxFlexD = Math.sqrt(
    len1 * len1 + len2 * len2 - 2 * len1 * len2 * Math.cos(MAX_ELBOW_KNEE_ANGLE)
  );
  const maxD = Math.min(len1 + len2 - 0.5, maxFlexD);
  const minD = Math.max(Math.abs(len1 - len2) + 0.5, minFlexD);
  const d = Math.max(minD, Math.min(maxD, rawDist));

  const angleToTarget = Math.atan2(dy, dx);
  const cosA = (len1 * len1 + d * d - len2 * len2) / (2 * len1 * d);
  const clampedCos = Math.max(-1, Math.min(1, cosA));
  const angleA = Math.acos(clampedCos);

  const jointAngle = angleToTarget + bendDir * angleA;
  const joint: Vec2 = {
    x: root.x + Math.cos(jointAngle) * len1,
    y: root.y + Math.sin(jointAngle) * len1,
  };

  const ux = dx / (rawDist || 1);
  const uy = dy / (rawDist || 1);
  const end: Vec2 =
    rawDist > maxD
      ? { x: root.x + ux * maxD, y: root.y + uy * maxD }
      : { x: target.x, y: target.y };

  return { joint, end };
}

export function getShoulderAndHip(climber: ClimberState): {
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
} {
  const { torsoPos, leanAngle } = climber;
  const twist = Math.max(-1, Math.min(1, climber.hipTwist ?? 0));
  const widthScale = 1 - Math.abs(twist) * 0.24;
  const hipTiltY = twist * 3.4;
  const shoulderTiltY = twist * 1.8;

  const cos = Math.cos(leanAngle);
  const sin = Math.sin(leanAngle);

  const rotate = (lx: number, ly: number): Vec2 => ({
    x: torsoPos.x + lx * cos - ly * sin,
    y: torsoPos.y + lx * sin + ly * cos,
  });

  return {
    leftShoulder: rotate(-SHOULDER_HALF_W * widthScale, -TORSO_HEIGHT * 0.48 - shoulderTiltY),
    rightShoulder: rotate(SHOULDER_HALF_W * widthScale, -TORSO_HEIGHT * 0.48 + shoulderTiltY),
    leftHip: rotate(-HIP_HALF_W * widthScale, TORSO_HEIGHT * 0.46 - hipTiltY),
    rightHip: rotate(HIP_HALF_W * widthScale, TORSO_HEIGHT * 0.46 + hipTiltY),
  };
}

export function computeLimbEndAngle(
  limbId: LimbId,
  jointPos: Vec2,
  endPos: Vec2,
  hold: Hold | null
): number {
  const isHand = limbId === 'leftHand' || limbId === 'rightHand';
  const isLeft = limbId === 'leftHand' || limbId === 'leftFoot';
  const limbAxis = Math.atan2(endPos.y - jointPos.y, endPos.x - jointPos.x);

  if (!hold) {
    return limbAxis;
  }

  if (isHand) {
    const kind = hold.gripKind ?? 'downpull';
    if (kind === 'sidepullLeft') {
      return hold.angle + Math.PI * 0.42;
    }
    if (kind === 'sidepullRight') {
      return hold.angle - Math.PI * 0.42;
    }
    if (kind === 'undercling') {
      return hold.angle + Math.PI;
    }
    return hold.angle;
  }

  // Climbing shoe rubber toe edge matches hold surface angle with slight inside-edge cant
  return hold.angle + (isLeft ? 0.14 : -0.14);
}

export function isHoldReachable(
  climber: ClimberState,
  limbId: LimbId,
  hold: Hold
): boolean {
  if (hold.broken) return false;
  const isHand = limbId === 'leftHand' || limbId === 'rightHand';
  const isLeft = limbId === 'leftHand' || limbId === 'leftFoot';

  const anchoredOtherLimbs = (Object.keys(climber.limbs) as LimbId[]).filter(
    (id) => id !== limbId && climber.limbs[id].holdId !== null
  );

  // Prevent two limbs clamping onto the same small hold (only wide ledges allow sharing)
  for (const otherId of anchoredOtherLimbs) {
    if (climber.limbs[otherId].holdId === hold.id && hold.type !== 'ledge') {
      return false;
    }
  }

  // Anti-cross-body spaghetti twist constraint
  if (isHand) {
    const otherHand = isLeft ? climber.limbs.rightHand : climber.limbs.leftHand;
    if (otherHand.holdId !== null) {
      if (isLeft && hold.x > otherHand.pos.x + 14) return false;
      if (!isLeft && hold.x < otherHand.pos.x - 14) return false;
    }
  } else {
    const otherFoot = isLeft ? climber.limbs.rightFoot : climber.limbs.leftFoot;
    if (otherFoot.holdId !== null) {
      if (isLeft && hold.x > otherFoot.pos.x + 12) return false;
      if (!isLeft && hold.x < otherFoot.pos.x - 12) return false;
    }
  }

  // Vertical human posture ordering: hands stay above waist/feet; feet stay below chest/hands
  const anchoredHands = (['leftHand', 'rightHand'] as LimbId[]).filter(
    (id) => id !== limbId && climber.limbs[id].holdId !== null
  );
  const anchoredFeet = (['leftFoot', 'rightFoot'] as LimbId[]).filter(
    (id) => id !== limbId && climber.limbs[id].holdId !== null
  );

  if (isHand) {
    if (hold.y > climber.torsoPos.y + 34) return false;
    if (anchoredFeet.length > 0) {
      const highestFootY = Math.min(...anchoredFeet.map((id) => climber.limbs[id].pos.y));
      if (hold.y > highestFootY - 6 && hold.type !== 'ledge') return false;
    }
  } else {
    if (hold.y < climber.torsoPos.y - 4) return false;
    if (anchoredHands.length > 0) {
      const lowestHandY = Math.max(...anchoredHands.map((id) => climber.limbs[id].pos.y));
      if (hold.y < lowestHandY + 20) return false;
    }
  }

  // Predict torso equilibrium shift toward the new hold + deliberate pelvis/lean shift
  const pelvisX = climber.pelvisOffset?.x ?? climber.leanBias * 18;
  const pelvisY = climber.pelvisOffset?.y ?? 0;
  const predictedTorso: Vec2 = {
    x: climber.torsoPos.x * 0.62 + hold.x * 0.38 + pelvisX * 0.45,
    y: climber.torsoPos.y * 0.62 + (hold.y + (isHand ? 26 : -28)) * 0.38 + pelvisY * 0.35,
  };

  // Strict anatomical joint reach from predicted shoulder or hip
  const jointOffset: Vec2 = isHand
    ? { x: isLeft ? -SHOULDER_HALF_W : SHOULDER_HALF_W, y: -TORSO_HEIGHT * 0.48 }
    : { x: isLeft ? -HIP_HALF_W : HIP_HALF_W, y: TORSO_HEIGHT * 0.46 };

  const predictedJoint: Vec2 = {
    x: predictedTorso.x + jointOffset.x,
    y: predictedTorso.y + jointOffset.y,
  };

  const jointMaxReach = isHand ? ARM_MAX_REACH + 16 : LEG_MAX_REACH + 16;
  if (dist(predictedJoint, hold) > jointMaxReach) return false;

  // Ensure other anchored limbs won't hyperextend beyond human limits
  for (const otherId of anchoredOtherLimbs) {
    const other = climber.limbs[otherId];
    const oJointOffset: Vec2 = other.isHand
      ? { x: other.isLeft ? -SHOULDER_HALF_W : SHOULDER_HALF_W, y: -TORSO_HEIGHT * 0.48 }
      : { x: other.isLeft ? -HIP_HALF_W : HIP_HALF_W, y: TORSO_HEIGHT * 0.46 };
    const oJoint: Vec2 = {
      x: predictedTorso.x + oJointOffset.x,
      y: predictedTorso.y + oJointOffset.y,
    };
    const oLimit = other.isHand ? ARM_MAX_REACH + 22 : LEG_MAX_REACH + 24;
    if (dist(oJoint, other.pos) > oLimit) {
      return false;
    }
  }

  return true;
}

export interface GrabEvaluation {
  ok: boolean;
  reason: string | null;
  geometricOk: boolean;
  mechanicalOk: boolean;
  estimatedLoad: number;
}

export function clampLimbTarget(
  climber: ClimberState,
  limbId: LimbId,
  desiredWorld: Vec2
): { clampedPos: Vec2; aimPos: Vec2 } {
  const joints = getShoulderAndHip(climber);
  const isHand = limbId === 'leftHand' || limbId === 'rightHand';
  const isLeft = limbId === 'leftHand' || limbId === 'leftFoot';
  const root = isHand
    ? isLeft
      ? joints.leftShoulder
      : joints.rightShoulder
    : isLeft
      ? joints.leftHip
      : joints.rightHip;

  const len1 = isHand ? ARM_UPPER : LEG_UPPER;
  const len2 = isHand ? ARM_LOWER : LEG_LOWER;
  const maxBone = len1 + len2 - 1;
  const minBone = Math.abs(len1 - len2) + 4;
  const maxAim = isHand ? ARM_MAX_REACH + 34 : LEG_MAX_REACH + 34;

  // Enforce natural anatomical angular sector around torso so limbs don't invert backwards
  let dx = desiredWorld.x - root.x;
  let dy = desiredWorld.y - root.y;

  // Prevent crossing too far across torso centerline if opposite limb is anchored
  if (isHand) {
    const otherHand = isLeft ? climber.limbs.rightHand : climber.limbs.leftHand;
    if (otherHand.holdId !== null) {
      if (isLeft) dx = Math.min(dx, otherHand.pos.x + 14 - root.x);
      else dx = Math.max(dx, otherHand.pos.x - 14 - root.x);
    }
    // Hands cannot reach below knees
    dy = Math.min(dy, TORSO_HEIGHT * 0.95);
  } else {
    const otherFoot = isLeft ? climber.limbs.rightFoot : climber.limbs.leftFoot;
    if (otherFoot.holdId !== null) {
      if (isLeft) dx = Math.min(dx, otherFoot.pos.x + 12 - root.x);
      else dx = Math.max(dx, otherFoot.pos.x - 12 - root.x);
    }
    // Feet cannot reach above upper chest
    dy = Math.max(dy, -TORSO_HEIGHT * 0.72);
  }

  const rawD = Math.hypot(dx, dy) || 1;
  const ux = dx / rawD;
  const uy = dy / rawD;

  const boneDist = Math.max(minBone, Math.min(maxBone, rawD));
  const aimDist = Math.max(minBone, Math.min(maxAim, rawD));

  return {
    clampedPos: { x: root.x + ux * boneDist, y: root.y + uy * boneDist },
    aimPos: { x: root.x + ux * aimDist, y: root.y + uy * aimDist },
  };
}

export function evaluateHoldGrab(
  climber: ClimberState,
  limbId: LimbId,
  hold: Hold
): GrabEvaluation {
  if (hold.broken) {
    return {
      ok: false,
      reason: '该岩点已碎裂，无法抓握',
      geometricOk: false,
      mechanicalOk: false,
      estimatedLoad: 99,
    };
  }

  const isHand = limbId === 'leftHand' || limbId === 'rightHand';
  const isLeft = limbId === 'leftHand' || limbId === 'leftFoot';
  const anchoredOtherLimbs = (Object.keys(climber.limbs) as LimbId[]).filter(
    (id) => id !== limbId && climber.limbs[id].holdId !== null
  );

  for (const otherId of anchoredOtherLimbs) {
    if (climber.limbs[otherId].holdId === hold.id && hold.type !== 'ledge') {
      return {
        ok: false,
        reason: '该岩点已被另一肢体占用',
        geometricOk: false,
        mechanicalOk: false,
        estimatedLoad: 99,
      };
    }
  }

  if (isHand) {
    const otherHand = isLeft ? climber.limbs.rightHand : climber.limbs.leftHand;
    if (otherHand.holdId !== null) {
      if ((isLeft && hold.x > otherHand.pos.x + 14) || (!isLeft && hold.x < otherHand.pos.x - 14)) {
        return {
          ok: false,
          reason: '双手交叉拧转，超出关节自然活动范围',
          geometricOk: false,
          mechanicalOk: false,
          estimatedLoad: 99,
        };
      }
    }
  } else {
    const otherFoot = isLeft ? climber.limbs.rightFoot : climber.limbs.leftFoot;
    if (otherFoot.holdId !== null) {
      if ((isLeft && hold.x > otherFoot.pos.x + 12) || (!isLeft && hold.x < otherFoot.pos.x - 12)) {
        return {
          ok: false,
          reason: '双脚交叉别住，无法自然踩踏',
          geometricOk: false,
          mechanicalOk: false,
          estimatedLoad: 99,
        };
      }
    }
  }

  if (!isHoldReachable(climber, limbId, hold)) {
    return {
      ok: false,
      reason: '超出当前身体几何伸展极限',
      geometricOk: false,
      mechanicalOk: false,
      estimatedLoad: 99,
    };
  }

  // Mechanical feasibility checks
  const preview = predictReachPose(climber, limbId, hold);
  if (climber.stamina <= 2 && !climber.isResting) {
    return {
      ok: false,
      reason: '耐力已枯竭，指尖无法扣紧新岩点',
      geometricOk: true,
      mechanicalOk: false,
      estimatedLoad: preview.estimatedLoad,
    };
  }

  if (isHand && hold.gripKind === 'undercling') {
    const anchoredFeetCount = (['leftFoot', 'rightFoot'] as LimbId[]).filter(
      (id) => climber.limbs[id].holdId !== null
    ).length;
    if (anchoredFeetCount === 0) {
      return {
        ok: false,
        reason: '反扣岩点缺少双脚下压支撑，无法受力抓握',
        geometricOk: true,
        mechanicalOk: false,
        estimatedLoad: preview.estimatedLoad,
      };
    }
  }

  if (preview.estimatedLoad > 1.38) {
    const dirHint =
      hold.gripKind === 'sidepullLeft' || hold.gripKind === 'sidepullRight'
        ? '重心方向与侧拉点相反，力学失稳无法锁住'
        : '当前姿态负荷过大，力学条件不足以建立稳固接触';
    return {
      ok: false,
      reason: dirHint,
      geometricOk: true,
      mechanicalOk: false,
      estimatedLoad: preview.estimatedLoad,
    };
  }

  return {
    ok: true,
    reason: null,
    geometricOk: true,
    mechanicalOk: true,
    estimatedLoad: preview.estimatedLoad,
  };
}

export function isStandingOnSpringHold(
  climber: ClimberState,
  holdsMap: Map<string, Hold>
): boolean {
  for (const id of ['leftFoot', 'rightFoot'] as const) {
    const hid = climber.limbs[id].holdId;
    if (!hid) continue;
    const h = holdsMap.get(hid);
    if (h && !h.broken && h.type === 'spring') return true;
  }
  return false;
}

export function isDynoReachable(
  climber: ClimberState,
  limbId: LimbId,
  hold: Hold,
  extraRange = 0
): boolean {
  if (hold.broken) return false;
  if (limbId !== 'leftHand' && limbId !== 'rightHand') return false;
  const clampedExtra = Math.max(0, Math.min(18, extraRange));
  const minStamina = hold.type === 'swing' || clampedExtra > 0 ? 10 : 16;
  if (climber.stamina < minStamina) return false;
  if (isHoldReachable(climber, limbId, hold)) return false;

  // Need at least 2 limbs anchored including at least 1 foot to push off for a real dyno
  const anchoredIds = (Object.keys(climber.limbs) as LimbId[]).filter(
    (id) => climber.limbs[id].holdId !== null
  );
  if (anchoredIds.length < 2) return false;
  const hasFootPush =
    climber.limbs.leftFoot.holdId !== null || climber.limbs.rightFoot.holdId !== null;
  if (!hasFootPush) return false;

  // Prevent grabbing hold occupied by another limb unless wide ledge
  for (const otherId of Object.keys(climber.limbs) as LimbId[]) {
    if (otherId !== limbId && climber.limbs[otherId].holdId === hold.id && hold.type !== 'ledge') {
      return false;
    }
  }

  // Dyno leaps are controlled upward or diagonal-upward reaches with strict vertical cap
  const dyUp = climber.torsoPos.y - hold.y;
  const maxVerticalLeap = clampedExtra > 0 ? 128 : 112;
  if (dyUp < 18 || dyUp > maxVerticalLeap) return false;

  const isLeft = limbId === 'leftHand';
  const otherHand = isLeft ? climber.limbs.rightHand : climber.limbs.leftHand;
  if (otherHand.holdId !== null) {
    if (isLeft && hold.x > otherHand.pos.x + 22) return false;
    if (!isLeft && hold.x < otherHand.pos.x - 22) return false;
  }

  const shoulderOffsetX = (isLeft ? -SHOULDER_HALF_W : SHOULDER_HALF_W) + climber.leanBias * 12;
  const shoulder: Vec2 = {
    x: climber.torsoPos.x + shoulderOffsetX,
    y: climber.torsoPos.y - TORSO_HEIGHT * 0.48,
  };

  const swingBonus = hold.type === 'swing' ? 8 : 0;
  const maxDynoDist = Math.min(134, ARM_MAX_REACH + DYNO_EXTRA_REACH + 10 + clampedExtra + swingBonus);
  const d = dist(shoulder, hold);
  return d <= maxDynoDist;
}

export function pickBestLimbForHold(
  climber: ClimberState,
  hold: Hold,
  lockedLimb: LimbId | null
): LimbId {
  if (lockedLimb) return lockedLimb;

  const isAboveWaist = hold.y <= climber.torsoPos.y + 4;
  const candidates: LimbId[] = isAboveWaist
    ? ['leftHand', 'rightHand']
    : ['leftFoot', 'rightFoot'];

  let best: LimbId = candidates[0];
  let bestScore = -Infinity;

  for (const id of candidates) {
    const limb = climber.limbs[id];
    const reachable = isHoldReachable(climber, id, hold);
    const sideMatch =
      (limb.isLeft && hold.x <= climber.torsoPos.x + 12) ||
      (!limb.isLeft && hold.x >= climber.torsoPos.x - 12);

    let score = 0;
    if (reachable) score += 140;
    if (sideMatch) score += 28;
    if (limb.holdId === null) score += 45;
    score += (limb.pos.y - climber.torsoPos.y) * 0.35;
    score += limb.strain * 20;
    if (limb.holdId === hold.id) score -= 220;

    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  if (!isHoldReachable(climber, best, hold)) {
    const fallback: LimbId[] = isAboveWaist
      ? ['leftFoot', 'rightFoot']
      : ['leftHand', 'rightHand'];
    for (const id of fallback) {
      if (isHoldReachable(climber, id, hold) && climber.limbs[id].holdId !== hold.id) {
        return id;
      }
    }
  }

  return best;
}

export interface ReachPreviewPose {
  predictedTorso: Vec2;
  root: Vec2;
  joint: Vec2;
  end: Vec2;
  estimatedLoad: number;
  directionMismatch: boolean;
  highRisk: boolean;
}

export function computeGripDirectionMultiplier(
  hold: Hold,
  isHand: boolean,
  isLeft: boolean,
  leanBias: -1 | 0 | 1,
  footSupport: number,
  highFoot: boolean
): number {
  const kind = hold.gripKind ?? 'downpull';
  if (kind === 'downpull') return 1.0;

  if (!isHand) {
    // Feet smear/edge on directional holds with subtle stability variance
    return kind === 'undercling' ? 0.92 : 0.98;
  }

  if (kind === 'sidepullLeft') {
    // Opens left: leaning right (+1) pulls away cleanly; leaning left (-1) pushes off
    if (leanBias === 1) return 1.24;
    if (leanBias === -1) return 0.66;
    return isLeft ? 0.92 : 1.04;
  }

  if (kind === 'sidepullRight') {
    // Opens right: leaning left (-1) pulls away cleanly; leaning right (+1) pushes off
    if (leanBias === -1) return 1.24;
    if (leanBias === 1) return 0.66;
    return !isLeft ? 0.92 : 1.04;
  }

  // Undercling: requires high foot compression
  if (footSupport === 2 && highFoot) return 1.22;
  if (footSupport === 2) return 1.0;
  if (footSupport === 1) return 0.82;
  return 0.62;
}

export function predictReachPose(
  climber: ClimberState,
  limbId: LimbId,
  hold: Hold
): ReachPreviewPose {
  const isHand = limbId === 'leftHand' || limbId === 'rightHand';
  const isLeft = limbId === 'leftHand' || limbId === 'leftFoot';
  const pelvisX = climber.pelvisOffset?.x ?? climber.leanBias * 18;
  const pelvisY = climber.pelvisOffset?.y ?? 0;

  const predictedTorso: Vec2 = {
    x: climber.torsoPos.x * 0.62 + hold.x * 0.38 + pelvisX * 0.45,
    y: climber.torsoPos.y * 0.62 + (hold.y + (isHand ? 26 : -28)) * 0.38 + pelvisY * 0.35,
  };

  const root: Vec2 = {
    x: predictedTorso.x + (isLeft ? (isHand ? -SHOULDER_HALF_W : -HIP_HALF_W) : isHand ? SHOULDER_HALF_W : HIP_HALF_W),
    y: predictedTorso.y + (isHand ? -TORSO_HEIGHT * 0.48 : TORSO_HEIGHT * 0.46),
  };

  const len1 = isHand ? ARM_UPPER : LEG_UPPER;
  const len2 = isHand ? ARM_LOWER : LEG_LOWER;
  const solPos = solveTwoBoneIK(root, hold, len1, len2, 1);
  const solNeg = solveTwoBoneIK(root, hold, len1, len2, -1);
  const score = (j: Vec2) => {
    const outward = isLeft ? predictedTorso.x - j.x : j.x - predictedTorso.x;
    return isHand ? outward * 1.2 + j.y * 0.7 : outward * 1.4 - j.y * 0.5;
  };
  const solved = score(solPos.joint) >= score(solNeg.joint) ? solPos : solNeg;

  const anchoredFeet = (['leftFoot', 'rightFoot'] as LimbId[]).filter(
    (id) => id !== limbId && climber.limbs[id].holdId !== null
  );
  const footSupport = anchoredFeet.length + (isHand ? 0 : 1);
  const highestFootY =
    anchoredFeet.length > 0
      ? Math.min(...anchoredFeet.map((id) => climber.limbs[id].pos.y))
      : hold.y;
  const highFoot = highestFootY <= predictedTorso.y + 42;

  const dirMult = computeGripDirectionMultiplier(
    hold,
    isHand,
    isLeft,
    climber.leanBias,
    footSupport,
    highFoot
  );

  const d = dist(predictedTorso, hold);
  const stretchRatio = Math.max(0, (d - 44) / ((isHand ? 86 : 94) - 44));
  const baseLoad = (isHand ? (footSupport === 2 ? 0.24 : 0.56) : 0.22) + stretchRatio * 0.48;
  const effStab = hold.stability * (climber.chalk > 15 || hold.chalked ? 1.25 : 1.0) * dirMult;
  const estimatedLoad = baseLoad / Math.max(0.35, effStab);

  return {
    predictedTorso,
    root,
    joint: solved.joint,
    end: solved.end,
    estimatedLoad,
    directionMismatch: dirMult < 0.85,
    highRisk: estimatedLoad > 0.85 || hold.type === 'fragile' || (hold.type === 'ice' && climber.chalk <= 18),
  };
}

export function getReachableHoldIds(
  climber: ClimberState,
  holds: Hold[],
  lockedLimb: LimbId | null
): Set<string> {
  const set = new Set<string>();
  for (const h of holds) {
    if (h.broken) continue;
    if (Math.abs(h.x - climber.torsoPos.x) > 142 || Math.abs(h.y - climber.torsoPos.y) > 142) {
      continue;
    }
    const limb = pickBestLimbForHold(climber, h, lockedLimb);
    if (isHoldReachable(climber, limb, h)) {
      set.add(h.id);
    }
  }
  return set;
}

export type SlipCause =
  | 'fragile_break'
  | 'ice_unchalked'
  | 'wet_slip'
  | 'direction_mismatch'
  | 'stamina_exhausted'
  | 'overload'
  | 'tremor_shake';

export function updateClimberPhysics(
  climber: ClimberState,
  holdsMap: Map<string, Hold>,
  ledges: Ledge[],
  windForce: number,
  drainMultiplier: number,
  weather: { type: string; intensity: number; chalkDrainMult: number },
  dt: number,
  roadbookFlowBonus = 0,
  manualPelvisOverride = false
): {
  slippedLimb: LimbId | null;
  slipReason: SlipCause | null;
  slipHold: Hold | null;
  triggeredFall: boolean;
  reachedLedge: Ledge | null;
  dynoLanded: { limbId: LimbId; hold: Hold; slipped: boolean } | null;
  staminaSpentDelta: number;
  staminaRecoveredDelta: number;
  netStaminaRatePerSec: number;
  activeTremor?: { hold: Hold; intensity: number; isFoot: boolean } | null;
} {
  const limbIds: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
  const safeDt = Number.isFinite(dt) ? Math.max(0.001, Math.min(0.05, dt)) : 1 / 60;
  // Guard against any corrupted NaN/Infinity coordinates or velocity
  if (!Number.isFinite(climber.torsoPos.x) || !Number.isFinite(climber.torsoPos.y)) {
    climber.torsoPos = { x: 0, y: -42 };
  }
  if (!Number.isFinite(climber.torsoVel.x) || !Number.isFinite(climber.torsoVel.y)) {
    climber.torsoVel = { x: 0, y: 0 };
  }
  const clampVal = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const enterFallCleanly = () => {
    climber.isFalling = true;
    climber.isStemming = false;
    climber.isShakingOut = false;
    climber.dynoFlight = null;
    climber.pelvisOffset = { x: 0, y: 0 };
    climber.leanBias = 0;
    for (const id of limbIds) {
      const l = climber.limbs[id];
      l.holdId = null;
      l.isDragging = false;
      l.reachT = 1;
      l.jitter = { x: 0, y: 0 };
    }
    // Never carry upward or extreme sideways launch velocity into a fall
    climber.torsoVel.y = clampVal(climber.torsoVel.y, 0, 56);
    climber.torsoVel.x = clampVal(climber.torsoVel.x * 0.25, -28, 28);
  };

  const clampedFlow = Math.max(0, Math.min(1, roadbookFlowBonus));
  const comboBoost = Math.min(0.42, Math.max(0, (climber.flowCombo ?? 0) - 1) * 0.11);
  if (climber.swingBoostTimer && climber.swingBoostTimer > 0) {
    climber.swingBoostTimer = Math.max(0, climber.swingBoostTimer - safeDt);
  }

  // Controlled two-stage Dyno lunge arc (weighty deadpoint feel, never superhero rocketing)
  if (climber.dynoFlight && !climber.isFalling) {
    const flight = climber.dynoFlight;
    flight.t = Math.min(1, flight.t + safeDt / Math.max(0.18, flight.duration));
    const p = flight.t;
    const easeOut = 1 - Math.pow(1 - p, flight.isSpringLaunch ? 2.4 : 2.1);
    const arcLift = Math.sin(p * Math.PI) * (flight.isSpringLaunch ? 11 : 8);

    const prevX = climber.torsoPos.x;
    const prevY = climber.torsoPos.y;
    const targetTorsoX = flight.targetPos.x + (flight.limbId === 'leftHand' ? 14 : -14);
    const targetTorsoY = flight.targetPos.y + 32;
    climber.torsoPos.x = flight.startTorso.x + (targetTorsoX - flight.startTorso.x) * easeOut;
    climber.torsoPos.y = flight.startTorso.y + (targetTorsoY - flight.startTorso.y) * easeOut - arcLift;
    climber.torsoVel.x = clampVal((climber.torsoPos.x - prevX) / safeDt, -95, 95);
    climber.torsoVel.y = clampVal((climber.torsoPos.y - prevY) / safeDt, -95, 95);
    climber.leanAngle = Math.max(-0.42, Math.min(0.42, (targetTorsoX - flight.startTorso.x) * 0.007));

    // Reaching hand moves toward target while any unanchored limbs trail naturally
    for (const id of limbIds) {
      const limb = climber.limbs[id];
      if (id === flight.limbId) {
        limb.pos.x = limb.startPos.x + (flight.targetPos.x - limb.startPos.x) * Math.min(1, p * 1.15);
        limb.pos.y = limb.startPos.y + (flight.targetPos.y - limb.startPos.y) * Math.min(1, p * 1.15) - arcLift * 0.35;
      } else if (limb.holdId === null) {
        const rootX = climber.torsoPos.x + (limb.isLeft ? (limb.isHand ? -13 : -9) : limb.isHand ? 13 : 9);
        const rootY = climber.torsoPos.y + (limb.isHand ? -18 : 20);
        const trailX = rootX + (limb.isLeft ? -10 : 10);
        const trailY = rootY + (limb.isHand ? 26 : 42);
        limb.pos.x += (trailX - limb.pos.x) * Math.min(1, safeDt * 12);
        limb.pos.y += (trailY - limb.pos.y) * Math.min(1, safeDt * 12);
      }
    }

    if (flight.t >= 1) {
      climber.dynoFlight = null;
      // Deadpoint landing: nonlinear impact restitution absorbs flight momentum cleanly (zero overshoot)
      const landImpactSpd = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
      const landRestitution = computeNonlinearRestitution(landImpactSpd, 0, 0.24);
      climber.torsoVel.x = clampVal(climber.torsoVel.x * landRestitution, -26, 26);
      climber.torsoVel.y = 0;
      const targetHold = holdsMap.get(flight.holdId);
      if (!targetHold || targetHold.broken || flight.willSlip) {
        climber.limbs[flight.limbId].holdId = null;
        const postDynoAnchored = limbIds.filter((id) => climber.limbs[id].holdId !== null);
        const postDynoHands = postDynoAnchored.filter((id) => climber.limbs[id].isHand);
        const dynoTriggeredFall = postDynoAnchored.length < 2 || postDynoHands.length === 0;
        if (dynoTriggeredFall) {
          enterFallCleanly();
        }
        return {
          slippedLimb: flight.willSlip ? flight.limbId : null,
          slipReason: flight.willSlip ? (targetHold?.type === 'ice' ? 'ice_unchalked' : 'wet_slip') : null,
          slipHold: targetHold ?? null,
          triggeredFall: dynoTriggeredFall,
          reachedLedge: null,
          dynoLanded: targetHold ? { limbId: flight.limbId, hold: targetHold, slipped: flight.willSlip } : null,
          staminaSpentDelta: 0,
          staminaRecoveredDelta: 0,
          netStaminaRatePerSec: 0,
        };
      }
      const catchingLimb = climber.limbs[flight.limbId];
      catchingLimb.holdId = targetHold.id;
      catchingLimb.pos = { x: targetHold.x, y: targetHold.y };
      catchingLimb.targetPos = { x: targetHold.x, y: targetHold.y };
      catchingLimb.reachT = 1;
      catchingLimb.strain = Math.max(0, catchingLimb.strain - 0.16);

      // Subtle, strictly horizontal pendulum follow-through on swing hold catches (zero upward impulse)
      if (flight.isSwingCatch || targetHold.type === 'swing') {
        const swingDir = Math.sign(targetHold.x - flight.startTorso.x) || (catchingLimb.isLeft ? -1 : 1);
        climber.torsoVel.x = clampVal(climber.torsoVel.x + swingDir * 16, -42, 42);
      }

      return {
        slippedLimb: null,
        slipReason: null,
        slipHold: null,
        triggeredFall: false,
        reachedLedge: null,
        dynoLanded: { limbId: flight.limbId, hold: targetHold, slipped: false },
        staminaSpentDelta: 0,
        staminaRecoveredDelta: 0,
        netStaminaRatePerSec: 0,
      };
    }

    return {
      slippedLimb: null,
      slipReason: null,
      slipHold: null,
      triggeredFall: false,
      reachedLedge: null,
      dynoLanded: null,
      staminaSpentDelta: 0,
      staminaRecoveredDelta: 0,
      netStaminaRatePerSec: 0,
    };
  }

  // Deliberate, weighty reach interpolation (snappier when flowing along Roadbook or Dynamic Combo)
  const reachSpeed = 4.6 * (1 + clampedFlow * 0.42 + comboBoost + ((climber.swingBoostTimer ?? 0) > 0 ? 0.25 : 0));
  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (limb.isDragging) continue;
    if (limb.reachT < 1) {
      limb.reachT = Math.min(1, limb.reachT + safeDt * reachSpeed);
      const t = 1 - Math.pow(1 - limb.reachT, 3);
      limb.pos.x = limb.startPos.x + (limb.targetPos.x - limb.startPos.x) * t;
      limb.pos.y = limb.startPos.y + (limb.targetPos.y - limb.startPos.y) * t;
    } else if (limb.holdId) {
      const h = holdsMap.get(limb.holdId);
      if (!h || h.broken) {
        limb.holdId = null;
      } else {
        limb.pos.x = h.x;
        limb.pos.y = h.y;
      }
    }
  }

  let standingLedge: Ledge | null = null;
  for (const ledge of ledges) {
    const onX =
      climber.torsoPos.x >= ledge.x - ledge.width * 0.55 &&
      climber.torsoPos.x <= ledge.x + ledge.width * 0.55;
    const onY = Math.abs(climber.torsoPos.y - (ledge.y - 36)) < 38;
    if (onX && onY) {
      standingLedge = ledge;
      break;
    }
  }

  const anchored = limbIds.filter((id) => climber.limbs[id].holdId !== null);
  const anchoredHands = anchored.filter((id) => climber.limbs[id].isHand);
  const anchoredFeet = anchored.filter((id) => !climber.limbs[id].isHand);

  if (climber.isFalling) {
    climber.isStemming = false;
    climber.isShakingOut = false;
    return {
      slippedLimb: null,
      slipReason: null,
      slipHold: null,
      triggeredFall: false,
      reachedLedge: null,
      dynoLanded: null,
      staminaSpentDelta: 0,
      staminaRecoveredDelta: 0,
      netStaminaRatePerSec: 0,
    };
  }

  if ((anchored.length < 2 || anchoredHands.length === 0) && !standingLedge) {
    enterFallCleanly();
    return {
      slippedLimb: null,
      slipReason: null,
      slipHold: null,
      triggeredFall: true,
      reachedLedge: null,
      dynoLanded: null,
      staminaSpentDelta: 0,
      staminaRecoveredDelta: 0,
      netStaminaRatePerSec: 0,
    };
  }

  // Stemming stance detection (wide two-foot spread >= 34px gives stability & rest bonus)
  const isStemming =
    anchoredFeet.length === 2 &&
    Math.abs(climber.limbs.leftFoot.pos.x - climber.limbs.rightFoot.pos.x) >= 34;
  climber.isStemming = isStemming;

  // Shake-out detection: 1 hand deliberately released while at least 2 limbs (with feet) anchor
  const isShakingOut =
    !standingLedge &&
    anchoredHands.length === 1 &&
    anchoredFeet.length >= 1 &&
    anchored.length >= 3;
  climber.isShakingOut = isShakingOut;

  const getAnchoredPos = (id: LimbId): Vec2 => {
    const limb = climber.limbs[id];
    if (limb.isDragging && limb.holdId) {
      const h = holdsMap.get(limb.holdId);
      if (h && !h.broken) return { x: h.x, y: h.y };
    }
    return limb.pos;
  };

  let sumX = 0;
  let sumY = 0;
  let totalW = 0;

  // Biomechanically accurate hand hang offset:
  // Bent-arm posture (+26) only applies with 2 feet supporting; losing feet transitions into
  // straight-arm dead-hang (+58) so slipping a foot NEVER launches the climber upward!
  const handTargetOffsetY =
    anchoredFeet.length === 0 ? 58 : anchoredFeet.length === 1 ? 38 : 26;

  for (const id of anchored) {
    const limb = climber.limbs[id];
    const aPos = getAnchoredPos(id);
    const w = limb.isHand ? 1.05 : 0.95;
    const targetOffsetY = limb.isHand ? handTargetOffsetY : -28;
    const targetOffsetX = limb.isLeft ? 10 : -10;
    // Blend toward targetPos during reach so equilibrium shifts monotonically without mid-reach whiplash
    const anchorX = !limb.isDragging && limb.reachT < 1 ? aPos.x * 0.45 + limb.targetPos.x * 0.55 : aPos.x;
    const anchorY = !limb.isDragging && limb.reachT < 1 ? aPos.y * 0.45 + limb.targetPos.y * 0.55 : aPos.y;
    sumX += (anchorX + targetOffsetX) * w;
    sumY += (anchorY + targetOffsetY) * w;
    totalW += w;
  }

  // Support polygon span & dynamic velocity metrics (used by pendulum swing & load checks)
  const minSupportX =
    anchored.length > 0
      ? Math.min(...anchored.map((id) => getAnchoredPos(id).x))
      : climber.torsoPos.x;
  const maxSupportX =
    anchored.length > 0
      ? Math.max(...anchored.map((id) => getAnchoredPos(id).x))
      : climber.torsoPos.x;
  const supportCenterX = (minSupportX + maxSupportX) * 0.5;
  const overhangDistance =
    climber.torsoPos.x < minSupportX
      ? minSupportX - climber.torsoPos.x
      : climber.torsoPos.x > maxSupportX
        ? climber.torsoPos.x - maxSupportX
        : 0;

  if (totalW > 0) {
    // Smart Automatic Center-of-Mass Balancing (active whenever player isn't manually dragging waist)
    if (!manualPelvisOverride) {
      let smartTargetX = 0;
      let smartTargetY = 0;

      // 1. Automatically counter directional sidepull & undercling grips on anchored hands
      let sidepullVote = 0;
      let hasUndercling = false;
      for (const hid of anchoredHands) {
        const holdId = climber.limbs[hid].holdId;
        const h = holdId ? holdsMap.get(holdId) : undefined;
        if (!h) continue;
        if (h.gripKind === 'sidepullLeft') sidepullVote += 1;
        else if (h.gripKind === 'sidepullRight') sidepullVote -= 1;
        else if (h.gripKind === 'undercling') hasUndercling = true;
      }

      if (sidepullVote !== 0) {
        smartTargetX += Math.sign(sidepullVote) * 15;
      } else if (anchoredHands.length === 1 && anchoredFeet.length >= 1) {
        const handPos = getAnchoredPos(anchoredHands[0]);
        const footAvgX =
          anchoredFeet.reduce((s, id) => s + getAnchoredPos(id).x, 0) / anchoredFeet.length;
        smartTargetX += Math.max(-14, Math.min(14, (footAvgX - handPos.x) * 0.28));
      } else if (anchoredHands.length === 2 && anchoredFeet.length === 2) {
        const handDeltaY = getAnchoredPos('rightHand').y - getAnchoredPos('leftHand').y;
        if (Math.abs(handDeltaY) > 22) {
          smartTargetX += handDeltaY > 0 ? -9 : 9;
        }
      }

      // 2. Counter strong gusts slightly and tuck hips cleanly for underclings
      if (Math.abs(windForce) > 0.9) {
        smartTargetX += Math.max(-10, Math.min(10, -windForce * 5.2));
      }
      if (hasUndercling) {
        smartTargetY = 6;
      }

      const autoLerp = Math.min(1, safeDt * 3.8);
      climber.pelvisOffset = clampPelvisOffset({
        x: climber.pelvisOffset.x + (smartTargetX - climber.pelvisOffset.x) * autoLerp,
        y: climber.pelvisOffset.y + (smartTargetY - climber.pelvisOffset.y) * autoLerp,
      });
    }

    // Derive leanBias from actual effective CoM shift (used for left/right HUD text prompt & grip bonus)
    const effectiveComX =
      climber.pelvisOffset.x + (climber.torsoPos.x - supportCenterX) * 0.42;
    climber.leanBias = effectiveComX <= -9.5 ? -1 : effectiveComX >= 9.5 ? 1 : 0;

    const footSupportRatio = anchoredFeet.length / 2;
    const sag = 7 - footSupportRatio * 4.5;
    const pelvisX = climber.pelvisOffset?.x ?? climber.leanBias * 18;
    const pelvisY = climber.pelvisOffset?.y ?? 0;
    const eqX = sumX / totalW + clampVal(windForce * 3.0, -14, 14) + pelvisX;
    // Without foot support, equilibrium can never jump above current torso Y (prevents foot-slip upward catapult)
    const rawEqY = sumY / totalW + sag + pelvisY;
    const eqY = anchoredFeet.length === 0 ? Math.max(rawEqY, climber.torsoPos.y - 2) : rawEqY;

    // Sub-stepped, strictly overdamped spring-damper + balanced limb-tether projection
    // Guarantees monotonic grounded settling even during 20fps mobile frame hitches (zero bounce/catapult!)
    const subSteps = Math.max(1, Math.ceil(safeDt / 0.016));
    const stepDt = safeDt / subSteps;
    const stiffness = anchored.length >= 3 ? 24 : 15;
    const damping = anchored.length >= 3 ? 12.6 : 11.2; // zeta > 1.3 -> zero elastic overshoot or whip
    const gravitySagY = anchoredFeet.length === 0 ? 74 : anchoredFeet.length === 1 ? 28 : 0;
    const clampedWindAccel = clampVal(windForce * 22, -55, 55);
    const maxVx = anchored.length >= 3 ? 76 : 46;
    const minVy = anchoredFeet.length === 0 ? 0 : anchored.length >= 3 ? -56 : -24;
    const maxVy = anchored.length >= 3 ? 96 : 84;

    for (let step = 0; step < subSteps; step++) {
      const upwardExtraDamp = climber.torsoVel.y < 0 ? 1.55 : 1.0;
      const pendulumPullX = clampVal(
        (supportCenterX - climber.torsoPos.x) * (anchored.length === 2 ? 4.8 : 2.8),
        -95,
        95
      );

      const ax = clampVal(
        (eqX - climber.torsoPos.x) * stiffness +
          pendulumPullX -
          climber.torsoVel.x * damping +
          clampedWindAccel,
        -280,
        280
      );
      const ay = clampVal(
        (eqY - climber.torsoPos.y) * stiffness +
          gravitySagY -
          climber.torsoVel.y * damping * upwardExtraDamp,
        anchoredFeet.length === 0 ? -40 : -240,
        320
      );

      climber.torsoVel.x = clampVal(climber.torsoVel.x + ax * stepDt, -maxVx, maxVx);
      climber.torsoVel.y = clampVal(climber.torsoVel.y + ay * stepDt, minVy, maxVy);
      climber.torsoPos.x += climber.torsoVel.x * stepDt;
      climber.torsoPos.y += climber.torsoVel.y * stepDt;

      // Balanced simultaneous tether projection (aligned with isHoldReachable limits; skips mid-reach limbs)
      const curJoints = getShoulderAndHip(climber);
      let pullSumX = 0;
      let pullSumY = 0;
      let pullCount = 0;
      for (const id of anchored) {
        const limb = climber.limbs[id];
        if (!limb.isDragging && limb.reachT < 0.85) continue;
        const aPos = getAnchoredPos(id);
        const root =
          id === 'leftHand'
            ? curJoints.leftShoulder
            : id === 'rightHand'
              ? curJoints.rightShoulder
              : id === 'leftFoot'
                ? curJoints.leftHip
                : curJoints.rightHip;
        const dx = aPos.x - root.x;
        const dy = aPos.y - root.y;
        const d = Math.hypot(dx, dy);
        // Matches isHoldReachable (ARM+16..22, LEG+16..24) so valid grabs never fight the tether
        const maxTether = limb.isHand ? ARM_MAX_REACH + 18 : LEG_MAX_REACH + 20;
        if (d > maxTether && d > 0.001) {
          const pull = d - maxTether;
          pullSumX += (dx / d) * pull;
          pullSumY += (dy / d) * pull;
          pullCount++;
        }
      }

      if (pullCount > 0) {
        // Average pulls across all taut limbs with nonlinear penetration compression so erroneous
        // hold-contact errors never inject an elastic snap or ping-pong bounce
        const rawAvgX = pullSumX / pullCount;
        const rawAvgY = pullSumY / pullCount;
        const rawAvgLen = Math.hypot(rawAvgX, rawAvgY);
        const nonlinearGain = 0.6 / (1 + rawAvgLen * 0.045);
        const avgX = rawAvgX * nonlinearGain;
        const avgY = rawAvgY * nonlinearGain;
        const avgLen = Math.hypot(avgX, avgY);
        const maxStepCorr = 5.5;
        const scale = avgLen > maxStepCorr ? maxStepCorr / avgLen : 1;
        const corrX = avgX * scale;
        const corrY = avgY * scale;
        climber.torsoPos.x += corrX;
        climber.torsoPos.y += corrY;

        if (avgLen > 0.0001) {
          const nx = avgX / avgLen;
          const ny = avgY / avgLen;
          const vAlong = climber.torsoVel.x * nx + climber.torsoVel.y * ny;
          if (vAlong < 0) {
            // Outward collision against taut hold constraint: nonlinear restitution collapses to 0 at high speed
            const impactSpeed = -vAlong;
            const restitution = computeNonlinearRestitution(impactSpeed, rawAvgLen, 0.06);
            const cancelFactor = Math.min(1, 1 - restitution * 0.25);
            climber.torsoVel.x -= nx * vAlong * cancelFactor;
            climber.torsoVel.y -= ny * vAlong * cancelFactor;
          } else if (vAlong > 14) {
            // Inbound velocity from hold-contact recoil: nonlinearly damp excess inward speed
            const retainRatio = computeNonlinearRestitution(vAlong, rawAvgLen, 0.65);
            const excessIn = (vAlong - 14) * (1 - retainRatio);
            climber.torsoVel.x -= nx * excessIn;
            climber.torsoVel.y -= ny * excessIn;
          }
        }
      }
    }

    const handCenterX =
      anchoredHands.length > 0
        ? anchoredHands.reduce((s, id) => s + getAnchoredPos(id).x, 0) /
          anchoredHands.length
        : climber.torsoPos.x;
    const footCenterX =
      anchoredFeet.length > 0
        ? anchoredFeet.reduce((s, id) => s + getAnchoredPos(id).x, 0) /
          anchoredFeet.length
        : climber.torsoPos.x;

    const targetLean = Math.max(
      -0.44,
      Math.min(0.44, (handCenterX - footCenterX) * 0.008 + (pelvisX / 22) * 0.16)
    );
    climber.leanAngle += (targetLean - climber.leanAngle) * Math.min(1, safeDt * 6);

    const targetHipTwist = Math.max(
      -1,
      Math.min(1, pelvisX / 24 + (handCenterX - footCenterX) * 0.006)
    );
    climber.hipTwist += (targetHipTwist - climber.hipTwist) * Math.min(1, safeDt * 7);

    const targetWallHug = Math.max(
      0,
      Math.min(1, 0.55 - (pelvisY / 22) * 0.35 + (isStemming ? 0.25 : 0))
    );
    climber.wallHug += (targetWallHug - climber.wallHug) * Math.min(1, safeDt * 7);
  }

  const joints = getShoulderAndHip(climber);
  const nowSec = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (limb.isDragging) continue;
    if (limb.holdId === null && limb.reachT >= 1) {
      const root =
        id === 'leftHand'
          ? joints.leftShoulder
          : id === 'rightHand'
            ? joints.rightShoulder
            : id === 'leftFoot'
              ? joints.leftHip
              : joints.rightHip;
      const shakeSwing = isShakingOut && limb.isHand ? Math.sin(nowSec * 16) * 5.5 : 0;
      const dangleX = root.x + (limb.isLeft ? -8 : 8) + windForce * 5 + shakeSwing;
      const dangleY = root.y + (limb.isHand ? 34 : 46);
      limb.pos.x += (dangleX - limb.pos.x) * Math.min(1, safeDt * 10);
      limb.pos.y += (dangleY - limb.pos.y) * Math.min(1, safeDt * 10);
    }
  }

  const footSupport = anchoredFeet.length;
  const handSupport = anchoredHands.length;
  const highestFootY =
    anchoredFeet.length > 0
      ? Math.min(...anchoredFeet.map((id) => climber.limbs[id].pos.y))
      : climber.torsoPos.y + 60;
  const highFoot = highestFootY <= climber.torsoPos.y + 42;

  let totalDrainPerSec = 0;
  let slippedLimb: LimbId | null = null;
  let slipReason: SlipCause | null = null;
  let slipHold: Hold | null = null;
  let touchingWetHold = false;
  let touchingDecoyHold = false;
  let activeTremor: { hold: Hold; intensity: number; isFoot: boolean } | null = null;

  const occupiedHoldIds = new Set<string>();
  for (const id of limbIds) {
    const hid = climber.limbs[id].holdId;
    if (hid) occupiedHoldIds.add(hid);
  }
  holdsMap.forEach((h) => {
    if (h.type === 'tremor' && !occupiedHoldIds.has(h.id) && (h.tremorEnergy ?? 0) > 0) {
      h.tremorEnergy = Math.max(0, (h.tremorEnergy ?? 0) - dt * 0.95);
    }
  });

  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (!limb.holdId) {
      limb.load = 0;
      const recoveryRate = isShakingOut && limb.isHand ? 1.15 : 0.45;
      limb.strain = Math.max(0, limb.strain - dt * recoveryRate);
      limb.jitter = { x: 0, y: 0 };
      continue;
    }

    const hold = holdsMap.get(limb.holdId);
    if (!hold) continue;

    if (hold.wet) touchingWetHold = true;
    if (hold.isDecoy) touchingDecoyHold = true;

    if (
      hold.chalked &&
      ((weather.type === 'rain' && Math.random() < dt * 0.1 * weather.intensity) ||
        (hold.wet && Math.random() < dt * 0.08))
    ) {
      hold.chalked = false;
    }

    const d = dist(climber.torsoPos, getAnchoredPos(id));
    const maxComfort = limb.isHand ? 86 : 94;
    const stretchRatio = Math.max(0, (d - 44) / (maxComfort - 44));

    let baseLoad = limb.isHand
      ? footSupport === 2
        ? isStemming
          ? 0.15
          : 0.22
        : footSupport === 1
          ? 0.52
          : 0.9
      : handSupport === 0
        ? 0.8
        : 0.2;

    if (anchored.length === 2) baseLoad *= 1.3;
    const bodySpeed = Math.hypot(climber.torsoVel.x, climber.torsoVel.y);
    const dynamicShock = Math.min(0.42, bodySpeed * 0.002 + overhangDistance * 0.011);
    baseLoad += stretchRatio * 0.48 + dynamicShock * (limb.isHand ? 1.0 : 0.65);

    if (limb.isHand && (climber.leanBias !== 0 || Math.abs(climber.pelvisOffset?.x ?? 0) > 6)) {
      const biasDir = climber.leanBias !== 0 ? climber.leanBias : Math.sign(climber.pelvisOffset.x);
      const sameSide = (limb.isLeft && biasDir < 0) || (!limb.isLeft && biasDir > 0);
      baseLoad *= sameSide ? 1.06 : 0.84;
    }

    // Tucking hips close to the wall transfers vertical load from fingers onto feet
    if (limb.isHand && footSupport > 0) {
      const wallHugMult = 1 - ((climber.wallHug ?? 0.5) - 0.5) * 0.16;
      baseLoad *= wallHugMult;
    }

    if (hold.isDecoy) {
      baseLoad *= 1.15;
    }

    // Tremor Hold Resonance: builds vibration energy while stepped on or gripped, adding tactile tension
    let tremorJitterBonus = 0;
    if (hold.type === 'tremor' && !standingLedge) {
      const rampRate = limb.isHand ? 0.36 : 0.56;
      const nextEnergy = Math.min(1, (hold.tremorEnergy ?? 0) + dt * rampRate);
      hold.tremorEnergy = nextEnergy;
      baseLoad *= 1 + nextEnergy * 0.34;
      tremorJitterBonus = 1.4 + nextEnergy * 3.1;

      // Subtle tactile micro-jolt transmitted through body at higher tremor resonance (strictly absorbed vertically)
      if (nextEnergy > 0.38) {
        const joltStrength = (nextEnergy - 0.32) * (limb.isHand ? 12 : 16);
        climber.torsoVel.x = clampVal(
          climber.torsoVel.x + (Math.random() - 0.5) * joltStrength * safeDt * 3.2,
          -38,
          38
        );
        // Never inject abnormal upward or downward catapult spikes from tremor resonance
        climber.torsoVel.y = clampVal(climber.torsoVel.y, -12, 28);
      }

      if (!activeTremor || nextEnergy > activeTremor.intensity || (!limb.isHand && !activeTremor.isFoot)) {
        activeTremor = { hold, intensity: nextEnergy, isFoot: !limb.isHand };
      }

      // Prolonged stay at peak resonance can shake the limb loose (torsoVel.y absorbed by physics constraints)
      if (!slippedLimb && nextEnergy >= 0.94 && limb.strain >= 0.56) {
        hold.tremorEnergy = 0.35;
        limb.holdId = null;
        limb.strain = Math.min(0.58, limb.strain);
        slippedLimb = id;
        slipReason = 'tremor_shake';
        slipHold = hold;
        // Absorb any vertical velocity spike cleanly; let overdamped sag/gravity take over smoothly
        climber.torsoVel.y = clampVal(climber.torsoVel.y, 0, 24);
        const lateralShift = (limb.isLeft ? 6 : -6) * (1 - computeNonlinearRestitution(bodySpeed, 0, 0.5));
        climber.torsoVel.x = clampVal(climber.torsoVel.x + lateralShift, -28, 28);
      }
    }

    const dirMult = computeGripDirectionMultiplier(
      hold,
      limb.isHand,
      limb.isLeft,
      climber.leanBias,
      footSupport,
      highFoot
    );

    const chalkBonus = climber.chalk > 15 || hold.chalked ? 1.32 : 1.0;
    const rainPenalty =
      weather.type === 'rain' && climber.chalk <= 15 && !hold.chalked
        ? 1 - 0.16 * weather.intensity
        : 1.0;
    const wetHoldPenalty = hold.wet && !hold.chalked && climber.chalk <= 22 ? 0.82 : 1.0;

    const effectiveStability =
      (hold.type === 'ice'
        ? hold.stability * (hold.chalked || climber.chalk > 25 ? 1.48 : 0.82)
        : hold.stability * chalkBonus) *
      rainPenalty *
      wetHoldPenalty *
      dirMult;

    limb.load = Math.min(1.48, baseLoad / Math.max(0.32, effectiveStability));

    if (hold.type === 'fragile' && limb.load > 0.48 && !standingLedge) {
      const decoyCrackBoost = hold.isDecoy ? 1.2 : 1.0;
      hold.crackProgress += dt * (0.16 + limb.load * 0.14) * decoyCrackBoost;
      if (hold.crackProgress >= 1) {
        hold.broken = true;
        limb.holdId = null;
        slippedLimb = id;
        slipReason = 'fragile_break';
        slipHold = hold;
        // Absorb vertical velocity spike completely on fragile hold break
        climber.torsoVel.y = clampVal(climber.torsoVel.y, 0, 24);
        climber.torsoVel.x = clampVal(climber.torsoVel.x, -28, 28);
      }
    }

    if (limb.load > 0.76 && !standingLedge) {
      limb.strain = Math.min(1, limb.strain + dt * (limb.load - 0.65) * 0.36);
    } else if (hold.type === 'tremor' && (hold.tremorEnergy ?? 0) > 0.42 && !standingLedge) {
      limb.strain = Math.min(1, limb.strain + dt * ((hold.tremorEnergy ?? 0) - 0.32) * 0.34);
    } else {
      const flowStrainEase = clampedFlow > 0 && !hold.isDecoy ? 1 + clampedFlow * 0.22 : 1;
      limb.strain = Math.max(0, limb.strain - dt * (isStemming ? 0.52 : 0.35) * flowStrainEase);
    }

    const shakeIntensity =
      Math.max(
        climber.stamina < 25 || limb.strain > 0.58
          ? Math.max(limb.strain, (25 - climber.stamina) / 25) * 2.4
          : 0,
        tremorJitterBonus
      );
    limb.jitter = {
      x: (Math.random() - 0.5) * shakeIntensity,
      y: (Math.random() - 0.5) * shakeIntensity,
    };

    if (!standingLedge) {
      totalDrainPerSec += limb.load * 2.1;
    }
  }

  if (clampedFlow > 0 && !touchingDecoyHold) {
    totalDrainPerSec *= 1 - clampedFlow * 0.16;
  }

  if (!standingLedge && anchoredHands.length > 0) {
    const wetChalkMult = touchingWetHold ? 1.35 : 1.0;
    climber.chalk = Math.max(0, climber.chalk - dt * 0.72 * weather.chalkDrainMult * wetChalkMult);
  }

  const staminaBefore = climber.stamina;
  let netStaminaRatePerSec = 0;

  if (standingLedge) {
    climber.isResting = true;
    const ledgeRegen = 32;
    climber.stamina = Math.min(climber.maxStamina, climber.stamina + dt * ledgeRegen);
    netStaminaRatePerSec = staminaBefore < climber.maxStamina ? ledgeRegen : 0;
    climber.health = Math.min(100, climber.health + dt * 10);
    for (const id of limbIds) {
      climber.limbs[id].strain = Math.max(0, climber.limbs[id].strain - dt * 1.0);
    }
  } else {
    climber.isResting = false;
    const balancedStance =
      (anchored.length >= 3 && footSupport === 2 && totalDrainPerSec < 2.6) ||
      (isStemming && anchored.length >= 3 && totalDrainPerSec < 3.1) ||
      (isShakingOut && footSupport === 2 && totalDrainPerSec < 2.8);
    if (balancedStance) {
      const regen =
        ((isStemming ? 4.4 : 3.0) + (isShakingOut ? 2.4 : 0)) *
        (clampedFlow > 0 && !touchingDecoyHold ? 1 + clampedFlow * 0.18 : 1);
      climber.stamina = Math.min(climber.maxStamina, climber.stamina + dt * regen);
      netStaminaRatePerSec = staminaBefore < climber.maxStamina ? regen : 0;
    } else {
      const netDrain = Math.max(0, totalDrainPerSec - 1.35) * drainMultiplier;
      climber.stamina = Math.max(0, climber.stamina - netDrain * dt);
      netStaminaRatePerSec = netDrain > 0.05 && staminaBefore > 0 ? -netDrain : 0;
    }
  }

  const staminaSpentDelta = Math.max(0, staminaBefore - climber.stamina);
  const staminaRecoveredDelta = Math.max(0, climber.stamina - staminaBefore);

  if (climber.stamina <= 0 && !standingLedge) {
    let worstLimb: LimbId | null = null;
    let worstScore = -1;
    for (const id of anchored) {
      const l = climber.limbs[id];
      const s = l.load + (l.isHand ? 0.5 : 0);
      if (s > worstScore) {
        worstScore = s;
        worstLimb = id;
      }
    }
    if (worstLimb) {
      const h = climber.limbs[worstLimb].holdId
        ? holdsMap.get(climber.limbs[worstLimb].holdId!) ?? null
        : null;
      climber.limbs[worstLimb].holdId = null;
      slippedLimb = worstLimb;
      slipHold = h;
      if (h?.type === 'ice' && climber.chalk <= 22 && !h.chalked) {
        slipReason = 'ice_unchalked';
      } else if (h?.wet && climber.chalk <= 22 && !h.chalked) {
        slipReason = 'wet_slip';
      } else if (
        h &&
        computeGripDirectionMultiplier(
          h,
          climber.limbs[worstLimb].isHand,
          climber.limbs[worstLimb].isLeft,
          climber.leanBias,
          footSupport,
          highFoot
        ) < 0.8
      ) {
        slipReason = 'direction_mismatch';
      } else {
        slipReason = 'stamina_exhausted';
      }
      climber.stamina = 18;
      // Absorb vertical velocity spike completely on exhaustion detach
      climber.torsoVel.y = clampVal(climber.torsoVel.y, 0, 24);
      climber.torsoVel.x = clampVal(climber.torsoVel.x, -28, 28);
    }
  } else if (!slippedLimb && !standingLedge) {
    // Contact overload slip when load & muscle strain exceed threshold under imbalanced stance
    let overloadedLimb: LimbId | null = null;
    let highestExcess = 0;
    for (const id of anchored) {
      const l = climber.limbs[id];
      const h = l.holdId ? holdsMap.get(l.holdId) ?? null : null;
      const dirMismatch =
        h !== null &&
        computeGripDirectionMultiplier(
          h,
          l.isHand,
          l.isLeft,
          climber.leanBias,
          footSupport,
          highFoot
        ) < 0.78;
      const criticalOverload = l.load >= 1.3 && l.strain >= 0.88;
      const mismatchSlip = dirMismatch && l.load >= 1.02 && l.strain >= 0.72;
      if (criticalOverload || mismatchSlip) {
        const excess = l.load + l.strain;
        if (excess > highestExcess) {
          highestExcess = excess;
          overloadedLimb = id;
        }
      }
    }

    if (overloadedLimb) {
      const l = climber.limbs[overloadedLimb];
      const h = l.holdId ? holdsMap.get(l.holdId) ?? null : null;
      l.holdId = null;
      l.strain = Math.min(0.65, l.strain);
      slippedLimb = overloadedLimb;
      slipHold = h;
      if (h?.type === 'ice' && climber.chalk <= 22 && !h.chalked) {
        slipReason = 'ice_unchalked';
      } else if (h?.wet && climber.chalk <= 22 && !h.chalked) {
        slipReason = 'wet_slip';
      } else if (
        h &&
        computeGripDirectionMultiplier(
          h,
          l.isHand,
          l.isLeft,
          climber.leanBias,
          footSupport,
          highFoot
        ) < 0.8
      ) {
        slipReason = 'direction_mismatch';
      } else {
        slipReason = 'overload';
      }
      // Absorb vertical impulse completely on overload slip so physics constraints govern sag smoothly
      climber.torsoVel.y = clampVal(climber.torsoVel.y, 0, 26);
      climber.torsoVel.x = clampVal(climber.torsoVel.x + (l.isLeft ? 6 : -6), -28, 28);
    }
  }

  const remainingAnchored = limbIds.filter((id) => climber.limbs[id].holdId !== null);
  const remainingHands = remainingAnchored.filter((id) => climber.limbs[id].isHand);
  const triggeredFall = (remainingAnchored.length < 2 || remainingHands.length === 0) && !standingLedge;
  if (triggeredFall) {
    enterFallCleanly();
  }

  return {
    slippedLimb,
    slipReason,
    slipHold,
    triggeredFall,
    reachedLedge: standingLedge,
    dynoLanded: null,
    staminaSpentDelta,
    staminaRecoveredDelta,
    netStaminaRatePerSec,
    activeTremor,
  };
}
