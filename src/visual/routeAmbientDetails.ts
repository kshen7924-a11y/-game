/**
 * Per-Route Ambient Detail Motion System & Swappable Texture Anchor Registry
 *
 * Pre-places living atmospheric motion details for all 11 real-world climbing routes
 * with calibrated altitude bands, cliff-edge/sky anchor zones, and wind/weather reactivity.
 *
 * Every detail is bound to a typed VfxSpriteKey in AssetRegistry (global vfx.* or
 * routeOverrides[routeId].vfx). When artists later supply transparent PNGs, the animations
 * automatically render the artist's sprites at these exact anchor positions without code edits;
 * until then, lightweight stylized procedural placeholders keep every route feeling alive.
 */

import type { VfxSpriteKey } from '../App';
import type { CameraState, RouteId } from '../game/types';
import { getCliffBounds, MountainWorld } from '../game/mountain';
import { DecodedVfxPack, drawVfxSprite } from './vfxArtAssets';
import { BlendedWeatherVisualState } from './weatherTransitions';

export type AmbientDetailZone =
  | 'leftCliffEdge'
  | 'rightCliffEdge'
  | 'bothCliffEdges'
  | 'summitCrest'
  | 'skyUpper'
  | 'fullParallax';

export type AmbientDetailMotion =
  | 'birdGlide'
  | 'leafFlutter'
  | 'waterfallMist'
  | 'cliffGrassSway'
  | 'eavesDrip'
  | 'cloudWisp'
  | 'stardustTwinkle'
  | 'sandDrift'
  | 'auroraWave'
  | 'iceCrystalGlint'
  | 'spindriftCascade'
  | 'bannerPlume'
  | 'dawnMoteRise'
  | 'sunShaftSweep';

export interface RouteAmbientDetailAnchor {
  id: string;
  label: string;
  vfxKey: VfxSpriteKey;
  zone: AmbientDetailZone;
  motion: AmbientDetailMotion;
  /** Normalized route altitude window (0 = start ledge, 1 = summit) */
  minAltRatio: number;
  maxAltRatio: number;
  /** Element instance count */
  count: number;
  /** Base visual scale multiplier */
  scale: number;
  /** Base opacity (0..1) */
  alpha: number;
  /** Tint RGB used ONLY by procedural placeholder fallback (ignored when PNG is supplied) */
  placeholderRgb: string;
  /** Optional secondary accent RGB for procedural placeholder */
  placeholderAccentRgb?: string;
}

/**
 * Curated per-route ambient detail anchors synchronized 1:1 with docs/FINAL_ART_ASSET_DELIVERY_SPEC.md
 */
