import { CameraState, GamePhase } from '../game/types';
import { MountainWorld } from '../game/mountain';
import { DecodedArtPack } from './artPackAssets';
import { RouteArtTheme } from './routeArtThemes';
import { DecodedVfxPack, drawVfxSprite } from './vfxArtAssets';
import { computeWideRestingGeometry } from './summitSequence';

export interface SceneLayoutMetrics {
  /** Constant world-space width of one 9:16 wall plate for the current viewport */
  plateWorldW: number;
  /** Constant world-space height of one 9:16 wall plate */
  plateWorldH: number;
  /** World Y of the top edge of 01-start plate */
  startPlateTopY: number;
  /** World Y of the bottom edge of 01-start plate */
  startPlateBottomY: number;
  /** World X of the summit peak standing spot */
  summitPeakX: number;
  /** World Y of the summit peak standing surface */
  summitPeakTopY: number;
  /** World Y of the top edge of 03-summit-near plate */
  summitPlateTopY: number;
  /** World Y of the bottom edge of 03-summit-near plate */
  summitPlateBottomY: number;
  /** World X left edge of 03-summit-near plate aligned to summitPeakX */
  summitPlateLeftX: number;
}

const BASE_CLIMBER_FOOT_WORLD_Y = 0;

function smootherstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Computes consistent world-space geometry shared across Starting Ledge (01),
 * Seamless Climbing Wall (02), and Near-Summit Crest (03) so rock texture scale
 * stays continuous from start to summit on both short and tall routes.
 */
export function computeSceneLayout(
  width: number,
  world: MountainWorld,
  pack: DecodedArtPack
): SceneLayoutMetrics {
  const baseZoom = Math.min(1.04, Math.max(0.68, width / 440));
  const plateWorldW = Math.min(920, Math.max(600, (width / baseZoom) * 1.36));
  const aspectHOverW = 1672 / 940;
  const plateWorldH = plateWorldW * aspectHOverW;

  const { startShelfSurfaceRatioY, summitStandingRatioX, summitStandingRatioY } =
    pack.urls.metrics;

  const startPlateTopY = BASE_CLIMBER_FOOT_WORLD_Y - plateWorldH * startShelfSurfaceRatioY;
  const startPlateBottomY = startPlateTopY + plateWorldH;

  const summitLedge = world.ledges.find((l) => l.isSummit);
  const summitPeakX = summitLedge?.x ?? 0;
  const summitPeakTopY = (summitLedge?.y ?? -world.mountainHeight) - 15;
  const summitPlateTopY = summitPeakTopY - plateWorldH * summitStandingRatioY;
  const summitPlateBottomY = summitPlateTopY + plateWorldH;
  const summitPlateLeftX = summitPeakX - plateWorldW * summitStandingRatioX;

  return {
    plateWorldW,
    plateWorldH,
    startPlateTopY,
    startPlateBottomY,
    summitPeakX,
    summitPeakTopY,
    summitPlateTopY,
    summitPlateBottomY,
    summitPlateLeftX,
  };
}

/**
 * Pure visual fade controller for Route-Reading mode (0 = full climbing scene, 1 = pure holds view).
 */
const routeReadVisualState = {
  fade: 0,
  lastTimeSec: 0,
};

export function advanceRouteReadFade(isReadingRoute: boolean, timeSec: number): number {
  const dt = Math.max(0, Math.min(0.08, timeSec - routeReadVisualState.lastTimeSec));
  routeReadVisualState.lastTimeSec = timeSec;
  const target = isReadingRoute ? 1 : 0;
  const speed = 6.5;
  if (dt <= 0) {
    routeReadVisualState.fade = target;
  } else {
    const diff = target - routeReadVisualState.fade;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * speed);
    routeReadVisualState.fade = Math.max(0, Math.min(1, routeReadVisualState.fade + step));
  }
  return routeReadVisualState.fade;
}

/**
 * Screen-space pure route-reading backdrop drawn behind holds when routeReadFade > 0.
 */
