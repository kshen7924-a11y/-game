import {
  ARM_LOWER,
  ARM_UPPER,
  getShoulderAndHip,
  LEG_LOWER,
  LEG_UPPER,
  predictReachPose,
  solveTwoBoneIK,
} from './ik';
import { MountainWorld } from './mountain';
import {
  ActiveWeather,
  CameraState,
  ClimberSkinConfig,
  ClimberState,
  ClimbEvent,
  DynoChargeState,
  GamePhase,
  HoverInfo,
  LimbId,
  Particle,
  Piton,
  Vec2,
} from './types';

const INK = '#141820';

function tracePoly(ctx: CanvasRenderingContext2D, pts: Vec2[]) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
}

function shadeHexColor(hex: string, delta: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const shift = (c: number) =>
    delta >= 0
      ? Math.round(c + (255 - c) * Math.min(1, delta))
      : Math.round(c * Math.max(0, 1 + delta));
  return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
}

function computeHoldStaminaCostRatio(
  h: MountainWorld['holds'][number],
  climber: ClimberState,
  weather: ActiveWeather
): number {
  const baseCostByType: Record<MountainWorld['holds'][number]['type'], number> = {
    ledge: 0.1,
    jug: 0.22,
    crack: 0.4,
    crimp: 0.68,
    fragile: 0.74,
    ice: 0.84,
  };

  let cost = baseCostByType[h.type];
  if (h.type === 'fragile') {
    cost += h.crackProgress * 0.26;
  }
  if (h.chalked) {
    cost -= h.type === 'ice' ? 0.22 : 0.14;
  }
  if (h.wet && !h.chalked) {
    cost += 0.16;
  }
  if (weather.type === 'rain' && !h.chalked) {
    cost += 0.1 * weather.intensity;
  }

  const d = Math.hypot(h.x - climber.torsoPos.x, h.y - climber.torsoPos.y);
  if (d < 150) {
    const stretch = Math.max(0, (d - 52) / 56);
    cost += stretch * 0.16;
  }
  const staminaRatio = climber.stamina / climber.maxStamina;
  if (staminaRatio < 0.48) {
    cost += ((0.48 - staminaRatio) / 0.48) * 0.18;
  }

  return Math.max(0.05, Math.min(1, cost));
}

function drawCapsuleLimb(
  ctx: CanvasRenderingContext2D,
  a: Vec2,
  b: Vec2,
  width: number,
  fill: string,
  shadowFill: string,
  inkWidth: number
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width * 0.5);
  const ny = (dx / len) * (width * 0.5);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = INK;
  ctx.lineWidth = width + inkWidth * 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.strokeStyle = shadowFill;
  ctx.lineWidth = width * 0.36;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * 0.45, a.y + ny * 0.45);
  ctx.lineTo(b.x + nx * 0.45, b.y + ny * 0.45);
  ctx.stroke();

  ctx.restore();
}

export interface RenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  world: MountainWorld;
  climber: ClimberState;
  pitons: Piton[];
  particles: Particle[];
  camera: CameraState;
  hover: HoverInfo | null;
  reachableIds: Set<string>;
  tutorialHoldId: string | null;
  lockedLimb: LimbId | null;
  phase: GamePhase;
  timeSec: number;
  windForce: number;
  weather: ActiveWeather;
  isReadingRoute: boolean;
  summitProgress: number;
  skin: ClimberSkinConfig;
  dynoCharge: DynoChargeState | null;
  routeEvents: ClimbEvent[];
  trailPlaybackProgress: number | null;
  nearbyRecyclablePitonId: string | null;
  betaPins?: string[];
}

