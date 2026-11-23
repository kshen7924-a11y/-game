/**
 * Natural Summit Choreography & Continuous Optical Camera Pull-Back Engine
 *
 * Provides:
 * 1. Physically grounded 4-beat alpine topping-out kinematics with strict anatomical limb-length
 *    enforcement on every frame (zero teleportation, zero rubber-limb stretching or deformation):
 *    Mantle & Top-Out -> Stand Up & Catch Breath -> Curved-Arc Triumph -> 「驻足俯瞰」Overlook Vigil.
 * 2. A shared optical camera solver that locks the live 2.5D world summit peak and the wideEnding
 *    panorama's (wideFocalX, wideFocalY) onto the exact same screen pixel with identical logarithmic
 *    zoom-out velocity.
 */

import { ARM_MAX_REACH, LEG_MAX_REACH } from '../game/ik';
import type { ClimberState, Vec2 } from '../game/types';
import type { DecodedArtPack } from './artPackAssets';

// Strict anatomical reach ceilings during summit animation (well inside nominalMax so IK never stretches bones)
const SUMMIT_ARM_MIN = 16;
const SUMMIT_ARM_MAX = ARM_MAX_REACH * 0.91; // ~52.8px (nominal 58px)
const SUMMIT_LEG_MIN = 18;
const SUMMIT_LEG_MAX = LEG_MAX_REACH * 0.915; // ~60.4px (nominal 66px)

export interface SummitPoseSnapshot {
  torsoPos: Vec2;
  leanAngle: number;
  lookAngle: number;
  hipTwist: number;
  wallHug: number;
  pelvisOffset: Vec2;
  leftHand: Vec2;
  rightHand: Vec2;
  leftFoot: Vec2;
  rightFoot: Vec2;
  mantleStepFxDone: boolean;
  standBreathFxDone: boolean;
  triumphSparkFxDone: boolean;
}

export interface SummitChoreographyCallbacks {
  onMantleFootPlant?: (x: number, y: number) => void;
  onStandBreath?: () => void;
  onTriumphPeak?: (x: number, y: number) => void;
}

export interface WideRestingGeometry {
  baseDrawW: number;
  baseDrawH: number;
  restX: number;
  restY: number;
  restPeakScreenX: number;
  restPeakScreenY: number;
}

export interface SummitOpticalTargets {
  targetX: number;
  targetY: number;
  targetZoom: number;
  crestZoom: number;
  finalPanoramicZoom: number;
  pullRatio: number;
  pullU: number;
  restGeo: WideRestingGeometry;
}

