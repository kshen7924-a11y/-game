import {
  ChevronLeft,
  CloudFog,
  CloudRain,
  CloudSnow,
  Eye,
  Pause,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ActiveWeather,
  AltitudeDifficultyBin,
  ClimberState,
  ClimbStats,
  HoverInfo,
  LimbId,
  RouteConfig,
  TutorialState,
} from '../game/types';
import { AltitudeDifficultyChart } from './AltitudeDifficultyChart';
import { LimbJoystick } from './LimbJoystick';

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
  isReadingRoute: boolean;
  dynoProgress: number | null;
  nearbyRecyclablePiton: boolean;
  betaPinsCount: number;
  canShakeOut: boolean;
  statusBanner: string | null;
  onSelectLimb: (limb: LimbId | null) => void;
  onSetLeanBias: (bias: -1 | 0 | 1) => void;
  onPlacePiton: () => void;
  onApplyChalk: () => void;
  onToggleRouteRead: () => void;
  onClearBetaPins: () => void;
  onShakeOutHand: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
}

const LIMB_ITEMS: { id: LimbId; label: string }[] = [
  { id: 'leftHand', label: '左手' },
  { id: 'rightHand', label: '右手' },
  { id: 'leftFoot', label: '左脚' },
  { id: 'rightFoot', label: '右脚' },
];

const getTutorialText = (step: number, heightM: number): string => {
  const texts: Record<number, string> = {
    0: '教学 1/5 · 轻点上方金色岩点，伸手抓握',
    1: '教学 2/5 · 轻点脚下金色岩点跟进双脚，稳住重心',
    2: '教学 3/5 · 点击右下「岩钉」固定保护点',
    3: '教学 4/5 · 点击「防粉」擦粉，提升湿滑岩点抓力',
    4: `教学 5/5 · 已掌握技巧，向 ${heightM}m 顶峰攀登！`,
  };
  return texts[step] ?? texts[4];
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
  isReadingRoute,
  dynoProgress,
  nearbyRecyclablePiton,
  betaPinsCount,
  canShakeOut,
  statusBanner,
  onSelectLimb,
  onSetLeanBias,
  onPlacePiton,
  onApplyChalk,
  onToggleRouteRead,
  onClearBetaPins,
  onShakeOutHand,
  onToggleMute,
  onRestart,
  onBackToMenu,
}: GameHUDProps) {
  const staminaPct = Math.round((climber.stamina / climber.maxStamina) * 100);
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
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-2 sm:p-4">
      {/* Slim Top Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Route + Altitude + Slim Slope Chart */}
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
                {isReadingRoute && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-sky-300">
                    <span aria-hidden="true">·</span>
                    <Pause className="h-2.5 w-2.5" />
                    <span>暂停读线</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <AltitudeDifficultyChart
            profile={difficultyProfile}
            altitudeM={stats.altitudeM}
            routeHeightM={route.heightM}
          />
        </div>

        {/* Top-Right: Compact Survival Bars + Quick Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 border border-white/15 bg-[#141820]/82 px-2 py-1 backdrop-blur-sm sm:gap-2.5 sm:px-2.5 sm:py-1.5">
          <div className="w-[96px] space-y-1 sm:w-[132px]">
            <div>
              <div className="flex items-center justify-between text-[10px] leading-none">
                <span className="text-slate-200">耐力·{staminaStatus}</span>
                <span className="font-mono-tabular text-slate-300">{staminaPct}%</span>
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
            </div>

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
      <div className="flex flex-col gap-1.5 pb-[env(safe-area-inset-bottom)]">
        {/* Single Concise Context Hint Line */}
        <div className="flex justify-center">
          {dynoProgress !== null ? (
            <div className="border border-amber-400/80 bg-[#141820]/90 px-3 py-1 text-xs font-bold text-amber-300">
              蓄力跃抓 {Math.round(dynoProgress * 100)}% · 松手腾跃
            </div>
          ) : isReadingRoute ? (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 border border-sky-400/60 bg-[#141820]/92 px-3 py-1 text-center text-[11px] text-slate-200">
              <span>
                <span className="font-bold text-sky-300">读线暂停：</span>
                点岩点编序号 · <span className="text-emerald-300">绿稳</span>{' '}
                <span className="text-blue-300">蓝缝</span>{' '}
                <span className="text-amber-300">橙脆</span>{' '}
                <span className="text-cyan-300">青冰</span>
              </span>
              {betaPinsCount > 0 && (
                <button
                  type="button"
                  onClick={onClearBetaPins}
                  className="border border-amber-300/60 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-400/30"
                >
                  清空路书 ({betaPinsCount})
                </button>
              )}
            </div>
          ) : tutorial.active ? (
            <div className="border border-amber-400/60 bg-[#141820]/90 px-3 py-1 text-center text-xs font-medium text-amber-200">
              {getTutorialText(tutorial.step, route.heightM)}
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
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-2">
          {/* Left Thumb: Compact 4-Quadrant Limb Joystick */}
          <LimbJoystick
            climber={climber}
            lockedLimb={lockedLimb}
            onSelectLimb={onSelectLimb}
          />

          {/* Right Thumb: Streamlined Action Deck */}
          <div className="pointer-events-auto flex w-[148px] flex-col gap-1 border border-white/15 bg-[#141820]/84 p-1.5 backdrop-blur-sm sm:w-[168px]">
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

            {/* Route-Read Pause Toggle */}
            <button
              type="button"
              onClick={onToggleRouteRead}
              className={`flex min-h-[40px] w-full items-center justify-center gap-1.5 border text-xs font-semibold whitespace-nowrap transition-colors ${
                isReadingRoute
                  ? 'border-sky-400 bg-sky-500 text-slate-950 font-bold'
                  : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isReadingRoute ? '继续攀爬' : '读线 · 暂停'}</span>
            </button>

            {/* Piton & Chalk Pair */}
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={onPlacePiton}
                disabled={climber.pitonsLeft <= 0 || climber.isFalling || isReadingRoute}
                className={`flex min-h-[40px] items-center justify-center gap-1 border text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tutorial.active && tutorial.step === 2
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
                  tutorial.active && tutorial.step === 3
                    ? 'border-amber-400 bg-slate-100 text-slate-950 animate-pulse'
                    : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <span>防粉</span>
                <span className="font-mono-tabular">×{climber.chalkUses}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
