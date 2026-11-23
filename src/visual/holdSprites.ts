import { ClimberState, Hold } from '../game/types';
import { DecodedArtPack } from './artPackAssets';

/**
 * Calibrated visual specification for each of the 10 transparent hold cutouts.
 * Both snow-ridge-granite and frost-crown-ice share identical silhouettes & numbering (0..9),
 * so the same contact anchor (anchorX, anchorY) aligns hands, feet, visible grip lip, and hitbox.
 */
export interface HoldSpriteSpec {
  /** 1-based catalog index matching art pack filenames 01..10 */
  catalogNumber: number;
  name: string;
  /** Normalized grip contact point X (0..1) mapped directly to hold.x */
  anchorX: number;
  /** Normalized grip contact point Y (0..1) mapped directly to hold.y */
  anchorY: number;
  /** Draw width as a multiple of hold.radius so visible rock matches gameplay hitbox radius */
  radiusToWidth: number;
  /** Base natural orientation offset in radians */
  baseRotationOffset: number;
}

export const HOLD_SPRITE_SPECS: readonly HoldSpriteSpec[] = [
  // 01-厚弧岩沿 (alpha wRatio 0.87): broad curved sunlit top ledge
  { catalogNumber: 1, name: '厚弧岩沿', anchorX: 0.56, anchorY: 0.36, radiusToWidth: 2.3, baseRotationOffset: 0 },
  // 02-薄片小边 (alpha wRatio 0.77): thin horizontal crimp lip
  { catalogNumber: 2, name: '薄片小边', anchorX: 0.5, anchorY: 0.49, radiusToWidth: 2.5, baseRotationOffset: 0 },
  // 03-三角捏点 (alpha wRatio 0.78): triangular pinch ridge
  { catalogNumber: 3, name: '三角捏点', anchorX: 0.51, anchorY: 0.46, radiusToWidth: 2.4, baseRotationOffset: 0 },
  // 04-圆头岩角 (alpha wRatio 0.75): protruding cylindrical horn
  { catalogNumber: 4, name: '圆头岩角', anchorX: 0.61, anchorY: 0.44, radiusToWidth: 2.45, baseRotationOffset: 0 },
  // 05-低弧斜面 (alpha wRatio 0.89): low rounded sloper
  { catalogNumber: 5, name: '低弧斜面', anchorX: 0.5, anchorY: 0.44, radiusToWidth: 2.28, baseRotationOffset: 0 },
  // 06-倒扣薄缘 (alpha wRatio 0.82): undercut lip edge
  { catalogNumber: 6, name: '倒扣薄缘', anchorX: 0.52, anchorY: 0.44, radiusToWidth: 2.38, baseRotationOffset: 0 },
  // 07-双层阶块 (alpha wRatio 0.78): stepped two-tier block
  { catalogNumber: 7, name: '双层阶块', anchorX: 0.54, anchorY: 0.42, radiusToWidth: 2.42, baseRotationOffset: 0 },
  // 08-竖向侧拉 (alpha hRatio 0.80): vertical sidepull blade
  { catalogNumber: 8, name: '竖向侧拉', anchorX: 0.48, anchorY: 0.48, radiusToWidth: 2.45, baseRotationOffset: 0 },
  // 09-月牙凹窝 (alpha wRatio 0.78): crescent pocket cup
  { catalogNumber: 9, name: '月牙凹窝', anchorX: 0.52, anchorY: 0.44, radiusToWidth: 2.4, baseRotationOffset: 0 },
  // 10-斜向裂缝 (alpha wRatio 0.70): angled crack seam
  { catalogNumber: 10, name: '斜向裂缝', anchorX: 0.5, anchorY: 0.5, radiusToWidth: 2.55, baseRotationOffset: 0 },
] as const;

