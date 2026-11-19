import { useMemo, useState } from 'react';
import { Calendar, Check, ChevronRight, Compass, Lock, Medal, Shirt } from 'lucide-react';
import {
  BADGES,
  CLIMBER_SKINS,
  LOADOUT_OPTIONS,
  ROUTES,
} from '../game/mountain';
import {
  ClimberSkinConfig,
  ClimberSkinId,
  ClimbStyle,
  LoadoutId,
  RouteConfig,
  RouteId,
} from '../game/types';
import { ClimbBadge } from './ClimbBadge';

interface TitleOverlayProps {
  selectedRouteId: RouteId;
  completedRoutes: Set<RouteId>;
  bestStyles: Record<string, ClimbStyle>;
  dailyRoute: RouteConfig;
  dailyCompleted: boolean;
  selectedLoadout: LoadoutId;
  selectedSkin: ClimberSkinId;
  onSelectRoute: (id: RouteId) => void;
  onSelectLoadout: (id: LoadoutId) => void;
  onSelectSkin: (id: ClimberSkinId) => void;
  onStart: (route: RouteConfig) => void;
}

type HubTab = 'routes' | 'gear' | 'badges';
type TierFilter = 'all' | 'entry' | 'mid' | 'master';

const TIER_FILTERS: { id: TierFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'entry', label: '启蒙·初级' },
  { id: 'mid', label: '中级·高级' },
  { id: 'master', label: '大师绝巅' },
];

function matchesTierFilter(route: RouteConfig, filter: TierFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'entry') return route.tier <= 4;
  if (filter === 'mid') return route.tier >= 5 && route.tier <= 8;
  return route.tier >= 9;
}

function SkinMiniPreview({ skin }: { skin: ClimberSkinConfig }) {
  return (
    <svg viewBox="0 0 48 52" className="h-12 w-11 shrink-0" aria-hidden="true">
      {/* Head & Beanie */}
      <circle cx="24" cy="14" r="6.5" fill="#332924" stroke="#141820" strokeWidth="1.8" />
      <path d="M17.5 13 A6.5 6.5 0 0 1 30.5 13 Z" fill={skin.beanie} stroke="#141820" strokeWidth="1.8" />
      {/* Scarf */}
      <path d="M21 20 Q13 22 10 27" fill="none" stroke="#141820" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M21 20 Q13 22 10 27" fill="none" stroke={skin.scarf} strokeWidth="2.4" strokeLinecap="round" />
      {/* Jacket Torso */}
      <rect x="14" y="21" width="20" height="23" rx="5" fill={skin.jacket} stroke="#141820" strokeWidth="1.8" />
      <path d="M24 22 H30 Q33 22 33 25 V40 Q33 43 30 43 H24 Z" fill={skin.jacketShadow} />
      {/* Pack Accent */}
      <rect x="16" y="24" width="16" height="5" rx="2" fill={skin.accent} stroke="#141820" strokeWidth="1.5" />
      {/* Harness Belt */}
      <rect x="14" y="38" width="20" height="5" rx="1.5" fill="#1F2937" stroke="#141820" strokeWidth="1.5" />
    </svg>
  );
}