export function summitSmootherstep(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * u * (u * (u * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function quadBezierVec(p0: Vec2, ctrl: Vec2, p1: Vec2, t: number): Vec2 {
  const inv = 1 - t;
  return {
    x: inv * inv * p0.x + 2 * inv * t * ctrl.x + t * t * p1.x,
    y: inv * inv * p0.y + 2 * inv * t * ctrl.y + t * t * p1.y,
  };
}

/**
 * Mirrors renderer.ts exact shoulder/hip socket coordinates in world space so anatomical
 * reach clamping matches the rendered skeleton 1:1.
 */
function computeRenderedSockets(
  torsoPos: Vec2,
  leanAngle: number,
  hipTwist: number
): {
  leftShoulder: Vec2;
  rightShoulder: Vec2;
  leftHip: Vec2;
  rightHip: Vec2;
} {
  const cos = Math.cos(leanAngle);
  const sin = Math.sin(leanAngle);
  const sTwist = 1 - Math.abs(hipTwist) * 0.14;
  const hTwist = 1 - Math.abs(hipTwist) * 0.22;
  const toWorld = (lx: number, ly: number): Vec2 => ({
    x: torsoPos.x + lx * cos - ly * sin,
    y: torsoPos.y + lx * sin + ly * cos,
  });

  const shoulderHalfX = 11.2 * sTwist;
  const hipHalfX = 8.1 * hTwist;

  return {
    leftShoulder: toWorld(-shoulderHalfX, -17.5 - hipTwist * 1.1),
    rightShoulder: toWorld(shoulderHalfX, -17.5 + hipTwist * 1.1),
    leftHip: toWorld(-hipHalfX, 15.5 - hipTwist * 1.6),
    rightHip: toWorld(hipHalfX, 15.5 + hipTwist * 1.6),
  };
}

function clampToReach(socket: Vec2, target: Vec2, minLen: number, maxLen: number): Vec2 {
  const dx = target.x - socket.x;
  const dy = target.y - socket.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) {
    return { x: socket.x, y: socket.y + minLen };
  }
  if (d > maxLen) {
    const scale = maxLen / d;
    return { x: socket.x + dx * scale, y: socket.y + dy * scale };
  }
  if (d < minLen) {
    const scale = minLen / d;
    return { x: socket.x + dx * scale, y: socket.y + dy * scale };
  }
  return target;
}

/**
 * Captures the climber's exact live pose on the millisecond the summit hold is reached
 * so the topping-out choreography begins with zero teleportation (and clamps any pre-existing
 * extreme climb stretch gently inside anatomical limits).
 */
export function captureSummitPoseSnapshot(climber: ClimberState): SummitPoseSnapshot {
  const sockets = computeRenderedSockets(
    climber.torsoPos,
    climber.leanAngle,
    climber.hipTwist ?? 0
  );
  return {
    torsoPos: { x: climber.torsoPos.x, y: climber.torsoPos.y },
    leanAngle: climber.leanAngle,
    lookAngle: climber.lookAngle,
    hipTwist: climber.hipTwist ?? 0,
    wallHug: climber.wallHug ?? 0.35,
    pelvisOffset: { x: climber.pelvisOffset.x, y: climber.pelvisOffset.y },
    leftHand: clampToReach(sockets.leftShoulder, climber.limbs.leftHand.pos, SUMMIT_ARM_MIN, SUMMIT_ARM_MAX),
    rightHand: clampToReach(sockets.rightShoulder, climber.limbs.rightHand.pos, SUMMIT_ARM_MIN, SUMMIT_ARM_MAX),
    leftFoot: clampToReach(sockets.leftHip, climber.limbs.leftFoot.pos, SUMMIT_LEG_MIN, SUMMIT_LEG_MAX),
    rightFoot: clampToReach(sockets.rightHip, climber.limbs.rightFoot.pos, SUMMIT_LEG_MIN, SUMMIT_LEG_MAX),
    mantleStepFxDone: false,
    standBreathFxDone: false,
    triumphSparkFxDone: false,
  };
}

/**
 * Animates the climber through 4 natural, weighty alpine summit beats with guaranteed anatomical
 * bone proportions on every single frame:
 *  - Beat 1 (0.00 -> 0.14): Mantle & Top-Out (low athletic crouch over crest lip, hands press rim, feet step up)
 *  - Beat 2 (0.14 -> 0.27): Stand Up & Catch Breath (torso uncurls upright, hands release off rim as torso lifts)
 *  - Beat 3 (0.27 -> 0.43): Look Out & Open Arms (curved shoulder-pivoted arm sweep into asymmetric alpine triumph)
 *  - Beat 4 (0.43 -> 1.00): 「驻足俯瞰」Pause & Gaze Down head-turn + serene wind-sway summit vigil
 */
export function applySummitClimberChoreography(
  climber: ClimberState,
  snapshot: SummitPoseSnapshot | null,
  peakX: number,
  peakTopY: number,
  sp: number,
  timeSec: number,
  windForce: number,
  callbacks?: SummitChoreographyCallbacks
): void {
  const start: SummitPoseSnapshot = snapshot ?? {
    torsoPos: { x: peakX, y: peakTopY - 22 },
    leanAngle: 0.08,
    lookAngle: 0.1,
    hipTwist: 0.12,
    wallHug: 0.35,
    pelvisOffset: { x: 0, y: 0 },
    leftHand: { x: peakX - 18, y: peakTopY - 6 },
    rightHand: { x: peakX + 18, y: peakTopY - 6 },
    leftFoot: { x: peakX - 13, y: peakTopY + 26 },
    rightFoot: { x: peakX + 13, y: peakTopY + 22 },
    mantleStepFxDone: true,
    standBreathFxDone: true,
    triumphSparkFxDone: true,
  };

  // Canonical anatomical anchors relative to summit standing plane (peakTopY)
  // Feet planted at peakTopY - 2; standTorso at peakTopY - 74.5 => hip-to-foot ~57px (86% of 66px max reach, natural knees!)
  const leftFootStand: Vec2 = { x: peakX - 10.5, y: peakTopY - 2 };
  const rightFootStand: Vec2 = { x: peakX + 11.5, y: peakTopY - 2 };

  // Beat 1 end (True low athletic mantle crouch over crest lip):
  // crouchTorso at peakTopY - 39 => shoulders at peakTopY - 56.5, rim hands at peakTopY - 5 => armDist ~52px (<= 53px, ZERO stretch!)
  // hips at peakTopY - 23.5 => feet at peakTopY - 2 => legDist ~22px (deep athletic squat, well inside [18, 60]!)
  const crouchTorso: Vec2 = { x: peakX + 1.0, y: peakTopY - 39 };
  const rimLeftHand: Vec2 = { x: peakX - 18, y: peakTopY - 5 };
  const rimRightHand: Vec2 = { x: peakX + 19, y: peakTopY - 5 };

  // Beat 2 end (Standing upright, hands naturally relaxed by hips/waist after releasing crest)
  const standTorso: Vec2 = { x: peakX, y: peakTopY - 74.5 };
  const waistLeftHand: Vec2 = { x: peakX - 21, y: peakTopY - 56 };
  const waistRightHand: Vec2 = { x: peakX + 22, y: peakTopY - 57 };

  const breathCycle = Math.sin(timeSec * 1.75);
  const swayX = Math.sin(timeSec * 1.15) * 1.3 + windForce * 1.5;

  if (sp < 0.14) {
    // BEAT 1: Mantle & Top-Out — interpolate in torso-coupled coordinates so limbs travel WITH the body
    const u = summitSmootherstep(sp / 0.14);
    const uFootR = summitSmootherstep((sp - 0.005) / 0.115);
    const uFootL = summitSmootherstep((sp - 0.022) / 0.118);

    // Torso glides smoothly from live climb position onto the crest crouch
    const torsoCtrl: Vec2 = {
      x: (start.torsoPos.x + crouchTorso.x) * 0.5,
      y: Math.min(start.torsoPos.y, crouchTorso.y) - 6,
    };
    const curTorso = quadBezierVec(start.torsoPos, torsoCtrl, crouchTorso, u);
    climber.torsoPos = curTorso;
    climber.leanAngle = lerp(start.leanAngle, 0.1, u);
    climber.lookAngle = lerp(start.lookAngle, 0.16, u);
    climber.hipTwist = lerp(start.hipTwist, 0.14, u);
    climber.wallHug = lerp(start.wallHug, 0.28, u);
    climber.pelvisOffset = lerpVec(start.pelvisOffset, { x: 1.2, y: 3.5 }, u);

    // Interpolate hands in torso-relative offsets first, so even if start.torsoPos was far from peakX,
    // the arms NEVER detach or rubber-stretch across the cliff!
    const startLhRel: Vec2 = {
      x: start.leftHand.x - start.torsoPos.x,
      y: start.leftHand.y - start.torsoPos.y,
    };
    const startRhRel: Vec2 = {
      x: start.rightHand.x - start.torsoPos.x,
      y: start.rightHand.y - start.torsoPos.y,
    };
    const endLhRel: Vec2 = {
      x: rimLeftHand.x - crouchTorso.x,
      y: rimLeftHand.y - crouchTorso.y,
    };
    const endRhRel: Vec2 = {
      x: rimRightHand.x - crouchTorso.x,
      y: rimRightHand.y - crouchTorso.y,
    };
    const handArcLift = Math.sin(u * Math.PI) * 8;
    climber.limbs.leftHand.pos = {
      x: curTorso.x + lerp(startLhRel.x, endLhRel.x, u) - Math.sin(u * Math.PI) * 4,
      y: curTorso.y + lerp(startLhRel.y, endLhRel.y, u) - handArcLift,
    };
    climber.limbs.rightHand.pos = {
      x: curTorso.x + lerp(startRhRel.x, endRhRel.x, u) + Math.sin(u * Math.PI) * 4,
      y: curTorso.y + lerp(startRhRel.y, endRhRel.y, u) - handArcLift,
    };

    // Interpolate feet in torso-relative offsets with subtle sequential outward step-up arcs
    const startLfRel: Vec2 = {
      x: start.leftFoot.x - start.torsoPos.x,
      y: start.leftFoot.y - start.torsoPos.y,
    };
    const startRfRel: Vec2 = {
      x: start.rightFoot.x - start.torsoPos.x,
      y: start.rightFoot.y - start.torsoPos.y,
    };
    const endLfRel: Vec2 = {
      x: leftFootStand.x - crouchTorso.x,
      y: leftFootStand.y - crouchTorso.y,
    };
    const endRfRel: Vec2 = {
      x: rightFootStand.x - crouchTorso.x,
      y: rightFootStand.y - crouchTorso.y,
    };
    climber.limbs.rightFoot.pos = {
      x: curTorso.x + lerp(startRfRel.x, endRfRel.x, uFootR) + Math.sin(uFootR * Math.PI) * 9,
      y: curTorso.y + lerp(startRfRel.y, endRfRel.y, uFootR) - Math.sin(uFootR * Math.PI) * 6,
    };
    climber.limbs.leftFoot.pos = {
      x: curTorso.x + lerp(startLfRel.x, endLfRel.x, uFootL) - Math.sin(uFootL * Math.PI) * 9,
      y: curTorso.y + lerp(startLfRel.y, endLfRel.y, uFootL) - Math.sin(uFootL * Math.PI) * 6,
    };

    if (sp >= 0.1 && snapshot && !snapshot.mantleStepFxDone) {
      snapshot.mantleStepFxDone = true;
      callbacks?.onMantleFootPlant?.(peakX, peakTopY - 2);
    }
  } else if (sp < 0.27) {
    // BEAT 2: Stand Up & Catch Breath
    const u = summitSmootherstep((sp - 0.14) / 0.13);
    const chestLift = Math.sin(u * Math.PI) * 1.4;

    climber.limbs.leftFoot.pos = { ...leftFootStand };
    climber.limbs.rightFoot.pos = { ...rightFootStand };

    // Torso uncurls smoothly upward onto planted feet
    const curTorso: Vec2 = {
      x: lerp(crouchTorso.x, standTorso.x, u),
      y: lerp(crouchTorso.y, standTorso.y, u) - chestLift,
    };
    climber.torsoPos = curTorso;
    climber.leanAngle = lerp(0.1, -0.015, u);
    climber.lookAngle = lerp(0.16, -0.1, u);
    climber.hipTwist = lerp(0.14, 0.05, u);
    climber.wallHug = lerp(0.28, 0.12, u);
    climber.pelvisOffset = {
      x: lerp(1.2, 0, u),
      y: lerp(3.5, 0, u),
    };

    // Hands lift smoothly off the crest IN SYNC with torso rise (torso-relative) so arms NEVER stretch!
    const lhRelStart: Vec2 = { x: rimLeftHand.x - crouchTorso.x, y: rimLeftHand.y - crouchTorso.y };
    const rhRelStart: Vec2 = { x: rimRightHand.x - crouchTorso.x, y: rimRightHand.y - crouchTorso.y };
    const lhRelEnd: Vec2 = { x: waistLeftHand.x - standTorso.x, y: waistLeftHand.y - standTorso.y };
    const rhRelEnd: Vec2 = { x: waistRightHand.x - standTorso.x, y: waistRightHand.y - standTorso.y };
    const outwardSwing = Math.sin(u * Math.PI) * 5;
    climber.limbs.leftHand.pos = {
      x: curTorso.x + lerp(lhRelStart.x, lhRelEnd.x, u) - outwardSwing,
      y: curTorso.y + lerp(lhRelStart.y, lhRelEnd.y, u),
    };
    climber.limbs.rightHand.pos = {
      x: curTorso.x + lerp(rhRelStart.x, rhRelEnd.x, u) + outwardSwing,
      y: curTorso.y + lerp(rhRelStart.y, rhRelEnd.y, u),
    };

    if (sp >= 0.175 && snapshot && !snapshot.standBreathFxDone) {
      snapshot.standBreathFxDone = true;
      callbacks?.onStandBreath?.();
    }
  } else {
    // BEAT 3 (0.27 -> 0.43): Curved-Arc Open-Arm Triumph
    // BEAT 4A (0.43 -> 0.68): 「驻足俯瞰」Pause & Gaze Down (left precipice -> right alpine valley head-turn & shoulder micro-motion)
    // BEAT 4B (0.68 -> 1.00): Serene Alpine Summit Vigil & Documentary Camera Breathing
    const uRaiseL = summitSmootherstep((sp - 0.285) / 0.145);
    const uRaiseR = summitSmootherstep((sp - 0.265) / 0.145);
    const uRelaxToOverlook = summitSmootherstep((sp - 0.43) / 0.18);

    // Subtle 「驻足俯瞰」 head-turn & downward gaze choreography during the long-take optical pull-back
    const lookLeftDown = summitSmootherstep((sp - 0.43) / 0.11);
    const sweepToRight = summitSmootherstep((sp - 0.54) / 0.13);
    const returnCenter = summitSmootherstep((sp - 0.68) / 0.15);

    const overlookHeadAngle =
      lookLeftDown * 0.41 - // tilt gently left & downward toward conquered cliff face
      sweepToRight * 0.37 + // sweep smoothly across valley toward right horizon
      returnCenter * 0.09; // settle softly into serene horizon gaze

    const overlookShoulderTwist =
      lookLeftDown * 0.15 -
      sweepToRight * 0.29 +
      returnCenter * 0.15;

    const overlookForwardLean =
      Math.sin(Math.max(0, Math.min(1, (sp - 0.42) / 0.28)) * Math.PI) * 0.045;

    climber.limbs.leftFoot.pos = { ...leftFootStand };
    climber.limbs.rightFoot.pos = { ...rightFootStand };

    const proudLift = uRaiseR * 1.4 - uRelaxToOverlook * 0.7;
    const microBreathY = breathCycle * 0.85 + Math.sin(timeSec * 0.82) * 0.3;
    const torsoX = peakX + swayX * (0.22 + 0.2 * uRelaxToOverlook) + overlookShoulderTwist * 2.0;
    const torsoY = standTorso.y - proudLift + microBreathY + overlookForwardLean * 12;
    climber.torsoPos = { x: torsoX, y: torsoY };
    climber.leanAngle =
      lerp(-0.015, -0.022, uRaiseR) * (1 - uRelaxToOverlook * 0.6) +
      overlookForwardLean +
      Math.sin(timeSec * 1.1) * 0.016 +
      windForce * 0.015;
    climber.lookAngle =
      lerp(-0.1, -0.24, uRaiseR) +
      overlookHeadAngle +
      Math.sin(timeSec * 0.68) * 0.045 * returnCenter;
    climber.hipTwist =
      lerp(0.05, 0.08, uRaiseR) +
      overlookShoulderTwist +
      Math.sin(timeSec * 0.62) * 0.025 * returnCenter;
    climber.wallHug = 0.1 + overlookForwardLean * 0.55;
    climber.pelvisOffset = {
      x: swayX * 0.18 + overlookShoulderTwist * 1.6,
      y: breathCycle * 0.3,
    };

    // Polar arc around the EXACT rendered shoulder sockets so arm length stays strictly constant (~37..41px)
    const sockets = computeRenderedSockets(climber.torsoPos, climber.leanAngle, climber.hipTwist);

    // Left arm: down-left (1.88) -> triumph V-raise (3.92) -> relaxed open-balance overlook (3.52)
    const leftAngleStart = 1.84;
    const leftAnglePeak = 3.92;
    const leftAngleOverlook =
      3.52 + Math.sin(timeSec * 1.25) * 0.045 - sweepToRight * 0.1 + returnCenter * 0.14;
    const leftAng =
      lerp(leftAngleStart, leftAnglePeak, uRaiseL) +
      (leftAngleOverlook - leftAnglePeak) * uRelaxToOverlook;
    const leftRad = lerp(37.5, 39, uRaiseL) - uRelaxToOverlook * 2.8 + breathCycle * 0.7;

    // Right arm: down-right (1.28) -> triumph raise (-0.88) -> relaxed contemplative gesture (-0.38)
    const rightAngleStart = 1.28;
    const rightAnglePeak = -0.88;
    const rightAngleOverlook =
      -0.38 - Math.sin(timeSec * 1.25 + 0.7) * 0.045 + lookLeftDown * 0.12 - sweepToRight * 0.16;
    const rightAng =
      lerp(rightAngleStart, rightAnglePeak, uRaiseR) +
      (rightAngleOverlook - rightAnglePeak) * uRelaxToOverlook;
    const rightRad = lerp(37.5, 41, uRaiseR) - uRelaxToOverlook * 3.2 + breathCycle * 0.7;

    climber.limbs.leftHand.pos = {
      x: sockets.leftShoulder.x + Math.cos(leftAng) * leftRad,
      y: sockets.leftShoulder.y + Math.sin(leftAng) * leftRad,
    };
    climber.limbs.rightHand.pos = {
      x: sockets.rightShoulder.x + Math.cos(rightAng) * rightRad,
      y: sockets.rightShoulder.y + Math.sin(rightAng) * rightRad,
    };

    if (sp >= 0.31 && snapshot && !snapshot.triumphSparkFxDone) {
      snapshot.triumphSparkFxDone = true;
      callbacks?.onTriumphPeak?.(peakX, peakTopY - 82);
    }
  }

  // Ironclad anatomical reach guard on EVERY frame: guarantees zero rubber-limb stretching or IK distortion
  const finalSockets = computeRenderedSockets(
    climber.torsoPos,
    climber.leanAngle,
    climber.hipTwist ?? 0
  );
  climber.limbs.leftHand.pos = clampToReach(
    finalSockets.leftShoulder,
    climber.limbs.leftHand.pos,
    SUMMIT_ARM_MIN,
    SUMMIT_ARM_MAX
  );
  climber.limbs.rightHand.pos = clampToReach(
    finalSockets.rightShoulder,
    climber.limbs.rightHand.pos,
    SUMMIT_ARM_MIN,
    SUMMIT_ARM_MAX
  );
  climber.limbs.leftFoot.pos = clampToReach(
    finalSockets.leftHip,
    climber.limbs.leftFoot.pos,
    SUMMIT_LEG_MIN,
    SUMMIT_LEG_MAX
  );
  climber.limbs.rightFoot.pos = clampToReach(
    finalSockets.rightHip,
    climber.limbs.rightFoot.pos,
    SUMMIT_LEG_MIN,
    SUMMIT_LEG_MAX
  );
}

/**
 * Computes the exact resting cover geometry and final screen-space summit focal point
 * for a route's wideEnding painting at optical scale 1.0.
 */
export function computeWideRestingGeometry(
  width: number,
  height: number,
  imgAspect: number,
  wideFocalX: number,
  wideFocalY: number
): WideRestingGeometry {
  const safeImgAspect = imgAspect > 0.1 ? imgAspect : 9 / 16;
  const viewAspect = width / Math.max(1, height);

  let baseDrawW: number;
  let baseDrawH: number;
  if (viewAspect > safeImgAspect) {
    baseDrawW = width;
    baseDrawH = width / safeImgAspect;
  } else {
    baseDrawH = height;
    baseDrawW = height * safeImgAspect;
  }

  const idealRestX = width * 0.5 - baseDrawW * wideFocalX;
  const restX = Math.max(width - baseDrawW, Math.min(0, idealRestX));

  // On portrait mobile (baseDrawH === height), restY === 0 so peak rests naturally at height * wideFocalY.
  // On landscape desktop (baseDrawH > height), keep the summit peak prominently framed in the upper third (0.28..0.38).
  const landscapeTargetPeakY = height * Math.min(0.38, Math.max(0.26, wideFocalY + 0.08));
  const idealRestY = landscapeTargetPeakY - baseDrawH * wideFocalY;
  const restY = Math.max(height - baseDrawH, Math.min(0, idealRestY));

  return {
    baseDrawW,
    baseDrawH,
    restX,
    restY,
    restPeakScreenX: restX + baseDrawW * wideFocalX,
    restPeakScreenY: restY + baseDrawH * wideFocalY,
  };
}

/**
 * Computes the unified optical pull-back camera targets for the summit sequence.
 * Both the live 2.5D world camera and the wideEnding painting share these exact parameters
 * so the summit peak stays pixel-locked on screen and zooms out at the exact same logarithmic rate.
 */
export function computeSummitOpticalTargets(
  width: number,
  height: number,
  peakX: number,
  peakTopY: number,
  sp: number,
  snap: { x: number; y: number; zoom: number },
  pack: DecodedArtPack
): SummitOpticalTargets {
  const { wideFocalX, wideFocalY, wideDissolveStartScale } = pack.urls.metrics;
  const wideImg = pack.wideEndingImg;
  const imgAspect =
    wideImg && wideImg.naturalWidth > 0 && wideImg.naturalHeight > 0
      ? wideImg.naturalWidth / wideImg.naturalHeight
      : 9 / 16;

  const restGeo = computeWideRestingGeometry(width, height, imgAspect, wideFocalX, wideFocalY);

  // Intimate hero close-up zoom for topping-out & standing beats (0.00 -> 0.24)
  const responsiveZoom = Math.min(1.06, Math.max(0.72, width / 420));
  const crestZoom = Math.min(1.06, responsiveZoom * 1.02);

  // Ensure the wide painting has ample bleed margin when dissolve starts (sp = 0.38) so peak stays sub-pixel locked
  const minSafeScaleForTop =
    (height * 0.42) / Math.max(1, restGeo.baseDrawH * Math.max(0.14, wideFocalY));
  const pullRatio = Math.max(
    2.15,
    Math.min(2.75, Math.max(wideDissolveStartScale * 1.48, minSafeScaleForTop))
  );
  const finalPanoramicZoom = crestZoom / pullRatio;

  // Screen position of peakTopY at the instant summit triggers (derived from live camera snapshot)
  const snapPeakScreenX = width * 0.5 + (peakX - snap.x) * snap.zoom;
  const snapPeakScreenY = height * 0.52 + (peakTopY - snap.y) * snap.zoom;

  // Hero close-up peak position: peakTopY at 57% height so the standing climber is centered around 46–57%
  const heroPeakScreenX = width * 0.5;
  const heroPeakScreenY = height * 0.57;

  // Beat A (0.00 -> 0.24): Smooth glide from live climb framing into hero summit close-up
  const crestU = summitSmootherstep(sp / 0.24);
  const framedPeakScreenX = lerp(snapPeakScreenX, heroPeakScreenX, crestU);
  const framedPeakScreenY = lerp(snapPeakScreenY, heroPeakScreenY, crestU);
  const framedZoom = snap.zoom * Math.pow(crestZoom / Math.max(0.1, snap.zoom), crestU);

  // Beat B (0.24 -> 0.90): Continuous C² exponential optical pull-back locking peak onto wideEnding's focal point
  const pullU = summitSmootherstep((sp - 0.24) / 0.66);
  const targetZoom =
    framedZoom * Math.pow(finalPanoramicZoom / Math.max(0.1, framedZoom), pullU);

  // Subtle documentary aerial-camera gimbal breath peaking softly mid-flight and damping cleanly to 0 at rest
  const gimbalEnv = Math.sin(pullU * Math.PI);
  const gimbalDriftX = Math.sin(sp * Math.PI * 3.1) * 3.2 * gimbalEnv;
  const gimbalDriftY = Math.cos(sp * Math.PI * 2.4) * 2.4 * gimbalEnv;

  const livePeakScreenX = lerp(framedPeakScreenX, restGeo.restPeakScreenX, pullU) + gimbalDriftX;
  const livePeakScreenY = lerp(framedPeakScreenY, restGeo.restPeakScreenY, pullU) + gimbalDriftY;

  // Invert world-to-screen transform so world point (peakX, peakTopY) projects to (livePeakScreenX, livePeakScreenY)
  const targetX = peakX - (livePeakScreenX - width * 0.5) / Math.max(0.08, targetZoom);
  const targetY = peakTopY - (livePeakScreenY - height * 0.52) / Math.max(0.08, targetZoom);

  return {
    targetX,
    targetY,
    targetZoom,
    crestZoom,
    finalPanoramicZoom,
    pullRatio,
    pullU,
    restGeo,
  };
}
