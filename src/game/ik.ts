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

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  const maxD = len1 + len2 - 0.5;
  const minD = Math.abs(len1 - len2) + 0.5;
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

  const end: Vec2 =
    rawDist > maxD
      ? {
          x: root.x + (dx / (rawDist || 1)) * maxD,
          y: root.y + (dy / (rawDist || 1)) * maxD,
        }
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
  const cos = Math.cos(leanAngle);
  const sin = Math.sin(leanAngle);

  const rotate = (lx: number, ly: number): Vec2 => ({
    x: torsoPos.x + lx * cos - ly * sin,
    y: torsoPos.y + lx * sin + ly * cos,
  });

  return {
    leftShoulder: rotate(-SHOULDER_HALF_W, -TORSO_HEIGHT * 0.48),
    rightShoulder: rotate(SHOULDER_HALF_W, -TORSO_HEIGHT * 0.48),
    leftHip: rotate(-HIP_HALF_W, TORSO_HEIGHT * 0.46),
    rightHip: rotate(HIP_HALF_W, TORSO_HEIGHT * 0.46),
  };
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

  // Predict torso equilibrium shift toward the new hold
  const predictedTorso: Vec2 = {
    x: climber.torsoPos.x * 0.62 + hold.x * 0.38,
    y: climber.torsoPos.y * 0.62 + (hold.y + (isHand ? 26 : -28)) * 0.38,
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

export function getReachableHoldIds(
  climber: ClimberState,
  holds: Hold[],
  lockedLimb: LimbId | null
): Set<string> {
  const set = new Set<string>();
  for (const h of holds) {
    if (h.broken) continue;
    // Quick bounding cull
    if (Math.abs(h.x - climber.torsoPos.x) > 130 || Math.abs(h.y - climber.torsoPos.y) > 135) {
      continue;
    }
    const limb = pickBestLimbForHold(climber, h, lockedLimb);
    if (isHoldReachable(climber, limb, h)) {
      set.add(h.id);
    }
  }
  return set;
}

export function updateClimberPhysics(
  climber: ClimberState,
  holdsMap: Map<string, Hold>,
  ledges: Ledge[],
  windForce: number,
  drainMultiplier: number,
  weather: { type: string; intensity: number; chalkDrainMult: number },
  dt: number
): {
  slippedLimb: LimbId | null;
  triggeredFall: boolean;
  reachedLedge: Ledge | null;
} {
  const limbIds: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];

  // Deliberate, weighty reach interpolation
  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (limb.reachT < 1) {
      limb.reachT = Math.min(1, limb.reachT + dt * 4.4);
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
    return {
      slippedLimb: null,
      triggeredFall: false,
      reachedLedge: null,
    };
  }

  if (anchored.length < 2 && !standingLedge) {
    climber.isFalling = true;
    return {
      slippedLimb: null,
      triggeredFall: true,
      reachedLedge: null,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let totalW = 0;

  for (const id of anchored) {
    const limb = climber.limbs[id];
    const w = limb.isHand ? 1.05 : 0.95;
    const targetOffsetY = limb.isHand ? 26 : -28;
    const targetOffsetX = limb.isLeft ? 10 : -10;
    sumX += (limb.pos.x + targetOffsetX) * w;
    sumY += (limb.pos.y + targetOffsetY) * w;
    totalW += w;
  }

  if (totalW > 0) {
    const footSupportRatio = anchoredFeet.length / 2;
    const sag = 7 - footSupportRatio * 4.5;
    const eqX = sumX / totalW + windForce * 3.5;
    const eqY = sumY / totalW + sag;

    const spring = 6.5;
    climber.torsoPos.x += (eqX - climber.torsoPos.x) * Math.min(1, dt * spring);
    climber.torsoPos.y += (eqY - climber.torsoPos.y) * Math.min(1, dt * spring);

    const handCenterX =
      anchoredHands.length > 0
        ? anchoredHands.reduce((s, id) => s + climber.limbs[id].pos.x, 0) /
          anchoredHands.length
        : climber.torsoPos.x;
    const footCenterX =
      anchoredFeet.length > 0
        ? anchoredFeet.reduce((s, id) => s + climber.limbs[id].pos.x, 0) /
          anchoredFeet.length
        : climber.torsoPos.x;

    const targetLean = Math.max(-0.4, Math.min(0.4, (handCenterX - footCenterX) * 0.008));
    climber.leanAngle += (targetLean - climber.leanAngle) * Math.min(1, dt * 6);
  }

  const joints = getShoulderAndHip(climber);
  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (limb.holdId === null && limb.reachT >= 1) {
      const root =
        id === 'leftHand'
          ? joints.leftShoulder
          : id === 'rightHand'
            ? joints.rightShoulder
            : id === 'leftFoot'
              ? joints.leftHip
              : joints.rightHip;
      const dangleX = root.x + (limb.isLeft ? -8 : 8) + windForce * 5;
      const dangleY = root.y + (limb.isHand ? 34 : 46);
      limb.pos.x += (dangleX - limb.pos.x) * Math.min(1, dt * 8);
      limb.pos.y += (dangleY - limb.pos.y) * Math.min(1, dt * 8);
    }
  }

  const footSupport = anchoredFeet.length;
  const handSupport = anchoredHands.length;
  let totalDrainPerSec = 0;
  let slippedLimb: LimbId | null = null;

  for (const id of limbIds) {
    const limb = climber.limbs[id];
    if (!limb.holdId) {
      limb.load = 0;
      limb.strain = Math.max(0, limb.strain - dt * 0.45);
      limb.jitter = { x: 0, y: 0 };
      continue;
    }

    const hold = holdsMap.get(limb.holdId);
    if (!hold) continue;

    // Rain gradually washes chalk off active holds
    if (weather.type === 'rain' && hold.chalked && Math.random() < dt * 0.1 * weather.intensity) {
      hold.chalked = false;
    }

    const d = dist(climber.torsoPos, limb.pos);
    const maxComfort = limb.isHand ? 86 : 94;
    const stretchRatio = Math.max(0, (d - 44) / (maxComfort - 44));

    let baseLoad = limb.isHand
      ? footSupport === 2
        ? 0.22
        : footSupport === 1
          ? 0.52
          : 0.9
      : handSupport === 0
        ? 0.8
        : 0.2;

    if (anchored.length === 2) baseLoad *= 1.3;
    baseLoad += stretchRatio * 0.48;

    const chalkBonus = climber.chalk > 15 || hold.chalked ? 1.32 : 1.0;
    const wetPenalty =
      weather.type === 'rain' && climber.chalk <= 15 && !hold.chalked
        ? 1 - 0.16 * weather.intensity
        : 1.0;

    const effectiveStability =
      (hold.type === 'ice'
        ? hold.stability * (hold.chalked || climber.chalk > 25 ? 1.48 : 0.82)
        : hold.stability * chalkBonus) * wetPenalty;

    limb.load = Math.min(1.45, baseLoad / Math.max(0.35, effectiveStability));

    if (hold.type === 'fragile' && limb.load > 0.48 && !standingLedge) {
      hold.crackProgress += dt * (0.16 + limb.load * 0.14);
      if (hold.crackProgress >= 1) {
        hold.broken = true;
        limb.holdId = null;
        slippedLimb = id;
      }
    }

    if (limb.load > 0.76 && !standingLedge) {
      limb.strain = Math.min(1, limb.strain + dt * (limb.load - 0.65) * 0.36);
    } else {
      limb.strain = Math.max(0, limb.strain - dt * 0.35);
    }

    const shakeIntensity =
      climber.stamina < 25 || limb.strain > 0.58
        ? Math.max(limb.strain, (25 - climber.stamina) / 25) * 2.4
        : 0;
    limb.jitter = {
      x: (Math.random() - 0.5) * shakeIntensity,
      y: (Math.random() - 0.5) * shakeIntensity,
    };

    if (!standingLedge) {
      totalDrainPerSec += limb.load * 2.1;
    }
  }

  // Weather-accelerated chalk consumption
  if (!standingLedge && anchoredHands.length > 0) {
    climber.chalk = Math.max(0, climber.chalk - dt * 0.72 * weather.chalkDrainMult);
  }

  // Calm, deliberate stamina balance for thoughtful route-reading:
  if (standingLedge) {
    climber.isResting = true;
    climber.stamina = Math.min(climber.maxStamina, climber.stamina + dt * 32);
    climber.health = Math.min(100, climber.health + dt * 10);
    for (const id of limbIds) {
      climber.limbs[id].strain = Math.max(0, climber.limbs[id].strain - dt * 1.0);
    }
  } else {
    climber.isResting = false;
    const balancedStance = anchored.length >= 3 && footSupport === 2 && totalDrainPerSec < 2.6;
    if (balancedStance) {
      climber.stamina = Math.min(climber.maxStamina, climber.stamina + dt * 3.0);
    } else {
      const netDrain = Math.max(0, totalDrainPerSec - 1.35) * drainMultiplier;
      climber.stamina = Math.max(0, climber.stamina - netDrain * dt);
    }
  }

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
      climber.limbs[worstLimb].holdId = null;
      slippedLimb = worstLimb;
      climber.stamina = 18;
    }
  }

  const remainingAnchored = limbIds.filter((id) => climber.limbs[id].holdId !== null);
  const triggeredFall = remainingAnchored.length < 2 && !standingLedge;
  if (triggeredFall) {
    climber.isFalling = true;
  }

  return {
    slippedLimb,
    triggeredFall,
    reachedLedge: standingLedge,
  };
}
