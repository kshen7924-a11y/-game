import {
  ActiveWeather,
  AltitudeDifficultyBin,
  BadgeInfo,
  ClimberSkinConfig,
  CloudBand,
  DistantBird,
  DistantPeak,
  Hold,
  HoldType,
  Ledge,
  LoadoutConfig,
  Piton,
  RockFacet,
  RouteConfig,
  RouteId,
  Vec2,
} from './types';

export const PIXELS_PER_METER = 30;

export const BADGES: BadgeInfo[] = [
  {
    id: 'kids',
    tier: 1,
    tierLabel: '儿童线',
    title: '童心初攀',
    subtitle: '完成 儿童线 · 5.4 阳光缓坡壁',
    grade: '5.4',
    accentColor: '#34D399',
  },
  {
    id: 'intro',
    tier: 2,
    tierLabel: '入门线',
    title: '晨雾初登',
    subtitle: '完成 入门线 · 5.6 晨雾花岗岩',
    grade: '5.6',
    accentColor: '#F59E0B',
  },
  {
    id: 'beginner',
    tier: 3,
    tierLabel: '初级线',
    title: '青石稳步',
    subtitle: '完成 初级线 · 5.7 青苔阶梯壁',
    grade: '5.7',
    accentColor: '#84CC16',
  },
  {
    id: 'beginner-plus',
    tier: 4,
    tierLabel: '初级进阶',
    title: '岩脉寻踪',
    subtitle: '完成 初级进阶 · 5.8 溪谷斜壁',
    grade: '5.8',
    accentColor: '#EAB308',
  },
  {
    id: 'intermediate',
    tier: 5,
    tierLabel: '中级线',
    title: '裂隙行者',
    subtitle: '完成 中级线 · 5.9 鹰嘴裂缝壁',
    grade: '5.9',
    accentColor: '#EA580C',
  },
  {
    id: 'intermediate-plus',
    tier: 6,
    tierLabel: '中级进阶',
    title: '风蚀破壁',
    subtitle: '完成 中级进阶 · 5.10b 风蚀屋檐线',
    grade: '5.10b',
    accentColor: '#0284C7',
  },
  {
    id: 'advanced',
    tier: 7,
    tierLabel: '高级线',
    title: '绝壁悬心',
    subtitle: '完成 高级线 · 5.10d 断崖绝壁',
    grade: '5.10d',
    accentColor: '#6366F1',
  },
  {
    id: 'advanced-crux',
    tier: 8,
    tierLabel: '高级难点线',
    title: '孤壁破关',
    subtitle: '完成 高级难点线 · 5.11c 鬼脊险关',
    grade: '5.11c',
    accentColor: '#A855F7',
  },
  {
    id: 'master-1',
    tier: 9,
    tierLabel: '大师线 1',
    title: '雪峰孤影',
    subtitle: '完成 大师线 1 · 5.12a 冰壁初章',
    grade: '5.12a',
    accentColor: '#10B981',
  },
  {
    id: 'master-2',
    tier: 10,
    tierLabel: '大师线 2',
    title: '极寒刃脊',
    subtitle: '完成 大师线 2 · 5.12d 寒风刃脊',
    grade: '5.12d',
    accentColor: '#06B6D4',
  },
  {
    id: 'master-3',
    tier: 11,
    tierLabel: '大师线 3',
    title: '神山之巅',
    subtitle: '完成 大师线 3 · 5.13c 苍穹绝巅',
    grade: '5.13c',
    accentColor: '#F43F5E',
  },
];