export function renderGameFrame(params: RenderParams) {
  const {
    ctx,
    width,
    height,
    world,
    climber,
    pitons,
    particles,
    camera,
    hover,
    reachableIds,
    tutorialHoldId,
    lockedLimb,
    phase,
    timeSec,
    windForce,
    weather,
    isReadingRoute,
    summitProgress,
    skin,
    dynoCharge,
    routeEvents,
    trailPlaybackProgress,
    nearbyRecyclablePitonId,
    betaPins = [],
  } = params;

  const mountainHeight = world.mountainHeight;
  const altRatio = Math.max(0, Math.min(1, -climber.torsoPos.y / mountainHeight));
  const inkScale = Math.max(1.05, Math.min(2.4, 1.75 / Math.sqrt(camera.zoom)));

  // 1. Graphic-Novel Sky Gradient (Palette shifts by route + altitude)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (phase === 'SUMMIT') {
    skyGrad.addColorStop(0, '#132742');
    skyGrad.addColorStop(0.5, '#3E6B94');
    skyGrad.addColorStop(1, '#D6DFEA');
  } else if (world.route.palette === 'granite') {
    skyGrad.addColorStop(0, '#2B486B');
    skyGrad.addColorStop(0.65, '#8BA9C4');
    skyGrad.addColorStop(1, '#E6D8C5');
  } else if (world.route.palette === 'glacial') {
    skyGrad.addColorStop(0, '#122238');
    skyGrad.addColorStop(0.55, '#335478');
    skyGrad.addColorStop(1, '#A9C2D9');
  } else {
    const topR = Math.round(48 - altRatio * 24);
    const topG = Math.round(68 - altRatio * 20);
    const topB = Math.round(96 - altRatio * 12);
    const botR = Math.round(208 - altRatio * 34);
    const botG = Math.round(200 - altRatio * 22);
    const botB = Math.round(190 - altRatio * 6);
    skyGrad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
    skyGrad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Comic Sun & Concentric Halos + Diagonal Light Shafts
  ctx.save();
  const sunX = width * 0.2;
  const sunY = height * (0.22 - altRatio * 0.06);
  ctx.fillStyle = 'rgba(255, 245, 222, 0.92)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 245, 222, 0.25)';
  ctx.lineWidth = 10;
  ctx.stroke();

  const beamGrad = ctx.createLinearGradient(sunX, sunY, width * 0.9, height);
  beamGrad.addColorStop(0, 'rgba(255, 243, 214, 0.16)');
  beamGrad.addColorStop(1, 'rgba(255, 243, 214, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(sunX - 36, sunY);
  ctx.lineTo(sunX + 64, sunY - 22);
  ctx.lineTo(width * 1.15, height * 0.72);
  ctx.lineTo(width * 0.4, height * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Parallax Distant Alpine Ranges (2.5D Split-Lit Comic Peaks + Atmospheric Depth Haze)
  world.distantPeaks.forEach((peak, layerIdx) => {
    ctx.save();
    ctx.translate(width * 0.5, height * 0.58);
    const pZoom = Math.max(0.22, camera.zoom * (0.36 + peak.parallax));
    ctx.scale(pZoom, pZoom);
    ctx.translate(-camera.x * peak.parallax, -camera.y * peak.parallax + 480);

    // Base silhouette fill
    tracePoly(ctx, peak.points);
    ctx.fillStyle = peak.shade;
    ctx.fill();

    // 2.5D Comic Right-Slope Cel-Shaded Shadow Faces (each peak triangle split from ridge apex)
    ctx.save();
    ctx.clip();
    for (let i = 1; i < peak.points.length - 1; i += 2) {
      const apex = peak.points[i];
      const valleyR = peak.points[i + 1];
      ctx.fillStyle = peak.shadowShade;
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(valleyR.x, valleyR.y);
      ctx.lineTo(apex.x + 120, 1200);
      ctx.lineTo(apex.x - 40, 1200);
      ctx.closePath();
      ctx.fill();

      // Sunlit left-slope comic rim highlight
      const valleyL = peak.points[i - 1];
      ctx.strokeStyle = peak.rimShade;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(valleyL.x, valleyL.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.stroke();

      // High-altitude snow ridge cap on distant peaks
      if (peak.hasSnow) {
        const capY = apex.y + 340;
        ctx.fillStyle = 'rgba(238, 245, 252, 0.78)';
        ctx.beginPath();
        ctx.moveTo(apex.x, apex.y);
        ctx.lineTo(apex.x + 145, capY - 35);
        ctx.lineTo(apex.x + 25, capY + 45);
        ctx.lineTo(apex.x - 135, capY - 20);
        ctx.closePath();
        ctx.fill();
      }

      // Subtle comic ink cross-hatching on mid-range shadowed slopes
      if (peak.hasHatching) {
        ctx.strokeStyle = 'rgba(20, 24, 32, 0.28)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let h = 1; h <= 5; h++) {
          const hx = apex.x + 65 + h * 36;
          const hy = apex.y + 180 + h * 70;
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + 70, hy + 45);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // Crisp comic ink contour along ridge line
    tracePoly(ctx, peak.points);
    ctx.strokeStyle = layerIdx === 0 ? 'rgba(20, 24, 32, 0.42)' : 'rgba(20, 24, 32, 0.78)';
    ctx.lineWidth = layerIdx === 0 ? 3.5 : 4.5;
    ctx.stroke();
    ctx.restore();

    // Soft atmospheric valley haze band between parallax layers to deepen 2.5D space
    if (layerIdx < world.distantPeaks.length - 1) {
      const hazeGrad = ctx.createLinearGradient(0, height * 0.42, 0, height);
      hazeGrad.addColorStop(0, 'rgba(214, 226, 238, 0)');
      hazeGrad.addColorStop(0.65, 'rgba(214, 226, 238, 0.14)');
      hazeGrad.addColorStop(1, 'rgba(226, 234, 242, 0.24)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, height * 0.42, width, height * 0.58);
    }
  });

  // 3. Drifting Franco-Belgian Comic Clouds (Sculpted Cumulus & Wind-Swept Cirrus)
  for (const cloud of world.clouds) {
    ctx.save();
    ctx.translate(width * 0.5, height * 0.55);
    const cZoom = camera.zoom * (0.64 + cloud.parallax * 0.44);
    ctx.scale(cZoom, cZoom);
    const driftX = ((cloud.x + timeSec * cloud.speed + 2200) % 4400) - 2200;
    ctx.translate(driftX - camera.x * cloud.parallax, cloud.y - camera.y * 0.65);

    ctx.globalAlpha = cloud.opacity;
    const hw = cloud.width * 0.5;
    const hh = cloud.height * 0.5;

    if (cloud.kind === 'cirrus') {
      // Thin high-altitude comic wind-streaked cloud ribbon
      ctx.fillStyle = '#F1F5F9';
      ctx.strokeStyle = 'rgba(20, 24, 32, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.quadraticCurveTo(-hw * 0.35, -hh * 1.15, hw * 0.25, -hh * 0.4);
      ctx.quadraticCurveTo(hw * 0.72, -hh * 0.9, hw, 0);
      ctx.quadraticCurveTo(hw * 0.35, hh * 0.55, -hw * 0.4, hh * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Sculpted puffy cumulus cloud with flat cel-shaded base & bold comic ink outline
      const drawCumulusSilhouette = () => {
        ctx.beginPath();
        ctx.moveTo(-hw * 0.92, hh * 0.45);
        ctx.arc(-hw * 0.56, hh * 0.05, hh * 0.72, Math.PI * 0.85, Math.PI * 1.85);
        ctx.arc(-hw * 0.14, -hh * 0.35, hh * 0.95, Math.PI * 1.08, Math.PI * 1.96);
        ctx.arc(hw * 0.34, -hh * 0.18, hh * 0.78, Math.PI * 1.15, Math.PI * 1.95);
        ctx.arc(hw * 0.68, hh * 0.12, hh * 0.54, Math.PI * 1.25, Math.PI * 0.2);
        ctx.lineTo(-hw * 0.92, hh * 0.45);
        ctx.closePath();
      };

      drawCumulusSilhouette();
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();

      // Flat cel-shaded cool underside clipped inside cloud
      ctx.save();
      drawCumulusSilhouette();
      ctx.clip();
      ctx.fillStyle = '#BAC9D9';
      ctx.fillRect(-hw * 1.2, hh * 0.08, cloud.width * 1.2, hh * 0.9);
      ctx.restore();

      drawCumulusSilhouette();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3B. Distant Soaring Alpine Birds (Animated Ink Silhouettes across Valley Depths)
  if (weather.type !== 'snowstorm') {
    for (const bird of world.birds) {
      ctx.save();
      ctx.translate(width * 0.5, height * 0.55);
      const bZoom = Math.max(0.28, camera.zoom * (0.58 + bird.parallax * 0.55));
      ctx.scale(bZoom, bZoom);
      const span = 4200;
      const rawX = bird.x + timeSec * bird.speed * bird.dir;
      const wrapX = ((((rawX + span * 0.5) % span) + span) % span) - span * 0.5;
      const glideBob = Math.sin(timeSec * 1.8 + bird.phase) * 7;
      ctx.translate(wrapX - camera.x * bird.parallax, bird.y + glideBob - camera.y * (0.4 + bird.parallax));

      const wingBeat = Math.sin(timeSec * bird.flapSpeed + bird.phase);
      const wingTipY = -4 + wingBeat * 6.5;
      const s = bird.scale * 11;

      ctx.globalAlpha = Math.max(0.35, 0.86 - weather.fogOpacity * 0.65);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4 * bird.scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-s, wingTipY);
      ctx.quadraticCurveTo(-s * 0.45, -s * 0.48 + wingTipY * 0.35, 0, 0);
      ctx.quadraticCurveTo(s * 0.45, -s * 0.48 + wingTipY * 0.35, s, wingTipY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. World-Space Camera Transform
  const shakeX = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
  const shakeY = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;

  ctx.save();
  ctx.translate(width * 0.5 + shakeX, height * 0.52 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 4A. Mountain Extruded 2.5D Shadow Flank
  const flankDepthX = 52;
  const flankDepthY = 44;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < world.outlineRight.length; i++) {
    const p = world.outlineRight[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = world.outlineRight.length - 1; i >= 0; i--) {
    const p = world.outlineRight[i];
    ctx.lineTo(p.x + flankDepthX, p.y + flankDepthY);
  }
  ctx.closePath();
  ctx.fillStyle = '#232934';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * inkScale;
  ctx.stroke();
  ctx.restore();

  // 4B. Main Cliff Silhouette Base
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < world.outlineLeft.length; i++) {
    const p = world.outlineLeft[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = world.outlineRight.length - 1; i >= 0; i--) {
    const p = world.outlineRight[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();

  const cliffGrad = ctx.createLinearGradient(0, 100, 0, -mountainHeight);
  if (world.route.palette === 'granite') {
    cliffGrad.addColorStop(0, '#9E8F7B');
    cliffGrad.addColorStop(1, '#B8AA96');
  } else if (world.route.palette === 'glacial') {
    cliffGrad.addColorStop(0, '#50647A');
    cliffGrad.addColorStop(1, '#849DB5');
  } else {
    cliffGrad.addColorStop(0, '#787D87');
    cliffGrad.addColorStop(1, '#616C7D');
  }
  ctx.fillStyle = cliffGrad;
  ctx.fill();
  ctx.clip();

  // 4C. Render Visible 2.5D Rock Facets
  const viewHalfH = (height / camera.zoom) * 0.72;
  const minVisY = camera.y - viewHalfH;
  const maxVisY = camera.y + viewHalfH;

  for (const f of world.facets) {
    const fy = f.points[0].y;
    if (fy < minVisY - 260 || fy > maxVisY + 260) continue;

    tracePoly(ctx, f.sidePoints);
    ctx.fillStyle = f.sideFill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 * inkScale;
    ctx.stroke();

    tracePoly(ctx, f.points);
    ctx.fillStyle = f.fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 24, 32, 0.72)';
    ctx.lineWidth = 1.5 * inkScale;
    ctx.stroke();

    // Sunlit top-left rim highlight
    if (f.rimHighlight) {
      ctx.strokeStyle = 'rgba(255, 249, 236, 0.36)';
      ctx.lineWidth = 2.2 * inkScale;
      ctx.beginPath();
      ctx.moveTo(f.points[3].x + 2, f.points[3].y - 2);
      ctx.lineTo(f.points[0].x + 2, f.points[0].y + 2);
      ctx.lineTo(f.points[1].x - 2, f.points[1].y + 2);
      ctx.stroke();
    }

    // Comic ink cross-hatching in deep shadow crevices
    if (f.hasHatching && camera.zoom > 0.34) {
      ctx.strokeStyle = 'rgba(20, 24, 32, 0.26)';
      ctx.lineWidth = 1.25;
      const cx = (f.points[1].x + f.points[2].x) * 0.5 - 12;
      const cy = (f.points[1].y + f.points[2].y) * 0.5;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(cx - 10, cy + k * 7);
        ctx.lineTo(cx + 12, cy + k * 7 + 8);
      }
      ctx.stroke();
    }

    // Alpine moss tufts on lower granite
    if (f.mossPatch) {
      tracePoly(ctx, f.mossPatch);
      ctx.fillStyle = '#5B7052';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2 * inkScale;
      ctx.stroke();
    }

    // Snow cap lip
    if (f.snowCap) {
      tracePoly(ctx, f.snowCap);
      ctx.fillStyle = '#EEF5FB';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4 * inkScale;
      ctx.stroke();
    }
  }

  // Valley Base Apron & Stylized Alpine Pines at 0m
  ctx.fillStyle = '#2B333D';
  ctx.fillRect(-600, 12, 1200, 240);
  if (maxVisY > -100) {
    for (let px = -280; px <= 280; px += 46) {
      if (Math.abs(px) < 95) continue;
      const h = 34 + (Math.abs(px * 13) % 24);
      ctx.fillStyle = '#2C423A';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 14 - h);
      ctx.lineTo(px + 16, 14);
      ctx.lineTo(px - 16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Outer mountain ink silhouette
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < world.outlineLeft.length; i++) {
    const p = world.outlineLeft[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = world.outlineRight.length - 1; i >= 0; i--) {
    const p = world.outlineRight[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2 * inkScale;
  ctx.stroke();
  ctx.restore();

  // 4D. Rest / Bivouac Ledges & Summit Crown
  for (const ledge of world.ledges) {
    if (ledge.y < minVisY - 220 || ledge.y > maxVisY + 220) continue;
    const lx = ledge.x - ledge.width * 0.5;
    const ly = ledge.y;

    ctx.save();
    ctx.fillStyle = '#47505E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2 * inkScale;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + ledge.width, ly);
    ctx.lineTo(lx + ledge.width + 18, ly + 22);
    ctx.lineTo(lx + 12, ly + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ledge.isSummit ? '#F8FAFC' : '#DFE7EF';
    ctx.beginPath();
    ctx.roundRect(lx - 4, ly - 8, ledge.width + 8, 12, 4);
    ctx.fill();
    ctx.stroke();

    if (ledge.isSummit) {
      world.cairnStones.forEach((st, idx) => {
        const w = 26 - idx * 4.5;
        const h = 11 - idx * 1.2;
        ctx.fillStyle = idx % 2 === 0 ? '#C7BFB0' : '#969EA9';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2 * inkScale;
        ctx.beginPath();
        ctx.ellipse(st.x, st.y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      const poleX = ledge.x - 42;
      const poleY = ly - 8;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3 * inkScale;
      ctx.beginPath();
      ctx.moveTo(poleX, poleY);
      ctx.lineTo(poleX, poleY - 58);
      ctx.stroke();

      const wave = Math.sin(timeSec * 5.2) * 8 + windForce * 14;
      ctx.fillStyle = '#EA580C';
      ctx.lineWidth = 2 * inkScale;
      ctx.beginPath();
      ctx.moveTo(poleX, poleY - 56);
      ctx.quadraticCurveTo(poleX + 24, poleY - 50 + wave * 0.5, poleX + 46, poleY - 46 + wave);
      ctx.lineTo(poleX, poleY - 38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (ledge.isBivouac && ledge.id !== 'base-camp') {
      const flagX = ledge.x + ledge.width * 0.36;
      const flagY = ly - 8;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2 * inkScale;
      ctx.beginPath();
      ctx.moveTo(flagX, flagY);
      ctx.lineTo(flagX, flagY - 30);
      ctx.stroke();

      ctx.fillStyle = ledge.visited ? '#10B981' : '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(flagX, flagY - 30);
      ctx.lineTo(flagX + 18, flagY - 24 + Math.sin(timeSec * 4) * 3);
      ctx.lineTo(flagX, flagY - 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (camera.zoom > 0.32) {
      ctx.fillStyle = 'rgba(20, 24, 32, 0.88)';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ledge.label, ledge.x, ly + 40);
    }
    ctx.restore();
  }

  // 4E. Climbable Holds + Reachable Touch Affordances
  if (camera.zoom > 0.24) {
    const holdAlpha = Math.min(1, (camera.zoom - 0.24) / 0.28);
    ctx.save();
    ctx.globalAlpha = holdAlpha;

    // In Route-Reading pause mode, show tactical sightlines from the inspected hold to nearby next holds
    if (isReadingRoute && hover?.hold) {
      const origin = hover.hold;
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      for (const target of world.holds) {
        if (target.broken || target.id === origin.id) continue;
        const d = Math.hypot(target.x - origin.x, target.y - origin.y);
        if (d <= 78 && target.y <= origin.y + 24) {
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Map active limb strain per hold so gripped strained holds visibly tremble
    const strainedHoldMap = new Map<string, number>();
    (['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as LimbId[]).forEach((id) => {
      const l = climber.limbs[id];
      if (l.holdId && l.strain > 0.3) {
        strainedHoldMap.set(l.holdId, Math.max(strainedHoldMap.get(l.holdId) ?? 0, l.strain));
      }
    });

    for (const h of world.holds) {
      if (h.broken) continue;
      if (h.y < minVisY - 80 || h.y > maxVisY + 80) continue;

      const isHovered = hover?.hold?.id === h.id;
      const isReachable = phase === 'PLAYING' && reachableIds.has(h.id);
      const isTutorialTarget = phase === 'PLAYING' && tutorialHoldId === h.id;
      const costRatio = computeHoldStaminaCostRatio(h, climber, weather);
      const activeStrain = strainedHoldMap.get(h.id) ?? 0;

      // Per-hold micro-jitter animation by hold type & load/fragility
      const seedPhase = h.x * 0.13 + h.y * 0.07;
      let jitterX = 0;
      let jitterY = 0;
      let jitterAngle = 0;

      if (h.type === 'fragile') {
        // Fragile rock continuously trembles with crisp brittle bursts; escalates as cracks widen
        const burst = 0.45 + 0.55 * Math.max(0, Math.sin(timeSec * 2.9 + seedPhase));
        const amp = (0.5 + h.crackProgress * 2.1 + activeStrain * 1.1) * burst;
        jitterX = Math.sin(timeSec * 24 + seedPhase) * amp;
        jitterY = Math.cos(timeSec * 19 + seedPhase * 1.3) * amp * 0.7;
        jitterAngle = Math.sin(timeSec * 16 + seedPhase) * (0.025 + h.crackProgress * 0.08);
      } else if (h.type === 'ice') {
        // Cold crystalline micro-shiver
        const amp = 0.28 + activeStrain * 0.75;
        jitterX = Math.sin(timeSec * 13 + seedPhase) * amp;
        jitterY = Math.cos(timeSec * 11 + seedPhase) * amp * 0.35;
      } else if (h.type === 'crimp') {
        // Tiny tension vibration when climber is fatigued or actively pulling hard
        const fatigue = climber.stamina < 40 ? (40 - climber.stamina) / 40 : 0;
        const amp = activeStrain * 0.85 + fatigue * 0.35;
        if (amp > 0.08) {
          jitterX = Math.sin(timeSec * 18 + seedPhase) * amp;
          jitterY = Math.cos(timeSec * 15 + seedPhase) * amp * 0.5;
        }
      } else if (activeStrain > 0.55) {
        jitterX = Math.sin(timeSec * 16 + seedPhase) * activeStrain * 0.55;
      }

      ctx.save();
      ctx.translate(h.x + jitterX, h.y + jitterY);

      // Subtle ivory halo ring for all currently reachable holds (crucial for mobile touch!)
      if (isReachable && !isHovered && !isTutorialTarget) {
        ctx.strokeStyle = 'rgba(254, 243, 199, 0.56)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, h.radius + 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Route-Reading Scan Overlay: highlights rock quality + remaining grip intensity
      if (isReadingRoute && !isHovered) {
        const readColor =
          h.type === 'jug' || h.type === 'ledge'
            ? '#34D399'
            : h.type === 'crack'
              ? '#60A5FA'
              : h.type === 'fragile'
                ? '#F59E0B'
                : h.type === 'ice'
                  ? '#38BDF8'
                  : '#CBD5E1';
        ctx.save();
        ctx.strokeStyle = readColor;
        ctx.lineWidth = 2.1;
        if (h.type === 'fragile' || h.type === 'ice') {
          ctx.setLineDash([4, 3]);
        }
        ctx.beginPath();
        ctx.arc(0, 0, h.radius + 7, 0, Math.PI * 2);
        ctx.stroke();

        // Remaining grip strength arc (full bright green = low stamina cost; short dark red = high cost)
        const remainingGrip = Math.max(0.12, 1 - costRatio);
        ctx.setLineDash([]);
        ctx.strokeStyle =
          remainingGrip >= 0.65
            ? '#6EE7B7'
            : remainingGrip >= 0.38
              ? '#FBBF24'
              : '#EF4444';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          h.radius + 10.5,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * remainingGrip
        );
        ctx.stroke();
        ctx.restore();
      }

      // Tutorial pulsing beacon ring
      if (isTutorialTarget) {
        const pulse = 1 + Math.sin(timeSec * 5.2) * 0.18;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(0, 0, (h.radius + 10) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fill();
      }

      ctx.rotate(h.angle + jitterAngle);

      const r = h.radius;
      const v = h.shapeVariant;
      let baseMain = '#E6DDD0';
      let baseEdge = '#8E8477';
      if (h.type === 'crimp') {
        baseMain = '#B6BEC9';
        baseEdge = '#5E6878';
      } else if (h.type === 'crack') {
        baseMain = '#252C38';
        baseEdge = '#141820';
      } else if (h.type === 'ice') {
        baseMain = '#BAE6FD';
        baseEdge = '#0284C7';
      } else if (h.type === 'fragile') {
        baseMain = '#D9B182';
        baseEdge = '#9A632C';
      } else if (h.type === 'ledge') {
        baseMain = '#F2ECE1';
        baseEdge = '#948B7D';
      }

      // Visual color lightness/depth tied to remaining grip / stamina cost:
      // Low cost (<0.38) -> lighter, brighter sunlit stone; high cost (>0.55) -> darker, heavier shadowed rock
      const shadeShift =
        costRatio < 0.38
          ? (0.38 - costRatio) * 0.45
          : -(costRatio - 0.38) * 0.56;
      const mainColor = shadeHexColor(baseMain, shadeShift);
      const edgeColor = shadeHexColor(baseEdge, shadeShift * 0.85);

      const strokeClr = isHovered
        ? hover?.reachable
          ? '#F59E0B'
          : '#EF4444'
        : INK;
      const strokeW = isHovered ? 3 : 1.9;

      if (h.type === 'crack') {
        // Rich angular rock fissures (lip brightness reflects stamina cost)
        ctx.strokeStyle = shadeHexColor('#9BA4B0', shadeShift);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (v % 2 === 0) {
          ctx.moveTo(-2, -r * 1.35);
          ctx.lineTo(3, -r * 0.3);
          ctx.lineTo(-3, r * 0.45);
          ctx.lineTo(2, r * 1.35);
        } else {
          ctx.moveTo(0, -r * 1.3);
          ctx.lineTo(-4, 0);
          ctx.lineTo(3, r * 1.3);
        }
        ctx.stroke();

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 5.5;
        ctx.stroke();
        ctx.strokeStyle = isHovered ? strokeClr : INK;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      } else if (h.type === 'crimp') {
        // Sharp flat micro-flakes / side-pull edges / undercut ledges
        const pts: Vec2[] =
          v === 0
            ? [
                { x: -r * 1.25, y: -r * 0.35 },
                { x: r * 1.15, y: -r * 0.5 },
                { x: r * 1.25, y: r * 0.28 },
                { x: -r * 1.05, y: r * 0.42 },
              ]
            : v === 1
              ? [
                  { x: -r * 1.1, y: -r * 0.25 },
                  { x: 0, y: -r * 0.62 },
                  { x: r * 1.2, y: -r * 0.2 },
                  { x: r * 0.9, y: r * 0.42 },
                  { x: -r * 0.9, y: r * 0.38 },
                ]
              : [
                  { x: -r * 1.2, y: -r * 0.45 },
                  { x: r * 1.2, y: -r * 0.22 },
                  { x: r * 0.95, y: r * 0.46 },
                  { x: -r * 1.1, y: r * 0.26 },
                ];

        // Drop shadow
        ctx.save();
        ctx.translate(3, 4);
        tracePoly(ctx, pts);
        ctx.fillStyle = 'rgba(15, 19, 26, 0.55)';
        ctx.fill();
        ctx.restore();

        tracePoly(ctx, pts);
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.strokeStyle = strokeClr;
        ctx.lineWidth = strokeW;
        ctx.stroke();

        // Crisp sunlit crimp top lip (intensity fades on high-cost crimps)
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.82 - costRatio * 0.45).toFixed(2)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x + 2, pts[0].y + 1.5);
        ctx.lineTo(pts[1].x - 2, pts[1].y + 1.5);
        ctx.stroke();
      } else if (h.type === 'ice') {
        // Crystalline faceted ice hold + hanging icicle tip
        const pts: Vec2[] = [
          { x: -r * 0.95, y: -r * 0.4 },
          { x: -r * 0.15, y: -r * 0.85 },
          { x: r * 0.95, y: -r * 0.35 },
          { x: r * 0.75, y: r * 0.55 },
          { x: 0, y: r * 1.15 },
          { x: -r * 0.72, y: r * 0.52 },
        ];
        ctx.save();
        ctx.translate(3, 4);
        tracePoly(ctx, pts);
        ctx.fillStyle = 'rgba(15, 19, 26, 0.45)';
        ctx.fill();
        ctx.restore();

        tracePoly(ctx, pts);
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.strokeStyle = strokeClr;
        ctx.lineWidth = strokeW;
        ctx.stroke();

        ctx.fillStyle = edgeColor;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.75);
        ctx.lineTo(r * 0.75, -r * 0.3);
        ctx.lineTo(0, r * 0.95);
        ctx.closePath();
        ctx.fill();

        // Subtle icy glint pulse
        const glintAlpha = 0.35 + 0.45 * Math.max(0, Math.sin(timeSec * 3.4 + seedPhase));
        ctx.strokeStyle = `rgba(255, 255, 255, ${glintAlpha.toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.35);
        ctx.lineTo(-r * 0.1, -r * 0.65);
        ctx.stroke();
      } else {
        // Sculpted polygonal Jug / Ledge / Fragile rock knobs with 4 organic silhouettes
        const pts: Vec2[] =
          v === 0
            ? [
                { x: -r * 1.05, y: -r * 0.25 },
                { x: -r * 0.35, y: -r * 0.78 },
                { x: r * 0.78, y: -r * 0.62 },
                { x: r * 1.08, y: r * 0.18 },
                { x: r * 0.42, y: r * 0.72 },
                { x: -r * 0.75, y: r * 0.58 },
              ]
            : v === 1
              ? [
                  { x: -r * 1.12, y: -r * 0.42 },
                  { x: r * 0.22, y: -r * 0.72 },
                  { x: r * 1.05, y: -r * 0.2 },
                  { x: r * 0.85, y: r * 0.55 },
                  { x: -r * 0.25, y: r * 0.7 },
                  { x: -r * 0.95, y: r * 0.3 },
                ]
              : v === 2
                ? [
                    { x: -r * 0.9, y: -r * 0.65 },
                    { x: r * 0.45, y: -r * 0.75 },
                    { x: r * 1.12, y: 0 },
                    { x: r * 0.65, y: r * 0.68 },
                    { x: -r * 0.62, y: r * 0.65 },
                    { x: -r * 1.05, y: r * 0.05 },
                  ]
                : [
                    { x: -r * 1.18, y: -r * 0.12 },
                    { x: -r * 0.45, y: -r * 0.72 },
                    { x: r * 0.85, y: -r * 0.52 },
                    { x: r * 1.02, y: r * 0.35 },
                    { x: -r * 0.18, y: r * 0.68 },
                    { x: -r * 0.98, y: r * 0.42 },
                  ];

        ctx.save();
        ctx.translate(3.2, 4.2);
        tracePoly(ctx, pts);
        ctx.fillStyle = 'rgba(15, 19, 26, 0.55)';
        ctx.fill();
        ctx.restore();

        tracePoly(ctx, pts);
        ctx.fillStyle = mainColor;
        ctx.fill();

        // Undercut bottom bevel inside hold
        ctx.save();
        ctx.clip();
        ctx.fillStyle = edgeColor;
        ctx.beginPath();
        ctx.rect(-r * 1.3, r * 0.16, r * 2.6, r);
        ctx.fill();

        // Top sunlit rim (brighter for low stamina-cost holds, subdued for draining holds)
        ctx.strokeStyle = `rgba(255, 252, 244, ${(0.76 - costRatio * 0.48).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + 1);
        ctx.lineTo(pts[1].x, pts[1].y + 1);
        ctx.lineTo(pts[2].x, pts[2].y + 1);
        ctx.stroke();
        ctx.restore();

        tracePoly(ctx, pts);
        ctx.strokeStyle = strokeClr;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }

      if (h.type === 'fragile') {
        ctx.strokeStyle = h.crackProgress > 0.25 ? '#DC2626' : INK;
        ctx.lineWidth = 1.5 + h.crackProgress * 1.8;
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, -3);
        ctx.lineTo(-1, 1);
        ctx.lineTo(r * 0.65, -2);
        ctx.moveTo(-1, 1);
        ctx.lineTo(2, r * 0.55);
        ctx.stroke();
      }

      if (h.chalked) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(-2, -1, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }

      // Seeping damp rock sheen + glistening water droplet
      if (h.wet) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.82)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, -Math.PI * 0.8, -Math.PI * 0.15);
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(r * 0.45, r * 0.38, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Directional grip lip accent (sidepull / undercling)
      if (h.gripKind && h.gripKind !== 'downpull') {
        ctx.strokeStyle =
          h.gripKind === 'undercling'
            ? 'rgba(245, 158, 11, 0.92)'
            : 'rgba(250, 204, 21, 0.92)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (h.gripKind === 'sidepullLeft') {
          ctx.arc(0, 0, r * 0.78, Math.PI * 0.65, Math.PI * 1.35);
        } else if (h.gripKind === 'sidepullRight') {
          ctx.arc(0, 0, r * 0.78, -Math.PI * 0.35, Math.PI * 0.35);
        } else {
          ctx.arc(0, 0, r * 0.78, Math.PI * 0.15, Math.PI * 0.85);
        }
        ctx.stroke();
      }

      ctx.restore();

      // Clear directional pull arrow badge when hovered or in Route-Read mode
      if ((isHovered || isReadingRoute) && h.gripKind && h.gripKind !== 'downpull') {
        ctx.save();
        ctx.translate(h.x, h.y - h.radius - 9);
        ctx.fillStyle = 'rgba(20, 24, 32, 0.86)';
        ctx.strokeStyle = h.gripKind === 'undercling' ? '#F59E0B' : '#FACC15';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(-9, -7, 18, 13, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FEF3C7';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const arrow =
          h.gripKind === 'sidepullLeft' ? '→' : h.gripKind === 'sidepullRight' ? '←' : '↑';
        ctx.fillText(arrow, 0, -0.5);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // 4E-1B. Player-drawn Route-Read Beta Chalk Pins & Sequence Lines
  if (betaPins.length > 0 && phase === 'PLAYING') {
    const holdsById = new Map(world.holds.map((h) => [h.id, h]));
    const pinHolds = betaPins
      .map((id) => holdsById.get(id))
      .filter((h): h is NonNullable<typeof h> => !!h && !h.broken);

    if (pinHolds.length > 0) {
      ctx.save();
      const baseAlpha = isReadingRoute ? 0.92 : 0.45;
      if (pinHolds.length >= 2) {
        ctx.globalAlpha = baseAlpha * 0.75;
        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(pinHolds[0].x, pinHolds[0].y);
        for (let i = 1; i < pinHolds.length; i++) {
          ctx.lineTo(pinHolds[i].x, pinHolds[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.globalAlpha = baseAlpha;
      pinHolds.forEach((h, idx) => {
        const px = h.x + h.radius + 3;
        const py = h.y - h.radius - 3;
        ctx.fillStyle = '#FEF3C7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = INK;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), px, py + 0.5);
      });
      ctx.restore();
    }
  }

  // 4E-2. Dyno Hold-to-Lunge Charge Indicator
  if (dynoCharge && phase === 'PLAYING' && !climber.isFalling) {
    const startLimb = climber.limbs[dynoCharge.limbId];
    const target = dynoCharge.hold;
    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(startLimb.pos.x, startLimb.pos.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(20, 24, 32, 0.65)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = dynoCharge.progress >= 0.95 ? '#34D399' : '#F59E0B';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(
      target.x,
      target.y,
      target.radius + 9,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.min(1, dynoCharge.progress)
    );
    ctx.stroke();
    ctx.restore();
  }

  // 4F. Summit Zoom-Out Route Trail & Animated Playback
  if (phase === 'SUMMIT' && climber.routeHistory.length > 1) {
    const totalPts = climber.routeHistory.length;
    const progress = trailPlaybackProgress ?? 1;
    const visiblePts = Math.max(2, Math.floor(totalPts * Math.max(0.02, Math.min(1, progress))));

    ctx.save();
    ctx.globalAlpha = Math.min(0.95, summitProgress * 1.25);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5 * inkScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([12 * inkScale, 8 * inkScale]);
    ctx.beginPath();
    ctx.moveTo(climber.routeHistory[0].x, climber.routeHistory[0].y);
    for (let i = 1; i < visiblePts; i++) {
      ctx.lineTo(climber.routeHistory[i].x, climber.routeHistory[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Moving beacon during trail playback
    if (trailPlaybackProgress !== null) {
      const marker = climber.routeHistory[Math.min(totalPts - 1, visiblePts - 1)];
      ctx.fillStyle = '#FEF3C7';
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 3 * inkScale;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 10 * inkScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Milestone event pins (Piton, Slip, Dyno, Bivouac) along visible trail
    const cutoffY =
      climber.routeHistory[Math.min(totalPts - 1, visiblePts - 1)]?.y ?? -mountainHeight;
    for (const ev of routeEvents) {
      if (trailPlaybackProgress !== null && ev.y < cutoffY - 12) continue;
      const badgeColor =
        ev.kind === 'slip'
          ? '#EF4444'
          : ev.kind === 'dyno'
            ? '#38BDF8'
            : ev.kind === 'bivouac'
              ? '#10B981'
              : '#F59E0B';
      const shortText =
        ev.kind === 'slip' ? '滑' : ev.kind === 'dyno' ? '跃' : ev.kind === 'bivouac' ? '营' : '钉';
      ctx.fillStyle = badgeColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8 * inkScale;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 8 * inkScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (camera.zoom > 0.25) {
        ctx.fillStyle = '#141820';
        ctx.font = `bold ${Math.round(9 * inkScale)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shortText, ev.x, ev.y + 0.5);
      }
    }
    ctx.restore();
  }

  // 4G. Climbing Rope (skip rusty unclipped wall pitons, only thread player-placed pitons)
  const ropePitons = pitons.filter((p) => !p.isRusty);
  const ropeAnchors: Vec2[] = [
    { x: 0, y: 0 },
    ...ropePitons.map((p) => ({ x: p.x, y: p.y })),
    { x: climber.torsoPos.x, y: climber.torsoPos.y + 16 },
  ];

  if (ropeAnchors.length >= 2) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawRopePath = () => {
      ctx.beginPath();
      ctx.moveTo(ropeAnchors[0].x, ropeAnchors[0].y);
      for (let i = 1; i < ropeAnchors.length; i++) {
        const prev = ropeAnchors[i - 1];
        const curr = ropeAnchors[i];
        const sag = Math.min(34, Math.hypot(curr.x - prev.x, curr.y - prev.y) * 0.12);
        const mx = (prev.x + curr.x) * 0.5;
        const my = (prev.y + curr.y) * 0.5 + sag;
        ctx.quadraticCurveTo(mx, my, curr.x, curr.y);
      }
    };

    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.5 * (camera.zoom < 0.35 ? inkScale * 0.85 : 1);
    drawRopePath();
    ctx.stroke();

    ctx.strokeStyle = skin.rope;
    ctx.lineWidth = 3 * (camera.zoom < 0.35 ? inkScale * 0.85 : 1);
    drawRopePath();
    ctx.stroke();
    ctx.restore();
  }

  // 4H. Placed Pitons & Pre-placed Rusty Wall Pitons
  for (const p of pitons) {
    if (p.integrity <= 0) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    const s = camera.zoom < 0.35 ? inkScale * 0.9 : 1;
    ctx.scale(s, s);

    if (p.isRusty) {
      ctx.rotate(p.angle);
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 6, 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 5, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      if (isReadingRoute) {
        ctx.strokeStyle = p.reliable ? '#34D399' : '#F59E0B';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 2, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.reliable ? '#A7F3D0' : '#FDE68A';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.reliable ? '旧钉·可用' : '旧钉·锈蚀', 0, -10);
      }
    } else {
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 6, 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 5, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      if (nearbyRecyclablePitonId === p.id && phase === 'PLAYING' && !isReadingRoute) {
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 2, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#A7F3D0';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点按回收', 0, -11);
      }
    }
    ctx.restore();
  }

  // 4I. Ghost Limb Stretch Preview & Aim Curve
  if (
    hover?.hold &&
    phase === 'PLAYING' &&
    !climber.isFalling &&
    !dynoCharge &&
    !climber.dynoFlight
  ) {
    const startLimb = climber.limbs[hover.suggestedLimb];
    if (hover.reachable) {
      const preview = predictReachPose(climber, hover.suggestedLimb, hover.hold);
      const previewClr =
        preview.directionMismatch || preview.highRisk
          ? 'rgba(249, 115, 22, 0.42)'
          : 'rgba(56, 189, 248, 0.38)';
      const strokeClr =
        preview.directionMismatch || preview.highRisk ? '#F97316' : '#38BDF8';

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = previewClr;
      ctx.lineWidth = startLimb.isHand ? 11 : 13;
      ctx.beginPath();
      ctx.moveTo(preview.root.x, preview.root.y);
      ctx.lineTo(preview.joint.x, preview.joint.y);
      ctx.lineTo(preview.end.x, preview.end.y);
      ctx.stroke();

      ctx.strokeStyle = strokeClr;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(preview.root.x, preview.root.y);
      ctx.lineTo(preview.joint.x, preview.joint.y);
      ctx.lineTo(preview.end.x, preview.end.y);
      ctx.stroke();

      // Predicted center-of-gravity shift ring
      ctx.setLineDash([]);
      ctx.fillStyle = previewClr;
      ctx.strokeStyle = strokeClr;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(preview.predictedTorso.x, preview.predictedTorso.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = hover.dynoEligible ? '#38BDF8' : '#EF4444';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(startLimb.pos.x, startLimb.pos.y);
      ctx.lineTo(hover.hold.x, hover.hold.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Airborne Dyno motion streaks behind climber
  if (climber.dynoFlight && phase === 'PLAYING') {
    ctx.save();
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sx = climber.torsoPos.x + i * 14;
      const sy = climber.torsoPos.y + 18 + Math.abs(i) * 6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 28);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4J. Climber (Aava)
  drawClimber(
    ctx,
    climber,
    lockedLimb,
    hover,
    phase,
    timeSec,
    windForce,
    inkScale,
    skin,
    dynoCharge?.progress ?? 0
  );

  // 4K. World-Space Particles & Comic Rings
  for (const pt of particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pt.kind === 'ring') {
      const expand = (1 - alpha) * 26;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size + expand, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.kind === 'rain') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + pt.vx * 0.032, pt.y + pt.vy * 0.032);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      if (pt.outline) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore(); // End world-space transform

  // 5. Dynamic Screen-Space Weather Fog, Mist Ribbons & Visibility Cone
  const fogStrength =
    phase === 'SUMMIT'
      ? weather.fogOpacity * Math.max(0, 1 - summitProgress * 1.8)
      : weather.fogOpacity;

  if (fogStrength > 0.04) {
    // Soft ambient tint (cool rain slate vs icy blizzard white vs golden-grey valley mist)
    const fogTint =
      weather.type === 'rain'
        ? 'rgba(30, 44, 62,'
        : weather.type === 'snowstorm'
          ? 'rgba(218, 232, 246,'
          : 'rgba(215, 224, 235,';

    // Compute climber's current screen position for visibility cone
    const climberScreenX = width * 0.5 + (climber.torsoPos.x - camera.x) * camera.zoom;
    const climberScreenY = height * 0.52 + (climber.torsoPos.y - camera.y) * camera.zoom;
    const maxDim = Math.max(width, height);
    const clearR = maxDim * weather.visibilityRadius * 0.34;
    const outerR = maxDim * weather.visibilityRadius * 0.92;

    const visGrad = ctx.createRadialGradient(
      climberScreenX,
      climberScreenY,
      clearR,
      climberScreenX,
      climberScreenY,
      outerR
    );
    visGrad.addColorStop(0, `${fogTint} 0)`);
    visGrad.addColorStop(0.55, `${fogTint} ${(fogStrength * 0.48).toFixed(3)})`);
    visGrad.addColorStop(1, `${fogTint} ${(fogStrength * 0.94).toFixed(3)})`);

    ctx.save();
    ctx.fillStyle = visGrad;
    ctx.fillRect(0, 0, width, height);

    // Drifting horizontal comic mist bands
    const bandCount = weather.type === 'clear' ? 0 : 4;
    for (let i = 0; i < bandCount; i++) {
      const bandY = ((height * (0.2 + i * 0.22) + Math.sin(timeSec * 0.35 + i) * 28) % height);
      const bandX = ((timeSec * (28 + i * 11) * (i % 2 === 0 ? 1 : -1)) % (width + 320)) - 160;
      ctx.fillStyle = `${fogTint} ${(fogStrength * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(bandX + width * 0.35, bandY, width * 0.42, 38 + i * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function solveNaturalLimbIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  isHand: boolean,
  isLeft: boolean,
  torsoX: number
) {
  const solPos = solveTwoBoneIK(root, target, len1, len2, 1);
  const solNeg = solveTwoBoneIK(root, target, len1, len2, -1);

  if (isHand) {
    // Human elbows bend naturally outward from torso AND slightly downward
    const score = (j: Vec2) => {
      const outward = isLeft ? torsoX - j.x : j.x - torsoX;
      return outward * 1.2 + j.y * 0.7;
    };
    return score(solPos.joint) >= score(solNeg.joint) ? solPos : solNeg;
  } else {
    // Human knees flare naturally outward ("frog stance") and slightly upward
    const score = (j: Vec2) => {
      const outward = isLeft ? torsoX - j.x : j.x - torsoX;
      return outward * 1.4 - j.y * 0.5;
    };
    return score(solPos.joint) >= score(solNeg.joint) ? solPos : solNeg;
  }
}

const LIMB_PHASE_OFFSET: Record<LimbId, number> = {
  leftHand: 0.7,
  rightHand: 2.1,
  leftFoot: 3.6,
  rightFoot: 5.0,
};

function getLimbStrainColor(strain: number, alpha = 1): string {
  const s = Math.max(0, Math.min(1, strain));
  const t = Math.max(0, Math.min(1, (s - 0.14) / 0.86));

  let r: number;
  let g: number;
  let b: number;
  if (t <= 0.65) {
    const u = t / 0.65;
    // Bright yellow (#FACC15) -> Vivid orange (#F97316)
    r = Math.round(250 + (249 - 250) * u);
    g = Math.round(204 + (115 - 204) * u);
    b = Math.round(21 + (22 - 21) * u);
  } else {
    const u = (t - 0.65) / 0.35;
    // Vivid orange (#F97316) -> Deep warning orange (#EA580C)
    r = Math.round(249 + (234 - 249) * u);
    g = Math.round(115 + (88 - 115) * u);
    b = Math.round(22 + (12 - 22) * u);
  }

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function getLimbStrainTremor(limbId: LimbId, strain: number, timeSec: number): Vec2 {
  if (strain <= 0.45) return { x: 0, y: 0 };
  const excess = Math.max(0, Math.min(1, (strain - 0.45) / 0.55));
  const amp = Math.pow(excess, 1.35) * 3.4;
  const phase = LIMB_PHASE_OFFSET[limbId];
  const f1 = 26 + excess * 22;
  const f2 = 41 + excess * 28;
  return {
    x: (Math.sin(timeSec * f1 + phase) * 0.65 + Math.cos(timeSec * f2 + phase * 1.7) * 0.35) * amp,
    y: (Math.cos(timeSec * (f1 * 1.13) + phase * 1.3) * 0.65 + Math.sin(timeSec * (f2 * 0.92) + phase) * 0.35) * amp,
  };
}

function drawLimbStrainGlow(
  ctx: CanvasRenderingContext2D,
  root: Vec2,
  joint: Vec2,
  end: Vec2,
  limbWidth: number,
  strain: number,
  timeSec: number,
  limbId: LimbId
) {
  if (strain <= 0.14) return;
  const intensity = Math.max(0, Math.min(1, (strain - 0.14) / 0.86));
  const pulse = 0.82 + 0.18 * Math.sin(timeSec * (5 + intensity * 11) + LIMB_PHASE_OFFSET[limbId]);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer diffused fatigue aura
  ctx.strokeStyle = getLimbStrainColor(strain, (0.16 + intensity * 0.28) * pulse);
  ctx.lineWidth = limbWidth + 7 + intensity * 8;
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.lineTo(joint.x, joint.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Inner concentrated warning glow
  ctx.strokeStyle = getLimbStrainColor(strain, (0.28 + intensity * 0.44) * pulse);
  ctx.lineWidth = limbWidth + 3 + intensity * 3.5;
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.lineTo(joint.x, joint.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Soft grip-point glow halo
  ctx.fillStyle = getLimbStrainColor(strain, (0.18 + intensity * 0.34) * pulse);
  ctx.beginPath();
  ctx.arc(end.x, end.y, 7 + intensity * 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawClimber(
  ctx: CanvasRenderingContext2D,
  climber: ClimberState,
  lockedLimb: LimbId | null,
  hover: HoverInfo | null,
  phase: GamePhase,
  timeSec: number,
  windForce: number,
  inkScale: number,
  skin: ClimberSkinConfig,
  dynoCoilProgress = 0
) {
  const joints = getShoulderAndHip(climber);
  const { leftHand, rightHand, leftFoot, rightFoot } = climber.limbs;

  const breathRate = climber.stamina < 30 ? 6.5 : 2.2;
  const breathY = Math.sin(timeSec * breathRate) * 1.1 + dynoCoilProgress * 7.5;

  const activeStrainFx = phase === 'PLAYING' && !climber.isFalling;
  const lhTremor = activeStrainFx ? getLimbStrainTremor('leftHand', leftHand.strain, timeSec) : { x: 0, y: 0 };
  const rhTremor = activeStrainFx ? getLimbStrainTremor('rightHand', rightHand.strain, timeSec) : { x: 0, y: 0 };
  const lfTremor = activeStrainFx ? getLimbStrainTremor('leftFoot', leftFoot.strain, timeSec) : { x: 0, y: 0 };
  const rfTremor = activeStrainFx ? getLimbStrainTremor('rightFoot', rightFoot.strain, timeSec) : { x: 0, y: 0 };

  const lhPos = { x: leftHand.pos.x + leftHand.jitter.x + lhTremor.x, y: leftHand.pos.y + leftHand.jitter.y + lhTremor.y };
  const rhPos = { x: rightHand.pos.x + rightHand.jitter.x + rhTremor.x, y: rightHand.pos.y + rightHand.jitter.y + rhTremor.y };
  const lfPos = { x: leftFoot.pos.x + leftFoot.jitter.x + lfTremor.x, y: leftFoot.pos.y + leftFoot.jitter.y + lfTremor.y };
  const rfPos = { x: rightFoot.pos.x + rightFoot.jitter.x + rfTremor.x, y: rightFoot.pos.y + rightFoot.jitter.y + rfTremor.y };

  const lhIK = solveNaturalLimbIK(
    joints.leftShoulder,
    lhPos,
    ARM_UPPER,
    ARM_LOWER,
    true,
    true,
    climber.torsoPos.x
  );
  const rhIK = solveNaturalLimbIK(
    joints.rightShoulder,
    rhPos,
    ARM_UPPER,
    ARM_LOWER,
    true,
    false,
    climber.torsoPos.x
  );
  const lfIK = solveNaturalLimbIK(
    joints.leftHip,
    lfPos,
    LEG_UPPER,
    LEG_LOWER,
    false,
    true,
    climber.torsoPos.x
  );
  const rfIK = solveNaturalLimbIK(
    joints.rightHip,
    rfPos,
    LEG_UPPER,
    LEG_LOWER,
    false,
    false,
    climber.torsoPos.x
  );

  if (activeStrainFx) {
    lhIK.joint.x += lhTremor.x * 0.55;
    lhIK.joint.y += lhTremor.y * 0.55;
    rhIK.joint.x += rhTremor.x * 0.55;
    rhIK.joint.y += rhTremor.y * 0.55;
    lfIK.joint.x += lfTremor.x * 0.55;
    lfIK.joint.y += lfTremor.y * 0.55;
    rfIK.joint.x += rfTremor.x * 0.55;
    rfIK.joint.y += rfTremor.y * 0.55;
  }

  // 2.5D Drop Shadow onto Rock Wall
  ctx.save();
  const shadowOffX = climber.isFalling ? 24 : 13;
  const shadowOffY = climber.isFalling ? 26 : 15;
  ctx.translate(shadowOffX, shadowOffY);
  ctx.strokeStyle = 'rgba(15, 20, 28, 0.42)';
  ctx.fillStyle = 'rgba(15, 20, 28, 0.42)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(joints.leftShoulder.x, joints.leftShoulder.y);
  ctx.lineTo(lhIK.joint.x, lhIK.joint.y);
  ctx.lineTo(lhIK.end.x, lhIK.end.y);
  ctx.moveTo(joints.rightShoulder.x, joints.rightShoulder.y);
  ctx.lineTo(rhIK.joint.x, rhIK.joint.y);
  ctx.lineTo(rhIK.end.x, rhIK.end.y);
  ctx.moveTo(joints.leftHip.x, joints.leftHip.y);
  ctx.lineTo(lfIK.joint.x, lfIK.joint.y);
  ctx.lineTo(lfIK.end.x, lfIK.end.y);
  ctx.moveTo(joints.rightHip.x, joints.rightHip.y);
  ctx.lineTo(rfIK.joint.x, rfIK.joint.y);
  ctx.lineTo(rfIK.end.x, rfIK.end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(climber.torsoPos.x, climber.torsoPos.y, 14, 24, climber.leanAngle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (activeStrainFx) {
    drawLimbStrainGlow(ctx, joints.leftHip, lfIK.joint, lfIK.end, 10.5, leftFoot.strain, timeSec, 'leftFoot');
    drawLimbStrainGlow(ctx, joints.rightHip, rfIK.joint, rfIK.end, 10.5, rightFoot.strain, timeSec, 'rightFoot');
  }

  const legOutline = 1.7;
  drawCapsuleLimb(ctx, joints.leftHip, lfIK.joint, 11, '#374151', '#1F2937', legOutline);
  drawCapsuleLimb(ctx, lfIK.joint, lfIK.end, 9.5, '#374151', '#1F2937', legOutline);
  drawCapsuleLimb(ctx, joints.rightHip, rfIK.joint, 11, '#4B5563', '#1F2937', legOutline);
  drawCapsuleLimb(ctx, rfIK.joint, rfIK.end, 9.5, '#4B5563', '#1F2937', legOutline);

  [lfIK.end, rfIK.end].forEach((footEnd) => {
    ctx.save();
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(footEnd.x, footEnd.y, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  if (activeStrainFx) {
    drawLimbStrainGlow(ctx, joints.leftShoulder, lhIK.joint, lhIK.end, 9, leftHand.strain, timeSec, 'leftHand');
    drawLimbStrainGlow(ctx, joints.rightShoulder, rhIK.joint, rhIK.end, 9, rightHand.strain, timeSec, 'rightHand');
  }

  drawCapsuleLimb(ctx, joints.leftShoulder, lhIK.joint, 9.5, skin.jacket, skin.jacketShadow, legOutline);
  drawCapsuleLimb(ctx, lhIK.joint, lhIK.end, 8, skin.jacket, skin.jacketShadow, legOutline);
  drawCapsuleLimb(ctx, joints.rightShoulder, rhIK.joint, 9.5, skin.jacket, skin.jacketShadow, legOutline);
  drawCapsuleLimb(ctx, rhIK.joint, rhIK.end, 8, skin.jacket, skin.jacketShadow, legOutline);

  [lhIK.end, rhIK.end].forEach((handEnd) => {
    ctx.save();
    ctx.fillStyle = climber.chalk > 20 ? '#F8FAFC' : '#E2B49A';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(handEnd.x, handEnd.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Torso, Technical Jacket, Harness & Alpine Backpack
  ctx.save();
  ctx.translate(climber.torsoPos.x, climber.torsoPos.y + breathY);
  ctx.rotate(climber.leanAngle);

  ctx.fillStyle = skin.jacket;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-14, -22, 28, 42, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = skin.jacketShadow;
  ctx.beginPath();
  ctx.roundRect(1, -20, 12, 38, [0, 6, 6, 0]);
  ctx.fill();

  ctx.fillStyle = '#1F2937';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-14, 10, 28, 8, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-11, -18, 22, 26, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = skin.accent;
  ctx.beginPath();
  ctx.roundRect(-12, -23, 24, 7, 3.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(8, 12, 8, 10, 2.5);
  ctx.fill();
  ctx.stroke();

  const scarfFlutter = Math.sin(timeSec * 6.5) * 4 + windForce * 14;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-4, -22);
  ctx.quadraticCurveTo(-12 + scarfFlutter * 0.5, -18, -16 + scarfFlutter, -10);
  ctx.stroke();
  ctx.strokeStyle = skin.scarf;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -32);
  ctx.rotate(climber.lookAngle);
  ctx.fillStyle = '#332924';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = skin.beanie;
  ctx.beginPath();
  ctx.arc(0, -2, 9.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (phase === 'SUMMIT') {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 1.6 * inkScale;
    ctx.beginPath();
    ctx.arc(0, -10, 44, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (activeStrainFx) {
    const limbList: { id: LimbId; pos: Vec2 }[] = [
      { id: 'leftHand', pos: lhIK.end },
      { id: 'rightHand', pos: rhIK.end },
      { id: 'leftFoot', pos: lfIK.end },
      { id: 'rightFoot', pos: rfIK.end },
    ];

    for (const item of limbList) {
      const limb = climber.limbs[item.id];
      const isLocked = lockedLimb === item.id;
      const isSuggested = hover?.suggestedLimb === item.id && hover.hold !== null;
      const hasStrainWarning = limb.strain > 0.25;

      if (hasStrainWarning) {
        const strainNorm = Math.max(0, Math.min(1, (limb.strain - 0.25) / 0.75));
        const ringPulse =
          limb.strain > 0.65
            ? Math.sin(timeSec * (8 + strainNorm * 10) + LIMB_PHASE_OFFSET[item.id]) * 1.4
            : 0;
        ctx.save();
        ctx.strokeStyle = getLimbStrainColor(limb.strain, 0.48 + strainNorm * 0.48);
        ctx.lineWidth = 1.8 + strainNorm * 1.2;
        ctx.beginPath();
        ctx.arc(item.pos.x, item.pos.y, 9.5 + strainNorm * 3.5 + ringPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isLocked || isSuggested) {
        ctx.save();
        ctx.strokeStyle = isLocked ? '#F59E0B' : 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = isLocked ? 2.6 : 1.8;
        ctx.beginPath();
        ctx.arc(item.pos.x, item.pos.y, isLocked ? 12 : 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
