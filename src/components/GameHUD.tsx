import { ChevronLeft, CloudFog, CloudRain, CloudSnow, Eye, Pause, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react';
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
  statusBanner: string | null;
  onSelectLimb: (limb: LimbId | null) => void;
  onPlacePiton: () => void;
  onApplyChalk: () => void;
  onToggleRouteRead: () => void;
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
    0: '教学 1/5 · 轻点上方发亮的金色岩点，让手部向上抓握',
    1: '教学 2/5 · 轻点脚下金色岩点跟进双脚，稳住重心可停止消耗耐力',
    2: '教学 3/5 · 点击右下角「岩钉」打入保护点，失足时可被绳索拉住',
    3: '教学 4/5 · 点击「防粉」涂抹防滑粉，湿滑或小岩点也能抓稳',
    4: `教学 5/5 · 已掌握全部技巧，继续向上攀至 ${heightM}m 岩台登顶！`,
  };
  return texts[step] ?? texts[4];
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
  statusBanner,
  onSelectLimb,
  onPlacePiton,
  onApplyChalk,
  onToggleRouteRead,
  onToggleMute,
  onRestart,
  onBackToMenu,
}: GameHUDProps) {
  const staminaPct = Math.round((climber.stamina / climber.maxStamina) * 100);
  const healthPct = Math.round(climber.health);
  const chalkPct = Math.round(climber.chalk);

  const staminaStatus = climber.isResting
    ? '休整'
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
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-5">
      {/* Compact Top Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Left: Route, Altitude, Weather + Dynamic Altitude Difficulty Slope Chart */}
        <div className="flex flex-col items-start gap-1.5">
          <div className="pointer-events-auto flex items-center gap-2 border border-white/15 bg-[#141820]/84 px-2.5 py-1.5 backdrop-blur-sm sm:gap-3 sm:px-3.5 sm:py-2">
            <button
              type="button"
              onClick={onBackToMenu}
              title="选择线路"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="leading-tight">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-[#F59E0B] sm:text-sm">
                  {route.tierLabel}
                </span>
                <span className="font-display text-base font-bold text-amber-200/90 font-mono-tabular sm:text-lg">
                  {route.grade}
                </span>
                <span className="font-display text-base font-bold text-[#F4F1EA] font-mono-tabular sm:text-lg">
                  {stats.altitudeM.toFixed(1)}m
                </span>
                <span className="text-[11px] text-slate-400 font-mono-tabular">
                  /{route.heightM}m
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <WeatherIcon className="h-3.5 w-3.5 text-sky-300" />
                <span>{weather.label}</span>
                {weather.chalkDrainMult > 1.15 && (
                  <span className="text-amber-300 font-mono-tabular">
                    · 粉耗×{weather.chalkDrainMult.toFixed(1)}
                  </span>
                )}
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden font-mono-tabular text-slate-400 sm:inline">
                  {formatTime(stats.elapsedSec)}
                </span>
                {isReadingRoute && (
                  <span className="inline-flex items-center gap-0.5 text-sky-300 font-semibold">
                    <span aria-hidden="true">·</span>
                    <Pause className="h-3 w-3" />
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

        {/* Right: Survival Telemetry + Mute/Restart */}
        <div className="pointer-events-auto flex items-center gap-2 border border-white/15 bg-[#141820]/84 px-2.5 py-1.5 backdrop-blur-sm sm:gap-3 sm:px-3.5 sm:py-2">
          <div className="w-[104px] space-y-1 sm:w-[152px]">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200">耐力·{staminaStatus}</span>
                <span className="font-mono-tabular text-slate-300">{staminaPct}%</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full bg-slate-800">
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
                <span className="text-[10px] text-slate-400">体</span>
                <div className="h-1 flex-1 bg-slate-800">
                  <div
                    className={`h-full ${healthPct <= 35 ? 'bg-red-500' : 'bg-sky-400'}`}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">粉</span>
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
              className="flex min-h-[40px] min-w-[40px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onRestart}
              title="重攀"
              className="hidden min-h-[40px] min-w-[40px] items-center justify-center border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 sm:flex"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transient Status Banner */}
      <div className="flex flex-col items-center justify-center">
        {statusBanner && (
          <div className="border border-amber-400/50 bg-[#141820]/90 px-3.5 py-1.5 text-center text-xs font-medium text-amber-200 shadow-lg sm:text-sm">
            {statusBanner}
          </div>
        )}
      </div>

      {/* Mobile-First Two-Thumb Bottom Zone: Left Joystick + Right Gear & Route-Read */}
      <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col items-center gap-1">
          {isReadingRoute ? (
            <div className="border border-sky-400/60 bg-[#141820]/94 px-3 py-1.5 text-center text-xs text-slate-200 shadow-lg">
              <span className="font-bold text-sky-300">已暂停 · 读线模式：</span>
              <span className="text-emerald-300">绿稳固</span>
              <span className="mx-1 text-slate-500">·</span>
              <span className="text-blue-300">蓝岩缝</span>
              <span className="mx-1 text-slate-500">·</span>
              <span className="text-amber-300">橙虚线脆岩</span>
              <span className="mx-1 text-slate-500">·</span>
              <span className="text-cyan-300">青虚线冰面</span>
              <span className="hidden sm:inline text-slate-400"> · 上下滑动预览全线</span>
            </div>
          ) : tutorial.active ? (
            <div className="border border-amber-400/60 bg-[#141820]/92 px-3.5 py-1.5 text-center text-xs font-medium text-amber-200">
              {getTutorialText(tutorial.step, route.heightM)}
            </div>
          ) : (
            hover?.hold &&
            !climber.isFalling && (
              <div className="border border-white/15 bg-[#141820]/88 px-3 py-1 text-xs text-slate-200">
                <span>{LIMB_ITEMS.find((l) => l.id === hover.suggestedLimb)?.label}</span>
                <span className="mx-1.5 text-slate-500">/</span>
                <span className={hover.reachable ? 'text-amber-300' : 'text-red-400'}>
                  {hover.stabilityHint}
                </span>
              </div>
            )
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          {/* Left Thumb: Rapid 4-Quadrant Limb Joystick */}
          <LimbJoystick
            climber={climber}
            lockedLimb={lockedLimb}
            onSelectLimb={onSelectLimb}
          />

          {/* Right Thumb: Route-Read Pause + Piton + Chalk */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 border border-white/15 bg-[#141820]/90 p-1.5 backdrop-blur-sm">
            <button
              type="button"
              onClick={onToggleRouteRead}
              className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 border px-3.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isReadingRoute
                  ? 'border-sky-400 bg-sky-500 text-slate-950 font-bold'
                  : 'border-white/25 bg-white/10 text-slate-100 hover:bg-white/20'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isReadingRoute ? '继续攀爬' : '读线 · 暂停'}</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onPlacePiton}
                disabled={climber.pitonsLeft <= 0 || climber.isFalling || isReadingRoute}
                className={`flex min-h-[44px] items-center justify-center gap-1 border px-3 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
                className={`flex min-h-[44px] items-center justify-center gap-1 border px-3 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tutorial.active && tutorial.step === 3
                    ? 'border-amber-400 bg-slate-100 text-slate-950 animate-pulse'
                    : 'border-white/25 bg-white/10 text-slate-100 hover:bg-white/20'
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
