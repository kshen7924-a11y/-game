import {
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
  X,
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
} from '../game/types';
import { AltitudeDifficultyChart } from './AltitudeDifficultyChart';
import './climb-hud.css';

interface GameHUDProps {
  route: RouteConfig;
  difficultyProfile: AltitudeDifficultyBin[];
  weather: ActiveWeather;
  climber: ClimberState;
  stats: ClimbStats;
  lockedLimb: LimbId | null;
  hover: HoverInfo | null;
  tutorial: TutorialState;
  muted: boolean;
  supportsRouteBook: boolean;
  isReadingRoute: boolean;
  isPreClimbReading?: boolean;
  dynoProgress: number | null;
  nearbyRecyclablePiton: boolean;
  betaPinsCount: number;
  nextBetaHoldHint?: string | null;
  canShakeOut: boolean;
  statusBanner: string | null;
  onSelectLimb: (limb: LimbId | null) => void;
  onReleaseLimb: (limb: LimbId) => void;
  onSetLeanBias: (bias: -1 | 0 | 1) => void;
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
      1: '进阶教学 2/4 · 拖动腰部安全带环可移重心与转髋，轻点腰部回中',
      2: '进阶教学 3/4 · 遇侧拉点向反侧倾压重心；三点稳固可点「甩臂回耐」',
      3: `进阶教学 4/4 · 已掌握进阶操作，继续向 ${heightM}m 顶峰攀登！`,
    };
    return advTexts[tutorial.step] ?? advTexts[3];
  }
  const basicTexts: Record<number, string> = {
    0: '教学 1/5 · 按住右手关节拖向金色岩点，松手抓握',
    1: '教学 2/5 · 按住脚部拖向下方金色岩点跟进双脚',
    2: '教学 3/5 · 点击右下「岩钉」固定保护点',
    3: '教学 4/5 · 点击「防粉」擦粉，提升湿滑岩点抓力',
    4: isFreeSolo
      ? `基础完成 · 徒手无岩钉防粉，向 ${heightM}m 顶峰攀登！`
      : `教学 5/5 · 已掌握基础攀登，向 ${heightM}m 顶峰攀登！`,
  };
  return basicTexts[tutorial.step] ?? basicTexts[4];
};