export const ROUTES: RouteConfig[] = [
  {
    id: 'kids',
    tier: 1,
    tierLabel: '儿童线',
    grade: '5.4',
    name: '阳光缓坡壁',
    subtitle: '儿童线 · 5.4 · 超大稳固抓点与教学',
    description:
      '专为零基础与儿童体验设计：全程晴朗微风、岩点宽大密集，几乎没有危险岩面，轻松掌握四肢移动节奏。',
    heightM: 24,
    drainMultiplier: 0.25,
    windMultiplier: 0.1,
    pitons: 6,
    chalkUses: 4,
    hasTutorial: true,
    palette: 'granite',
    seed: 105401,
    summitImage: '/src/assets/images/summit_art_granite_1795063543562.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 1.0,
        type: 'clear',
        label: '晴朗微风',
        intensity: 0.08,
        chalkDrainMult: 0.85,
        visibilityRadius: 1.15,
        fogOpacity: 0,
      },
    ],
  },
  {
    id: 'intro',
    tier: 2,
    tierLabel: '入门线',
    grade: '5.6',
    name: '晨雾花岗岩',
    subtitle: '入门线 · 5.6 · 含分步教学与山间轻雾',
    description:
      '坡度平缓、支点稳固，包含五步新手教学；半山会升起柔和晨雾，带你完整熟悉岩钉保护与防滑粉涂抹。',
    heightM: 35,
    drainMultiplier: 0.38,
    windMultiplier: 0.22,
    pitons: 6,
    chalkUses: 4,
    hasTutorial: true,
    palette: 'granite',
    seed: 105602,
    summitImage: '/src/assets/images/summit_art_granite_1795063543562.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.55,
        type: 'clear',
        label: '晴朗微风',
        intensity: 0.1,
        chalkDrainMult: 1.0,
        visibilityRadius: 1.1,
        fogOpacity: 0,
      },
      {
        minRatio: 0.55,
        maxRatio: 1.0,
        type: 'mist',
        label: '晨间轻雾',
        intensity: 0.4,
        chalkDrainMult: 1.2,
        visibilityRadius: 0.82,
        fogOpacity: 0.3,
      },
    ],
  },
  {
    id: 'beginner',
    tier: 3,
    tierLabel: '初级线',
    grade: '5.7',
    name: '青苔阶梯壁',
    subtitle: '初级线 · 5.7 · 独立攀登与初阶读线',
    description:
      '开始脱离辅助提示，路线中段穿插少量小指点与岩缝，需要学会用「读线」功能提前规划双脚站位。',
    heightM: 45,
    drainMultiplier: 0.48,
    windMultiplier: 0.32,
    pitons: 6,
    chalkUses: 4,
    hasTutorial: false,
    palette: 'granite',
    seed: 155703,
    summitImage: '/src/assets/images/summit_art_granite_1795063543562.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.45,
        type: 'clear',
        label: '晴朗微风',
        intensity: 0.12,
        chalkDrainMult: 1.0,
        visibilityRadius: 1.05,
        fogOpacity: 0,
      },
      {
        minRatio: 0.45,
        maxRatio: 1.0,
        type: 'mist',
        label: '山谷薄雾',
        intensity: 0.52,
        chalkDrainMult: 1.28,
        visibilityRadius: 0.74,
        fogOpacity: 0.38,
      },
    ],
  },
  {
    id: 'beginner-plus',
    tier: 4,
    tierLabel: '初级进阶',
    grade: '5.8',
    name: '溪谷斜壁线',
    subtitle: '初级进阶 · 5.8 · 零星细雨与脆岩初现',
    description:
      '岩壁坡度变陡，高段将遇到微雨打湿岩面并出现少数风化脆岩，注意避开橙色脆点并及时补粉。',
    heightM: 52,
    drainMultiplier: 0.56,
    windMultiplier: 0.42,
    pitons: 7,
    chalkUses: 5,
    hasTutorial: false,
    palette: 'ridge',
    seed: 185804,
    summitImage: '/src/assets/images/summit_art_ridge_1795063543509.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.38,
        type: 'clear',
        label: '晴朗微风',
        intensity: 0.14,
        chalkDrainMult: 1.0,
        visibilityRadius: 1.05,
        fogOpacity: 0,
      },
      {
        minRatio: 0.38,
        maxRatio: 0.72,
        type: 'mist',
        label: '溪谷迷雾',
        intensity: 0.55,
        chalkDrainMult: 1.3,
        visibilityRadius: 0.7,
        fogOpacity: 0.42,
      },
      {
        minRatio: 0.72,
        maxRatio: 1.0,
        type: 'rain',
        label: '山间细雨',
        intensity: 0.58,
        chalkDrainMult: 1.55,
        visibilityRadius: 0.64,
        fogOpacity: 0.42,
      },
    ],
  },
  {
    id: 'intermediate',
    tier: 5,
    tierLabel: '中级线',
    grade: '5.9',
    name: '鹰嘴裂缝壁',
    subtitle: '中级线 · 5.9 · 垂直岩缝与山腰阵雨',
    description:
      '经典中级技术墙：岩面趋于垂直，中高段遭遇山腰阵雨与浓雾，雨水加速防滑粉流失并考验节奏把控。',
    heightM: 62,
    drainMultiplier: 0.64,
    windMultiplier: 0.52,
    pitons: 7,
    chalkUses: 5,
    hasTutorial: false,
    palette: 'ridge',
    seed: 205905,
    summitImage: '/src/assets/images/summit_art_ridge_1795063543509.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.34,
        type: 'clear',
        label: '晴朗微风',
        intensity: 0.15,
        chalkDrainMult: 1.0,
        visibilityRadius: 1.02,
        fogOpacity: 0,
      },
      {
        minRatio: 0.34,
        maxRatio: 0.68,
        type: 'mist',
        label: '山谷迷雾',
        intensity: 0.6,
        chalkDrainMult: 1.35,
        visibilityRadius: 0.68,
        fogOpacity: 0.45,
      },
      {
        minRatio: 0.68,
        maxRatio: 1.0,
        type: 'rain',
        label: '山腰阵雨',
        intensity: 0.74,
        chalkDrainMult: 1.75,
        visibilityRadius: 0.58,
        fogOpacity: 0.48,
      },
    ],
  },
  {
    id: 'intermediate-plus',
    tier: 6,
    tierLabel: '中级进阶',
    grade: '5.10b',
    name: '风蚀屋檐线',
    subtitle: '中级进阶 · 5.10b · 骤雨浓雾与脆岩带',
    description:
      '中段迎面遭遇骤雨与浓雾，能见度明显收窄，路线两侧分布较多风化脆岩，攀登前必须看清岩缝走势。',
    heightM: 75,
    drainMultiplier: 0.72,
    windMultiplier: 0.62,
    pitons: 8,
    chalkUses: 5,
    hasTutorial: false,
    palette: 'slate',
    seed: 351006,
    summitImage: '/src/assets/images/summit_art_stormbreak_1795063543184.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.28,
        type: 'mist',
        label: '低云薄雾',
        intensity: 0.45,
        chalkDrainMult: 1.25,
        visibilityRadius: 0.78,
        fogOpacity: 0.3,
      },
      {
        minRatio: 0.28,
        maxRatio: 0.76,
        type: 'rain',
        label: '暴雨侵袭',
        intensity: 0.88,
        chalkDrainMult: 1.9,
        visibilityRadius: 0.54,
        fogOpacity: 0.54,
      },
      {
        minRatio: 0.76,
        maxRatio: 1.0,
        type: 'mist',
        label: '云端浓雾',
        intensity: 0.76,
        chalkDrainMult: 1.45,
        visibilityRadius: 0.56,
        fogOpacity: 0.55,
      },
    ],
  },
  {
    id: 'advanced',
    tier: 7,
    tierLabel: '高级线',
    grade: '5.10d',
    name: '断崖绝壁线',
    subtitle: '高级线 · 5.10d · 强风暴雨与高空碎雪',
    description:
      '近 90 米大岩壁，抓点转向细腻的岩缝与小指边，高段出现薄冰与碎雪，防滑粉与岩钉管理缺一不可。',
    heightM: 88,
    drainMultiplier: 0.8,
    windMultiplier: 0.72,
    pitons: 8,
    chalkUses: 5,
    hasTutorial: false,
    palette: 'slate',
    seed: 381007,
    summitImage: '/src/assets/images/summit_art_stormbreak_1795063543184.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.26,
        type: 'mist',
        label: '峭壁寒雾',
        intensity: 0.55,
        chalkDrainMult: 1.32,
        visibilityRadius: 0.72,
        fogOpacity: 0.36,
      },
      {
        minRatio: 0.26,
        maxRatio: 0.68,
        type: 'rain',
        label: '狂风骤雨',
        intensity: 0.92,
        chalkDrainMult: 1.98,
        visibilityRadius: 0.5,
        fogOpacity: 0.56,
      },
      {
        minRatio: 0.68,
        maxRatio: 1.0,
        type: 'snowstorm',
        label: '高空碎雪',
        intensity: 0.72,
        chalkDrainMult: 1.75,
        visibilityRadius: 0.52,
        fogOpacity: 0.56,
      },
    ],
  },
  {
    id: 'advanced-crux',
    tier: 8,
    tierLabel: '高级难点线',
    grade: '5.11c',
    name: '鬼脊险关',
    subtitle: '高级难点线 · 5.11c · 连续难点与冰脆交错',
    description:
      '连续横移与大步距难点路段，大抓点变得稀少，路线外侧暗藏大片易碎岩与薄冰，精准读线是唯一生路。',
    heightM: 100,
    drainMultiplier: 0.88,
    windMultiplier: 0.84,
    pitons: 9,
    chalkUses: 6,
    hasTutorial: false,
    palette: 'slate',
    seed: 411108,
    summitImage: '/src/assets/images/summit_art_stormbreak_1795063543184.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.22,
        type: 'mist',
        label: '压顶浓雾',
        intensity: 0.62,
        chalkDrainMult: 1.4,
        visibilityRadius: 0.66,
        fogOpacity: 0.44,
      },
      {
        minRatio: 0.22,
        maxRatio: 0.64,
        type: 'rain',
        label: '冰雨横扫',
        intensity: 0.95,
        chalkDrainMult: 2.05,
        visibilityRadius: 0.48,
        fogOpacity: 0.58,
      },
      {
        minRatio: 0.64,
        maxRatio: 1.0,
        type: 'snowstorm',
        label: '风雪交加',
        intensity: 0.86,
        chalkDrainMult: 1.95,
        visibilityRadius: 0.48,
        fogOpacity: 0.6,
      },
    ],
  },
  {
    id: 'master-1',
    tier: 9,
    tierLabel: '大师线 1',
    grade: '5.12a',
    name: '神之冰壁·初章',
    subtitle: '大师线 1 · 5.12a · 暴风雪与极寒冰壁',
    description:
      '跨入大师级极寒领域：百米以上的冰霜壁面，暴风雪大幅收窄视野并飞速消耗防滑粉，考验高强度耐力分配。',
    heightM: 112,
    drainMultiplier: 0.95,
    windMultiplier: 0.92,
    pitons: 9,
    chalkUses: 6,
    hasTutorial: false,
    palette: 'glacial',
    seed: 451209,
    summitImage: '/src/assets/images/summit_art_glacial_1795063544662.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.24,
        type: 'mist',
        label: '冰谷寒雾',
        intensity: 0.6,
        chalkDrainMult: 1.38,
        visibilityRadius: 0.66,
        fogOpacity: 0.42,
      },
      {
        minRatio: 0.24,
        maxRatio: 0.6,
        type: 'rain',
        label: '冰雨混风',
        intensity: 0.88,
        chalkDrainMult: 1.95,
        visibilityRadius: 0.52,
        fogOpacity: 0.54,
      },
      {
        minRatio: 0.6,
        maxRatio: 1.0,
        type: 'snowstorm',
        label: '高空暴风雪',
        intensity: 0.96,
        chalkDrainMult: 2.1,
        visibilityRadius: 0.46,
        fogOpacity: 0.64,
      },
    ],
  },
  {
    id: 'master-2',
    tier: 10,
    tierLabel: '大师线 2',
    grade: '5.12d',
    name: '极寒刃脊·深渊',
    subtitle: '大师线 2 · 5.12d · 大蛇形迂回与白毛风',
    description:
      '黄金路线呈现大弧度左右迂回，必须不断横移寻找安全岩缝，否则将坠入两侧滑冰面与脆岩陷阱。',
    heightM: 128,
    drainMultiplier: 1.04,
    windMultiplier: 1.02,
    pitons: 10,
    chalkUses: 6,
    hasTutorial: false,
    palette: 'glacial',
    seed: 512810,
    summitImage: '/src/assets/images/summit_art_glacial_1795063544662.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.2,
        type: 'mist',
        label: '冰川浓雾',
        intensity: 0.66,
        chalkDrainMult: 1.48,
        visibilityRadius: 0.6,
        fogOpacity: 0.48,
      },
      {
        minRatio: 0.2,
        maxRatio: 0.54,
        type: 'rain',
        label: '冻雨飓风',
        intensity: 0.94,
        chalkDrainMult: 2.1,
        visibilityRadius: 0.48,
        fogOpacity: 0.58,
      },
      {
        minRatio: 0.54,
        maxRatio: 1.0,
        type: 'snowstorm',
        label: '极寒白毛风',
        intensity: 1.0,
        chalkDrainMult: 2.22,
        visibilityRadius: 0.43,
        fogOpacity: 0.66,
      },
    ],
  },
  {
    id: 'master-3',
    tier: 11,
    tierLabel: '大师线 3',
    grade: '5.13c',
    name: '苍穹绝巅·终章',
    subtitle: '大师线 3 · 5.13c · 终极绝壁与暴雪考验',
    description:
      '145 米神山绝巅终极挑战：最狭窄的黄金读线通道、严酷的体力压榨与漫天风雪，唯有真正的大师方能登顶。',
    heightM: 145,
    drainMultiplier: 1.14,
    windMultiplier: 1.15,
    pitons: 10,
    chalkUses: 7,
    hasTutorial: false,
    palette: 'glacial',
    seed: 513311,
    summitImage: '/src/assets/images/summit_art_glacial_1795063544662.jpg',
    weatherStages: [
      {
        minRatio: 0,
        maxRatio: 0.18,
        type: 'mist',
        label: '绝壁冻雾',
        intensity: 0.72,
        chalkDrainMult: 1.55,
        visibilityRadius: 0.56,
        fogOpacity: 0.5,
      },
      {
        minRatio: 0.18,
        maxRatio: 0.48,
        type: 'rain',
        label: '冻雨暴风',
        intensity: 0.98,
        chalkDrainMult: 2.2,
        visibilityRadius: 0.45,
        fogOpacity: 0.6,
      },
      {
        minRatio: 0.48,
        maxRatio: 1.0,
        type: 'snowstorm',
        label: '绝巅特强暴雪',
        intensity: 1.0,
        chalkDrainMult: 2.35,
        visibilityRadius: 0.4,
        fogOpacity: 0.68,
      },
    ],
  },
];

