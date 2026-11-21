import { useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { BADGES, ROUTES } from '../game/mountain';
import {
  ClimbAssessment,
  ClimberGender,
  ClimbStats,
  ClimbStyle,
  GamePhase,
  OverallRatingGrade,
  RouteConfig,
  RouteId,
  SummitSequenceStage,
} from '../game/types';
import { AssetRegistry } from '../visual/AssetRegistry';
import { RouteMedallionEmblem } from './ClimbBadge';

interface SummitOverlayProps {
  phase: GamePhase;
  route: RouteConfig;
  stats: ClimbStats;
  climbStyle: ClimbStyle;
  summitProgress: number;
  summitStage?: SummitSequenceStage;
  onAdvanceSummitStage?: () => void;
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
  supportsRouteBook?: boolean;
  onReviewRoadbook?: () => void;
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

interface FirstAscentProfile {
  year: string;
  pioneer: string;
  pioneerEn: string;
  bio: string;
  achievement: string;
}

const ROUTE_FIRST_ASCENTS: Record<RouteId, FirstAscentProfile> = {
  kids: {
    year: '1933',
    pioneer: '理查德·伦纳德 · 朱尔斯·艾希霍恩',
    pioneerEn: 'Richard Leonard & Jules Eichorn',
    bio: '山脉俱乐部攀岩分部创始人，将现代动态保护技术与花岗岩摩擦脚法引入优胜美地山谷。',
    achievement: '奠定了天鹅岩缓壁作为优胜美地攀岩摇篮的传统，启蒙了数代大岩壁攀登者。',
  },
  intro: {
    year: '1928',
    pioneer: '罗伯特·安德希尔 · 米丽娅姆·奥布莱恩',
    pioneerEn: 'Robert Underhill & Miriam O’Brien',
    bio: '北美现代技术攀岩先驱伉俪，致力于将阿尔卑斯绳组协作理念带入新英格兰花岗岩壁。',
    achievement: '在白马岩脊开辟早期经典缓壁线路，开启了美国东海岸花岗岩板攀登的黄金序幕。',
  },
  beginner: {
    year: '1936',
    pioneer: '摩根·哈里斯 · 肯·亚当 · 奥利夫·戴尔',
    pioneerEn: 'Morgan Harris, Ken Adam & Olive Dyer',
    bio: '优胜美地早期技术攀登探索者，在装备极为简陋的年代勇于向谷底高耸岩壁发起首攻。',
    achievement: '首攀长达十五段的皇家拱门，成为优胜美地山谷史上首条大型多段经典线路。',
  },
  'beginner-plus': {
    year: '1941',
    pioneer: '弗里茨·维斯纳 · 汉斯·克劳斯',
    pioneerEn: 'Fritz Wiessner & Hans Kraus',
    bio: '德裔攀岩传奇与运动医学先驱，以近乎零器械的纯粹自由攀登风格闻名于世。',
    achievement: '在高空悬廊屋檐完成惊世首攀，铸就肖旺根克山脉最具传奇色彩的传统攀标杆。',
  },
  intermediate: {
    year: '1965',
    pioneer: '埃里克·贝克 · 吉姆·布里德韦尔 · 克里斯·弗雷德里克斯',
    pioneerEn: 'Eric Beck, Jim Bridwell & Chris Fredericks',
    bio: '优胜美地黄金时代“石猴”代表人物，以大胆的传统自由攀与先锋审美改写了岩壁历史。',
    achievement: '循半穹顶西南壁蜿蜒突起的天然岩脉开辟蛇脊壁，缔造全球最具辨识度的经典路线之一。',
  },
  'intermediate-plus': {
    year: '1971',
    pioneer: '迈克·韦斯 · 杰夫·洛',
    pioneerEn: 'Mike Weis & Jeff Lowe',
    bio: '北美大岩壁与阿尔卑斯混合攀登革新者，以敏锐的读线眼光挑战宏伟红砂岩绝壁。',
    achievement: '首攀锡安峡谷 360 米垂直红砂岩指缝长墙月光拱壁，见证自由攀登半世纪的飞跃。',
  },
  advanced: {
    year: '1938',
    pioneer: '杰克·杜兰斯 · 哈里森·巴特沃斯',
    pioneerEn: 'Jack Durrance & Harrison Butterworth',
    bio: '美国山地作战与早期传统攀先驱，以冷静的裂隙技术与果敢决断著称。',
    achievement: '仅凭麻绳与手工铁钉在魔鬼塔六棱玄武岩柱间开辟裂隙首攀，成为北美攀岩史经典地标。',
  },
  'advanced-crux': {
    year: '1968',
    pioneer: '汤姆·弗罗斯特 · 桑迪·比尔 · 吉姆·麦卡锡',
    pioneerEn: 'Tom Frost, Sandy Bill & Jim McCarthy',
    bio: '优胜美地大岩壁黄金一代核心成员，兼具卓越的器械设计与纯粹阿尔卑斯探索精神。',
    achievement: '深入加拿大“不可攀登峰群”，在极地寒风中首登被誉为世界最美花岗岩尖塔的莲花塔。',
  },
  'master-1': {
    year: '1938',
    pioneer: '安德尔·赫克迈尔 · 路德维希·弗尔格 · 海因里希·哈勒 · 弗里茨·卡斯帕雷克',
    pioneerEn: 'Heckmair, Vörg, Harrer & Kasparek',
    bio: '德奥两支攀登队在暴雪肆虐的岩壁中途相遇并临时结组，以生死托付诠释高山精神。',
    achievement: '历经三天三夜穿越“白色蜘蛛”雪崩绝壁，攻克阿尔卑斯山脉“最后一道未解难题”艾格峰北壁。',
  },
  'master-2': {
    year: '1931',
    pioneer: '弗朗茨·施密德 · 托尼·施密德',
    pioneerEn: 'Franz Schmid & Toni Schmid',
    bio: '来自慕尼黑的年轻攀登兄弟，为节省旅费骑自行车数百公里奔赴采尔马特山脚。',
    achievement: '顶着冰雹与雷暴完成马特洪峰北壁史诗级首攀，凭此壮举荣获 1932 年奥运会登山金质勋章。',
  },
  'master-3': {
    year: '2015',
    pioneer: '汤米·考德威尔 · 凯文·乔格森',
    pioneerEn: 'Tommy Caldwell & Kevin Jorgeson',
    bio: '当代大岩壁自由攀登双璧，以七年如一日的勘线执念挑战看似无点可抓的酋长岩东壁。',
    achievement: '高空吊帐坚守十九天完成黎明之墙全段自由首攀，树立人类大岩壁攀登的最高丰碑。',
  },
};

const DAILY_FIRST_ASCENT: FirstAscentProfile = {
  year: '今日首攀',
  pioneer: '未知岩壁开拓者',
  pioneerEn: 'Alpine First Ascent',
  bio: '每一条尚未被命名的山脊，都在等待第一双读懂岩石纹路的手。',
  achievement: '在瞬息万变的今日山壁中独立完成首攀勘线，写下属于此日的第一份登顶记录。',
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
  summitStage,
  onAdvanceSummitStage,
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
  supportsRouteBook = false,
  onReviewRoadbook,
}: SummitOverlayProps) {
  const genderLabel = climberGender === 'female' ? '女' : '男';
  const [hideForView, setHideForView] = useState(false);
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2>(0);
  const [stageEntered, setStageEntered] = useState(false);
  const [canAdvanceStage, setCanAdvanceStage] = useState(false);
  const [badgeLit, setBadgeLit] = useState(false);

  // Authoritative summit sequence stage driven by App.tsx (with graceful standalone fallback)
  const resolvedStage: SummitSequenceStage =
    summitStage ??
    (summitProgress < 0.86
      ? 'PAN_REVEAL'
      : fallbackStep === 0
        ? 'PIONEER_REVEAL'
        : fallbackStep === 1
          ? 'QUOTE_REVEAL'
          : 'MODAL_READY');

  useEffect(() => {
    setHideForView(false);
    setFallbackStep(0);
    setStageEntered(false);
    setCanAdvanceStage(false);
    setBadgeLit(false);
  }, [route.id, phase]);

  // Smooth fade-in and tap guard for Act 1 (PIONEER_REVEAL) and Act 2 (QUOTE_REVEAL)
  useEffect(() => {
    if (
      phase !== 'SUMMIT' ||
      (resolvedStage !== 'PIONEER_REVEAL' && resolvedStage !== 'QUOTE_REVEAL')
    ) {
      setStageEntered(false);
      setCanAdvanceStage(false);
      return;
    }
    setStageEntered(false);
    setCanAdvanceStage(false);
    const rafId = window.requestAnimationFrame(() => {
      setStageEntered(true);
    });
    const unlockTimer = window.setTimeout(() => {
      setCanAdvanceStage(true);
    }, 550);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(unlockTimer);
    };
  }, [phase, resolvedStage]);

  // Ceremonial badge light-up trigger when Act 3 modal opens
  useEffect(() => {
    if (phase !== 'SUMMIT' || resolvedStage !== 'MODAL_READY') {
      setBadgeLit(false);
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      setBadgeLit(true);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, resolvedStage]);

  const handleConfirmStage = () => {
    if (!canAdvanceStage) return;
    if (onAdvanceSummitStage) {
      onAdvanceSummitStage();
    } else {
      setFallbackStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2));
    }
  };

  useEffect(() => {
    if (
      phase !== 'SUMMIT' ||
      (resolvedStage !== 'PIONEER_REVEAL' && resolvedStage !== 'QUOTE_REVEAL') ||
      !canAdvanceStage
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        if (onAdvanceSummitStage) {
          onAdvanceSummitStage();
        } else {
          setFallbackStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, resolvedStage, canAdvanceStage, onAdvanceSummitStage]);

  const curIdx = ROUTES.findIndex((r) => r.id === route.id);
  const nextRoute = curIdx >= 0 && curIdx < ROUTES.length - 1 ? ROUTES[curIdx + 1] : null;
  const badge = BADGES.find((b) => b.id === route.id) ?? BADGES[0];
  const firstAscent = route.isDailyChallenge
    ? DAILY_FIRST_ASCENT
    : (ROUTE_FIRST_ASCENTS[route.id] ?? DAILY_FIRST_ASCENT);

  const styleTitle =
    climbStyle === 'onsight'
      ? '盲攀零坠落'
      : climbStyle === 'redpoint'
        ? '红点零坠落'
        : '完攀登顶';

  if (phase === 'SUMMIT') {
    // Stage 1 (PAN_REVEAL): Unobstructed panoramic camera pan revealing the full mountain silhouette
    if (resolvedStage === 'PAN_REVEAL') {
      // Whisper-light arrival caption only during the initial summit crest beat, fading out
      // completely before the wide mountain silhouette unfolds.
      const introAlpha =
        summitProgress < 0.05
          ? summitProgress / 0.05
          : summitProgress < 0.18
            ? 1
            : Math.max(0, 1 - (summitProgress - 0.18) / 0.12);
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

    // Act 1 (PIONEER_REVEAL): Real-world first ascensionist biography & historical achievement
    if (resolvedStage === 'PIONEER_REVEAL') {
      return (
        <button
          type="button"
          onClick={handleConfirmStage}
          aria-label="轻触屏幕继续查看攀登评级"
          className={`fixed inset-0 z-20 flex flex-col items-center justify-between bg-gradient-to-b from-[#0B0F17]/72 via-[#0B0F17]/54 to-[#0B0F17]/86 px-6 py-10 text-center transition-opacity duration-700 ease-out focus:outline-none sm:py-14 ${
            canAdvanceStage ? 'cursor-pointer' : 'cursor-default'
          }`}
          style={{ opacity: stageEntered ? 1 : 0 }}
        >
          {/* Top Route Context */}
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <div className="text-[11px] font-medium tracking-[0.26em] text-amber-200/85">
              第一幕 · 历史首攀者
            </div>
            <div className="font-display text-lg font-bold tracking-[0.12em] text-white">
              {route.name}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300/90">
              {route.realName && <span>{route.realName}</span>}
              {route.realName && route.location && <span aria-hidden="true">·</span>}
              {route.location && <span>{route.location}</span>}
            </div>
          </div>

          {/* Centerpiece First Ascensionist Monograph */}
          <div
            className="my-auto flex w-full max-w-lg flex-col items-center px-2 transition-transform duration-700 ease-out"
            style={{
              transform: stageEntered ? 'translateY(0px)' : 'translateY(14px)',
            }}
          >
            <div className="font-mono-tabular text-xs font-semibold tracking-[0.24em] text-amber-300">
              {firstAscent.year} · 首攀纪实
            </div>
            <h2
              className="font-display mt-3 text-2xl font-bold leading-snug tracking-[0.04em] text-white sm:text-3xl"
              style={{ textWrap: 'balance' }}
            >
              {firstAscent.pioneer}
            </h2>
            <div className="mt-1 text-xs tracking-[0.1em] text-slate-300/85">
              {firstAscent.pioneerEn}
            </div>

            <div className="my-5 h-px w-14 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />

            <p className="max-w-md text-sm leading-relaxed text-slate-100/92 sm:text-[15px]">
              {firstAscent.bio}
            </p>

            <div className="mt-5 w-full max-w-md border-t border-white/15 pt-4">
              <div className="text-[11px] font-medium tracking-[0.22em] text-amber-200/80">
                历史成就
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-50/95 sm:text-[15px]">
                {firstAscent.achievement}
              </p>
            </div>
          </div>

          {/* Bottom Continue Prompt */}
          <div
            className="pb-1 text-xs tracking-[0.24em] text-white/85 transition-opacity duration-500 ease-out"
            style={{ opacity: canAdvanceStage ? 1 : 0 }}
          >
            轻触屏幕，查看攀登评级
          </div>
        </button>
      );
    }

    // Act 2 (QUOTE_REVEAL): Route climbing rating & poetic mountaineering verse
    if (resolvedStage === 'QUOTE_REVEAL') {
      const isFreeSoloRun = isFreeSolo || Boolean(assessment?.isFreeSolo);
      const quote = selectSummitQuote(route, climbStyle, isFreeSoloRun);
      const stampUrl = assessment ? AssetRegistry.getRatingStampPath(assessment.ratingGrade) : null;

      return (
        <button
          type="button"
          onClick={handleConfirmStage}
          aria-label="轻触屏幕点亮徽章并查看复盘"
          className={`fixed inset-0 z-20 flex flex-col items-center justify-between bg-gradient-to-b from-[#0B0F17]/68 via-[#0B0F17]/50 to-[#0B0F17]/84 px-6 py-10 text-center transition-opacity duration-700 ease-out focus:outline-none sm:py-14 ${
            canAdvanceStage ? 'cursor-pointer' : 'cursor-default'
          }`}
          style={{ opacity: stageEntered ? 1 : 0 }}
        >
          {/* Top Route & Style Context */}
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <div className="text-[11px] font-medium tracking-[0.26em] text-amber-200/85">
              第二幕 · 攀登评级
            </div>
            <div className="font-display text-lg font-bold tracking-[0.12em] text-white">
              {route.name}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-amber-100/85">
              <span>{styleTitle}</span>
              {isFreeSoloRun && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">徒手无保护</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {route.grade} / {route.heightM}m
              </span>
            </div>
          </div>

          {/* Centerpiece Rating + Poetic Verse */}
          <div
            className="my-auto flex w-full max-w-lg flex-col items-center transition-transform duration-700 ease-out"
            style={{
              transform: stageEntered ? 'translateY(0px)' : 'translateY(14px)',
            }}
          >
            {assessment && (
              <div className="flex flex-col items-center">
                {stampUrl ? (
                  <img
                    src={stampUrl}
                    alt={`评级 ${assessment.ratingGrade}`}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)]"
                  />
                ) : (
                  <div
                    className={`flex h-20 w-20 flex-col items-center justify-center border-2 border-[#F4F1EA] shadow-[4px_4px_0px_rgba(0,0,0,0.55)] ${RATING_BADGE_STYLE[assessment.ratingGrade]}`}
                  >
                    <span className="font-display text-3xl font-extrabold leading-none">
                      {assessment.ratingGrade}
                    </span>
                    <span className="mt-1 font-mono-tabular text-[11px] font-bold">
                      {assessment.overallScore}分
                    </span>
                  </div>
                )}

                <div className="font-display mt-3 text-lg font-bold tracking-[0.12em] text-amber-200">
                  {assessment.ratingTitle}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-200/90 font-mono-tabular">
                  <span>实评难度 {assessment.assessedGrade}</span>
                  <span aria-hidden="true">·</span>
                  <span>{assessment.gradeDeltaLabel}</span>
                </div>
              </div>
            )}

            <div className="my-6 h-px w-16 bg-gradient-to-r from-transparent via-amber-200/75 to-transparent" />

            <p
              className="font-display text-xl leading-[1.85] font-semibold tracking-[0.08em] text-white drop-shadow-[0_2px_14px_rgba(8,12,20,0.88)] sm:text-2xl sm:leading-[1.9]"
              style={{ textWrap: 'balance' }}
            >
              <span className="block">{quote.line1}</span>
              <span className="block">{quote.line2}</span>
            </p>
            <div className="mt-3.5 flex items-center gap-3 text-xs tracking-[0.2em] text-amber-100/85">
              <span className="h-px w-6 bg-amber-200/50" />
              <span>{quote.footnote}</span>
              <span className="h-px w-6 bg-amber-200/50" />
            </div>
            <div className="mt-2 text-[11px] tracking-[0.18em] text-slate-300/85">
              —— {climberName}
            </div>
          </div>

          {/* Bottom Continue Prompt */}
          <div
            className="pb-1 text-xs tracking-[0.24em] text-white/85 transition-opacity duration-500 ease-out"
            style={{ opacity: canAdvanceStage ? 1 : 0 }}
          >
            轻触屏幕，点亮徽章并复盘
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
            显示复盘
          </button>
        </div>
      );
    }

    // Act 3 (MODAL_READY): Concise end-game modal spotlighting illuminated badge & climb review only
    const isFreeSoloCleared = isFreeSolo || Boolean(assessment?.isFreeSolo);

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center p-3 sm:items-center sm:p-6">
        <div className="pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto border-2 border-[#141820] bg-[#F4F1EA] p-5 text-[#141820] shadow-[6px_6px_0px_#141820]">
          {/* Compact Header */}
          <div className="flex items-baseline justify-between gap-3 border-b border-[#141820]/15 pb-3">
            <h2 className="font-display truncate text-2xl font-bold tracking-tight text-[#141820]">
              {route.name}
            </h2>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600 font-mono-tabular whitespace-nowrap">
              <span>{route.grade}</span>
              <span aria-hidden="true">·</span>
              <span>{route.heightM}m</span>
              {assessment && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-[#EA580C]">{assessment.ratingGrade}</span>
                </>
              )}
            </div>
          </div>

          {/* Illuminated Badge Showcase */}
          <div className="flex flex-col items-center py-5 text-center">
            <div
              className="relative flex h-24 w-24 items-center justify-center transition-all duration-500 ease-out"
              style={{
                opacity: badgeLit ? 1 : 0,
                transform: badgeLit ? 'scale(1)' : 'scale(0.86)',
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-full opacity-80 blur-md"
                style={{
                  background: `radial-gradient(circle, ${badge.accentColor}55 0%, rgba(245,158,11,0.22) 52%, transparent 74%)`,
                }}
              />
              <div className="relative h-20 w-20">
                <RouteMedallionEmblem
                  badge={badge}
                  unlocked
                  bestStyle={climbStyle}
                  isFreeSoloCleared={isFreeSoloCleared}
                />
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-[#EA580C]">
              <span>{newlyUnlockedBadge ? '徽章新点亮' : '徽章已点亮'}</span>
              <span aria-hidden="true">·</span>
              <span>{styleTitle}</span>
              {isFreeSoloCleared && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-red-700">徒手</span>
                </>
              )}
            </div>
            <div className="font-display mt-1 text-xl font-bold tracking-tight text-[#141820]">
              {badge.title}
            </div>
            {badge.emblemMotto && (
              <div className="mt-0.5 text-xs text-slate-500">{badge.emblemMotto}</div>
            )}
          </div>

          {/* Concise Climb Review Telemetry */}
          <div className="border-t border-[#141820]/15 pt-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="text-[11px] text-slate-500">耗时</div>
                <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                  {formatDuration(stats.elapsedSec)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">步数</div>
                <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                  {stats.movesMade}
                </div>
              </div>
              {isFreeSoloCleared ? (
                <>
                  <div>
                    <div className="text-[11px] text-slate-500">保护</div>
                    <div className="mt-0.5 font-bold text-red-700">无保护</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">方式</div>
                    <div className="mt-0.5 font-bold text-[#B45309]">徒手独攀</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[11px] text-slate-500">岩钉</div>
                    <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                      {stats.pitonsPlaced}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">救险</div>
                    <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                      {stats.fallsCaught}
                    </div>
                  </div>
                </>
              )}
            </div>

            {assessment && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#141820]/10 pt-3 text-center text-xs">
                <div>
                  <div className="text-[11px] text-slate-500">均余体力</div>
                  <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                    {assessment.avgStaminaRemainingPct}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">失误率</div>
                  <div className="mt-0.5 font-bold font-mono-tabular text-[#141820]">
                    {assessment.keyActionMistakeRatePct}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">实评难度</div>
                  <div className="mt-0.5 font-bold font-mono-tabular text-[#EA580C]">
                    {assessment.assessedGrade}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-5 space-y-2 border-t border-[#141820]/15 pt-4">
            {nextRoute && !route.isDailyChallenge && (
              <button
                type="button"
                onClick={() => onNextRoute(nextRoute)}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#EA580C] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_#141820] whitespace-nowrap hover:bg-[#DC4C06]"
              >
                挑战下一线 · {nextRoute.name}
              </button>
            )}
            <div
              className={`grid gap-2 ${
                supportsRouteBook && onReviewRoadbook ? 'grid-cols-4' : 'grid-cols-3'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setHideForView(true);
                  if (!isPlayingTrail) onToggleTrailPlayback();
                }}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                轨迹回放
              </button>
              {supportsRouteBook && onReviewRoadbook && (
                <button
                  type="button"
                  onClick={onReviewRoadbook}
                  className="min-h-[42px] border-2 border-[#141820] bg-[#141820] px-2 py-2 text-xs font-bold text-[#F4F1EA] whitespace-nowrap hover:bg-slate-800"
                >
                  复盘路书
                </button>
              )}
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[42px] border-2 border-[#141820] bg-white px-2 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-100"
              >
                重攀
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="min-h-[42px] border-2 border-[#141820] bg-[#EAE6DC] px-2 py-2 text-xs font-semibold text-[#141820] whitespace-nowrap hover:bg-slate-200"
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
            <span className="font-bold text-[#141820]">{route.name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {route.grade} · {route.heightM}m
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
            {supportsRouteBook && onReviewRoadbook && (
              <button
                type="button"
                onClick={onReviewRoadbook}
                className="min-h-[44px] w-full border-2 border-[#141820] bg-[#141820] px-4 py-2.5 text-xs font-bold text-[#F4F1EA] shadow-[3px_3px_0px_#EA580C] whitespace-nowrap hover:bg-slate-800"
              >
                复盘并修改路书
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
