import { BADGES, ROUTES } from '../game/mountain';
import { RouteConfig, RouteId } from '../game/types';
import { ClimbBadge } from './ClimbBadge';

interface TitleOverlayProps {
  selectedRouteId: RouteId;
  completedRoutes: Set<RouteId>;
  onSelectRoute: (id: RouteId) => void;
  onStart: (route: RouteConfig) => void;
}

export function TitleOverlay({
  selectedRouteId,
  completedRoutes,
  onSelectRoute,
  onStart,
}: TitleOverlayProps) {
  const activeRoute = ROUTES.find((r) => r.id === selectedRouteId) ?? ROUTES[0];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/62 p-2.5 sm:p-6 backdrop-blur-[2px]">
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden border-2 border-[#141820] bg-[#F4F1EA] p-4 text-[#141820] shadow-[8px_8px_0px_#141820] sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span>2.5D 触控攀岩</span>
            <span aria-hidden="true">·</span>
            <span>11 级技术线路</span>
          </div>
          <span className="text-xs font-medium text-slate-500">支持读线俯瞰 / 滑屏窥探</span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#141820] sm:text-4xl">
            孤山独影
          </h1>
          <span className="text-xs font-semibold text-slate-600 font-mono-tabular">
            已通 {completedRoutes.size} / {ROUTES.length} 关
          </span>
        </div>

        {/* Scrollable 11-Tier Route Selection Grid */}
        <div className="mt-3 max-h-[36dvh] overflow-y-auto pr-1 sm:max-h-[38dvh]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROUTES.map((route) => {
              const isSelected = route.id === selectedRouteId;
              const isDone = completedRoutes.has(route.id);
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onSelectRoute(route.id)}
                  className={`min-h-[68px] border-2 p-2.5 text-left transition-transform ${
                    isSelected
                      ? 'border-[#141820] bg-white shadow-[3px_3px_0px_#141820]'
                      : 'border-slate-300 bg-[#ECE8DF] hover:border-[#141820]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-[#EA580C] font-mono-tabular">
                      {String(route.tier).padStart(2, '0')} · {route.grade}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 font-mono-tabular">
                      {isDone ? '✓ ' : ''}
                      {route.heightM}m
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs font-bold text-[#141820] sm:text-sm">
                    {route.tierLabel}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-600">
                    {route.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Route Brief */}
        <div className="mt-3 border-t border-slate-300 pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="font-bold text-[#141820]">
              {activeRoute.tierLabel}（{activeRoute.grade}）· {activeRoute.name}
            </span>
            <span className="text-[11px] text-slate-600 font-mono-tabular">
              岩钉 ×{activeRoute.pitons} · 防粉 ×{activeRoute.chalkUses}
              {activeRoute.hasTutorial ? ' · 含教学' : ''}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            {activeRoute.description}
          </p>
        </div>

        {/* Summit Badges Horizontal Showcase */}
        <div className="mt-3 border-t border-slate-300 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>攀登成就徽章（左右滑动查看全部）</span>
            <span className="font-mono-tabular">
              {completedRoutes.size} / {BADGES.length} 已点亮
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BADGES.map((badge) => (
              <ClimbBadge
                key={badge.id}
                badge={badge}
                unlocked={completedRoutes.has(badge.id)}
                compact
              />
            ))}
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onStart(activeRoute)}
            className="min-h-[48px] flex-1 border-2 border-[#141820] bg-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_#141820] transition-transform active:translate-x-0.5 active:translate-y-0.5 sm:flex-none"
          >
            攀登 {activeRoute.tierLabel}（{activeRoute.grade}）
          </button>
        </div>
      </div>
    </div>
  );
}
