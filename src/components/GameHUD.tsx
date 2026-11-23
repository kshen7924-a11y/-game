import {
  AlertTriangle,
  Anchor,
  ArrowDownToLine,
  ArrowUp,
  ChevronLeft,
  CloudFog,
  CloudRain,
  CloudSnow,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Feather,
  History,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { hasHoldHintsEnabled } from '../game/mountain';
import {
  ActiveWeather,
  AltitudeDifficultyBin,
  ClimberGender,
  ClimberState,
  ClimbStats,
  HoverInfo,
  LimbId,
  MicroWeatherWindow,
  RoadbookAttemptReview,
  RoadbookSavedSlot,
  RouteConfig,
  RoutePitchSection,
  TutorialState,
  WeatherIncidentState,
} from '../game/types';

interface GameHUDProps {
  route: RouteConfig;
  difficultyProfile?: AltitudeDifficultyBin[];
  weather: ActiveWeather;
  weatherIncident?: WeatherIncidentState | null;
  climber: ClimberState;
  stats: ClimbStats;
  hover: HoverInfo | null;
  tutorial: TutorialState;
  muted: boolean;
  supportsRouteBook: boolean;
  isReadingRoute: boolean;
  isPreClimbReading?: boolean;
  dynoProgress: number | null;
  isDraggingLimb?: boolean;
  nearbyRecyclablePiton: boolean;
  betaPinsCount: number;
  betaRemainingCount?: number;
  betaCursorStep?: number;
  hasUnsavedRoadbook?: boolean;
  hasSavedRoadbook?: boolean;
  roadbookArchives?: RoadbookSavedSlot[];
  lastAttemptReview?: RoadbookAttemptReview | null;
  showAttemptReview?: boolean;
  canShakeOut: boolean;
  onPlacePiton: () => void;
  onApplyChalk: () => void;
  onToggleRouteRead: () => void;
  onClearBetaPins: () => void;
  onUndoBetaPin: () => void;
  onSaveRoadbook?: () => void;
  onRevertRoadbook?: () => void;
  onLoadRoadbookSlot?: (slotId: string) => void;
  onToggleAttemptReview?: () => void;
  onFocusLastFall?: () => void;
  onJumpReadCamera: (action: 'up' | 'down' | 'reset') => void;
  onInspectBin?: (bin: AltitudeDifficultyBin) => void;
  onShakeOutHand: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  activeDragReason: string | null;
  tacticalHint: string | null;
  onDismissHint: () => void;
  isFreeSolo?: boolean;
  staminaRatePerSec?: number;
  roadbookFlowActive?: boolean;
  onSpringHold?: boolean;
  climberName?: string;
  climberGender?: ClimberGender;
  introActive?: boolean;
  currentPitch?: RoutePitchSection | null;
  pitchBanner?: { name: string; subtitle: string; isCrux?: boolean; index: number } | null;
  microWindow?: MicroWeatherWindow | null;
  pitchSections?: RoutePitchSection[];
  bivouacRatios?: number[];
}

const LIMB_ITEMS: { id: LimbId; label: string }[] = [
  { id: 'leftHand', label: '左手' },
  { id: 'rightHand', label: '右手' },
  { id: 'leftFoot', label: '左脚' },
  { id: 'rightFoot', label: '右脚' },
];

const getTutorialText = (tutorial: TutorialState, isFreeSolo = false): string => {
  if (tutorial.variant === 'advanced') {
    const advTexts: Record<number, string> = {
      0: '进阶教学 1/4 · 双击手脚关节或将其拖至空处，可独立松开支点',
      1: '进阶教学 2/4 · 拖动腰部安全带环可手动移重心，轻点腰部恢复回中',
      2: '进阶教学 3/4 · 遇侧拉点可拖腰反向倾压；三点稳固可点左侧「甩臂」',
      3: '进阶教学 4/4 · 已掌握进阶操作，继续向顶峰攀登！',
    };
    return advTexts[tutorial.step] ?? advTexts[3];
  }
  const basicTexts: Record<number, string> = {
    0: '教学 1/5 · 按住右手关节拖向金色岩点，松手抓握',
    1: '教学 2/5 · 按住脚部拖向下方金色岩点跟进双脚',
    2: '教学 3/5 · 点击右侧边缘「岩钉」固定保护点',
    3: '教学 4/5 · 点击右侧边缘「镁粉」擦粉，提升湿滑抓力',
    4: isFreeSolo
      ? '基础完成 · 徒手无岩钉镁粉，向顶峰攀登！'
      : '教学 5/5 · 已掌握基础攀登，向顶峰攀登！',
  };
  return basicTexts[tutorial.step] ?? basicTexts[4];
};

export function GameHUD({
  route,
  weather,
  weatherIncident = null,
  climber,
  stats,
  hover,
  tutorial,
  muted,
  supportsRouteBook,
  isReadingRoute,
  isPreClimbReading = false,
  dynoProgress,
  isDraggingLimb = false,
  nearbyRecyclablePiton,
  betaPinsCount,
  betaRemainingCount = 0,
  betaCursorStep = 1,
  hasUnsavedRoadbook = false,
  hasSavedRoadbook = false,
  roadbookArchives = [],
  lastAttemptReview = null,
  showAttemptReview = true,
  canShakeOut,
  onPlacePiton,
  onApplyChalk,
  onToggleRouteRead,
  onClearBetaPins,
  onUndoBetaPin,
  onSaveRoadbook,
  onRevertRoadbook,
  onLoadRoadbookSlot,
  onToggleAttemptReview,
  onFocusLastFall,
  onJumpReadCamera,
  onShakeOutHand,
  onToggleMute,
  onRestart,
  onBackToMenu,
  activeDragReason,
  tacticalHint,
  onDismissHint,
  isFreeSolo = false,
  staminaRatePerSec = 0,
  roadbookFlowActive = false,
  onSpringHold = false,
  climberName = '孤影',
  introActive = false,
  currentPitch = null,
  pitchBanner = null,
  microWindow = null,
  pitchSections = [],
  bivouacRatios = [],
}: GameHUDProps) {
  const showHoldHints = hasHoldHintsEnabled(route);
  const staminaPct = Math.round((climber.stamina / climber.maxStamina) * 100);
  const rateRounded = Math.round(staminaRatePerSec * 10) / 10;
  const rateText =
    Math.abs(rateRounded) < 0.05
      ? '0.0/s'
      : `${rateRounded > 0 ? '+' : ''}${rateRounded.toFixed(1)}/s`;
  const spentTotal = Math.round(stats.staminaSpent);
  const recoveredTotal = Math.round(stats.staminaRecovered);
  const healthPct = Math.round(climber.health);
  const chalkPct = Math.round(climber.chalk);
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((stats.altitudeM / Math.max(1, route.heightM)) * 100))
  );
  const flowCombo = climber.flowCombo ?? 0;
  const hasSwingBoost = (climber.swingBoostTimer ?? 0) > 0.25;

  const staminaStatus = climber.isResting
    ? '休整'
    : climber.isShakingOut
      ? '甩手'
      : climber.isStemming
        ? '省力'
        : staminaPct <= 25
          ? '力竭'
          : staminaPct <= 55
            ? '吃力'
            : '平稳';

  const WeatherIcon =
    weather.type === 'rain'
      ? CloudRain
      : weather.type === 'snowstorm'
        ? CloudSnow
        : weather.type === 'mist'
          ? CloudFog
          : Sun;

  const leanText =
    !climber.isFalling && !isReadingRoute
      ? climber.leanBias === -1
        ? '◀ 重心偏左'
        : climber.leanBias === 1
          ? '重心偏右 ▶'
          : null
      : null;

  const incidentRatio = weatherIncident
    ? Math.max(0, Math.min(1, weatherIncident.timer / Math.max(0.1, weatherIncident.duration)))
    : 0;

  const microWindowRatio = microWindow
    ? Math.max(0, Math.min(1, microWindow.timer / Math.max(0.1, microWindow.duration)))
    : 0;

  const inlineCues: { key: string; text: string; tone: string }[] = [];
  if (!isReadingRoute && !climber.isFalling) {
    if (leanText) {
      inlineCues.push({ key: 'lean', text: leanText, tone: 'text-amber-300' });
    }
    if (flowCombo >= 3) {
      inlineCues.push({
        key: 'combo',
        text: `岩间心流 ×${flowCombo} · 省耐-10%`,
        tone: 'text-amber-200',
      });
    } else if (flowCombo === 2) {
      inlineCues.push({ key: 'combo', text: `连攀 ×${flowCombo}`, tone: 'text-amber-200/90' });
    }
    if (hasSwingBoost) {
      inlineCues.push({ key: 'swing', text: '摆荡增幅', tone: 'text-cyan-300' });
    }
  }

  const reviewRiskCount = (lastAttemptReview?.healthDrops ?? []).filter(
    (d) =>
      d.kind === 'stamina_critical' ||
      d.healthLost >= 8 ||
      d.healthAfter <= 45 ||
      d.staminaAfter <= 16
  ).length;

  const showTacticalHintBar = Boolean(
    tacticalHint && !isReadingRoute && !climber.isFalling && !isDraggingLimb
  );

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-500 ${
        introActive ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* =====================================================================
          TOP SAFE ZONE (Strictly Non-Interactive Telemetry — Clears Center Wall)
         ===================================================================== */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 flex flex-col items-center gap-1"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingLeft: 'calc(max(0.5rem, env(safe-area-inset-left)) + 3.5rem)',
          paddingRight: 'calc(max(0.5rem, env(safe-area-inset-right)) + 3.5rem)',
        }}
      >
        {/* Row 1: Compact Route Identity & Weather */}
        <div className="inline-flex max-w-full flex-col items-center border border-white/15 bg-[#141820]/82 px-3 py-1 backdrop-blur-sm sm:px-4">
          <div className="flex max-w-full items-baseline gap-1.5 whitespace-nowrap leading-tight">
            <span className="font-display truncate text-sm font-bold text-[#F4F1EA] sm:text-base">
              {route.isDailyChallenge ? '今日神山' : route.name}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-[#F59E0B] font-mono-tabular">
              {route.grade} · {route.heightM}m
            </span>
          </div>
          <div className="mt-0.5 flex max-w-full items-center gap-1 truncate text-[10px] leading-none text-slate-300 whitespace-nowrap">
            <span className="max-w-[76px] truncate font-semibold text-amber-200/95">
              {climberName}
            </span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span className="text-slate-400">{route.tierLabel}</span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <WeatherIcon className="h-3 w-3 shrink-0 text-sky-300" />
            <span>{weather.label}</span>
            {isFreeSolo && (
              <span className="font-semibold text-red-300">
                <span aria-hidden="true">· </span>徒手
              </span>
            )}
            {supportsRouteBook && isReadingRoute && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-sky-300">
                <span aria-hidden="true">·</span>
                <Pause className="h-2.5 w-2.5" />
                <span>{isPreClimbReading ? '读线' : '路书'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Slim Telemetry Strip (Stamina / Health / Chalk) */}
        {!isReadingRoute ? (
          <div className="flex w-full max-w-[300px] items-center gap-2 border border-white/15 bg-[#141820]/78 px-2.5 py-1 backdrop-blur-sm sm:max-w-sm">
            {/* Stamina */}
            <div className="min-w-0 flex-[1.9]">
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none">
                <span className="truncate font-medium text-slate-200">耐力·{staminaStatus}</span>
                <span className="flex items-center gap-1 font-mono-tabular whitespace-nowrap">
                  <span
                    className={
                      rateRounded > 0.05
                        ? 'text-emerald-300'
                        : rateRounded <= -2.2
                          ? 'text-red-300'
                          : rateRounded < -0.05
                            ? 'text-amber-300'
                            : 'text-slate-400'
                    }
                  >
                    {rateText}
                  </span>
                  <span className="font-semibold text-slate-100">{staminaPct}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-slate-800">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    staminaPct <= 25
                      ? 'bg-red-500'
                      : staminaPct <= 55
                        ? 'bg-amber-500'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
              <div className="mt-0.5 hidden items-center justify-between text-[9px] leading-none text-slate-400 font-mono-tabular sm:flex">
                <span>耗 {spentTotal}</span>
                <span>回 {recoveredTotal}</span>
              </div>
            </div>

            <div aria-hidden="true" className="h-5 w-px shrink-0 bg-white/12" />

            {/* Health */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none">
                <span className="text-slate-300">体力</span>
                <span className="font-mono-tabular font-semibold text-slate-100">{healthPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-slate-800">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    healthPct <= 35 ? 'bg-red-500' : 'bg-sky-400'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
            </div>

            <div aria-hidden="true" className="h-5 w-px shrink-0 bg-white/12" />

            {/* Chalk or Free Solo Bonus */}
            {isFreeSolo ? (
              <div className="min-w-0 flex-1 text-center">
                <div className="text-[10px] leading-none text-slate-400">徒手</div>
                <div className="mt-1 text-[10px] font-bold leading-none text-amber-300 whitespace-nowrap font-mono-tabular">
                  耗体 -50%
                </div>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 text-[10px] leading-none">
                  <span className="text-slate-300">镁粉</span>
                  <span className="font-mono-tabular font-semibold text-slate-100">{chalkPct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-slate-800">
                  <div
                    className="h-full bg-slate-100 transition-[width] duration-150"
                    style={{ width: `${chalkPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Roadbook Mode Non-Interactive Info Strip (Keeps Full Center Rock Wall Open!) */
          <div className="flex w-full max-w-sm flex-col items-center gap-0.5 border border-white/15 bg-[#141820]/86 px-3 py-1 text-center text-[10px] text-slate-200 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono-tabular">
              <span className="font-semibold text-[#F4F1EA]">
                {lastAttemptReview ? '路书复盘' : '路书读线'}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>已标 {betaPinsCount} 步</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span
                className={
                  hasUnsavedRoadbook
                    ? 'font-medium text-amber-300'
                    : hasSavedRoadbook
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                }
              >
                {hasUnsavedRoadbook ? '未保存' : hasSavedRoadbook ? '已存档' : '点岩点连线'}
              </span>
            </div>
            {lastAttemptReview && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-300 font-mono-tabular">
                <span
                  className={
                    lastAttemptReview.outcome === 'SUMMIT'
                      ? 'font-semibold text-emerald-300'
                      : 'font-semibold text-orange-300'
                  }
                >
                  {lastAttemptReview.outcome === 'SUMMIT'
                    ? '上次登顶'
                    : lastAttemptReview.outcome === 'FALLEN'
                      ? '上次坠落'
                      : '上次试攀'}
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span>
                  {lastAttemptReview.maxAltitudeM.toFixed(1)}/{lastAttemptReview.routeHeightM}m
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span>{lastAttemptReview.movesMade} 步</span>
                {reviewRiskCount > 0 ? (
                  <>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="font-medium text-yellow-300">风险区 {reviewRiskCount}</span>
                  </>
                ) : typeof lastAttemptReview.minHealth === 'number' &&
                  lastAttemptReview.minHealth < 100 ? (
                  <>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="text-yellow-300/90">低体 {lastAttemptReview.minHealth}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Row 3: Priority-Arbitrated Single-Line Status Cue (Strictly Non-Interactive) */}
        <div className="flex min-h-[18px] max-w-full justify-center">
          {weatherIncident && !isReadingRoute ? (
            <div
              className={`max-w-full border px-2.5 py-0.5 shadow-md backdrop-blur-sm ${
                weatherIncident.phase === 'telegraph'
                  ? 'border-red-400/80 bg-[#261116]/90 text-red-100'
                  : 'border-amber-400/80 bg-[#1C1917]/90 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold">
                {weatherIncident.type === 'crosswind_gust' ? (
                  <Wind className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-300" />
                )}
                <span className="shrink-0 font-bold">{weatherIncident.label}</span>
                <span aria-hidden="true" className="opacity-55">·</span>
                <span className="truncate opacity-90">{weatherIncident.hint}</span>
              </div>
              <div className="mt-1 h-[2px] w-full bg-white/15">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    weatherIncident.phase === 'telegraph' ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.round((1 - incidentRatio) * 100)}%` }}
                />
              </div>
            </div>
          ) : dynoProgress !== null ? (
            <div className="inline-flex max-w-full items-center gap-1.5 border border-amber-400/75 bg-[#141820]/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 whitespace-nowrap font-mono-tabular">
              <Zap className="h-3 w-3 shrink-0" />
              <span>
                {dynoProgress >= 0.999
                  ? onSpringHold
                    ? '蹬壁蓄满 · 松手跃抓'
                    : '蓄力已满 · 松手跃抓'
                  : `${onSpringHold ? '蹬壁蓄力' : '跃抓蓄力'} ${Math.round(dynoProgress * 100)}%`}
              </span>
            </div>
          ) : activeDragReason ? (
            <div className="max-w-full truncate border border-red-400/55 bg-[#141820]/88 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
              {activeDragReason}
            </div>
          ) : microWindow && !isReadingRoute ? (
            <div
              className={`max-w-full border px-2.5 py-0.5 shadow-sm backdrop-blur-sm ${
                microWindow.kind === 'sunbreak'
                  ? 'border-amber-300/65 bg-[#1D1810]/88 text-amber-100'
                  : 'border-emerald-300/60 bg-[#0F1C1A]/88 text-emerald-100'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold">
                {microWindow.kind === 'sunbreak' ? (
                  <Sun className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                ) : (
                  <Wind className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                )}
                <span className="shrink-0 font-bold">{microWindow.label}</span>
                <span aria-hidden="true" className="opacity-55">·</span>
                <span className="truncate opacity-90">{microWindow.hint}</span>
              </div>
              <div className="mt-1 h-[2px] w-full bg-white/15">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    microWindow.kind === 'sunbreak' ? 'bg-amber-300' : 'bg-emerald-300'
                  }`}
                  style={{ width: `${Math.round((1 - microWindowRatio) * 100)}%` }}
                />
              </div>
            </div>
          ) : pitchBanner && !isReadingRoute ? (
            <div
              className={`max-w-full truncate border px-2.5 py-0.5 text-[11px] font-medium tracking-wide backdrop-blur-sm ${
                pitchBanner.isCrux
                  ? 'border-amber-400/65 bg-[#1C1610]/88 text-amber-200'
                  : 'border-white/20 bg-[#141820]/84 text-slate-100'
              }`}
            >
              <span className="font-mono-tabular opacity-75">P{pitchBanner.index + 1}</span>
              <span aria-hidden="true" className="mx-1.5 opacity-45">·</span>
              <span className="font-bold">{pitchBanner.name}</span>
              <span aria-hidden="true" className="mx-1.5 opacity-45">·</span>
              <span className="opacity-85">{pitchBanner.subtitle}</span>
            </div>
          ) : tutorial.active && !isReadingRoute ? (
            <div className="max-w-full truncate border border-amber-400/60 bg-[#141820]/90 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
              {getTutorialText(tutorial, isFreeSolo)}
            </div>
          ) : showTacticalHintBar ? (
            <div className="max-w-full truncate border border-sky-400/55 bg-[#141820]/90 px-2.5 py-0.5 text-[11px] font-medium text-sky-200">
              {tacticalHint}
            </div>
          ) : inlineCues.length > 0 ? (
            <div className="inline-flex max-w-full items-center gap-1.5 bg-[#141820]/74 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap font-mono-tabular">
              {inlineCues.map((cue, idx) => (
                <span key={cue.key} className="inline-flex items-center gap-1.5">
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                  )}
                  <span className={cue.tone}>{cue.text}</span>
                </span>
              ))}
            </div>
          ) : showHoldHints && hover?.hold && !climber.isFalling && !isDraggingLimb && !isReadingRoute ? (
            <div className="max-w-full truncate bg-[#141820]/80 px-2.5 py-0.5 text-[11px] text-slate-200">
              <span>{LIMB_ITEMS.find((l) => l.id === hover.suggestedLimb)?.label}</span>
              <span className="mx-1.5 text-slate-500">/</span>
              <span
                className={
                  hover.reachable
                    ? 'text-amber-300'
                    : hover.dynoEligible
                      ? 'text-sky-300'
                      : 'text-slate-300'
                }
              >
                {hover.stabilityHint}
              </span>
            </div>
          ) : nearbyRecyclablePiton && !isDraggingLimb && !isReadingRoute ? (
            <div className="bg-[#141820]/80 px-2.5 py-0.5 text-[11px] text-emerald-300">
              轻点身旁岩钉可回收
            </div>
          ) : supportsRouteBook &&
            betaRemainingCount > 0 &&
            !climber.isFalling &&
            !isDraggingLimb &&
            !isReadingRoute ? (
            <div
              className={`max-w-full truncate bg-[#141820]/80 px-2.5 py-0.5 text-[11px] font-mono-tabular ${
                roadbookFlowActive ? 'text-sky-200' : 'text-[#F4F1EA]'
              }`}
            >
              {roadbookFlowActive ? '路书节奏' : '自定路书'} · 第 {betaCursorStep} 步（余{' '}
              {betaRemainingCount}/{betaPinsCount}）
            </div>
          ) : null}
        </div>
      </div>

      {/* =====================================================================
          LEFT SCREEN EDGE RAIL (All Left-Side Clickable Controls + Safe-Area)
         ===================================================================== */}
      {/* Top-Left Utility Stack: Back / Mute / Restart */}
      <div
        className="pointer-events-auto fixed flex flex-col gap-1.5"
        style={{
          top: 'max(0.5rem, env(safe-area-inset-top))',
          left: 'max(0.5rem, env(safe-area-inset-left))',
        }}
      >
        <button
          type="button"
          onClick={onBackToMenu}
          title="返回选线"
          aria-label="返回选线"
          className="flex h-11 w-11 items-center justify-center border border-white/15 bg-[#141820]/84 text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? '开启音效' : '静音'}
          aria-label={muted ? '开启音效' : '静音'}
          className="flex h-11 w-11 items-center justify-center border border-white/15 bg-[#141820]/84 text-slate-200 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRestart}
          title="重攀"
          aria-label="重攀"
          className="flex h-11 w-11 items-center justify-center border border-white/15 bg-[#141820]/84 text-slate-200 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Mid-Lower-Left Tactical Action Rail: Roadbook / Shake-Out OR Roadbook Camera & Review */}
      <div
        className="pointer-events-auto fixed flex flex-col items-start gap-1.5"
        style={{
          left: 'max(0.5rem, env(safe-area-inset-left))',
          bottom: 'calc(max(0.5rem, env(safe-area-inset-bottom)) + 5.2rem)',
        }}
      >
        {supportsRouteBook && isReadingRoute ? (
          <>
            <button
              type="button"
              onClick={() => onJumpReadCamera('up')}
              title="向上览壁"
              className="flex min-h-[46px] w-[52px] flex-col items-center justify-center gap-0.5 border border-white/18 bg-[#141820]/88 px-1 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/18 active:scale-95"
            >
              <ArrowUp className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">上看</span>
            </button>
            <button
              type="button"
              onClick={() => onJumpReadCamera('reset')}
              title="镜头回位"
              className="flex min-h-[46px] w-[52px] flex-col items-center justify-center gap-0.5 border border-white/18 bg-[#141820]/88 px-1 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/18 active:scale-95"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">回位</span>
            </button>
            {lastAttemptReview && onToggleAttemptReview && (
              <button
                type="button"
                onClick={onToggleAttemptReview}
                title="切换复盘轨迹与风险区"
                className={`flex min-h-[46px] w-[52px] flex-col items-center justify-center gap-0.5 border px-1 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors active:scale-95 ${
                  showAttemptReview
                    ? 'border-orange-400/70 bg-orange-500/24 text-orange-100'
                    : 'border-white/18 bg-[#141820]/88 text-slate-300 hover:bg-white/15'
                }`}
              >
                {showAttemptReview ? (
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="whitespace-nowrap">轨迹</span>
              </button>
            )}
            {lastAttemptReview?.outcome === 'FALLEN' &&
              lastAttemptReview.fallPos &&
              onFocusLastFall && (
                <button
                  type="button"
                  onClick={onFocusLastFall}
                  title="定位上次坠落热点"
                  className="flex min-h-[46px] w-[52px] flex-col items-center justify-center gap-0.5 border border-red-400/55 bg-red-950/65 px-1 py-1 text-[10px] font-medium text-red-100 backdrop-blur-sm transition-colors hover:bg-red-800/45 active:scale-95"
                >
                  <Crosshair className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">坠落点</span>
                </button>
              )}
            {roadbookArchives.length > 0 && onLoadRoadbookSlot && (
              <div className="flex flex-col gap-1 border border-white/15 bg-[#141820]/86 p-1 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-slate-400">
                  <History className="h-2.5 w-2.5 shrink-0" />
                  <span>存档</span>
                </div>
                {roadbookArchives.slice(0, 3).map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onLoadRoadbookSlot(slot.id)}
                    title={`${slot.label} · ${slot.pins.length}步`}
                    className="min-h-[30px] w-[42px] border border-white/15 bg-white/5 px-0.5 py-0.5 text-[9px] font-semibold text-slate-200 font-mono-tabular whitespace-nowrap hover:border-amber-400/55 hover:bg-white/15"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {supportsRouteBook && (
              <button
                type="button"
                onClick={onToggleRouteRead}
                title="路书读线 (空格)"
                className="flex min-h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 border border-sky-400/50 bg-[#141820]/86 px-1 py-1.5 text-[11px] font-semibold text-sky-200 backdrop-blur-sm transition-colors hover:bg-sky-500/25 active:scale-95"
              >
                <Compass className="h-4 w-4 shrink-0" />
                <span className="leading-none whitespace-nowrap">路书</span>
                {betaPinsCount > 0 && (
                  <span className="text-[9px] leading-none text-sky-300/90 font-mono-tabular">
                    {betaPinsCount}步
                  </span>
                )}
              </button>
            )}
            {canShakeOut && !isDraggingLimb && (
              <button
                type="button"
                onClick={onShakeOutHand}
                title="三点稳固 · 单手甩臂回耐 (R)"
                className="flex min-h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 border border-emerald-400/60 bg-[#0F1F1B]/90 px-1 py-1.5 text-[11px] font-semibold text-emerald-200 backdrop-blur-sm transition-colors hover:bg-emerald-500/25 active:scale-95"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span className="leading-none whitespace-nowrap">甩臂</span>
                <span className="text-[9px] leading-none text-emerald-300/90">回耐</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom-Left Corner: Frameless Altitude Progress Readout (Non-Interactive) */}
      <div
        aria-label={`${climberName} 攀登进度 ${progressPct}%`}
        className="pointer-events-none fixed select-none leading-none"
        style={{
          left: 'max(0.6rem, env(safe-area-inset-left))',
          bottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mb-0.5 flex max-w-[155px] items-center gap-1 truncate text-[10px] font-semibold tracking-wider text-amber-100/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.92)]">
          <span className="truncate">{climberName}</span>
          {currentPitch && (
            <>
              <span aria-hidden="true" className="text-slate-400/80">·</span>
              <span
                className={`truncate ${
                  currentPitch.isCrux ? 'text-amber-300' : 'text-slate-200/85'
                }`}
              >
                {currentPitch.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-[#F4F1EA] font-mono-tabular drop-shadow-[0_2px_6px_rgba(0,0,0,0.92)] sm:text-3xl">
            {progressPct}%
          </span>
          <span className="text-[10px] font-semibold text-slate-300/85 font-mono-tabular drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {Math.round(stats.altitudeM)}m
          </span>
        </div>
        <div className="relative mt-1 h-[3px] w-24 bg-white/20 shadow-[0_1px_4px_rgba(0,0,0,0.75)] sm:w-32">
          {pitchSections
            .filter((p) => p.isCrux)
            .map((p) => (
              <div
                key={p.id}
                aria-hidden="true"
                className="absolute inset-y-0 bg-amber-400/45"
                style={{
                  left: `${Math.round(p.minRatio * 100)}%`,
                  width: `${Math.max(4, Math.round((Math.min(1, p.maxRatio) - p.minRatio) * 100))}%`,
                }}
              />
            ))}
          <div
            className="relative h-full bg-[#F4F1EA] transition-[width] duration-200"
            style={{ width: `${progressPct}%` }}
          />
          {bivouacRatios.map((r, idx) => (
            <div
              key={`biv-${idx}`}
              aria-hidden="true"
              className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 bg-emerald-300"
              style={{ left: `${Math.round(Math.max(0.02, Math.min(0.98, r)) * 100)}%` }}
            />
          ))}
        </div>
      </div>

      {/* =====================================================================
          RIGHT SCREEN EDGE RAIL (All Right-Side Clickable Controls + Safe-Area)
         ===================================================================== */}
      {/* Top-Right Dismiss Control (Only when tactical hint is shown) */}
      {showTacticalHintBar && (
        <div
          className="pointer-events-auto fixed"
          style={{
            top: 'max(0.5rem, env(safe-area-inset-top))',
            right: 'max(0.5rem, env(safe-area-inset-right))',
          }}
        >
          <button
            type="button"
            onClick={onDismissHint}
            aria-label="关闭战术提示"
            title="关闭提示"
            className="flex h-11 w-11 items-center justify-center border border-sky-400/45 bg-[#141820]/86 text-sky-200 backdrop-blur-sm transition-colors hover:bg-sky-500/20 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lower-Right Thumb Rail: Piton / Chalk OR Roadbook Edit & Confirm */}
      <div
        className="pointer-events-auto fixed flex flex-col items-end gap-2"
        style={{
          right: 'max(0.5rem, env(safe-area-inset-right))',
          bottom: 'max(0.85rem, env(safe-area-inset-bottom))',
        }}
      >
        {supportsRouteBook && isReadingRoute ? (
          <>
            <button
              type="button"
              disabled={betaPinsCount === 0}
              onClick={onUndoBetaPin}
              title="撤销上一步路书"
              className="flex min-h-[46px] w-[54px] flex-col items-center justify-center gap-0.5 border border-white/18 bg-[#141820]/88 px-1 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/18 active:scale-95 disabled:opacity-35"
            >
              <Undo2 className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">撤销</span>
            </button>
            <button
              type="button"
              disabled={betaPinsCount === 0}
              onClick={onClearBetaPins}
              title="清空全部路书点"
              className="flex min-h-[46px] w-[54px] flex-col items-center justify-center gap-0.5 border border-red-400/45 bg-red-950/55 px-1 py-1 text-[10px] font-medium text-red-200 backdrop-blur-sm transition-colors hover:bg-red-800/35 active:scale-95 disabled:opacity-35"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">清空</span>
            </button>
            {hasUnsavedRoadbook && hasSavedRoadbook && onRevertRoadbook && (
              <button
                type="button"
                onClick={onRevertRoadbook}
                title="还原上次存档"
                className="flex min-h-[46px] w-[54px] flex-col items-center justify-center gap-0.5 border border-white/22 bg-[#141820]/88 px-1 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">还原</span>
              </button>
            )}
            {onSaveRoadbook && (
              <button
                type="button"
                disabled={betaPinsCount === 0 && !hasUnsavedRoadbook}
                onClick={onSaveRoadbook}
                title={hasUnsavedRoadbook ? '保存当前路书修改' : '已存档'}
                className={`flex min-h-[48px] w-[54px] flex-col items-center justify-center gap-0.5 border px-1 py-1 text-[10px] font-bold backdrop-blur-sm transition-colors active:scale-95 disabled:opacity-35 ${
                  hasUnsavedRoadbook
                    ? 'border-amber-400/80 bg-amber-500/24 text-amber-100 hover:bg-amber-500/35'
                    : 'border-emerald-400/55 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-800/30'
                }`}
              >
                <Save className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">
                  {hasUnsavedRoadbook ? '保存' : '已存'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleRouteRead}
              title={isPreClimbReading ? '开始攀登' : '继续攀爬'}
              className="flex min-h-[56px] w-[54px] flex-col items-center justify-center gap-0.5 border border-[#F4F1EA] bg-[#F4F1EA] px-1 py-1.5 text-[11px] font-bold text-[#141820] shadow-md transition-colors hover:bg-white active:scale-95"
            >
              <Play className="h-4 w-4 shrink-0 fill-current" />
              <span className="whitespace-nowrap">{isPreClimbReading ? '开攀' : '继续'}</span>
            </button>
          </>
        ) : isFreeSolo ? (
          <div className="pointer-events-none flex w-[52px] flex-col items-center border border-red-500/50 bg-[#1B1115]/84 px-1 py-2 text-center leading-tight backdrop-blur-sm">
            <span className="text-[10px] font-bold text-red-200">徒手</span>
            <span className="mt-0.5 text-[9px] font-semibold text-amber-300 font-mono-tabular">
              SSS
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onPlacePiton}
              disabled={climber.pitonsLeft <= 0 || climber.isFalling || isReadingRoute}
              title="打入岩钉固定保护点"
              className={`flex min-h-[60px] w-[56px] flex-col items-center justify-center gap-0.5 border px-1 py-1.5 backdrop-blur-sm transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                tutorial.active && tutorial.variant === 'basic' && tutorial.step === 2
                  ? 'animate-pulse border-amber-400 bg-orange-600 text-white'
                  : 'border-orange-500/55 bg-[#1C1614]/88 text-orange-200 hover:bg-orange-600/35'
              }`}
            >
              <Anchor className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-semibold leading-none whitespace-nowrap">岩钉</span>
              <span className="text-[10px] font-bold leading-none text-orange-300 font-mono-tabular">
                ×{climber.pitonsLeft}
              </span>
            </button>

            <button
              type="button"
              onClick={onApplyChalk}
              disabled={climber.chalkUses <= 0 || climber.isFalling || isReadingRoute}
              title="涂抹镁粉提升抓力"
              className={`flex min-h-[60px] w-[56px] flex-col items-center justify-center gap-0.5 border px-1 py-1.5 backdrop-blur-sm transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                tutorial.active && tutorial.variant === 'basic' && tutorial.step === 3
                  ? 'animate-pulse border-amber-400 bg-slate-100 text-slate-950'
                  : 'border-white/25 bg-[#141820]/88 text-slate-100 hover:bg-white/20'
              }`}
            >
              <Feather className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-semibold leading-none whitespace-nowrap">镁粉</span>
              <span className="text-[10px] font-bold leading-none text-slate-300 font-mono-tabular">
                ×{climber.chalkUses}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