export function getRouteById(id: RouteId): RouteConfig {
  return ROUTES.find((r) => r.id === id) ?? ROUTES[0];
}

export const LOADOUT_OPTIONS: LoadoutConfig[] = [
  {
    id: 'light',
    label: '轻装速攀',
    subtitle: '岩钉 -2 · 防粉 -1 · 耐力消耗 -14%',
    pitonDelta: -2,
    chalkDelta: -1,
    drainMult: 0.86,
  },
  {
    id: 'balanced',
    label: '均衡标准',
    subtitle: '标准配置 · 稳健容错',
    pitonDelta: 0,
    chalkDelta: 0,
    drainMult: 1.0,
  },
  {
    id: 'heavy',
    label: '重装安全',
    subtitle: '岩钉 +2 · 防粉 +1 · 耐力消耗 +10%',
    pitonDelta: 2,
    chalkDelta: 1,
    drainMult: 1.1,
  },
];

export const CLIMBER_SKINS: ClimberSkinConfig[] = [
  {
    id: 'alpine-orange',
    name: '经典蓝橙',
    unlockCount: 0,
    jacket: '#2563EB',
    jacketShadow: '#1E3A8A',
    accent: '#EA580C',
    scarf: '#F59E0B',
    beanie: '#D97706',
    rope: '#F97316',
  },
  {
    id: 'glacier-cyan',
    name: '极光冰青',
    unlockCount: 3,
    jacket: '#0891B2',
    jacketShadow: '#164E63',
    accent: '#38BDF8',
    scarf: '#E0F2FE',
    beanie: '#0284C7',
    rope: '#38BDF8',
  },
  {
    id: 'granite-gold',
    name: '岩壁琥珀',
    unlockCount: 6,
    jacket: '#B45309',
    jacketShadow: '#78350F',
    accent: '#FBBF24',
    scarf: '#FEF3C7',
    beanie: '#D97706',
    rope: '#FACC15',
  },
  {
    id: 'summit-crimson',
    name: '神山绯红',
    unlockCount: 11,
    jacket: '#BE123C',
    jacketShadow: '#881337',
    accent: '#FB7185',
    scarf: '#FFE4E6',
    beanie: '#E11D48',
    rope: '#FB7185',
  },
];

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengeRoute(): RouteConfig {
  const dateKey = getTodayDateKey();
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  // Daily Challenge picks an engaging mid-to-advanced template (tiers 4..9 -> indices 3..8)
  const templateIdx = 3 + (unsigned % 6);
  const template = ROUTES[templateIdx];
  return {
    ...template,
    name: `今日神山 · ${template.name}`,
    subtitle: `每日挑战（${dateKey}）· ${template.tierLabel} ${template.grade}`,
    seed: (unsigned % 900000) + 100000,
    isDailyChallenge: true,
    dailyDateKey: dateKey,
  };
}