export const ROUTE_AMBIENT_DETAILS: Record<RouteId, readonly RouteAmbientDetailAnchor[]> = {
  kids: [
    {
      id: 'kids-pollen',
      label: '晨光松林花尘',
      vfxKey: 'ambientDawnMote',
      zone: 'fullParallax',
      motion: 'dawnMoteRise',
      minAltRatio: 0,
      maxAltRatio: 0.92,
      count: 14,
      scale: 0.9,
      alpha: 0.42,
      placeholderRgb: '254, 240, 180',
    },
    {
      id: 'kids-birds',
      label: '优胜美地山谷飞燕',
      vfxKey: 'ambientBird',
      zone: 'skyUpper',
      motion: 'birdGlide',
      minAltRatio: 0.2,
      maxAltRatio: 0.98,
      count: 3,
      scale: 0.85,
      alpha: 0.56,
      placeholderRgb: '48, 62, 82',
    },
    {
      id: 'kids-waterfall',
      label: '远谷溪瀑薄雾',
      vfxKey: 'ambientWaterfallMist',
      zone: 'rightCliffEdge',
      motion: 'waterfallMist',
      minAltRatio: 0.35,
      maxAltRatio: 0.96,
      count: 3,
      scale: 1.0,
      alpha: 0.3,
      placeholderRgb: '240, 248, 255',
    },
  ],
  intro: [
    {
      id: 'intro-leaves',
      label: '新英格兰秋枫飘叶',
      vfxKey: 'ambientAutumnLeaf',
      zone: 'fullParallax',
      motion: 'leafFlutter',
      minAltRatio: 0.05,
      maxAltRatio: 0.85,
      count: 9,
      scale: 0.9,
      alpha: 0.62,
      placeholderRgb: '234, 118, 56',
      placeholderAccentRgb: '245, 184, 65',
    },
    {
      id: 'intro-grass',
      label: '白马岩缝迎风细草',
      vfxKey: 'ambientCliffGrass',
      zone: 'bothCliffEdges',
      motion: 'cliffGrassSway',
      minAltRatio: 0.08,
      maxAltRatio: 0.62,
      count: 5,
      scale: 0.92,
      alpha: 0.72,
      placeholderRgb: '116, 146, 102',
    },
    {
      id: 'intro-clouds',
      label: '白马脊晨雾游云',
      vfxKey: 'ambientCloudWisp',
      zone: 'skyUpper',
      motion: 'cloudWisp',
      minAltRatio: 0.42,
      maxAltRatio: 1.0,
      count: 4,
      scale: 1.0,
      alpha: 0.34,
      placeholderRgb: '238, 245, 252',
    },
  ],
  beginner: [
    {
      id: 'beginner-waterfall',
      label: '皇家拱门飞瀑银雾',
      vfxKey: 'ambientWaterfallMist',
      zone: 'leftCliffEdge',
      motion: 'waterfallMist',
      minAltRatio: 0.18,
      maxAltRatio: 0.92,
      count: 4,
      scale: 1.08,
      alpha: 0.34,
      placeholderRgb: '234, 244, 252',
    },
    {
      id: 'beginner-birds',
      label: '石拱游隼滑翔',
      vfxKey: 'ambientBird',
      zone: 'skyUpper',
      motion: 'birdGlide',
      minAltRatio: 0.3,
      maxAltRatio: 0.98,
      count: 3,
      scale: 0.95,
      alpha: 0.58,
      placeholderRgb: '56, 48, 44',
    },
    {
      id: 'beginner-shafts',
      label: '拱檐午后金晖光柱',
      vfxKey: 'sunShaft',
      zone: 'skyUpper',
      motion: 'sunShaftSweep',
      minAltRatio: 0.0,
      maxAltRatio: 0.88,
      count: 2,
      scale: 1.0,
      alpha: 0.18,
      placeholderRgb: '254, 232, 174',
    },
  ],
  'beginner-plus': [
    {
      id: 'bplus-leaves',
      label: '肖旺根克悬廊红枫叶',
      vfxKey: 'ambientAutumnLeaf',
      zone: 'fullParallax',
      motion: 'leafFlutter',
      minAltRatio: 0.08,
      maxAltRatio: 0.94,
      count: 11,
      scale: 0.95,
      alpha: 0.68,
      placeholderRgb: '217, 74, 46',
      placeholderAccentRgb: '245, 158, 11',
    },
    {
      id: 'bplus-grass',
      label: '绝崖岩缝风摆草丛',
      vfxKey: 'ambientCliffGrass',
      zone: 'bothCliffEdges',
      motion: 'cliffGrassSway',
      minAltRatio: 0.06,
      maxAltRatio: 0.65,
      count: 5,
      scale: 1.0,
      alpha: 0.76,
      placeholderRgb: '148, 124, 72',
    },
    {
      id: 'bplus-drips',
      label: '悬廊屋檐滴落水珠',
      vfxKey: 'ambientWaterDrip',
      zone: 'bothCliffEdges',
      motion: 'eavesDrip',
      minAltRatio: 0.42,
      maxAltRatio: 0.95,
      count: 6,
      scale: 1.0,
      alpha: 0.58,
      placeholderRgb: '196, 226, 248',
    },
  ],
  intermediate: [
    {
      id: 'inter-clouds',
      label: '半穹顶玫瑰云海丝带',
      vfxKey: 'ambientCloudWisp',
      zone: 'skyUpper',
      motion: 'cloudWisp',
      minAltRatio: 0.3,
      maxAltRatio: 1.0,
      count: 5,
      scale: 1.1,
      alpha: 0.38,
      placeholderRgb: '253, 224, 206',
    },
    {
      id: 'inter-birds',
      label: '高山金雕高空滑翔',
      vfxKey: 'ambientBird',
      zone: 'skyUpper',
      motion: 'birdGlide',
      minAltRatio: 0.45,
      maxAltRatio: 0.98,
      count: 2,
      scale: 1.15,
      alpha: 0.54,
      placeholderRgb: '44, 38, 48',
    },
    {
      id: 'inter-motes',
      label: '蛇脊斜阳浮金微尘',
      vfxKey: 'ambientDawnMote',
      zone: 'fullParallax',
      motion: 'dawnMoteRise',
      minAltRatio: 0.0,
      maxAltRatio: 0.92,
      count: 14,
      scale: 0.85,
      alpha: 0.36,
      placeholderRgb: '253, 212, 162',
    },
  ],
  'intermediate-plus': [
    {
      id: 'iplus-stardust',
      label: '月光拱壁星尘微光',
      vfxKey: 'ambientStardust',
      zone: 'fullParallax',
      motion: 'stardustTwinkle',
      minAltRatio: 0.0,
      maxAltRatio: 1.0,
      count: 20,
      scale: 1.0,
      alpha: 0.62,
      placeholderRgb: '220, 236, 255',
      placeholderAccentRgb: '186, 214, 255',
    },
    {
      id: 'iplus-sand',
      label: '纳瓦霍红砂岩细风沙',
      vfxKey: 'ambientSandDust',
      zone: 'bothCliffEdges',
      motion: 'sandDrift',
      minAltRatio: 0.12,
      maxAltRatio: 0.88,
      count: 6,
      scale: 1.0,
      alpha: 0.32,
      placeholderRgb: '214, 134, 96',
    },
  ],
  advanced: [
    {
      id: 'adv-embers',
      label: '晚霞琥珀流光微粒',
      vfxKey: 'ambientDawnMote',
      zone: 'fullParallax',
      motion: 'dawnMoteRise',
      minAltRatio: 0.05,
      maxAltRatio: 1.0,
      count: 16,
      scale: 0.92,
      alpha: 0.44,
      placeholderRgb: '252, 186, 114',
    },
    {
      id: 'adv-hawks',
      label: '魔鬼塔草原盘旋苍鹰',
      vfxKey: 'ambientBird',
      zone: 'skyUpper',
      motion: 'birdGlide',
      minAltRatio: 0.4,
      maxAltRatio: 1.0,
      count: 3,
      scale: 1.2,
      alpha: 0.58,
      placeholderRgb: '34, 28, 36',
    },
    {
      id: 'adv-sand',
      label: '玄武岩柱缝风尘',
      vfxKey: 'ambientSandDust',
      zone: 'bothCliffEdges',
      motion: 'sandDrift',
      minAltRatio: 0.08,
      maxAltRatio: 0.85,
      count: 6,
      scale: 0.96,
      alpha: 0.28,
      placeholderRgb: '176, 168, 184',
    },
  ],
  'advanced-crux': [
    {
      id: 'acrux-aurora',
      label: '极地淡青粉紫极光光带',
      vfxKey: 'ambientAuroraRibbon',
      zone: 'skyUpper',
      motion: 'auroraWave',
      minAltRatio: 0.42,
      maxAltRatio: 1.0,
      count: 2,
      scale: 1.0,
      alpha: 0.34,
      placeholderRgb: '126, 236, 214',
      placeholderAccentRgb: '226, 162, 232',
    },
    {
      id: 'acrux-crystals',
      label: '莲花塔钻石冰晶闪光',
      vfxKey: 'ambientIceCrystal',
      zone: 'fullParallax',
      motion: 'iceCrystalGlint',
      minAltRatio: 0.15,
      maxAltRatio: 1.0,
      count: 18,
      scale: 1.0,
      alpha: 0.56,
      placeholderRgb: '226, 244, 255',
    },
    {
      id: 'acrux-spindrift',
      label: '高塔棱脊迎风雪丝',
      vfxKey: 'ambientSpindrift',
      zone: 'rightCliffEdge',
      motion: 'spindriftCascade',
      minAltRatio: 0.38,
      maxAltRatio: 1.0,
      count: 4,
      scale: 0.92,
      alpha: 0.34,
      placeholderRgb: '238, 248, 255',
    },
  ],
  'master-1': [
    {
      id: 'm1-spindrift',
      label: '艾格北壁倾泻风吹雪流',
      vfxKey: 'ambientSpindrift',
      zone: 'bothCliffEdges',
      motion: 'spindriftCascade',
      minAltRatio: 0.1,
      maxAltRatio: 1.0,
      count: 7,
      scale: 1.15,
      alpha: 0.44,
      placeholderRgb: '236, 246, 255',
    },
    {
      id: 'm1-crystals',
      label: '白蜘蛛高寒冻晶微粒',
      vfxKey: 'ambientIceCrystal',
      zone: 'fullParallax',
      motion: 'iceCrystalGlint',
      minAltRatio: 0.0,
      maxAltRatio: 1.0,
      count: 20,
      scale: 0.96,
      alpha: 0.52,
      placeholderRgb: '214, 238, 255',
    },
  ],
  'master-2': [
    {
      id: 'm2-banner',
      label: '马特洪峰顶高山旗云雪羽',
      vfxKey: 'ambientBannerPlume',
      zone: 'summitCrest',
      motion: 'bannerPlume',
      minAltRatio: 0.62,
      maxAltRatio: 1.0,
      count: 3,
      scale: 1.15,
      alpha: 0.58,
      placeholderRgb: '236, 246, 255',
    },
    {
      id: 'm2-spindrift',
      label: '蓝冰肋条疾风雪流',
      vfxKey: 'ambientSpindrift',
      zone: 'bothCliffEdges',
      motion: 'spindriftCascade',
      minAltRatio: 0.1,
      maxAltRatio: 1.0,
      count: 6,
      scale: 1.08,
      alpha: 0.42,
      placeholderRgb: '216, 238, 255',
    },
    {
      id: 'm2-stars',
      label: '蓝调暮光寒星微辉',
      vfxKey: 'ambientStardust',
      zone: 'skyUpper',
      motion: 'stardustTwinkle',
      minAltRatio: 0.52,
      maxAltRatio: 1.0,
      count: 14,
      scale: 0.92,
      alpha: 0.5,
      placeholderRgb: '220, 236, 255',
    },
  ],
  'master-3': [
    {
      id: 'm3-dawn-motes',
      label: '黎明之墙破晓炽金浮光',
      vfxKey: 'ambientDawnMote',
      zone: 'fullParallax',
      motion: 'dawnMoteRise',
      minAltRatio: 0.0,
      maxAltRatio: 1.0,
      count: 20,
      scale: 1.05,
      alpha: 0.54,
      placeholderRgb: '255, 224, 174',
      placeholderAccentRgb: '253, 186, 146',
    },
    {
      id: 'm3-clouds',
      label: '酋长岩云海上升薄云',
      vfxKey: 'ambientCloudWisp',
      zone: 'bothCliffEdges',
      motion: 'cloudWisp',
      minAltRatio: 0.25,
      maxAltRatio: 1.0,
      count: 5,
      scale: 1.12,
      alpha: 0.36,
      placeholderRgb: '254, 226, 204',
    },
    {
      id: 'm3-shafts',
      label: '破晓穿云金色体积光柱',
      vfxKey: 'sunShaft',
      zone: 'skyUpper',
      motion: 'sunShaftSweep',
      minAltRatio: 0.56,
      maxAltRatio: 1.0,
      count: 3,
      scale: 1.15,
      alpha: 0.24,
      placeholderRgb: '254, 228, 172',
    },
  ],
};

