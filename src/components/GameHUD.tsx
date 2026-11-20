import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUp,
  ChevronLeft,
  CloudFog,
  CloudRain,
  CloudSnow,
  Compass,
  Pause,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  ActiveWeather,
  AltitudeDifficultyBin,
  ClimberState,
  ClimbStats,
  HoverInfo,
  LimbId,
  RoadbookStaminaEstimate,
  RouteConfig,
  TutorialState,
  WeatherIncidentState,
} from '../game/types';
import { AltitudeDifficultyChart } from './AltitudeDifficultyChart';

interface GameHUDProps {
  route: RouteConfig;
  difficultyProfile: AltitudeDifficultyBin[];
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
  nextBetaHoldHint?: string | null;
  canShakeOut: boolean;
  statusBanner: string | null;
  onPlacePiton: () => void;
  onApplyChalk: () => void;
  onToggleRouteRead: () => void;
  onClearBetaPins: () => void;
  onUndoBetaPin: () => void;
  onAutoSuggestBetaPins: () => void;
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
  roadbookEstimate?: RoadbookStaminaEstimate | null;
  roadbookFlowActive?: boolean;
  onSpringHold?: boolean;
}

const LIMB_ITEMS: { id: LimbId; label: string }[] = [
  { id: 'leftHand', label: '左手' },
  { id: 'rightHand', label: '右手' },
  { id: 'leftFoot', label: '左脚' },
  { id: 'rightFoot', label: '右脚' },
];

const getTutorialText = (
  tutorial: TutorialState,
  heightM: number,
  isFreeSolo = false
): string => {
  if (tutorial.variant === 'advanced') {
    const advTexts: Record<number, string> = {
      0: '进阶教学 1/4 · 双击手脚关节或将其拖至空处，可独立松开支点',
      1: '进阶教学 2/4 · 拖动腰部安全带环可手动移重心，轻点腰部恢复智能回中',
      2: '进阶教学 3/4 · 遇侧拉点可拖腰反向倾压；三点稳固可点「甩臂回耐」',
      3: `进阶教学 4/4 · 已掌握进阶操作，继续向 ${heightM}m 顶峰攀登！`,
    };
    return advTexts[tutorial.step] ?? advTexts[3];
  }
  const basicTexts: Record<number, string> = {
    0: '教学 1/5 · 按住右手关节拖向金色岩点，松手抓握',
    1: '教学 2/5 · 按住脚部拖向下方金色岩点跟进双脚',
    2: '教学 3/5 · 点击右下「岩钉」固定保护点',
    3: '教学 4/5 · 点击「镁粉」擦粉，提升湿滑岩点抓力',
    4: isFreeSolo
      ? `基础完成 · 徒手无岩钉镁粉，向 ${heightM}m 顶峰攀登！`
      : `教学 5/5 · 已掌握基础攀登，向 ${heightM}m 顶峰攀登！`,
  };
  return basicTexts[tutorial.step] ?? basicTexts[4];
};