export function getWeatherAtAltitude(
  world: MountainWorld,
  altRatio: number,
  timeSec: number
): ActiveWeather {
  const clamped = Math.max(0, Math.min(1, altRatio));
  const stages = world.route.weatherStages;
  let stage = stages[0];
  for (const s of stages) {
    if (clamped >= s.minRatio && clamped <= s.maxRatio) {
      stage = s;
      break;
    }
  }

  // Subtle dynamic gust wave modulation so weather breathes naturally
  const pulse = Math.sin(timeSec * 0.45) * 0.08;
  return {
    type: stage.type,
    label: stage.label,
    intensity: Math.max(0.05, Math.min(1, stage.intensity + pulse)),
    chalkDrainMult: stage.chalkDrainMult,
    visibilityRadius: Math.max(0.4, stage.visibilityRadius - Math.max(0, pulse * 0.3)),
    fogOpacity: Math.max(0, Math.min(0.72, stage.fogOpacity + pulse * 0.4)),
  };
}

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function getMountainHalfWidth(y: number, mountainHeight: number): number {
  const progress = Math.max(0, Math.min(1, -y / mountainHeight));
  const baseWidth = 310 * (1 - progress * 0.62);
  const crag =
    Math.sin(y * 0.0085) * 22 +
    Math.cos(y * 0.021) * 12 +
    Math.sin(y * 0.0032) * 24;
  return Math.max(88, baseWidth + crag * (1 - progress * 0.35));
}

export function getMountainCenterOffset(y: number, mountainHeight: number): number {
  const progress = Math.max(0, Math.min(1, -y / mountainHeight));
  return (Math.sin(y * 0.0028) * 44 + Math.cos(y * 0.0062) * 18) * (1 - progress * 0.25);
}

export function getCliffBounds(
  y: number,
  mountainHeight: number
): { left: number; right: number; center: number } {
  const center = getMountainCenterOffset(y, mountainHeight);
  const hw = getMountainHalfWidth(y, mountainHeight);
  return { left: center - hw, right: center + hw, center };
}

export interface MountainWorld {
  route: RouteConfig;
  mountainHeight: number;
  outlineLeft: Vec2[];
  outlineRight: Vec2[];
  facets: RockFacet[];
  holds: Hold[];
  rustyPitons: Piton[];
  ledges: Ledge[];
  distantPeaks: DistantPeak[];
  clouds: CloudBand[];
  birds: DistantBird[];
  cairnStones: Vec2[];
  difficultyProfile: AltitudeDifficultyBin[];
}

