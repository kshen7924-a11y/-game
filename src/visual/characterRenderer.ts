import {
  ClimberGender,
  ClimberSkinConfig,
  ClimberState,
  GamePhase,
  Hold,
  LimbId,
  Vec2,
} from '../game/types';
import {
  CharacterBoneSlot,
  CharacterHandPose,
  CharacterHeadMood,
  DEFAULT_ANCHOR_SLOT_SPECS,
  DEFAULT_BONE_SLOT_SPECS,
  DEFAULT_JOINT_CAP_SPECS,
  drawAnchorPartSprite,
  drawBoneSegmentSprite,
  getDecodedCharacterArtPack,
} from './characterArtAssets';

const INK = '#141820';

function shadeHex(hex: string, delta: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(delta >= 0 ? c + (255 - c) * delta : c * (1 + delta))));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Tapered anatomical capsule between two IK joints (wider near origin muscle, slimmer toward distal joint).
 * Produces a more athletic, sculpted silhouette than uniform-width sticks while remaining 100% locked to IK joints.
 */
function drawTaperedLimb(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  rStart: number,
  rEnd: number,
  fill: string,
  shadow: string,
  outlineWidth: number,
  options?: {
    cuffColor?: string;
    kneePatch?: boolean;
    tapeWrap?: boolean;
  }
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(angle);

  const traceSilhouette = () => {
    ctx.beginPath();
    ctx.arc(0, 0, rStart, Math.PI * 0.5, -Math.PI * 0.5, false);
    ctx.lineTo(len, -rEnd);
    ctx.arc(len, 0, rEnd, -Math.PI * 0.5, Math.PI * 0.5, false);
    ctx.closePath();
  };

  // Base fill
  traceSilhouette();
  ctx.fillStyle = fill;
  ctx.fill();

  // Clipped interior shading, fabric seam & cuffs
  ctx.save();
  traceSilhouette();
  ctx.clip();

  // Trailing edge comic shadow band
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(-rStart, rStart * 0.12);
  ctx.lineTo(len + rEnd, rEnd * 0.12);
  ctx.lineTo(len + rEnd, Math.max(rStart, rEnd) + 3);
  ctx.lineTo(-rStart, Math.max(rStart, rEnd) + 3);
  ctx.closePath();
  ctx.fill();

  // Subtle fabric knee/elbow abrasion patch
  if (options?.kneePatch) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
    ctx.beginPath();
    ctx.ellipse(len * 0.86, 0, rEnd * 1.15, rEnd * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distal sleeve/pant cuff trim
  if (options?.cuffColor) {
    ctx.fillStyle = options.cuffColor;
    ctx.fillRect(len - rEnd * 0.85, -rEnd - 1, rEnd * 1.1, rEnd * 2 + 2);
  }

  // Athletic wrist tape wrap on forearm
  if (options?.tapeWrap) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(len - rEnd * 0.95, -rEnd - 1, rEnd * 0.65, rEnd * 2 + 2);
  }

  ctx.restore();

  // Crisp comic ink contour
  traceSilhouette();
  ctx.strokeStyle = INK;
  ctx.lineWidth = outlineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.restore();
}

export interface SolvedLimbPose {
  joint: Vec2;
  end: Vec2;
}

export interface ClimberRenderRig {
  climber: ClimberState;
  skin: ClimberSkinConfig;
  phase: GamePhase;
  timeSec: number;
  windForce: number;
  inkScale: number;
  rimColor: string;
  activeStrainFx: boolean;
  breathY: number;
  visTwist: number;
  visWaistX: number;
  visWaistY: number;
  visDropL: number;
  visDropR: number;
  visLean: number;
  joints: {
    leftShoulder: Vec2;
    rightShoulder: Vec2;
    leftHip: Vec2;
    rightHip: Vec2;
  };
  lhIK: SolvedLimbPose;
  rhIK: SolvedLimbPose;
  lfIK: SolvedLimbPose;
  rfIK: SolvedLimbPose;
  lhDrawJoint: Vec2;
  lhDrawEnd: Vec2;
  rhDrawJoint: Vec2;
  rhDrawEnd: Vec2;
  lhHold: Hold | null;
  rhHold: Hold | null;
  lfHold: Hold | null;
  rfHold: Hold | null;
  computeLimbEndAngle: (limbId: LimbId, joint: Vec2, end: Vec2, hold: Hold | null) => number;
  drawArmStrainGlow?: () => void;
  /** Optional Cairn-style crisp cool-teal cel-shaded cast shadow projected onto the cliff wall */
  castShadowColor?: string;
  castShadowOffsetX?: number;
  castShadowOffsetY?: number;
  /** Climber gender silhouette variant (visual only; IK & hitboxes remain identical) */
  gender?: ClimberGender;
}

/**
 * Pure presentation renderer for the climber character.
 * Every body/gear slot checks `DecodedCharacterArtPack` first for PNG/WebP sprite overrides,
 * falling back seamlessly per-slot to the upgraded painterly storybook alpine climber.
 */
