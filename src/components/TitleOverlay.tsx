import { useEffect, useMemo, useState } from 'react';
import { Backpack, Calendar, Check, ChevronRight, Compass, Medal, Shuffle, User } from 'lucide-react';
import {
  BADGES,
  CLIMBER_SKINS,
  LOADOUT_OPTIONS,
  ROUTES,
} from '../game/mountain';
import {
  ClimberGender,
  ClimberSkinConfig,
  ClimberSkinId,
  ClimbStyle,
  LoadoutId,
  RouteConfig,
  RouteId,
} from '../game/types';
import { AssetRegistry } from '../visual/AssetRegistry';
import { ClimbBadge } from './ClimbBadge';

interface TitleOverlayProps {
  selectedRouteId: RouteId;
  completedRoutes: Set<RouteId>;
  bestStyles: Record<string, ClimbStyle>;
  freeSoloRoutes?: Set<RouteId>;
  dailyRoute: RouteConfig;
  dailyCompleted: boolean;
  selectedLoadout: LoadoutId;
  selectedSkin: ClimberSkinId;
  climberName: string;
  climberGender: ClimberGender;
  onSelectRoute: (id: RouteId) => void;
  onSelectLoadout: (id: LoadoutId) => void;
  onSelectSkin: (id: ClimberSkinId) => void;
  onChangeClimberName: (name: string) => void;
  onSelectGender: (gender: ClimberGender) => void;
  onStart: (route: RouteConfig) => void;
}

type HubTab = 'routes' | 'gear' | 'character' | 'badges';
type TierFilter = 'all' | 'entry' | 'mid' | 'master';

const TIER_FILTERS: { id: TierFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'entry', label: '启蒙·初级' },
  { id: 'mid', label: '中级·高级' },
  { id: 'master', label: '大师绝巅' },
];

const RANDOM_NAMES: Record<ClimberGender, string[]> = {
  male: ['林风', '陆沉', '顾川', '程远', '纪珩', '孤影'],
  female: ['青岚', '苏晚', '沈霜', '许晴', '闻溪', '孤影'],
};

function matchesTierFilter(route: RouteConfig, filter: TierFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'entry') return route.tier <= 4;
  if (filter === 'mid') return route.tier >= 5 && route.tier <= 8;
  return route.tier >= 9;
}

function SkinHeadgearSvg({ skin }: { skin: ClimberSkinConfig }) {
  const headgear = skin.headgear ?? 'beanie';
  if (headgear === 'helmet') {
    return (
      <>
        <path d="M17 13 A7 7 0 0 1 31 13 Q24 15 17 13 Z" fill={skin.beanie} stroke="#141820" strokeWidth="1.6" />
        <line x1="17.5" y1="12.2" x2="30.5" y2="12.2" stroke="#1E293B" strokeWidth="1.8" />
        <rect x="22" y="10.8" width="4" height="2.4" rx="0.8" fill="#FEF08A" stroke="#141820" strokeWidth="0.9" />
      </>
    );
  }
  return (
    <>
      <path d="M17.4 12.5 A6.6 6.6 0 0 1 30.6 12.5 Z" fill={skin.beanie} stroke="#141820" strokeWidth="1.6" />
      <rect x="17.2" y="10.6" width="13.6" height="2.7" rx="1.2" fill={skin.beanie} stroke="#141820" strokeWidth="1.2" />
      <rect x="19" y="10" width="4.2" height="2.5" rx="1" fill="#38BDF8" stroke="#141820" strokeWidth="1" />
      <rect x="24.8" y="10" width="4.2" height="2.5" rx="1" fill="#38BDF8" stroke="#141820" strokeWidth="1" />
    </>
  );
}

function FemalePonytailSvg({ accent }: { accent: string }) {
  return (
    <g>
      {/* Braided alpine ponytail extending from lower-right nape */}
      <path
        d="M29.2 15.8 Q34.2 17.5 34.8 24.2"
        fill="none"
        stroke="#141820"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <path
        d="M29.2 15.8 Q34.2 17.5 34.8 24.2"
        fill="none"
        stroke="#2A221E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="30.1" cy="16.2" r="1.5" fill={accent} stroke="#141820" strokeWidth="0.9" />
    </g>
  );
}

