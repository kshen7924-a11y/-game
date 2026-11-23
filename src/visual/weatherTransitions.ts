/**
 * Smooth Weather Transition Animation Engine
 *
 * Eliminates hard visual cuts when the climber crosses altitude weather stages
 * (clear <-> mist <-> rain <-> snowstorm) or enters/exits dynamic micro-windows
 * (sunbreak / whiteout_squall / crosswind_gust).
 *
 * Maintains continuous per-weather blend weights, smoothed fog/vignette colors,
 * visibility cone radius, and an atmospheric "weather front roll-in" sweep animation
 * that uses swappable VFX textures (vfx.weatherFrontCloud / vfx.mistVeil / vfx.sunShaft)
 * when provided by artists and clean procedural placeholders otherwise.
 */

import type {
  ActiveWeather,
  MicroWeatherWindow,
  WeatherIncidentState,
  WeatherType,
} from '../game/types';
import { DecodedVfxPack, drawVfxSprite } from './vfxArtAssets';

export interface BlendedWeatherVisualState {
  /** Simultaneous smoothed weights (0..1) for cross-fading all 4 weather layers */
  weights: Record<WeatherType, number>;
  /** Smoothed ambient fog opacity (0..0.88) */
  fogOpacity: number;
  /** Smoothed visibility cone radius ratio */
  visibilityRadius: number;
  /** Smoothed intensity multiplier */
  intensity: number;
  /** Smoothed fog RGB color (0..255) */
  fogRgb: [number, number, number];
  /** Smoothed screen vignette RGB color (0..255) */
  vignetteRgb: [number, number, number];
  /** Smoothed screen vignette opacity */
  vignetteAlpha: number;
  /** Smoothed sunbreak light shaft envelope (0..1) */
  sunbreakBlend: number;
  /** Smoothed whiteout squall surge envelope (0..1) */
  squallBlend: number;
  /** Smoothed crosswind gust envelope (0..1) */
  crosswindBlend: number;
  /** Weather front transition sweep progress (0..1; 0 or 1 = idle) */
  frontProgress: number;
  /** Direction of incoming weather front (-1 left-to-right or +1 right-to-left) */
  frontDir: -1 | 1;
  /** Target weather type that triggered the current transition sweep */
  frontToType: WeatherType;
  /** Previous weather type that is dissolving out */
  frontFromType: WeatherType;
}

const WEATHER_FOG_RGB: Record<WeatherType, [number, number, number]> = {
  clear: [232, 238, 246],
  mist: [215, 224, 235],
  rain: [30, 44, 62],
  snowstorm: [218, 232, 246],
};

const WEATHER_VIGNETTE_RGB: Record<WeatherType, [number, number, number]> = {
  clear: [15, 20, 28],
  mist: [22, 30, 42],
  rain: [10, 17, 28],
  snowstorm: [14, 23, 36],
};

const WEATHER_VIGNETTE_ALPHA: Record<WeatherType, number> = {
  clear: 0.21,
  mist: 0.25,
  rain: 0.34,
  snowstorm: 0.32,
};

const ALL_WEATHER_TYPES: readonly WeatherType[] = ['clear', 'mist', 'rain', 'snowstorm'];

interface InternalTransitionController {
  initialized: boolean;
  lastTimeSec: number;
  lastTargetType: WeatherType;
  frontTimer: number;
  frontDuration: number;
  state: BlendedWeatherVisualState;
}

function createInitialState(initialType: WeatherType = 'clear'): BlendedWeatherVisualState {
  return {
    weights: {
      clear: initialType === 'clear' ? 1 : 0,
      mist: initialType === 'mist' ? 1 : 0,
      rain: initialType === 'rain' ? 1 : 0,
      snowstorm: initialType === 'snowstorm' ? 1 : 0,
    },
    fogOpacity: 0,
    visibilityRadius: 1.05,
    intensity: 0.2,
    fogRgb: [...WEATHER_FOG_RGB[initialType]],
    vignetteRgb: [...WEATHER_VIGNETTE_RGB[initialType]],
    vignetteAlpha: WEATHER_VIGNETTE_ALPHA[initialType],
    sunbreakBlend: 0,
    squallBlend: 0,
    crosswindBlend: 0,
    frontProgress: 1,
    frontDir: 1,
    frontToType: initialType,
    frontFromType: initialType,
  };
}