export function GameHUD({
  route,
  difficultyProfile,
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
  nextBetaHoldHint,
  canShakeOut,
  statusBanner,
  onPlacePiton,
  onApplyChalk,
  onToggleRouteRead,
  onClearBetaPins,
  onUndoBetaPin,
  onAutoSuggestBetaPins,
  onJumpReadCamera,
  onInspectBin,
  onShakeOutHand,
  onToggleMute,
  onRestart,
  onBackToMenu,
  activeDragReason,
  tacticalHint,
  onDismissHint,
  isFreeSolo = false,
  staminaRatePerSec = 0,
  roadbookEstimate = null,
  roadbookFlowActive = false,
  onSpringHold = false,
}: GameHUDProps) {
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
  const flowCombo = climber.flowCombo ?? 0;
  const hasSwingBoost = (climber.swingBoostTimer ?? 0) > 0.25;

  const staminaStatus = climber.isResting
    ? '休整'
    : climber.isShakingOut
      ? '甩手恢复'
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

  const inlineCues: { key: string; text: string; tone: string }[] = [];
  if (!isReadingRoute && !climber.isFalling) {
    if (leanText) {
      inlineCues.push({ key: 'lean', text: leanText, tone: 'text-amber-300' });
    }
    if (flowCombo >= 2) {
      inlineCues.push({ key: 'combo', text: `连攀 ×${flowCombo}`, tone: 'text-amber-200' });
    }
    if (hasSwingBoost) {
      inlineCues.push({ key: 'swing', text: '摆荡增幅', tone: 'text-cyan-300' });
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-2 sm:p-4">
      {/* Top Safe Zone: Header Row + Single-Line Arbitrated Status Strip (Center Viewport 100% Unobstructed) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Route + Altitude + Top Roadbook Toggle + Slim Slope Chart */}
        <div className="flex flex-col items-start gap-1">
          <div className="pointer-events-auto flex items-center gap-2 border border-white/15 bg-[#141820]/82 px-2 py-1 backdrop-blur-sm sm:px-2.5 sm:py-1.5">
            <button
              type="button"
              onClick={onBackToMenu}
              title="返回选线"
              className="flex min-h-[38px] min-w-[38px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="leading-tight">
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-xs font-bold text-[#F59E0B]">
                  {route.isDailyChallenge ? '今日神山' : route.tierLabel}
                </span>
                <span className="font-display text-sm font-bold text-amber-200/90 font-mono-tabular sm:text-base">
                  {route.grade}
                </span>
                <span className="font-display text-sm font-bold text-[#F4F1EA] font-mono-tabular sm:text-base">
                  {stats.altitudeM.toFixed(1)}/{route.heightM}m
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-300">
                <WeatherIcon className="h-3 w-3 text-sky-300" />
                <span>{weather.label}</span>
                {isFreeSolo && (
                  <span className="font-semibold text-red-300">
                    <span aria-hidden="true">· </span>徒手无保护
                  </span>
                )}
                {supportsRouteBook && isReadingRoute && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-sky-300">
                    <span aria-hidden="true">·</span>
                    <Pause className="h-2.5 w-2.5" />
                    <span>{isPreClimbReading ? '开攀前读线' : '路书暂停'}</span>
                  </span>
                )}
              </div>
            </div>

            {supportsRouteBook && (
              <button
                type="button"
                onClick={onToggleRouteRead}
                title="路书读线 (空格)"
                className={`ml-0.5 flex min-h-[36px] items-center gap-1 border px-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isReadingRoute
                    ? 'border-sky-400 bg-sky-500 text-slate-950 font-bold'
                    : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>
                  {isReadingRoute
                    ? isPreClimbReading
                      ? '开攀'
                      : '继续'
                    : betaPinsCount > 0
                      ? `路书(${betaPinsCount})`
                      : '路书'}
                </span>
              </button>
            )}
          </div>

          <AltitudeDifficultyChart
            profile={difficultyProfile}
            altitudeM={stats.altitudeM}
            routeHeightM={route.heightM}
            isReadingRoute={supportsRouteBook && isReadingRoute}
            onInspectBin={supportsRouteBook ? onInspectBin : undefined}
          />
        </div>

        {/* Top-Right: Compact Survival Bars + Quick Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 border border-white/15 bg-[#141820]/82 px-2 py-1 backdrop-blur-sm sm:gap-2.5 sm:px-2.5 sm:py-1.5">
          <div className="w-[108px] space-y-1 sm:w-[148px]">
            <div>
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none">
                <span className="truncate text-slate-200">耐力·{staminaStatus}</span>
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
                  <span className="text-slate-300">{staminaPct}%</span>
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
              <div className="mt-0.5 flex items-center justify-between text-[9px] leading-none text-slate-400 font-mono-tabular">
                <span>耗 {spentTotal}</span>
                <span>回 {recoveredTotal}</span>
              </div>
            </div>

            {isFreeSolo ? (
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex flex-1 items-center gap-1">
                  <span className="text-[9px] text-slate-400">体</span>
                  <div className="h-1 flex-1 bg-slate-800">
                    <div
                      className={`h-full ${healthPct <= 35 ? 'bg-red-500' : 'bg-sky-400'}`}
                      style={{ width: `${healthPct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-amber-300 whitespace-nowrap font-mono-tabular">
                  耗体-50%
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">体</span>
                  <div className="h-1 flex-1 bg-slate-800">
                    <div
                      className={`h-full ${healthPct <= 35 ? 'bg-red-500' : 'bg-sky-400'}`}
                      style={{ width: `${healthPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">粉</span>
                  <div className="h-1 flex-1 bg-slate-800">
                    <div className="h-full bg-slate-100" style={{ width: `${chalkPct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? '开启音效' : '静音'}
              className="flex min-h-[38px] min-w-[38px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onRestart}
              title="重攀"
              className="hidden min-h-[38px] min-w-[38px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 sm:flex"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>

        {/* Single-Line Top Safe-Zone Status Strip (Priority Arbitrated — Never Overlaps Climber) */}
        <div className="flex min-h-[22px] justify-center">
          {weatherIncident && !isReadingRoute ? (
            <div
              className={`max-w-[92vw] border px-2.5 py-1 shadow-md backdrop-blur-sm ${
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
            <div className="inline-flex max-w-[92vw] items-center gap-1.5 border border-amber-400/75 bg-[#141820]/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 whitespace-nowrap font-mono-tabular">
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
            <div className="max-w-[92vw] truncate border border-red-400/55 bg-[#141820]/88 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
              {activeDragReason}
            </div>
          ) : statusBanner ? (
            <div className="max-w-[92vw] truncate border border-amber-400/45 bg-[#141820]/86 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
              {statusBanner}
            </div>
          ) : inlineCues.length > 0 ? (
            <div className="inline-flex max-w-[92vw] items-center gap-1.5 bg-[#141820]/74 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap font-mono-tabular">
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
          ) : null}
        </div>
      </div>

      {/* Bottom Area: Essential Interactive Controls + ONLY Piton & Chalk Equipment Bar */}
      <div className="flex flex-col gap-1.5 pb-[env(safe-area-inset-bottom)]">
        {/* Bottom Context Slot (Roadbook / Tutorial / Shake-Out / Quiet Hover) */}
        <div className="flex justify-center">
          {supportsRouteBook && isReadingRoute ? (
            <div className="pointer-events-auto flex w-full max-w-md flex-col gap-1.5 border border-sky-400/70 bg-[#141820]/94 p-2 text-[11px] text-slate-200 shadow-lg backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-sky-300">
                  {isPreClimbReading ? '开攀前路书读线' : '暂停路书规划'}
                  {betaPinsCount > 0 ? ` · 已标 ${betaPinsCount} 步` : ''}
                </span>
                <span className="text-[10px] text-slate-300">
                  <span className="text-emerald-300">绿稳</span>{' '}
                  <span className="text-lime-300">翠跃</span>{' '}
                  <span className="text-cyan-300">青摆</span>{' '}
                  <span className="text-fuchsia-300">紫颤</span>{' '}
                  <span className="text-blue-300">蓝缝</span>{' '}
                  <span className="text-amber-300">橙脆</span>
                </span>
              </div>

              <div className="text-[10px] text-slate-300">
                点岩点按序连线（再点末点撤销）；拖拽或滚轮上下览壁，点左上坡度柱跳转难段
              </div>

              {roadbookEstimate && (
                <div className="border border-white/15 bg-white/5 px-2 py-1 text-[10px] leading-snug">
                  {roadbookEstimate.pinCount > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 font-mono-tabular">
                        <span>
                          路书预算：
                          <span className="text-amber-300">
                            耗-{roadbookEstimate.estimatedDrain}
                          </span>
                          {' / '}
                          <span className="text-emerald-300">
                            回+{roadbookEstimate.estimatedRecovery}
                          </span>
                          {' · '}
                          <span className="text-sky-200">
                            余{roadbookEstimate.projectedRemainingStamina}%
                          </span>
                        </span>
                        <span className="text-slate-300">
                          爬升 {roadbookEstimate.totalAscentM}m · 约{roadbookEstimate.estimatedTimeSec}s
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 ${
                          roadbookEstimate.decoyHitsCount > 0 || roadbookEstimate.riskySpanCount > 0
                            ? 'text-red-300'
                            : 'text-emerald-300/90'
                        }`}
                      >
                        {roadbookEstimate.verdictLabel}
                      </div>
                      {roadbookEstimate.freeSoloNote && (
                        <div className="mt-0.5 font-semibold text-amber-200">
                          {roadbookEstimate.freeSoloNote}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-0.5 text-slate-300">
                      <div>{roadbookEstimate.verdictLabel}</div>
                      {roadbookEstimate.freeSoloNote && (
                        <div className="font-semibold text-amber-200">
                          {roadbookEstimate.freeSoloNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => onJumpReadCamera('up')}
                  className="flex min-h-[32px] items-center gap-1 border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-white/20"
                >
                  <ArrowUp className="h-3 w-3" />
                  <span>上看</span>
                </button>
                <button
                  type="button"
                  onClick={() => onJumpReadCamera('reset')}
                  className="flex min-h-[32px] items-center gap-1 border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-white/20"
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  <span>回位</span>
                </button>
                <button
                  type="button"
                  disabled={betaPinsCount === 0}
                  onClick={onUndoBetaPin}
                  className="flex min-h-[32px] items-center gap-1 border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-white/20 disabled:opacity-40"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>撤销</span>
                </button>
                <button
                  type="button"
                  disabled={betaPinsCount === 0}
                  onClick={onClearBetaPins}
                  className="flex min-h-[32px] items-center gap-1 border border-red-400/40 bg-red-500/15 px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>清空</span>
                </button>
                <button
                  type="button"
                  onClick={onAutoSuggestBetaPins}
                  className="flex min-h-[32px] items-center gap-1 border border-amber-400/60 bg-amber-400/15 px-2 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-400/30"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>参考路书</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleRouteRead}
                  className="ml-auto flex min-h-[32px] items-center gap-1 border border-sky-300 bg-sky-500 px-3 py-1 text-[11px] font-bold text-slate-950 hover:bg-sky-400"
                >
                  <span>{isPreClimbReading ? '开始攀登' : '继续攀爬'}</span>
                </button>
              </div>
            </div>
          ) : tutorial.active ? (
            <div className="max-w-[92vw] truncate border border-amber-400/60 bg-[#141820]/90 px-3 py-1 text-center text-xs font-medium text-amber-200">
              {getTutorialText(tutorial, route.heightM, isFreeSolo)}
            </div>
          ) : tacticalHint && !climber.isFalling && !isDraggingLimb ? (
            <div className="pointer-events-auto flex max-w-[92vw] items-center gap-2 border border-sky-400/55 bg-[#141820]/92 px-3 py-1 text-[11px] font-medium text-sky-200 shadow-sm">
              <span className="truncate">{tacticalHint}</span>
              <button
                type="button"
                onClick={onDismissHint}
                aria-label="关闭提示"
                className="flex h-5 w-5 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-slate-300 hover:bg-white/15"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : canShakeOut && !isDraggingLimb ? (
            <button
              type="button"
              onClick={onShakeOutHand}
              className="pointer-events-auto border border-emerald-400/55 bg-[#141820]/88 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              三点稳固 · 单手甩臂回耐 (R)
            </button>
          ) : hover?.hold && !climber.isFalling && !isDraggingLimb ? (
            <div className="max-w-[90vw] truncate bg-[#141820]/82 px-2.5 py-0.5 text-[11px] text-slate-200">
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
          ) : nearbyRecyclablePiton && !isDraggingLimb ? (
            <div className="bg-[#141820]/80 px-2.5 py-0.5 text-[11px] text-emerald-300">
              轻点身旁岩钉可回收
            </div>
          ) : supportsRouteBook && nextBetaHoldHint && !climber.isFalling && !isDraggingLimb ? (
            <div
              className={`max-w-[90vw] truncate bg-[#141820]/80 px-2.5 py-0.5 text-[11px] ${
                roadbookFlowActive ? 'text-sky-200' : 'text-amber-200'
              }`}
            >
              {roadbookFlowActive ? '路书节奏 · ' : '路书第1步 · '}{nextBetaHoldHint}（余 {betaPinsCount}）
            </div>
          ) : null}
        </div>

        {/* Bottom Equipment Bar: ONLY Piton & Chalk (or compact Free Solo strip) */}
        <div className="flex items-end justify-end">
          <div className="pointer-events-auto border border-white/15 bg-[#141820]/84 p-1.5 backdrop-blur-sm">
            {isFreeSolo ? (
              <div className="border border-red-500/45 bg-red-950/40 px-3 py-1.5 text-center leading-tight">
                <div className="text-[11px] font-bold text-red-200">徒手攀登 · 无岩钉镁粉</div>
                <div className="mt-0.5 text-[10px] text-amber-200/90">无保护存档 · 登顶 SSS</div>
              </div>
            ) : (
              <div className="grid w-[164px] grid-cols-2 gap-1.5 sm:w-[184px]">
                <button
                  type="button"
                  onClick={onPlacePiton}
                  disabled={climber.pitonsLeft <= 0 || climber.isFalling || isReadingRoute}
                  className={`flex min-h-[42px] items-center justify-center gap-1 border text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    tutorial.active && tutorial.variant === 'basic' && tutorial.step === 2
                      ? 'border-amber-400 bg-orange-600 text-white animate-pulse'
                      : 'border-orange-500/45 bg-orange-600/25 text-orange-200 hover:bg-orange-600/40'
                  }`}
                >
                  <span>岩钉</span>
                  <span className="font-mono-tabular">×{climber.pitonsLeft}</span>
                </button>

                <button
                  type="button"
                  onClick={onApplyChalk}
                  disabled={climber.chalkUses <= 0 || climber.isFalling || isReadingRoute}
                  className={`flex min-h-[42px] items-center justify-center gap-1 border text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    tutorial.active && tutorial.variant === 'basic' && tutorial.step === 3
                      ? 'border-amber-400 bg-slate-100 text-slate-950 animate-pulse'
                      : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
                  }`}
                >
                  <span>镁粉</span>
                  <span className="font-mono-tabular">×{climber.chalkUses}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