export function renderClimberCharacter(
  ctx: CanvasRenderingContext2D,
  rig: ClimberRenderRig
): void {
  const {
    climber,
    skin,
    phase,
    timeSec,
    windForce,
    inkScale,
    rimColor,
    activeStrainFx,
    breathY,
    visTwist,
    visWaistX,
    visWaistY,
    visDropL,
    visDropR,
    visLean,
    joints,
    lhIK,
    rhIK,
    lfIK,
    rfIK,
    lhDrawJoint,
    lhDrawEnd,
    rhDrawJoint,
    rhDrawEnd,
    lhHold,
    rhHold,
    lfHold,
    rfHold,
    computeLimbEndAngle,
    drawArmStrainGlow,
    castShadowColor = 'rgba(28, 56, 70, 0.36)',
    castShadowOffsetX = 9,
    castShadowOffsetY = 12,
    gender = 'male',
  } = rig;

  const isFemale = gender === 'female';
  const { leftHand, rightHand } = climber.limbs;
  const artPack = getDecodedCharacterArtPack(skin.artPackId ?? skin.id);
  const basePants = skin.pants ?? '#334155';
  const baseShoe = skin.shoe ?? '#F59E0B';
  const headgear = skin.headgear ?? 'beanie';
  const packStyle = skin.packStyle ?? 'alpine';
  const legOutline = 1.65;

  // 0. Cairn-Style Crisp Wall-Projected Cel Cast Shadow (grounds climber directly onto cliff face)
  if (phase !== 'SUMMIT') {
    ctx.save();
    ctx.translate(castShadowOffsetX, castShadowOffsetY);
    ctx.fillStyle = castShadowColor;
    ctx.strokeStyle = castShadowColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Limb shadow strokes
    ctx.lineWidth = 9.5;
    ctx.beginPath();
    ctx.moveTo(joints.leftHip.x, joints.leftHip.y);
    ctx.lineTo(lfIK.joint.x, lfIK.joint.y);
    ctx.lineTo(lfIK.end.x, lfIK.end.y);
    ctx.moveTo(joints.rightHip.x, joints.rightHip.y);
    ctx.lineTo(rfIK.joint.x, rfIK.joint.y);
    ctx.lineTo(rfIK.end.x, rfIK.end.y);
    ctx.stroke();

    ctx.lineWidth = 7.6;
    ctx.beginPath();
    ctx.moveTo(joints.leftShoulder.x, joints.leftShoulder.y);
    ctx.lineTo(lhDrawJoint.x, lhDrawJoint.y);
    ctx.lineTo(lhDrawEnd.x, lhDrawEnd.y);
    ctx.moveTo(joints.rightShoulder.x, joints.rightShoulder.y);
    ctx.lineTo(rhDrawJoint.x, rhDrawJoint.y);
    ctx.lineTo(rhDrawEnd.x, rhDrawEnd.y);
    ctx.stroke();

    // Torso, backpack & head cast shadow silhouette
    ctx.save();
    ctx.translate(climber.torsoPos.x, climber.torsoPos.y + breathY);
    ctx.rotate(visLean);
    ctx.beginPath();
    ctx.roundRect(-15, -24, 30, 44, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-visTwist * 1.8, -32.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  const tryBoneSprite = (slot: CharacterBoneSlot, start: Vec2, end: Vec2): boolean => {
    const img = artPack.boneImgs[slot];
    if (!img) return false;
    const spec = artPack.definition.boneParts?.[slot] ?? DEFAULT_BONE_SLOT_SPECS[slot];
    drawBoneSegmentSprite(ctx, img, spec, start, end);
    return true;
  };

  // 1. 2.5D Depth-Sorted Legs + Harness Leg Loops + Sculpted Climbing Shoes
  const drawSingleLeg = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const hip = isLeft ? joints.leftHip : joints.rightHip;
    const ik = isLeft ? lfIK : rfIK;
    const hold = isLeft ? lfHold : rfHold;
    const dropAmt = isLeft ? visDropL : visDropR;
    const turnedIntoWall = isLeft ? visTwist < -0.2 : visTwist > 0.2;
    const pantsFill = turnedIntoWall
      ? shadeHex(basePants, -0.18)
      : isLeft
        ? basePants
        : shadeHex(basePants, 0.08);
    const pantsShadow = shadeHex(pantsFill, -0.36);

    const thighSlot: CharacterBoneSlot = isLeft ? 'thighL' : 'thighR';
    const calfSlot: CharacterBoneSlot = isLeft ? 'calfL' : 'calfR';

    if (!tryBoneSprite(thighSlot, hip, ik.joint)) {
      drawTaperedLimb(ctx, hip, ik.joint, 6.2, 4.9, pantsFill, pantsShadow, legOutline, {
        kneePatch: true,
      });

      // Climbing harness thigh leg-loop anchored cleanly on upper thigh
      const loopX = hip.x + (ik.joint.x - hip.x) * 0.28;
      const loopY = hip.y + (ik.joint.y - hip.y) * 0.28;
      const thighAngle = Math.atan2(ik.joint.y - hip.y, ik.joint.x - hip.x);
      ctx.save();
      ctx.translate(loopX, loopY);
      ctx.rotate(thighAngle);
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-2.2, -5.8, 4.4, 11.6, 1.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-0.8, -4.6, 1.6, 9.2);
      ctx.restore();
    }

    if (!tryBoneSprite(calfSlot, ik.joint, ik.end)) {
      drawTaperedLimb(ctx, ik.joint, ik.end, 5.0, 3.7, pantsFill, pantsShadow, legOutline, {
        cuffColor: '#1E293B',
      });
    }

    // Optional ligne-claire knee joint cap sprite OR articulated drop-knee cap highlight
    const kneeCapImg = artPack.jointCapImgs.knee;
    if (kneeCapImg) {
      const spec = artPack.definition.jointCaps?.knee ?? DEFAULT_JOINT_CAP_SPECS.knee;
      drawAnchorPartSprite(ctx, kneeCapImg, spec, ik.joint.x, ik.joint.y, 0, isLeft ? 1 : -1, 1);
    } else if (dropAmt > 0.18 && !artPack.boneImgs[thighSlot]) {
      ctx.save();
      ctx.fillStyle = shadeHex(pantsFill, 0.16);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(ik.joint.x, ik.joint.y, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Crisp sunlit outer leg rim highlight
    if (isLeft && visTwist > -0.45 && !artPack.boneImgs[thighSlot]) {
      ctx.save();
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x - 3.4, hip.y);
      ctx.lineTo(ik.joint.x - 3.1, ik.joint.y);
      ctx.lineTo(ik.end.x - 2.4, ik.end.y);
      ctx.stroke();
      ctx.restore();
    }

    // Climbing Shoe (sprite-first, detailed downturned climbing shoe fallback)
    const baseShoeAngle = computeLimbEndAngle(isLeft ? 'leftFoot' : 'rightFoot', ik.joint, ik.end, hold);
    const dropEdgeCant = (isLeft ? 0.34 : -0.34) * dropAmt;
    const shoeAngle = phase === 'SUMMIT' ? (isLeft ? 0.06 : -0.06) : baseShoeAngle + dropEdgeCant;
    const footSlot = isLeft ? 'footL' : 'footR';
    const footImg = artPack.anchorImgs[footSlot];

    if (footImg) {
      const spec = artPack.definition.anchorParts?.[footSlot] ?? DEFAULT_ANCHOR_SLOT_SPECS[footSlot];
      drawAnchorPartSprite(
        ctx,
        footImg,
        spec,
        ik.end.x,
        ik.end.y,
        shoeAngle,
        phase === 'SUMMIT' && isLeft ? -1 : 1,
        1 - dropAmt * 0.14
      );
    } else {
      ctx.save();
      ctx.translate(ik.end.x, ik.end.y);
      if (phase === 'SUMMIT' && isLeft) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(shoeAngle);
      ctx.scale(1, 1 - dropAmt * 0.14);

      // Shoe upper body (aggressive climbing shoe silhouette)
      ctx.fillStyle = baseShoe;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6.8, -3.4);
      ctx.quadraticCurveTo(1.5, -5.2, 8.2, -1.6);
      ctx.quadraticCurveTo(9.4, 1.2, 6.4, 3.6);
      ctx.lineTo(-5.8, 3.8);
      ctx.quadraticCurveTo(-7.6, 2.6, -6.8, -3.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sticky rubber toe rand & sole edge
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(2.4, -3.2);
      ctx.quadraticCurveTo(8.4, -1.8, 8.6, 1.4);
      ctx.quadraticCurveTo(7.4, 3.8, 2.2, 3.6);
      ctx.closePath();
      ctx.fill();

      // Heel cup rand & dual velcro closure straps
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-6.5, -1.2, 3.6, 4.6, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(-1.8, -3.4);
      ctx.lineTo(-0.4, 0.2);
      ctx.moveTo(0.8, -3.2);
      ctx.lineTo(1.8, 0.2);
      ctx.stroke();

      ctx.restore();
    }
  };

  if (visTwist > 0.15) {
    drawSingleLeg('right');
    drawSingleLeg('left');
  } else {
    drawSingleLeg('left');
    drawSingleLeg('right');
  }

  if (drawArmStrainGlow) {
    drawArmStrainGlow();
  }

  // 2. Sculpted Arms & State-Aware Hands (open / grip / chalked)
  const drawSingleArm = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const shoulder = isLeft ? joints.leftShoulder : joints.rightShoulder;
    const drawJoint = isLeft ? lhDrawJoint : rhDrawJoint;
    const drawEnd = isLeft ? lhDrawEnd : rhDrawEnd;
    const ik = isLeft ? lhIK : rhIK;
    const hold = isLeft ? lhHold : rhHold;
    const limbState = isLeft ? leftHand : rightHand;
    const turnedIntoWall = isLeft ? visTwist < -0.24 : visTwist > 0.24;
    const armFill = turnedIntoWall ? skin.jacketShadow : skin.jacket;
    const armShadow = turnedIntoWall ? shadeHex(skin.jacketShadow, -0.26) : skin.jacketShadow;

    const upperSlot: CharacterBoneSlot = isLeft ? 'upperArmL' : 'upperArmR';
    const lowerSlot: CharacterBoneSlot = isLeft ? 'forearmL' : 'forearmR';

    if (!tryBoneSprite(upperSlot, shoulder, drawJoint)) {
      drawTaperedLimb(ctx, shoulder, drawJoint, 5.2, 4.3, armFill, armShadow, legOutline, {
        cuffColor: shadeHex(armShadow, -0.1),
      });
    }

    if (!tryBoneSprite(lowerSlot, drawJoint, drawEnd)) {
      drawTaperedLimb(ctx, drawJoint, drawEnd, 4.3, 3.2, armFill, armShadow, legOutline, {
        cuffColor: '#1E293B',
        tapeWrap: limbState.strain > 0.35 || climber.stamina < 45,
      });
    }

    // Lit outer sleeve highlight
    if (isLeft && !turnedIntoWall && !artPack.boneImgs[upperSlot]) {
      ctx.save();
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulder.x - 2.9, shoulder.y - 1);
      ctx.lineTo(drawJoint.x - 2.7, drawJoint.y - 1);
      ctx.lineTo(drawEnd.x - 2.1, drawEnd.y - 1);
      ctx.stroke();
      ctx.restore();
    }

    // Motion lines while shaking out hand to recover stamina
    if (climber.isShakingOut && activeStrainFx && limbState.holdId === null) {
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.76)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(drawEnd.x, drawEnd.y, 9, Math.PI * 0.15, Math.PI * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(drawEnd.x, drawEnd.y, 12.5, Math.PI * 1.15, Math.PI * 1.75);
      ctx.stroke();
      ctx.restore();
    }

    // Optional ligne-claire elbow joint cap sprite
    const elbowCapImg = artPack.jointCapImgs.elbow;
    if (elbowCapImg) {
      const spec = artPack.definition.jointCaps?.elbow ?? DEFAULT_JOINT_CAP_SPECS.elbow;
      drawAnchorPartSprite(ctx, elbowCapImg, spec, drawJoint.x, drawJoint.y, 0, isLeft ? 1 : -1, 1);
    }

    const handAngle = computeLimbEndAngle(isLeft ? 'leftHand' : 'rightHand', ik.joint, drawEnd, hold);
    const anchored = limbState.holdId !== null;
    const handPose: CharacterHandPose =
      limbState.strain > 0.65
        ? 'strained'
        : climber.chalk > 20
          ? 'chalked'
          : climber.stamina < 45
            ? 'taped'
            : anchored
              ? 'grip'
              : 'open';
    const handSlot = isLeft ? 'handL' : 'handR';

    const variantImg =
      artPack.handVariantImgs[handPose] ??
      (handPose === 'strained' || handPose === 'taped'
        ? artPack.handVariantImgs[anchored ? 'grip' : 'open']
        : undefined);
    const handImg = variantImg ?? artPack.anchorImgs[handSlot];
    if (handImg) {
      const spec =
        (variantImg ? artPack.definition.handVariants?.[handPose] : undefined) ??
        artPack.definition.anchorParts?.[handSlot] ??
        DEFAULT_ANCHOR_SLOT_SPECS[handSlot];
      drawAnchorPartSprite(ctx, handImg, spec, drawEnd.x, drawEnd.y, handAngle, isLeft ? 1 : -1, 1);
    } else {
      ctx.save();
      ctx.translate(drawEnd.x, drawEnd.y);
      ctx.rotate(handAngle);

      const skinTone = '#E7BA9E';
      const chalked = climber.chalk > 20;

      // Palm + curled fingers contour
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.roundRect(-4.6, -4.1, anchored ? 9.6 : 8.6, 8.2, 3.6);
      ctx.fill();
      ctx.stroke();

      // Thumb tuck
      ctx.fillStyle = shadeHex(skinTone, -0.08);
      ctx.beginPath();
      ctx.ellipse(-0.4, isLeft ? 4.0 : -4.0, 2.7, 1.7, isLeft ? 0.35 : -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Chalk dust dusting across fingertips
      if (chalked) {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
        ctx.beginPath();
        ctx.roundRect(-0.8, -3.3, anchored ? 5.2 : 4.2, 6.6, 2.4);
        ctx.fill();
      }

      // Curled finger grip lines when latched onto hold
      if (anchored) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(2.1, -3.2);
        ctx.lineTo(2.1, 3.2);
        ctx.moveTo(2.1, -1.1);
        ctx.lineTo(4.4, -1.1);
        ctx.moveTo(2.1, 1.1);
        ctx.lineTo(4.4, 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // Wall-pressed arm renders BEFORE torso/pack for crisp 2.5D side-turn overlap
  const wallArmSide: 'left' | 'right' | null =
    visTwist < -0.22 ? 'left' : visTwist > 0.22 ? 'right' : null;
  if (wallArmSide) {
    drawSingleArm(wallArmSide);
  } else {
    drawSingleArm('left');
    drawSingleArm('right');
  }

  // 3. Articulated 2.5D Torso, Technical Jacket, Harness, Pack, Scarf & Head
  ctx.save();
  ctx.translate(climber.torsoPos.x, climber.torsoPos.y + breathY);
  ctx.rotate(visLean);

  const hipTwistScale = 1 - Math.abs(visTwist) * 0.22;
  const shoulderTwistScale = 1 - Math.abs(visTwist) * 0.14;
  const localHipX = visWaistX * 0.85;
  const localHipY = visWaistY * 0.72;
  const chestTopW = (isFemale ? 13.7 : 14.8) * shoulderTwistScale;
  const hipBotW = (isFemale ? 12.8 : 13.0) * hipTwistScale;
  const waistPinchFactor = isFemale ? 0.84 : 0.94;
  const waistCtrlX = localHipX * 0.45 + visTwist * 2.2;
  const waistCtrlY = 2 + localHipY * 0.45;

  // 3A. Torso / Technical Alpine Jacket
  const torsoImg = artPack.anchorImgs.torso;
  if (torsoImg) {
    const spec = artPack.definition.anchorParts?.torso ?? DEFAULT_ANCHOR_SLOT_SPECS.torso;
    drawAnchorPartSprite(
      ctx,
      torsoImg,
      spec,
      localHipX * 0.35,
      localHipY * 0.35,
      0,
      shoulderTwistScale,
      1
    );
  } else {
    const drawJacketPath = () => {
      ctx.beginPath();
      ctx.moveTo(-chestTopW, -22);
      ctx.quadraticCurveTo(0, -25.5, chestTopW, -22);
      ctx.quadraticCurveTo(
        waistCtrlX + hipBotW * waistPinchFactor,
        waistCtrlY,
        localHipX + hipBotW,
        19 + localHipY
      );
      ctx.quadraticCurveTo(
        localHipX,
        22.5 + localHipY,
        localHipX - hipBotW,
        19 + localHipY
      );
      ctx.quadraticCurveTo(
        waistCtrlX - hipBotW * waistPinchFactor,
        waistCtrlY,
        -chestTopW,
        -22
      );
      ctx.closePath();
    };

    drawJacketPath();
    ctx.fillStyle = skin.jacket;
    ctx.fill();

    ctx.save();
    drawJacketPath();
    ctx.clip();

    // Reinforced darker shoulder yoke panel (alpine hardshell look)
    ctx.fillStyle = shadeHex(skin.jacketShadow, -0.06);
    ctx.beginPath();
    ctx.moveTo(-chestTopW - 3, -26);
    ctx.lineTo(chestTopW + 3, -26);
    ctx.lineTo(chestTopW + 2, -11);
    ctx.quadraticCurveTo(0, -14.5, -chestTopW - 2, -11);
    ctx.closePath();
    ctx.fill();

    // Dynamic 2.5D Shadow Split inside Jacket (shifts across spine as torso twists)
    const splitOffset = visTwist * 7.5;
    ctx.fillStyle = skin.jacketShadow;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(splitOffset, -25);
    ctx.lineTo(chestTopW + 8, -25);
    ctx.lineTo(localHipX + hipBotW + 8, 24 + localHipY);
    ctx.lineTo(localHipX + splitOffset * 0.75, 24 + localHipY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Technical jacket panel seams / quilted baffle lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(-chestTopW + 1, -4);
    ctx.quadraticCurveTo(waistCtrlX, -2.5, chestTopW - 1, -4);
    ctx.moveTo(-chestTopW + 2, 5 + localHipY * 0.3);
    ctx.quadraticCurveTo(waistCtrlX, 6.8 + localHipY * 0.4, chestTopW - 2, 5 + localHipY * 0.3);
    ctx.stroke();

    // Accent collar/hem storm trim
    ctx.fillStyle = skin.accent;
    ctx.fillRect(localHipX - hipBotW - 2, 16.5 + localHipY, (hipBotW + 2) * 2, 2.4);

    // Subtle lumbar fabric fold crease indicating lower-back flex/shift
    if (Math.abs(visWaistX) > 2.5 || Math.abs(visTwist) > 0.18 || Math.abs(visWaistY) > 2.5) {
      ctx.strokeStyle = 'rgba(20, 24, 32, 0.36)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(localHipX - hipBotW * 0.65, 8 + localHipY * 0.5);
      ctx.quadraticCurveTo(
        waistCtrlX,
        10 + localHipY * 0.7,
        localHipX + hipBotW * 0.65,
        6 + localHipY * 0.5
      );
      ctx.stroke();
    }
    ctx.restore();

    drawJacketPath();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.15;
    ctx.stroke();

    // Crisp sunlit rim highlight along left edge
    if (visTwist > -0.55) {
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-chestTopW + 1.8, -18);
      ctx.quadraticCurveTo(
        waistCtrlX - hipBotW * 0.82,
        waistCtrlY,
        localHipX - hipBotW + 2.2,
        15 + localHipY
      );
      ctx.stroke();
    }
  }

  // Shared swing physics for dangling carabiners & chalk bag
  const bagSwing =
    -visLean * 0.75 +
    windForce * 0.28 +
    Math.sin(timeSec * 4.2) * 0.08 -
    Math.max(-0.35, Math.min(0.35, climber.torsoVel.x * 0.002));

  // 3B. Climbing Harness Waist Belt + Metallic Buckle + Dangling Quickdraws
  const harnessImg = artPack.anchorImgs.pelvisHarness;
  if (harnessImg) {
    const spec =
      artPack.definition.anchorParts?.pelvisHarness ?? DEFAULT_ANCHOR_SLOT_SPECS.pelvisHarness;
    drawAnchorPartSprite(
      ctx,
      harnessImg,
      spec,
      localHipX,
      13 + localHipY,
      visTwist * 0.08,
      hipTwistScale,
      1
    );
  } else {
    const beltSkewY = visTwist * 2.2;
    ctx.save();
    ctx.translate(localHipX, 13 + localHipY);
    ctx.rotate(visTwist * 0.08);

    // Padded waist belt
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.roundRect(-hipBotW - 0.8, -3.6, (hipBotW + 0.8) * 2, 7.6, 3);
    ctx.fill();
    ctx.stroke();

    // Woven webbing center stripe
    ctx.fillStyle = skin.accent;
    ctx.fillRect(-hipBotW + 1.5, -1.1, (hipBotW - 1.5) * 2, 2.2);

    // Anodized rear/side harness buckle
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-2.4, -2.5, 4.8, 5, 1.2);
    ctx.fill();
    ctx.stroke();

    // Gear loop + twin tiny swinging carabiners / quickdraws
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.55;
    ctx.beginPath();
    ctx.arc(-hipBotW * 0.58, 4.2 - beltSkewY * 0.25, 3.4, 0, Math.PI);
    ctx.stroke();

    ctx.save();
    ctx.translate(-hipBotW * 0.62, 6.2 - beltSkewY * 0.25);
    ctx.rotate(bagSwing * 0.85);
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 2.6, 1.7, 2.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.ellipse(2.6, 2.2, 1.5, 2.5, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // 3C. 2.5D Alpine Backpack (with distinct style gear silhouettes)
  const packOffsetX = localHipX * 0.25 - visTwist * 4.2;
  const packOffsetY = localHipY * 0.25;
  const packHalfW = 11.2 * (1 - Math.abs(visTwist) * 0.18);
  const backpackImg = artPack.anchorImgs.backpack;

  if (backpackImg) {
    const spec = artPack.definition.anchorParts?.backpack ?? DEFAULT_ANCHOR_SLOT_SPECS.backpack;
    drawAnchorPartSprite(
      ctx,
      backpackImg,
      spec,
      packOffsetX,
      packOffsetY - 6,
      0,
      1 - Math.abs(visTwist) * 0.18,
      1
    );
  } else {
    ctx.save();
    ctx.translate(packOffsetX, packOffsetY);

    // Side depth panel when twisted
    if (Math.abs(visTwist) > 0.14) {
      const sideDir = visTwist > 0 ? -1 : 1;
      const sideDepthW = Math.abs(visTwist) * 5.2;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.55;
      ctx.beginPath();
      ctx.roundRect(
        sideDir > 0 ? packHalfW - 2 : -packHalfW - sideDepthW + 2,
        -17.5,
        sideDepthW + 2,
        24.5,
        3
      );
      ctx.fill();
      ctx.stroke();
    }

    // Shoulder harness straps wrapping neatly over top shoulders
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-packHalfW * 0.72, -19);
    ctx.lineTo(-chestTopW * 0.76, -21);
    ctx.moveTo(packHalfW * 0.72, -19);
    ctx.lineTo(chestTopW * 0.76, -21);
    ctx.stroke();

    // Main sculpted pack body
    const packBaseColor =
      packStyle === 'pro-shell'
        ? '#334155'
        : packStyle === 'rope-coil'
          ? '#57534E'
          : packStyle === 'bivouac-roll'
            ? '#3F4E42'
            : packStyle === 'minimal-sling'
              ? '#27272A'
              : '#475569';
    const effectivePackHalfW = packStyle === 'minimal-sling' ? packHalfW * 0.84 : packHalfW;
    const effectivePackH = packStyle === 'minimal-sling' ? 23.0 : 26.5;
    ctx.fillStyle = packBaseColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-effectivePackHalfW, -18.5, effectivePackHalfW * 2, effectivePackH, [5, 5, 7, 7]);
    ctx.fill();
    ctx.stroke();

    // Pack shading & center seam
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.roundRect(0, -17.5, packHalfW - 0.8, 24.5, [0, 4, 6, 0]);
    ctx.fill();

    // Vertical compression / daisy-chain straps
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-packHalfW * 0.45, -15);
    ctx.lineTo(-packHalfW * 0.45, 5);
    ctx.moveTo(packHalfW * 0.45, -15);
    ctx.lineTo(packHalfW * 0.45, 5);
    ctx.stroke();

    // Sunlit specular highlight along left pack edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(-packHalfW * 0.74, -14);
    ctx.lineTo(-packHalfW * 0.74, 3);
    ctx.stroke();

    // Style-specific expedition exterior gear
    if (packStyle === 'ice-axe') {
      // Diagonal technical ice-axe strapped to back of pack
      ctx.save();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-packHalfW * 0.55, 7);
      ctx.lineTo(packHalfW * 0.62, -16);
      ctx.stroke();
      // Curved steel pick head
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(packHalfW * 0.15, -17.5);
      ctx.quadraticCurveTo(packHalfW * 0.68, -17, packHalfW * 1.05, -13);
      ctx.stroke();
      ctx.restore();
    } else if (packStyle === 'rope-coil') {
      // Coiled rope nested across upper pack under top lid
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(-packHalfW - 2.2, -14.5);
      ctx.quadraticCurveTo(0, -11.5, packHalfW + 2.2, -14.5);
      ctx.stroke();
      ctx.strokeStyle = skin.rope;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else if (packStyle === 'pro-shell') {
      // High-visibility reflective expedition chevron stripe
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-packHalfW * 0.52, -3);
      ctx.lineTo(0, 1.5);
      ctx.lineTo(packHalfW * 0.52, -3);
      ctx.stroke();
    } else if (packStyle === 'bivouac-roll') {
      // Lashed expedition sleeping-pad roll mounted cleanly under pack bottom
      ctx.fillStyle = '#D6D3D1';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-packHalfW - 2.6, 5.2, (packHalfW + 2.6) * 2, 6.2, 3.1);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-packHalfW * 0.5, 5.2);
      ctx.lineTo(-packHalfW * 0.5, 11.4);
      ctx.moveTo(packHalfW * 0.5, 5.2);
      ctx.lineTo(packHalfW * 0.5, 11.4);
      ctx.stroke();
    } else if (packStyle === 'minimal-sling') {
      // Ultralight speed-climb diagonal daisy-chain accent & bungee cord
      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-packHalfW * 0.52, -13);
      ctx.lineTo(packHalfW * 0.48, -6);
      ctx.lineTo(-packHalfW * 0.45, 0.5);
      ctx.stroke();
    }

    // Top brain lid with dual buckle clasps
    ctx.fillStyle = skin.accent;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-packHalfW - 1.2, -23.5, (packHalfW + 1.2) * 2, 7.2, 3.6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-packHalfW * 0.52, -17.2, 2.4, 2.8);
    ctx.fillRect(packHalfW * 0.52 - 2.4, -17.2, 2.4, 2.8);

    ctx.restore();
  }

  // 3C-2. Optional Cairn-Style Backpack Exterior Gear Overlay (horizontal piton pole, rope coil, pouches)
  const backpackGearImg = artPack.anchorImgs.backpackGear;
  if (backpackGearImg) {
    const spec =
      artPack.definition.anchorParts?.backpackGear ?? DEFAULT_ANCHOR_SLOT_SPECS.backpackGear;
    drawAnchorPartSprite(
      ctx,
      backpackGearImg,
      spec,
      packOffsetX,
      packOffsetY - 6,
      0,
      1 - Math.abs(visTwist) * 0.14,
      1
    );
  }

  // 3D. Swinging Chalk Bag anchored to shifted lumbar belt
  const chalkBagImg = artPack.anchorImgs.chalkBag;
  if (chalkBagImg) {
    const spec = artPack.definition.anchorParts?.chalkBag ?? DEFAULT_ANCHOR_SLOT_SPECS.chalkBag;
    drawAnchorPartSprite(
      ctx,
      chalkBagImg,
      spec,
      localHipX + 9 * hipTwistScale,
      12 + localHipY,
      bagSwing,
      1,
      1
    );
  } else {
    ctx.save();
    ctx.translate(localHipX + 9 * hipTwistScale, 12 + localHipY);
    ctx.rotate(bagSwing);
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.roundRect(-4.2, 0, 8.6, 10.6, [2, 2, 3.8, 3.8]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skin.accent;
    ctx.fillRect(-3.4, 1.0, 7.0, 2.6);
    // Drawstring collar + subtle white chalk powder dust
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-4.0, -0.8, 8.2, 1.8);
    if (climber.chalk > 15) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(-1.2, 6.2, 1.1, 0, Math.PI * 2);
      ctx.arc(1.6, 7.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3E. Multi-Tail Wind-Fluttering Alpine Scarf
  const scarfImg = artPack.anchorImgs.scarf;
  if (scarfImg) {
    const spec = artPack.definition.anchorParts?.scarf ?? DEFAULT_ANCHOR_SLOT_SPECS.scarf;
    const scarfAngle = Math.sin(timeSec * 5.6) * 0.12 + windForce * 0.16;
    drawAnchorPartSprite(
      ctx,
      scarfImg,
      spec,
      -4 * shoulderTwistScale,
      -22,
      scarfAngle,
      1,
      1
    );
  } else {
    const scarfFlutter = Math.sin(timeSec * 6.5) * 4.5 + windForce * 15;
    const scarfFlutter2 = Math.cos(timeSec * 5.2 + 0.8) * 3.8 + windForce * 11;
    ctx.lineCap = 'round';

    // Secondary shorter under-tail for layered motion depth
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-2 * shoulderTwistScale, -22);
    ctx.quadraticCurveTo(
      -9 + scarfFlutter2 * 0.45,
      -16.5,
      -14.5 + scarfFlutter2 * 0.92,
      -6.5 + scarfFlutter * 0.2
    );
    ctx.stroke();
    ctx.strokeStyle = shadeHex(skin.scarf, -0.18);
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Primary flowing comic scarf tail
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(-4 * shoulderTwistScale, -22);
    ctx.quadraticCurveTo(
      -13 + scarfFlutter * 0.5,
      -18,
      -20.5 + scarfFlutter,
      -9.5 + scarfFlutter2 * 0.3
    );
    ctx.stroke();
    ctx.strokeStyle = skin.scarf;
    ctx.lineWidth = 3.1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5 * shoulderTwistScale, -22.5);
    ctx.quadraticCurveTo(-12 + scarfFlutter * 0.45, -19, -18 + scarfFlutter * 0.85, -11.5);
    ctx.stroke();

    // Cozy neck wrap collar
    ctx.fillStyle = skin.scarf;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-7.2 * shoulderTwistScale, -25.2, 14.4 * shoulderTwistScale, 4.6, 2.2);
    ctx.fill();
    ctx.stroke();
  }

  // 3F. Expressive Head, Neck, Hair & Style-Specific Headgear (with optional Cairn fatigue variants)
  const maxLimbStrain = Math.max(
    leftHand.strain,
    rightHand.strain,
    climber.limbs.leftFoot.strain,
    climber.limbs.rightFoot.strain
  );
  const headMood: CharacterHeadMood =
    climber.stamina < 25 ? 'exhausted' : maxLimbStrain > 0.6 ? 'strained' : 'calm';
  const headVariantImg = artPack.headVariantImgs[headMood] ?? artPack.headVariantImgs.calm;
  const headImg = headVariantImg ?? artPack.anchorImgs.head;
  if (headImg) {
    const spec =
      (headVariantImg ? artPack.definition.headVariants?.[headMood] : undefined) ??
      artPack.definition.anchorParts?.head ??
      DEFAULT_ANCHOR_SLOT_SPECS.head;
    drawAnchorPartSprite(
      ctx,
      headImg,
      spec,
      -visTwist * 1.8,
      -32.5,
      climber.lookAngle,
      1,
      1
    );
  } else {
    ctx.save();
    ctx.translate(-visTwist * 1.8, -32.5);
    ctx.rotate(climber.lookAngle);

    // Subtle neck & jawline peek (gives authentic human proportion from back-3/4 view)
    ctx.fillStyle = '#DDA98B';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-3.6, 5.2, 7.2, 5.6, 2.2);
    ctx.fill();
    ctx.stroke();

    // Side ear hints shifting subtly with lookAngle
    const earShift = Math.sin(climber.lookAngle) * 1.8;
    ctx.fillStyle = '#E5B497';
    ctx.beginPath();
    ctx.arc(-8.6 + earShift, 1.2, 2.2, 0, Math.PI * 2);
    ctx.arc(8.6 + earShift, 1.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head cranium & windswept dark hair silhouette
    ctx.fillStyle = '#2A221E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.95;
    ctx.beginPath();
    ctx.arc(0, 0, 9.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Windswept hair silhouette (crisp nape cut for male; swaying braided alpine ponytail for female)
    const hairSway = windForce * 1.8 + Math.sin(timeSec * 5.2) * 0.95;
    if (isFemale) {
      // Alpine ponytail / braid peeking cleanly below beanie or helmet
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 5.2);
      ctx.quadraticCurveTo(2.4 + hairSway * 0.5, 13.5, 5.2 + hairSway * 1.15, 21.2);
      ctx.stroke();

      ctx.strokeStyle = '#3B2C26';
      ctx.lineWidth = 3.8;
      ctx.stroke();

      // Hair tie accent band
      ctx.fillStyle = skin.accent;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(-2.0, 5.8, 4.4, 2.4, 1);
      ctx.fill();
      ctx.stroke();

      // Soft side strands framing neck
      ctx.fillStyle = '#3B2C26';
      ctx.beginPath();
      ctx.moveTo(-7.2, 3.6);
      ctx.quadraticCurveTo(-5.2, 10.6, -2.6, 8.8);
      ctx.quadraticCurveTo(0, 10.2, 3.4, 8.8);
      ctx.quadraticCurveTo(5.6, 10.4, 7.2, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#3B2F2A';
      ctx.beginPath();
      ctx.moveTo(-6.2, 4.2);
      ctx.quadraticCurveTo(-3 + hairSway * 0.3, 9.4, 0.8 + hairSway * 0.5, 8.6);
      ctx.quadraticCurveTo(4.8, 9.0, 6.4, 4.0);
      ctx.closePath();
      ctx.fill();
    }

    if (headgear === 'helmet') {
      // Alpine climbing helmet + ventilation slits + headlamp strap & lens
      ctx.fillStyle = skin.beanie;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -1.6, 10.2, Math.PI * 1.02, -Math.PI * 0.02);
      ctx.quadraticCurveTo(0, 1.2, -10.2, -1.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Helmet crown ridge & vents
      ctx.fillStyle = shadeHex(skin.beanie, 0.22);
      ctx.beginPath();
      ctx.ellipse(-2.2, -6.5, 4.2, 1.8, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5.2);
      ctx.lineTo(-4.2, -5.8);
      ctx.moveTo(4.2, -5.8);
      ctx.lineTo(6.5, -5.2);
      ctx.stroke();

      // Elastic headlamp band + glowing mini side/front clip
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-9.6, -2.2);
      ctx.quadraticCurveTo(0, -0.5, 9.6, -2.2);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-2.4 + earShift * 0.6, -3.5, 4.8, 2.8, 1);
      ctx.fill();
      ctx.stroke();
    } else if (headgear === 'pro-hood') {
      // Pro mountaineering storm hood + shell visor trim
      ctx.fillStyle = skin.jacket;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, -1.4, 10.4, Math.PI * 0.85, Math.PI * 0.15, false);
      ctx.quadraticCurveTo(6.5, 7.6, 0, 8.2);
      ctx.quadraticCurveTo(-6.5, 7.6, -9.2, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -1.6, 8.4, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    } else if (headgear === 'fur-beanie') {
      // Winter snow-ridge pom-pom beanie with Nordic contrast band
      ctx.fillStyle = skin.beanie;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -2.0, 9.8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nordic snow contrast band
      ctx.fillStyle = skin.scarf;
      ctx.fillRect(-8.8, -6.2, 17.6, 2.3);

      // Ribbed warm cuff
      ctx.fillStyle = shadeHex(skin.beanie, 0.16);
      ctx.beginPath();
      ctx.roundRect(-9.9, -4.2, 19.8, 3.8, 1.8);
      ctx.fill();
      ctx.stroke();

      // Fluffy snow pom-pom bouncing gently on crown
      const pomShift = windForce * 1.4 + Math.sin(timeSec * 6.2) * 0.6;
      ctx.fillStyle = '#FFF7ED';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pomShift * 0.5, -13.2, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (headgear === 'visor-cap') {
      // Retro outdoor climbing cap with curved brim & top button
      ctx.fillStyle = skin.beanie;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -2.0, 9.7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center crown panel stitch & button
      ctx.strokeStyle = shadeHex(skin.beanie, -0.25);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -11.5);
      ctx.lineTo(0, -3.2);
      ctx.stroke();
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.arc(0, -11.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Curved rear/side visor brim & adjustment strap
      ctx.fillStyle = shadeHex(skin.beanie, -0.2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-10.8, -4.0, 21.6, 3.3, 1.6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-3.6, -3.4, 7.2, 1.9);
    } else {
      // Classic ribbed alpine knit beanie (`beanie`) or expedition cuffed cap (`expedition-cap`)
      ctx.fillStyle = skin.beanie;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -2.2, 9.7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Knit rib lines
      ctx.strokeStyle = shadeHex(skin.beanie, -0.24);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-4.4, -10.4);
      ctx.lineTo(-5.0, -3.2);
      ctx.moveTo(0, -11.6);
      ctx.lineTo(0, -3.2);
      ctx.moveTo(4.4, -10.4);
      ctx.lineTo(5.0, -3.2);
      ctx.stroke();

      // Folded knit cuff
      ctx.fillStyle = shadeHex(skin.beanie, 0.12);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-9.8, -4.4, 19.6, 3.8, 1.8);
      ctx.fill();
      ctx.stroke();

      // Resting alpine snow goggles strapped across the cuff
      ctx.fillStyle = headgear === 'expedition-cap' ? '#F59E0B' : '#38BDF8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.roundRect(-6.8, -5.4, 5.8, 3.6, 1.5);
      ctx.roundRect(1.0, -5.4, 5.8, 3.6, 1.5);
      ctx.fill();
      ctx.stroke();
      // Lens glare highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-5.6, -4.3);
      ctx.lineTo(-3.4, -4.3);
      ctx.moveTo(2.2, -4.3);
      ctx.lineTo(4.4, -4.3);
      ctx.stroke();
    }

    // Crisp sunlit crown rim highlight
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.55;
    ctx.beginPath();
    ctx.arc(0, -2.2, 8.2, Math.PI * 1.08, Math.PI * 1.54);
    ctx.stroke();

    ctx.restore();
  }

  if (phase === 'SUMMIT') {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 1.6 * inkScale;
    ctx.beginPath();
    ctx.arc(0, -10, 44, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // Camera-facing foreground arm renders AFTER torso/pack when side-turned
  if (wallArmSide) {
    drawSingleArm(wallArmSide === 'left' ? 'right' : 'left');
  }
}