export function TitleOverlay({
  selectedRouteId,
  completedRoutes,
  bestStyles,
  dailyRoute,
  dailyCompleted,
  selectedLoadout,
  selectedSkin,
  onSelectRoute,
  onSelectLoadout,
  onSelectSkin,
  onStart,
}: TitleOverlayProps) {
  const [activeTab, setActiveTab] = useState<HubTab>('routes');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const activeRoute = ROUTES.find((r) => r.id === selectedRouteId) ?? ROUTES[0];
  const activeLoadout =
    LOADOUT_OPTIONS.find((l) => l.id === selectedLoadout) ?? LOADOUT_OPTIONS[1];
  const activeSkin =
    CLIMBER_SKINS.find((s) => s.id === selectedSkin) ?? CLIMBER_SKINS[0];

  const effectivePitons = Math.max(1, activeRoute.pitons + activeLoadout.pitonDelta);
  const effectiveChalk = Math.max(1, activeRoute.chalkUses + activeLoadout.chalkDelta);

  const filteredRoutes = useMemo(
    () => ROUTES.filter((r) => matchesTierFilter(r, tierFilter)),
    [tierFilter]
  );

  const onsightCount = useMemo(
    () => Object.values(bestStyles).filter((s) => s === 'onsight').length,
    [bestStyles]
  );
  const redpointCount = useMemo(
    () => Object.values(bestStyles).filter((s) => s === 'redpoint').length,
    [bestStyles]
  );

  const weatherSummary = useMemo(() => {
    const labels = Array.from(new Set(activeRoute.weatherStages.map((s) => s.label)));
    return labels.join(' → ');
  }, [activeRoute]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/68 p-3 backdrop-blur-[2px] sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden border-2 border-[#141820] bg-[#F4F1EA] text-[#141820] shadow-[6px_6px_0px_#141820]">
        {/* Top Expedition Header + Clean 3-Tab Switcher */}
        <header className="flex flex-col gap-3 border-b-2 border-[#141820] bg-[#EFECE3] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-baseline justify-between gap-3 sm:justify-start">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#141820] sm:text-3xl">
              孤山独影
            </h1>
            <span className="text-xs font-medium text-slate-600 font-mono-tabular">
              完攀 {completedRoutes.size}/{ROUTES.length}
            </span>
          </div>

          <nav
            aria-label="主菜单导航"
            className="grid grid-cols-3 gap-1 border border-[#141820]/25 bg-[#E4DFD3] p-1"
          >
            {(
              [
                { id: 'routes', label: '线路选择', icon: Compass },
                { id: 'gear', label: '装备配装', icon: Shirt },
                { id: 'badges', label: '成就徽章', icon: Medal },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-[38px] items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#141820] text-[#F4F1EA]'
                      : 'text-slate-700 hover:bg-white/60 hover:text-[#141820]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Tab Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'routes' && (
            <div className="space-y-4">
              {/* Compact Daily Challenge Strip + Tier Filter */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 bg-[#E7E2D6] p-1">
                  {TIER_FILTERS.map((f) => {
                    const active = tierFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTierFilter(f.id)}
                        className={`min-h-[34px] px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'bg-white text-[#141820] font-bold shadow-xs'
                            : 'text-slate-600 hover:text-[#141820]'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onStart(dailyRoute)}
                  className="flex min-h-[40px] items-center justify-between gap-2 border border-[#141820] bg-[#FEF3C7] px-3 py-1.5 text-left transition-colors hover:bg-[#FDE68A]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#B45309]" />
                    <span className="truncate text-xs font-bold text-[#141820]">
                      今日神山 · {dailyRoute.grade} · {dailyRoute.heightM}m
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold whitespace-nowrap ${
                      dailyCompleted ? 'text-emerald-700' : 'text-[#EA580C]'
                    }`}
                  >
                    {dailyCompleted ? '已完攀 ✓' : '挑战 →'}
                  </span>
                </button>
              </div>

              {/* 2-Column Master-Detail Layout */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.8fr]">
                {/* Left: Scannable Route List */}
                <div className="grid grid-cols-2 gap-2 self-start">
                  {filteredRoutes.map((route) => {
                    const isSelected = route.id === selectedRouteId;
                    const isDone = completedRoutes.has(route.id);
                    const style = bestStyles[route.id];
                    const styleMark =
                      style === 'onsight'
                        ? '★'
                        : style === 'redpoint'
                          ? '◆'
                          : isDone
                            ? '✓'
                            : '';

                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => onSelectRoute(route.id)}
                        className={`flex min-h-[68px] flex-col justify-between border-2 p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-[#141820] bg-white shadow-[3px_3px_0px_#141820]'
                            : 'border-slate-300/90 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono-tabular">
                          <span className="font-bold text-[#EA580C]">
                            {String(route.tier).padStart(2, '0')} · {route.grade}
                          </span>
                          <span
                            className={`font-semibold ${
                              style === 'onsight'
                                ? 'text-amber-600'
                                : style === 'redpoint'
                                  ? 'text-[#EA580C]'
                                  : isDone
                                    ? 'text-emerald-700'
                                    : 'text-slate-500'
                            }`}
                          >
                            {styleMark ? `${styleMark} ` : ''}
                            {route.heightM}m
                          </span>
                        </div>
                        <div className="mt-1">
                          <div className="truncate text-sm font-bold text-[#141820]">
                            {route.tierLabel}
                          </div>
                          <div className="truncate text-[11px] text-slate-600">
                            {route.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Active Route Dossier */}
                <div className="flex flex-col justify-between border-2 border-[#141820] bg-white p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#EA580C] font-mono-tabular">
                        <span>第 {activeRoute.tier} 阶</span>
                        <span aria-hidden="true">·</span>
                        <span>难度 {activeRoute.grade}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeRoute.heightM}m</span>
                      </div>
                      <h2 className="font-display mt-0.5 text-2xl font-bold text-[#141820]">
                        {activeRoute.tierLabel} · {activeRoute.name}
                      </h2>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
                      {activeRoute.description}
                    </p>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-3 text-xs">
                      <div>
                        <dt className="text-[11px] text-slate-500">携带装备</dt>
                        <dd className="mt-0.5 font-semibold text-[#141820] font-mono-tabular">
                          岩钉 ×{effectivePitons} · 防粉 ×{effectiveChalk}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">气象阶段</dt>
                        <dd className="mt-0.5 truncate font-semibold text-[#141820]">
                          {weatherSummary}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                    <div className="min-w-0 truncate text-slate-600">
                      <span>配装：</span>
                      <span className="font-semibold text-[#141820]">
                        {activeLoadout.label} · {activeSkin.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gear')}
                      className="flex shrink-0 items-center gap-0.5 font-semibold text-[#EA580C] hover:underline whitespace-nowrap"
                    >
                      <span>调整</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gear' && (
            <div className="space-y-6">
              {/* Section 1: Loadout Trade-Offs */}
              <section>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h2 className="text-sm font-bold text-[#141820]">出征负重配装</h2>
                  <span className="text-xs text-slate-500">
                    在体力续航与保护器材数量之间权衡
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {LOADOUT_OPTIONS.map((opt) => {
                    const active = opt.id === selectedLoadout;
                    const drainPct = Math.round((opt.drainMult - 1) * 100);
                    const drainText =
                      drainPct === 0
                        ? '标准耗体'
                        : drainPct < 0
                          ? `体力消耗 ${drainPct}%`
                          : `体力消耗 +${drainPct}%`;

                    const gearParts: string[] = [];
                    if (opt.pitonDelta !== 0) {
                      gearParts.push(
                        `岩钉 ${opt.pitonDelta > 0 ? `+${opt.pitonDelta}` : opt.pitonDelta}`
                      );
                    }
                    if (opt.chalkDelta !== 0) {
                      gearParts.push(
                        `防粉 ${opt.chalkDelta > 0 ? `+${opt.chalkDelta}` : opt.chalkDelta}`
                      );
                    }
                    if (gearParts.length === 0) gearParts.push('默认补给');

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectLoadout(opt.id)}
                        className={`flex flex-col justify-between border-2 p-3.5 text-left transition-all ${
                          active
                            ? 'border-[#141820] bg-white shadow-[4px_4px_0px_#141820]'
                            : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#141820]">
                              {opt.label}
                            </span>
                            {active && <Check className="h-4 w-4 text-[#EA580C]" />}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {opt.subtitle}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200 pt-2 text-[11px] font-semibold font-mono-tabular text-slate-700">
                          <span className={drainPct < 0 ? 'text-emerald-700' : drainPct > 0 ? 'text-orange-700' : ''}>
                            {drainText}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{gearParts.join(' / ')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section 2: Climber Outfit Skins */}
              <section className="border-t border-slate-300 pt-5">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h2 className="text-sm font-bold text-[#141820]">登山服配色</h2>
                  <span className="text-xs text-slate-500 font-mono-tabular">
                    已解锁 {CLIMBER_SKINS.filter((s) => completedRoutes.size >= s.unlockCount).length} / {CLIMBER_SKINS.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CLIMBER_SKINS.map((skin) => {
                    const unlocked = completedRoutes.size >= skin.unlockCount;
                    const active = skin.id === selectedSkin;

                    return (
                      <button
                        key={skin.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => onSelectSkin(skin.id)}
                        className={`flex flex-col items-center justify-between border-2 p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-[#141820] bg-white shadow-[4px_4px_0px_#141820]'
                            : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <SkinMiniPreview skin={skin} />

                        <div className="mt-2 w-full">
                          <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#141820]">
                            <span>{skin.name}</span>
                            {active && <Check className="h-3.5 w-3.5 text-[#EA580C]" />}
                            {!unlocked && <Lock className="h-3 w-3 text-slate-500" />}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600 font-mono-tabular">
                            {unlocked
                              ? active
                                ? '当前穿戴'
                                : '点击切换'
                              : `需完攀 ${skin.unlockCount} 关`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-3 text-xs">
                <div className="font-bold text-[#141820]">
                  山岳纪念徽章墙
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-mono-tabular">
                  <span>
                    已点亮 {completedRoutes.size}/{BADGES.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-semibold">盲攀 ★ {onsightCount}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#EA580C] font-semibold">红点 ◆ {redpointCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {BADGES.map((badge) => (
                  <ClimbBadge
                    key={badge.id}
                    badge={badge}
                    unlocked={completedRoutes.has(badge.id)}
                    bestStyle={bestStyles[badge.id]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clean Persistent Action Footer */}
        <footer className="flex items-center justify-between gap-3 border-t-2 border-[#141820] bg-[#EFECE3] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#141820] sm:text-sm">
              {activeRoute.tierLabel}（{activeRoute.grade}）· {activeRoute.name}
            </div>
            <div className="truncate text-[11px] text-slate-600 font-mono-tabular">
              {activeRoute.heightM}m · {activeLoadout.label} · 岩钉 ×{effectivePitons} · 防粉 ×{effectiveChalk}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStart(activeRoute)}
            className="min-h-[46px] shrink-0 border-2 border-[#141820] bg-[#EA580C] px-6 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap transition-transform hover:bg-[#DC4C06] active:translate-x-0.5 active:translate-y-0.5"
          >
            开始攀登
          </button>
        </footer>
      </div>
    </div>
  );
}