export function generateMountain(route: RouteConfig): MountainWorld {
  const rng = createRng(route.seed);
  const mountainHeight = route.heightM * PIXELS_PER_METER;

  const outlineLeft: Vec2[] = [];
  const outlineRight: Vec2[] = [];

  const stepY = 48;
  for (let y = 120; y >= -mountainHeight - 40; y -= stepY) {
    const b = getCliffBounds(y, mountainHeight);
    const jitterL = (rng() - 0.5) * 14;
    const jitterR = (rng() - 0.5) * 14;
    outlineLeft.push({ x: b.left + jitterL, y });
    outlineRight.push({ x: b.right + jitterR, y });
  }

  const facets: RockFacet[] = [];
  const rowH = 104;
  for (let y = 60; y > -mountainHeight + 25; y -= rowH) {
    const progress = Math.max(0, Math.min(1, -y / mountainHeight));
    const bTop = getCliffBounds(y - rowH, mountainHeight);
    const bBot = getCliffBounds(y, mountainHeight);

    const cols = 4;
    for (let c = 0; c < cols; c++) {
      const t0 = c / cols;
      const t1 = (c + 1) / cols;
      const xBL = bBot.left + (bBot.right - bBot.left) * t0 + (rng() - 0.5) * 18;
      const xBR = bBot.left + (bBot.right - bBot.left) * t1 + (rng() - 0.5) * 18;
      const xTL = bTop.left + (bTop.right - bTop.left) * t0 + (rng() - 0.5) * 18;
      const xTR = bTop.left + (bTop.right - bTop.left) * t1 + (rng() - 0.5) * 18;

      const yTop = y - rowH + (rng() - 0.5) * 14;
      const yBot = y + (rng() - 0.5) * 14;

      const extrudeX = 11 + rng() * 14;
      const extrudeY = 12 + rng() * 14;

      const points: Vec2[] = [
        { x: xTL, y: yTop },
        { x: xTR, y: yTop + (rng() - 0.5) * 12 },
        { x: xBR, y: yBot },
        { x: xBL, y: yBot + (rng() - 0.5) * 12 },
      ];

      const sidePoints: Vec2[] = [
        points[1],
        { x: points[1].x + extrudeX, y: points[1].y + extrudeY },
        { x: points[2].x + extrudeX, y: points[2].y + extrudeY },
        points[2],
      ];

      let fill = '#B8AB98';
      let sideFill = '#535A66';
      if (route.palette === 'granite') {
        fill = rng() > 0.45 ? '#C8B9A3' : '#B2A38F';
        sideFill = '#5D564E';
      } else if (route.palette === 'ridge') {
        fill = rng() > 0.45 ? '#A6ACB5' : '#8E96A3';
        sideFill = '#434B59';
      } else if (route.palette === 'slate') {
        fill = rng() > 0.45 ? '#7A828F' : '#656E7C';
        sideFill = '#303642';
      } else {
        fill = progress > 0.55 ? '#9BB2C9' : rng() > 0.45 ? '#7A92AD' : '#647C99';
        sideFill = '#2D3E54';
      }

      const hasSnow =
        (route.palette === 'glacial' && rng() > 0.28) ||
        (route.palette === 'slate' && progress > 0.6 && rng() > 0.45) ||
        (progress > 0.85 && rng() > 0.4);

      const snowCap = hasSnow
        ? [
            points[0],
            points[1],
            { x: points[1].x - 5, y: points[1].y + 12 + rng() * 9 },
            {
              x: (points[0].x + points[1].x) * 0.5,
              y: (points[0].y + points[1].y) * 0.5 + 16 + rng() * 9,
            },
            { x: points[0].x + 5, y: points[0].y + 11 + rng() * 7 },
          ]
        : undefined;

      const hasMoss =
        (route.palette === 'granite' || route.palette === 'ridge') &&
        progress < 0.6 &&
        !hasSnow &&
        rng() > 0.68;

      const mossPatch = hasMoss
        ? [
            { x: points[0].x + 12, y: points[0].y + 6 },
            { x: points[0].x + 36, y: points[0].y + 10 },
            { x: points[0].x + 28, y: points[0].y + 22 },
            { x: points[0].x + 8, y: points[0].y + 18 },
          ]
        : undefined;

      facets.push({
        points,
        sidePoints,
        fill,
        sideFill,
        rimHighlight: c === 0 || rng() > 0.52,
        hasHatching: rng() > 0.35,
        snowCap,
        mossPatch,
      });
    }
  }

  const summitCenter = getMountainCenterOffset(-mountainHeight, mountainHeight);
  const ledges: Ledge[] = [
    {
      id: 'base-camp',
      x: 0,
      y: 0,
      width: 260,
      label: '起点岩台 · 0m',
      isBivouac: true,
      visited: true,
    },
  ];

  if (route.heightM >= 45 && route.heightM < 75) {
    const mM = Math.round(route.heightM * 0.52);
    const mY = -mM * PIXELS_PER_METER;
    ledges.push({
      id: 'bivouac-mid',
      x: getMountainCenterOffset(mY, mountainHeight) - 18,
      y: mY,
      width: 145,
      label: `半山休息台 · ${mM}m`,
      isBivouac: true,
      visited: false,
    });
  } else if (route.heightM >= 75 && route.heightM < 120) {
    const m1 = Math.round(route.heightM * 0.34);
    const m2 = Math.round(route.heightM * 0.68);
    const y1 = -m1 * PIXELS_PER_METER;
    const y2 = -m2 * PIXELS_PER_METER;
    ledges.push({
      id: 'bivouac-1',
      x: getMountainCenterOffset(y1, mountainHeight) - 20,
      y: y1,
      width: 145,
      label: `一号露营台 · ${m1}m`,
      isBivouac: true,
      visited: false,
    });
    ledges.push({
      id: 'bivouac-2',
      x: getMountainCenterOffset(y2, mountainHeight) + 16,
      y: y2,
      width: 135,
      label: `二号露营台 · ${m2}m`,
      isBivouac: true,
      visited: false,
    });
  } else if (route.heightM >= 120) {
    const m1 = Math.round(route.heightM * 0.26);
    const m2 = Math.round(route.heightM * 0.52);
    const m3 = Math.round(route.heightM * 0.76);
    const y1 = -m1 * PIXELS_PER_METER;
    const y2 = -m2 * PIXELS_PER_METER;
    const y3 = -m3 * PIXELS_PER_METER;
    ledges.push(
      {
        id: 'bivouac-1',
        x: getMountainCenterOffset(y1, mountainHeight) - 18,
        y: y1,
        width: 140,
        label: `一号露营台 · ${m1}m`,
        isBivouac: true,
        visited: false,
      },
      {
        id: 'bivouac-2',
        x: getMountainCenterOffset(y2, mountainHeight) + 18,
        y: y2,
        width: 132,
        label: `二号露营台 · ${m2}m`,
        isBivouac: true,
        visited: false,
      },
      {
        id: 'bivouac-3',
        x: getMountainCenterOffset(y3, mountainHeight) - 14,
        y: y3,
        width: 126,
        label: `三号冲顶台 · ${m3}m`,
        isBivouac: true,
        visited: false,
      }
    );
  }

  ledges.push({
    id: 'summit-crown',
    x: summitCenter,
    y: -mountainHeight,
    width: 168,
    label: `${route.tierLabel} · ${route.heightM}m 登顶`,
    isSummit: true,
    visited: false,
  });

  const holds: Hold[] = [];
  let holdCounter = 0;

  const pushHold = (
    x: number,
    y: number,
    type: HoldType,
    zone: number,
    radiusOverride?: number,
    wet = false,
    forceDownpull = false
  ) => {
    const stabilityMap: Record<HoldType, number> = {
      ledge: 1.45,
      jug: 1.25,
      crack: 1.05,
      crimp: 0.76,
      fragile: 0.68,
      ice: 0.48,
    };
    const radiusMap: Record<HoldType, number> = {
      ledge: 14,
      jug: 12,
      crack: 11,
      crimp: 9,
      fragile: 10.5,
      ice: 10,
    };

    let gripKind: Hold['gripKind'] = 'downpull';
    if (!forceDownpull && type !== 'ledge' && type !== 'ice' && route.tier >= 3) {
      const dirRoll = rng();
      const sideChance = Math.min(0.42, 0.14 + (route.tier - 3) * 0.035);
      const underChance = route.tier >= 5 ? Math.min(0.18, 0.06 + (route.tier - 5) * 0.02) : 0;
      if (dirRoll < sideChance) {
        gripKind = rng() < 0.5 ? 'sidepullLeft' : 'sidepullRight';
      } else if (dirRoll < sideChance + underChance) {
        gripKind = 'undercling';
      }
    }

    const baseAngle =
      gripKind === 'sidepullLeft'
        ? -0.52 - rng() * 0.25
        : gripKind === 'sidepullRight'
          ? 0.52 + rng() * 0.25
          : gripKind === 'undercling'
            ? (rng() - 0.5) * 0.26
            : (rng() - 0.5) * 0.65;

    holds.push({
      id: `hold-${holdCounter++}`,
      x,
      y,
      radius: radiusOverride ?? radiusMap[type],
      type,
      gripKind,
      shapeVariant: Math.floor(rng() * 4),
      stability: stabilityMap[type],
      angle: baseAngle,
      depth: 5 + rng() * 5,
      crackProgress: 0,
      broken: false,
      chalked: false,
      wet,
      zone,
    });
  };

  const canPlaceHold = (x: number, y: number, minD = 26) => {
    for (const existing of holds) {
      if (Math.hypot(existing.x - x, existing.y - y) < minD) return false;
    }
    return true;
  };

  // Starting anchor holds around 0m base camp
  pushHold(-22, -22, 'jug', 0, undefined, false, true);
  pushHold(22, -24, 'jug', 0, undefined, false, true);
  pushHold(-20, -64, 'jug', 0, undefined, false, true);
  pushHold(22, -68, 'jug', 0, undefined, false, true);
  pushHold(-38, -46, 'ledge', 0, undefined, false, true);
  pushHold(38, -48, 'ledge', 0, undefined, false, true);

  if (route.hasTutorial) {
    pushHold(-16, -104, 'jug', 0, 13, false, true);
    pushHold(22, -110, 'jug', 0, 13, false, true);
  }

  // Build smooth waypoints through base -> bivouacs -> summit so the Main Line connects cleanly
  const tier = route.tier; // 1..11
  const anchorPoints: Vec2[] = [
    { x: 0, y: route.hasTutorial ? -120 : -82 },
    ...ledges
      .filter((l) => l.isBivouac && l.id !== 'base-camp')
      .map((l) => ({ x: l.x, y: l.y })),
    { x: summitCenter, y: -mountainHeight + 18 },
  ].sort((a, b) => b.y - a.y); // bottom (less negative) to top (more negative)

  const getMainLineCenterX = (y: number): number => {
    let segIdx = 0;
    for (let i = 0; i < anchorPoints.length - 1; i++) {
      if (y <= anchorPoints[i].y && y >= anchorPoints[i + 1].y) {
        segIdx = i;
        break;
      }
      if (y < anchorPoints[i + 1].y) segIdx = i;
    }
    const p0 = anchorPoints[segIdx];
    const p1 = anchorPoints[Math.min(anchorPoints.length - 1, segIdx + 1)];
    const segSpan = p0.y - p1.y || 1;
    const t = Math.max(0, Math.min(1, (p0.y - y) / segSpan));
    const baseLineX = p0.x + (p1.x - p0.x) * t;

    // Sin-envelope keeps endpoints pinned cleanly to bivouacs/summit while meandering in between
    const envelope = Math.sin(t * Math.PI);
    const waveAmp = Math.min(110, 26 + (tier - 1) * 8.5);
    const waveFreq = 0.008 + (tier - 1) * 0.0005;
    const meander = Math.sin(y * waveFreq + tier) * waveAmp * envelope;

    const bounds = getCliffBounds(y, mountainHeight);
    const margin = 44;
    return Math.max(bounds.left + margin, Math.min(bounds.right - margin, baseLineX + meander));
  };

  // Step 1: Generate the clean, anatomically reachable Main Climbing Line
  const holdStepY = Math.round(33 + (tier - 1) * 0.85); // 33px (Tier 1) -> 41.5px (Tier 11)
  const mainLineNodes: { x: number; y: number; zone: number }[] = [];

  for (let y = route.hasTutorial ? -144 : -102; y >= -mountainHeight + 34; y -= holdStepY) {
    const progress = Math.max(0, Math.min(1, -y / mountainHeight));
    const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
    const lineX = getMainLineCenterX(y);
    mainLineNodes.push({ x: lineX, y, zone });

    // Staggered Left & Right holds along the line (clean 2-hold rhythm instead of 5-hold clutter)
    const pairHalfW = 17 + rng() * 9;
    const staggerL = (rng() - 0.5) * 10;
    const staggerR = (rng() - 0.5) * 10;

    const pickMainType = (isPrimary: boolean): HoldType => {
      const r = rng();
      if (tier === 1) return r < 0.72 ? 'jug' : 'ledge';
      if (tier === 2) return r < 0.68 ? 'jug' : r < 0.88 ? 'ledge' : 'crack';
      if (tier === 3) return r < 0.56 ? 'jug' : r < 0.9 ? 'crack' : 'crimp';
      if (tier === 4) return r < 0.45 ? 'jug' : r < 0.84 ? 'crack' : 'crimp';
      if (tier === 5) return isPrimary ? (r < 0.4 ? 'jug' : 'crack') : r < 0.65 ? 'crack' : 'crimp';
      if (tier === 6) return isPrimary ? (r < 0.3 ? 'jug' : r < 0.75 ? 'crack' : 'crimp') : r < 0.5 ? 'crack' : 'crimp';
      if (tier === 7) return isPrimary ? (r < 0.24 ? 'jug' : r < 0.68 ? 'crack' : 'crimp') : r < 0.42 ? 'crack' : 'crimp';
      if (tier === 8) return isPrimary ? (r < 0.2 ? 'jug' : r < 0.6 ? 'crack' : 'crimp') : r < 0.35 ? 'crack' : 'crimp';
      if (tier === 9) return isPrimary ? (r < 0.18 ? 'jug' : r < 0.56 ? 'crack' : 'crimp') : r < 0.32 ? 'crack' : 'crimp';
      if (tier === 10) return isPrimary ? (r < 0.14 ? 'jug' : r < 0.5 ? 'crack' : 'crimp') : r < 0.28 ? 'crack' : 'crimp';
      return isPrimary ? (r < 0.12 ? 'jug' : r < 0.46 ? 'crack' : 'crimp') : r < 0.24 ? 'crack' : 'crimp';
    };

    const hasRainStage = route.weatherStages.some((s) => s.type === 'rain');
    const isWetHold = (hType: HoldType) =>
      tier >= 4 &&
      hType !== 'ledge' &&
      hType !== 'ice' &&
      rng() < (hasRainStage ? 0.12 + progress * 0.08 : 0.06);

    const lx = lineX - pairHalfW;
    const ly = y + staggerL;
    const lType = pickMainType(true);
    if (canPlaceHold(lx, ly, 24)) {
      pushHold(lx, ly, lType, zone, tier === 1 ? 13.5 : undefined, isWetHold(lType));
    }

    const rx = lineX + pairHalfW;
    const ry = y + staggerR;
    const rType = pickMainType(false);
    // Higher tiers occasionally alternate single-side crux holds to force thoughtful foot-swaps
    const skipSecond = tier >= 7 && rng() < 0.22;
    if (!skipSecond && canPlaceHold(rx, ry, 24)) {
      pushHold(rx, ry, rType, zone, tier === 1 ? 13.5 : undefined, isWetHold(rType));
    }
  }

  // Step 2: Intentional Route-Reading Forks & Decoy Traps scaled strictly by tier
  // Tier 1: 0 branches (pure single line)
  // Tier 2: 1 harmless parallel step
  // Tier 3-4: 2-3 short alternative forks
  // Tier 5-6: 4-5 forks with fragile traps
  // Tier 7-8: 6-7 traverse/dead-end crux decoys
  // Tier 9-11: 8-11 deceptive alpine false lines
  const branchCount =
    tier === 1 ? 0 : tier === 2 ? 1 : tier <= 4 ? tier - 1 : tier <= 8 ? tier : tier + 1;

  for (let b = 0; b < branchCount; b++) {
    if (mainLineNodes.length < 6) break;
    const minIdx = 2;
    const maxIdx = mainLineNodes.length - 4;
    const startIdx =
      minIdx + Math.floor(((b + 0.35 + rng() * 0.3) / branchCount) * (maxIdx - minIdx));
    const anchor = mainLineNodes[Math.max(0, Math.min(mainLineNodes.length - 1, startIdx))];

    const dir = rng() > 0.5 ? 1 : -1;
    const branchLen = tier <= 3 ? 3 : tier <= 6 ? 4 : 5;
    const isDeadEndTrap = tier >= 4 && (tier >= 7 ? rng() < 0.72 : rng() < 0.5);

    let bx = anchor.x + dir * (44 + rng() * 18);
    let by = anchor.y - 16;

    for (let s = 0; s < branchLen; s++) {
      const bounds = getCliffBounds(by, mountainHeight);
      if (bx < bounds.left + 26 || bx > bounds.right - 26 || by < -mountainHeight + 48) {
        break;
      }

      const progress = Math.max(0, Math.min(1, -by / mountainHeight));
      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;

      let bType: HoldType = 'crack';
      const r = rng();
      if (tier <= 2) {
        bType = r < 0.65 ? 'jug' : 'crack';
      } else if (tier <= 4) {
        bType = isDeadEndTrap && s === branchLen - 1 ? 'fragile' : r < 0.55 ? 'crimp' : 'crack';
      } else if (tier <= 6) {
        bType =
          isDeadEndTrap && s >= branchLen - 2
            ? 'fragile'
            : r < 0.45
              ? 'crimp'
              : r < 0.75
                ? 'crack'
                : 'fragile';
      } else {
        const allowIce = progress > 0.35 || tier >= 9;
        if (isDeadEndTrap && s >= branchLen - 2) {
          bType = allowIce && rng() < 0.5 ? 'ice' : 'fragile';
        } else {
          bType = allowIce && r < 0.4 ? 'ice' : r < 0.78 ? 'crimp' : 'fragile';
        }
      }

      if (canPlaceHold(bx, by, 26)) {
        pushHold(bx, by, bType, zone);
      }

      // Either curve away into a dead end or rejoin main line
      if (isDeadEndTrap) {
        bx += dir * (16 + rng() * 18);
        by -= 36 + rng() * 10;
      } else {
        const nextMainX = getMainLineCenterX(by - 38);
        bx = bx * 0.55 + nextMainX * 0.45;
        by -= 36;
      }
    }
  }

  for (const ledge of ledges) {
    if (ledge.id === 'base-camp') continue;
    pushHold(ledge.x - ledge.width * 0.26, ledge.y - 4, 'ledge', 1, 14);
    pushHold(ledge.x, ledge.y - 4, 'ledge', 1, 15);
    pushHold(ledge.x + ledge.width * 0.26, ledge.y - 4, 'ledge', 1, 14);
    if (canPlaceHold(ledge.x - 24, ledge.y + 32, 22)) {
      pushHold(ledge.x - 24, ledge.y + 32, 'jug', 1);
    }
    if (canPlaceHold(ledge.x + 24, ledge.y + 32, 22)) {
      pushHold(ledge.x + 24, ledge.y + 32, 'jug', 1);
    }
  }

  // Step 3: Pre-placed weathered rusty pitons on mid/high routes (tier >= 4)
  const rustyPitons: Piton[] = [];
  if (tier >= 4 && mainLineNodes.length >= 8) {
    const rustyCount = tier <= 6 ? 1 : tier <= 9 ? 2 : 3;
    for (let i = 0; i < rustyCount; i++) {
      const ratio = (i + 1) / (rustyCount + 1);
      const idx = Math.max(
        3,
        Math.min(mainLineNodes.length - 3, Math.floor(mainLineNodes.length * ratio))
      );
      const node = mainLineNodes[idx];
      rustyPitons.push({
        id: `rusty-piton-${i}`,
        x: node.x + (rng() - 0.5) * 24,
        y: node.y + 6,
        angle: (rng() - 0.5) * 0.3,
        integrity: 1,
        isRusty: true,
        reliable: rng() < 0.58,
      });
    }
  }

  const isGlacial = route.palette === 'glacial';
  const isGranite = route.palette === 'granite';

  const distantPeaks: DistantPeak[] = [
    // Layer 0: Far horizon snowy alpine massifs
    {
      parallax: 0.08,
      shade: isGlacial ? '#47617D' : isGranite ? '#6A7B91' : '#4C5A6E',
      rimShade: isGlacial ? '#8AA6C4' : isGranite ? '#9EB1C7' : '#74869E',
      shadowShade: isGlacial ? '#344960' : isGranite ? '#4E5D70' : '#374252',
      hasSnow: true,
      hasHatching: false,
      points: [
        { x: -3800, y: 1200 },
        { x: -3100, y: -1550 },
        { x: -2450, y: -1020 },
        { x: -1680, y: -2850 },
        { x: -960, y: -1650 },
        { x: -180, y: -3300 },
        { x: 560, y: -1780 },
        { x: 1320, y: -3050 },
        { x: 2150, y: -1450 },
        { x: 2950, y: -2350 },
        { x: 3800, y: 1200 },
      ],
    },
    // Layer 1: Mid-far faceted comic peaks
    {
      parallax: 0.16,
      shade: isGlacial ? '#2E4359' : isGranite ? '#495769' : '#323E4F',
      rimShade: isGlacial ? '#6785A6' : isGranite ? '#738499' : '#53647D',
      shadowShade: isGlacial ? '#1E2D3D' : isGranite ? '#333E4D' : '#212A36',
      hasSnow: isGlacial || route.tier >= 7,
      hasHatching: true,
      points: [
        { x: -3400, y: 1200 },
        { x: -2600, y: -1850 },
        { x: -1820, y: -960 },
        { x: -1120, y: -2620 },
        { x: -380, y: -1480 },
        { x: 460, y: -2860 },
        { x: 1240, y: -1340 },
        { x: 2100, y: -2380 },
        { x: 2850, y: -1200 },
        { x: 3400, y: 1200 },
      ],
    },
    // Layer 2: Near-valley crag silhouettes
    {
      parallax: 0.27,
      shade: isGlacial ? '#1F2F42' : isGranite ? '#35404E' : '#242D3A',
      rimShade: isGlacial ? '#496380' : isGranite ? '#596778' : '#3D4B5E',
      shadowShade: '#151B24',
      hasSnow: false,
      hasHatching: true,
      points: [
        { x: -3000, y: 1200 },
        { x: -2150, y: -1120 },
        { x: -1460, y: -620 },
        { x: -820, y: -1880 },
        { x: -140, y: -1020 },
        { x: 760, y: -2040 },
        { x: 1520, y: -920 },
        { x: 2420, y: -1580 },
        { x: 3000, y: 1200 },
      ],
    },
  ];

  const clouds: CloudBand[] = [];
  for (let i = 0; i < 26; i++) {
    const isCirrus = i % 3 === 0;
    clouds.push({
      x: (rng() - 0.5) * 3400,
      y: -140 - rng() * Math.max(1300, mountainHeight * 0.95),
      width: isCirrus ? 280 + rng() * 320 : 190 + rng() * 260,
      height: isCirrus ? 22 + rng() * 18 : 48 + rng() * 44,
      speed: (isCirrus ? 10 : 5) + rng() * 11,
      parallax: isCirrus ? 0.12 + rng() * 0.14 : 0.2 + rng() * 0.3,
      opacity: isCirrus ? 0.3 + rng() * 0.2 : 0.42 + rng() * 0.28,
      kind: isCirrus ? 'cirrus' : 'cumulus',
    });
  }

  // Soaring alpine birds grouped in 4 natural flocks across valley depths
  const birds: DistantBird[] = [];
  const flockCount = 4;
  for (let f = 0; f < flockCount; f++) {
    const flockDir: 1 | -1 = f % 2 === 0 ? 1 : -1;
    const flockParallax = 0.19 + (f % 3) * 0.11;
    const flockX = (rng() - 0.5) * 1800;
    const flockY = -180 - rng() * Math.max(850, mountainHeight * 0.78);
    const members = 3 + Math.floor(rng() * 3);
    for (let m = 0; m < members; m++) {
      birds.push({
        x: flockX + (m - members * 0.5) * (28 + rng() * 18),
        y: flockY + Math.abs(m - members * 0.5) * 14 + (rng() - 0.5) * 14,
        speed: 22 + rng() * 16,
        parallax: flockParallax,
        scale: 0.72 + flockParallax * 1.45,
        flapSpeed: 4.5 + rng() * 2.2,
        phase: rng() * Math.PI * 2,
        dir: flockDir,
      });
    }
  }

  const cairnStones: Vec2[] = [
    { x: summitCenter + 38, y: -mountainHeight - 6 },
    { x: summitCenter + 38, y: -mountainHeight - 16 },
    { x: summitCenter + 38, y: -mountainHeight - 25 },
    { x: summitCenter + 38, y: -mountainHeight - 32 },
  ];

  // Compute 12-band altitude difficulty slope profile from actual holds, weather & ledges
  const binCount = 12;
  const difficultyProfile: AltitudeDifficultyBin[] = [];
  const holdRiskWeight: Record<HoldType, number> = {
    ledge: 8,
    jug: 18,
    crack: 48,
    crimp: 74,
    fragile: 86,
    ice: 95,
  };

  for (let i = 0; i < binCount; i++) {
    const r0 = i / binCount;
    const r1 = (i + 1) / binCount;
    const midR = (r0 + r1) * 0.5;
    const startM = Math.round(r0 * route.heightM);
    const endM = Math.round(r1 * route.heightM);

    const holdsInBin = holds.filter((h) => {
      const hr = Math.max(0, Math.min(0.9999, -h.y / mountainHeight));
      return hr >= r0 && hr < r1;
    });

    let avgHoldScore = 24 + (tier - 1) * 4;
    let crackCount = 0;
    let crimpCount = 0;
    let fragileCount = 0;
    let iceCount = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    if (holdsInBin.length > 0) {
      let sum = 0;
      for (const h of holdsInBin) {
        sum += holdRiskWeight[h.type];
        if (h.type === 'crack') crackCount++;
        else if (h.type === 'crimp') crimpCount++;
        else if (h.type === 'fragile') fragileCount++;
        else if (h.type === 'ice') iceCount++;
        if (h.x < minX) minX = h.x;
        if (h.x > maxX) maxX = h.x;
      }
      avgHoldScore = sum / holdsInBin.length;
    }

    const lateralSpread = holdsInBin.length >= 2 ? maxX - minX : 0;
    const branchComplexity = Math.min(18, Math.max(0, (lateralSpread - 65) * 0.14));

    let stage = route.weatherStages[0];
    for (const s of route.weatherStages) {
      if (midR >= s.minRatio && midR <= s.maxRatio) {
        stage = s;
        break;
      }
    }
    const weatherBonus =
      stage.type === 'snowstorm'
        ? 24
        : stage.type === 'rain'
          ? 16
          : stage.type === 'mist'
            ? 8
            : 0;

    const hasBivouac = ledges.some((l) => {
      if (!l.isBivouac || l.id === 'base-camp') return false;
      const lr = Math.max(0, Math.min(0.9999, -l.y / mountainHeight));
      return lr >= r0 && lr < r1;
    });

    const rawDiff =
      avgHoldScore * 0.62 +
      (tier - 1) * 2.5 +
      weatherBonus +
      branchComplexity +
      midR * 8 -
      (hasBivouac ? 10 : 0);

    const difficulty = Math.round(Math.max(14, Math.min(100, rawDiff)));

    let challengeTag = '稳固缓坡';
    if (hasBivouac) {
      challengeTag = '露营休整';
    } else if (iceCount > 0) {
      challengeTag = '冰面滑区';
    } else if (fragileCount >= 2 || (fragileCount >= 1 && tier >= 5)) {
      challengeTag = '脆岩多发';
    } else if (crimpCount >= Math.max(2, Math.ceil(holdsInBin.length * 0.36))) {
      challengeTag = '细小指点';
    } else if (stage.type === 'snowstorm') {
      challengeTag = '暴雪强风';
    } else if (stage.type === 'rain') {
      challengeTag = '湿滑雨段';
    } else if (branchComplexity >= 9) {
      challengeTag = '横移分岔';
    } else if (crackCount >= 2) {
      challengeTag = '技术岩缝';
    } else if (difficulty >= 55) {
      challengeTag = '陡峭难点';
    }

    difficultyProfile.push({
      index: i,
      startM,
      endM,
      difficulty,
      challengeTag,
      hasBivouac,
      weatherType: stage.type,
    });
  }

  return {
    route,
    mountainHeight,
    outlineLeft,
    outlineRight,
    facets,
    holds,
    rustyPitons,
    ledges,
    distantPeaks,
    clouds,
    birds,
    cairnStones,
    difficultyProfile,
  };
}
