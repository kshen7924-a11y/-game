import { useEffect, useMemo, useState } from 'react';
import {
  Backpack,
  Calendar,
  Check,
  ChevronRight,
  Compass,
  Medal,
  Mountain,
  Shuffle,
  User,
  X,
} from 'lucide-react';
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
import { ClimbBadge, RouteMedallionEmblem } from './ClimbBadge';

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

interface ClimberBodyProfile {
  heightCm: number;
  weightKg: number;
  wingspanCm: number;
  apeIndexLabel: string;
  strengthRatio: string;
  styleTag: string;
  contourDesc: string;
}

const CLIMBER_BODY_PROFILES: Record<ClimberGender, ClimberBodyProfile> = {
  male: {
    heightCm: 178,
    weightKg: 66,
    wingspanCm: 184,
    apeIndexLabel: '+6 cm',
    strengthRatio: '1.42×',
    styleTag: '长距锁点 · 全能大岩壁',
    contourDesc: '标准宽肩轮廓',
  },
  female: {
    heightCm: 166,
    weightKg: 53,
    wingspanCm: 171,
    apeIndexLabel: '+5 cm',
    strengthRatio: '1.48×',
    styleTag: '轻盈耐力 · 精细微抠点',
    contourDesc: '收腰剪裁 · 编发',
  },
};

