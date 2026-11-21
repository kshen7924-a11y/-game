import { CameraState, GamePhase } from '../game/types';
import { MountainWorld } from '../game/mountain';
import { DecodedArtPack } from './artPackAssets';

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

/**
 * Smoothstep easing in [0, 1].
 */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Quintic smootherstep easing in [0, 1] with zero 1st & 2nd derivatives at endpoints,
 * eliminating abrupt velocity kinks during cinematic camera pull-backs and dissolves.
 */
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
  // Guarantee full-bleed mobile portrait coverage with comfortable margin on both sides
  // (preventing mirrored summit peak seams) while capping scale on wide desktop monitors.
  const plateWorldW = Math.min(920, Math.max(600, (width / baseZoom) * 1.36));
  const aspectHOverW = 1672 / 940;
  const plateWorldH = plateWorldW * aspectHOverW;

  const { startShelfSurfaceRatioY, summitStandingRatioX, summitStandingRatioY } =
    pack.urls.metrics;

  // Align walkable shelf in 01-start directly beneath the climber's starting feet
  const startPlateTopY = BASE_CLIMBER_FOOT_WORLD_Y - plateWorldH * startShelfSurfaceRatioY;
  const startPlateBottomY = startPlateTopY + plateWorldH;

  // Align summit ridge/saddle in 03-summit-near directly beneath the summit standing point
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
 * Keeps state strictly inside visual layer without adding fields to shared/.
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
 * Fades out rock wall, mountain silhouette, scenery, and climber so original-position holds stay crystal clear.
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

  // Subtle elevation grid lines in world space alignment for tactical route-reading sense of scale
  const gridSpacingPx = Math.max(44, 90 * camera.zoom);
  const offsetY = (((height * 0.52 - camera.y * camera.zoom) % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
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
 * Draws the full-bleed world-space scene presentation stack:
 * 1) Seamless vertically looped climbing rock/ice wall (02) spanning beyond viewport edges
 * 2) Starting rock shelf plate (01) feathered seamlessly upward into the wall and downward into shadowed rock plinth
 * 3) Near-summit crest & sky plate (03) feathered seamlessly downward into the wall + seamless upper sky strip
 *
 * Returns true when art-pack plates are active so caller can skip old procedural cliff & boxy base/summit ledges.
 */
