import { BadgeInfo, ClimbStyle } from '../game/types';
import './expedition.css';

interface ClimbBadgeProps {
  badge: BadgeInfo;
  unlocked: boolean;
  compact?: boolean;
  highlightNew?: boolean;
  bestStyle?: ClimbStyle;
  isFreeSoloCleared?: boolean;
}

export function ClimbBadge({
  badge,
  unlocked,
  compact = false,
  highlightNew = false,
  bestStyle,
  isFreeSoloCleared = false,
}: ClimbBadgeProps) {
  const renderEmblem = () => {
    const stroke = unlocked ? '#141820' : '#64748B';
    const fillPrimary = unlocked ? badge.accentColor : '#334155';
    const fillLight = unlocked ? '#FEF3C7' : '#475569';

    switch (badge.tier) {
      case 1:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill={fillLight} stroke={stroke} strokeWidth="2.5" />
            <path d="M10 34 Q22 20 38 34 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="31" cy="15" r="4" fill={unlocked ? '#FBBF24' : '#475569'} stroke={stroke} strokeWidth="1.5" />
          </svg>
        );
      case 2:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill={fillLight} stroke={stroke} strokeWidth="2.5" />
            <path d="M10 34 L21 17 L28 26 L33 21 L39 34 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 28 H36" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
        );
      case 3:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <rect x="6" y="6" width="36" height="36" rx="10" fill={fillLight} stroke={stroke} strokeWidth="2.5" />
            <path d="M11 34 L18 26 L25 26 L30 18 L37 18 L37 34 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      case 4:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M15 35 L21 25 L26 28 L33 14" fill="none" stroke={fillPrimary} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="33" cy="14" r="3" fill={fillPrimary} stroke={stroke} strokeWidth="1.5" />
          </svg>
        );
      case 5:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M18 11 L24 22 L20 29 L26 38" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="22" r="4.5" fill={fillPrimary} stroke={stroke} strokeWidth="2" />
          </svg>
        );
      case 6:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <rect x="6" y="6" width="36" height="36" rx="8" fill={fillLight} stroke={stroke} strokeWidth="2.5" />
            <path d="M12 32 L18 14 L34 14 L26 24 L36 32 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <path d="M14 10 L12 15 M23 9 L21 14 M32 10 L30 15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 7:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <path d="M8 8 H40 V26 L24 42 L8 26 Z" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M14 31 L22 14 L30 22 L35 16 V31 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      case 8:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <path d="M8 8 H40 V26 L24 42 L8 26 Z" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M26 11 L17 24 H24 L21 36 L32 21 H25 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      case 9:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <polygon points="24,4 43,24 24,44 5,24" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M14 30 L24 12 L34 30 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      case 10:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <polygon points="24,4 43,24 24,44 5,24" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M12 31 L20 15 L25 22 L31 13 L37 31 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
            <polygon points="24,3 31,15 44,18 35,28 37,42 24,36 11,42 13,28 4,18 17,15" fill={fillLight} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M15 33 L24 13 L33 33 Z" fill={fillPrimary} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="24" cy="11" r="2.5" fill={unlocked ? '#F59E0B' : '#475569'} stroke={stroke} strokeWidth="1.2" />
          </svg>
        );
    }
  };

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
        data-unlocked={unlocked}
        data-style={bestStyle}
        className={`expedition-badge flex min-w-[144px] shrink-0 items-center gap-2 border px-2.5 py-2 ${
          unlocked
            ? bestStyle === 'onsight'
              ? 'border-[#B45309] bg-[#FFFBEB]'
              : 'border-[#141820] bg-white'
            : 'border-slate-300 bg-[#ECE8DF] opacity-65'
        }`}
      >
        <div className="h-8 w-8 shrink-0">{renderEmblem()}</div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-xs font-bold text-[#141820]">{badge.title}</div>
          <div
            className={`mt-0.5 truncate text-[10px] font-mono-tabular ${
              bestStyle === 'onsight'
                ? 'font-bold text-amber-700'
                : bestStyle === 'redpoint'
                  ? 'font-bold text-orange-700'
                  : 'text-slate-600'
            }`}
          >
            {badge.tierLabel} · {styleLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-unlocked={unlocked}
      data-style={bestStyle}
      className={`expedition-badge flex items-center gap-3 border p-3 transition-colors ${
        unlocked
          ? bestStyle === 'onsight'
            ? 'border-[#141820] bg-[#FFFBEB] shadow-[3px_3px_0px_#141820]'
            : 'border-[#141820] bg-white shadow-[3px_3px_0px_#141820]'
          : 'border-slate-300 bg-[#EAE6DC] opacity-75'
      }`}
    >
      <div className="h-11 w-11 shrink-0">{renderEmblem()}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-[#141820]">{badge.title}</span>
          <span
            className={`shrink-0 text-[11px] font-semibold whitespace-nowrap font-mono-tabular ${
              unlocked
                ? bestStyle === 'onsight'
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
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-mono-tabular">
          <span>{badge.tierLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{badge.grade}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">{badge.subtitle}</div>
      </div>
    </div>
  );
}
