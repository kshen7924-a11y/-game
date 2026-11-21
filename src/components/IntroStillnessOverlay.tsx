import { BadgeInfo, ClimbStyle, RouteConfig } from '../game/types';
import { RouteMedallionEmblem } from './ClimbBadge';

interface IntroStillnessOverlayProps {
  route: RouteConfig;
  badge: BadgeInfo;
  elapsedSec: number;
  durationSec: number;
  bestStyle?: ClimbStyle;
  isFreeSolo?: boolean;
  isFreeSoloCleared?: boolean;
  onSkip: () => void;
}

/**
 * 3-Second "岩间静谧" (Alpine Stillness) Pre-Climb Intro Cutscene.
 * Phase A (0.0s -> 1.8s): Soft alpine slate veil fades in, unveiling the route's full ceremonial
 * medallion crest, real-world route name, difficulty grade & height.
 * Phase B (1.8s -> 3.0s): Crest & veil dissolve cleanly as the camera pans down to the climber's
 * idle starting stance on the cliff face.
 */
export function IntroStillnessOverlay({
  route,
  badge,
  elapsedSec,
  durationSec,
  bestStyle,
  isFreeSolo = false,
  isFreeSoloCleared = false,
  onSkip,
}: IntroStillnessOverlayProps) {
  const safeDur = Math.max(0.5, durationSec);
  const progress = Math.max(0, Math.min(1, elapsedSec / safeDur));

  // Smooth veil opacity: starts dark so scene breathes in, dissolves cleanly during final 1.2s camera pan
  const veilOpacity =
    elapsedSec < 0.35
      ? 0.92 - (elapsedSec / 0.35) * 0.16
      : elapsedSec < 1.75
        ? 0.76
        : Math.max(0, 0.76 * (1 - (elapsedSec - 1.75) / Math.max(0.25, safeDur - 1.75)));

  // Ceremonial emblem & typography alpha + subtle vertical drift (compositor-only opacity & transform)
  const contentIn = Math.max(0, Math.min(1, (elapsedSec - 0.1) / 0.55));
  const contentOut =
    elapsedSec < 1.85
      ? 1
      : Math.max(0, 1 - (elapsedSec - 1.85) / Math.max(0.25, safeDur - 2.15));
  const contentOpacity = contentIn * contentOut;
  const contentTranslateY = (1 - contentIn) * 14 - (1 - contentOut) * 12;
  const emblemScale = 0.92 + contentIn * 0.08;

  const canSkip = elapsedSec >= 0.55;

  return (
    <div
      role="dialog"
      aria-label={`${route.name} 岩间静谧开场`}
      onClick={canSkip ? onSkip : undefined}
      className={`fixed inset-0 z-30 flex flex-col items-center justify-center select-none ${
        canSkip ? 'cursor-pointer' : 'pointer-events-none'
      }`}
    >
      {/* Atmospheric alpine slate veil fading into the live cliff camera */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: veilOpacity,
          background:
            'radial-gradient(circle at 50% 44%, rgba(15, 23, 42, 0.72) 0%, rgba(10, 14, 22, 0.94) 72%, rgba(7, 10, 16, 0.98) 100%)',
        }}
      />

      {/* Centered Ceremonial Medallion & Route Typography */}
      <div
        className="relative z-10 flex max-w-[90vw] flex-col items-center px-6 text-center"
        style={{
          opacity: contentOpacity,
          transform: `translate3d(0, ${contentTranslateY.toFixed(1)}px, 0)`,
        }}
      >
        <div className="mb-3 flex items-center gap-3 text-[11px] font-medium tracking-[0.26em] text-amber-200/80">
          <span aria-hidden="true" className="h-px w-6 bg-amber-300/45" />
          <span>岩间静谧 · {route.tierLabel}</span>
          <span aria-hidden="true" className="h-px w-6 bg-amber-300/45" />
        </div>

        {/* Full Ceremonial Route Medallion Crest */}
        <div
          className="relative my-2 h-28 w-28 sm:h-32 sm:w-32"
          style={{
            transform: `scale(${emblemScale.toFixed(3)})`,
            filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.55))',
          }}
        >
          <RouteMedallionEmblem
            badge={badge}
            unlocked={true}
            bestStyle={bestStyle}
            isFreeSoloCleared={isFreeSoloCleared}
          />
        </div>

        {/* Route Name (Large Ceremonial Display Title) */}
        <h2 className="font-display mt-3 text-3xl font-extrabold tracking-wide text-[#F6F3EC] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] sm:text-4xl">
          {route.isDailyChallenge ? `今日神山 · ${route.name}` : route.name}
        </h2>

        {/* Real-World Route & Grade / Length Metadata (Zero-Pill Editorial Hairline Typography) */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs font-semibold tracking-wider text-slate-300 font-mono-tabular sm:text-sm">
          <span className="text-[#F59E0B]">{route.grade}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>{route.heightM}m</span>
          {route.realName && (
            <>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-200/90">{route.realName}</span>
            </>
          )}
          {isFreeSolo && (
            <>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-red-300">徒手无保护</span>
            </>
          )}
        </div>

        {/* Ceremonial Badge Motto */}
        <p className="mt-3 max-w-xs text-xs tracking-[0.18em] text-slate-400">
          {badge.title} — {badge.emblemMotto ?? route.location ?? badge.subtitle}
        </p>

        {/* Minimalist Hairline Progress Trace */}
        <div className="mt-6 h-[1.5px] w-36 overflow-hidden bg-white/15">
          <div
            className="h-full bg-amber-300/80"
            style={{
              width: `${Math.round(progress * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Restrained Skip Cue after initial 0.55s breath */}
      {canSkip && contentOpacity > 0.08 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="absolute right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 text-[11px] tracking-[0.16em] text-slate-400/85 transition-opacity hover:text-slate-200"
          style={{ opacity: Math.min(0.85, contentOpacity) }}
        >
          轻点跳过 →
        </button>
      )}
    </div>
  );
}