const controller: InternalTransitionController = {
  initialized: false,
  lastTimeSec: 0,
  lastTargetType: 'clear',
  frontTimer: 99,
  frontDuration: 2.8,
  state: createInitialState('clear'),
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Resets smoothed weather visual state immediately on route start/restart
 * so no fog or particle tail bleeds across different mountains.
 */
export function resetWeatherTransition(weather?: ActiveWeather): void {
  const type: WeatherType = weather?.type ?? 'clear';
  controller.initialized = Boolean(weather);
  controller.lastTimeSec = 0;
  controller.lastTargetType = type;
  controller.frontTimer = controller.frontDuration;
  controller.state = createInitialState(type);
  if (weather) {
    controller.state.fogOpacity = weather.fogOpacity;
    controller.state.visibilityRadius = weather.visibilityRadius;
    controller.state.intensity = weather.intensity;
  }
}

/**
 * Advances frame-rate-independent exponential smoothing for all weather layers,
 * fog tints, visibility radius, micro-windows, and front-roll transition sweeps.
 */
export function stepWeatherTransition(
  weather: ActiveWeather,
  weatherIncident: WeatherIncidentState | null,
  microWindow: MicroWeatherWindow | null,
  windForce: number,
  timeSec: number,
  isSummit: boolean,
  summitProgress: number
): BlendedWeatherVisualState {
  const s = controller.state;

  const isSquallActive =
    !isSummit &&
    weatherIncident?.type === 'whiteout_squall' &&
    weatherIncident.phase === 'active';
  const isSquallTelegraph =
    !isSummit &&
    weatherIncident?.type === 'whiteout_squall' &&
    weatherIncident.phase === 'telegraph';
  const isCrosswindActive =
    !isSummit &&
    weatherIncident?.type === 'crosswind_gust' &&
    weatherIncident.phase === 'active';
  const isCrosswindTelegraph =
    !isSummit &&
    weatherIncident?.type === 'crosswind_gust' &&
    weatherIncident.phase === 'telegraph';

  let sunbreakTarget = 0;
  if (!isSummit && microWindow?.kind === 'sunbreak') {
    const p = Math.max(0, Math.min(1, microWindow.timer / Math.max(0.1, microWindow.duration)));
    sunbreakTarget = p < 0.16 ? p / 0.16 : p > 0.82 ? (1 - p) / 0.18 : 1;
  }

  const targetType: WeatherType = isSquallActive ? 'snowstorm' : weather.type;

  if (!controller.initialized) {
    resetWeatherTransition(weather);
    controller.initialized = true;
    controller.lastTimeSec = timeSec;
    return controller.state;
  }

  const rawDt = timeSec - controller.lastTimeSec;
  controller.lastTimeSec = timeSec;
  const dt = rawDt > 0 && rawDt < 0.25 ? rawDt : 1 / 60;

  // Detect a genuine altitude/squall weather change and launch a smooth 2.8s weather-front sweep
  if (targetType !== controller.lastTargetType) {
    s.frontFromType = controller.lastTargetType;
    s.frontToType = targetType;
    s.frontDir = windForce >= -0.05 ? 1 : -1;
    controller.frontTimer = 0;
    controller.lastTargetType = targetType;
  }

  if (controller.frontTimer < controller.frontDuration) {
    controller.frontTimer = Math.min(controller.frontDuration, controller.frontTimer + dt);
    s.frontProgress = controller.frontTimer / controller.frontDuration;
  } else {
    s.frontProgress = 1;
  }

  // Smooth exponential rates (gentle ~2.2s weather cross-fade, slightly snappier incident surge)
  const weatherRate = 1 - Math.exp(-dt * 1.45);
  const fastRate = 1 - Math.exp(-dt * 2.6);

  // 1. Cross-fade 4-channel weather weights
  let weightSum = 0;
  for (const wt of ALL_WEATHER_TYPES) {
    const desired = wt === targetType ? 1 : 0;
    s.weights[wt] = lerp(s.weights[wt], desired, weatherRate);
    if (s.weights[wt] < 0.002) s.weights[wt] = 0;
    weightSum += s.weights[wt];
  }
  if (weightSum > 0.001) {
    for (const wt of ALL_WEATHER_TYPES) {
      s.weights[wt] /= weightSum;
    }
  }

  // 2. Smooth incident & micro-window envelopes
  const squallTarget = isSquallActive ? 1 : isSquallTelegraph ? 0.28 : 0;
  const crosswindTarget = isCrosswindActive ? 1 : isCrosswindTelegraph ? 0.35 : 0;
  s.squallBlend = lerp(s.squallBlend, squallTarget, fastRate);
  s.crosswindBlend = lerp(s.crosswindBlend, crosswindTarget, fastRate);
  s.sunbreakBlend = lerp(s.sunbreakBlend, sunbreakTarget, fastRate);

  // 3. Smooth scalar fog, visibility & intensity
  const targetFog = isSummit
    ? weather.fogOpacity * Math.max(0, 1 - summitProgress * 1.8)
    : Math.min(0.86, weather.fogOpacity + s.squallBlend * 0.26);
  const targetVis = Math.max(0.28, weather.visibilityRadius - s.squallBlend * 0.14);
  const targetIntensity = Math.min(1.35, Math.max(0.18, weather.intensity + s.squallBlend * 0.38));

  s.fogOpacity = lerp(s.fogOpacity, targetFog, weatherRate);
  s.visibilityRadius = lerp(s.visibilityRadius, targetVis, weatherRate);
  s.intensity = lerp(s.intensity, targetIntensity, weatherRate);

  // 4. Blend fog RGB & vignette RGB cleanly from live weights (zero single-frame color snap)
  let fr = 0;
  let fg = 0;
  let fb = 0;
  let vr = 0;
  let vg = 0;
  let vb = 0;
  let va = 0;
  for (const wt of ALL_WEATHER_TYPES) {
    const w = s.weights[wt];
    if (w <= 0) continue;
    const fCol = WEATHER_FOG_RGB[wt];
    const vCol = WEATHER_VIGNETTE_RGB[wt];
    fr += fCol[0] * w;
    fg += fCol[1] * w;
    fb += fCol[2] * w;
    vr += vCol[0] * w;
    vg += vCol[1] * w;
    vb += vCol[2] * w;
    va += WEATHER_VIGNETTE_ALPHA[wt] * w;
  }
  s.fogRgb[0] = fr;
  s.fogRgb[1] = fg;
  s.fogRgb[2] = fb;
  s.vignetteRgb[0] = vr;
  s.vignetteRgb[1] = vg;
  s.vignetteRgb[2] = vb;
  s.vignetteAlpha = isSummit ? lerp(va, 0.22, Math.min(1, summitProgress * 1.5)) : va;

  return s;
}

/**
 * Renders the cinematic atmospheric "weather front roll-in" sweep across the viewport
 * whenever weather transitions between altitude stages (e.g. clear -> mist -> rain -> snowstorm).
 * Automatically uses vfx.weatherFrontCloud when artists provide it; otherwise draws layered soft cloud curtains.
 */
export function drawWeatherFrontTransitionSweep(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blended: BlendedWeatherVisualState,
  vfxPack: DecodedVfxPack,
  baseAlpha: number
): void {
  const p = blended.frontProgress;
  if (p <= 0.001 || p >= 0.999 || baseAlpha <= 0.03) return;

  // Bell-shaped envelope peaking gently around 35% of the transition
  const env = Math.sin(p * Math.PI) * (1 - p * 0.25);
  const alpha = baseAlpha * env;
  if (alpha <= 0.01) return;

  const isClearing = blended.frontToType === 'clear';
  const dir = blended.frontDir;
  const travel = -0.35 + p * 1.7;
  const centerX = dir > 0 ? width * travel : width * (1 - travel);

  ctx.save();
  // Try artist-supplied swappable cloud-front texture first
  const drewFrontSprite = drawVfxSprite(
    ctx,
    vfxPack,
    'weatherFrontCloud',
    centerX,
    height * 0.44,
    width * 1.35,
    height * 0.72,
    dir * 0.04,
    alpha * (isClearing ? 0.34 : 0.48),
    dir,
    1
  );

  if (!drewFrontSprite) {
    // Soft multi-band procedural front veil placeholder
    const col = isClearing
      ? '254, 246, 224'
      : blended.frontToType === 'rain'
        ? '76, 98, 126'
        : blended.frontToType === 'snowstorm'
          ? '230, 242, 255'
          : '218, 228, 240';

    for (let i = 0; i < 3; i++) {
      const bandX = centerX + (i - 1) * width * 0.22 * dir;
      const bandY = height * (0.24 + i * 0.26);
      const rx = width * (0.58 + i * 0.1);
      const ry = height * (0.18 + (i % 2) * 0.06);
      const grad = ctx.createRadialGradient(bandX, bandY, rx * 0.1, bandX, bandY, rx);
      grad.addColorStop(0, `rgba(${col}, ${(alpha * (isClearing ? 0.16 : 0.24)).toFixed(3)})`);
      grad.addColorStop(0.55, `rgba(${col}, ${(alpha * (isClearing ? 0.08 : 0.13)).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(bandX, bandY, rx, ry, dir * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