export function GameHUD({
  route,
  difficultyProfile,
  weather,
  climber,
  stats,
  lockedLimb,
  hover,
  tutorial,
  muted,
  supportsRouteBook,
  isReadingRoute,
  isPreClimbReading = false,
  dynoProgress,
  nearbyRecyclablePiton,
  betaPinsCount,
  nextBetaHoldHint,
  canShakeOut,
  statusBanner,
  onSelectLimb,
  onReleaseLimb,
  onSetLeanBias,
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

  return (
    <div className="climb-hud pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Slim Top Bar */}
      <div className="climb-hud-top flex items-start justify-between gap-2">
        {/* Top-Left: Route + Altitude + Slim Slope Chart */}
        <div className="climb-route-stack flex flex-col items-start gap-1">
          <div className="climb-route-plate pointer-events-auto flex items-center gap-2 px-1.5 py-1">
            <button
              type="button"
              onClick={onBackToMenu}
              title="返回选线"
              className="flex min-h-[38px] min-w-[38px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="climb-route-details leading-tight">
              <div className="climb-route-metric flex items-baseline gap-x-1.5">
                <span className="climb-route-tier text-xs font-bold">
                  {route.isDailyChallenge ? '今日神山' : route.tierLabel}
                </span>
                <span className="climb-route-grade text-xs font-bold font-mono-tabular">
                  {route.grade}
                </span>
                <span className="climb-route-height text-sm font-bold font-mono-tabular">
                  {stats.altitudeM.toFixed(1)}/{route.heightM}m
                </span>
              </div>
              <div className="climb-route-conditions flex items-center gap-x-1 text-[10px]">
                <WeatherIcon className="h-3 w-3 shrink-0" />
                <span>{weather.label}</span>
                {isFreeSolo && (
                  <span className="climb-top-danger font-semibold">
                    <span aria-hidden="true">· </span>徒手无保护
                  </span>
                )}
                {supportsRouteBook && isReadingRoute && (
                  <span className="climb-top-read inline-flex items-center gap-0.5 font-semibold">
                    <span aria-hidden="true">·</span>
                    <Pause className="h-2.5 w-2.5" />
                    <span>{isPreClimbReading ? '开攀前读线' : '路书暂停'}</span>
                  </span>
                )}
              </div>
            </div>
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
        <div className="climb-panel pointer-events-auto flex items-center gap-1.5 border border-white/15 bg-[#141820]/82 px-2 py-1 backdrop-blur-sm sm:gap-2.5 sm:px-2.5 sm:py-1.5">
          <div className="climb-meter-stack space-y-1">
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
                  className={`climb-stamina-fill h-full transition-[width] duration-150 ${
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

      {/* Single Unified Transient Status Toast */}
      <div className="flex flex-col items-center justify-center">
        {statusBanner && (
          <div className="border border-amber-400/50 bg-[#141820]/88 px-3 py-1 text-center text-xs font-medium text-amber-200 shadow-md">
            {statusBanner}
          </div>
        )}
      </div>

      {/* Bottom Ergonomic Thumb Zones */}
      <div className="climb-hud-bottom flex flex-col gap-1.5" data-reading={isReadingRoute}>
        {/* Single Concise Context Hint Line */}
        <div className="climb-context flex justify-center">
          {dynoProgress !== null ? (
            <div className="border border-amber-400/80 bg-[#141820]/90 px-3 py-1 text-xs font-bold text-amber-300">
              蓄力跃抓 {Math.round(dynoProgress * 100)}% · 松手腾跃
            </div>
          ) : supportsRouteBook && isReadingRoute ? (
            <div className="climb-panel climb-roadbook pointer-events-auto flex w-full max-w-md flex-col gap-1.5 border border-sky-400/70 bg-[#141820]/94 p-2 text-[11px] text-slate-200 shadow-lg backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-sky-300">
                  {isPreClimbReading ? '开攀前路书读线' : '暂停路书规划'}
                  {betaPinsCount > 0 ? ` · 已标 ${betaPinsCount} 步` : ''}
                </span>
                <span className="text-[10px] text-slate-300">
                  <span className="text-emerald-300">绿稳</span>{' '}
                  <span className="text-blue-300">蓝缝</span>{' '}
                  <span className="text-amber-300">橙脆</span>{' '}
                  <span className="text-cyan-300">青冰</span>
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
          ) : activeDragReason ? (
            <div className="border border-red-400/60 bg-[#141820]/90 px-3 py-1 text-center text-[11px] font-medium text-red-300">
              {activeDragReason}
            </div>
          ) : tutorial.active ? (
            <div className="border border-amber-400/60 bg-[#141820]/90 px-3 py-1 text-center text-xs font-medium text-amber-200">
              {getTutorialText(tutorial, route.heightM, isFreeSolo)}
            </div>
          ) : tacticalHint && !climber.isFalling ? (
            <div className="pointer-events-auto flex items-center gap-2 border border-sky-400/55 bg-[#141820]/92 px-3 py-1 text-[11px] font-medium text-sky-200 shadow-sm">
              <span>{tacticalHint}</span>
              <button
                type="button"
                onClick={onDismissHint}
                aria-label="关闭提示"
                className="flex h-5 w-5 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-slate-300 hover:bg-white/15"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : hover?.hold && !climber.isFalling ? (
            <div className="border border-white/15 bg-[#141820]/86 px-2.5 py-1 text-[11px] text-slate-200">
              <span>{LIMB_ITEMS.find((l) => l.id === hover.suggestedLimb)?.label}</span>
              <span className="mx-1.5 text-slate-500">/</span>
              <span
                className={
                  hover.reachable
                    ? 'text-amber-300'
                    : hover.dynoEligible
                      ? 'text-sky-300'
                      : 'text-red-400'
                }
              >
                {hover.stabilityHint}
              </span>
            </div>
          ) : nearbyRecyclablePiton ? (
            <div className="border border-emerald-400/50 bg-[#141820]/86 px-2.5 py-1 text-[11px] text-emerald-300">
              轻点身旁岩钉可回收
            </div>
          ) : canShakeOut ? (
            <button
              type="button"
              onClick={onShakeOutHand}
              className="pointer-events-auto border border-emerald-400/55 bg-[#141820]/88 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              三点稳固 · 轻点单手甩臂回耐 (R)
            </button>
          ) : supportsRouteBook && nextBetaHoldHint && !climber.isFalling ? (
            <div
              className={`border px-2.5 py-1 text-[11px] ${
                roadbookFlowActive
                  ? 'border-sky-400/70 bg-[#141820]/90 text-sky-200'
                  : 'border-amber-400/45 bg-[#141820]/84 text-amber-200'
              }`}
            >
              {roadbookFlowActive ? '路书速攀节奏 · ' : '路书指引 · '}第1步：{nextBetaHoldHint}（余 {betaPinsCount} 步）
            </div>
          ) : null}
        </div>

        <div className="climb-controls flex items-end justify-between gap-2">
          {/* Left Thumb: Contextual Selected-Limb Independent Release (Old Joystick Removed) */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            {lockedLimb && !climber.isFalling && !isReadingRoute && (
              <div className="climb-panel flex items-center gap-1 border border-white/15 bg-[#141820]/86 p-1 backdrop-blur-sm">
                <span className="px-1.5 text-[11px] font-bold text-amber-300">
                  已选{LIMB_ITEMS.find((l) => l.id === lockedLimb)?.label}
                </span>
                {climber.limbs[lockedLimb].holdId !== null && (
                  <button
                    type="button"
                    onClick={() => onReleaseLimb(lockedLimb)}
                    className="min-h-[34px] border border-red-400/55 bg-red-500/20 px-2.5 text-[11px] font-semibold text-red-200 hover:bg-red-500/35"
                  >
                    松开释放
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectLimb(null)}
                  className="min-h-[34px] border border-white/15 bg-white/5 px-2 text-[11px] text-slate-300 hover:bg-white/15"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {/* Right Thumb: Streamlined Action Deck */}
          <div className="climb-panel climb-action-deck pointer-events-auto flex w-[148px] flex-col gap-1 border border-white/15 bg-[#141820]/84 p-1.5 backdrop-blur-sm sm:w-[168px]">
            {/* Segmented Weight Bias Control */}
            <div
              className="grid w-full grid-cols-3 border border-white/15 bg-white/5"
              role="group"
              aria-label="重心微调"
            >
              {(
                [
                  { bias: -1, label: '左倾' },
                  { bias: 0, label: '居中' },
                  { bias: 1, label: '右倾' },
                ] as const
              ).map((item) => {
                const active = climber.leanBias === item.bias;
                return (
                  <button
                    key={item.bias}
                    type="button"
                    disabled={climber.isFalling || isReadingRoute}
                    onClick={() => onSetLeanBias(item.bias)}
                    className={`min-h-[34px] text-[11px] font-semibold whitespace-nowrap transition-colors disabled:opacity-40 ${
                      active
                        ? 'bg-amber-400 text-[#141820] font-bold'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Route-Book Read Toggle (Intermediate Tier >= 5 Only) */}
            {supportsRouteBook && (
              <button
                type="button"
                onClick={onToggleRouteRead}
                className={`flex min-h-[40px] w-full items-center justify-center gap-1.5 border text-xs font-semibold whitespace-nowrap transition-colors ${
                  isReadingRoute
                    ? 'border-sky-400 bg-sky-500 text-slate-950 font-bold'
                    : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>
                  {isReadingRoute
                    ? isPreClimbReading
                      ? '开始攀登'
                      : '继续攀爬'
                    : betaPinsCount > 0
                      ? `路书 (${betaPinsCount})`
                      : '路书 · 读线'}
                </span>
              </button>
            )}

            {/* Piton & Chalk Pair (or Free Solo status indicator) */}
            {isFreeSolo ? (
              <div className="border border-red-500/45 bg-red-950/40 px-2 py-1.5 text-center leading-tight">
                <div className="text-[11px] font-bold text-red-200">徒手模式 · 无岩钉防粉</div>
                <div className="mt-0.5 text-[10px] text-amber-200/90">无保护存档 · 登顶 SSS</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={onPlacePiton}
                  disabled={climber.pitonsLeft <= 0 || climber.isFalling || isReadingRoute}
                  className={`flex min-h-[40px] items-center justify-center gap-1 border text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
                  className={`flex min-h-[40px] items-center justify-center gap-1 border text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    tutorial.active && tutorial.variant === 'basic' && tutorial.step === 3
                      ? 'border-amber-400 bg-slate-100 text-slate-950 animate-pulse'
                      : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
                  }`}
                >
                  <span>防粉</span>
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