function SkinPackDetailSvg({ skin }: { skin: ClimberSkinConfig }) {
  const packStyle = skin.packStyle ?? 'alpine';
  const packW = 15;
  const packX = 24 - packW / 2;

  return (
    <>
      <rect x={packX} y="24.5" width={packW} height="14" rx="3.5" fill="#475569" stroke="#141820" strokeWidth="1.4" />
      {packStyle === 'ice-axe' && (
        <path d="M19 37 L29 26 M26 25.5 Q30 25.5 32 28" fill="none" stroke="#E2E8F0" strokeWidth="1.6" strokeLinecap="round" />
      )}
      <rect x={packX - 0.5} y="22.5" width={packW + 1} height="4.6" rx="2" fill={skin.accent} stroke="#141820" strokeWidth="1.4" />
    </>
  );
}

function SkinMiniPreview({
  skin,
  gender,
}: {
  skin: ClimberSkinConfig;
  gender: ClimberGender;
}) {
  const isFemale = gender === 'female';
  return (
    <svg viewBox="0 0 48 52" className="h-12 w-11 shrink-0" aria-hidden="true">
      {/* Neck */}
      <rect x="21.5" y="18.5" width="5" height="4" rx="1.2" fill="#DDA98B" stroke="#141820" strokeWidth="1.2" />
      {/* Female ponytail behind/side of head */}
      {isFemale && <FemalePonytailSvg accent={skin.accent} />}
      {/* Head & Headgear */}
      <circle cx="24" cy="13.5" r={isFemale ? 6.2 : 6.5} fill="#2A221E" stroke="#141820" strokeWidth="1.7" />
      <SkinHeadgearSvg skin={skin} />
      {/* Layered Flowing Scarf */}
      <path d="M21 20 Q13 22 9.5 27.5" fill="none" stroke="#141820" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M21 20 Q13 22 9.5 27.5" fill="none" stroke={skin.scarf} strokeWidth="2.4" strokeLinecap="round" />
      {/* Jacket Torso + Tapered Cut for Female */}
      {isFemale ? (
        <path
          d="M15.5 23.5 Q15.5 21 18.5 21 H29.5 Q32.5 21 32.5 23.5 L31.2 38.5 Q31 43.5 28 43.5 H20 Q17 43.5 16.8 38.5 Z"
          fill={skin.jacket}
          stroke="#141820"
          strokeWidth="1.8"
        />
      ) : (
        <rect x="14" y="21" width="20" height="23" rx="5" fill={skin.jacket} stroke="#141820" strokeWidth="1.8" />
      )}
      <path d="M16 22.5 Q24 20.5 32 22.5 V27 Q24 25.5 16 27 Z" fill={skin.jacketShadow} />
      <path
        d={isFemale ? 'M24 22 H29 Q31.5 22 31.3 25 L30.4 40 Q30.2 42.5 28 42.5 H24 Z' : 'M24 22 H30 Q33 22 33 25 V40 Q33 43 30 43 H24 Z'}
        fill={skin.jacketShadow}
        opacity="0.72"
      />
      {/* Backpack */}
      <SkinPackDetailSvg skin={skin} />
      {/* Harness Belt + Buckle */}
      <rect
        x={isFemale ? 15.6 : 14}
        y="38.5"
        width={isFemale ? 16.8 : 20}
        height="5"
        rx="1.5"
        fill="#1E293B"
        stroke="#141820"
        strokeWidth="1.5"
      />
      <rect x={isFemale ? 16.5 : 15} y="40.3" width={isFemale ? 15 : 18} height="1.5" fill={skin.accent} />
      <rect x="22.2" y="39.5" width="3.6" height="3" rx="0.8" fill="#CBD5E1" stroke="#141820" strokeWidth="0.9" />
    </svg>
  );
}