function hashHoldId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mixHoldSpatialSeed(hold: Hold): number {
  const idHash = hashHoldId(hold.id);
  const rowMix = Math.imul(Math.round(hold.y / 28), 2654435761) >>> 0;
  const colMix = Math.imul(Math.round(hold.x / 22), 2246822519) >>> 0;
  const varMix = Math.imul(Math.abs(Math.floor(hold.shapeVariant)) + 1, 3266489917) >>> 0;
  return (idHash ^ rowMix ^ colMix ^ varMix) >>> 0;
}

/**
 * Deterministically picks one of the 10 transparent PNG sprites (0..9) from hold metadata.
 * Balances hold semantics with natural rock silhouette diversity so beginner routes never repeat
 * the same single hold silhouette in vertical columns.
 */
export function selectHoldSpriteIndex(hold: Hold): number {
  const seed = mixHoldSpatialSeed(hold);

  if (hold.type === 'crack') {
    return 9; // 10-斜向裂缝
  }
  if (hold.gripKind === 'sidepullLeft' || hold.gripKind === 'sidepullRight') {
    const pool = [7, 2, 3]; // 08-竖向侧拉, 03-三角捏点, 04-圆头岩角
    return pool[seed % pool.length];
  }
  if (hold.gripKind === 'undercling') {
    const pool = [5, 8, 1]; // 06-倒扣薄缘, 09-月牙凹窝, 02-薄片小边
    return pool[seed % pool.length];
  }

  switch (hold.type) {
    case 'jug': {
      const pool = [0, 6, 3, 8, 4, 2]; // 厚弧岩沿, 双层阶块, 圆头岩角, 月牙凹窝, 低弧斜面, 三角捏点
      return pool[seed % pool.length];
    }
    case 'ledge': {
      const pool = [6, 4, 1, 0, 5, 8]; // 双层阶块, 低弧斜面, 薄片小边, 厚弧岩沿, 倒扣薄缘, 月牙凹窝
      return pool[seed % pool.length];
    }
    case 'crimp': {
      const pool = [1, 5, 7, 2]; // 薄片小边, 倒扣薄缘, 竖向侧拉, 三角捏点
      return pool[seed % pool.length];
    }
    case 'fragile': {
      const pool = [1, 2, 5, 4]; // 薄片小边, 三角捏点, 倒扣薄缘, 低弧斜面
      return pool[seed % pool.length];
    }
    case 'ice': {
      const pool = [4, 8, 2, 1, 5]; // 低弧斜面, 月牙凹窝, 三角捏点, 薄片小边, 倒扣薄缘
      return pool[seed % pool.length];
    }
    case 'spring': {
      const pool = [6, 0, 4]; // 双层阶块, 厚弧岩沿, 低弧斜面
      return pool[seed % pool.length];
    }
    case 'swing': {
      const pool = [3, 8, 2]; // 圆头岩角, 月牙凹窝, 三角捏点
      return pool[seed % pool.length];
    }
    case 'tremor': {
      const pool = [2, 8, 7]; // 三角捏点, 月牙凹窝, 竖向侧拉
      return pool[seed % pool.length];
    }
    default:
      return seed % 10;
  }
}

/**
 * Computes natural rotation around the contact anchor (hold.x, hold.y) without ever shifting the hitbox.
 */
export function computeHoldVisualRotation(hold: Hold, spriteIdx: number): number {
  const spec = HOLD_SPRITE_SPECS[spriteIdx];
  // Gentle organic tilt variation keeps painted top-left lighting consistent while breaking grid rigidity
  const microTilt = (((hashHoldId(hold.id) % 19) - 9) / 9) * 0.14;
  const clampedAngle = Math.max(-0.38, Math.min(0.38, hold.angle + microTilt));
  if (hold.gripKind === 'sidepullLeft') {
    return clampedAngle * 0.45 - 0.14;
  }
  if (hold.gripKind === 'sidepullRight') {
    return clampedAngle * 0.45 + 0.14;
  }
  if (hold.gripKind === 'undercling') {
    return clampedAngle * 0.4;
  }
  return clampedAngle + spec.baseRotationOffset;
}