function smoothBandEnvelope(altRatio: number, minAlt: number, maxAlt: number): number {
  const feather = 0.08;
  if (altRatio < minAlt - feather || altRatio > maxAlt + feather) return 0;
  const enter = minAlt <= 0 ? 1 : Math.min(1, Math.max(0, (altRatio - (minAlt - feather)) / feather));
  const exit = maxAlt >= 1 ? 1 : Math.min(1, Math.max(0, ((maxAlt + feather) - altRatio) / feather));
  return enter * exit;
}

function wrap(val: number, span: number): number {
  return ((val % span) + span) % span;
}

function hashSeed(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Renders world-space anchored ambient details along left/right cliff flanks and summit crest
 * (swaying cliff grass, roof water drips, waterfall mist, spindrift chutes, summit banner plume).
 * Must be called INSIDE the active world-space camera transform.
 */
export function drawRouteAmbientWorldDetails(
  ctx: CanvasRenderingContext2D,
  world: MountainWorld,
  timeSec: number,
  windForce: number,
  altRatio: number,
  vfxPack: DecodedVfxPack,
  baseAlpha: number
): void {
  if (baseAlpha <= 0.03) return;
  const details = ROUTE_AMBIENT_DETAILS[world.route.id];
  if (!details || details.length === 0) return;

  const hTotal = world.mountainHeight;
  const summitLedge = world.ledges.find((l) => l.isSummit);

  ctx.save();
  for (let dIdx = 0; dIdx < details.length; dIdx++) {
    const d = details[dIdx];
    const isWorldAnchored =
      d.zone === 'leftCliffEdge' ||
      d.zone === 'rightCliffEdge' ||
      d.zone === 'bothCliffEdges' ||
      d.zone === 'summitCrest';
    if (!isWorldAnchored) continue;

    const bandAlpha = smoothBandEnvelope(altRatio, d.minAltRatio, d.maxAltRatio) * d.alpha * baseAlpha;
    if (bandAlpha <= 0.01) continue;

    if (d.zone === 'summitCrest' && d.motion === 'bannerPlume' && summitLedge) {
      const peakX = summitLedge.x;
      const peakY = summitLedge.y - 24;
      const dir = windForce >= -0.05 ? 1 : -1;
      for (let i = 0; i < d.count; i++) {
        const wave = Math.sin(timeSec * (1.8 + i * 0.4) + i * 2.1);
        const plumeW = (240 + i * 55) * d.scale;
        const plumeH = (64 + i * 16) * d.scale;
        const px = peakX + dir * (16 + i * 22);
        const py = peakY - 12 - i * 10 + wave * 6;
        const a = bandAlpha * (0.85 - i * 0.18);

        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          px,
          py,
          plumeW,
          plumeH,
          dir * (-0.06 + wave * 0.04),
          a,
          dir,
          1
        );
        if (!drew) {
          ctx.save();
          const grad = ctx.createLinearGradient(px, py, px + dir * plumeW, py - 24);
          grad.addColorStop(0, `rgba(${d.placeholderRgb}, ${(a * 0.72).toFixed(3)})`);
          grad.addColorStop(0.5, `rgba(${d.placeholderRgb}, ${(a * 0.36).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${d.placeholderRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(px, py - 6);
          ctx.quadraticCurveTo(
            px + dir * plumeW * 0.45,
            py - 28 + wave * 12,
            px + dir * plumeW,
            py - 12 + wave * 18
          );
          ctx.quadraticCurveTo(
            px + dir * plumeW * 0.5,
            py + 20 + wave * 8,
            px,
            py + 10
          );
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      continue;
    }

    for (let i = 0; i < d.count; i++) {
      const t = (i + 0.5) / Math.max(1, d.count);
      const ratio = d.minAltRatio + (d.maxAltRatio - d.minAltRatio) * t;
      const anchorY = -ratio * hTotal;
      const bounds = getCliffBounds(anchorY, hTotal);
      const side: -1 | 1 =
        d.zone === 'leftCliffEdge'
          ? -1
          : d.zone === 'rightCliffEdge'
            ? 1
            : i % 2 === 0
              ? -1
              : 1;
      const anchorX = side < 0 ? bounds.left + 12 : bounds.right - 12;

      if (d.motion === 'cliffGrassSway') {
        const sway = Math.sin(timeSec * (2.6 + i * 0.4) + i * 1.9) * 0.16 + windForce * 0.28;
        const w = 44 * d.scale;
        const h = 34 * d.scale;
        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          anchorX,
          anchorY,
          w,
          h,
          sway,
          bandAlpha,
          side < 0 ? 1 : -1,
          1
        );
        if (!drew) {
          ctx.save();
          ctx.translate(anchorX, anchorY);
          ctx.scale(side < 0 ? 1 : -1, 1);
          ctx.strokeStyle = `rgba(${d.placeholderRgb}, ${bandAlpha.toFixed(3)})`;
          ctx.lineCap = 'round';
          for (let b = 0; b < 4; b++) {
            const len = 14 + (b % 3) * 7;
            const ang = -0.75 + b * 0.28 + sway;
            ctx.lineWidth = 2.1 - b * 0.25;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(
              Math.cos(ang) * len * 0.6,
              Math.sin(ang) * len * 0.7 - 3,
              Math.cos(ang + sway * 0.4) * len,
              Math.sin(ang + sway * 0.4) * len
            );
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (d.motion === 'eavesDrip') {
        const cycle = (timeSec * (0.72 + (i % 3) * 0.18) + i * 0.37) % 1;
        const dropY = anchorY + cycle * cycle * 95;
        const dropX = anchorX + side * -18 + windForce * cycle * 18;
        const dropAlpha = bandAlpha * (cycle < 0.12 ? cycle / 0.12 : 1 - cycle * 0.85);
        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          dropX,
          dropY,
          10 * d.scale,
          24 * d.scale,
          windForce * 0.12,
          dropAlpha
        );
        if (!drew) {
          ctx.save();
          ctx.fillStyle = `rgba(${d.placeholderRgb}, ${dropAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(dropX, dropY, 1.8 * d.scale, 5.5 * d.scale, windForce * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (d.motion === 'waterfallMist') {
        const driftY = ((timeSec * (26 + i * 5) + i * 67) % 160) - 80;
        const px = anchorX + side * 42 + Math.sin(timeSec * 0.7 + i) * 14;
        const py = anchorY + driftY;
        const w = 150 * d.scale;
        const h = 210 * d.scale;
        const pulse = 0.75 + 0.25 * Math.sin(timeSec * 0.9 + i * 2.3);
        const a = bandAlpha * pulse;
        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, px, py, w, h, 0, a);
        if (!drew) {
          ctx.save();
          const grad = ctx.createRadialGradient(px, py, 8, px, py, w * 0.65);
          grad.addColorStop(0, `rgba(${d.placeholderRgb}, ${(a * 0.6).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${d.placeholderRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(px, py, w * 0.55, h * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (d.motion === 'spindriftCascade' || d.motion === 'sandDrift') {
        const isSand = d.motion === 'sandDrift';
        const cycle = (timeSec * (isSand ? 0.55 : 0.85) + i * 0.31) % 1;
        const dir = windForce >= 0 ? 1 : -1;
        const px = anchorX + side * -12 + dir * cycle * (isSand ? 70 : 120);
        const py = anchorY + cycle * (isSand ? 35 : 140);
        const a = bandAlpha * Math.sin(cycle * Math.PI);
        const w = (isSand ? 48 : 130) * d.scale;
        const h = (isSand ? 20 : 48) * d.scale;
        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          px,
          py,
          w,
          h,
          dir * (isSand ? 0.22 : 0.52),
          a,
          dir,
          1
        );
        if (!drew) {
          ctx.save();
          ctx.strokeStyle = `rgba(${d.placeholderRgb}, ${(a * 0.72).toFixed(3)})`;
          ctx.lineWidth = isSand ? 2.2 : 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - dir * w * 0.35, py - h * 0.35);
          ctx.quadraticCurveTo(px, py + 6, px + dir * w * 0.45, py + h * 0.4);
          ctx.stroke();
          ctx.restore();
        }
      } else if (d.motion === 'cloudWisp') {
        const driftX = Math.sin(timeSec * 0.28 + i * 2.1) * 48 + windForce * 28;
        const px = anchorX + side * 34 + driftX;
        const py = anchorY;
        const w = 220 * d.scale;
        const h = 76 * d.scale;
        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, px, py, w, h, 0, bandAlpha);
        if (!drew) {
          ctx.save();
          const grad = ctx.createRadialGradient(px, py, 10, px, py, w * 0.5);
          grad.addColorStop(0, `rgba(${d.placeholderRgb}, ${(bandAlpha * 0.55).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${d.placeholderRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(px, py, w * 0.5, h * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
  ctx.restore();
}

/**
 * Renders screen-space / camera-parallaxed per-route ambient details
 * (gliding birds, fluttering autumn leaves, aurora ribbons, ice crystal glints,
 * moonlit stardust, rising dawn motes, drifting cloud wisps & sun shafts).
 */
export function drawRouteAmbientScreenDetails(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: MountainWorld,
  camera: CameraState,
  timeSec: number,
  windForce: number,
  altRatio: number,
  blendedWeather: BlendedWeatherVisualState,
  vfxPack: DecodedVfxPack,
  baseAlpha: number
): void {
  if (baseAlpha <= 0.03) return;
  const details = ROUTE_AMBIENT_DETAILS[world.route.id];
  if (!details || details.length === 0) return;

  const spanW = width + 180;
  const spanH = height + 180;
  const clearVisibility = Math.max(0.25, 1 - blendedWeather.fogOpacity * 0.72);

  ctx.save();
  for (let dIdx = 0; dIdx < details.length; dIdx++) {
    const d = details[dIdx];
    if (d.zone !== 'skyUpper' && d.zone !== 'fullParallax') continue;

    const bandAlpha = smoothBandEnvelope(altRatio, d.minAltRatio, d.maxAltRatio) * d.alpha * baseAlpha;
    if (bandAlpha <= 0.01) continue;

    if (d.motion === 'birdGlide') {
      const a = bandAlpha * clearVisibility;
      if (a <= 0.02) continue;
      for (let i = 0; i < d.count; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = (26 + i * 9) * dir;
        const sx = wrap(hashSeed(i * 13 + dIdx) * spanW + timeSec * speed - camera.x * 0.14, spanW) - 90;
        const sy =
          height * (0.1 + hashSeed(i * 29 + 3) * 0.24) +
          Math.sin(timeSec * (1.2 + i * 0.35) + i * 2.2) * 14;
        const flap = Math.sin(timeSec * (5.5 + i * 0.9) + i * 1.7);
        const w = 36 * d.scale;
        const h = 16 * d.scale;

        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          sx,
          sy,
          w,
          h,
          dir * 0.05,
          a,
          dir,
          0.75 + flap * 0.28
        );
        if (!drew) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(dir * d.scale, d.scale);
          ctx.strokeStyle = `rgba(${d.placeholderRgb}, ${a.toFixed(3)})`;
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-12, flap * 4);
          ctx.quadraticCurveTo(-5, -5 - flap * 2, 0, 0);
          ctx.quadraticCurveTo(5, -5 - flap * 2, 12, flap * 4);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (d.motion === 'leafFlutter') {
      for (let i = 0; i < d.count; i++) {
        const f1 = hashSeed(i * 19 + dIdx * 7);
        const f2 = hashSeed(i * 43 + 11);
        const depth = 0.45 + (i % 3) * 0.25;
        const sx =
          wrap(
            f1 * spanW +
              timeSec * (24 + windForce * 62) * depth +
              Math.sin(timeSec * (1.6 + f2) + i) * 22 -
              camera.x * 0.3 * depth,
            spanW
          ) - 90;
        const sy =
          wrap(
            f2 * spanH +
              timeSec * (34 + f1 * 20) * depth +
              Math.cos(timeSec * 1.9 + i * 1.7) * 12 -
              camera.y * 0.3 * depth,
            spanH
          ) - 90;
        const rot = timeSec * (1.4 + f1) + i * 2.1;
        const flutterY = 0.55 + 0.45 * Math.abs(Math.sin(timeSec * 3.2 + i));
        const sz = (12 + f2 * 7) * d.scale * (0.7 + depth * 0.35);

        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, sx, sy, sz, sz, rot, bandAlpha, 1, flutterY);
        if (!drew) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(rot);
          ctx.scale(1, flutterY);
          const col = i % 2 === 0 ? d.placeholderRgb : d.placeholderAccentRgb ?? d.placeholderRgb;
          ctx.fillStyle = `rgba(${col}, ${bandAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * 0.48, sz * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (d.motion === 'auroraWave') {
      const a = bandAlpha * clearVisibility;
      if (a <= 0.02) continue;
      for (let i = 0; i < d.count; i++) {
        const py = height * (0.14 + i * 0.12) + Math.sin(timeSec * 0.35 + i * 2.2) * 14;
        const px = width * 0.5 + Math.sin(timeSec * 0.22 + i) * width * 0.12;
        const w = width * 1.15;
        const h = 150 * d.scale;
        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, px, py, w, h, Math.sin(timeSec * 0.25 + i) * 0.04, a);
        if (!drew) {
          ctx.save();
          const col = i % 2 === 0 ? d.placeholderRgb : d.placeholderAccentRgb ?? d.placeholderRgb;
          const grad = ctx.createLinearGradient(0, py - h * 0.4, width, py + h * 0.4);
          grad.addColorStop(0, `rgba(${col}, 0)`);
          grad.addColorStop(0.32, `rgba(${col}, ${(a * 0.48).toFixed(3)})`);
          grad.addColorStop(0.68, `rgba(${col}, ${(a * 0.36).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${col}, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 28 + i * 12;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-20, py + Math.sin(timeSec * 0.5 + i) * 16);
          ctx.bezierCurveTo(
            width * 0.3,
            py - 28 + Math.cos(timeSec * 0.4 + i) * 18,
            width * 0.7,
            py + 26 + Math.sin(timeSec * 0.45 + i) * 18,
            width + 20,
            py - 8
          );
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (d.motion === 'sunShaftSweep') {
      const a = bandAlpha * clearVisibility * (1 + blendedWeather.sunbreakBlend * 0.55);
      if (a <= 0.015) continue;
      for (let i = 0; i < d.count; i++) {
        const sway = Math.sin(timeSec * 0.32 + i * 2.4) * 32;
        const sx = width * (0.24 + i * 0.28) + sway;
        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, sx, -20, 240 * d.scale, height * 0.95, 0.22, a);
        if (!drew) {
          ctx.save();
          const grad = ctx.createLinearGradient(sx, 0, sx + width * 0.34, height * 0.85);
          grad.addColorStop(0, `rgba(${d.placeholderRgb}, ${(a * 0.85).toFixed(3)})`);
          grad.addColorStop(0.55, `rgba(${d.placeholderRgb}, ${(a * 0.28).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${d.placeholderRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(sx - 45, 0);
          ctx.lineTo(sx + 65, 0);
          ctx.lineTo(sx + width * 0.42, height * 0.92);
          ctx.lineTo(sx + width * 0.16, height * 0.92);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (d.motion === 'cloudWisp') {
      for (let i = 0; i < d.count; i++) {
        const f1 = hashSeed(i * 31 + dIdx);
        const speed = (14 + f1 * 14 + windForce * 22) * (0.5 + (i % 2) * 0.4);
        const sx = wrap(f1 * (width + 320) + timeSec * speed - camera.x * 0.18, width + 320) - 160;
        const sy = height * (0.1 + (i / Math.max(1, d.count)) * 0.35) + Math.sin(timeSec * 0.4 + i) * 14;
        const w = (180 + f1 * 110) * d.scale;
        const h = w * 0.34;
        const drew = drawVfxSprite(ctx, vfxPack, d.vfxKey, sx, sy, w, h, 0, bandAlpha);
        if (!drew) {
          ctx.save();
          const grad = ctx.createRadialGradient(sx, sy, 8, sx, sy, w * 0.5);
          grad.addColorStop(0, `rgba(${d.placeholderRgb}, ${(bandAlpha * 0.52).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${d.placeholderRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(sx, sy, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else {
      // stardustTwinkle / iceCrystalGlint / dawnMoteRise
      const isIce = d.motion === 'iceCrystalGlint';
      const isStar = d.motion === 'stardustTwinkle';
      const verticalZoneMax = d.zone === 'skyUpper' ? height * 0.48 : spanH;
      for (let i = 0; i < d.count; i++) {
        const f1 = hashSeed(i * 17 + dIdx * 5);
        const f2 = hashSeed(i * 53 + 7);
        const depth = 0.3 + (i % 3) * 0.26;
        const sx =
          wrap(
            f1 * spanW +
              timeSec * (isStar ? 3 : 8 + windForce * 18) * depth +
              Math.sin(timeSec * 0.8 + i * 1.9) * 12 -
              camera.x * 0.24 * depth,
            spanW
          ) - 90;
        const sy =
          wrap(
            f2 * verticalZoneMax +
              timeSec * (isIce ? 12 : -9) * depth -
              camera.y * 0.24 * depth,
            verticalZoneMax
          ) - (d.zone === 'skyUpper' ? 0 : 90);
        const twinkle = 0.35 + 0.65 * Math.sin(timeSec * (1.8 + f1 * 2.2) + i * 2.7);
        const a = bandAlpha * twinkle * (isStar ? clearVisibility : 1);
        const sz = (isIce || isStar ? 10 : 8) * d.scale * (0.65 + f2 * 0.6);

        const drew = drawVfxSprite(
          ctx,
          vfxPack,
          d.vfxKey,
          sx,
          sy,
          sz,
          sz,
          isIce ? timeSec * 0.8 + i : 0,
          a
        );
        if (!drew) {
          const col = i % 3 === 0 && d.placeholderAccentRgb ? d.placeholderAccentRgb : d.placeholderRgb;
          const r = sz * 0.22;
          ctx.save();
          ctx.fillStyle = `rgba(${col}, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
          if ((isIce || isStar) && twinkle > 0.78) {
            ctx.strokeStyle = `rgba(${col}, ${(a * 0.85).toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(sx - r * 2.6, sy);
            ctx.lineTo(sx + r * 2.6, sy);
            ctx.moveTo(sx, sy - r * 2.6);
            ctx.lineTo(sx, sy + r * 2.6);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  }
  ctx.restore();
}
