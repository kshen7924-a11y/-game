import { useMemo, useState } from 'react';
import { Calendar, Check, ChevronRight, Compass, Lock, Medal, Shirt } from 'lucide-react';
import {
  BADGES,
  CLIMBER_SKINS,
  LOADOUT_OPTIONS,
  ROUTES,
} from '../game/mountain';
import {
  ClimberSkinId,
  ClimbStyle,
  LoadoutId,
  RouteConfig,
  RouteId,
} from '../game/types';
import { ClimbBadge } from './ClimbBadge';
import { OutfitPreview, PackPreview } from './PackPreview';
import { getRouteArt } from './routeArt';
import './expedition.css';

interface TitleOverlayProps {
  selectedRouteId: RouteId;
  completedRoutes: Set<RouteId>;
  bestStyles: Record<string, ClimbStyle>;
  freeSoloRoutes?: Set<RouteId>;
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

export function TitleOverlay({
  selectedRouteId,
  completedRoutes,
  bestStyles,
  freeSoloRoutes = new Set(),
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

  const isFreeSolo = !!activeLoadout.noProtection;
  const effectivePitons = isFreeSolo ? 0 : Math.max(1, activeRoute.pitons + activeLoadout.pitonDelta);
  const effectiveChalk = isFreeSolo ? 0 : Math.max(1, activeRoute.chalkUses + activeLoadout.chalkDelta);

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
    <div className="expedition-menu">
      <header className="expedition-cover">
        <img
          src={getRouteArt(activeRoute.summitImage)}
          className="expedition-cover-art"
          alt=""
          fetchPriority="high"
        />
        <span className="expedition-cover-progress">完攀 {completedRoutes.size}/{ROUTES.length}</span>
        <div className="expedition-cover-title">
          <h1>孤山独影</h1>
          <span className="font-mono-tabular">{activeRoute.heightM}<small> m</small></span>
        </div>
      </header>
      <div className="expedition-book">
        <nav aria-label="主菜单导航" className="expedition-tabs">
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
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="expedition-pages">
          {activeTab === 'routes' && (
            <div className="space-y-4">
              {/* Compact Daily Challenge Strip + Tier Filter */}
              <div className="expedition-route-tools">
                <div className="expedition-filters">
                  {TIER_FILTERS.map((f) => {
                    const active = tierFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTierFilter(f.id)}
                        aria-pressed={active}
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
                  className="expedition-daily flex min-h-[40px] items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors"
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

              <div className="expedition-route-workspace">
                <div className="expedition-dossier">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#EA580C] font-mono-tabular">
                        <span>第 {activeRoute.tier} 阶</span>
                        <span aria-hidden="true">·</span>
                        <span>难度 {activeRoute.grade}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeRoute.heightM}m</span>
                        {freeSoloRoutes.has(activeRoute.id) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-[#B45309]">已获徒手 SSS</span>
                          </>
                        )}
                        {activeRoute.tier >= 5 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-sky-700">含路书读线</span>
                          </>
                        )}
                      </div>
                      <h2 className="font-display mt-0.5 text-2xl font-bold text-[#141820]">
                        {activeRoute.tierLabel} · {activeRoute.name}
                      </h2>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
                      {activeRoute.description}
                    </p>

                    {activeRoute.tier >= 5 && (
                      <div className="border border-sky-300 bg-sky-50/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-sky-900">
                        <span className="font-bold">中级以上路书系统：</span>
                        开攀前自动进入读线观察，支持提前标记路线序列、可行性校验与参考路书生成。
                      </div>
                    )}

                    {isFreeSolo && (
                      <div className="border border-red-300 bg-[#FEF2F2] px-2.5 py-2 text-[11px] leading-relaxed text-red-900">
                        <span className="font-bold text-[#B91C1C]">徒手攀登已启用：</span>
                        体力消耗 -50%，全程无岩钉、无防滑粉与休息台存档（失败只能从头重攀），登顶直评{' '}
                        <span className="font-bold text-[#B45309]">SSS</span> 致敬亚历克斯。
                      </div>
                    )}

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-3 text-xs">
                      <div>
                        <dt className="text-[11px] text-slate-500">携带装备</dt>
                        <dd className="mt-0.5 font-semibold text-[#141820] font-mono-tabular">
                          {isFreeSolo
                            ? '无岩钉防粉（徒手无保护）'
                            : `岩钉 ×${effectivePitons} · 防粉 ×${effectiveChalk}`}
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

                <div className="expedition-route-list">
                  {filteredRoutes.map((route) => {
                    const isSelected = route.id === selectedRouteId;
                    const isDone = completedRoutes.has(route.id);
                    const isSoloCleared = freeSoloRoutes.has(route.id);
                    const style = bestStyles[route.id];
                    const styleMark = isSoloCleared
                      ? 'SSS'
                      : style === 'onsight'
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
                        aria-pressed={isSelected}
                        className="expedition-route-card"
                      >
                        <span className="expedition-route-grade font-mono-tabular">{route.grade}</span>
                        <span className="expedition-route-name">
                          <strong>{route.name}</strong>
                          <small>{route.tierLabel}</small>
                        </span>
                        <span className="expedition-route-height font-mono-tabular">
                          {styleMark ? <b>{styleMark} </b> : null}{route.heightM}m
                        </span>
                      </button>
                    );
                  })}
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    if (opt.noProtection) {
                      gearParts.push('无岩钉防粉 · 失败从头开始');
                    } else {
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
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectLoadout(opt.id)}
                        aria-pressed={active}
                        className={`expedition-gear-card flex flex-col justify-between border p-3.5 text-left transition-all ${
                          active
                            ? opt.noProtection
                              ? 'border-[#141820] bg-[#FFF7ED] shadow-[4px_4px_0px_#141820]'
                              : 'border-[#141820] bg-white shadow-[4px_4px_0px_#141820]'
                            : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!opt.noProtection && <PackPreview loadout={opt.id} trim={activeSkin.accent} />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={opt.noProtection ? 'text-sm font-bold text-[#B91C1C]' : 'text-sm font-bold text-[#141820]'}>
                                {opt.label}
                              </span>
                              {active && <Check className="h-4 w-4 shrink-0 text-[#EA580C]" />}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{opt.subtitle}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2 text-[11px] font-semibold font-mono-tabular text-slate-700">
                          <span className={drainPct < 0 ? 'text-emerald-700' : drainPct > 0 ? 'text-orange-700' : ''}>
                            {drainText}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={opt.noProtection ? 'text-red-700' : ''}>
                            {gearParts.join(' / ')}
                          </span>
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
                        aria-pressed={active}
                        className={`expedition-gear-card flex flex-col items-center justify-between border p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-[#141820] bg-white shadow-[4px_4px_0px_#141820]'
                            : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <OutfitPreview skin={skin} loadout={selectedLoadout} />

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
                <div className="flex flex-wrap items-center gap-2 text-slate-600 font-mono-tabular">
                  <span>
                    已点亮 {completedRoutes.size}/{BADGES.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-semibold">盲攀 ★ {onsightCount}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#EA580C] font-semibold">红点 ◆ {redpointCount}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#B45309] font-bold">徒手 SSS {freeSoloRoutes.size}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {BADGES.map((badge) => (
                  <ClimbBadge
                    key={badge.id}
                    badge={badge}
                    unlocked={completedRoutes.has(badge.id)}
                    bestStyle={bestStyles[badge.id]}
                    isFreeSoloCleared={freeSoloRoutes.has(badge.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clean Persistent Action Footer */}
        <footer className="expedition-footer">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#141820] sm:text-sm">
              {activeRoute.tierLabel}（{activeRoute.grade}）· {activeRoute.name}
            </div>
            <div className="truncate text-[11px] text-slate-600 font-mono-tabular">
              {isFreeSolo
                ? `${activeRoute.heightM}m · ${activeLoadout.label} · 无保护 · 失败重头`
                : `${activeRoute.heightM}m · ${activeLoadout.label} · 岩钉 ×${effectivePitons} · 防粉 ×${effectiveChalk}`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStart(activeRoute)}
            className={`expedition-start min-h-[46px] shrink-0 px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              isFreeSolo
                ? 'bg-[#852f28] hover:bg-[#6c231e]'
                : 'bg-[#984228] hover:bg-[#78311f]'
            }`}
          >
            {isFreeSolo ? '开始徒手攀登' : '开始攀登'}
          </button>
        </footer>
      </div>
    </div>
  );
}