export function drawArtPackWorldScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  world: MountainWorld,
  pack: DecodedArtPack,
  sceneAlpha: number
): boolean {
  const wallTile = pack.seamlessWallTile ?? pack.wallImg;
  const startPlate = pack.startPlateFeathered ?? pack.startImg;
  const summitPlate = pack.summitNearFeathered ?? pack.summitNearImg;

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

  // Determine horizontal columns to guarantee full edge-to-edge coverage even on ultrawide screens or lateral climbing
  const baseLeftX = -plateWorldW * 0.5;
  const minCol = Math.floor((viewLeftX - baseLeftX) / plateWorldW);
  const maxCol = Math.floor((viewRightX - baseLeftX) / plateWorldW);

  ctx.save();
  ctx.globalAlpha = sceneAlpha;

  // Strictly keep tiled climbing wall & start plate below the lowest sky dip of 03-summit-near
  // while overlapping deeply into 03-summit-near's opaque rock body (0.48..0.82) for a zero-seam blend.
  const wallMaxTopY =
    summitPlateTopY + plateWorldH * (pack.urls.metrics.summitStandingRatioY + 0.06);
  const wallMaxBottomY = Math.max(startPlateBottomY + 260, viewBottomY + 140);

  // A. Seamless upper sky extension ONLY above summitPlateTopY (plus safety fallback behind summit sky)
  const skyFillBottomY = summitPlateTopY + plateWorldH * (pack.urls.metrics.summitStandingRatioY + 0.1);
  if (viewTopY < skyFillBottomY) {
    const skyTopY = Math.min(viewTopY - 120, summitPlateTopY - 400);
    ctx.fillStyle = pack.urls.metrics.summitSkyTopColor;
    ctx.fillRect(
      viewLeftX - 60,
      skyTopY,
      viewRightX - viewLeftX + 120,
      skyFillBottomY - skyTopY
    );
    // Stretch top 10px sky band of 03-summit-near seamlessly upward when peeking above summitPlateTopY
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

  // B. Seamless vertically-looping climbing wall (02) clipped strictly below summit sky
  if (wallTile) {
    const tileW = wallTile instanceof HTMLCanvasElement ? wallTile.width : wallTile.naturalWidth;
    const tileH = wallTile instanceof HTMLCanvasElement ? wallTile.height : wallTile.naturalHeight;
    const tileWorldH = plateWorldW * (tileH / Math.max(1, tileW));

    // Anchor tile grid to startPlateTopY so grain phase stays rock-steady while camera scrolls
    const firstTileIdx = Math.floor((Math.max(viewTopY - 60, wallMaxTopY) - startPlateTopY) / tileWorldH);
    const lastTileIdx = Math.ceil((Math.min(viewBottomY + 60, wallMaxBottomY) - startPlateTopY) / tileWorldH);

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
        // Slight 1px overlap eliminates subpixel hairline cracks at fractional DPR zooms
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

    // Optional Cairn-style seamless ink-hatching / lichen grain overlay tiled cleanly over rock wall
    const grainImg = pack.wallDetailOverlayImg;
    const grainAlpha = pack.urls.atmosphereGrade?.wallGrainOpacity ?? 0.24;
    if (grainImg && grainImg.naturalWidth > 0 && grainAlpha > 0.005) {
      const gTileWorldH = plateWorldW * (grainImg.naturalHeight / Math.max(1, grainImg.naturalWidth));
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

    // Optional Cairn atmosphere color grading washes (shadow coolness & upper-left sun rim)
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

    // Subtle cliff underside shadow below starting ledge so crisp rock texture continues naturally
    // instead of stretching bottom edge pixels into stripes on tall phones.
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

  // C. Starting Rock Shelf Plate (01) feathered smoothly into wall above & plinth below, clipped below summit sky
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

  // D. Near-Summit Crest & Sky Plate (03) feathered smoothly into climbing wall below
  if (summitPlate && viewTopY <= summitPlateBottomY + 60) {
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
 * Computes the dissolve alpha (0..1) from Near-Summit close-up into Static Wide Ending Painting.
 * - 0.00..0.32: Climber stands triumphantly on near-summit crest as camera begins smooth pull-back
 * - 0.32..0.72: Quintic crossfade into wide full-mountain panorama (04-广角结尾) while both glide outward
 * - 0.72..1.00: Full mountain panorama settles gently as poetic quote fades in (waits for player tap)
 */
export function computeSummitWideDissolveAlpha(
  phase: GamePhase,
  summitProgress: number,
  trailPlaybackProgress: number | null
): number {
  if (phase !== 'SUMMIT') return 0;
  // When player explicitly triggers post-summit route trail playback, reveal the climbed wall trail
  if (trailPlaybackProgress !== null) return 0;
  return smootherstep((summitProgress - 0.32) / 0.4);
}

/**
 * Draws the preloaded 04-广角结尾.png full-mountain portrait matte painting in screen space,
 * using exponential optical zoom-out so perceived pull-back speed matches the world camera
 * seamlessly from summit crest all the way to full-mountain silhouette reveal.
 */
export function drawSummitWideEndingOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: GamePhase,
  summitProgress: number,
  trailPlaybackProgress: number | null,
  pack: DecodedArtPack
): void {
  const alpha = computeSummitWideDissolveAlpha(phase, summitProgress, trailPlaybackProgress);
  const wideImg = pack.wideEndingImg;
  const hasWideImg = Boolean(wideImg && wideImg.naturalWidth > 0 && wideImg.naturalHeight > 0);
  const quoteVeilT =
    phase === 'SUMMIT' && trailPlaybackProgress === null
      ? smootherstep((summitProgress - 0.66) / 0.24)
      : 0;

  if ((!hasWideImg || alpha <= 0.004) && quoteVeilT <= 0.004) return;

  ctx.save();
  if (hasWideImg && wideImg && alpha > 0.004) {
    const { wideFocalX, wideFocalY, wideDissolveStartScale } = pack.urls.metrics;

    // Cover-fit portrait image to full screen (390x844 and any desktop/tablet aspect ratio)
    const imgAspect = wideImg.naturalWidth / wideImg.naturalHeight;
    const viewAspect = width / Math.max(1, height);
    let baseDrawW: number;
    let baseDrawH: number;
    if (viewAspect > imgAspect) {
      baseDrawW = width;
      baseDrawH = width / imgAspect;
    } else {
      baseDrawH = height;
      baseDrawW = height * imgAspect;
    }

    // Exponential optical pull-back (0.22 -> 0.90) so the painting glides smoothly into full panorama
    // without linear speed distortion or an abrupt stop when dissolve completes
    const settleT = smootherstep((summitProgress - 0.22) / 0.68);
    const startScale = Math.max(1.36, wideDissolveStartScale * 1.14);
    const scale = startScale * Math.pow(1 / startScale, settleT);
    const drawW = baseDrawW * scale;
    const drawH = baseDrawH * scale;

    // Anchor zoom around the shared summit landmark, smoothly gliding down to reveal the whole mountain
    const screenFocalX = width * 0.5;
    const screenFocalY = height * (0.36 + (wideFocalY - 0.36) * settleT);
    const rawX = screenFocalX - drawW * wideFocalX;
    const rawY = screenFocalY - drawH * wideFocalY;

    // Clamp so image edges NEVER expose blank bars on screen
    const minX = width - drawW;
    const maxX = 0;
    const minY = height - drawH;
    const maxY = 0;
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    ctx.globalAlpha = alpha;
    ctx.drawImage(wideImg, clampedX, clampedY, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  // Cinematic atmospheric readability veil that blooms gently as the full mountain settles
  const veilAlpha = hasWideImg ? Math.max(alpha, quoteVeilT) : quoteVeilT;
  if (veilAlpha > 0.004) {
    const bottomVig = ctx.createLinearGradient(0, height * 0.48, 0, height);
    bottomVig.addColorStop(0, 'rgba(10, 16, 26, 0)');
    bottomVig.addColorStop(
      0.55,
      `rgba(10, 16, 26, ${((0.1 + 0.28 * quoteVeilT) * veilAlpha).toFixed(3)})`
    );
    bottomVig.addColorStop(
      1,
      `rgba(10, 16, 26, ${((0.24 + 0.38 * quoteVeilT) * veilAlpha).toFixed(3)})`
    );
    ctx.fillStyle = bottomVig;
    ctx.fillRect(0, height * 0.48, width, height * 0.52);

    if (quoteVeilT > 0.01) {
      const topVig = ctx.createLinearGradient(0, 0, 0, height * 0.26);
      topVig.addColorStop(0, `rgba(10, 16, 26, ${(0.28 * quoteVeilT).toFixed(3)})`);
      topVig.addColorStop(1, 'rgba(10, 16, 26, 0)');
      ctx.fillStyle = topVig;
      ctx.fillRect(0, 0, width, height * 0.26);
    }
  }
  ctx.restore();
}
