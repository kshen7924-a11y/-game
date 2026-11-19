import { useState } from 'react';
import { Mountain, Play, Square } from 'lucide-react';
import { BADGES, ROUTES } from '../game/mountain';
import { ClimbStats, ClimbStyle, GamePhase, RouteConfig } from '../game/types';
import { ClimbBadge } from './ClimbBadge';

interface SummitOverlayProps {
  phase: GamePhase;
  route: RouteConfig;
  stats: ClimbStats;
  climbStyle: ClimbStyle;
  summitProgress: number;
  hasCheckpoint: boolean;
  newlyUnlockedBadge: boolean;
  isPlayingTrail: boolean;
  fallDiagnosis?: string | null;
  onToggleTrailPlayback: () => void;
  onRespawnCheckpoint: () => void;
  onRestart: () => void;
  onNextRoute: (next: RouteConfig) => void;
  onBackToMenu: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${String(s).padStart(2, '0')}秒`;
}

export function SummitOverlay({
  phase,
  route,
  stats,
  climbStyle,
  summitProgress,
  hasCheckpoint,
  newlyUnlockedBadge,
  isPlayingTrail,
  fallDiagnosis,
  onToggleTrailPlayback,
  onRespawnCheckpoint,
  onRestart,
  onNextRoute,
  onBackToMenu,
}: SummitOverlayProps) {
  const [hideForView, setHideForView] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const curIdx = ROUTES.findIndex((r) => r.id === route.id);
  const nextRoute = curIdx >= 0 && curIdx < ROUTES.length - 1 ? ROUTES[curIdx + 1] : null;
  const badge = BADGES.find((b) => b.id === route.id) ?? BADGES[0];

  const styleTitle =
    climbStyle === 'onsight'
      ? '盲攀零坠落 ★'
      : climbStyle === 'redpoint'
        ? '红点零坠落 ◆'
        : '完攀登顶';

  if (phase === 'SUMMIT') {
    if (summitProgress < 0.7) {
      return (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center px-4">
          <div className="border border-white/20 bg-[#141820]/82 px-4 py-2 text-xs tracking-wide text-slate-200 backdrop-blur-sm">
            已登顶 {route.isDailyChallenge ? '今日神山' : route.tierLabel}（{route.grade}）· 正在拉远全景视角
          </div>
        </div>
      );
    }

    if (hideForView) {
      return (
        <div className="fixed bottom-5 right-5 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTrailPlayback}
            className="flex min-h-[44px] items-center gap-1.5 border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0"
          >
            {isPlayingTrail ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlayingTrail ? '停止回放' : '轨迹回放'}</span>
          </button>
          <button
            type="button"
            onClick={() => setHideForView(false)}
            className="min-h-[44px] border-2 border-[#141820] bg-[#F4F1EA] px-4 py-2 text-xs font-bold text-[#141820] shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0"
          >
            显示战绩
          </button>
        </div>
      );
    }

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8">
        <div className="pointer-events-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto border-2 border-[#141820] bg-[#F4F1EA] p-4 text-[#141820] shadow-[6px_6px_0px_#141820] sm:p-5">
          {/* Summit Graphic-Novel Illustration */}
          <div className="relative aspect-video w-full overflow-hidden border-2 border-[#141820] bg-gradient-to-br from-slate-700 via-slate-800 to-amber-900">
            {!imgFailed ? (
              <img
                src={route.summitImage}
                alt={`${route.grade} ${route.name} 登顶插画`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-amber-100">
                <Mountain className="h-9 w-9" />
                <span className="text-xs font-semibold">{route.name} · 山巅纪念插画</span>
              </div>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#EA580C]">
            <span>{styleTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{route.isDailyChallenge ? `今日神山 (${route.dailyDateKey})` : route.tierLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.grade} / {route.heightM}m
            </span>
          </div>

          <h2 className="font-display mt-0.5 text-2xl font-bold tracking-tight text-[#141820] sm:text-3xl">
            {route.name}
          </h2>

          <div className="mt-3">
            <ClimbBadge
              badge={badge}
              unlocked
              bestStyle={climbStyle}
              highlightNew={newlyUnlockedBadge}
            />
          </div>

          {/* Tabular Telemetry */}
          <div className="mt-3.5 grid grid-cols-4 gap-2 border-t border-slate-300 pt-3 text-xs">
            <div>
              <div className="text-[11px] text-slate-500">耗时</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">
                {formatDuration(stats.elapsedSec)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">步数</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">{stats.movesMade}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">岩钉</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">{stats.pitonsPlaced}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">救险</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">{stats.fallsCaught}</div>
            </div>
          </div>

          {/* Clean Two-Tier Action Hierarchy */}
          <div className="mt-4 space-y-2 border-t border-slate-300 pt-3">
            {nextRoute && !route.isDailyChallenge && (
              <button
                type="button"
                onClick={() => onNextRoute(nextRoute)}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap hover:bg-[#DC4C06]"
              >
                挑战下一线 · {nextRoute.tierLabel}（{nextRoute.grade}）
              </button>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setHideForView(true);
                  if (!isPlayingTrail) onToggleTrailPlayback();
                }}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                轨迹回放
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                重攀
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="min-h-[42px] border-2 border-[#141820] bg-[#EAE6DC] px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-200"
              >
                选线
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'FALLEN') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/70 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md border-2 border-[#141820] bg-[#F4F1EA] p-5 text-[#141820] shadow-[6px_6px_0px_#141820] sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
            <span>坠落重伤</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.tierLabel}（{route.grade}）最高 {stats.maxAltitudeM.toFixed(1)}m
            </span>
          </div>
          <h2 className="font-display mt-1 text-3xl font-bold tracking-tight">失足脱手</h2>
          {fallDiagnosis && (
            <div className="mt-2.5 border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-900">
              复盘原因：{fallDiagnosis}
            </div>
          )}
          <p className="mt-2 text-xs leading-relaxed text-slate-700 sm:text-sm">
            在艰难路段前打入岩钉挂绳，配合「左倾/右倾」顺应岩点发力方向，可大幅减轻臂力负担。
          </p>

          <div className="mt-5 space-y-2">
            {hasCheckpoint && (
              <button
                type="button"
                onClick={onRespawnCheckpoint}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap hover:bg-[#DC4C06]"
              >
                从最近休息台恢复
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-4 py-2 text-xs font-bold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                从起点重攀
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="min-h-[42px] border-2 border-[#141820] bg-[#EAE6DC] px-4 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-200"
              >
                返回选线
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