const LOADOUT_GEAR_WEIGHT_KG: Record<LoadoutId, string> = {
  light: '4.2',
  balanced: '6.8',
  heavy: '9.5',
  'free-solo': '0.4',
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
    <svg
      viewBox="0 0 84 116"
      className="h-[248px] w-auto max-w-full shrink-0 sm:h-[336px]"
      aria-hidden="true"
    >
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
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(previewUrl)}
        className="h-[248px] w-auto max-w-full object-contain drop-shadow-[0_6px_14px_rgba(20,24,32,0.2)] sm:h-[336px]"
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
  const [detailRoute, setDetailRoute] = useState<RouteConfig | null>(null);
  const [detailImgFailed, setDetailImgFailed] = useState(false);

  const activeLoadout =
    LOADOUT_OPTIONS.find((l) => l.id === selectedLoadout) ?? LOADOUT_OPTIONS[1];
  const activeSkin =
    CLIMBER_SKINS.find((s) => s.id === selectedSkin) ?? CLIMBER_SKINS[0];

  const displayName = climberName.trim() || '孤影';
  const genderLabel = climberGender === 'female' ? '女' : '男';

  const isFreeSolo = !!activeLoadout.noProtection;

  const badgeById = useMemo(
    () => new Map(BADGES.map((b) => [b.id, b])),
    []
  );

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

  useEffect(() => {
    setDetailImgFailed(false);
  }, [detailRoute?.id, detailRoute?.isDailyChallenge]);

  useEffect(() => {
    if (!detailRoute) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDetailRoute(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailRoute]);

  const handleOpenRouteDetail = (route: RouteConfig) => {
    if (!route.isDailyChallenge) {
      onSelectRoute(route.id);
    }
    setDetailRoute(route);
  };

  const handleRandomName = () => {
    const pool = RANDOM_NAMES[climberGender];
    const currentIndex = pool.indexOf(climberName.trim());
    const nextName = pool[(currentIndex + 1) % pool.length];
    onChangeClimberName(nextName);
  };

  const detailEffectivePitons = detailRoute
    ? isFreeSolo
      ? 0
      : Math.max(1, detailRoute.pitons + activeLoadout.pitonDelta)
    : 0;
  const detailEffectiveChalk = detailRoute
    ? isFreeSolo
      ? 0
      : Math.max(1, detailRoute.chalkUses + activeLoadout.chalkDelta)
    : 0;
  const detailWeatherSummary = detailRoute
    ? Array.from(new Set(detailRoute.weatherStages.map((s) => s.label))).join(' → ')
    : '';
  const detailWideSrc = detailRoute
    ? AssetRegistry.getWideEndingPath(detailRoute.palette, detailRoute.id)
    : '';
  const [uiAssetRev, setUiAssetRev] = useState(0);
  const [titleLogoFailed, setTitleLogoFailed] = useState(false);
  const [stageBgFailed, setStageBgFailed] = useState(false);

  useEffect(() => {
    return AssetRegistry.subscribe((scope) => {
      if (scope === 'all' || scope === 'ui') {
        setUiAssetRev((v) => v + 1);
        setTitleLogoFailed(false);
        setStageBgFailed(false);
      }
    });
  }, []);

  const titleLogoUrl = useMemo(() => {
    void uiAssetRev;
    return AssetRegistry.getUiAssetPath('titleLogo');
  }, [uiAssetRev]);

  const stageBackdropUrl = useMemo(() => {
    void uiAssetRev;
    return AssetRegistry.getUiAssetPath('characterStageBackdrop');
  }, [uiAssetRev]);

  const parchmentTextureUrl = useMemo(() => {
    void uiAssetRev;
    return AssetRegistry.getUiAssetPath('parchmentTexture');
  }, [uiAssetRev]);

  const dailyBannerUrl = useMemo(() => {
    void uiAssetRev;
    return AssetRegistry.getUiAssetPath('dailyBanner');
  }, [uiAssetRev]);

  const dailyEmblemUrl = useMemo(() => {
    void uiAssetRev;
    return AssetRegistry.getUiAssetPath('dailyEmblem');
  }, [uiAssetRev]);

  const bodyProfile = CLIMBER_BODY_PROFILES[climberGender];
  const activeGearWeightKg = LOADOUT_GEAR_WEIGHT_KG[selectedLoadout] ?? '6.8';

  const detailBadge =
    detailRoute && !detailRoute.isDailyChallenge ? badgeById.get(detailRoute.id) ?? null : null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/68 p-2 backdrop-blur-[2px] sm:p-6">
      <div
        className="flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden border-2 border-[#141820] bg-[#F4F1EA] text-[#141820] shadow-[6px_6px_0px_#141820] sm:max-h-[92dvh]"
        style={
          parchmentTextureUrl
            ? { backgroundImage: `url(${parchmentTextureUrl})`, backgroundRepeat: 'repeat' }
            : undefined
        }
      >
        {/* Top Expedition Header + 4-Tab Switcher */}
        <header className="flex flex-col gap-2 border-b-2 border-[#141820] bg-[#EFECE3] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3.5">
          <div className="flex items-baseline justify-between gap-3 sm:justify-start">
            {titleLogoUrl && !titleLogoFailed ? (
              <img
                src={titleLogoUrl}
                alt="孤山独影"
                referrerPolicy="no-referrer"
                onError={() => setTitleLogoFailed(true)}
                className="h-7 w-auto object-contain sm:h-9"
              />
            ) : (
              <h1 className="font-display text-xl font-bold tracking-tight text-[#141820] sm:text-3xl">
                孤山独影
              </h1>
            )}
            <span className="text-[11px] font-medium text-slate-600 font-mono-tabular sm:text-xs">
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
                  className={`flex min-h-[36px] items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors sm:min-h-[38px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                    active
                      ? 'bg-[#141820] text-[#F4F1EA]'
                      : 'text-slate-700 hover:bg-white/60 hover:text-[#141820]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Tab Workspace */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'routes' && (
            <div className="space-y-4">
              {/* Top Filter & Expedition Identity Strip */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 bg-[#E7E2D6] p-1">
                  {TIER_FILTERS.map((f) => {
                    const active = tierFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTierFilter(f.id)}
                        className={`min-h-[34px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                  <span className="truncate">
                    当前出征：
                    <strong className="font-semibold text-[#141820]">
                      {displayName}（{genderLabel}）
                    </strong>
                    <span className="mx-1 text-slate-400">·</span>
                    <span className={isFreeSolo ? 'font-bold text-[#B91C1C]' : 'font-medium text-[#141820]'}>
                      {activeLoadout.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('gear')}
                    className="font-semibold text-[#EA580C] hover:underline whitespace-nowrap"
                  >
                    配装
                  </button>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('character')}
                    className="font-semibold text-[#141820] hover:text-[#EA580C] hover:underline whitespace-nowrap"
                  >
                    角色
                  </button>
                </div>
              </div>

              {/* Daily Challenge Featured Single-Row Card (opens detail modal; no direct start button) */}
              <button
                type="button"
                onClick={() => handleOpenRouteDetail(dailyRoute)}
                className="group relative flex min-h-[68px] w-full items-center justify-between gap-4 overflow-hidden border-2 border-[#141820] bg-[#FEF3C7] px-4 py-3 text-left transition-all hover:bg-[#FDE68A] hover:shadow-[3px_3px_0px_#141820]"
              >
                {dailyBannerUrl && (
                  <img
                    src={dailyBannerUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
                  />
                )}
                <div className="relative z-10 flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-[#141820]/30 bg-[#FDE68A] text-[#92400E]">
                    {dailyEmblemUrl ? (
                      <img
                        src={dailyEmblemUrl}
                        alt="今日神山徽记"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <Calendar className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-display text-base font-bold text-[#141820] sm:text-lg">
                        今日神山 · {dailyRoute.name}
                      </span>
                      {dailyRoute.dailyDateKey && (
                        <span className="text-[11px] text-[#92400E] font-mono-tabular">
                          {dailyRoute.dailyDateKey}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#78350F] font-mono-tabular">
                      <span className="font-bold text-[#B45309]">难度 {dailyRoute.grade}</span>
                      <span aria-hidden="true">·</span>
                      <span>全长 {dailyRoute.heightM}m</span>
                      <span aria-hidden="true">·</span>
                      <span>每日限定动态岩壁</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs font-bold whitespace-nowrap">
                  <span className={dailyCompleted ? 'text-emerald-800' : 'text-[#92400E]'}>
                    {dailyCompleted ? '今日已完攀 ✓' : '查看详情'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#141820] transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>

              {/* Single-Column Route Preview List: One Route Per Row */}
              <div className="space-y-2.5" role="list" aria-label="攀登线路列表">
                {filteredRoutes.map((route) => {
                  const isLastSelected = route.id === selectedRouteId;
                  const isDone = completedRoutes.has(route.id);
                  const isSoloCleared = freeSoloRoutes.has(route.id);
                  const style = bestStyles[route.id];
                  const routeBadge = badgeById.get(route.id);

                  const statusLabel = isSoloCleared
                    ? '徒手 SSS'
                    : style === 'onsight'
                      ? '盲攀 ★'
                      : style === 'redpoint'
                        ? '红点 ◆'
                        : isDone
                          ? '已完攀 ✓'
                          : '查看详情';

                  return (
                    <button
                      key={route.id}
                      type="button"
                      role="listitem"
                      onClick={() => handleOpenRouteDetail(route)}
                      className={`group flex min-h-[82px] w-full items-center justify-between gap-3 border-2 px-3.5 py-3 text-left transition-all sm:gap-4 sm:px-4 ${
                        isLastSelected
                          ? 'border-[#141820] bg-white shadow-[3px_3px_0px_#141820]'
                          : 'border-[#141820]/25 bg-[#EDE9DF] hover:border-[#141820] hover:bg-white hover:shadow-[3px_3px_0px_#141820]'
                      }`}
                    >
                      {/* Left: Editorial Index + Route Medallion + Route Identity */}
                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                        <span className="w-6 shrink-0 text-center font-mono-tabular text-xs font-bold text-slate-500">
                          {String(route.tier).padStart(2, '0')}
                        </span>

                        {routeBadge && (
                          <div className="h-11 w-11 shrink-0">
                            <RouteMedallionEmblem
                              badge={routeBadge}
                              unlocked={isDone}
                              bestStyle={style}
                              isFreeSoloCleared={isSoloCleared}
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h2 className="font-display truncate text-base font-bold text-[#141820] sm:text-lg">
                              {route.name}
                            </h2>
                            {route.realName && (
                              <span className="hidden truncate text-xs font-medium text-slate-500 sm:inline">
                                {route.realName}
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 font-mono-tabular">
                            <span className="font-bold text-[#EA580C]">
                              {route.grade}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="font-semibold text-[#141820]">
                              {route.heightM}m
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span>{route.tierLabel}</span>
                            {route.location && (
                              <>
                                <span aria-hidden="true" className="hidden text-slate-400 sm:inline">·</span>
                                <span className="hidden truncate text-slate-500 sm:inline">
                                  {route.location}
                                </span>
                              </>
                            )}
                            {route.tier >= 5 && (
                              <>
                                <span aria-hidden="true" className="text-slate-400">·</span>
                                <span className="font-semibold text-sky-800">含路书读线</span>
                              </>
                            )}
                            {route.tier >= 9 && (
                              <>
                                <span aria-hidden="true" className="text-slate-400">·</span>
                                <span className="font-semibold text-red-700">偶发气象事故</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Completion Status & Detail Affordance */}
                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <span
                          className={`text-xs whitespace-nowrap font-mono-tabular ${
                            isSoloCleared
                              ? 'font-extrabold text-[#B45309]'
                              : style === 'onsight'
                                ? 'font-bold text-amber-700'
                                : style === 'redpoint'
                                  ? 'font-bold text-[#EA580C]'
                                  : isDone
                                    ? 'font-bold text-emerald-700'
                                    : 'font-medium text-slate-500 group-hover:text-[#141820]'
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#141820]" />
                      </div>
                    </button>
                  );
                })}
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

                    const loadoutIconUrl = AssetRegistry.getLoadoutIconPath(opt.id);

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
                        <div className="flex items-start gap-3">
                          {loadoutIconUrl && (
                            <img
                              src={loadoutIconUrl}
                              alt={opt.label}
                              referrerPolicy="no-referrer"
                              className="h-11 w-11 shrink-0 object-contain"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-sm font-bold ${
                                  opt.noProtection ? 'text-[#B91C1C]' : 'text-[#141820]'
                                }`}
                              >
                                {opt.label}
                              </span>
                              {active && <Check className="h-4 w-4 shrink-0 text-[#EA580C]" />}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                              {opt.subtitle}
                            </p>
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
            <div className="grid grid-cols-[minmax(0,1.52fr)_minmax(126px,1fr)] items-stretch gap-2.5 sm:grid-cols-[minmax(0,1.62fr)_minmax(248px,1fr)] sm:gap-5">
              {/* Left Hero Canvas (~61%–62%): Large Back-Standing Character + Name Above + Integrated Body Annotations */}
              <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden border-2 border-[#141820] bg-[#FAF8F2] px-3 py-3 shadow-[3px_3px_0px_#141820] sm:min-h-[448px] sm:px-6 sm:py-4 sm:shadow-[4px_4px_0px_#141820]">
                {/* Optional replaceable character showcase stage backdrop */}
                {stageBackdropUrl && !stageBgFailed && (
                  <img
                    src={stageBackdropUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    onError={() => setStageBgFailed(true)}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-28"
                  />
                )}

                {/* Subtle alpine architectural framing lines */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 bottom-9 border-t border-dashed border-[#141820]/15 sm:inset-x-6 sm:bottom-10"
                />

                {/* Top Center: Climber Name Directly Above the Character */}
                <div className="relative z-10 text-center">
                  <div className="font-display truncate text-xl leading-tight font-bold tracking-tight text-[#141820] sm:text-3xl">
                    {displayName}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1.5 text-[10px] font-medium text-slate-600 sm:text-xs">
                    <span>{genderLabel}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-semibold text-[#141820]">{activeSkin.name}</span>
                    <span aria-hidden="true" className="hidden text-slate-400 sm:inline">·</span>
                    <span className="hidden text-[#EA580C] sm:inline">{bodyProfile.styleTag}</span>
                  </div>
                </div>

                {/* Center Stage: Dominant Character Figure with Embedded Height & Wingspan Dimension Callouts */}
                <div className="relative z-10 my-1 flex flex-1 items-center justify-center">
                  {/* Embedded Left Height Dimension Bracket */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-3 left-0 flex flex-col items-start justify-between"
                  >
                    <span className="h-px w-2.5 bg-[#141820]/45" />
                    <div className="flex flex-1 items-center">
                      <div className="h-full w-px bg-[#141820]/30" />
                      <div className="ml-1.5 leading-tight font-mono-tabular">
                        <div className="text-[9px] text-slate-500 sm:text-[10px]">身高</div>
                        <div className="text-[11px] font-extrabold text-[#141820] sm:text-xs">
                          {bodyProfile.heightCm}
                          <span className="ml-0.5 text-[9px] font-normal text-slate-500">cm</span>
                        </div>
                      </div>
                    </div>
                    <span className="h-px w-2.5 bg-[#141820]/45" />
                  </div>

                  {/* Embedded Shoulder-Level Wingspan Guideline */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-[31%] flex items-center sm:inset-x-6"
                  >
                    <span className="h-2 w-px bg-[#141820]/35" />
                    <div className="flex-1 border-t border-dashed border-[#141820]/22" />
                    <span className="h-2 w-px bg-[#141820]/35" />
                  </div>

                  {/* Embedded Right Wingspan & Ape Index Readout */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[18%] right-0 text-right leading-tight font-mono-tabular sm:top-[20%]"
                  >
                    <div className="text-[9px] text-slate-500 sm:text-[10px]">臂展</div>
                    <div className="text-[11px] font-extrabold text-[#141820] sm:text-xs">
                      {bodyProfile.wingspanCm}
                      <span className="ml-0.5 text-[9px] font-normal text-slate-500">cm</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-[#EA580C] sm:text-[11px]">
                      {bodyProfile.apeIndexLabel}
                    </div>
                  </div>

                  {/* Embedded Lower-Right Weight & Load Readout */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 bottom-4 text-right leading-tight font-mono-tabular sm:bottom-5"
                  >
                    <div className="text-[9px] text-slate-500 sm:text-[10px]">体重 / 负重</div>
                    <div className="text-[11px] font-bold text-[#141820] sm:text-xs">
                      {bodyProfile.weightKg}kg
                      <span className="mx-0.5 text-slate-400">/</span>
                      <span className={isFreeSolo ? 'text-[#B91C1C]' : 'text-slate-700'}>
                        {activeGearWeightKg}kg
                      </span>
                    </div>
                  </div>

                  {/* Hero Character Figure */}
                  <div className="relative z-10 flex items-center justify-center px-4 sm:px-8">
                    <CharacterShowcaseArtwork
                      skin={activeSkin}
                      gender={climberGender}
                      climberName={displayName}
                    />
                  </div>
                </div>

                {/* Bottom Integrated Architectural Footnote (clean unboxed metrics inside stage) */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-1 text-[10px] text-slate-600 font-mono-tabular sm:gap-x-3 sm:text-xs">
                  <span>
                    力量体重比 <strong className="text-[#141820]">{bodyProfile.strengthRatio}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    配装 <strong className={isFreeSolo ? 'text-[#B91C1C]' : 'text-[#141820]'}>{activeLoadout.label}</strong>
                  </span>
                  <span aria-hidden="true" className="hidden text-slate-300 sm:inline">·</span>
                  <span className="hidden text-slate-500 sm:inline">背面实景档案</span>
                </div>
              </div>

              {/* Right Compact Control Rail (~38%–39%): Focused Name, Gender & 2 Outfits */}
              <div className="flex min-w-0 flex-col justify-between gap-2 sm:gap-3">
                {/* 1. Name Input */}
                <section className="border-2 border-[#141820] bg-white p-2.5 sm:p-3.5">
                  <div className="mb-1.5 flex items-baseline justify-between gap-1">
                    <label
                      htmlFor="climber-name-input"
                      className="text-xs font-bold text-[#141820] sm:text-sm"
                    >
                      名称
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono-tabular sm:text-[11px]">
                      {climberName.length}/12
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      id="climber-name-input"
                      type="text"
                      maxLength={12}
                      value={climberName}
                      onChange={(e) => onChangeClimberName(e.target.value)}
                      placeholder="孤影"
                      className="min-h-[38px] min-w-0 flex-1 border-2 border-[#141820] bg-[#F4F1EA] px-2 py-1 text-xs font-semibold text-[#141820] placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none sm:min-h-[40px] sm:px-3 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRandomName}
                      className="flex min-h-[38px] min-w-[38px] shrink-0 items-center justify-center gap-1 border-2 border-[#141820] bg-[#EFECE3] px-2 text-xs font-bold text-[#141820] transition-colors hover:bg-[#141820] hover:text-[#F4F1EA] sm:min-h-[40px] sm:px-3"
                      title="随机生成角色名称"
                      aria-label="随机生成角色名称"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">随机</span>
                    </button>
                  </div>
                </section>

                {/* 2. Gender Toggle */}
                <section className="border-2 border-[#141820] bg-white p-2.5 sm:p-3.5">
                  <div className="mb-1.5 flex items-baseline justify-between gap-1">
                    <h2 className="text-xs font-bold text-[#141820] sm:text-sm">性别</h2>
                    <span className="hidden text-[11px] text-slate-500 sm:inline">手感一致</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {(
                      [
                        { id: 'male', label: '男', desc: CLIMBER_BODY_PROFILES.male.contourDesc },
                        { id: 'female', label: '女', desc: CLIMBER_BODY_PROFILES.female.contourDesc },
                      ] as const
                    ).map((opt) => {
                      const active = climberGender === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelectGender(opt.id)}
                          className={`flex min-h-[40px] items-center justify-center gap-1 border-2 px-2 py-1.5 text-center transition-all sm:min-h-[44px] sm:justify-between sm:px-3 sm:text-left ${
                            active
                              ? 'border-[#141820] bg-[#FFF7ED] shadow-[2px_2px_0px_#141820]'
                              : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/80'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#141820] sm:text-sm">
                              {opt.label}
                            </div>
                            <div className="hidden truncate text-[10px] text-slate-600 sm:block">
                              {opt.desc}
                            </div>
                          </div>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 3. Two Default Outfits (stacked vertically in right rail for zero text crowding) */}
                <section className="flex flex-1 flex-col justify-between border-2 border-[#141820] bg-white p-2.5 sm:p-3.5">
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between gap-1">
                      <h2 className="text-xs font-bold text-[#141820] sm:text-sm">默认穿搭</h2>
                      <span className="text-[10px] text-slate-500 sm:text-[11px]">2 套</span>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {CLIMBER_SKINS.map((skin) => {
                        const active = skin.id === selectedSkin;
                        return (
                          <button
                            key={skin.id}
                            type="button"
                            onClick={() => onSelectSkin(skin.id)}
                            className={`flex min-h-[46px] w-full items-center gap-2 border-2 p-2 text-left transition-all sm:min-h-[56px] sm:gap-2.5 sm:p-2.5 ${
                              active
                                ? 'border-[#141820] bg-[#FFF7ED] shadow-[2px_2px_0px_#141820]'
                                : 'border-slate-300 bg-[#EAE6DC] hover:border-[#141820] hover:bg-white/80'
                            }`}
                          >
                            <div className="hidden shrink-0 sm:block">
                              <SkinMiniPreview skin={skin} gender={climberGender} />
                            </div>
                            <span
                              aria-hidden="true"
                              className="h-6 w-2 shrink-0 border border-[#141820] sm:hidden"
                              style={{ backgroundColor: skin.jacket }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-xs font-bold text-[#141820] sm:text-sm">
                                  {skin.name}
                                </span>
                                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" />}
                              </div>
                              <div className="truncate text-[10px] font-medium text-[#EA580C] sm:text-[11px]">
                                {skin.tag}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick link to Gear Loadout */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('gear')}
                    className="mt-2.5 flex min-h-[34px] w-full items-center justify-between border-t border-[#141820]/15 pt-2 text-[11px] font-semibold text-slate-600 transition-colors hover:text-[#EA580C] sm:text-xs"
                  >
                    <span className="truncate">调整出征负重</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
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
      </div>

      {/* Route Detail Modal (pops up when clicking any route row; centered Start button at bottom) */}
      {detailRoute && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="route-detail-title"
          onClick={() => setDetailRoute(null)}
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#141820]/76 p-3 backdrop-blur-[3px] sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden border-2 border-[#141820] bg-[#F4F1EA] text-[#141820] shadow-[8px_8px_0px_#141820]"
          >
            {/* Top Mountain Panorama Banner */}
            <div className="relative h-32 w-full shrink-0 overflow-hidden border-b-2 border-[#141820] bg-gradient-to-br from-slate-800 via-slate-700 to-stone-700 sm:h-40">
              {!detailImgFailed && detailWideSrc ? (
                <img
                  src={detailWideSrc}
                  alt={`${detailRoute.name} 山体风貌`}
                  referrerPolicy="no-referrer"
                  onError={() => setDetailImgFailed(true)}
                  className="h-full w-full object-cover object-[50%_32%]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-amber-100/90">
                  <Mountain className="h-8 w-8" />
                  <span className="text-xs font-medium tracking-wider">{detailRoute.name}</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141820]/80 via-[#141820]/20 to-transparent" />

              <button
                type="button"
                onClick={() => setDetailRoute(null)}
                aria-label="关闭关卡详情"
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center border-2 border-[#141820] bg-[#F4F1EA]/95 text-[#141820] shadow-[2px_2px_0px_#141820] transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute right-4 bottom-3 left-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-amber-200 font-mono-tabular drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                    {detailRoute.isDailyChallenge
                      ? `今日神山${detailRoute.dailyDateKey ? ` · ${detailRoute.dailyDateKey}` : ''}`
                      : `第 ${String(detailRoute.tier).padStart(2, '0')} 阶 · ${detailRoute.tierLabel}`}
                    <span className="mx-1.5 opacity-60">·</span>
                    <span>难度 {detailRoute.grade}</span>
                    <span className="mx-1.5 opacity-60">·</span>
                    <span>全长 {detailRoute.heightM}m</span>
                  </div>
                  <h2
                    id="route-detail-title"
                    className="font-display mt-0.5 truncate text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-3xl"
                  >
                    {detailRoute.name}
                  </h2>
                </div>
                {detailBadge && (
                  <div className="h-12 w-12 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
                    <RouteMedallionEmblem
                      badge={detailBadge}
                      unlocked={completedRoutes.has(detailRoute.id)}
                      bestStyle={bestStyles[detailRoute.id]}
                      isFreeSoloCleared={freeSoloRoutes.has(detailRoute.id)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Route Dossier Content */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              {/* Real-world Origin & Best Record */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141820]/15 pb-3 text-xs">
                <div className="text-slate-600">
                  {[detailRoute.realName, detailRoute.location].filter(Boolean).join(' · ') ||
                    '每日随机生成真实地形'}
                </div>
                <div className="font-mono-tabular font-semibold">
                  {detailRoute.isDailyChallenge ? (
                    dailyCompleted ? (
                      <span className="text-emerald-700">今日已完攀登顶 ✓</span>
                    ) : (
                      <span className="text-[#B45309]">今日尚未挑战</span>
                    )
                  ) : freeSoloRoutes.has(detailRoute.id) ? (
                    <span className="text-[#B45309]">最佳战绩：徒手 SSS</span>
                  ) : bestStyles[detailRoute.id] === 'onsight' ? (
                    <span className="text-amber-700">最佳战绩：盲攀零坠落 ★</span>
                  ) : bestStyles[detailRoute.id] === 'redpoint' ? (
                    <span className="text-[#EA580C]">最佳战绩：红点零坠落 ◆</span>
                  ) : completedRoutes.has(detailRoute.id) ? (
                    <span className="text-emerald-700">已完攀登顶 ✓</span>
                  ) : (
                    <span className="text-slate-500">尚未登顶</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-slate-800">
                {detailRoute.description}
              </p>

              {/* Route Special Notices (clean hairline boxes, no thick left borders) */}
              {(detailRoute.tier >= 5 || detailRoute.tier >= 9 || isFreeSolo) && (
                <div className="space-y-2 text-xs leading-relaxed">
                  {detailRoute.tier >= 5 && (
                    <div className="border border-sky-300 bg-sky-50/85 px-3 py-2 text-sky-950">
                      <strong className="font-bold text-sky-900">路书读线系统：</strong>
                      开攀前自动进入读线观察，支持提前标记路线序列、可行性校验与参考路书生成。
                    </div>
                  )}
                  {detailRoute.tier >= 9 && (
                    <div className="border border-red-300 bg-red-50/85 px-3 py-2 text-red-950">
                      <strong className="font-bold text-red-800">大师级偶发气象事故：</strong>
                      攀登途中将随机遭遇突发强横风、高空落冰与冻雨白毛风，请留意预警及时移位抗风。
                    </div>
                  )}
                  {isFreeSolo && (
                    <div className="border border-red-400 bg-[#FEF2F2] px-3 py-2 text-red-950">
                      <strong className="font-bold text-[#B91C1C]">徒手独攀已启用：</strong>
                      体力消耗 -50%，全程无岩钉、无镁粉与休息台存档（失手需从头重攀），登顶直评{' '}
                      <strong className="text-[#B45309]">SSS</strong>。
                    </div>
                  )}
                </div>
              )}

              {/* Expedition Telemetry Grid */}
              <dl className="grid grid-cols-1 gap-3 border-y border-[#141820]/15 py-3.5 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] text-slate-500">携带补给</dt>
                  <dd className="mt-0.5 font-semibold text-[#141820] font-mono-tabular">
                    {isFreeSolo
                      ? '徒手无保护'
                      : `岩钉 ×${detailEffectivePitons} · 镁粉 ×${detailEffectiveChalk}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">气象阶段</dt>
                  <dd className="mt-0.5 font-semibold text-[#141820]">
                    {detailWeatherSummary}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">出征攀登者</dt>
                  <dd className="mt-0.5 flex items-center justify-between gap-2 font-semibold text-[#141820]">
                    <span className="truncate">
                      {displayName}（{genderLabel}）· {activeSkin.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailRoute(null);
                        setActiveTab('character');
                      }}
                      className="shrink-0 text-[11px] font-semibold text-[#EA580C] hover:underline whitespace-nowrap"
                    >
                      修改
                    </button>
                  </dd>
                </div>
              </dl>

              {/* Inline Loadout Quick Selector */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="font-bold text-[#141820]">本次负重配装</span>
                  <span className="text-[11px] text-slate-500">
                    {activeLoadout.subtitle}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {LOADOUT_OPTIONS.map((opt) => {
                    const active = opt.id === selectedLoadout;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectLoadout(opt.id)}
                        className={`min-h-[38px] border px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                          active
                            ? opt.noProtection
                              ? 'border-[#141820] bg-[#B91C1C] text-white'
                              : 'border-[#141820] bg-[#141820] text-[#F4F1EA]'
                            : 'border-[#141820]/25 bg-white text-[#141820] hover:border-[#141820]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Associated Route Medallion Preview */}
              {detailBadge && (
                <div className="flex items-center justify-between gap-3 border border-[#141820]/15 bg-[#EFECE3] px-3.5 py-2.5 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-[#141820]">
                      登顶纪念徽章 · {detailBadge.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-600">
                      {detailBadge.emblemMotto ?? detailBadge.subtitle}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono-tabular text-[11px] font-semibold text-slate-600">
                    {completedRoutes.has(detailRoute.id) ? '已收入徽章墙' : '首登解锁'}
                  </span>
                </div>
              )}
            </div>

            {/* Centered Primary Start Climbing CTA Footer */}
            <div className="flex items-center justify-center border-t-2 border-[#141820] bg-[#EFECE3] px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  const target = detailRoute;
                  setDetailRoute(null);
                  onStart(target);
                }}
                className={`min-h-[48px] min-w-[220px] border-2 border-[#141820] px-10 py-2.5 text-base font-bold text-white shadow-[4px_4px_0px_#141820] whitespace-nowrap transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
                  isFreeSolo
                    ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                    : 'bg-[#EA580C] hover:bg-[#DC4C06]'
                }`}
              >
                {isFreeSolo ? '开始徒手攀登' : '开始攀登'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