function CharacterBackStandingSvg({
  skin,
  gender,
}: {
  skin: ClimberSkinConfig;
  gender: ClimberGender;
}) {
  const pants = skin.pants ?? '#334155';
  const shoe = skin.shoe ?? '#F59E0B';
  const isFemale = gender === 'female';
  const armOuterW = isFemale ? 6.8 : 7.6;
  const armInnerW = isFemale ? 4.2 : 4.9;
  const legOuterW = isFemale ? 8.2 : 9.0;
  const legInnerW = isFemale ? 5.2 : 5.9;

  return (
    <svg viewBox="0 0 84 116" className="h-48 w-36 shrink-0" aria-hidden="true">
      {/* Subtle rock ledge ground plane & standing shadow */}
      <path
        d="M12 103 L26 98 L58 98 L72 104 L68 110 L16 110 Z"
        fill="#CBD5E1"
        opacity="0.55"
        stroke="#141820"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <ellipse cx="42" cy="103" rx="20" ry="3.8" fill="#141820" opacity="0.2" />

      {/* Back-view relaxed standing arms (naturally hanging at sides) */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Left arm resting gently down */}
        <path
          d={isFemale ? 'M31.5 39 L26.5 54 L25.5 67' : 'M30 39 L25 54 L24.5 67'}
          fill="none"
          stroke="#141820"
          strokeWidth={armOuterW}
        />
        <path
          d={isFemale ? 'M31.5 39 L26.5 54 L25.5 67' : 'M30 39 L25 54 L24.5 67'}
          fill="none"
          stroke={skin.jacket}
          strokeWidth={armInnerW}
        />
        <circle cx={isFemale ? 25.3 : 24.3} cy="69.5" r="3" fill="#E7BA9E" stroke="#141820" strokeWidth="1.4" />

        {/* Right arm resting gently down with hand near hip/rope */}
        <path
          d={isFemale ? 'M52.5 39 L57.5 54 L58.5 67' : 'M54 39 L59 54 L59.5 67'}
          fill="none"
          stroke="#141820"
          strokeWidth={armOuterW}
        />
        <path
          d={isFemale ? 'M52.5 39 L57.5 54 L58.5 67' : 'M54 39 L59 54 L59.5 67'}
          fill="none"
          stroke={skin.jacketShadow}
          strokeWidth={armInnerW}
        />
        <circle cx={isFemale ? 58.7 : 59.7} cy="69.5" r="3" fill="#E7BA9E" stroke="#141820" strokeWidth="1.4" />
      </g>

      {/* Standing legs (rear view, planted firmly on ledge) */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Left leg */}
        <path d="M36.5 64 L34.8 81 L35.2 98" fill="none" stroke="#141820" strokeWidth={legOuterW} />
        <path d="M36.5 64 L34.8 81 L35.2 98" fill="none" stroke={pants} strokeWidth={legInnerW} />
        {/* Right leg */}
        <path d="M47.5 64 L49.2 81 L48.8 98" fill="none" stroke="#141820" strokeWidth={legOuterW} />
        <path d="M47.5 64 L49.2 81 L48.8 98" fill="none" stroke={pants} strokeWidth={legInnerW} />

        {/* Rear-view climbing boots / shoes planted flat */}
        <path d="M30.5 99 Q35 96.5 39.2 99.5 L38.8 103.2 Q34.5 104 30.2 102.6 Z" fill={shoe} stroke="#141820" strokeWidth="1.5" />
        <path d="M44.8 99.5 Q49 96.5 53.5 99 L53.8 102.6 Q49.5 104 45.2 103.2 Z" fill={shoe} stroke="#141820" strokeWidth="1.5" />
        {/* Heel tabs */}
        <line x1="34.8" y1="98.2" x2="34.8" y2="101.2" stroke="#141820" strokeWidth="1.2" />
        <line x1="49.2" y1="98.2" x2="49.2" y2="101.2" stroke="#141820" strokeWidth="1.2" />
      </g>

      {/* Back-view Torso, Head, Backpack, Coiled Rope & Harness */}
      <g transform="translate(18, 15)">
        {/* Neck */}
        <rect x="21.5" y="18.5" width="5" height="4" rx="1.2" fill="#DDA98B" stroke="#141820" strokeWidth="1.2" />
        {/* Rear Head & Headgear */}
        <circle cx="24" cy="13.5" r={isFemale ? 6.2 : 6.5} fill="#2A221E" stroke="#141820" strokeWidth="1.7" />
        <SkinHeadgearSvg skin={skin} />
        {/* Female braided alpine ponytail centered slightly right down the back */}
        {isFemale && (
          <g>
            <path
              d="M24.6 17.4 Q27.8 21.8 26.8 29.2"
              fill="none"
              stroke="#141820"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
            <path
              d="M24.6 17.4 Q27.8 21.8 26.8 29.2"
              fill="none"
              stroke="#2A221E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="24.9" cy="17.8" r="1.5" fill={skin.accent} stroke="#141820" strokeWidth="0.9" />
          </g>
        )}

        {/* Scarf tail draping naturally down left shoulder */}
        <path d="M21 20.5 Q14.5 22.8 11.5 29" fill="none" stroke="#141820" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M21 20.5 Q14.5 22.8 11.5 29" fill="none" stroke={skin.scarf} strokeWidth="2.4" strokeLinecap="round" />

        {/* Jacket Back Cut */}
        {isFemale ? (
          <path
            d="M15.4 23.5 Q15.4 21 18.4 21 H29.6 Q32.6 21 32.6 23.5 L31.2 41 Q31 46 28 46 H20 Q17 46 16.8 41 Z"
            fill={skin.jacket}
            stroke="#141820"
            strokeWidth="1.8"
          />
        ) : (
          <rect x="14" y="21" width="20" height="25" rx="5" fill={skin.jacket} stroke="#141820" strokeWidth="1.8" />
        )}
        <path d="M16 22.5 Q24 20.5 32 22.5 V27 Q24 25.5 16 27 Z" fill={skin.jacketShadow} />
        <path
          d={isFemale ? 'M24 22 H29 Q31.6 22 31.4 25 L30.4 42.5 Q30.2 45 28 45 H24 Z' : 'M24 22 H30 Q33 22 33 25 V42.5 Q33 45.5 30 45.5 H24 Z'}
          fill={skin.jacketShadow}
          opacity="0.72"
        />

        {/* Rear Climbing Rope Coil draped across backpack right side */}
        <path
          d="M31.5 25.5 Q36 31.5 32.5 39"
          fill="none"
          stroke="#141820"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path
          d="M31.5 25.5 Q36 31.5 32.5 39"
          fill="none"
          stroke={skin.rope}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Backpack (central back-view landmark) */}
        <SkinPackDetailSvg skin={skin} />

        {/* Rear Harness Waist Belt + Centered Chalk Bag */}
        <rect
          x={isFemale ? 15.6 : 14}
          y="40.5"
          width={isFemale ? 16.8 : 20}
          height="5"
          rx="1.5"
          fill="#1E293B"
          stroke="#141820"
          strokeWidth="1.5"
        />
        <rect x={isFemale ? 16.5 : 15} y="42.3" width={isFemale ? 15 : 18} height="1.5" fill={skin.accent} />
        <rect x="21.2" y="42.5" width="5.6" height="6.8" rx="2" fill="#E2E8F0" stroke="#141820" strokeWidth="1.3" />
        <rect x="21.7" y="43.5" width="4.6" height="1.8" fill={skin.accent} />
        <ellipse cx="16.8" cy="47.5" rx="1.6" ry="2.4" fill="none" stroke={skin.accent} strokeWidth="1.3" />
      </g>
    </svg>
  );
}