export interface HoldSpriteRenderContext {
  ctx: CanvasRenderingContext2D;
  pack: DecodedArtPack;
  hold: Hold;
  climber: ClimberState;
  timeSec: number;
  jitterAngle: number;
  isHovered: boolean;
  isSteppedOn: boolean;
  hoverHighlightColor: string | null;
  pureArtMode?: boolean;
}

/**
 * Draws the hold's transparent PNG rotated and scaled strictly around its contact anchor (0, 0),
 * plus subtle functional gameplay cues (spring, swing, tremor, hover outline).
 * Returns true if the PNG sprite was drawn, false if still decoding (caller may fall back).
 */
export function drawArtPackHold(opts: HoldSpriteRenderContext): boolean {
  const {
    ctx,
    pack,
    hold,
    climber,
    timeSec,
    jitterAngle,
    isHovered,
    isSteppedOn,
    hoverHighlightColor,
    pureArtMode = false,
  } = opts;

  const spriteIdx = selectHoldSpriteIndex(hold);
  // In pureArtMode (Intermediate+ & Roadbook), decoys use natural rock sprites so the true line is genuinely concealed
  const specialImg =
    !pureArtMode && hold.isDecoy
      ? pack.specialHoldImgs.decoy
      : hold.type === 'spring'
        ? pack.specialHoldImgs.spring
        : hold.type === 'swing'
          ? pack.specialHoldImgs.swing
          : hold.type === 'tremor'
            ? pack.specialHoldImgs.tremor
            : null;

  const rawImg = specialImg ?? pack.holdImgs[spriteIdx];
  const themedCanvas = !specialImg ? pack.routeHoldCanvases[spriteIdx] : null;
  const imgSource: HTMLImageElement | HTMLCanvasElement | null = themedCanvas ?? rawImg;
  const srcW =
    imgSource instanceof HTMLCanvasElement
      ? imgSource.width
      : imgSource?.naturalWidth ?? 0;
  const srcH =
    imgSource instanceof HTMLCanvasElement
      ? imgSource.height
      : imgSource?.naturalHeight ?? 0;
  if (!imgSource || srcW <= 0 || srcH <= 0) {
    return false;
  }

  const spec = HOLD_SPRITE_SPECS[spriteIdx];
  const r = hold.radius;
  const diegeticMinimal = pureArtMode || !!pack.urls.atmosphereGrade?.diegeticMinimalCues;
  // Subtle deterministic organic size variation (+/- 6%) strictly around contact anchor (0, 0)
  const scaleVar = 0.94 + ((hashHoldId(hold.id) >>> 4) % 13) * 0.01;
  const drawW = r * spec.radiusToWidth * scaleVar;
  const drawH = drawW * (srcH / srcW);
  const offsetX = -spec.anchorX * drawW;
  const offsetY = -spec.anchorY * drawH;
  const rotation = computeHoldVisualRotation(hold, spriteIdx) + jitterAngle;
  const flipX = !specialImg && hold.gripKind === 'sidepullRight' && spriteIdx === 7 ? -1 : 1;

  // 1. Special hold ambient rings drawn behind the hold sprite around contact anchor (0, 0)
  if (!diegeticMinimal) {
    if (hold.type === 'spring') {
      const footLoaded =
        climber.limbs.leftFoot.holdId === hold.id || climber.limbs.rightFoot.holdId === hold.id;
      const pulse = footLoaded ? 1 + Math.sin(timeSec * 8) * 0.12 : 1;
      ctx.save();
      ctx.strokeStyle = footLoaded ? 'rgba(163, 230, 53, 0.88)' : 'rgba(163, 230, 53, 0.42)';
      ctx.lineWidth = footLoaded ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, (r + 5) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (hold.type === 'swing') {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.56)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4.5, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.restore();
    } else if (hold.type === 'tremor') {
      const energy = hold.tremorEnergy ?? 0;
      const freq = hold.tremorFreq ?? 22;
      const seedPhase = hold.x * 0.13 + hold.y * 0.07;
      const wavePulse = 0.5 + 0.5 * Math.sin(timeSec * freq * 0.7 + seedPhase);
      if (isSteppedOn || energy > 0.04) {
        ctx.save();
        const arcAlpha = Math.min(0.95, 0.45 + energy * 0.5);
        ctx.strokeStyle =
          energy > 0.65
            ? `rgba(244, 63, 94, ${arcAlpha.toFixed(2)})`
            : `rgba(232, 121, 249, ${arcAlpha.toFixed(2)})`;
        ctx.lineWidth = 1.7 + energy * 1.1;
        ctx.lineCap = 'round';
        const spread1 = r + 4.5 + wavePulse * 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, spread1, Math.PI * 0.78, Math.PI * 1.22);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, spread1, -Math.PI * 0.22, Math.PI * 0.22);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 2. Transparent hold PNG anchored strictly at (0, 0) — uses each PNG's own painted rock collar & cast shadow
  ctx.save();
  ctx.rotate(rotation);
  if (flipX < 0) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(imgSource, offsetX, offsetY, drawW, drawH);

  // 2B. Cairn-style Tactile Hold State Overlays (chalk smudges, rain wetness, 3-stage rock fractures)
  const overlaySize = r * 2.25;
  const drawOverlay = (overlayImg: HTMLImageElement | null | undefined, alpha = 1) => {
    if (!overlayImg || overlayImg.naturalWidth <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(overlayImg, -overlaySize * 0.5, -overlaySize * 0.5, overlaySize, overlaySize);
    ctx.restore();
  };

  if (hold.wet) {
    drawOverlay(pack.holdOverlayImgs.wet, 0.9);
  }
  if (hold.chalked) {
    drawOverlay(pack.holdOverlayImgs.chalk, 0.95);
  }
  if (hold.type === 'fragile' && hold.crackProgress > 0.08) {
    const crackImg =
      hold.crackProgress > 0.68
        ? pack.holdOverlayImgs.crack3 ?? pack.holdOverlayImgs.crack2 ?? pack.holdOverlayImgs.crack1
        : hold.crackProgress > 0.34
          ? pack.holdOverlayImgs.crack2 ?? pack.holdOverlayImgs.crack1
          : pack.holdOverlayImgs.crack1;
    drawOverlay(crackImg, 0.95);
  }
  ctx.restore();

  // 3. Minimal readable tactile icons for special dynamic holds (anchored at contact point)
  if (!specialImg) {
    if (hold.type === 'spring') {
      ctx.save();
      ctx.strokeStyle = diegeticMinimal ? '#D9E4C7' : '#BEF264';
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 2);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(4, 2);
      ctx.moveTo(-3, -2.5);
      ctx.lineTo(0, -5.8);
      ctx.lineTo(3, -2.5);
      ctx.stroke();
      ctx.restore();
    } else if (hold.type === 'tremor' && (isSteppedOn || (hold.tremorEnergy ?? 0) > 0.1)) {
      const energy = hold.tremorEnergy ?? 0;
      ctx.save();
      ctx.strokeStyle = energy > 0.62 ? '#FFF1F2' : '#F5D0FE';
      ctx.lineWidth = 1.6 + energy * 0.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0);
      ctx.lineTo(-r * 0.16, -r * 0.26);
      ctx.lineTo(r * 0.14, r * 0.2);
      ctx.lineTo(r * 0.48, -r * 0.12);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Crisp hover/selection focus ring around contact hitbox
  if (isHovered && hoverHighlightColor) {
    ctx.save();
    ctx.strokeStyle = diegeticMinimal ? 'rgba(244, 241, 234, 0.85)' : hoverHighlightColor;
    ctx.lineWidth = diegeticMinimal ? 1.8 : 2.4;
    if (diegeticMinimal) {
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  return true;
}
