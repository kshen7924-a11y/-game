import { useState } from 'react';
import { AltitudeDifficultyBin } from '../game/types';

interface AltitudeDifficultyChartProps {
  profile: AltitudeDifficultyBin[];
  altitudeM: number;
  routeHeightM: number;
  isReadingRoute?: boolean;
  onInspectBin?: (bin: AltitudeDifficultyBin) => void;
}

function getBarColor(
  difficulty: number,
  isPast: boolean,
  isCurrent: boolean,
  isUpcoming: boolean
): string {
  if (difficulty >= 76) {
    return isCurrent || isUpcoming ? 'bg-red-500' : isPast ? 'bg-red-500/35' : 'bg-red-500/75';
  }
  if (difficulty >= 58) {
    return isCurrent || isUpcoming
      ? 'bg-orange-500'
      : isPast
        ? 'bg-orange-500/35'
        : 'bg-orange-500/75';
  }
  if (difficulty >= 38) {
    return isCurrent || isUpcoming
      ? 'bg-amber-400'
      : isPast
        ? 'bg-amber-400/35'
        : 'bg-amber-400/75';
  }
  return isCurrent || isUpcoming
    ? 'bg-emerald-400'
    : isPast
      ? 'bg-emerald-400/35'
      : 'bg-emerald-400/75';
}

export function AltitudeDifficultyChart({
  profile,
  altitudeM,
  routeHeightM,
  isReadingRoute = false,
  onInspectBin,
}: AltitudeDifficultyChartProps) {
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  if (profile.length === 0) return null;

  const progressRatio = Math.max(0, Math.min(0.9999, altitudeM / Math.max(1, routeHeightM)));
  const currentIdx = Math.min(profile.length - 1, Math.floor(progressRatio * profile.length));
  const nextIdx = Math.min(profile.length - 1, currentIdx + 1);

  const inspectedBin = inspectedIndex !== null ? profile[inspectedIndex] : null;
  const focusBin =
    inspectedBin ?? (currentIdx < profile.length - 1 ? profile[nextIdx] : profile[currentIdx]);

  const previewPrefix = inspectedBin
    ? `${inspectedBin.startM}-${inspectedBin.endM}m`
    : currentIdx < profile.length - 1
      ? '前方'
      : '顶段';

  const focusColor =
    focusBin.difficulty >= 76
      ? 'text-red-300'
      : focusBin.difficulty >= 58
        ? 'text-orange-300'
        : focusBin.difficulty >= 38
          ? 'text-amber-200'
          : 'text-emerald-300';

  return (
    <div className="pointer-events-auto w-[166px] border border-white/15 bg-[#141820]/80 px-2 py-1 backdrop-blur-sm sm:w-[208px] sm:px-2.5 sm:py-1.5">
      <div className="flex items-center justify-between gap-1.5 text-[10px] leading-tight">
        <span className="font-medium text-slate-400 whitespace-nowrap">
          {isReadingRoute ? '点选段' : '坡度'}
        </span>
        <span className={`truncate font-semibold font-mono-tabular ${focusColor}`}>
          {previewPrefix} · {focusBin.challengeTag}
        </span>
      </div>

      <div className="relative mt-1 flex h-[20px] items-end gap-[2px] border-b border-white/15 pb-0.5 sm:h-[24px] sm:gap-[3px]">
        {profile.map((bin, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isUpcoming = idx === currentIdx + 1 || idx === currentIdx + 2;
          const isInspected = inspectedIndex === idx;
          const barHeightPct = Math.max(20, bin.difficulty);
          const colorCls = getBarColor(bin.difficulty, isPast, isCurrent, isUpcoming);

          return (
            <button
              key={bin.index}
              type="button"
              onClick={() => {
                setInspectedIndex((prev) => (prev === idx && !isReadingRoute ? null : idx));
                if (isReadingRoute && onInspectBin) {
                  onInspectBin(bin);
                }
              }}
              title={`${bin.startM}-${bin.endM}m · ${bin.challengeTag} (坡度 ${bin.difficulty})`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end focus:outline-none"
            >
              <div
                style={{ height: `${barHeightPct}%` }}
                className={`w-full transition-opacity duration-150 ${colorCls} ${
                  isInspected
                    ? 'ring-1 ring-sky-300 brightness-125'
                    : isCurrent
                      ? 'ring-1 ring-[#F4F1EA]'
                      : isUpcoming
                        ? 'ring-1 ring-white/35'
                        : ''
                }`}
              />

              {bin.hasBivouac && (
                <span className="absolute -bottom-[2px] h-[2px] w-full bg-emerald-300" />
              )}
            </button>
          );
        })}

        <div
          style={{ left: `${Math.min(98, Math.max(2, progressRatio * 100))}%` }}
          className="pointer-events-none absolute -bottom-[3px] h-1.5 w-[2px] -translate-x-1/2 bg-[#F59E0B]"
        />
      </div>
    </div>
  );
}