function CharacterShowcaseArtwork({
  skin,
  gender,
  climberName,
}: {
  skin: ClimberSkinConfig;
  gender: ClimberGender;
  climberName: string;
}) {
  const [manifestRev, setManifestRev] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    return AssetRegistry.subscribe((scope) => {
      if (scope === 'all' || scope === 'character') {
        setManifestRev((v) => v + 1);
        setFailedUrl(null);
      }
    });
  }, []);

  const previewUrl = useMemo(() => {
    void manifestRev;
    return AssetRegistry.getCharacterPreviewPath(skin.id, gender);
  }, [skin.id, gender, manifestRev]);

  const showArtworkImage = Boolean(previewUrl && failedUrl !== previewUrl);

  if (showArtworkImage && previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={`${climberName} 背面站立角色效果图`}
        onError={() => setFailedUrl(previewUrl)}
        className="h-48 w-36 object-contain drop-shadow-[0_4px_10px_rgba(20,24,32,0.18)]"
      />
    );
  }

  return <CharacterBackStandingSvg skin={skin} gender={gender} />;
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
  climberName,
  climberGender,
  onSelectRoute,
  onSelectLoadout,
  onSelectSkin,
  onChangeClimberName,
  onSelectGender,
  onStart,
}: TitleOverlayProps) {
  const [activeTab, setActiveTab] = useState<HubTab>('routes');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const activeRoute = ROUTES.find((r) => r.id === selectedRouteId) ?? ROUTES[0];
  const activeLoadout =
    LOADOUT_OPTIONS.find((l) => l.id === selectedLoadout) ?? LOADOUT_OPTIONS[1];
  const activeSkin =
    CLIMBER_SKINS.find((s) => s.id === selectedSkin) ?? CLIMBER_SKINS[0];

  const displayName = climberName.trim() || '孤影';
  const genderLabel = climberGender === 'female' ? '女' : '男';

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

  const handleRandomName = () => {
    const pool = RANDOM_NAMES[climberGender];
    const currentIndex = pool.indexOf(climberName.trim());
    const nextName = pool[(currentIndex + 1) % pool.length];
    onChangeClimberName(nextName);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/68 p-3 backdrop-blur-[2px] sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden border-2 border-[#141820] bg-[#F4F1EA] text-[#141820] shadow-[6px_6px_0px_#141820]">
        {/* Top Expedition Header + 4-Tab Switcher */}
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
            className="grid grid-cols-4 gap-1 border border-[#141820]/25 bg-[#E4DFD3] p-1"
          >
            {(
              [
                { id: 'routes', label: '线路选择', icon: Compass },
                { id: 'gear', label: '装备配装', icon: Backpack },
                { id: 'character', label: '角色设定', icon: User },
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
                  className={`flex min-h-[38px] items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
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
                              isSoloCleared
                                ? 'font-extrabold text-[#B45309]'
                                : style === 'onsight'
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
                        {activeRoute.tier >= 9 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-red-700">含天气偶发事故</span>
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

                    {activeRoute.tier >= 9 && (
                      <div className="border border-red-300 bg-red-50/85 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-900">
                        <span className="font-bold">大师级偶发气象事故：</span>
                        攀登途中将随机遭遇突发强横风、高空落冰与冻雨白毛风，请留意预警及时移位抗风。
                      </div>
                    )}

                    {activeRoute.tier >= 5 && (
                      <div className="border border-sky-300 bg-sky-50/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-sky-900">
                        <span className="font-bold">中级以上路书系统：</span>
                        开攀前自动进入读线观察，支持提前标记路线序列、可行性校验与参考路书生成。
                      </div>
                    )}

                    {isFreeSolo && (
                      <div className="border border-red-300 bg-[#FEF2F2] px-2.5 py-2 text-[11px] leading-relaxed text-red-900">
                        <span className="font-bold text-[#B91C1C]">徒手攀登已启用：</span>
                        体力消耗 -50%，全程无岩钉、无镁粉与休息台存档（失败只能从头重攀），登顶直评{' '}
                        <span className="font-bold text-[#B45309]">SSS</span> 致敬亚历克斯。
                      </div>
                    )}

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-3 text-xs">
                      <div>
                        <dt className="text-[11px] text-slate-500">携带装备</dt>
                        <dd className="mt-0.5 font-semibold text-[#141820] font-mono-tabular">
                          {isFreeSolo
                            ? '无岩钉镁粉（徒手无保护）'
                            : `岩钉 ×${effectivePitons} · 镁粉 ×${effectiveChalk}`}
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

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                    <div className="min-w-0 truncate text-slate-600">
                      <span>攀登者：</span>
                      <span className="font-semibold text-[#141820]">
                        {displayName}（{genderLabel}）· {activeSkin.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('gear')}
                        className="flex items-center gap-0.5 font-semibold text-[#EA580C] hover:underline whitespace-nowrap"
                      >
                        <span>配装</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('character')}
                        className="flex items-center gap-0.5 font-semibold text-[#141820] hover:text-[#EA580C] hover:underline whitespace-nowrap"
                      >
                        <span>角色</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                      gearParts.push('无岩钉镁粉 · 失败从头开始');
                    } else {
                      if (opt.pitonDelta !== 0) {
                        gearParts.push(
                          `岩钉 ${opt.pitonDelta > 0 ? `+${opt.pitonDelta}` : opt.pitonDelta}`
                        );
                      }
                      if (opt.chalkDelta !== 0) {
                        gearParts.push(
                          `镁粉 ${opt.chalkDelta > 0 ? `+${opt.chalkDelta}` : opt.chalkDelta}`
                        );
                      }
                      if (gearParts.length === 0) gearParts.push('默认补给');
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectLoadout(opt.id)}
                        className={`flex flex-col justify-between border-2 p-3.5 text-left transition-all ${
                          active
                            ? opt.noProtection
                              ? 'border-[#141820] bg-[#FFF7ED] shadow-[4px_4px_0px_#141820]'
                              : 'border-[#141820] bg-white shadow-[4px_4px_0px_#141820]'
                            : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/75'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold ${
                                opt.noProtection ? 'text-[#B91C1C]' : 'text-[#141820]'
                              }`}
                            >
                              {opt.label}
                            </span>
                            {active && <Check className="h-4 w-4 text-[#EA580C]" />}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {opt.subtitle}
                          </p>
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

              {/* Compact Character Identity Summary */}
              <section className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#141820]/80 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <SkinMiniPreview skin={activeSkin} gender={climberGender} />
                  <div>
                    <div className="text-xs font-bold text-[#141820]">
                      当前攀登者：{displayName}（{genderLabel}）
                      <span className="ml-2 text-[11px] font-semibold text-[#EA580C]">
                        {activeSkin.name}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      {activeSkin.subtitle}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('character')}
                  className="flex min-h-[36px] shrink-0 items-center gap-1 border border-[#141820] bg-[#EFECE3] px-3 py-1.5 text-xs font-bold text-[#141820] transition-colors hover:bg-[#141820] hover:text-[#F4F1EA]"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>修改角色设定</span>
                </button>
              </section>
            </div>
          )}

          {activeTab === 'character' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
              {/* Left: Live Character Preview & Nameplate */}
              <div className="flex flex-col items-center justify-between border-2 border-[#141820] bg-white p-4 shadow-[4px_4px_0px_#141820]">
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>登山者档案</span>
                  <span className="border border-[#141820]/30 bg-[#F4F1EA] px-1.5 py-0.5 font-bold text-[#141820]">
                    {genderLabel}
                  </span>
                </div>

                <div className="my-2 flex items-center justify-center">
                  <CharacterShowcaseArtwork
                    skin={activeSkin}
                    gender={climberGender}
                    climberName={displayName}
                  />
                </div>

                <div className="w-full border-t border-slate-200 pt-2.5 text-center">
                  <div className="truncate font-display text-lg font-bold text-[#141820]">
                    {displayName}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-600">
                    {activeSkin.name} · {activeSkin.tag}
                  </div>
                </div>
              </div>

              {/* Right: Focused Character Configuration (Name + Gender + 2 Default Outfits) */}
              <div className="space-y-4">
                {/* 1. Name Input */}
                <section className="border-2 border-[#141820] bg-white p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <label htmlFor="climber-name-input" className="text-sm font-bold text-[#141820]">
                      角色名称
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono-tabular">
                      {climberName.length}/12
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="climber-name-input"
                      type="text"
                      maxLength={12}
                      value={climberName}
                      onChange={(e) => onChangeClimberName(e.target.value)}
                      placeholder="输入角色名称（默认：孤影）"
                      className="min-h-[40px] flex-1 border-2 border-[#141820] bg-[#F4F1EA] px-3 py-1.5 text-sm font-semibold text-[#141820] placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleRandomName}
                      className="flex min-h-[40px] shrink-0 items-center gap-1.5 border-2 border-[#141820] bg-[#EFECE3] px-3 py-1.5 text-xs font-bold text-[#141820] transition-colors hover:bg-[#141820] hover:text-[#F4F1EA]"
                      title="随机生成角色名称"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      <span>随机</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    名称将展示于攀登界面顶栏、左下角进度标识及登顶纪念落款。
                  </p>
                </section>

                {/* 2. Gender Selection */}
                <section className="border-2 border-[#141820] bg-white p-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-[#141820]">角色性别</h2>
                    <span className="text-[11px] text-slate-500">不影响攀爬手感与物理参数</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(
                      [
                        { id: 'male', label: '男', desc: '经典登山轮廓' },
                        { id: 'female', label: '女', desc: '收腰剪裁 · 高山编发' },
                      ] as const
                    ).map((opt) => {
                      const active = climberGender === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelectGender(opt.id)}
                          className={`flex items-center justify-between border-2 px-3.5 py-2.5 text-left transition-all ${
                            active
                              ? 'border-[#141820] bg-[#FFF7ED] shadow-[3px_3px_0px_#141820]'
                              : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/80'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold text-[#141820]">{opt.label}</div>
                            <div className="text-[11px] text-slate-600">{opt.desc}</div>
                          </div>
                          {active && <Check className="h-4 w-4 shrink-0 text-[#EA580C]" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 3. Two Default Outfits (No Extra Decoration System) */}
                <section className="border-2 border-[#141820] bg-white p-4">
                  <div className="mb-2.5 flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-bold text-[#141820]">默认穿搭</h2>
                    <span className="text-[11px] text-slate-500">
                      默认两套穿搭 · 无额外装饰系统
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {CLIMBER_SKINS.map((skin) => {
                      const active = skin.id === selectedSkin;
                      return (
                        <button
                          key={skin.id}
                          type="button"
                          onClick={() => onSelectSkin(skin.id)}
                          className={`flex items-center gap-3 border-2 p-3 text-left transition-all ${
                            active
                              ? 'border-[#141820] bg-[#FFF7ED] shadow-[3px_3px_0px_#141820]'
                              : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/80'
                          }`}
                        >
                          <SkinMiniPreview skin={skin} gender={climberGender} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-sm font-bold text-[#141820]">
                                {skin.name}
                              </span>
                              {active && <Check className="h-4 w-4 shrink-0 text-[#EA580C]" />}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[#EA580C]">
                              {skin.tag}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-slate-600">
                              {skin.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-3 text-xs">
                <div className="font-bold text-[#141820]">
                  {displayName} 的山岳纪念徽章墙
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
        <footer className="flex items-center justify-between gap-3 border-t-2 border-[#141820] bg-[#EFECE3] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#141820] sm:text-sm">
              {activeRoute.tierLabel}（{activeRoute.grade}）· {activeRoute.name}
            </div>
            <div className="truncate text-[11px] text-slate-600 font-mono-tabular">
              {isFreeSolo
                ? `${displayName}（${genderLabel}）· ${activeRoute.heightM}m · ${activeLoadout.label} · 无保护`
                : `${displayName}（${genderLabel}）· ${activeRoute.heightM}m · ${activeLoadout.label} · 岩钉 ×${effectivePitons} · 镁粉 ×${effectiveChalk}`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStart(activeRoute)}
            className={`min-h-[46px] shrink-0 border-2 border-[#141820] px-6 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
              isFreeSolo
                ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                : 'bg-[#EA580C] hover:bg-[#DC4C06]'
            }`}
          >
            {isFreeSolo ? '开始徒手攀登' : '开始攀登'}
          </button>
        </footer>
      </div>
    </div>
  );
}
