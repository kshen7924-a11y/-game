import { useEffect, useMemo, useState } from 'react';
import { BadgeInfo, ClimbStyle } from '../game/types';
import { AssetRegistry } from '../visual/AssetRegistry';

interface ClimbBadgeProps {
  badge: BadgeInfo;
  unlocked: boolean;
  compact?: boolean;
  highlightNew?: boolean;
  bestStyle?: ClimbStyle;
  isFreeSoloCleared?: boolean;
}

/**
 * Ceremonial alpine expedition medallion per real-world route.
 * Automatically renders custom high-res PNG badge artwork from AssetRegistry.getBadgeSpritePath(badge.id)
 * when provided, and falls back to bespoke engraved route-themed SVG crests.
 */
export function RouteMedallionEmblem({
  badge,
  unlocked,
  bestStyle,
  isFreeSoloCleared,
}: {
  badge: BadgeInfo;
  unlocked: boolean;
  bestStyle?: ClimbStyle;
  isFreeSoloCleared?: boolean;
}) {
  const [manifestRev, setManifestRev] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    return AssetRegistry.subscribe((scope) => {
      if (scope === 'all' || scope === 'badges') {
        setManifestRev((v) => v + 1);
        setFailedUrl(null);
      }
    });
  }, []);

  const customUrl = useMemo(() => {
    void manifestRev;
    return AssetRegistry.getBadgeSpritePath(badge.id);
  }, [badge.id, manifestRev]);

  if (customUrl && failedUrl !== customUrl) {
    return (
      <img
        src={customUrl}
        alt={`${badge.routeName} · ${badge.title} 纪念徽章`}
        onError={() => setFailedUrl(customUrl)}
        className={`h-full w-full object-contain transition-all ${
          unlocked
            ? 'drop-shadow-[0_2px_4px_rgba(20,24,32,0.28)]'
            : 'grayscale opacity-50 contrast-75'
        }`}
      />
    );
  }

  const ink = unlocked ? '#141820' : '#475569';
  const rimOuter = !unlocked
    ? '#CBD5E1'
    : isFreeSoloCleared
      ? '#F59E0B'
      : bestStyle === 'onsight'
        ? '#FBBF24'
        : badge.tier >= 9
          ? '#E2E8F0'
          : badge.tier >= 5
            ? '#FDE68A'
            : '#E7DFD0';
  const fieldBg = !unlocked
    ? '#E2E8F0'
    : badge.tier >= 9
      ? '#0F172A'
      : badge.tier >= 6
        ? '#1E293B'
        : '#FAF6EE';
  const accent = unlocked ? badge.accentColor : '#64748B';
  const gold = unlocked ? '#F59E0B' : '#94A3B8';
  const skySoft = unlocked ? (badge.tier >= 6 ? '#334155' : '#EFE7D6') : '#CBD5E1';

  const renderCrestBody = () => {
    switch (badge.id) {
      case 'kids':
        // 01 天鹅岩缓壁 Swan Slab — Rising Sun + Graceful Swan-Wing Granite Sweep
        return (
          <>
            <circle cx="32" cy="32" r="27" fill={rimOuter} stroke={ink} strokeWidth="2.4" />
            <circle cx="32" cy="32" r="22.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" />
            {/* Sunburst rays */}
            <circle cx="40" cy="21" r="4.5" fill={gold} stroke={ink} strokeWidth="1.3" />
            <path d="M40 13.5 V15 M46.5 21 H48 M44.8 16.2 L46 15 M35.2 16.2 L34 15" stroke={gold} strokeWidth="1.4" strokeLinecap="round" />
            {/* Smooth granite slab & stylized swan wing curve */}
            <path d="M12 43 Q24 25 51 41 L46 49 Q32 54 18 49 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M16 39 Q27 29 39 36 Q30 35 23 41 Z" fill="#FFFBEB" stroke={ink} strokeWidth="1.2" opacity={unlocked ? 0.95 : 0.4} />
          </>
        );

      case 'intro':
        // 02 白马岩脊 Whitehorse Ledge — Granite Dome, Mist Ribbon & Soaring Horse Crest
        return (
          <>
            <circle cx="32" cy="32" r="27" fill={rimOuter} stroke={ink} strokeWidth="2.4" />
            <circle cx="32" cy="32" r="22.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" />
            <path d="M12 42 Q26 18 52 38 L47 48 Q32 54 17 48 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            {/* Stylized leaping white horse ridge silhouette */}
            <path d="M22 36 Q28 24 38 22 L42 25 L37 28 Q39 33 34 38 Z" fill="#FFFBEB" stroke={ink} strokeWidth="1.3" strokeLinejoin="round" />
            {/* Morning mist bands */}
            <path d="M14 43 H50 M18 47 H46" stroke={ink} strokeWidth="1.4" strokeDasharray="4 2.5" opacity="0.7" />
          </>
        );

      case 'beginner':
        // 03 皇家拱门 Royal Arches — Concentric Granite Arches & Crown Keystone
        return (
          <>
            <rect x="6" y="6" width="52" height="52" rx="13" fill={rimOuter} stroke={ink} strokeWidth="2.4" />
            <rect x="10.5" y="10.5" width="43" height="43" rx="9.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" />
            {/* Royal Crown at top keystone */}
            <path d="M24 21 L26 15 L32 19 L38 15 L40 21 Z" fill={gold} stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
            {/* Concentric stone arches */}
            <path d="M14 48 A18 18 0 0 1 50 48 Z" fill={accent} stroke={ink} strokeWidth="1.7" />
            <path d="M20 48 A12 12 0 0 1 44 48 Z" fill={skySoft} stroke={ink} strokeWidth="1.5" />
            <path d="M26 48 A6 6 0 0 1 38 48 Z" fill={fieldBg} stroke={ink} strokeWidth="1.4" />
          </>
        );

      case 'beginner-plus':
        // 04 高危悬廊 High Exposure — Iconic Overhanging Roof & Compass Exposure Star
        return (
          <>
            <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <polygon points="32,9 51.5,20.5 51.5,43.5 32,55 12.5,43.5 12.5,20.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Dramatic jutting Shawangunks roof overhang */}
            <path d="M15 47 V24 H45 L33 34 V47 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            {/* Exposed sky compass star */}
            <path d="M43 17 L44.4 20.6 L48 22 L44.4 23.4 L43 27 L41.6 23.4 L38 22 L41.6 20.6 Z" fill={gold} stroke={ink} strokeWidth="1.1" />
          </>
        );

      case 'intermediate':
        // 05 蛇脊壁 Snake Dike — Half Dome Wall with Winding Protruding Granite Dike
        return (
          <>
            <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <polygon points="32,9 51.5,20.5 51.5,43.5 32,55 12.5,43.5 12.5,20.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Half Dome sweeping shoulder */}
            <path d="M14 44 L23 19 Q34 15 44 26 L50 44 Z" fill={skySoft} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
            {/* Winding Snake Dike ridge spine */}
            <path d="M24 49 C18 41 37 37 29 29 C23 23 36 20 35 14" fill="none" stroke={ink} strokeWidth="5.2" strokeLinecap="round" />
            <path d="M24 49 C18 41 37 37 29 29 C23 23 36 20 35 14" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="35" cy="14" r="2.6" fill={gold} stroke={ink} strokeWidth="1.2" />
          </>
        );

      case 'intermediate-plus':
        // 06 月光拱壁 Moonlight Buttress — Twin Sandstone Canyon Walls + Luminous Crescent Moon
        return (
          <>
            <circle cx="32" cy="32" r="27" fill={rimOuter} stroke={ink} strokeWidth="2.4" />
            <circle cx="32" cy="32" r="22.5" fill={fieldBg} stroke={ink} strokeWidth="1.5" />
            {/* Twin sheer sandstone walls framing a vertical dihedral */}
            <path d="M11 45 L15 18 L27 25 L26 52 Z" fill={accent} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M53 45 L49 18 L37 25 L38 52 Z" fill={accent} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" opacity="0.88" />
            {/* Crescent moon shining down the central crack */}
            <path d="M35.5 15 A7 7 0 1 0 35.5 27 A5.4 5.4 0 1 1 35.5 15 Z" fill="#FDE68A" stroke={ink} strokeWidth="1.2" />
            <line x1="32" y1="29" x2="32" y2="51" stroke="#BAE6FD" strokeWidth="1.6" strokeDasharray="3 2" opacity={unlocked ? 0.9 : 0.35} />
          </>
        );

      case 'advanced':
        // 07 魔鬼塔裂隙 Durrance Route — Iconic Fluted Basalt Columns of Devils Tower
        return (
          <>
            <path d="M10 8 H54 V34 L32 58 L10 34 Z" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M14.5 12.5 H49.5 V32.5 L32 52 L14.5 32.5 Z" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Devils Tower flat-topped monolith + fluted columns */}
            <path d="M19 42 L22 18 H42 L45 42 L32 50 Z" fill={accent} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M26 18 V44 M32 18 V48 M38 18 V44" stroke={ink} strokeWidth="1.4" />
            {/* Highlight central crack */}
            <path d="M32 20 V45" stroke="#FEF08A" strokeWidth="1.4" strokeDasharray="3 2" opacity={unlocked ? 0.95 : 0.35} />
          </>
        );

      case 'advanced-crux':
        // 08 莲花塔南壁 Lotus Flower Tower — Needle Granite Spire Rising from Alpine Lotus Petals
        return (
          <>
            <path d="M10 8 H54 V34 L32 58 L10 34 Z" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M14.5 12.5 H49.5 V32.5 L32 52 L14.5 32.5 Z" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Lotus petal wreath at base */}
            <path d="M19 40 Q25 32 32 42 Q39 32 45 40 Q38 46 32 47 Q26 46 19 40 Z" fill="#FDE68A" stroke={ink} strokeWidth="1.3" strokeLinejoin="round" />
            {/* Soaring granite tower spire */}
            <path d="M25 43 L32 14 L39 43 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M32 14 L32 43" stroke="#F8FAFC" strokeWidth="1.2" opacity="0.7" />
          </>
        );

      case 'master-1':
        // 09 艾格峰北壁 Heckmair Route — Eiger White Spider Face & Crossed Ice Axes
        return (
          <>
            <polygon points="32,4 60,32 32,60 4,32" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <polygon points="32,9.5 54.5,32 32,54.5 9.5,32" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Crossed alpine ice axes */}
            <path d="M20 42 L44 20 M44 42 L20 20" stroke="#94A3B8" strokeWidth="2.1" strokeLinecap="round" />
            {/* Eiger North Wall & White Spider snow patch */}
            <path d="M17 41 L32 15 L47 41 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M28 29 L32 25 L36 29 L32 34 Z M26 26 L38 32 M38 26 L26 32" fill="#F8FAFC" stroke="#F8FAFC" strokeWidth="1.2" strokeLinecap="round" />
          </>
        );

      case 'master-2':
        // 10 马特洪峰北壁 Schmid Route — Iconic Hooked Matterhorn Pyramid & Polar Star
        return (
          <>
            <polygon points="32,4 60,32 32,60 4,32" fill={rimOuter} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
            <polygon points="32,9.5 54.5,32 32,54.5 9.5,32" fill={fieldBg} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Iconic curved Matterhorn pyramid silhouette */}
            <path d="M15 43 L27 25 Q31 19 36 15 Q35 22 40 31 L48 43 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            {/* Sunlit right snow ridge */}
            <path d="M36 15 Q34 25 32 43 L48 43 L40 31 Q35 22 36 15 Z" fill="#E0F2FE" opacity={unlocked ? 0.85 : 0.3} />
            {/* Polar frost star */}
            <circle cx="23" cy="20" r="2.1" fill={gold} stroke={ink} strokeWidth="1" />
          </>
        );

      default:
        // 11 黎明之墙 The Dawn Wall — Sovereign Star Crest, El Capitan Monolith & Golden Dawn Rays
        return (
          <>
            <polygon
              points="32,3 38.5,14 51,12 49,24.5 60,32 49,39.5 51,52 38.5,50 32,61 25.5,50 13,52 15,39.5 4,32 15,24.5 13,12 25.5,14"
              fill={rimOuter}
              stroke={ink}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="32" r="21" fill={fieldBg} stroke={ink} strokeWidth="1.5" />
            {/* Golden Dawn Rays */}
            <path
              d="M32 13 V19 M21 17 L25 22 M43 17 L39 22 M16 26 L22 28 M48 26 L42 28"
              stroke={gold}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* El Capitan sheer prow silhouette */}
            <path d="M17 45 L24 22 L32 18 L40 22 L47 45 Q32 51 17 45 Z" fill={accent} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M32 18 L32 48 L47 45 L40 22 Z" fill="#FDE68A" opacity={unlocked ? 0.35 : 0.12} />
            {/* Summit Crown Star */}
            <circle cx="32" cy="18" r="2.7" fill={gold} stroke={ink} strokeWidth="1.2" />
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      {renderCrestBody()}
      {/* Top ceremonial ribbon ring */}
      <circle cx="32" cy="5.5" r="2.4" fill={unlocked ? gold : '#94A3B8'} stroke={ink} strokeWidth="1.2" />
    </svg>
  );
}

