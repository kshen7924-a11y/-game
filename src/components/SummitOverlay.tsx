import { useState } from 'react';
import { Mountain } from 'lucide-react';
import { BADGES, ROUTES } from '../game/mountain';
import { ClimbStats, GamePhase, RouteConfig } from '../game/types';
import { ClimbBadge } from './ClimbBadge';

interface SummitOverlayProps {
  phase: GamePhase;
  route: RouteConfig;
  stats: ClimbStats;
  summitProgress: number;
  hasCheckpoint: boolean;
  newlyUnlockedBadge: boolean;
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
  summitProgress,
  hasCheckpoint,
  newlyUnlockedBadge,
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

  if (phase === 'SUMMIT') {
    if (summitProgress < 0.7) {
      return (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center px-4">
          <div className="border border-white/20 bg-[#141820]/80 px-4 py-2 text-xs tracking-wide text-slate-200 backdrop-blur-sm">
            已登顶 {route.tierLabel}（{route.grade}）· 正在拉远全景视角...
          </div>
        </div>
      );
    }

    if (hideForView) {
      return (
        <div className="fixed bottom-6 right-5 z-20">
          <button
            type="button"
            onClick={() => setHideForView(false)}
            className="min-h-[44px] border-2 border-[#141820] bg-[#F4F1EA] px-4 py-2.5 text-xs font-bold text-[#141820] shadow-[4px_4px_0px_#141820] whitespace-nowrap shrink-0"
          >
            显示登顶插画与战绩
          </button>
        </div>
      );
    }

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8">
        <div className="pointer-events-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto border-2 border-[#141820] bg-[#F4F1EA]/96 p-4 text-[#141820] shadow-[8px_8px_0px_#141820] sm:p-5">
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

          <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-orange-700">
            <span>完攀登顶 · {route.tierLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.grade} / {route.heightM}m
            </span>
          </div>

          <h2 className="font-display mt-0.5 text-3xl font-bold tracking-tight text-[#141820]">
            {route.name}
          </h2>

          {/* Lit Badge Unlock Card */}
          <div className="mt-3">
            <ClimbBadge badge={badge} unlocked highlightNew={newlyUnlockedBadge} />
          </div>

          {/* Climb Stats */}
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

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {nextRoute && (
              <button
                type="button"
                onClick={() => onNextRoute(nextRoute)}
                className="min-h-[44px] flex-1 border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0 hover:bg-[#DC4C06]"
              >
                挑战 {nextRoute.tierLabel}（{nextRoute.grade}）
              </button>
            )}
            <button
              type="button"
              onClick={() => setHideForView(true)}
              className="min-h-[44px] border-2 border-[#141820] bg-white px-3.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap shrink-0 hover:bg-slate-100"
            >
              看全景轨迹
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] border-2 border-[#141820] bg-white px-3.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap shrink-0 hover:bg-slate-100"
            >
              重攀
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="min-h-[44px] border-2 border-[#141820] bg-[#ECE8DF] px-3.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap shrink-0 hover:bg-slate-200"
            >
              选线
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'FALLEN') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/70 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md border-2 border-[#141820] bg-[#F4F1EA] p-6 text-[#141820] shadow-[8px_8px_0px_#141820]">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
            <span>坠落重伤</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.tierLabel}（{route.grade}）最高 {stats.maxAltitudeM.toFixed(1)}m
            </span>
          </div>
          <h2 className="font-display mt-1 text-3xl font-bold tracking-tight">失足脱手</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 sm:text-sm">
            在艰难路段前先打入岩钉挂绳，或稳住双脚后再向上伸手，能大幅减轻臂力负担。
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {hasCheckpoint && (
              <button
                type="button"
                onClick={onRespawnCheckpoint}
                className="min-h-[44px] border-2 border-[#141820] bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0"
              >
                从最近休息台恢复
              </button>
            )}
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] border-2 border-[#141820] bg-white px-4 py-2.5 text-xs font-bold text-[#141820] whitespace-nowrap shrink-0"
            >
              从起点重攀
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="min-h-[44px] border-2 border-[#141820] bg-[#ECE8DF] px-4 py-2.5 text-xs font-semibold text-[#141820] whitespace-nowrap shrink-0"
            >
              换一条线
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
