import { useEffect, useState } from 'react';
import { Mountain, Play, Square } from 'lucide-react';
import { BADGES, ROUTES } from '../game/mountain';
import {
  ClimbAssessment,
  ClimberGender,
  ClimbStats,
  ClimbStyle,
  GamePhase,
  OverallRatingGrade,
  RouteConfig,
} from '../game/types';
import { AssetRegistry } from '../visual/AssetRegistry';
import { ClimbBadge } from './ClimbBadge';

interface SummitOverlayProps {
  phase: GamePhase;
  route: RouteConfig;
  stats: ClimbStats;
  climbStyle: ClimbStyle;
  summitProgress: number;
  hasCheckpoint: boolean;
  newlyUnlockedBadge: boolean;
  isPlayingTrail: boolean;
  fallDiagnosis?: string | null;
  assessment?: ClimbAssessment | null;
  isFreeSolo?: boolean;
  onToggleTrailPlayback: () => void;
  onRespawnCheckpoint: () => void;
  onRestart: () => void;
  onNextRoute: (next: RouteConfig) => void;
  onBackToMenu: () => void;
  climberName?: string;
  climberGender?: ClimberGender;
}

const RATING_BADGE_STYLE: Record<OverallRatingGrade, string> = {
  SSS: 'bg-gradient-to-br from-[#F59E0B] via-[#FDE68A] to-[#EA580C] text-[#141820] ring-2 ring-[#F59E0B]/60',
  'S+': 'bg-[#F59E0B] text-[#141820]',
  S: 'bg-emerald-600 text-white',
  A: 'bg-sky-700 text-white',
  B: 'bg-slate-700 text-white',
  C: 'bg-stone-600 text-white',
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${String(s).padStart(2, '0')}秒`;
}

interface SummitQuote {
  line1: string;
  line2: string;
  footnote: string;
}

const SUMMIT_QUOTES: SummitQuote[] = [
  {
    line1: '山从不许诺归途，',
    line2: '只向步履不停的人，展露云端的全貌。',
    footnote: '翻越岩壁，也翻越曾想松手的自己',
  },
  {
    line1: '你把指尖扣进沉默的岩缝，',
    line2: '群峰便把整片苍穹，托举到你眼前。',
    footnote: '高处无声，唯有风与心跳作答',
  },
  {
    line1: '所谓巅峰，并非征服了哪一座山，',
    line2: '而是在千仞绝壁之上，听见了自己沉稳的呼吸。',
    footnote: '孤山独影 · 与天地同频',
  },
  {
    line1: '每一步微小的重心转移，',
    line2: '终将在云海尽头，连成一条写给天空的诗行。',
    footnote: '致所有向高处仰望的灵魂',
  },
  {
    line1: '风雪会抹去岩壁上的镁粉，',
    line2: '却抹不掉你曾立于山巅、俯瞰人间的那一刻。',
    footnote: '山在那里，而你已抵达',
  },
];

const FREE_SOLO_QUOTE: SummitQuote = {
  line1: '无绳、无钉、无退路，',
  line2: '唯有绝对的专注，将绝壁走成了通向苍穹的坦途。',
  footnote: '徒手独攀 · 极致孤勇的见证',
};

const ONSIGHT_QUOTE: SummitQuote = {
  line1: '未曾试探，未曾跌落，',
  line2: '与陌生岩壁的初次对话，你一气呵成写就巅峰。',
  footnote: '盲攀零坠落 · 与山峰最纯粹的相逢',
};

function selectSummitQuote(
  route: RouteConfig,
  climbStyle: ClimbStyle,
  isFreeSolo: boolean
): SummitQuote {
  if (isFreeSolo) return FREE_SOLO_QUOTE;
  if (climbStyle === 'onsight') return ONSIGHT_QUOTE;
  let hash = 0;
  for (let i = 0; i < route.id.length; i++) {
    hash = (hash * 31 + route.id.charCodeAt(i)) >>> 0;
  }
  return SUMMIT_QUOTES[hash % SUMMIT_QUOTES.length];
}

export function SummitOverlay({
  phase,
  route,
  stats,
  climbStyle,
  summitProgress,
  hasCheckpoint,
  newlyUnlockedBadge,
  isPlayingTrail,
  fallDiagnosis,
  assessment,
  isFreeSolo = false,
  onToggleTrailPlayback,
  onRespawnCheckpoint,
  onRestart,
  onNextRoute,
  onBackToMenu,
  climberName = '孤影',
  climberGender = 'male',
}: SummitOverlayProps) {
  const genderLabel = climberGender === 'female' ? '女' : '男';
  const [hideForView, setHideForView] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [quoteAcknowledged, setQuoteAcknowledged] = useState(false);
  const wideArtSrc = AssetRegistry.getWideEndingPath(route.palette);

  useEffect(() => {
    setImgFailed(false);
    setHideForView(false);
    setQuoteAcknowledged(false);
  }, [route.id, phase]);

  // Reset quote acknowledgement if a fresh summit animation starts
  useEffect(() => {
    if (phase === 'SUMMIT' && summitProgress < 0.15) {
      setQuoteAcknowledged(false);
    }
  }, [phase, summitProgress]);

  const isQuoteStageVisible = phase === 'SUMMIT' && summitProgress >= 0.74 && !quoteAcknowledged;
  const canDismissQuote = phase === 'SUMMIT' && summitProgress >= 0.82 && !quoteAcknowledged;

  useEffect(() => {
    if (!canDismissQuote) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setQuoteAcknowledged(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canDismissQuote]);

  const curIdx = ROUTES.findIndex((r) => r.id === route.id);
  const nextRoute = curIdx >= 0 && curIdx < ROUTES.length - 1 ? ROUTES[curIdx + 1] : null;
  const badge = BADGES.find((b) => b.id === route.id) ?? BADGES[0];

  const styleTitle =
    climbStyle === 'onsight'
      ? '盲攀零坠落 ★'
      : climbStyle === 'redpoint'
        ? '红点零坠落 ◆'
        : '完攀登顶';

  if (phase === 'SUMMIT') {
    // Stage 1 (0.00 -> 0.74): Pure unobstructed camera pull-back revealing the full mountain silhouette
    if (summitProgress < 0.74) {
      // Whisper-light crest caption only during initial arrival (fades out cleanly before wide panorama)
      const introAlpha =
        summitProgress < 0.06
          ? summitProgress / 0.06
          : summitProgress < 0.24
            ? 1
            : Math.max(0, 1 - (summitProgress - 0.24) / 0.16);
      if (introAlpha <= 0.01) return null;
      return (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex justify-center px-6 transition-opacity duration-300"
          style={{ opacity: introAlpha }}
        >
          <div className="text-center">
            <div className="text-[11px] tracking-[0.28em] text-amber-100/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
              {climberName} · 已登峰顶
            </div>
            <div className="font-display mt-1 text-lg font-bold tracking-[0.14em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {route.name}
            </div>
          </div>
        </div>
      );
    }

    // Stage 2 (0.74+ until player taps/clicks): Poetic mountaineering verse over the full mountain panorama
    if (isQuoteStageVisible) {
      const quote = selectSummitQuote(route, climbStyle, isFreeSolo || Boolean(assessment?.isFreeSolo));
      const fadeRaw = Math.max(0, Math.min(1, (summitProgress - 0.74) / 0.16));
      const quoteAlpha = fadeRaw * fadeRaw * (3 - 2 * fadeRaw);
      const promptRaw = Math.max(0, Math.min(1, (summitProgress - 0.84) / 0.12));
      const promptAlpha = promptRaw * promptRaw * (3 - 2 * promptRaw);

      return (
        <button
          type="button"
          onClick={() => {
            if (canDismissQuote) {
              setQuoteAcknowledged(true);
            }
          }}
          aria-label="轻触屏幕查看登顶战绩"
          className="fixed inset-0 z-20 flex cursor-pointer flex-col items-center justify-between px-6 py-12 text-center focus:outline-none sm:py-16"
          style={{ opacity: quoteAlpha }}
        >
          {/* Subtle summit inscription at upper sky */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-[0.26em] text-amber-100/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
              <span>{route.isDailyChallenge ? '今日神山' : route.tierLabel}</span>
              <span className="opacity-55">·</span>
              <span className="font-mono-tabular">{route.grade}</span>
              <span className="opacity-55">·</span>
              <span className="font-mono-tabular">{route.heightM}m</span>
            </div>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
          </div>

          {/* Poetic Mountaineering Verse anchored cleanly over lower-middle panorama */}
          <div
            className="mt-auto mb-10 flex max-w-lg flex-col items-center sm:mb-14"
            style={{
              transform: `translateY(${(1 - quoteAlpha) * 14}px)`,
              transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <p className="font-display text-xl leading-[1.85] font-semibold tracking-[0.1em] text-white drop-shadow-[0_2px_16px_rgba(8,12,20,0.92)] sm:text-2xl sm:leading-[1.9]">
              <span className="block">{quote.line1}</span>
              <span className="block">{quote.line2}</span>
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs tracking-[0.22em] text-amber-100/85 drop-shadow-[0_1px_8px_rgba(8,12,20,0.9)]">
              <span className="h-px w-6 bg-amber-200/50" />
              <span>{quote.footnote}</span>
              <span className="h-px w-6 bg-amber-200/50" />
            </div>
            <div className="mt-2.5 text-[11px] tracking-[0.2em] text-white/80 drop-shadow-[0_1px_8px_rgba(8,12,20,0.92)]">
              —— {climberName} · 登顶 {route.name}
            </div>
          </div>

          {/* Breathing tap-to-continue cue */}
          <div
            className="pb-1 text-xs tracking-[0.24em] text-white/85 drop-shadow-[0_1px_8px_rgba(8,12,20,0.95)]"
            style={{ opacity: promptAlpha }}
          >
            <span className="animate-pulse">轻触屏幕任意位置，查看登顶战绩</span>
          </div>
        </button>
      );
    }

    if (hideForView) {
      return (
        <div className="fixed bottom-5 right-5 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTrailPlayback}
            className="flex min-h-[44px] items-center gap-1.5 border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0"
          >
            {isPlayingTrail ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlayingTrail ? '停止回放' : '轨迹回放'}</span>
          </button>
          <button
            type="button"
            onClick={() => setHideForView(false)}
            className="min-h-[44px] border-2 border-[#141820] bg-[#F4F1EA] px-4 py-2 text-xs font-bold text-[#141820] shadow-[3px_3px_0px_#141820] whitespace-nowrap shrink-0"
          >
            显示战绩
          </button>
        </div>
      );
    }

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8">
        <div className="pointer-events-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto border-2 border-[#141820] bg-[#F4F1EA] p-4 text-[#141820] shadow-[6px_6px_0px_#141820] sm:p-5">
          {/* Summit Graphic-Novel Illustration */}
          <div className="relative aspect-video w-full overflow-hidden border-2 border-[#141820] bg-gradient-to-br from-slate-700 via-slate-800 to-amber-900">
            {!imgFailed ? (
              <img
                src={wideArtSrc}
                alt={`${route.grade} ${route.name} 登顶广角插画`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover object-[50%_34%]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-amber-100">
                <Mountain className="h-9 w-9" />
                <span className="text-xs font-semibold">{route.name} · 山巅纪念插画</span>
              </div>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#EA580C]">
            <span>{styleTitle}</span>
            {isFreeSolo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-red-700">徒手无保护</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{route.isDailyChallenge ? `今日神山 (${route.dailyDateKey})` : route.tierLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.grade} / {route.heightM}m
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#141820] sm:text-3xl">
              {route.name}
            </h2>
            <span className="border border-[#141820]/30 bg-[#EAE6DC] px-2 py-0.5 text-[11px] font-bold text-[#141820]">
              攀登者：{climberName}（{genderLabel}）
            </span>
          </div>

          <div className="mt-3">
            <ClimbBadge
              badge={badge}
              unlocked
              bestStyle={climbStyle}
              isFreeSoloCleared={isFreeSolo || assessment?.isFreeSolo}
              highlightNew={newlyUnlockedBadge}
            />
          </div>

          {/* Tabular Telemetry */}
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
            {isFreeSolo || assessment?.isFreeSolo ? (
              <>
                <div>
                  <div className="text-[11px] text-slate-500">保护</div>
                  <div className="mt-0.5 font-semibold text-red-700">无保护</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">方式</div>
                  <div className="mt-0.5 font-semibold text-[#B45309]">徒手独攀</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-[11px] text-slate-500">岩钉</div>
                  <div className="mt-0.5 font-semibold font-mono-tabular">{stats.pitonsPlaced}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">救险</div>
                  <div className="mt-0.5 font-semibold font-mono-tabular">{stats.fallsCaught}</div>
                </div>
              </>
            )}
          </div>

          {/* Post-Climb Smart Technical Difficulty & Overall Rating */}
          {assessment && (
            <div
              className={`mt-3 border-2 p-2.5 text-xs ${
                assessment.ratingGrade === 'SSS'
                  ? 'border-[#B45309] bg-[#FFFBEB]'
                  : 'border-[#141820] bg-[#EAE6DC]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center border-2 border-[#141820] shadow-[2px_2px_0px_#141820] ${RATING_BADGE_STYLE[assessment.ratingGrade]}`}
                >
                  <span className="font-display text-xl font-extrabold leading-none">
                    {assessment.ratingGrade}
                  </span>
                  <span className="mt-0.5 font-mono-tabular text-[10px] font-bold opacity-90">
                    {assessment.overallScore}分
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="font-bold text-[#141820]">{assessment.ratingTitle}</span>
                  </div>
                  <div className="text-[11px] text-slate-800">
                    实际难度{' '}
                    <span className="font-mono-tabular font-bold text-[#EA580C]">
                      {assessment.assessedGrade}
                    </span>{' '}
                    <span className="text-slate-600">· {assessment.gradeDeltaLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-700 font-mono-tabular">
                    <span>
                      耗体 {assessment.staminaConsumedTotal} · 回复 {assessment.staminaRecoveredTotal}（均余 {assessment.avgStaminaRemainingPct}%）
                    </span>
                    <span>
                      失误率 {assessment.keyActionMistakeRatePct}% · {assessment.holdDensityLabel}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 border-t border-[#141820]/15 pt-1.5 text-[11px] leading-snug text-slate-700">
                {assessment.summaryNote}
              </p>
              {assessment.roadbookNote && (
                <p className="mt-1 text-[11px] font-medium leading-snug text-sky-900">
                  路书读线：{assessment.roadbookNote}
                </p>
              )}
              {assessment.tributeNote && (
                <div className="mt-2 border-l-4 border-[#B45309] bg-[#FEF3C7]/85 px-2.5 py-2 text-[11px] leading-relaxed text-[#78350F]">
                  <div className="font-bold text-[#92400E]">
                    致敬徒手攀登传奇 · Alex Honnold（亚历克斯·霍诺德）
                  </div>
                  <p className="mt-0.5">{assessment.tributeNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Clean Two-Tier Action Hierarchy */}
          <div className="mt-4 space-y-2 border-t border-slate-300 pt-3">
            {nextRoute && !route.isDailyChallenge && (
              <button
                type="button"
                onClick={() => onNextRoute(nextRoute)}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap hover:bg-[#DC4C06]"
              >
                挑战下一线 · {nextRoute.tierLabel}（{nextRoute.grade}）
              </button>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setHideForView(true);
                  if (!isPlayingTrail) onToggleTrailPlayback();
                }}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                轨迹回放
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                重攀
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="min-h-[42px] border-2 border-[#141820] bg-[#EAE6DC] px-2.5 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-200"
              >
                选线
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'FALLEN') {
    const rawProgress = (stats.maxAltitudeM / Math.max(1, route.heightM)) * 100;
    const progressPct =
      stats.maxAltitudeM <= 0.05 ? 0 : Math.min(99, Math.max(1, Math.round(rawProgress)));
    const remainingM = Math.max(0.1, route.heightM - stats.maxAltitudeM);

    const stageInfo =
      progressPct < 20
        ? {
            label: '起攀适应段',
            summary: `本次已攀登 ${progressPct}%（最高 ${stats.maxAltitudeM.toFixed(1)}m），在起步阶段意外脱手。现实攀岩中起攀最容易“手比脚快”，刚离地就靠小臂硬拉，往往还没进入节奏就失去平衡。`,
          }
        : progressPct < 50
          ? {
              label: '中下段节奏期',
              summary: `本次已攀登 ${progressPct}%（最高 ${stats.maxAltitudeM.toFixed(1)}m），已经顺利打开起攀节奏。这一高度开始考验耐力分配与脚法转换，放慢频率、多用腿部支撑能明显走得更远。`,
            }
          : progressPct < 80
            ? {
                label: '中上段难点区（Crux）',
                summary: `本次已攀登 ${progressPct}%（最高 ${stats.maxAltitudeM.toFixed(1)}m），已挺进整条线路的核心攻坚段！越往高处岩点越吃角度与重心控制，切忌急躁盲目向上够点。`,
              }
            : {
                label: '冲顶临门一脚',
                summary: `本次已攀登 ${progressPct}%（距顶峰仅差 ${remainingM.toFixed(1)}m）！非常可惜，高空前臂“泵臂（乳酸堆积）”叠加冲顶心切，最容易在最后几步忽略脚点与安全保护。`,
              };

    const diag = fallDiagnosis ?? '';
    const techniqueTips: { title: string; detail: string }[] = [];

    if (diag.includes('锈蚀')) {
      techniqueTips.push(
        {
          title: '不盲信老旧锈钉 · 做好冗余保护',
          detail: '野外旧钉受风化强度难测，路过关键路段时补打一枚可靠新钉做冗余保护（Back-up），才能在意外打滑时稳稳拉停。',
        },
        {
          title: '难点前主动布设岩钉（降低冲坠系数）',
          detail: '先锋攀登切忌“省钉”，进入高难地形或横移前就应打入岩钉挂绳，缩短下坠距离与冲击伤。',
        }
      );
    } else if (diag.includes('耐力耗尽') || diag.includes('无力')) {
      techniqueTips.push(
        {
          title: '直臂悬垂 · 以腿代手',
          detail: '尽量伸直手臂把体重挂在骨骼上，别全程像引体向上一样屈臂硬撑；把 70% 以上的体重交给双脚蹬踩，能大幅延缓小臂力竭。',
        },
        {
          title: '节奏停顿 · 轮流甩手排酸',
          detail: '到达大把手或稳固三点姿态时，主动停下轮流「甩手放松（Shake Out）」，让前臂血液回流后再进入下一段难点。',
        }
      );
    } else if (diag.includes('侧拉') || diag.includes('反扣') || diag.includes('重心方向')) {
      techniqueTips.push(
        {
          title: '重心对抗发力（Opposition）',
          detail: '侧拉点需把身体向相反一侧倾斜，让拉力垂直压在岩点边缘；反扣点（Undercling）则要抬高双脚顶住，靠手脚对抗锁稳。',
        },
        {
          title: '贴壁送髋（Hip-in）',
          detail: '及时用「左倾/右倾」调整骨盆贴近岩壁，重心越靠里，手指承受的向外掀翻力越小。',
        }
      );
    } else if (diag.includes('镁粉') || diag.includes('冰霜') || diag.includes('湿滑')) {
      techniqueTips.push(
        {
          title: '提前补粉 · 拒绝临阵打滑',
          detail: '潮湿、结霜岩面摩擦力骤降，应在进入难段前的稳点提前涂抹镁粉吸汗增摩，切忌悬在半空打滑时再补救。',
        },
        {
          title: '静态控身（Static Move）',
          detail: '湿滑岩点忌讳猛冲猛拽，把双脚踩实后用平稳的静态重心转移过渡，手指受力更均匀。',
        }
      );
    } else if (diag.includes('跃抓') || diag.includes('腾空')) {
      techniqueTips.push(
        {
          title: '动态跃抓靠腿不靠手（Dyno）',
          detail: '跃抓爆发力来自下肢蹬伸而非手臂硬甩；起跳前务必踩实双脚、确认落点干爽并蓄足力，避免半途抓空。',
        },
        {
          title: '难点动态前先打保护钉',
          detail: '做高风险动态动作前先在稳点打入岩钉，即便指尖没扣住也能靠保护绳安全缓冲。',
        }
      );
    } else if (diag.includes('脆岩') || diag.includes('碎裂') || diag.includes('颤动')) {
      techniqueTips.push(
        {
          title: '试重快过 · 不久留松动岩块',
          detail: '户外传统攀遇到风化脆岩或震动点，应先轻踩试重、提前看好下一落点，一踩即过，避免把全身重量久压单点。',
        },
        {
          title: '起攀读线 · 识别陷阱支点',
          detail: '善用读线模式提前规划主路径，脆岩与偏远孤点往往是消耗体力的干扰分支，优先选择连贯稳固的路线。',
        }
      );
    } else if (diag.includes('过载') || diag.includes('失衡') || diag.includes('支撑点')) {
      techniqueTips.push(
        {
          title: '严守「三点固定」原则',
          detail: '现实攀岩讲究“留三动一”——伸手探点前先确认另外三肢（尤其是双脚）踩稳，避免悬空时支撑点骤减失衡。',
        },
        {
          title: '先上脚、再探手（Footwork First）',
          detail: '够不到高点时别硬扯手臂，先把双脚向上挪一格、顺势抬高骨盆，原本遥不可及的岩点自然会落进舒适抓握区。',
        }
      );
    } else {
      techniqueTips.push(
        {
          title: '难点前主动布设岩钉（降低冲坠系数）',
          detail: '先锋攀登切忌“省钉”，进入高难地形或横移前就应打入岩钉挂绳，缩短下坠距离与冲击伤。',
        },
        {
          title: '先上脚、再探手（Footwork First）',
          detail: '攀登时优先把双脚踩高、重心送稳，再伸手抓取上方岩点，既省力又能稳住身体贴壁。',
        }
      );
    }

    if (isFreeSolo) {
      techniqueTips[1] = {
        title: '徒手独攀 · 100% 确定性原则',
        detail: '无保护模式没有岩钉与存档容错，起攀前务必读透线路（Beta 预演），只做完全有把握的静态衔接，绝不拿体力赌运气。',
      };
    } else if (
      diag.includes('缺少已固定的岩钉保护') &&
      stats.pitonsPlaced === 0 &&
      progressPct >= 20 &&
      !diag.includes('锈蚀') &&
      !diag.includes('跃抓')
    ) {
      techniqueTips[1] = {
        title: '难点前主动布设岩钉（降低冲坠系数）',
        detail: '本次攀登尚未打入任何岩钉；先锋攀登讲究在进入难段前提前布设保护点，才能在失手时把冲坠距离降到安全范围。',
      };
    }

    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141820]/72 p-3 backdrop-blur-xs sm:p-4">
        <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto border-2 border-[#141820] bg-[#F4F1EA] p-4 text-[#141820] shadow-[6px_6px_0px_#141820] sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-red-700">
            <span>{isFreeSolo ? '徒手坠落 · 无保护' : '坠落复盘'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#141820]">{climberName}（{genderLabel}）</span>
            <span aria-hidden="true">·</span>
            <span>{route.isDailyChallenge ? '今日神山' : route.tierLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.grade} / {route.heightM}m
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isFreeSolo ? '徒手失手' : '失足脱手'}
            </h2>
            <span className="border border-[#141820]/25 bg-[#EAE6DC] px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {stageInfo.label}
            </span>
          </div>

          {/* Climbing Progress Panel */}
          <div className="mt-3 border-2 border-[#141820] bg-[#EAE6DC] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-[#141820]">本次攀登进度</span>
              <div className="flex items-baseline gap-1.5 font-mono-tabular">
                <span className="font-display text-2xl font-extrabold leading-none text-[#EA580C]">
                  {progressPct}%
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  ({stats.maxAltitudeM.toFixed(1)} / {route.heightM}m)
                </span>
              </div>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden border border-[#141820] bg-white/80">
              <div
                className="h-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] transition-[width] duration-300"
                style={{ width: `${Math.max(progressPct, progressPct > 0 ? 3 : 0)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 font-mono-tabular">
              <span>起攀 0m</span>
              <span>距顶峰还差 {remainingM.toFixed(1)}m</span>
              <span>峰顶 {route.heightM}m</span>
            </div>
          </div>

          {/* Compact Run Telemetry */}
          <div className="mt-2.5 grid grid-cols-4 gap-2 border-y border-slate-300 py-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-500">耗时</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">
                {formatDuration(stats.elapsedSec)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">步数</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">{stats.movesMade}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">{isFreeSolo ? '保护' : '岩钉'}</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">
                {isFreeSolo ? '无保护' : `${stats.pitonsPlaced} 枚`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">救险</div>
              <div className="mt-0.5 font-semibold font-mono-tabular">
                {stats.fallsCaught} 次
              </div>
            </div>
          </div>

          {/* Root Cause Diagnosis */}
          {fallDiagnosis && (
            <div className="mt-3 border-l-4 border-red-600 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-950">
              <div className="font-bold text-red-800">直接诱因</div>
              <p className="mt-0.5 font-medium">{fallDiagnosis}</p>
            </div>
          )}

          {/* Stage Coach Summary */}
          <p className="mt-2.5 text-xs leading-relaxed text-slate-700">{stageInfo.summary}</p>

          {/* Real-World Climbing Technique Advice */}
          <div className="mt-3 border border-[#141820]/20 bg-white/75 p-3">
            <div className="text-[11px] font-bold tracking-wide text-[#141820]">
              实战攀岩技巧建议
            </div>
            <div className="mt-2 space-y-2">
              {techniqueTips.map((tip) => (
                <div key={tip.title} className="text-xs leading-relaxed">
                  <div className="font-bold text-[#B45309]">{tip.title}</div>
                  <p className="mt-0.5 text-[11px] text-slate-700">{tip.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {hasCheckpoint && (
              <button
                type="button"
                onClick={onRespawnCheckpoint}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap hover:bg-[#DC4C06]"
              >
                从最近休息台恢复
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-4 py-2 text-xs font-bold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                从起点重攀
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="min-h-[42px] border-2 border-[#141820] bg-[#EAE6DC] px-4 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-200"
              >
                返回选线
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