export function ClimbBadge({
  badge,
  unlocked,
  compact = false,
  highlightNew = false,
  bestStyle,
  isFreeSoloCleared = false,
}: ClimbBadgeProps) {
  const baseStyleLabel =
    unlocked && bestStyle === 'onsight'
      ? '盲攀 ★'
      : unlocked && bestStyle === 'redpoint'
        ? '红点 ◆'
        : unlocked
          ? '已完攀'
          : '未解锁';

  const styleLabel =
    unlocked && isFreeSoloCleared ? `${baseStyleLabel} · 徒手 SSS` : baseStyleLabel;

  if (compact) {
    return (
      <div
        className={`flex min-w-[152px] shrink-0 items-center gap-2 border px-2.5 py-2 ${
          unlocked
            ? bestStyle === 'onsight' || isFreeSoloCleared
              ? 'border-[#B45309] bg-[#FFFBEB]'
              : 'border-[#141820] bg-white'
            : 'border-slate-300 bg-[#ECE8DF] opacity-65'
        }`}
      >
        <div className="h-9 w-9 shrink-0">
          <RouteMedallionEmblem
            badge={badge}
            unlocked={unlocked}
            bestStyle={bestStyle}
            isFreeSoloCleared={isFreeSoloCleared}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-xs font-bold text-[#141820]">{badge.title}</div>
          <div
            className={`mt-0.5 truncate text-[10px] font-mono-tabular ${
              isFreeSoloCleared || bestStyle === 'onsight'
                ? 'font-bold text-amber-700'
                : bestStyle === 'redpoint'
                  ? 'font-bold text-orange-700'
                  : 'text-slate-600'
            }`}
          >
            {badge.routeName} · {styleLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3.5 border-2 p-3 transition-colors ${
        unlocked
          ? isFreeSoloCleared || bestStyle === 'onsight'
            ? 'border-[#141820] bg-[#FFFBEB] shadow-[3px_3px_0px_#141820]'
            : 'border-[#141820] bg-white shadow-[3px_3px_0px_#141820]'
          : 'border-slate-300 bg-[#EAE6DC] opacity-78'
      }`}
    >
      <div className="h-14 w-14 shrink-0">
        <RouteMedallionEmblem
          badge={badge}
          unlocked={unlocked}
          bestStyle={bestStyle}
          isFreeSoloCleared={isFreeSoloCleared}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <span className="font-display truncate text-base font-bold text-[#141820]">
              {badge.title}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-slate-600">
              {badge.routeName}
            </span>
          </div>
          <span
            className={`shrink-0 text-[11px] font-semibold whitespace-nowrap font-mono-tabular ${
              unlocked
                ? isFreeSoloCleared || bestStyle === 'onsight'
                  ? 'text-amber-700'
                  : bestStyle === 'redpoint'
                    ? 'text-[#EA580C]'
                    : 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            {highlightNew ? '新解锁 · ' : ''}
            {styleLabel}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-mono-tabular">
          <span className="font-semibold text-[#EA580C]">{badge.grade}</span>
          <span aria-hidden="true">·</span>
          <span>{badge.tierLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{badge.heightM}m</span>
          <span aria-hidden="true">·</span>
          <span className="truncate text-slate-500">{badge.realName}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">
          {badge.emblemMotto ?? badge.subtitle}
        </div>
      </div>
    </div>
  );
}