export function drawRouteReadingBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  routeReadFade: number
): void {
  if (routeReadFade <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = routeReadFade;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0D131D');
  bgGrad.addColorStop(0.55, '#131C2B');
  bgGrad.addColorStop(1, '#0F1724');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const gridSpacingPx = Math.max(44, 90 * camera.zoom);
  const offsetY =
    (((height * 0.52 - camera.y * camera.zoom) % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = offsetY; y < height; y += gridSpacingPx) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Paints each route's bespoke romantic sky, celestial light, misty distant alpine sea-of-clouds,
 * and sculptural iconic summit formation directly beneath the climber's summit crest.
 * Blends seamlessly downward into the route-themed climbing wall so every route has a unique,
 * unforgettable approach to its summit.
 */
function drawRouteNearSummitVista(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayoutMetrics,
  viewLeftX: number,
  viewRightX: number,
  viewTopY: number,
  theme: RouteArtTheme,
  timeSec: number
): void {
  const { summitPeakX, summitPeakTopY, plateWorldW, plateWorldH } = layout;
  const spanLeft = Math.min(viewLeftX - 180, summitPeakX - plateWorldW * 1.15);
  const spanRight = Math.max(viewRightX + 180, summitPeakX + plateWorldW * 1.15);
  const spanW = spanRight - spanLeft;

  const skyTopY = Math.min(viewTopY - 260, summitPeakTopY - plateWorldH * 0.85);
  const horizonY = summitPeakTopY + 135;
  const rockFadeBottomY = summitPeakTopY + 280;

  ctx.save();

  // 1. Romantic Multi-Stop Painterly Sky
  const skyGrad = ctx.createLinearGradient(0, skyTopY, 0, horizonY + 80);
  skyGrad.addColorStop(0, theme.skyTopColor);
  skyGrad.addColorStop(0.58, theme.skyMidColor);
  skyGrad.addColorStop(0.92, theme.skyHorizonColor);
  skyGrad.addColorStop(1, theme.wallFallbackColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(spanLeft, skyTopY, spanW, horizonY + 80 - skyTopY);

  // 2. Delicate Twilight Stars (for Moonlight Buttress & Matterhorn North Face)
  if (theme.hasStars) {
    ctx.save();
    for (let i = 0; i < 42; i++) {
      const h = ((i * 2654435761) ^ 0x9e3779b9) >>> 0;
      const sx = summitPeakX + (((h % 1000) / 1000) - 0.5) * Math.max(plateWorldW * 1.6, spanW * 0.9);
      const sy = summitPeakTopY - 90 - (((h >>> 10) % 1000) / 1000) * (plateWorldH * 0.56);
      const twinkle = 0.45 + 0.55 * Math.sin(timeSec * (1.2 + (i % 5) * 0.35) + i * 1.9);
      const sr = 0.9 + (i % 3) * 0.65;
      ctx.fillStyle = `rgba(240, 248, 255, ${(0.72 * twinkle).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Celestial Light Source (Sunburst or Glowing Silver Crescent Moon) + Soft Volumetric Rays
  const celX = summitPeakX + (theme.sunOrMoonPos.x - 0.5) * plateWorldW * 0.95;
  const celY = summitPeakTopY - 260 + (theme.sunOrMoonPos.y - 0.25) * 320;

  const haloGrad = ctx.createRadialGradient(celX, celY, 12, celX, celY, 260);
  haloGrad.addColorStop(0, theme.sunOrMoonColor);
  haloGrad.addColorStop(0.28, theme.bloomColor);
  haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(celX, celY, 260, 0, Math.PI * 2);
  ctx.fill();

  if (theme.isMoonlit) {
    // Luminous crescent moon
    ctx.save();
    ctx.fillStyle = '#E8F7FF';
    ctx.beginPath();
    ctx.arc(celX, celY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.skyTopColor;
    ctx.beginPath();
    ctx.arc(celX - 9, celY - 5, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Radiant sunlit disc
    ctx.fillStyle = 'rgba(255, 252, 236, 0.92)';
    ctx.beginPath();
    ctx.arc(celX, celY, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft angled atmospheric light shafts
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const angle = -0.35 + i * 0.24 + Math.sin(timeSec * 0.25 + i) * 0.025;
    const shimmer = 0.84 + 0.16 * Math.sin(timeSec * 0.55 + i * 1.4);
    const len = 540;
    const dx = Math.sin(angle) * len;
    const dy = Math.cos(angle) * len;
    const rayGrad = ctx.createLinearGradient(celX, celY, celX + dx, celY + dy);
    rayGrad.addColorStop(0, `rgba(${theme.godRayColor}, ${(0.22 * shimmer).toFixed(3)})`);
    rayGrad.addColorStop(1, `rgba(${theme.godRayColor}, 0)`);
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(celX - 18, celY);
    ctx.lineTo(celX + 18, celY);
    ctx.lineTo(celX + dx + 86, celY + dy);
    ctx.lineTo(celX + dx - 86, celY + dy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Distant Romantic Mountain Ranges & Billowing Illuminated Sea of Clouds
  const drawMountainRange = (yBase: number, amp: number, color: string, seedOffset: number) => {
    ctx.beginPath();
    ctx.moveTo(spanLeft, horizonY + 120);
    const step = 64;
    for (let x = spanLeft; x <= spanRight + step; x += step) {
      const n1 = Math.sin(x * 0.0042 + seedOffset) * amp;
      const n2 = Math.cos(x * 0.0115 - seedOffset * 1.3) * (amp * 0.42);
      const n3 = Math.sin(x * 0.023 + seedOffset * 2.1) * (amp * 0.16);
      ctx.lineTo(x, yBase - Math.abs(n1 + n2) + n3);
    }
    ctx.lineTo(spanRight + step, horizonY + 120);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  drawMountainRange(summitPeakTopY + 52, 86, theme.distantRangeFarColor, 1.4);
  drawMountainRange(summitPeakTopY + 88, 62, theme.distantRangeNearColor, 3.8);

  // Soft billowing backlit cloud sea nestled along the valley horizon
  ctx.save();
  for (let i = -6; i <= 6; i++) {
    const drift = Math.sin(timeSec * 0.14 + i * 0.9) * 14;
    const cx = summitPeakX + i * 112 + drift;
    const cy = summitPeakTopY + 72 + Math.sin(i * 1.7) * 18;
    const rx = 86 + (Math.abs(i * 19) % 44);
    const ry = 26 + (Math.abs(i * 13) % 16);
    const cGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    cGrad.addColorStop(0, theme.cloudHighlightColor);
    cGrad.addColorStop(1, theme.cloudShadowColor);
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Iconic Route-Specific Sculptural Summit Crest Formation (Directly supporting summitPeakX, summitPeakTopY)
  const px = summitPeakX;
  const py = summitPeakTopY;
  const rockGrad = ctx.createLinearGradient(px - 260, py - 90, px + 280, rockFadeBottomY);
  rockGrad.addColorStop(0, theme.summitRockLight);
  rockGrad.addColorStop(0.52, theme.summitRockMid);
  rockGrad.addColorStop(1, theme.summitRockDark);

  const traceSummitBody = () => {
    ctx.beginPath();
    const kind = theme.geologyKind;
    if (kind === 'swan_slab') {
      // Twin graceful folded swan-wing sculpted sunlit granite dome
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 360, py + 150);
      ctx.quadraticCurveTo(px - 220, py + 24, px - 120, py + 6);
      ctx.quadraticCurveTo(px - 68, py - 24, px - 22, py - 2);
      ctx.lineTo(px + 26, py - 2);
      ctx.quadraticCurveTo(px + 94, py - 68, px + 148, py - 42);
      ctx.quadraticCurveTo(px + 210, py + 8, px + 340, py + 145);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'whitehorse_ridge') {
      // Sweeping arched silvery-white granite horse-mane crest
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 350, py + 165);
      ctx.quadraticCurveTo(px - 170, py + 28, px - 72, py - 8);
      ctx.quadraticCurveTo(px - 18, py - 12, px + 46, py + 2);
      ctx.quadraticCurveTo(px + 188, py + 38, px + 380, py + 160);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'royal_arches') {
      // Monumental terraced concentric honey-ochre granite arch crown
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 340, py + 155);
      ctx.quadraticCurveTo(px - 210, py + 18, px - 126, py + 10);
      ctx.quadraticCurveTo(px - 58, py - 18, px, py - 4);
      ctx.quadraticCurveTo(px + 66, py - 18, px + 132, py + 12);
      ctx.quadraticCurveTo(px + 230, py + 26, px + 350, py + 155);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'high_exposure_roof') {
      // Dramatic cantilevered overhanging flying-eave rock prow
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 360, py + 150);
      ctx.lineTo(px - 155, py + 12);
      ctx.lineTo(px - 52, py - 6);
      ctx.lineTo(px + 108, py - 24);
      ctx.lineTo(px + 142, py - 12);
      ctx.lineTo(px + 86, py + 28);
      ctx.lineTo(px + 165, py + 120);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'snake_dike') {
      // Smooth curved Half Dome whaleback summit dome
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 360, py + 170);
      ctx.quadraticCurveTo(px - 220, py + 20, px - 92, py - 6);
      ctx.quadraticCurveTo(px, py - 22, px + 104, py - 2);
      ctx.quadraticCurveTo(px + 230, py + 28, px + 360, py + 170);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'moonlight_sandstone') {
      // Towering sheer vertical Navajo sandstone pillar buttress crest
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 290, py + 165);
      ctx.lineTo(px - 175, py + 28);
      ctx.lineTo(px - 110, py - 4);
      ctx.lineTo(px - 38, py - 8);
      ctx.lineTo(px + 42, py - 6);
      ctx.lineTo(px + 105, py - 18);
      ctx.lineTo(px + 172, py + 32);
      ctx.lineTo(px + 295, py + 165);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'devils_basalt_columns') {
      // Iconic flat-topped hexagonal basalt-column Devils Tower mesa plateau
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 320, py + 160);
      ctx.lineTo(px - 205, py + 12);
      ctx.lineTo(px - 160, py - 6);
      ctx.lineTo(px + 160, py - 6);
      ctx.lineTo(px + 208, py + 14);
      ctx.lineTo(px + 320, py + 160);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'lotus_fluted_spire') {
      // Sculptural blooming lotus-petal granite pinnacle crown
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 310, py + 165);
      ctx.quadraticCurveTo(px - 180, py + 38, px - 130, py - 28);
      ctx.quadraticCurveTo(px - 84, py - 10, px - 48, py - 2);
      ctx.lineTo(px + 48, py - 2);
      ctx.quadraticCurveTo(px + 92, py - 58, px + 132, py - 44);
      ctx.quadraticCurveTo(px + 178, py + 28, px + 310, py + 165);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'eiger_white_spider') {
      // Knife-edge icy alpine ridge with sweeping right snow cornice
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 360, py + 165);
      ctx.lineTo(px - 175, py + 28);
      ctx.lineTo(px - 62, py - 6);
      ctx.lineTo(px + 36, py - 4);
      ctx.quadraticCurveTo(px + 126, py - 48, px + 188, py - 22);
      ctx.lineTo(px + 350, py + 160);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else if (kind === 'matterhorn_pyramid_gneiss') {
      // Iconic curved chiseled Matterhorn pyramidal horn crest
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 360, py + 170);
      ctx.quadraticCurveTo(px - 170, py + 45, px - 68, py - 6);
      ctx.lineTo(px + 44, py - 6);
      ctx.quadraticCurveTo(px + 92, py - 52, px + 114, py - 62);
      ctx.quadraticCurveTo(px + 175, py + 25, px + 360, py + 170);
      ctx.lineTo(spanRight, rockFadeBottomY);
    } else {
      // The Dawn Wall: colossal sheer El Capitan golden-rose granite monolith prow
      ctx.moveTo(spanLeft, rockFadeBottomY);
      ctx.lineTo(px - 330, py + 160);
      ctx.lineTo(px - 188, py + 8);
      ctx.quadraticCurveTo(px - 72, py - 14, px + 62, py - 10);
      ctx.quadraticCurveTo(px + 170, py - 4, px + 224, py + 24);
      ctx.lineTo(px + 340, py + 165);
      ctx.lineTo(spanRight, rockFadeBottomY);
    }
    ctx.closePath();
  };

  // Fill sculpted summit rock body
  traceSummitBody();
  ctx.fillStyle = rockGrad;
  ctx.fill();

  // Route-specific sculptural surface details clipped inside the summit silhouette
  ctx.save();
  traceSummitBody();
  ctx.clip();

  if (theme.geologyKind === 'devils_basalt_columns') {
    for (let x = px - 220; x <= px + 220; x += 28) {
      ctx.fillStyle = 'rgba(18, 13, 18, 0.42)';
      ctx.fillRect(x, py - 12, 4, 240);
      ctx.fillStyle = 'rgba(255, 214, 146, 0.22)';
      ctx.fillRect(x + 18, py - 12, 6, 240);
    }
  } else if (theme.geologyKind === 'royal_arches') {
    // Sculpted arched crown ribs
    ctx.strokeStyle = 'rgba(78, 48, 22, 0.36)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(px, py + 64, 155, 58, 0, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 236, 192, 0.44)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py + 58, 155, 58, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  } else if (theme.geologyKind === 'snake_dike') {
    // Dark volcanic dike tapering neatly to the Half Dome crest
    ctx.strokeStyle = 'rgba(104, 64, 42, 0.65)';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - 10, py + 230);
    ctx.quadraticCurveTo(px + 28, py + 110, px - 6, py - 2);
    ctx.stroke();
  } else if (theme.geologyKind === 'lotus_fluted_spire') {
    // Carved overlapping lotus petal ribs
    for (let i = -2; i <= 2; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 244, 252, 0.42)' : 'rgba(84, 74, 114, 0.34)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + i * 56, py + 220);
      ctx.quadraticCurveTo(px + i * 38, py + 65, px + i * 44, py - 16);
      ctx.stroke();
    }
  }

  // Sunlit snow lip on alpine glacial peaks
  if (theme.summitSnowColor) {
    ctx.fillStyle = theme.summitSnowColor;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(px - 140, py + 20);
    ctx.quadraticCurveTo(px - 35, py - 14, px + 52, py - 8);
    ctx.quadraticCurveTo(px + 125, py - 34, px + 178, py - 10);
    ctx.quadraticCurveTo(px + 92, py + 24, px - 140, py + 20);
    ctx.closePath();
    ctx.fill();
  }

  // Soft bottom alpha blend transitioning seamlessly into the tiled climbing wall below
  const blendGrad = ctx.createLinearGradient(0, py + 70, 0, rockFadeBottomY);
  blendGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  blendGrad.addColorStop(1, theme.wallFallbackColor);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = blendGrad;
  ctx.fillRect(spanLeft, py + 70, spanW, rockFadeBottomY - (py + 70));
  ctx.restore();

  // Luminous romantic sunlit/moonlit rim stroke along the top summit ridge silhouette
  ctx.save();
  traceSummitBody();
  ctx.strokeStyle = theme.summitCrestRim;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.72;
  ctx.stroke();
  ctx.restore();

  // Animated wind-blown snow banner plume on Matterhorn & Eiger crests
  if (
    theme.geologyKind === 'matterhorn_pyramid_gneiss' ||
    theme.geologyKind === 'eiger_white_spider'
  ) {
    ctx.save();
    const plumeX = px + (theme.geologyKind === 'matterhorn_pyramid_gneiss' ? 114 : 168);
    const plumeY = py - (theme.geologyKind === 'matterhorn_pyramid_gneiss' ? 60 : 34);
    const sway = Math.sin(timeSec * 1.4) * 14;
    const pGrad = ctx.createLinearGradient(plumeX, plumeY, plumeX + 220, plumeY - 48);
    pGrad.addColorStop(0, theme.summitCrestRim);
    pGrad.addColorStop(0.5, `rgba(${theme.godRayColor}, 0.42)`);
    pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.moveTo(plumeX - 8, plumeY);
    ctx.quadraticCurveTo(plumeX + 90, plumeY - 38 + sway * 0.4, plumeX + 230, plumeY - 56 + sway);
    ctx.quadraticCurveTo(plumeX + 110, plumeY + 4 + sway * 0.3, plumeX - 4, plumeY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the full-bleed world-space scene presentation stack:
 * 1) Route-bespoke romantic near-summit sky, distant cloud-sea & iconic summit formation
 * 2) Seamless vertically looped route-themed climbing rock/ice wall (02)
 * 3) Starting rock shelf plate (01) feathered seamlessly upward into the wall
 */
export function drawArtPackWorldScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  world: MountainWorld,
  pack: DecodedArtPack,
  sceneAlpha: number,
  timeSec = 0
): boolean {
  const wallTile = pack.seamlessWallTile ?? pack.wallImg;
  const startPlate = pack.startPlateFeathered ?? pack.startImg;
  const summitPlate = pack.summitNearFeathered ?? pack.summitNearImg;
  const routeTheme = pack.routeTheme;

  if (!wallTile && !startPlate && !summitPlate) {
    return false;
  }

  if (sceneAlpha <= 0.01) {
    return true;
  }

  const layout = computeSceneLayout(width, world, pack);
  const {
    plateWorldW,
    plateWorldH,
    startPlateTopY,
    startPlateBottomY,
    summitPeakTopY,
    summitPlateTopY,
    summitPlateBottomY,
    summitPlateLeftX,
  } = layout;

  const zoomSafe = Math.max(0.15, camera.zoom);
  const viewHalfW = (width * 0.56) / zoomSafe;
  const viewTopY = camera.y - (height * 0.58) / zoomSafe;
  const viewBottomY = camera.y + (height * 0.58) / zoomSafe;
  const viewLeftX = camera.x - viewHalfW;
  const viewRightX = camera.x + viewHalfW;

  const baseLeftX = -plateWorldW * 0.5;
  const minCol = Math.floor((viewLeftX - baseLeftX) / plateWorldW);
  const maxCol = Math.floor((viewRightX - baseLeftX) / plateWorldW);

  ctx.save();
  ctx.globalAlpha = sceneAlpha;

  const wallMaxTopY = routeTheme
    ? summitPeakTopY + 125
    : summitPlateTopY + plateWorldH * (pack.urls.metrics.summitStandingRatioY + 0.06);
  const wallMaxBottomY = Math.max(startPlateBottomY + 260, viewBottomY + 140);

  // A. Route-bespoke romantic near-summit sky & sculptural summit crest (replaces generic 2-plate summit!)
  if (routeTheme && viewTopY <= summitPeakTopY + 320) {
    drawRouteNearSummitVista(ctx, layout, viewLeftX, viewRightX, viewTopY, routeTheme, timeSec);
  } else {
    const skyFillBottomY =
      summitPlateTopY + plateWorldH * (pack.urls.metrics.summitStandingRatioY + 0.1);
    if (viewTopY < skyFillBottomY) {
      const skyTopY = Math.min(viewTopY - 120, summitPlateTopY - 400);
      ctx.fillStyle = pack.urls.metrics.summitSkyTopColor;
      ctx.fillRect(
        viewLeftX - 60,
        skyTopY,
        viewRightX - viewLeftX + 120,
        skyFillBottomY - skyTopY
      );
      if (viewTopY < summitPlateTopY + 4 && pack.summitNearImg) {
        const sMinCol = Math.floor((viewLeftX - summitPlateLeftX) / plateWorldW);
        const sMaxCol = Math.floor((viewRightX - summitPlateLeftX) / plateWorldW);
        const extH = summitPlateTopY + 4 - skyTopY;
        for (let col = sMinCol; col <= sMaxCol; col++) {
          const colX = summitPlateLeftX + col * plateWorldW;
          ctx.drawImage(
            pack.summitNearImg,
            0,
            0,
            pack.summitNearImg.naturalWidth,
            12,
            colX,
            skyTopY,
            plateWorldW + 1,
            extH
          );
        }
      }
    }
  }

  // B. Seamless vertically-looping route-themed climbing wall (02) clipped strictly below summit crest
  if (wallTile) {
    const tileW = wallTile instanceof HTMLCanvasElement ? wallTile.width : wallTile.naturalWidth;
    const tileH = wallTile instanceof HTMLCanvasElement ? wallTile.height : wallTile.naturalHeight;
    const tileWorldH = plateWorldW * (tileH / Math.max(1, tileW));

    const firstTileIdx = Math.floor(
      (Math.max(viewTopY - 60, wallMaxTopY) - startPlateTopY) / tileWorldH
    );
    const lastTileIdx = Math.ceil(
      (Math.min(viewBottomY + 60, wallMaxBottomY) - startPlateTopY) / tileWorldH
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      viewLeftX - 60,
      wallMaxTopY,
      viewRightX - viewLeftX + 120,
      Math.max(0, wallMaxBottomY - wallMaxTopY)
    );
    ctx.clip();

    for (let col = minCol; col <= maxCol; col++) {
      const colX = baseLeftX + col * plateWorldW;
      const mirrorX = Math.abs(col) % 2 === 1;
      for (let row = firstTileIdx; row <= lastTileIdx; row++) {
        const ty = startPlateTopY + row * tileWorldH;
        if (mirrorX) {
          ctx.save();
          ctx.translate(colX + plateWorldW, ty);
          ctx.scale(-1, 1);
          ctx.drawImage(wallTile, 0, 0, plateWorldW + 1, tileWorldH + 1);
          ctx.restore();
        } else {
          ctx.drawImage(wallTile, colX, ty, plateWorldW + 1, tileWorldH + 1);
        }
      }
    }

    // Soft feathered rock seam right where the climbing wall joins the bespoke summit sculpture
    if (routeTheme && viewTopY <= wallMaxTopY + 180) {
      const seamGrad = ctx.createLinearGradient(0, wallMaxTopY, 0, wallMaxTopY + 135);
      seamGrad.addColorStop(0, routeTheme.summitRockMid);
      seamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = 0.56;
      ctx.fillStyle = seamGrad;
      ctx.fillRect(viewLeftX - 60, wallMaxTopY, viewRightX - viewLeftX + 120, 135);
      ctx.globalAlpha = sceneAlpha;
    }

    const grainImg = pack.wallDetailOverlayImg;
    const grainAlpha = pack.urls.atmosphereGrade?.wallGrainOpacity ?? 0.24;
    if (grainImg && grainImg.naturalWidth > 0 && grainAlpha > 0.005) {
      const gTileWorldH =
        plateWorldW * (grainImg.naturalHeight / Math.max(1, grainImg.naturalWidth));
      ctx.save();
      ctx.globalAlpha *= Math.min(0.45, grainAlpha);
      for (let col = minCol; col <= maxCol; col++) {
        const colX = baseLeftX + col * plateWorldW;
        for (let row = firstTileIdx; row <= lastTileIdx; row++) {
          const ty = startPlateTopY + row * gTileWorldH;
          ctx.drawImage(grainImg, colX, ty, plateWorldW + 1, gTileWorldH + 1);
        }
      }
      ctx.restore();
    }

    const grade = pack.urls.atmosphereGrade;
    if (grade?.shadowWashColor) {
      ctx.fillStyle = grade.shadowWashColor;
      ctx.fillRect(
        viewLeftX - 60,
        wallMaxTopY,
        viewRightX - viewLeftX + 120,
        Math.max(0, wallMaxBottomY - wallMaxTopY)
      );
    }
    if (grade?.sunRimWashColor) {
      const sunGrad = ctx.createLinearGradient(viewLeftX, viewTopY, viewRightX, viewBottomY);
      sunGrad.addColorStop(0, grade.sunRimWashColor);
      sunGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(
        viewLeftX - 60,
        wallMaxTopY,
        viewRightX - viewLeftX + 120,
        Math.max(0, wallMaxBottomY - wallMaxTopY)
      );
    }

    if (viewBottomY > startPlateBottomY - 40) {
      const shadowTop = startPlateBottomY - 40;
      const shadowH = Math.max(160, viewBottomY - shadowTop + 140);
      const plinthGrad = ctx.createLinearGradient(0, shadowTop, 0, shadowTop + shadowH);
      plinthGrad.addColorStop(0, 'rgba(14, 18, 25, 0)');
      plinthGrad.addColorStop(0.28, 'rgba(14, 18, 25, 0.28)');
      plinthGrad.addColorStop(1, 'rgba(14, 18, 25, 0.62)');
      ctx.fillStyle = plinthGrad;
      ctx.fillRect(viewLeftX - 60, shadowTop, viewRightX - viewLeftX + 120, shadowH);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = pack.urls.metrics.fallbackWallColor;
    ctx.fillRect(
      viewLeftX - 60,
      wallMaxTopY,
      viewRightX - viewLeftX + 120,
      Math.max(0, wallMaxBottomY - wallMaxTopY)
    );
  }

  // C. Starting Rock Shelf Plate (01) feathered smoothly into wall above & plinth below
  if (startPlate && viewBottomY >= startPlateTopY - 40 && viewTopY <= startPlateBottomY + 80) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      viewLeftX - 60,
      wallMaxTopY,
      viewRightX - viewLeftX + 120,
      Math.max(0, startPlateBottomY + 80 - wallMaxTopY)
    );
    ctx.clip();

    for (let col = minCol; col <= maxCol; col++) {
      const colX = baseLeftX + col * plateWorldW;
      const mirrorX = Math.abs(col) % 2 === 1;
      if (mirrorX) {
        ctx.save();
        ctx.translate(colX + plateWorldW, startPlateTopY);
        ctx.scale(-1, 1);
        ctx.drawImage(startPlate, 0, 0, plateWorldW + 1, plateWorldH);
        ctx.restore();
      } else {
        ctx.drawImage(startPlate, colX, startPlateTopY, plateWorldW + 1, plateWorldH);
      }
    }
    ctx.restore();
  }

  // D. Legacy near-summit bitmap plate (only if no routeTheme is present)
  if (!routeTheme && summitPlate && viewTopY <= summitPlateBottomY + 60) {
    const sMinCol = Math.floor((viewLeftX - summitPlateLeftX) / plateWorldW);
    const sMaxCol = Math.floor((viewRightX - summitPlateLeftX) / plateWorldW);
    for (let col = sMinCol; col <= sMaxCol; col++) {
      const colX = summitPlateLeftX + col * plateWorldW;
      const mirrorX = Math.abs(col) % 2 === 1;
      if (mirrorX) {
        ctx.save();
        ctx.translate(colX + plateWorldW, summitPlateTopY);
        ctx.scale(-1, 1);
        ctx.drawImage(summitPlate, 0, 0, plateWorldW + 1, plateWorldH);
        ctx.restore();
      } else {
        ctx.drawImage(summitPlate, colX, summitPlateTopY, plateWorldW + 1, plateWorldH);
      }
    }
  }

  ctx.restore();
  return true;
}

/**
 * Computes the dissolve alpha (0..1) from Near-Summit close-up into the bespoke romantic Wide Ending Painting.
 * Starts mid-flight during the continuous exponential optical pull-back (0.36 -> 0.78) so the handoff
 * feels like a single unbroken drone/cinema camera zooming away from the summit crest.
 */
export function computeSummitWideDissolveAlpha(
  phase: GamePhase,
  summitProgress: number,
  trailPlaybackProgress: number | null
): number {
  if (phase !== 'SUMMIT') return 0;
  if (trailPlaybackProgress !== null) return 0;
  return smootherstep((summitProgress - 0.36) / 0.42);
}

export interface SummitWideOpticalContext {
  camera: CameraState;
  peakWorldX: number;
  peakWorldY: number;
  vfxPack?: DecodedVfxPack;
}

/**
 * Draws the route's bespoke ultra-romantic semi-realistic full-mountain panorama painting
 * using true optical camera continuity:
 * - Pixel-locks wideEnding's (wideFocalX, wideFocalY) directly onto the live world summit peak's screen projection.
 * - Matches exact logarithmic zoom velocity with the live 2.5D camera (camera.zoom / finalPanoramicZoom).
 * - Bridges the optical handoff with a whisper-thin high-altitude cloud-mist veil (swappable vfx.weatherFrontCloud / mistVeil).
 * - Preserves subtle living Ken Burns breath, volumetric light shafts (swappable vfx.sunShaft), and luminous motes.
 */
export function drawSummitWideEndingOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: GamePhase,
  summitProgress: number,
  trailPlaybackProgress: number | null,
  pack: DecodedArtPack,
  timeSec = 0,
  optical?: SummitWideOpticalContext
): void {
  const alpha = computeSummitWideDissolveAlpha(phase, summitProgress, trailPlaybackProgress);
  const wideImg = pack.wideEndingImg;
  const hasWideImg = Boolean(wideImg && wideImg.naturalWidth > 0 && wideImg.naturalHeight > 0);
  const quoteVeilT =
    phase === 'SUMMIT' && trailPlaybackProgress === null
      ? smootherstep((summitProgress - 0.84) / 0.15)
      : 0;

  // Soft cloud-mist optical bridge envelope peaking gently at the 50/50 dissolve midpoint (sp ≈ 0.57)
  const bridgeRaw =
    phase === 'SUMMIT' && trailPlaybackProgress === null
      ? Math.max(0, Math.min(1, (summitProgress - 0.34) / 0.44))
      : 0;
  const cloudBridgeAlpha =
    bridgeRaw > 0.004 && bridgeRaw < 0.996
      ? Math.pow(Math.sin(bridgeRaw * Math.PI), 1.35)
      : 0;

  if ((!hasWideImg || alpha <= 0.004) && quoteVeilT <= 0.004 && cloudBridgeAlpha <= 0.004) return;

  const theme = pack.routeTheme;
  const { wideFocalX, wideFocalY, wideDissolveStartScale } = pack.urls.metrics;
  const imgAspect =
    hasWideImg && wideImg ? wideImg.naturalWidth / wideImg.naturalHeight : 9 / 16;
  const restGeo = computeWideRestingGeometry(width, height, imgAspect, wideFocalX, wideFocalY);

  // Match the exact optical pullRatio used by computeSummitOpticalTargets so camera.zoom / finalPanoramicZoom === wideScale
  const responsiveZoom = Math.min(1.06, Math.max(0.72, width / 420));
  const crestZoom = Math.min(1.06, responsiveZoom * 1.02);
  const minSafeScaleForTop =
    (height * 0.42) / Math.max(1, restGeo.baseDrawH * Math.max(0.14, wideFocalY));
  const pullRatio = Math.max(
    2.15,
    Math.min(2.75, Math.max(wideDissolveStartScale * 1.48, minSafeScaleForTop))
  );
  const finalPanoramicZoom = crestZoom / pullRatio;

  // Compute live screen coordinate of the summit peak from the actual world camera
  const livePeakScreenX = optical
    ? width * 0.5 + (optical.peakWorldX - optical.camera.x) * optical.camera.zoom
    : restGeo.restPeakScreenX;
  const livePeakScreenY = optical
    ? height * 0.52 + (optical.peakWorldY - optical.camera.y) * optical.camera.zoom
    : restGeo.restPeakScreenY;

  ctx.save();
  if (hasWideImg && wideImg && alpha > 0.004) {
    // Living Ken Burns breath smoothly engages only after the optical pull-back nears rest (sp: 0.78 -> 0.96)
    const settleT = smootherstep((summitProgress - 0.78) / 0.18);
    const breathScale = 1 + 0.014 * (0.5 + 0.5 * Math.sin(timeSec * 0.26)) * settleT;

    // Derive optical zoom scale directly from the live world camera zoom so world & painting shrink in lockstep
    const rawOpticalScale = optical
      ? Math.max(1, Math.min(pullRatio * 1.15, optical.camera.zoom / Math.max(0.08, finalPanoramicZoom)))
      : Math.pow(pullRatio, 1 - smootherstep((summitProgress - 0.24) / 0.66));

    const scale = rawOpticalScale * breathScale;
    const drawW = restGeo.baseDrawW * scale;
    const drawH = restGeo.baseDrawH * scale;

    // Blend seamlessly from live world peak projection into exact resting peak as camera settles
    const anchorX = livePeakScreenX + (restGeo.restPeakScreenX - livePeakScreenX) * settleT;
    const anchorY = livePeakScreenY + (restGeo.restPeakScreenY - livePeakScreenY) * settleT;
    const rawX = anchorX - drawW * wideFocalX;
    const rawY = anchorY - drawH * wideFocalY;

    const minX = width - drawW;
    const maxX = 0;
    const minY = height - drawH;
    const maxY = 0;
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    ctx.globalAlpha = alpha;
    ctx.drawImage(wideImg, clampedX, clampedY, drawW, drawH);

    // Delicate warm peak-crest glimmer keeping the conquered summit visually anchored during the optical handoff
    const peakGlimmerAlpha =
      alpha > 0.12 && alpha < 0.96
        ? Math.sin(((alpha - 0.12) / 0.84) * Math.PI) * 0.42
        : 0;
    if (peakGlimmerAlpha > 0.01) {
      const gx = clampedX + drawW * wideFocalX;
      const gy = clampedY + drawH * wideFocalY;
      const glimmerR = Math.max(18, 44 * (rawOpticalScale / pullRatio));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const gGrad = ctx.createRadialGradient(gx, gy, 2, gx, gy, glimmerR);
      gGrad.addColorStop(0, `rgba(255, 248, 220, ${(peakGlimmerAlpha * 0.72).toFixed(3)})`);
      gGrad.addColorStop(0.45, `rgba(254, 232, 178, ${(peakGlimmerAlpha * 0.26).toFixed(3)})`);
      gGrad.addColorStop(1, 'rgba(254, 232, 178, 0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, glimmerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Living Romantic Atmospheric Enhancements (volumetric rays + drifting luminous motes)
    if (theme && alpha > 0.12) {
      const fxAlpha = alpha;
      const originX = width * theme.godRayOrigin.x;
      const originY = height * theme.godRayOrigin.y;
      const vfxPack = optical?.vfxPack;

      // Soft warm / moonlit atmospheric sky bloom
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bloomR = Math.max(width, height) * 0.52;
      const bloomGrad = ctx.createRadialGradient(originX, originY, 10, originX, originY, bloomR);
      bloomGrad.addColorStop(0, theme.bloomColor);
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = fxAlpha * (0.72 + 0.22 * Math.sin(timeSec * 0.6));
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, width, height);

      // Gentle breathing volumetric light shafts (uses swappable vfx.sunShaft if registered)
      for (let i = 0; i < 3; i++) {
        const sweep = -0.32 + i * 0.28 + Math.sin(timeSec * 0.22 + i * 1.6) * 0.04;
        const pulse = 0.72 + 0.28 * Math.sin(timeSec * 0.48 + i * 2.1);
        const len = Math.max(width, height) * 1.15;
        const drewShaft = vfxPack
          ? drawVfxSprite(
              ctx,
              vfxPack,
              'sunShaft',
              originX,
              originY,
              width * 0.42,
              len,
              -sweep,
              0.24 * pulse * fxAlpha
            )
          : false;
        if (!drewShaft) {
          const ex = originX + Math.sin(sweep) * len;
          const ey = originY + Math.cos(sweep) * len;
          const rGrad = ctx.createLinearGradient(originX, originY, ex, ey);
          rGrad.addColorStop(0, `rgba(${theme.godRayColor}, ${(0.18 * pulse * fxAlpha).toFixed(3)})`);
          rGrad.addColorStop(0.65, `rgba(${theme.godRayColor}, ${(0.05 * pulse * fxAlpha).toFixed(3)})`);
          rGrad.addColorStop(1, `rgba(${theme.godRayColor}, 0)`);
          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.moveTo(originX - 18, originY);
          ctx.lineTo(originX + 18, originY);
          ctx.lineTo(ex + width * 0.14, ey);
          ctx.lineTo(ex - width * 0.14, ey);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Drifting luminous romantic particles (uses swappable ambient mote sprites if registered)
      const moteCount = 34;
      const isSnowLike =
        theme.moteKind === 'alpine_snow_plume' || theme.moteKind === 'starlight_frost';
      const isStarLike =
        theme.moteKind === 'moon_stardust' || theme.moteKind === 'arctic_aurora';
      const moteVfxKey = isSnowLike
        ? 'ambientIceCrystal'
        : isStarLike
          ? 'ambientStardust'
          : 'ambientDawnMote';

      for (let m = 0; m < moteCount; m++) {
        const seed = ((m * 2654435761) ^ 0x517cc1b7) >>> 0;
        const baseX = (seed % 1000) / 1000;
        const baseY = ((seed >>> 10) % 1000) / 1000;
        const spdX = isSnowLike ? 0.022 + (m % 5) * 0.006 : 0.005 + (m % 4) * 0.0025;
        const spdY = isSnowLike ? -0.006 : -0.008 - (m % 4) * 0.003;
        const mx = (((baseX + timeSec * spdX + Math.sin(timeSec * 0.6 + m) * 0.012) % 1) + 1) % 1;
        const my = (((baseY + timeSec * spdY) % 1) + 1) % 1;
        const px = mx * width;
        const py = my * height;
        const twinkle = 0.35 + 0.65 * Math.sin(timeSec * (1.1 + (m % 5) * 0.35) + m * 2.3);
        const radius = isStarLike ? 1.1 + (m % 3) * 0.7 : 1.4 + (m % 4) * 0.8;

        const drewMote = vfxPack
          ? drawVfxSprite(
              ctx,
              vfxPack,
              moteVfxKey,
              px,
              py,
              radius * 7.5,
              radius * 7.5,
              isSnowLike ? timeSec * 0.6 + m : 0,
              0.68 * twinkle * fxAlpha
            )
          : false;
        if (!drewMote) {
          ctx.fillStyle = `rgba(${theme.moteColor}, ${(0.62 * twinkle * fxAlpha).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();

          if (radius > 2.2) {
            ctx.fillStyle = `rgba(${theme.moteColor}, ${(0.18 * twinkle * fxAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, radius * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  // Whisper-thin High-Altitude Cloud-Mist Optical Bridge (passes softly across lens during zoom-out handoff)
  if (cloudBridgeAlpha > 0.008) {
    const vfxPack = optical?.vfxPack;
    const hazeRgb = theme?.moteColor ?? '248, 244, 236';
    const spread = 0.65 + bridgeRaw * 0.9;
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const dir = i === 0 ? -1 : 1;
      const wispX = livePeakScreenX + dir * width * (0.14 + bridgeRaw * 0.42);
      const wispY = livePeakScreenY + (i === 0 ? -height * 0.06 : height * 0.14);
      const wispW = width * (0.95 + i * 0.22) * spread;
      const wispH = height * (0.34 + i * 0.08) * spread;
      const wispA = cloudBridgeAlpha * (i === 0 ? 0.24 : 0.18);
      const spriteKey = i === 0 ? 'weatherFrontCloud' : 'mistVeil';
      const drew = vfxPack
        ? drawVfxSprite(ctx, vfxPack, spriteKey, wispX, wispY, wispW, wispH, dir * 0.04, wispA, dir, 1)
        : false;
      if (!drew) {
        const cGrad = ctx.createRadialGradient(wispX, wispY, wispW * 0.05, wispX, wispY, wispW * 0.52);
        cGrad.addColorStop(0, `rgba(${hazeRgb}, ${(wispA * 0.85).toFixed(3)})`);
        cGrad.addColorStop(0.55, `rgba(${hazeRgb}, ${(wispA * 0.34).toFixed(3)})`);
        cGrad.addColorStop(1, `rgba(${hazeRgb}, 0)`);
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.ellipse(wispX, wispY, wispW * 0.52, wispH * 0.5, dir * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Subtle romantic color-matched edge vignette (preserves full luminance of the summit painting)
  const veilAlpha = hasWideImg ? Math.max(alpha, quoteVeilT) : quoteVeilT;
  if (veilAlpha > 0.004) {
    const [vr, vg, vb] = theme?.vignetteTintRgb ?? [10, 16, 26];
    const bottomVig = ctx.createLinearGradient(0, height * 0.56, 0, height);
    bottomVig.addColorStop(0, `rgba(${vr}, ${vg}, ${vb}, 0)`);
    bottomVig.addColorStop(
      0.58,
      `rgba(${vr}, ${vg}, ${vb}, ${((0.08 + 0.22 * quoteVeilT) * veilAlpha).toFixed(3)})`
    );
    bottomVig.addColorStop(
      1,
      `rgba(${vr}, ${vg}, ${vb}, ${((0.2 + 0.32 * quoteVeilT) * veilAlpha).toFixed(3)})`
    );
    ctx.fillStyle = bottomVig;
    ctx.fillRect(0, height * 0.56, width, height * 0.44);

    if (quoteVeilT > 0.01) {
      const topVig = ctx.createLinearGradient(0, 0, 0, height * 0.24);
      topVig.addColorStop(0, `rgba(${vr}, ${vg}, ${vb}, ${(0.24 * quoteVeilT).toFixed(3)})`);
      topVig.addColorStop(1, `rgba(${vr}, ${vg}, ${vb}, 0)`);
      ctx.fillStyle = topVig;
      ctx.fillRect(0, 0, width, height * 0.24);
    }
  }
  ctx.restore();
}
