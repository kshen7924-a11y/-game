import {
  ActiveWeather,
  AltitudeDifficultyBin,
  BadgeInfo,
  ClimbAssessment,
  ClimberSkinConfig,
  ClimberState,
  ClimbStats,
  ClimbStyle,
  CloudBand,
  DistantBird,
  DistantPeak,
  Hold,
  HoldType,
  Ledge,
  LoadoutConfig,
  LoadoutId,
  OverallRatingGrade,
  Piton,
  RoadbookStaminaEstimate,
  RockFacet,
  RouteConfig,
  RouteId,
  RoutePitchSection,
  RouteWallAnalysis,
  Vec2,
  WallSupplyCache,
} from './types';

export const PIXELS_PER_METER = 30;

export const BADGES: BadgeInfo[] = [
  {
    id: 'kids',
    tier: 1,
    tierLabel: '启蒙线',
    title: '天鹅初翼',
    routeName: '天鹅岩缓壁',
    realName: 'Swan Slab',
    heightM: 24,
    subtitle: '优胜美地山谷 · 5.4 · 24m',
    grade: '5.4',
    accentColor: '#34D399',
    emblemMotto: '朝阳初升 · 岩坡启程',
  },
  {
    id: 'intro',
    tier: 2,
    tierLabel: '入门线',
    title: '白马踏云',
    routeName: '白马岩脊',
    realName: 'Whitehorse Ledge',
    heightM: 35,
    subtitle: '新罕布什尔花岗岩 · 5.6 · 35m',
    grade: '5.6',
    accentColor: '#F59E0B',
    emblemMotto: '晨雾岩板 · 步履生风',
  },
  {
    id: 'beginner',
    tier: 3,
    tierLabel: '初级线',
    title: '拱壁冠冕',
    routeName: '皇家拱门',
    realName: 'Royal Arches',
    heightM: 45,
    subtitle: '优胜美地山谷 · 5.7 · 45m',
    grade: '5.7',
    accentColor: '#84CC16',
    emblemMotto: '层拱叠石 · 步步登阶',
  },
  {
    id: 'beginner-plus',
    tier: 4,
    tierLabel: '初级进阶',
    title: '绝崖飞檐',
    routeName: '高危悬廊',
    realName: 'High Exposure',
    heightM: 52,
    subtitle: '肖旺根克山脉 · 5.8 · 52m',
    grade: '5.8',
    accentColor: '#EAB308',
    emblemMotto: '翻越屋檐 · 凌空直面',
  },
  {
    id: 'intermediate',
    tier: 5,
    tierLabel: '中级线',
    title: '蛇纹磐石',
    routeName: '蛇脊壁',
    realName: 'Snake Dike',
    heightM: 62,
    subtitle: '半穹顶西南壁 · 5.9 · 62m',
    grade: '5.9',
    accentColor: '#EA580C',
    emblemMotto: '循脉而上 · 纵贯岩脊',
  },
  {
    id: 'intermediate-plus',
    tier: 6,
    tierLabel: '中级进阶',
    title: '月照砂壁',
    routeName: '月光拱壁',
    realName: 'Moonlight Buttress',
    heightM: 75,
    subtitle: '锡安大峡谷 · 5.10b · 75m',
    grade: '5.10b',
    accentColor: '#0284C7',
    emblemMotto: '双壁流月 · 孤缝通天',
  },
  {
    id: 'advanced',
    tier: 7,
    tierLabel: '高级线',
    title: '玄柱擎天',
    routeName: '魔鬼塔裂隙',
    realName: 'Durrance Route',
    heightM: 88,
    subtitle: '怀俄明魔鬼塔 · 5.10d · 88m',
    grade: '5.10d',
    accentColor: '#6366F1',
    emblemMotto: '六棱玄柱 · 铁壁直冲',
  },
  {
    id: 'advanced-crux',
    tier: 8,
    tierLabel: '高级难点',
    title: '冰谷青莲',
    routeName: '莲花塔南壁',
    realName: 'Lotus Flower Tower',
    heightM: 100,
    subtitle: '不可攀登峰群 · 5.11c · 100m',
    grade: '5.11c',
    accentColor: '#A855F7',
    emblemMotto: '孤塔绽莲 · 绝境破关',
  },
  {
    id: 'master-1',
    tier: 9,
    tierLabel: '大师 Ⅰ',
    title: '白蛛霜刃',
    routeName: '艾格峰北壁',
    realName: 'Heckmair Route',
    heightM: 112,
    subtitle: '瑞士伯尔尼高地 · 5.12a · 112m',
    grade: '5.12a',
    accentColor: '#10B981',
    emblemMotto: '冰雪北墙 · 逆风破霜',
  },
  {
    id: 'master-2',
    tier: 10,
    tierLabel: '大师 Ⅱ',
    title: '寒锋金字塔',
    routeName: '马特洪峰北壁',
    realName: 'Schmid Route',
    heightM: 128,
    subtitle: '瑞士阿尔卑斯 · 5.12d · 128m',
    grade: '5.12d',
    accentColor: '#06B6D4',
    emblemMotto: '极寒孤峰 · 刃脊问鼎',
  },
  {
    id: 'master-3',
    tier: 11,
    tierLabel: '大师绝巅',
    title: '黎明神冕',
    routeName: '黎明之墙',
    realName: 'The Dawn Wall',
    heightM: 145,
    subtitle: '酋长岩东壁 · 5.13c · 145m',
    grade: '5.13c',
    accentColor: '#F43F5E',
    emblemMotto: '迎光而立 · 人类之巅',
  },
];

export const ROUTES: RouteConfig[] = [
  {
    id: 'kids',
    tier: 1,
    tierLabel: '启蒙线',
    grade: '5.4',
    name: '天鹅岩缓壁',
    realName: 'Swan Slab',
    location: '美国 · 优胜美地山谷',
    subtitle: '启蒙线 · 5.4 · 24m · 优胜美地经典入门缓坡',
    description:
      '取材自优胜美地谷底最友善的经典花岗岩教学壁：全程晴朗微风、岩点宽大密集，适合零基础轻松熟悉四肢发力与平衡节奏。',
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
    name: '白马岩脊',
    realName: 'Whitehorse Ledge',
    location: '美国 · 新罕布什尔',
    subtitle: '入门线 · 5.6 · 35m · 开阔花岗岩板与进阶教学',
    description:
      '灵感来自北美经典花岗岩缓壁：坡度平缓开阔，包含进阶操作教学（双击或拖离松手、拖动腰部移重心与甩臂回耐），助你掌握核心攀爬技术。',
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
    name: '皇家拱门',
    realName: 'Royal Arches',
    location: '美国 · 优胜美地山谷',
    subtitle: '初级线 · 5.7 · 45m · 多段花岗岩拱壁与平衡控体',
    description:
      '源自优胜美地标志性的层叠天然石拱路线：脱离辅助提示后需自主辨别岩缝与小指点，稳扎双脚逐段翻越花岗岩阶梯。',
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
    name: '高危悬廊',
    realName: 'High Exposure',
    location: '美国 · 肖旺根克山脉',
    subtitle: '初级进阶 · 5.8 · 52m · 传奇暴露感屋檐与细雨脆岩',
    description:
      '致敬“北美五十经典”之一的肖旺根克传奇屋檐线：岩壁暴露感骤增，高段迎来细雨与风化脆岩，需要沉稳重心与及时补粉。',
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
    name: '蛇脊壁',
    realName: 'Snake Dike',
    location: '美国 · 半穹顶西南壁',
    subtitle: '中级线 · 5.9 · 62m · 半穹顶经典凸起岩脉与阵雨',
    description:
      '灵感源自优胜美地半穹顶西南壁的标志性蛇形岩脉：壁面趋于垂直，中高段伴随山腰阵雨与迷雾，需提前读线规划路线。',
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
    name: '月光拱壁',
    realName: 'Moonlight Buttress',
    location: '美国 · 锡安大峡谷',
    subtitle: '中级进阶 · 5.10b · 75m · 锡安垂直红砂岩裂隙大墙',
    description:
      '取材自犹他州锡安峡谷世界闻名的垂直砂岩指缝大墙：中段迎面遭遇骤雨浓雾与脆岩带，唯有沿着清晰岩缝精准推进方能破壁。',
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
    name: '魔鬼塔裂隙',
    realName: 'Durrance Route',
    location: '美国 · 怀俄明魔鬼塔',
    subtitle: '高级线 · 5.10d · 88m · 六棱柱玄武岩巨塔直裂隙',
    description:
      '复刻怀俄明魔鬼塔标志性的笔直玄武岩柱裂隙：近 90 米高墙布满细腻岩缝与小指边，高段风雪渐起，岩钉与镁粉分配缺一不可。',
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
    tierLabel: '高级难点',
    grade: '5.11c',
    name: '莲花塔南壁',
    realName: 'Lotus Flower Tower',
    location: '加拿大 · 不可攀登峰群',
    subtitle: '高级难点 · 5.11c · 100m · 极北孤立花岗岩尖塔难点壁',
    description:
      '致敬加拿大西北领地“不可攀登峰群”的百米花岗岩尖塔：连续横移与大步距难点穿插薄冰与脆岩，精准路书读线是突破险关的关键。',
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
    tierLabel: '大师 Ⅰ',
    grade: '5.12a',
    name: '艾格峰北壁',
    realName: 'Heckmair Route',
    location: '瑞士 · 伯尔尼高地',
    subtitle: '大师 Ⅰ · 5.12a · 112m · 阿尔卑斯三大北壁极寒冰墙',
    description:
      '踏入阿尔卑斯传奇“白色蜘蛛”冰岩北壁：百米以上寒霜绝壁伴随突发强横风与落冰事故，暴风雪飞速消耗镁粉，严酷考验大师级耐力分配。',
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
    tierLabel: '大师 Ⅱ',
    grade: '5.12d',
    name: '马特洪峰北壁',
    realName: 'Schmid Route',
    location: '瑞士 / 意大利边境',
    subtitle: '大师 Ⅱ · 5.12d · 128m · 阿尔卑斯群峰之王极寒刃脊',
    description:
      '源自马特洪峰冷峻如刃的金字塔北壁经典线：黄金路线大弧度左右迂回，必须在冻雨白毛风中不断横移切入安全岩缝。',
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
    tierLabel: '大师绝巅',
    grade: '5.13c',
    name: '黎明之墙',
    realName: 'The Dawn Wall',
    location: '美国 · 酋长岩东壁',
    subtitle: '大师绝巅 · 5.13c · 145m · 酋长岩终极巨壁巅峰试炼',
    description:
      '致敬现代大岩壁自由攀登的终极丰碑——酋长岩黎明之墙：145 米绝壁、极致苛刻的指尖微点与漫天风雪，唯有大师方能触及破晓云巅。',
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

export const ROUTE_BOOK_MIN_TIER = 5;
export const MASTER_MIN_TIER = 9;

export function isRouteBookSupported(route: RouteConfig): boolean {
  return route.tier >= ROUTE_BOOK_MIN_TIER;
}

export function hasHoldHintsEnabled(route: RouteConfig): boolean {
  return route.tier < ROUTE_BOOK_MIN_TIER;
}

export function isMasterRoute(route: RouteConfig): boolean {
  return route.tier >= MASTER_MIN_TIER;
}

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
  {
    id: 'free-solo',
    label: '徒手攀登',
    subtitle: '无岩钉防粉与任何保护，失败重头开始 · 体力消耗 -50% · 登顶直评 SSS',
    pitonDelta: -99,
    chalkDelta: -99,
    drainMult: 0.5,
    noProtection: true,
  },
];

export const CLIMBER_SKINS: ClimberSkinConfig[] = [
  {
    id: 'alpine-orange',
    name: '山脊经典',
    tag: '默认一',
    subtitle: '蓝橙高山冲锋衣 · 护目镜绒帽 · 探险背包',
    unlockCount: 0,
    artPackId: 'alpine-orange',
    jacket: '#2563EB',
    jacketShadow: '#1E3A8A',
    accent: '#EA580C',
    scarf: '#F59E0B',
    beanie: '#D97706',
    rope: '#F97316',
    headgear: 'beanie',
    packStyle: 'alpine',
    pants: '#334155',
    shoe: '#F59E0B',
  },
  {
    id: 'glacier-cyan',
    name: '极光冰青',
    tag: '默认二',
    subtitle: '冰青高寒冲锋衣 · 头灯防撞盔 · 外挂冰镐包',
    unlockCount: 0,
    artPackId: 'glacier-cyan',
    jacket: '#0891B2',
    jacketShadow: '#164E63',
    accent: '#38BDF8',
    scarf: '#E0F2FE',
    beanie: '#0284C7',
    rope: '#38BDF8',
    headgear: 'helmet',
    packStyle: 'ice-axe',
    pants: '#1E293B',
    shoe: '#38BDF8',
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
  wallAnalysis: RouteWallAnalysis;
  pitchSections: RoutePitchSection[];
  supplyCaches: WallSupplyCache[];
}

export function buildPitchSectionsForRoute(route: RouteConfig): RoutePitchSection[] {
  const byId: Record<RouteId, Array<Omit<RoutePitchSection, 'id' | 'index'>>> = {
    kids: [
      { name: '山谷阳坡', subtitle: '宽大花岗岩板 · 舒展起步', minRatio: 0, maxRatio: 0.38, mood: 'calm' },
      { name: '浅纹岩脊', subtitle: '手脚交替 · 建立节奏', minRatio: 0.38, maxRatio: 0.74, mood: 'flow' },
      { name: '天鹅翼冠顶', subtitle: '开阔缓台 · 迈向山顶', minRatio: 0.74, maxRatio: 1.01, mood: 'summit' },
    ],
    intro: [
      { name: '花岗岩裙壁', subtitle: '开阔起步 · 熟悉重心平移', minRatio: 0, maxRatio: 0.36, mood: 'calm' },
      { name: '晨雾脆岩带', subtitle: '留心裂纹岩点 · 轻快换手', minRatio: 0.36, maxRatio: 0.72, isCrux: true, mood: 'crux' },
      { name: '白马脊顶', subtitle: '雾散见峰 · 稳步冲顶', minRatio: 0.72, maxRatio: 1.01, mood: 'summit' },
    ],
    beginner: [
      { name: '拱门基座', subtitle: '自然岩阶 · 稳固发力', minRatio: 0, maxRatio: 0.3, mood: 'calm' },
      { name: '侧拉岩弧', subtitle: '顺侧拉移重心 · 横移穿行', minRatio: 0.3, maxRatio: 0.56, isCrux: true, mood: 'crux' },
      { name: '半山拱廊', subtitle: '岩台喘息 · 重整呼吸', minRatio: 0.56, maxRatio: 0.78, mood: 'flow' },
      { name: '皇冠冲顶段', subtitle: '拱顶花岗壁 · 一鼓作气', minRatio: 0.78, maxRatio: 1.01, mood: 'summit' },
    ],
    'beginner-plus': [
      { name: '峭壁悬廊', subtitle: '山风渐起 · 选准主线', minRatio: 0, maxRatio: 0.32, mood: 'flow' },
      { name: '凌空大屋檐', subtitle: '反扣翻越 · 经典悬空核心段', minRatio: 0.32, maxRatio: 0.64, isCrux: true, mood: 'crux' },
      { name: '飞檐横渡', subtitle: '摆荡借力 · 直面暴露感', minRatio: 0.64, maxRatio: 0.84, mood: 'flow' },
      { name: '绝壁天台', subtitle: '风过山肩 · 登临顶石', minRatio: 0.84, maxRatio: 1.01, mood: 'summit' },
    ],
    intermediate: [
      { name: '岩脊起攀', subtitle: '循花岗岩脉 · 步步向上', minRatio: 0, maxRatio: 0.28, mood: 'calm' },
      { name: '蛇纹跃抓带', subtitle: '蹬台衔接 · 动态跨越岩脊', minRatio: 0.28, maxRatio: 0.58, isCrux: true, mood: 'crux' },
      { name: '半山风口台', subtitle: '阵风掠壁 · 把握静默窗口', minRatio: 0.58, maxRatio: 0.8, mood: 'flow' },
      { name: '半穹顶岩脊', subtitle: '长距高露 · 决胜山巅', minRatio: 0.8, maxRatio: 1.01, mood: 'summit' },
    ],
    'intermediate-plus': [
      { name: '砂岩双壁', subtitle: '峡谷夹壁 · 精准控重心', minRatio: 0, maxRatio: 0.28, mood: 'flow' },
      { name: '垂直指缝段', subtitle: '连贯指缝 · 谨防支点打滑', minRatio: 0.28, maxRatio: 0.58, isCrux: true, mood: 'crux' },
      { name: '云间营台', subtitle: '薄雾渐浓 · 调整镁粉节奏', minRatio: 0.58, maxRatio: 0.82, mood: 'flow' },
      { name: '月光直冲段', subtitle: '孤缝通天 · 冲破云层', minRatio: 0.82, maxRatio: 1.01, mood: 'summit' },
    ],
    advanced: [
      { name: '玄武岩基柱', subtitle: '六棱柱壁 · 辨明真假岩缝', minRatio: 0, maxRatio: 0.26, mood: 'flow' },
      { name: '杜兰斯烟囱缝', subtitle: '紧凑支撑 · 谨慎控耐', minRatio: 0.26, maxRatio: 0.56, isCrux: true, mood: 'crux' },
      { name: '玄柱钥匙桥', subtitle: '横移跨柱 · 避开死胡同', minRatio: 0.56, maxRatio: 0.82, isCrux: true, mood: 'crux' },
      { name: '塔顶高原', subtitle: '雨雾渐消 · 登顶巨塔', minRatio: 0.82, maxRatio: 1.01, mood: 'summit' },
    ],
    'advanced-crux': [
      { name: '冰谷下壁', subtitle: '寒壁陡立 · 提前规划路书', minRatio: 0, maxRatio: 0.26, mood: 'flow' },
      { name: '莲瓣仰角壁', subtitle: '屋檐反扣 · 连续高耗难点', minRatio: 0.26, maxRatio: 0.56, isCrux: true, mood: 'crux' },
      { name: '孤针横渡段', subtitle: '悬空单线 · 寻找隐秘补给', minRatio: 0.56, maxRatio: 0.82, isCrux: true, mood: 'crux' },
      { name: '青莲塔尖', subtitle: '冰雪高壁 · 孤峰问顶', minRatio: 0.82, maxRatio: 1.01, mood: 'summit' },
    ],
    'master-1': [
      { name: '困难裂隙', subtitle: '北壁入口 · 凛风扑面', minRatio: 0, maxRatio: 0.26, mood: 'flow' },
      { name: '白色蜘蛛冰场', subtitle: '冰岩混合 · 警惕落冰与阵风', minRatio: 0.26, maxRatio: 0.58, isCrux: true, mood: 'crux' },
      { name: '出口冰槽', subtitle: '狭长险关 · 严守耐力底线', minRatio: 0.58, maxRatio: 0.84, isCrux: true, mood: 'crux' },
      { name: '峰顶雪檐', subtitle: '暴雪绝巅 · 最后冲刺', minRatio: 0.84, maxRatio: 1.01, mood: 'summit' },
    ],
    'master-2': [
      { name: '北壁雪坡', subtitle: '极寒起攀 · 读清冰岩走势', minRatio: 0, maxRatio: 0.25, mood: 'flow' },
      { name: '施密特险段', subtitle: '陡直暗冰 · 每步皆须精确', minRatio: 0.25, maxRatio: 0.56, isCrux: true, mood: 'crux' },
      { name: '寒锋横渡墙', subtitle: '暴雪风隙 · 果断通过钥匙孔', minRatio: 0.56, maxRatio: 0.83, isCrux: true, mood: 'crux' },
      { name: '金字塔刃脊', subtitle: '孤锋绝顶 · 破冰登巅', minRatio: 0.83, maxRatio: 1.01, mood: 'summit' },
    ],
    'master-3': [
      { name: '酋长岩下壁', subtitle: '光滑花岗 · 步入极限试炼', minRatio: 0, maxRatio: 0.24, mood: 'flow' },
      { name: '跃抓核心段', subtitle: '全线极难 · 动态连贯突破', minRatio: 0.24, maxRatio: 0.54, isCrux: true, mood: 'crux' },
      { name: '黎明横渡墙', subtitle: '细微指点 · 冷静掌控呼吸', minRatio: 0.54, maxRatio: 0.82, isCrux: true, mood: 'crux' },
      { name: '人类之巅', subtitle: '晨光破晓 · 迎光登顶', minRatio: 0.82, maxRatio: 1.01, mood: 'summit' },
    ],
  };

  const list = byId[route.id] ?? byId.intermediate;
  return list.map((p, index) => ({
    ...p,
    id: `${route.id}-pitch-${index + 1}`,
    index,
  }));
}

/**
 * 关卡岩点生成角色划分（不修改 shared/types.ts 的 Hold 结构，由 mountain.ts 策略层统一管理）
 * - core_path: 核心可攀路径（主干动作段 + 真可选分岔 + 营地/登顶锚点，isDecoy = false）
 * - decorative_dead_end: 装饰性死胡同点（远距绝对不可达的 2~4 点短线，丰富岩壁纵深与层次，isDecoy = true）
 * - far_distractor: 远端干扰点（全壁两侧远距岩脉集群 + 幻象岩岛，丰富高山大墙体量与读线干扰，isDecoy = true）
 * - master_decoy_path: 虚假诱饵路径（中高级起步、大师级强化的“黄金高速诱饵”与侧翼死胡同，isDecoy = true）
 */
export type HoldPlacementRole =
  | 'core_path'
  | 'decorative_dead_end'
  | 'far_distractor'
  | 'master_decoy_path';

/**
 * 进阶/大师级思考型难点逻辑模块
 * - sidepull_gate: 强侧拉门控横移（必须顺侧拉方向配低脚横移，正上方常设直线假路诱饵）
 * - undercling_mantle: 屋檐反扣翻越（先反扣高抬脚、再向外侧岩台翻越）
 * - keyhole_bridge: 钥匙孔单点桥（以 spring 蹬台 + swing 摆荡单线穿过空白岩带，直上是死路）
 * - stamina_dilemma: 耐力博弈双选分岔（近路高耗 crimp/ice/tremor vs 远路回耐 jug/ledge 绕行）
 */
export type MasterCruxLogic =
  | 'sidepull_gate'
  | 'undercling_mantle'
  | 'keyhole_bridge'
  | 'stamina_dilemma';

export interface LevelGenerationStrategy {
  tier: number;
  label: string;
  corePath: {
    stepLen: number;
    corridorClarity: 'high' | 'medium' | 'tactical' | 'master_puzzle';
    viableBranchCount: number;
    staminaDilemmaForks: number;
    enabledCruxLogics: MasterCruxLogic[];
    asymmetricSkipChance: number;
  };
  decorativeDeadEnd: {
    lineCount: number;
    holdsPerLine: [number, number];
    /** 严格大于最大动态够距（98 + 26 = 124px），确保玩家绝对够不到 */
    minDistFromCore: number;
    minDistFromDecoy: number;
    radiusScale: number;
  };
  farDistractor: {
    clusterCount: number;
    clusterSize: [number, number];
    /** 远端干扰点同样与核心线保持不可直达隔离 */
    minDistFromCore: number;
    minDistFromDecoy: number;
    /** 悬浮于远端空白岩壁的诱人“幻象岩岛”数量 */
    phantomIslandCount: number;
  };
  masterDecoyPath: {
    enabled: boolean;
    /** 贴合横移/钥匙孔入口向上延伸的“虚假黄金高速”数量 */
    falseGoldenHighways: number;
    /** 侧翼分岔虚假死胡同数量 */
    flankDecoyBranches: number;
    stepsPerDecoy: [number, number];
    /** 诱饵前 N 步故意放置 jug/ledge/crack 制造“好走错觉” */
    lureHeadSteps: number;
    /** 诱饵中后段与核心路径的最小隔离距离，确保真正成为死胡同 */
    tipMinIsolationFromCore: number;
  };
}

export interface RouteCruxPlacement {
  logic: MasterCruxLogic;
  x: number;
  y: number;
  altitudeM: number;
  summary: string;
}

export interface RouteDecoyPathMeta {
  kind: 'false_golden_highway' | 'flank_decoy';
  entryX: number;
  entryY: number;
  tipX: number;
  tipY: number;
  stepCount: number;
  holdIds: string[];
}

export interface RouteRoleBreakdown {
  strategy: LevelGenerationStrategy;
  counts: Record<HoldPlacementRole, number>;
  holdIdsByRole: Record<HoldPlacementRole, string[]>;
  cruxPlacements: RouteCruxPlacement[];
  decoyPaths: RouteDecoyPathMeta[];
}

const routeRoleBreakdownMap = new WeakMap<MountainWorld, RouteRoleBreakdown>();

export function getRouteRoleBreakdown(world: MountainWorld): RouteRoleBreakdown | null {
  return routeRoleBreakdownMap.get(world) ?? null;
}

export function getLevelGenerationStrategy(
  rawTier: number,
  heightM = 60
): LevelGenerationStrategy {
  const tier = Math.max(1, Math.min(11, Math.round(rawTier)));
  const heightFactor = Math.max(0.75, heightM / 48);

  if (tier <= 2) {
    return {
      tier,
      label: tier === 1 ? '启蒙清晰主线（零陷阱 + 远景层次）' : '入门自然曲线（轻分岔 + 远景层次）',
      corePath: {
        stepLen: 36 + (tier - 1) * 1.2,
        corridorClarity: 'high',
        viableBranchCount: tier === 1 ? 0 : 1,
        staminaDilemmaForks: 0,
        enabledCruxLogics: [],
        asymmetricSkipChance: 0,
      },
      decorativeDeadEnd: {
        lineCount: Math.max(4, Math.round(4 * heightFactor)),
        holdsPerLine: [2, 3],
        minDistFromCore: 132,
        minDistFromDecoy: 120,
        radiusScale: 0.84,
      },
      farDistractor: {
        clusterCount: Math.max(8, Math.round(7 * heightFactor)),
        clusterSize: [1, 2],
        minDistFromCore: 128,
        minDistFromDecoy: 118,
        phantomIslandCount: 0,
      },
      masterDecoyPath: {
        enabled: false,
        falseGoldenHighways: 0,
        flankDecoyBranches: 0,
        stepsPerDecoy: [0, 0],
        lureHeadSteps: 0,
        tipMinIsolationFromCore: 110,
      },
    };
  }

  if (tier <= 4) {
    return {
      tier,
      label: '初级进阶（轻横移 + 少量短死胡同）',
      corePath: {
        stepLen: 37.5 + (tier - 3) * 1.0,
        corridorClarity: 'medium',
        viableBranchCount: tier - 2,
        staminaDilemmaForks: tier === 4 ? 1 : 0,
        enabledCruxLogics:
          tier === 4
            ? ['sidepull_gate', 'undercling_mantle', 'stamina_dilemma']
            : ['sidepull_gate'],
        asymmetricSkipChance: 0.06,
      },
      decorativeDeadEnd: {
        lineCount: Math.max(5, Math.round(5 * heightFactor)),
        holdsPerLine: [2, 3],
        minDistFromCore: 128,
        minDistFromDecoy: 118,
        radiusScale: 0.84,
      },
      farDistractor: {
        clusterCount: Math.max(11, Math.round(9 * heightFactor)),
        clusterSize: [2, 3],
        minDistFromCore: 124,
        minDistFromDecoy: 116,
        phantomIslandCount: tier === 4 ? 2 : 1,
      },
      masterDecoyPath: {
        enabled: true,
        falseGoldenHighways: tier === 4 ? 1 : 0,
        flankDecoyBranches: tier === 3 ? 1 : 2,
        stepsPerDecoy: [3, 4],
        lureHeadSteps: 1,
        tipMinIsolationFromCore: 106,
      },
    };
  }

  if (tier <= 6) {
    return {
      tier,
      label: '中级技术壁（折返横移 + 屋檐反扣 + 诱饵分岔）',
      corePath: {
        stepLen: 39.2 + (tier - 5) * 0.8,
        corridorClarity: 'tactical',
        viableBranchCount: tier - 3,
        staminaDilemmaForks: tier - 3,
        enabledCruxLogics: ['sidepull_gate', 'undercling_mantle', 'stamina_dilemma'],
        asymmetricSkipChance: tier === 6 ? 0.18 : 0.12,
      },
      decorativeDeadEnd: {
        lineCount: Math.max(7, Math.round(6 * heightFactor)),
        holdsPerLine: [2, 4],
        minDistFromCore: 126,
        minDistFromDecoy: 116,
        radiusScale: 0.85,
      },
      farDistractor: {
        clusterCount: Math.max(14, Math.round(10 * heightFactor)),
        clusterSize: [2, 4],
        minDistFromCore: 122,
        minDistFromDecoy: 116,
        phantomIslandCount: tier === 6 ? 4 : 3,
      },
      masterDecoyPath: {
        enabled: true,
        falseGoldenHighways: tier === 5 ? 2 : 3,
        flankDecoyBranches: tier === 5 ? 3 : 4,
        stepsPerDecoy: [4, 5],
        lureHeadSteps: 2,
        tipMinIsolationFromCore: 105,
      },
    };
  }

  if (tier <= 8) {
    return {
      tier,
      label: '高级险关壁（钥匙孔桥 + 强横移门控 + 幻象岩岛）',
      corePath: {
        stepLen: 40.8 + (tier - 7) * 0.7,
        corridorClarity: 'tactical',
        viableBranchCount: tier - 4,
        staminaDilemmaForks: tier - 4,
        enabledCruxLogics: [
          'sidepull_gate',
          'undercling_mantle',
          'keyhole_bridge',
          'stamina_dilemma',
        ],
        asymmetricSkipChance: 0.24,
      },
      decorativeDeadEnd: {
        lineCount: Math.max(9, Math.round(6.5 * heightFactor)),
        holdsPerLine: [3, 4],
        minDistFromCore: 125,
        minDistFromDecoy: 116,
        radiusScale: 0.85,
      },
      farDistractor: {
        clusterCount: Math.max(18, Math.round(11 * heightFactor)),
        clusterSize: [2, 4],
        minDistFromCore: 120,
        minDistFromDecoy: 116,
        phantomIslandCount: tier === 7 ? 5 : 6,
      },
      masterDecoyPath: {
        enabled: true,
        falseGoldenHighways: tier === 7 ? 3 : 4,
        flankDecoyBranches: tier === 7 ? 5 : 6,
        stepsPerDecoy: [4, 6],
        lureHeadSteps: 2,
        tipMinIsolationFromCore: 105,
      },
    };
  }

  // Tier 9..11: Master Alpine Puzzle — dense full-wall rock field that conceals the true line
  const masterLevel = tier - 9; // 0, 1, 2
  return {
    tier,
    label:
      masterLevel === 0
        ? '大师一阶 · 隐线岩迷宫（高密岩壁 + 黄金诱饵 + 钥匙孔门控）'
        : masterLevel === 1
          ? '大师二阶 · 绝壁隐脉（多层交织假路 + 耐力双选）'
          : '大师终阶 · 神山无痕巨壁（全壁高密隐线 + 复合路书试炼）',
    corePath: {
      stepLen: 42.0 + masterLevel * 0.75,
      corridorClarity: 'master_puzzle',
      viableBranchCount: 4 + masterLevel,
      staminaDilemmaForks: 4 + masterLevel,
      enabledCruxLogics: [
        'sidepull_gate',
        'undercling_mantle',
        'keyhole_bridge',
        'stamina_dilemma',
      ],
      asymmetricSkipChance: 0.3 + masterLevel * 0.04,
    },
    decorativeDeadEnd: {
      lineCount: Math.max(18 + masterLevel * 4, Math.round((11 + masterLevel * 1.4) * heightFactor)),
      holdsPerLine: [4, 7],
      minDistFromCore: 82,
      minDistFromDecoy: 68,
      radiusScale: 0.98,
    },
    farDistractor: {
      clusterCount: Math.max(36 + masterLevel * 6, Math.round((18 + masterLevel * 2) * heightFactor)),
      clusterSize: [3, 5],
      minDistFromCore: 76,
      minDistFromDecoy: 64,
      phantomIslandCount: 12 + masterLevel * 3,
    },
    masterDecoyPath: {
      enabled: true,
      falseGoldenHighways: 9 + masterLevel * 2,
      flankDecoyBranches: 11 + masterLevel * 2,
      stepsPerDecoy: [6, 9],
      lureHeadSteps: 3,
      tipMinIsolationFromCore: 88,
    },
  };
}


const YDS_GRADE_LADDER = [
  '5.4',
  '5.5',
  '5.6',
  '5.7',
  '5.8',
  '5.9',
  '5.10a',
  '5.10b',
  '5.10c',
  '5.10d',
  '5.11a',
  '5.11b',
  '5.11c',
  '5.11d',
  '5.12a',
  '5.12b',
  '5.12c',
  '5.12d',
  '5.13a',
  '5.13b',
  '5.13c',
  '5.13d',
  '5.14a',
] as const;

/**
 * 基于当前体力状态与岩壁支点疏密程度的智能分析函数：
 * 结合岩点分布密度、上攀跨步间距、方向性握点比例与当前体力余量，
 * 动态评估岩壁的实际体力压迫度与技术难度得分。
 */
export function analyzeStaminaAndHoldDensity(
  holds: Hold[],
  mountainHeight: number,
  currentStaminaRatio = 1,
  route?: RouteConfig
): RouteWallAnalysis {
  const allActiveHolds = holds.filter((h) => !h.broken);
  const coreHolds = allActiveHolds.filter((h) => !h.isDecoy);
  const activeHolds = coreHolds.length >= 6 ? coreHolds : allActiveHolds;
  const heightM = Math.max(1, mountainHeight / PIXELS_PER_METER);
  const holdsPer10M = Math.round(((activeHolds.length / heightM) * 10) * 10) / 10;

  const staminaClamped = Math.max(0, Math.min(1, currentStaminaRatio));
  const holdRiskMap: Record<HoldType, number> = {
    ledge: 10,
    spring: 16,
    swing: 18,
    jug: 18,
    crack: 46,
    tremor: 64,
    crimp: 72,
    fragile: 82,
    ice: 92,
  };

  let upperStepSum = 0;
  let upperStepCount = 0;
  let sparseCount = 0;
  let holdTechSum = 0;

  for (let i = 0; i < activeHolds.length; i++) {
    const h = activeHolds[i];
    let dirPenalty = 0;
    if (h.gripKind === 'sidepullLeft' || h.gripKind === 'sidepullRight') dirPenalty = 10;
    else if (h.gripKind === 'undercling') dirPenalty = 14;
    holdTechSum += holdRiskMap[h.type] + dirPenalty + (h.wet ? 9 : 0);

    // Exclude summit top holds when measuring upward stepping intervals
    if (h.y <= -mountainHeight + 44) continue;

    let minUpperDist = Infinity;
    let localNeighbors = 0;
    for (let j = 0; j < activeHolds.length; j++) {
      if (i === j) continue;
      const other = activeHolds[j];
      const dx = other.x - h.x;
      const dy = other.y - h.y;
      const d = Math.hypot(dx, dy);
      if (d <= 74) localNeighbors++;
      if (other.y < h.y - 10 && other.y >= h.y - 145) {
        if (d < minUpperDist) minUpperDist = d;
      }
    }

    if (minUpperDist < Infinity) {
      upperStepSum += minUpperDist;
      upperStepCount++;
      if (minUpperDist > 62 || localNeighbors <= 1) {
        sparseCount++;
      }
    }
  }

  const avgUpperStepPx =
    upperStepCount > 0 ? Math.round((upperStepSum / upperStepCount) * 10) / 10 : 48;
  const sparseSectionRatio =
    upperStepCount > 0 ? Math.round((sparseCount / upperStepCount) * 1000) / 1000 : 0.2;

  let densityLabel: RouteWallAnalysis['densityLabel'] = '适中节奏';
  if (avgUpperStepPx <= 44 && sparseSectionRatio < 0.16) {
    densityLabel = '密集支点';
  } else if (avgUpperStepPx <= 53 && sparseSectionRatio < 0.34) {
    densityLabel = '适中节奏';
  } else if (avgUpperStepPx <= 62 && sparseSectionRatio < 0.56) {
    densityLabel = '稀疏长距';
  } else {
    densityLabel = '绝壁稀缺';
  }

  const avgHoldTech = activeHolds.length > 0 ? holdTechSum / activeHolds.length : 35;
  const densityPressure = Math.max(0, (avgUpperStepPx - 38) * 1.15) + sparseSectionRatio * 34;
  // Lower remaining stamina amplifies the technical demand of sparse rock sections
  const fatigueAmp = 1 + (1 - staminaClamped) * (0.28 + sparseSectionRatio * 0.42);
  const tierFactor = route ? (route.tier - 1) * 2.4 : 0;

  const baseTechnicalScore = Math.round(
    Math.max(12, Math.min(100, (avgHoldTech * 0.56 + densityPressure * 0.44 + tierFactor) * fatigueAmp))
  );

  return {
    holdsPer10M,
    avgUpperStepPx,
    sparseSectionRatio,
    densityLabel,
    baseTechnicalScore,
  };
}

/**
 * 通关后根据「体力消耗记录」「岩点疏密分析」与「关键动作失误率」
 * 自动评估该次攀登的实际技术线路难度，并给出综合评分等级。
 */
export function evaluateClimbAssessment(
  world: MountainWorld,
  stats: ClimbStats,
  climbStyle: ClimbStyle,
  loadoutId: LoadoutId = 'balanced'
): ClimbAssessment {
  const isFreeSolo = loadoutId === 'free-solo';
  const avgStaminaRemainingPct = Math.round(
    stats.staminaSampleCount > 0
      ? Math.max(0, Math.min(100, stats.staminaSamplesSum / stats.staminaSampleCount))
      : 72
  );
  const avgStaminaRatio = avgStaminaRemainingPct / 100;

  const liveAnalysis = analyzeStaminaAndHoldDensity(
    world.holds,
    world.mountainHeight,
    avgStaminaRatio,
    world.route
  );

  const heightUnits10M = Math.max(1, world.route.heightM / 10);
  const staminaConsumedTotal = Math.round(stats.staminaSpent);
  const staminaRecoveredTotal = Math.round(stats.staminaRecovered);
  const netStaminaTotal = Math.round(stats.staminaSpent - stats.staminaRecovered);
  const staminaConsumedPer10M = Math.round((stats.staminaSpent / heightUnits10M) * 10) / 10;

  const totalActions = Math.max(
    1,
    stats.keyActionAttempts + stats.fallsCaught,
    stats.movesMade + stats.keyActionErrors
  );
  const mistakeRate = Math.max(0, Math.min(1, stats.keyActionErrors / totalActions));
  const keyActionMistakeRatePct = Math.round(mistakeRate * 1000) / 10;

  // Expected baseline stamina burn per 10m scaled by route tier
  const expectedBurnPer10M = (15 + world.route.tier * 2.4) * (isFreeSolo ? 0.5 : 1);
  const staminaBurnRatio = staminaConsumedPer10M / Math.max(8, expectedBurnPer10M);

  const fatigueTechShift =
    (liveAnalysis.baseTechnicalScore - world.wallAnalysis.baseTechnicalScore) / 13;
  const staminaShift = (staminaBurnRatio - 1.0) * 1.15;
  const mistakeShift = (mistakeRate - 0.06) * 5.2 + stats.fallsCaught * 0.45;
  const smoothBonusShift =
    mistakeRate < 0.04 && stats.fallsCaught === 0 && avgStaminaRemainingPct >= 68 ? -0.65 : 0;

  const gradeDelta = isFreeSolo
    ? Math.max(1, Math.min(3, Math.round(fatigueTechShift + staminaShift + mistakeShift + 1)))
    : Math.max(
        -1,
        Math.min(3, Math.round(fatigueTechShift + staminaShift + mistakeShift + smoothBonusShift))
      );

  const nominalIdx = Math.max(
    0,
    YDS_GRADE_LADDER.indexOf(world.route.grade as (typeof YDS_GRADE_LADDER)[number])
  );
  const assessedIdx = Math.max(
    0,
    Math.min(YDS_GRADE_LADDER.length - 1, nominalIdx + gradeDelta)
  );
  const assessedGrade = YDS_GRADE_LADDER[assessedIdx];

  const gradeDeltaLabel = isFreeSolo
    ? `徒手无保护突破（心理与技术 +${gradeDelta} 档）`
    : gradeDelta > 0
      ? `实测难度 +${gradeDelta} 档（高压技术挑战）`
      : gradeDelta < 0
        ? '实测体感 -1 档（高效流畅掌控）'
        : '实测符合标称技术定级';

  const supportsRoadbook = isRouteBookSupported(world.route);
  let roadbookNote: string | undefined;
  if (supportsRoadbook) {
    if (stats.betaPinsPlanned > 0) {
      const execPct = Math.min(
        100,
        Math.round((stats.betaPinsFollowed / stats.betaPinsPlanned) * 100)
      );
      const flowSuffix =
        stats.roadbookFlowHits >= 2
          ? `触发 ${stats.roadbookFlowHits} 次路书连贯提速，避开干扰点显著加快登顶。`
          : '';
      roadbookNote =
        execPct >= 75
          ? `路书规划 ${stats.betaPinsPlanned} 步 · 命中 ${stats.betaPinsFollowed} 步（执行率 ${execPct}%），提前读线与路线执行力出色。${flowSuffix}`
          : `路书规划 ${stats.betaPinsPlanned} 步 · 命中 ${stats.betaPinsFollowed} 步（执行率 ${execPct}%），攀爬中适时临场微调了线路。${flowSuffix}`;
    } else {
      roadbookNote =
        stats.fallsCaught === 0
          ? '未使用路书标记，纯凭临场读线能力一次稳健登顶。'
          : '本次未绘制路书节点，中级以上干扰岩点密集，提前标记「路书」可避开死胡同并加快登顶。';
    }
  }

  if (isFreeSolo) {
    return {
      assessedGrade,
      gradeDeltaLabel,
      overallScore: 100,
      ratingGrade: 'SSS',
      ratingTitle: '传奇徒手完攀 · 致敬亚历克斯',
      staminaConsumedTotal,
      staminaRecoveredTotal,
      netStaminaTotal,
      staminaConsumedPer10M,
      avgStaminaRemainingPct,
      keyActionMistakeRatePct,
      holdDensityLabel: world.wallAnalysis.densityLabel,
      summaryNote: `零岩钉、零防滑粉、零保护一次登顶「${world.wallAnalysis.densityLabel}」绝壁（耗体 ${staminaConsumedTotal} · 回复 ${staminaRecoveredTotal} · 失误率 ${keyActionMistakeRatePct}%）。`,
      roadbookNote,
      isFreeSolo: true,
      tributeNote:
        '无绳、无钉、无退路——以绝对的冷静与专注完成徒手独攀，谨以此 SSS 级完攀向徒手攀登传奇亚历克斯·霍诺德（Alex Honnold）致敬！',
    };
  }

  let rawScore = 100;
  rawScore -= Math.min(34, mistakeRate * 75);
  rawScore -= Math.min(24, stats.fallsCaught * 11);
  rawScore -= Math.max(0, Math.min(18, (staminaBurnRatio - 1.05) * 14));
  rawScore -= Math.max(0, Math.min(10, (55 - avgStaminaRemainingPct) * 0.25));
  if (climbStyle === 'onsight') rawScore += 5;
  else if (climbStyle === 'redpoint') rawScore += 2;
  if (world.wallAnalysis.sparseSectionRatio >= 0.28 && mistakeRate <= 0.06) {
    rawScore += 3;
  }
  if (supportsRoadbook && stats.roadbookFlowHits >= 3) {
    rawScore += 2;
  }

  const overallScore = Math.round(Math.max(42, Math.min(100, rawScore)));

  let ratingGrade: OverallRatingGrade = 'C';
  let ratingTitle = '艰难完赛 · 建议加强读线与节奏';
  if (overallScore >= 94 && stats.fallsCaught === 0) {
    ratingGrade = 'S+';
    ratingTitle = '大师级完攀 · 零失误精密控体';
  } else if (overallScore >= 86) {
    ratingGrade = 'S';
    ratingTitle = '卓越攀登 · 体力与动作精准';
  } else if (overallScore >= 75) {
    ratingGrade = 'A';
    ratingTitle = '稳健登顶 · 线路掌控良好';
  } else if (overallScore >= 62) {
    ratingGrade = 'B';
    ratingTitle = '成功突破 · 仍有省力空间';
  }

  const summaryNote =
    stats.fallsCaught === 0 && mistakeRate <= 0.05
      ? `在「${world.wallAnalysis.densityLabel}」岩壁耗体 ${staminaConsumedTotal}、回复 ${staminaRecoveredTotal}，均余 ${avgStaminaRemainingPct}% 耐力且失误率仅 ${keyActionMistakeRatePct}%。`
      : staminaBurnRatio > 1.2
        ? `累计耗体 ${staminaConsumedTotal}（回复 ${staminaRecoveredTotal}），在${world.wallAnalysis.densityLabel}段可多沿路书主线并用双脚顶撑、甩臂回耐。`
        : `耗体 ${staminaConsumedTotal} / 回复 ${staminaRecoveredTotal}，失误率 ${keyActionMistakeRatePct}%；留意侧拉/反扣重心与路书顺畅衔接可冲击更高评价。`;

  return {
    assessedGrade,
    gradeDeltaLabel,
    overallScore,
    ratingGrade,
    ratingTitle,
    staminaConsumedTotal,
    staminaRecoveredTotal,
    netStaminaTotal,
    staminaConsumedPer10M,
    avgStaminaRemainingPct,
    keyActionMistakeRatePct,
    holdDensityLabel: world.wallAnalysis.densityLabel,
    summaryNote,
    roadbookNote,
  };
}

/**
 * 为中级及以上线路生成智能参考路书序列：
 * 采用 2 步前瞻避开死胡同与干扰岩点，结合岩点安全度、手脚跨度与徒手安全余量，挑选快速且稳妥的最优读线。
 */
export function generateSuggestedRoadbook(
  world: MountainWorld,
  fromPos: Vec2,
  maxPins = 10,
  loadoutId: LoadoutId = 'balanced'
): string[] {
  const isFreeSolo = loadoutId === 'free-solo';
  const candidates = world.holds.filter(
    (h) => !h.broken && h.y < fromPos.y - 14 && h.y >= fromPos.y - 720
  );
  if (candidates.length === 0) return [];

  const typeWeight: Record<HoldType, number> = {
    ledge: 36,
    swing: 34,
    spring: 30,
    jug: 28,
    crack: 18,
    crimp: isFreeSolo ? -14 : -8,
    tremor: isFreeSolo ? -26 : -14,
    fragile: isFreeSolo ? -55 : -36,
    ice: isFreeSolo ? -46 : -28,
  };

  const getUpwardContinuationScore = (h: Hold): number => {
    if (h.y <= -world.mountainHeight + 55) return 28;
    const nextNeighbors = world.holds.filter(
      (n) =>
        !n.broken &&
        n.id !== h.id &&
        n.y <= h.y + 8 &&
        n.y >= h.y - 102 &&
        Math.hypot(n.x - h.x, n.y - h.y) <= 98 &&
        (h.y - n.y >= 10 || Math.abs(n.x - h.x) >= 24)
    );
    if (nextNeighbors.length === 0) return -72;
    let best2nd = -42;
    for (const n of nextNeighbors) {
      let s2 = typeWeight[n.type];
      if (n.wet) s2 -= isFreeSolo ? 16 : 8;
      if (n.isDecoy) s2 -= 24;
      const has3rd =
        n.y <= -world.mountainHeight + 55 ||
        world.holds.some(
          (n2) =>
            !n2.broken &&
            n2.id !== n.id &&
            n2.id !== h.id &&
            n2.y < n.y - 12 &&
            Math.hypot(n2.x - n.x, n2.y - n.y) <= 98
        );
      if (!has3rd) s2 -= 46;
      if (s2 > best2nd) best2nd = s2;
    }
    return best2nd * 0.48 + Math.min(10, nextNeighbors.length * 3);
  };

  const selected: string[] = [];
  const usedIds = new Set<string>();
  let cur: Vec2 = { x: fromPos.x, y: fromPos.y - 12 };

  for (let step = 0; step < maxPins; step++) {
    let best: Hold | null = null;
    let bestScore = -Infinity;

    for (const h of candidates) {
      if (usedIds.has(h.id)) continue;
      const dy = cur.y - h.y;
      const dx = Math.abs(h.x - cur.x);
      // Allow intentional lateral traverse steps (small dy, moderate dx) as well as upward steps
      if (dy < -4 || dy > 92) continue;
      if (dy < 14 && dx < 22) continue;
      const d = Math.hypot(h.x - cur.x, h.y - cur.y);
      if (d > 100) continue;

      let score = typeWeight[h.type];
      if (h.wet) score -= isFreeSolo ? 20 : 12;
      if (h.gripKind === 'undercling') score -= 5;
      else if (h.gripKind === 'sidepullLeft' || h.gripKind === 'sidepullRight') score -= 2;
      if (h.isDecoy) score -= 42;

      // Favor clean vertical efficiency while still permitting necessary lateral traverses
      score += dy >= 14 ? Math.min(30, dy * 0.48) : 6 + dx * 0.14;
      if (d > 86) score -= (d - 86) * 1.15;
      score += getUpwardContinuationScore(h);

      if (score > bestScore) {
        bestScore = score;
        best = h;
      }
    }

    if (!best) break;
    selected.push(best.id);
    usedIds.add(best.id);
    cur = { x: best.x, y: best.y };
    if (best.y <= -world.mountainHeight + 24) break;
  }

  return selected;
}

/**
 * 实时计算已标记路书序列的预计体力消耗、途中回复与净变化（含徒手-50%与湿滑风险）
 */
export function estimateRoadbookStamina(
  world: MountainWorld,
  pinIds: string[],
  climber: ClimberState,
  weather: ActiveWeather,
  loadoutId: LoadoutId
): RoadbookStaminaEstimate {
  const loadout =
    LOADOUT_OPTIONS.find((l) => l.id === loadoutId) ?? LOADOUT_OPTIONS[1];
  const isFreeSolo = !!loadout.noProtection || loadout.id === 'free-solo';
  const drainMult = world.route.drainMultiplier * loadout.drainMult;

  const holdMap = new Map<string, Hold>();
  for (const h of world.holds) {
    holdMap.set(h.id, h);
  }

  const holdsSeq = pinIds
    .map((id) => holdMap.get(id))
    .filter((h): h is Hold => !!h && !h.broken);

  if (holdsSeq.length === 0) {
    return {
      pinCount: 0,
      totalAscentM: 0,
      estimatedDrain: 0,
      estimatedRecovery: 0,
      netStaminaChange: 0,
      projectedRemainingStamina: Math.round(climber.stamina),
      estimatedTimeSec: 0,
      decoyHitsCount: 0,
      riskySpanCount: 0,
      verdictLabel: '尚未标记路书节点，可点岩点或点「参考路书」自动计算耗体与回复',
      freeSoloNote: isFreeSolo
        ? '徒手无防滑粉无保护，务必先读线避开脆岩/冰面死胡同'
        : undefined,
    };
  }

  let prevPos: Vec2 = { x: climber.torsoPos.x, y: climber.torsoPos.y };
  let totalDrain = 0;
  let totalRecovery = 0;
  let totalTimeSec = 0;
  let decoyHitsCount = 0;
  let riskySpanCount = 0;

  const holdStrainCost: Record<HoldType, number> = {
    ledge: 0.4,
    swing: 1.05,
    spring: 1.15,
    jug: 1.55,
    crack: 2.35,
    tremor: 3.1,
    crimp: 3.45,
    fragile: 4.1,
    ice: 4.3,
  };

  const startY = climber.torsoPos.y;
  let maxPinUpY = startY;

  for (let i = 0; i < holdsSeq.length; i++) {
    const h = holdsSeq[i];
    if (h.y < maxPinUpY) maxPinUpY = h.y;
    const stepD = Math.hypot(h.x - prevPos.x, h.y - prevPos.y);
    const dy = Math.max(0, prevPos.y - h.y);
    const dx = Math.abs(h.x - prevPos.x);

    if (h.isDecoy) decoyHitsCount++;
    if (stepD > 132) riskySpanCount++;

    // Roadbook flow lowers step move time (~1.75s..3.2s depending on reach & hold difficulty)
    const baseMoveSec =
      1.65 +
      stepD / 85 +
      (h.type === 'crimp' || h.type === 'ice' || h.type === 'fragile' || h.type === 'tremor' ? 0.55 : 0) +
      (h.isDecoy ? 0.95 : 0);
    totalTimeSec += baseMoveSec;

    // Step stamina consumption
    const spanPenalty = stepD > 125 ? 5.2 : stepD > 95 ? 2.4 : 0;
    const dirPenalty =
      h.gripKind === 'undercling'
        ? 0.9
        : h.gripKind === 'sidepullLeft' || h.gripKind === 'sidepullRight'
          ? 0.55
          : 0;
    const wetPenalty = h.wet ? (isFreeSolo ? 1.55 : 0.85) : 0;
    const decoyPenalty = h.isDecoy ? 2.1 : 0;
    const weatherMult =
      weather.type === 'snowstorm' ? 1.22 : weather.type === 'rain' ? 1.14 : 1.0;

    // Roadbook clean flow gives ~14% rhythm stamina saving on non-decoy holds
    const flowSaving = !h.isDecoy ? 0.86 : 1.08;
    const stepDrain =
      (holdStrainCost[h.type] +
        dy * 0.022 +
        dx * 0.015 +
        spanPenalty +
        dirPenalty +
        wetPenalty +
        decoyPenalty) *
      Math.max(0.42, drainMult) *
      weatherMult *
      flowSaving;

    totalDrain += stepDrain;

    // Natural stamina recovery opportunities on ledges, jugs, or bivouacs along route
    const nearBivouac = world.ledges.some(
      (l) => !l.isSummit && Math.abs(l.y - h.y) <= 28 && Math.abs(l.x - h.x) <= l.width * 0.65
    );
    if (nearBivouac) {
      totalRecovery += 14.5;
    } else if (h.type === 'ledge') {
      totalRecovery += 5.8;
    } else if (h.type === 'swing' && !h.isDecoy) {
      totalRecovery += 5.4;
    } else if (h.type === 'spring' && !h.isDecoy) {
      totalRecovery += 3.2;
    } else if (h.type === 'jug' && !h.isDecoy && stepD <= 88) {
      // Brief balanced shake-out recovery on solid jugs
      totalRecovery += 2.2;
    }

    prevPos = { x: h.x, y: h.y };
  }

  const estimatedDrain = Math.round(totalDrain * 10) / 10;
  const estimatedRecovery = Math.round(totalRecovery * 10) / 10;
  const netStaminaChange = Math.round((estimatedRecovery - estimatedDrain) * 10) / 10;
  const projectedRemainingStamina = Math.round(
    Math.max(0, Math.min(climber.maxStamina, climber.stamina + netStaminaChange))
  );
  const totalAscentM = Math.max(
    0,
    Math.round(((startY - maxPinUpY) / PIXELS_PER_METER) * 10) / 10
  );

  let verdictLabel = '路线节奏稳健 · 耐力可控';
  if (decoyHitsCount > 0 || riskySpanCount > 0) {
    verdictLabel = `含 ${decoyHitsCount} 处干扰岔点 / ${riskySpanCount} 处超距跨步，建议调整`;
  } else if (projectedRemainingStamina <= 20) {
    verdictLabel = '长段高耗能 · 途中建议在稳点甩臂回耐';
  } else if (netStaminaChange >= -8) {
    verdictLabel = '黄金省力速攀线 · 体力收支极佳';
  }

  let freeSoloNote: string | undefined;
  if (isFreeSolo) {
    const hasSlipHazard = holdsSeq.some((h) => h.type === 'ice' || h.type === 'fragile' || h.wet);
    freeSoloNote = hasSlipHazard
      ? '徒手耗体减半，但无防滑粉——尽量绕开路书中的脆岩与湿冰点'
      : '徒手耗体 -50% 且全线稳固，按路书连贯推进可极速登顶';
  }

  return {
    pinCount: holdsSeq.length,
    totalAscentM,
    estimatedDrain,
    estimatedRecovery,
    netStaminaChange,
    projectedRemainingStamina,
    estimatedTimeSec: Math.round(totalTimeSec),
    decoyHitsCount,
    riskySpanCount,
    verdictLabel,
    freeSoloNote,
  };
}

export function generateMountain(route: RouteConfig): MountainWorld {
  const rng = createRng(route.seed);
  const mountainHeight = route.heightM * PIXELS_PER_METER;

  const summitCenter = getMountainCenterOffset(-mountainHeight, mountainHeight);
  const outlineLeft: Vec2[] = [];
  const outlineRight: Vec2[] = [];

  const stepY = 48;
  for (let y = 120; y > -mountainHeight + 26; y -= stepY) {
    const b = getCliffBounds(y, mountainHeight);
    const jitterL = (rng() - 0.5) * 14;
    const jitterR = (rng() - 0.5) * 14;
    outlineLeft.push({ x: b.left + jitterL, y });
    outlineRight.push({ x: b.right + jitterR, y });
  }
  outlineLeft.push({ x: summitCenter - 84, y: -mountainHeight + 2 });
  outlineRight.push({ x: summitCenter + 84, y: -mountainHeight + 2 });

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

  const strategy = getLevelGenerationStrategy(route.tier, route.heightM);
  const holdIdsByRole: Record<HoldPlacementRole, string[]> = {
    core_path: [],
    decorative_dead_end: [],
    far_distractor: [],
    master_decoy_path: [],
  };
  const cruxPlacements: RouteCruxPlacement[] = [];
  const decoyPaths: RouteDecoyPathMeta[] = [];

  const pushHold = (
    x: number,
    y: number,
    type: HoldType,
    zone: number,
    radiusOverride?: number,
    wet = false,
    forceDownpull = false,
    role: HoldPlacementRole = 'core_path',
    forcedGripKind?: Hold['gripKind']
  ) => {
    const isDecoy = role !== 'core_path';
    const stabilityMap: Record<HoldType, number> = {
      ledge: 1.45,
      swing: 1.32,
      jug: 1.25,
      spring: 1.2,
      crack: 1.05,
      tremor: 0.88,
      crimp: 0.76,
      fragile: 0.68,
      ice: 0.48,
    };
    const radiusMap: Record<HoldType, number> = {
      ledge: 14,
      swing: 13,
      spring: 12.5,
      jug: 12,
      tremor: 11.5,
      crack: 11,
      crimp: 9,
      fragile: 10.5,
      ice: 10,
    };

    let gripKind: Hold['gripKind'] = forcedGripKind ?? 'downpull';
    if (
      !forcedGripKind &&
      !forceDownpull &&
      type !== 'ledge' &&
      type !== 'ice' &&
      type !== 'spring' &&
      type !== 'swing' &&
      type !== 'tremor' &&
      route.tier >= 3
    ) {
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

    const hold: Hold = {
      id: `hold-${holdCounter++}`,
      x,
      y,
      radius: radiusOverride ?? radiusMap[type],
      type,
      gripKind,
      shapeVariant: Math.floor(rng() * 10),
      stability: stabilityMap[type],
      angle: baseAngle,
      depth: 5 + rng() * 5,
      crackProgress: 0,
      broken: false,
      chalked: false,
      wet,
      zone,
      ...(isDecoy ? { isDecoy: true } : {}),
      ...(type === 'tremor'
        ? { tremorFreq: 18 + rng() * 14, tremorEnergy: 0 }
        : {}),
    };
    holds.push(hold);
    holdIdsByRole[role].push(hold.id);
    return hold;
  };

  const canPlaceHold = (x: number, y: number, minD = 26) => {
    for (const existing of holds) {
      if (Math.hypot(existing.x - x, existing.y - y) < minD) return false;
    }
    return true;
  };

  // Starting anchor holds around 0m base camp (preserved verbatim for tutorial & stable start)
  pushHold(-22, -22, 'jug', 0, undefined, false, true, 'core_path');
  pushHold(22, -24, 'jug', 0, undefined, false, true, 'core_path');
  pushHold(-20, -64, 'jug', 0, undefined, false, true, 'core_path');
  pushHold(22, -68, 'jug', 0, undefined, false, true, 'core_path');
  pushHold(-38, -46, 'ledge', 0, undefined, false, true, 'core_path');
  pushHold(38, -48, 'ledge', 0, undefined, false, true, 'core_path');

  if (route.hasTutorial) {
    pushHold(-16, -104, 'jug', 0, 13, false, true, 'core_path');
    pushHold(22, -110, 'jug', 0, 13, false, true, 'core_path');
  }

  // ============================================================================
  // LEVEL GENERATION STRATEGY (4 EXPLICIT ROLE LAYERS)
  // Stage 1 [core_path]:           Clear climbing spine + Master cerebral crux motifs + viable dilemma branches + camp/summit anchors
  // Stage 2 [master_decoy_path]:   False Golden Highways above traverses/keyholes + flank dead-end traps (Tier >= 3, peak on Tier 9..11)
  // Stage 3 [decorative_dead_end]: Strictly unreachable 2~4 hold short dead-end rock lines (>= 124px from core) for visual depth
  // Stage 4 [far_distractor]:      Full-wall flank veins & Phantom Islands across [-248..+248] (>= 120px from core, never bridging decoys)
  // ============================================================================
  const tier = strategy.tier;
  const hasRainRoute = route.weatherStages.some((s) => s.type === 'rain');

  const isWetHold = (hType: HoldType, progress: number, extraChance = 0) =>
    tier >= 4 &&
    hType !== 'ledge' &&
    hType !== 'ice' &&
    hType !== 'spring' &&
    hType !== 'swing' &&
    hType !== 'tremor' &&
    rng() < (hasRainRoute ? 0.12 + progress * 0.08 : 0.055) + extraChance;

  const pickMainType = (isPrimary: boolean, progress: number): HoldType => {
    const r = rng();
    if (tier === 1) return r < 0.72 ? 'jug' : 'ledge';
    if (tier === 2) {
      if (!isPrimary && progress > 0.34 && r < 0.14) return 'fragile';
      return r < 0.64 ? 'jug' : r < 0.85 ? 'ledge' : 'crack';
    }
    if (tier === 3) return r < 0.54 ? 'jug' : r < 0.88 ? 'crack' : 'crimp';
    if (tier === 4) return r < 0.44 ? 'jug' : r < 0.82 ? 'crack' : 'crimp';
    if (tier === 5) return isPrimary ? (r < 0.38 ? 'jug' : 'crack') : r < 0.64 ? 'crack' : 'crimp';
    if (tier === 6) return isPrimary ? (r < 0.28 ? 'jug' : r < 0.74 ? 'crack' : 'crimp') : r < 0.48 ? 'crack' : 'crimp';
    if (tier === 7) return isPrimary ? (r < 0.22 ? 'jug' : r < 0.66 ? 'crack' : 'crimp') : r < 0.4 ? 'crack' : 'crimp';
    if (tier === 8) return isPrimary ? (r < 0.18 ? 'jug' : r < 0.58 ? 'crack' : 'crimp') : r < 0.34 ? 'crack' : 'crimp';
    if (tier === 9) {
      if (!isPrimary && progress > 0.38 && r < 0.18) return 'ice';
      return isPrimary ? (r < 0.16 ? 'jug' : r < 0.54 ? 'crack' : 'crimp') : r < 0.32 ? 'crack' : 'crimp';
    }
    if (tier === 10) {
      if (!isPrimary && progress > 0.3 && r < 0.24) return 'ice';
      return isPrimary ? (r < 0.13 ? 'jug' : r < 0.48 ? 'crack' : 'crimp') : r < 0.28 ? 'crack' : 'crimp';
    }
    if (!isPrimary && progress > 0.24 && r < 0.28) return 'ice';
    return isPrimary ? (r < 0.11 ? 'jug' : r < 0.44 ? 'crack' : 'crimp') : r < 0.24 ? 'crack' : 'crimp';
  };

  // Build pitch anchors from base -> bivouacs -> summit
  const anchorPoints: Vec2[] = [
    { x: 0, y: route.hasTutorial ? -120 : -82 },
    ...ledges
      .filter((l) => l.isBivouac && l.id !== 'base-camp')
      .map((l) => ({ x: l.x, y: l.y })),
    { x: summitCenter, y: -mountainHeight + 18 },
  ].sort((a, b) => b.y - a.y);

  interface SpineWaypoint {
    x: number;
    y: number;
    motif:
      | 'flow'
      | 'traverse'
      | 'roof_undercling'
      | 'keyhole_bridge'
      | 'asymmetric_crux'
      | 'dynamic_flow';
    traverseDir?: -1 | 1;
  }

  const spineWaypoints: SpineWaypoint[] = [];
  const clampClimbX = (x: number, y: number, margin = 46): number => {
    const b = getCliffBounds(y, mountainHeight);
    return Math.max(b.left + margin, Math.min(b.right - margin, x));
  };

  for (let seg = 0; seg < anchorPoints.length - 1; seg++) {
    const p0 = anchorPoints[seg];
    const p1 = anchorPoints[seg + 1];
    const segH = p0.y - p1.y;
    const isFinalPitch = seg === anchorPoints.length - 2;

    if (seg === 0) {
      spineWaypoints.push({ x: p0.x, y: p0.y, motif: 'flow' });
    }

    if (tier <= 2) {
      // Beginner / Kids: clear, unmistakable gentle natural curve
      const midY = (p0.y + p1.y) * 0.5;
      const sway = (seg % 2 === 0 ? 1 : -1) * (tier === 1 ? 30 : 48);
      spineWaypoints.push({
        x: clampClimbX((p0.x + p1.x) * 0.5 + sway, midY, 54),
        y: midY,
        motif: 'flow',
      });
    } else if (tier <= 4) {
      // Tier 3-4: 1 clear diagonal sidepull traverse + High Exposure roof undercling on Tier 4 upper pitch
      const dir: -1 | 1 = (seg + tier) % 2 === 0 ? 1 : -1;
      const y1 = p0.y - segH * 0.34;
      const y2 = p0.y - segH * 0.58;
      const shift = dir * (58 + (tier - 3) * 20);
      spineWaypoints.push({
        x: clampClimbX(p0.x - dir * 24, y1, 48),
        y: y1,
        motif: 'flow',
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + shift, y2, 48),
        y: y2,
        motif: tier === 4 && seg === 0 ? 'roof_undercling' : 'traverse',
        traverseDir: dir,
      });
    } else if (tier <= 6) {
      // Tier 5-6: Sidepull gate traverse + undercling mantle roof
      const dir: -1 | 1 = (seg + tier) % 2 === 0 ? 1 : -1;
      const y1 = p0.y - segH * 0.26;
      const y2 = p0.y - segH * 0.48;
      const y3 = p0.y - segH * 0.74;
      spineWaypoints.push({
        x: clampClimbX(p0.x - dir * 56, y1, 46),
        y: y1,
        motif: 'flow',
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + dir * 78, y2, 46),
        y: y2,
        motif: 'traverse',
        traverseDir: dir,
      });
      spineWaypoints.push({
        x: clampClimbX(p1.x - dir * 32, y3, 46),
        y: y3,
        motif: tier === 6 ? 'roof_undercling' : 'dynamic_flow',
      });
    } else if (tier <= 8) {
      // Tier 7-8: Asymmetric crux -> sidepull traverse -> keyhole bridge / roof undercling
      const dir: -1 | 1 = (seg + tier) % 2 === 0 ? 1 : -1;
      const y1 = p0.y - segH * 0.22;
      const y2 = p0.y - segH * 0.42;
      const y3 = p0.y - segH * 0.64;
      const y4 = p0.y - segH * 0.82;
      spineWaypoints.push({
        x: clampClimbX(p0.x - dir * 72, y1, 44),
        y: y1,
        motif: 'asymmetric_crux',
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + dir * 94, y2, 44),
        y: y2,
        motif: 'traverse',
        traverseDir: dir,
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + dir * 24, y3, 44),
        y: y3,
        motif: seg % 2 === 0 ? 'keyhole_bridge' : 'roof_undercling',
        traverseDir: (dir * -1) as -1 | 1,
      });
      spineWaypoints.push({
        x: clampClimbX(p1.x - dir * 46, y4, 46),
        y: y4,
        motif: isFinalPitch ? 'asymmetric_crux' : 'dynamic_flow',
      });
    } else {
      // Tier 9-11 (Master): Full cerebral alpine puzzle combining all 4 crux logics
      // Asymmetric entry -> Sidepull Gate Traverse (w/ straight-up Golden Decoy!)
      // -> Undercling Mantle Roof -> Keyhole Bridge Counter-Traverse (w/ straight-up Golden Decoy!) -> Summit Crux
      const dir: -1 | 1 = (seg + tier) % 2 === 0 ? 1 : -1;
      const y1 = p0.y - segH * 0.19;
      const y2 = p0.y - segH * 0.36;
      const y3 = p0.y - segH * 0.55;
      const y4 = p0.y - segH * 0.74;
      const y5 = p0.y - segH * 0.88;
      spineWaypoints.push({
        x: clampClimbX(p0.x - dir * 88, y1, 42),
        y: y1,
        motif: 'asymmetric_crux',
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + dir * 102, y2, 42),
        y: y2,
        motif: 'traverse',
        traverseDir: dir,
      });
      spineWaypoints.push({
        x: clampClimbX(p0.x + dir * 68, y3, 42),
        y: y3,
        motif: 'roof_undercling',
      });
      spineWaypoints.push({
        x: clampClimbX(p1.x - dir * 74, y4, 44),
        y: y4,
        motif: 'keyhole_bridge',
        traverseDir: (dir * -1) as -1 | 1,
      });
      spineWaypoints.push({
        x: clampClimbX(p1.x + dir * 24, y5, 48),
        y: y5,
        motif: isFinalPitch ? 'asymmetric_crux' : 'dynamic_flow',
      });
    }

    spineWaypoints.push({ x: p1.x, y: p1.y, motif: 'flow' });
  }

  // ----------------------------------------------------------------------------
  // STAGE 1A [core_path]: Walk the spine polyline in anatomically reachable steps
  // ----------------------------------------------------------------------------
  interface SpineNode {
    x: number;
    y: number;
    zone: number;
    motif: SpineWaypoint['motif'];
    traverseDir?: -1 | 1;
    stepIdx: number;
  }

  const mainLineNodes: SpineNode[] = [];
  const goldenHighwayEntryAnchors: Array<{ node: SpineNode; baitDir: -1 | 1; crux: MasterCruxLogic }> = [];
  const targetStepLen = strategy.corePath.stepLen;
  let prevSideSign = 1;
  let globalStep = 0;

  for (let wIdx = 0; wIdx < spineWaypoints.length - 1; wIdx++) {
    const a = spineWaypoints[wIdx];
    const b = spineWaypoints[wIdx + 1];
    const segDist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(segDist / targetStepLen));
    const dxNorm = (b.x - a.x) / Math.max(1, segDist);
    const isLateralSeg = Math.abs(dxNorm) > 0.42;

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const ny = a.y + (b.y - a.y) * t;
      if (ny > (route.hasTutorial ? -128 : -88) || ny < -mountainHeight + 28) {
        continue;
      }
      const nx = clampClimbX(a.x + (b.x - a.x) * t, ny, 38);
      const progress = Math.max(0, Math.min(1, -ny / mountainHeight));
      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
      const motif = b.motif;
      const tDir: -1 | 1 = b.traverseDir ?? (dxNorm >= 0 ? 1 : -1);
      const node: SpineNode = {
        x: nx,
        y: ny,
        zone,
        motif,
        traverseDir: tDir,
        stepIdx: globalStep++,
      };
      mainLineNodes.push(node);

      // Register crux placements & straight-up Golden Highway bait entries
      if (s === 1 && motif === 'traverse' && isLateralSeg && tier >= 3) {
        cruxPlacements.push({
          logic: 'sidepull_gate',
          x: nx,
          y: ny,
          altitudeM: Math.round(-ny / PIXELS_PER_METER),
          summary: tDir > 0 ? '右侧拉门控横移' : '左侧拉门控横移',
        });
        if (strategy.masterDecoyPath.enabled) {
          goldenHighwayEntryAnchors.push({
            node,
            baitDir: (tDir * -1) as -1 | 1,
            crux: 'sidepull_gate',
          });
        }
      } else if (s === 1 && motif === 'keyhole_bridge' && tier >= 7) {
        cruxPlacements.push({
          logic: 'keyhole_bridge',
          x: nx,
          y: ny,
          altitudeM: Math.round(-ny / PIXELS_PER_METER),
          summary: '钥匙孔单点摆荡/蹬跳桥',
        });
        if (strategy.masterDecoyPath.enabled) {
          goldenHighwayEntryAnchors.push({
            node,
            baitDir: (tDir * -1) as -1 | 1,
            crux: 'keyhole_bridge',
          });
        }
      } else if (s === 1 && motif === 'roof_undercling' && tier >= 5) {
        cruxPlacements.push({
          logic: 'undercling_mantle',
          x: nx,
          y: ny,
          altitudeM: Math.round(-ny / PIXELS_PER_METER),
          summary: '屋檐反扣高脚翻越',
        });
      }

      const dynamicCycle = tier >= 2 && node.stepIdx >= 2 && node.stepIdx % 6 === 2;
      const swingCycle = tier >= 2 && node.stepIdx >= 3 && node.stepIdx % 6 === 5;
      const tremorCycle = tier >= 2 && node.stepIdx >= 2 && node.stepIdx % 5 === 3;
      const tremorChance = Math.min(0.68, 0.34 + (tier - 2) * 0.04);
      const baseRadius = tier === 1 ? 13.5 : undefined;

      if (motif === 'keyhole_bridge' && tier >= 7) {
        // Master Keyhole Bridge: single deliberate sequence (spring launch -> swing transfer -> crack/crimp catch -> ledge exit)
        // Keeps every consecutive step cleanly reachable while removing redundant parallel holds
        let kType: HoldType;
        let kGrip: Hold['gripKind'] | undefined;
        let kForceDownpull = false;
        if (s === 1) {
          kType = 'spring';
          kForceDownpull = true;
        } else if (s === 2 || (steps >= 4 && s === Math.ceil(steps * 0.5))) {
          kType = 'swing';
          kForceDownpull = true;
        } else if (s === steps) {
          kType = tier >= 10 ? 'crack' : 'ledge';
          kForceDownpull = kType === 'ledge';
        } else {
          kType = rng() < 0.55 ? 'crack' : 'crimp';
          kGrip = tDir > 0 ? 'sidepullLeft' : 'sidepullRight';
        }

        const kx = nx + (rng() - 0.5) * 6;
        const ky = ny + (rng() - 0.5) * 6;
        if (canPlaceHold(kx, ky, 22)) {
          pushHold(kx, ky, kType, zone, baseRadius, isWetHold(kType, progress), kForceDownpull, 'core_path', kGrip);
        }
        // Compact low foot-chip only on launch & landing so hips can commit across the keyhole
        if (s === 1 || s === steps) {
          const fx = nx - tDir * 18;
          const fy = ny + 20;
          if (fy < -26 && canPlaceHold(fx, fy, 22)) {
            pushHold(fx, fy, 'crimp', zone, undefined, false, true, 'core_path');
          }
        }
      } else if (motif === 'traverse' && isLateralSeg) {
        // Sidepull Gate Traverse: directional sidepull handhold + offset low opposing foothold
        const sideGrip: Hold['gripKind'] = tDir > 0 ? 'sidepullLeft' : 'sidepullRight';
        let handType = pickMainType(true, progress);
        if (swingCycle && rng() < 0.65) handType = 'swing';
        else if (tremorCycle && rng() < tremorChance * 0.65) handType = 'tremor';

        const hx = nx + (rng() - 0.5) * 10;
        const hy = ny + (rng() - 0.5) * 8;
        if (canPlaceHold(hx, hy, 24)) {
          pushHold(hx, hy, handType, zone, baseRadius, isWetHold(handType, progress), false, 'core_path', sideGrip);
        }
        const fx = nx - tDir * (14 + rng() * 12);
        const fy = ny + 20 + rng() * 10;
        const footType: HoldType =
          dynamicCycle && rng() < 0.6
            ? 'spring'
            : tier >= 8 && rng() < 0.45
              ? 'crimp'
              : tier >= 5
                ? 'crack'
                : 'jug';
        if (fy < -24 && canPlaceHold(fx, fy, 24)) {
          pushHold(fx, fy, footType, zone, baseRadius, isWetHold(footType, progress), true, 'core_path');
        }
      } else if (motif === 'roof_undercling' && tier >= 4) {
        // Undercling Mantle: inverted grip arc paired with high opposing foothold, ending in a mantle ledge
        const side = prevSideSign;
        prevSideSign *= -1;
        const isMantleExit = s === steps;
        const ux = nx + side * (10 + rng() * 12);
        const uy = ny + (rng() - 0.5) * 6;
        const uType: HoldType = isMantleExit ? 'ledge' : rng() < 0.55 ? 'crack' : 'crimp';
        if (canPlaceHold(ux, uy, 24)) {
          pushHold(
            ux,
            uy,
            uType,
            zone,
            baseRadius,
            isWetHold(uType, progress),
            isMantleExit,
            'core_path',
            isMantleExit ? 'downpull' : 'undercling'
          );
        }
        const ox = nx - side * (22 + rng() * 12);
        const oy = ny + 14 + rng() * 10;
        const oType: HoldType = dynamicCycle ? 'spring' : pickMainType(true, progress);
        if (oy < -24 && canPlaceHold(ox, oy, 24)) {
          pushHold(ox, oy, oType, zone, baseRadius, isWetHold(oType, progress), false, 'core_path');
        }
      } else if (motif === 'asymmetric_crux' && tier >= 7) {
        // Single-sided alternating crux: breaks symmetry and rewards body-tension & high-steps
        const side = prevSideSign;
        prevSideSign *= -1;
        const cx = nx + side * (16 + rng() * 14);
        const cy = ny + (rng() - 0.5) * 8;
        let cType = pickMainType(true, progress);
        if (tremorCycle && rng() < tremorChance) cType = 'tremor';
        else if (swingCycle && rng() < 0.55) cType = 'swing';
        if (canPlaceHold(cx, cy, 24)) {
          pushHold(cx, cy, cType, zone, baseRadius, isWetHold(cType, progress), false, 'core_path');
        }
        if (rng() < 0.48 || dynamicCycle) {
          const sx = nx - side * (18 + rng() * 14);
          const sy = ny + 12 + rng() * 12;
          const sType: HoldType = dynamicCycle ? 'spring' : pickMainType(false, progress);
          if (sy < -24 && canPlaceHold(sx, sy, 24)) {
            pushHold(sx, sy, sType, zone, baseRadius, isWetHold(sType, progress), false, 'core_path');
          }
        }
      } else {
        // Clear, organic staggered climbing flow
        const leadSide = prevSideSign;
        prevSideSign *= -1;
        const spreadL = 14 + rng() * (tier <= 2 ? 12 : 20);
        const spreadR = 14 + rng() * (tier <= 2 ? 12 : 20);
        const leadX = nx + leadSide * spreadL;
        const leadY = ny - 4 + (rng() - 0.5) * 10;
        let leadType = pickMainType(true, progress);
        if (dynamicCycle && rng() < 0.68) leadType = 'spring';
        else if (swingCycle && rng() < 0.62) leadType = 'swing';
        else if (tremorCycle && rng() < tremorChance) leadType = 'tremor';

        if (canPlaceHold(leadX, leadY, 24)) {
          pushHold(leadX, leadY, leadType, zone, baseRadius, isWetHold(leadType, progress), false, 'core_path');
        }

        const skipCompanion =
          strategy.corePath.asymmetricSkipChance > 0 &&
          leadType !== 'spring' &&
          leadType !== 'swing' &&
          leadType !== 'tremor' &&
          rng() < strategy.corePath.asymmetricSkipChance;
        if (!skipCompanion) {
          const compX = nx - leadSide * spreadR;
          const compY = ny + 10 + (rng() - 0.5) * 12;
          let compType = pickMainType(false, progress);
          if (dynamicCycle && leadType !== 'spring' && rng() < 0.6) compType = 'spring';
          if (compY < -24 && canPlaceHold(compX, compY, 24)) {
            pushHold(compX, compY, compType, zone, baseRadius, isWetHold(compType, progress), false, 'core_path');
          }
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // STAGE 1B [core_path]: Reconnecting Stamina-Dilemma Branches (viable alternatives)
  // ----------------------------------------------------------------------------
  const viableBranchCount = strategy.corePath.viableBranchCount;
  for (let b = 0; b < viableBranchCount; b++) {
    if (mainLineNodes.length < 10) break;
    const spanSteps = tier <= 4 ? 4 : tier <= 8 ? 5 + (b % 2) : 6 + (b % 3);
    const usableMax = Math.max(3, mainLineNodes.length - spanSteps - 3);
    const startIdx =
      2 + Math.floor(((b + 0.2 + rng() * 0.45) / viableBranchCount) * (usableMax - 2));
    const endIdx = Math.min(mainLineNodes.length - 2, startIdx + spanSteps);
    const startNode = mainLineNodes[startIdx];
    const endNode = mainLineNodes[endIdx];
    if (!startNode || !endNode) continue;

    const midY = (startNode.y + endNode.y) * 0.5;
    const midBounds = getCliffBounds(midY, mountainHeight);
    const midX = (startNode.x + endNode.x) * 0.5;
    const roomLeft = midX - (midBounds.left + 40);
    const roomRight = midBounds.right - 40 - midX;
    const preferRight = b % 2 === 0 ? roomRight >= 78 : roomLeft < 78;
    const dir = preferRight ? 1 : -1;
    const maxBow = Math.min(dir > 0 ? roomRight : roomLeft, tier <= 4 ? 88 : tier <= 8 ? 118 : 144);
    if (maxBow < 56) continue;

    const isSafeDetour = b % 2 === 0;
    const branchSteps = Math.max(
      4,
      Math.round((Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y) + maxBow * 1.15) / 42)
    );

    if (b < strategy.corePath.staminaDilemmaForks) {
      cruxPlacements.push({
        logic: 'stamina_dilemma',
        x: clampClimbX(midX + dir * maxBow * 0.65, midY, 36),
        y: midY,
        altitudeM: Math.round(-midY / PIXELS_PER_METER),
        summary: isSafeDetour ? '远距回耐绕行线（含休息岩台）' : '高速高耗直切捷径',
      });
    }

    for (let s = 1; s < branchSteps; s++) {
      const t = s / branchSteps;
      const arch = Math.sin(t * Math.PI);
      const by = startNode.y + (endNode.y - startNode.y) * t;
      const bx = clampClimbX(
        startNode.x + (endNode.x - startNode.x) * t + dir * maxBow * arch,
        by,
        30
      );
      if (by < -mountainHeight + 56 || by > -36) continue;

      const progress = Math.max(0, Math.min(1, -by / mountainHeight));
      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;

      let bType: HoldType;
      const r = rng();
      if (isSafeDetour) {
        if (s === Math.floor(branchSteps * 0.5) && tier >= 5) {
          bType = 'ledge';
        } else {
          bType = r < 0.45 ? 'jug' : r < 0.82 ? 'crack' : 'swing';
        }
      } else {
        const allowIce = tier >= 9 || (tier >= 7 && progress > 0.35);
        if (allowIce && r < 0.25) bType = 'ice';
        else if (r < 0.52) bType = 'crimp';
        else if (r < 0.76) bType = 'crack';
        else if (r < 0.9) bType = 'tremor';
        else bType = 'spring';
      }

      if (canPlaceHold(bx, by, 24)) {
        pushHold(bx, by, bType, zone, undefined, isWetHold(bType, progress), false, 'core_path');
      }
      if (arch > 0.65 && canPlaceHold(bx - dir * 18, by + 18, 24) && by + 18 < -30) {
        pushHold(
          bx - dir * 18,
          by + 18,
          isSafeDetour ? 'jug' : 'crimp',
          zone,
          undefined,
          false,
          true,
          'core_path'
        );
      }
    }
  }

  // ----------------------------------------------------------------------------
  // STAGE 1C [core_path]: Bivouac & Summit anchor holds (placed BEFORE isolation snapshots!)
  // ----------------------------------------------------------------------------
  for (const ledge of ledges) {
    if (ledge.id === 'base-camp') continue;
    pushHold(ledge.x - ledge.width * 0.26, ledge.y - 4, 'ledge', 1, 14, false, true, 'core_path');
    pushHold(ledge.x, ledge.y - 4, 'ledge', 1, 15, false, true, 'core_path');
    pushHold(ledge.x + ledge.width * 0.26, ledge.y - 4, 'ledge', 1, 14, false, true, 'core_path');
    if (canPlaceHold(ledge.x - 24, ledge.y + 32, 22)) {
      pushHold(ledge.x - 24, ledge.y + 32, 'jug', 1, undefined, false, false, 'core_path');
    }
    if (canPlaceHold(ledge.x + 24, ledge.y + 32, 22)) {
      pushHold(ledge.x + 24, ledge.y + 32, 'jug', 1, undefined, false, false, 'core_path');
    }
  }

  // Immutable snapshot of 100% of core_path holds (spine + dilemma branches + bivouacs + summit)
  const coreHolds = holds.filter((h) => !h.isDecoy);
  const minDistToList = (x: number, y: number, list: Array<{ x: number; y: number }>) => {
    let best = Infinity;
    for (const pt of list) {
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d < best) best = d;
    }
    return best;
  };

  // ----------------------------------------------------------------------------
  // STAGE 2 [master_decoy_path]: False Golden Highways & Flank Decoy Traps
  // ----------------------------------------------------------------------------
  const decoyHolds: Hold[] = [];
  const buildDecoyPath = (
    anchor: Vec2,
    preferredDirX: number,
    kind: 'false_golden_highway' | 'flank_decoy',
    len: number
  ) => {
    const isGolden = kind === 'false_golden_highway';
    const minIso = strategy.masterDecoyPath.tipMinIsolationFromCore;
    const lureHeadSteps = strategy.masterDecoyPath.lureHeadSteps;

    // Pick whichever side has genuinely open cliff corridor 2..4 steps ahead so decoys don't clip into stubs
    const scoreDir = (d: number) => {
      let openSteps = 0;
      let sx = anchor.x + d * (isGolden ? 14 : 44);
      let sy = anchor.y - (isGolden ? 36 : 22);
      for (let k = 0; k < len; k++) {
        const b = getCliffBounds(sy, mountainHeight);
        if (sx < b.left + 26 || sx > b.right - 26 || sy < -mountainHeight + 68 || sy > -46) break;
        if (k >= 2 && minDistToList(sx, sy, coreHolds) < minIso) break;
        openSteps++;
        sx += d * (isGolden ? 20 : 24);
        sy -= 38;
      }
      return openSteps;
    };

    const prefScore = scoreDir(preferredDirX);
    const altScore = scoreDir(-preferredDirX);
    const dirX = altScore > prefScore + 1 ? -preferredDirX : preferredDirX;

    let tx = anchor.x + dirX * (isGolden ? 14 : 44 + rng() * 12);
    let ty = anchor.y - (isGolden ? 36 : 22);
    const placedIds: string[] = [];
    let lastPlaced: Vec2 | null = null;

    for (let s = 0; s < len; s++) {
      const bounds = getCliffBounds(ty, mountainHeight);
      if (tx < bounds.left + 26 || tx > bounds.right - 26 || ty < -mountainHeight + 68 || ty > -46) {
        break;
      }

      // From step 2 onward, enforce strict isolation from ALL core_path holds so the decoy truly dead-ends
      if (s >= 2 && minDistToList(tx, ty, coreHolds) < minIso) {
        // Try one gentle outward nudge into open rock before terminating
        const nudgedX = tx + dirX * 22;
        if (
          nudgedX >= bounds.left + 26 &&
          nudgedX <= bounds.right - 26 &&
          minDistToList(nudgedX, ty, coreHolds) >= minIso
        ) {
          tx = nudgedX;
        } else {
          break;
        }
      }

      const progress = Math.max(0, Math.min(1, -ty / mountainHeight));
      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
      const allowIce = progress > 0.25 || tier >= 9;
      const r = rng();

      let tType: HoldType;
      if (s < lureHeadSteps) {
        // False Golden Highway: intentionally seductive large holds (jug / ledge / crack) at the head
        if (isGolden && s === 1 && tier >= 8) {
          tType = 'ledge';
        } else {
          tType = r < 0.56 ? 'jug' : r < 0.88 ? 'crack' : 'crimp';
        }
      } else if (s >= len - 2) {
        // Terminal trap holds right before smooth blank rock
        tType = allowIce && r < 0.52 ? 'ice' : r < 0.86 ? 'fragile' : 'crimp';
      } else {
        tType = allowIce && r < 0.34 ? 'ice' : r < 0.64 ? 'crimp' : r < 0.84 ? 'fragile' : 'tremor';
      }

      if (canPlaceHold(tx, ty, 24)) {
        const placed = pushHold(
          tx,
          ty,
          tType,
          zone,
          undefined,
          isWetHold(tType, progress, 0.1),
          isGolden && tType === 'ledge',
          'master_decoy_path'
        );
        decoyHolds.push(placed);
        placedIds.push(placed.id);
        lastPlaced = { x: tx, y: ty };
      }

      // On Master tiers, sprout a realistic 2-3 hold secondary sub-branch mid-decoy to mask dead-ends
      if (tier >= 9 && s === 2 && lastPlaced) {
        const subDir = -dirX;
        let subX = lastPlaced.x + subDir * (26 + rng() * 14);
        let subY = lastPlaced.y - (26 + rng() * 10);
        const subLen = 2 + (rng() < 0.55 ? 1 : 0);
        for (let sb = 0; sb < subLen; sb++) {
          const sbBounds = getCliffBounds(subY, mountainHeight);
          if (
            subX < sbBounds.left + 26 ||
            subX > sbBounds.right - 26 ||
            subY < -mountainHeight + 70 ||
            subY > -46
          ) {
            break;
          }
          if (minDistToList(subX, subY, coreHolds) < Math.max(82, minIso - 4)) break;
          if (canPlaceHold(subX, subY, 24)) {
            const subProgress = Math.max(0, Math.min(1, -subY / mountainHeight));
            const subZone = subProgress < 0.35 ? 0 : subProgress < 0.7 ? 1 : 2;
            const subType: HoldType =
              sb === subLen - 1
                ? route.palette === 'glacial'
                  ? 'ice'
                  : 'fragile'
                : rng() < 0.45
                  ? 'crack'
                  : rng() < 0.78
                    ? 'crimp'
                    : 'jug';
            const subPlaced = pushHold(
              subX,
              subY,
              subType,
              subZone,
              undefined,
              isWetHold(subType, subProgress, 0.06),
              false,
              'master_decoy_path'
            );
            decoyHolds.push(subPlaced);
            placedIds.push(subPlaced.id);
          }
          subX += subDir * (18 + rng() * 14);
          subY -= 32 + rng() * 10;
        }
      }

      // Drift cleanly away from the core corridor into blank alpine rock
      tx += isGolden ? dirX * (16 + rng() * 14) : dirX * (20 + rng() * 16);
      ty -= 35 + rng() * 11;
    }

    if (lastPlaced && placedIds.length >= 2) {
      decoyPaths.push({
        kind,
        entryX: anchor.x,
        entryY: anchor.y,
        tipX: lastPlaced.x,
        tipY: lastPlaced.y,
        stepCount: placedIds.length,
        holdIds: placedIds,
      });
    }
  };

  if (strategy.masterDecoyPath.enabled) {
    const [minLen, maxLen] = strategy.masterDecoyPath.stepsPerDecoy;
    const pickDecoyLen = (extra = 0) =>
      Math.min(maxLen + extra, minLen + Math.floor(rng() * (maxLen - minLen + 1)) + extra);

    // 2a. False Golden Highways anchored directly above sidepull_gate & keyhole_bridge entries
    let goldenPlaced = 0;
    for (const entry of goldenHighwayEntryAnchors) {
      if (goldenPlaced >= strategy.masterDecoyPath.falseGoldenHighways) break;
      buildDecoyPath(
        { x: entry.node.x, y: entry.node.y },
        entry.baitDir,
        'false_golden_highway',
        pickDecoyLen(tier >= 9 ? 1 : 0)
      );
      goldenPlaced++;
    }

    // Backfill remaining Master Golden Highways at mid-pitch spine nodes if needed
    while (
      goldenPlaced < strategy.masterDecoyPath.falseGoldenHighways &&
      mainLineNodes.length >= 10
    ) {
      const frac = (goldenPlaced + 0.4) / Math.max(1, strategy.masterDecoyPath.falseGoldenHighways);
      const idx = Math.max(
        3,
        Math.min(mainLineNodes.length - 5, Math.floor(frac * (mainLineNodes.length - 6)))
      );
      const anchor = mainLineNodes[idx];
      const dir: -1 | 1 = goldenPlaced % 2 === 0 ? 1 : -1;
      buildDecoyPath({ x: anchor.x, y: anchor.y }, dir, 'false_golden_highway', pickDecoyLen());
      goldenPlaced++;
    }

    // 2b. Flank Decoy Branches splitting off the climb into dead-ends
    const flankCount = strategy.masterDecoyPath.flankDecoyBranches;
    for (let f = 0; f < flankCount; f++) {
      if (mainLineNodes.length < 8) break;
      const minIdx = 2;
      const maxIdx = mainLineNodes.length - 4;
      const nodeIdx =
        minIdx + Math.floor(((f + 0.25 + rng() * 0.45) / Math.max(1, flankCount)) * (maxIdx - minIdx));
      const anchor = mainLineNodes[Math.max(0, Math.min(mainLineNodes.length - 1, nodeIdx))];
      const dir: -1 | 1 = f % 2 === 0 ? 1 : -1;
      buildDecoyPath({ x: anchor.x, y: anchor.y }, dir, 'flank_decoy', pickDecoyLen());
    }
  }

  // ----------------------------------------------------------------------------
  // STAGE 3 [decorative_dead_end]: Strictly Unreachable Short Dead-End Rock Lines
  // Placed far outside the playable corridor (>= 124..132px from EVERY core_path hold)
  // and isolated from master_decoy_path holds (>= 116px) so they enrich visual depth
  // and wall layering without ever being grabbable from the climbing route.
  // ----------------------------------------------------------------------------
  const decCfg = strategy.decorativeDeadEnd;
  for (let l = 0; l < decCfg.lineCount; l++) {
    const progress = 0.08 + ((l + 0.2 + rng() * 0.65) / Math.max(1, decCfg.lineCount)) * 0.78;
    const startY = -progress * mountainHeight;
    if (startY > -52 || startY < -mountainHeight + 110) continue;

    const fullWallHalfW = progress > 0.8 ? 196 : 246;
    const preferredSide = l % 2 === 0 ? -1 : 1;

    // Find an unreachable starting anchor on either flank (prefer alternating left/right)
    let startX: number | null = null;
    for (const side of [preferredSide, -preferredSide]) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candX = side * (134 + rng() * Math.max(24, fullWallHalfW - 134));
        if (
          minDistToList(candX, startY, coreHolds) >= decCfg.minDistFromCore &&
          minDistToList(candX, startY, decoyHolds) >= decCfg.minDistFromDecoy &&
          canPlaceHold(candX, startY, 28)
        ) {
          startX = candX;
          break;
        }
      }
      if (startX !== null) break;
    }
    if (startX === null) continue;

    const [minHolds, maxHolds] = decCfg.holdsPerLine;
    const lineLen = minHolds + Math.floor(rng() * (maxHolds - minHolds + 1));
    const driftSide = startX >= 0 ? 1 : -1;
    let dx = startX;
    let dy = startY;

    for (let step = 0; step < lineLen; step++) {
      const p = Math.max(0, Math.min(1, -dy / mountainHeight));
      const maxX = p > 0.82 ? 196 : 246;
      if (Math.abs(dx) > maxX || dy > -46 || dy < -mountainHeight + 68) break;
      if (minDistToList(dx, dy, coreHolds) < decCfg.minDistFromCore) break;
      if (minDistToList(dx, dy, decoyHolds) < decCfg.minDistFromDecoy) break;

      if (canPlaceHold(dx, dy, 26)) {
        const zone = p < 0.35 ? 0 : p < 0.7 ? 1 : 2;
        const r = rng();
        let dType: HoldType;
        if (route.palette === 'glacial') {
          dType = step === lineLen - 1 ? 'ice' : r < 0.35 ? 'crack' : r < 0.7 ? 'crimp' : 'fragile';
        } else if (tier <= 2) {
          dType = r < 0.42 ? 'jug' : r < 0.76 ? 'crack' : 'crimp';
        } else {
          dType = step === lineLen - 1 ? 'fragile' : r < 0.38 ? 'crack' : r < 0.74 ? 'crimp' : 'jug';
        }

        const baseR =
          dType === 'jug' ? 11.5 : dType === 'crack' ? 10.5 : 9.2;
        pushHold(
          dx,
          dy,
          dType,
          zone,
          baseR * decCfg.radiusScale,
          false,
          false,
          'decorative_dead_end'
        );
      }

      // Climb organically along an outer rib and drift slightly outward before terminating
      dx += driftSide * (6 + rng() * 14) + (rng() - 0.5) * 10;
      dy -= 30 + rng() * 14;
    }
  }

  // ----------------------------------------------------------------------------
  // STAGE 4 [far_distractor]: Full-Wall Flank Veins & Phantom Islands
  // Enriches panoramic mountain wall scale across [-248..+248] and adds route-reading
  // noise on mid/high/Master tiers while strictly respecting unreachable separation.
  // ----------------------------------------------------------------------------
  const distCfg = strategy.farDistractor;

  // 4a. Phantom Islands (Tier >= 3, prominent on Master): tempting compact 3-4 hold islands
  // perched across unjumpable blank rock bands (126..210px off the core corridor)
  for (let pIdx = 0; pIdx < distCfg.phantomIslandCount; pIdx++) {
    const progress = 0.12 + ((pIdx + 0.3 + rng() * 0.5) / Math.max(1, distCfg.phantomIslandCount)) * 0.72;
    const islandY = -progress * mountainHeight;
    if (islandY > -56 || islandY < -mountainHeight + 92) continue;

    const maxX = progress > 0.8 ? 196 : 244;
    const prefSide = pIdx % 2 === 0 ? 1 : -1;
    let islandX: number | null = null;
    for (const side of [prefSide, -prefSide]) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candX = side * (128 + rng() * Math.max(24, maxX - 128));
        if (
          minDistToList(candX, islandY, coreHolds) >= Math.max(122, distCfg.minDistFromCore) &&
          minDistToList(candX, islandY, decoyHolds) >= distCfg.minDistFromDecoy &&
          canPlaceHold(candX, islandY, 30)
        ) {
          islandX = candX;
          break;
        }
      }
      if (islandX !== null) break;
    }
    if (islandX === null) continue;

    const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
    const islandOffsets: Array<{ dx: number; dy: number; type: HoldType }> = [
      { dx: 0, dy: 0, type: 'ledge' },
      { dx: -22, dy: -26, type: 'jug' },
      { dx: 20, dy: -32, type: route.palette === 'glacial' ? 'ice' : 'crack' },
      { dx: 4, dy: -56, type: tier >= 9 ? 'crimp' : 'jug' },
    ];
    for (const off of islandOffsets) {
      const ix = islandX + off.dx + (rng() - 0.5) * 8;
      const iy = islandY + off.dy + (rng() - 0.5) * 8;
      if (Math.abs(ix) > maxX || iy > -46 || iy < -mountainHeight + 66) continue;
      if (minDistToList(ix, iy, coreHolds) < Math.max(122, distCfg.minDistFromCore)) continue;
      if (minDistToList(ix, iy, decoyHolds) < distCfg.minDistFromDecoy) continue;
      if (!canPlaceHold(ix, iy, 24)) continue;

      const r = off.type === 'ledge' ? 12.2 : off.type === 'jug' ? 10.8 : 9.4;
      pushHold(ix, iy, off.type, zone, r, false, off.type === 'ledge', 'far_distractor');
    }
  }

  // 4b. Geological Flank Distractor Veins across both left & right outer walls
  for (let c = 0; c < distCfg.clusterCount; c++) {
    const progress = 0.07 + ((c + rng() * 0.85) / Math.max(1, distCfg.clusterCount)) * 0.82;
    const baseY = -progress * mountainHeight;
    if (baseY > -46 || baseY < -mountainHeight + 66) continue;

    const fullWallHalfW = progress > 0.82 ? 196 : 248;
    const side = c % 2 === 0 ? -1 : 1;
    const minFlankX = tier <= 2 ? 134 : 112;
    let baseX = side * (minFlankX + rng() * Math.max(24, fullWallHalfW - minFlankX));

    const violatesIsolation = (x: number, y: number) =>
      minDistToList(x, y, coreHolds) < distCfg.minDistFromCore ||
      minDistToList(x, y, decoyHolds) < distCfg.minDistFromDecoy;

    if (violatesIsolation(baseX, baseY)) {
      const altX = -side * (142 + rng() * Math.max(20, fullWallHalfW - 142));
      if (!violatesIsolation(altX, baseY)) {
        baseX = altX;
      }
    }

    const [minCluster, maxCluster] = distCfg.clusterSize;
    const clusterSize = minCluster + Math.floor(rng() * (maxCluster - minCluster + 1));
    const veinSlope = rng() < 0.65 ? -0.42 : 0.36;

    for (let m = 0; m < clusterSize; m++) {
      const ax = baseX + (m - (clusterSize - 1) * 0.5) * (24 + rng() * 14) + (rng() - 0.5) * 14;
      const ay = baseY + (m - (clusterSize - 1) * 0.5) * (24 * veinSlope) + (rng() - 0.5) * 16;

      if (Math.abs(ax) > fullWallHalfW || ay > -44 || ay < -mountainHeight + 66) continue;
      if (!canPlaceHold(ax, ay, 28)) continue;
      if (violatesIsolation(ax, ay)) continue;

      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
      const r = rng();
      let aType: HoldType;
      if (route.palette === 'glacial') {
        aType = r < 0.28 ? 'ice' : r < 0.58 ? 'crimp' : r < 0.8 ? 'crack' : r < 0.92 ? 'fragile' : 'jug';
      } else if (tier <= 2) {
        aType = r < 0.38 ? 'jug' : r < 0.72 ? 'crack' : r < 0.9 ? 'crimp' : 'ledge';
      } else {
        aType = r < 0.3 ? 'crimp' : r < 0.58 ? 'crack' : r < 0.78 ? 'fragile' : r < 0.92 ? 'jug' : 'ledge';
      }

      const ambientRadius =
        aType === 'crimp'
          ? 8 + rng() * 1.6
          : aType === 'ledge'
            ? 11 + rng() * 2
            : 9 + rng() * 2.4;

      pushHold(ax, ay, aType, zone, ambientRadius, false, false, 'far_distractor');
    }
  }

  // 4c. Master Full-Wall Camouflage Seams & Natural Rock Field (Tier >= 9)
  // Eliminates the artificial empty moat around the core path so the real route blends
  // naturally into a dense alpine rock face, making Roadbook scouting & revision essential.
  if (tier >= 9) {
    const masterLevel = tier - 9;
    const keyholeZones = cruxPlacements
      .filter((c) => c.logic === 'keyhole_bridge')
      .map((c) => ({ x: c.x, y: c.y }));
    const nearKeyhole = (x: number, y: number) =>
      keyholeZones.some((k) => Math.hypot(x - k.x, y - k.y) < 92);

    // Check that camouflage holds don't accidentally bridge a decoy tip back upward to core_path
    const decoyTipCoords = decoyPaths.map((d) => ({ x: d.tipX, y: d.tipY }));
    const bridgesDecoyTip = (x: number, y: number) =>
      decoyTipCoords.some((tip) => Math.hypot(x - tip.x, y - tip.y) < 88);

    // 4c-i: Interwoven competing rock seams across the full cliff width
    const seamCount = 24 + masterLevel * 6;
    for (let sm = 0; sm < seamCount; sm++) {
      const progress = 0.05 + ((sm + 0.15 + rng() * 0.7) / seamCount) * 0.88;
      const startY = -progress * mountainHeight;
      if (startY > -72 || startY < -mountainHeight + 76) continue;

      const bounds = getCliffBounds(startY, mountainHeight);
      const usableSpan = Math.max(80, bounds.right - bounds.left - 56);
      let sx = bounds.left + 28 + rng() * usableSpan;
      let sy = startY;
      const seamSteps = 3 + Math.floor(rng() * 4);
      const slopeDir: -1 | 1 = rng() < 0.5 ? -1 : 1;
      const lateralDrift = 10 + rng() * 18;

      for (let st = 0; st < seamSteps; st++) {
        const b = getCliffBounds(sy, mountainHeight);
        if (sx < b.left + 26 || sx > b.right - 26 || sy > -56 || sy < -mountainHeight + 68) {
          break;
        }
        const dCore = minDistToList(sx, sy, coreHolds);
        // Blend right up to the edges of the main corridor (>= 58px) without overlapping core or bridging keyholes/tips
        if (
          dCore >= 58 &&
          !nearKeyhole(sx, sy) &&
          !bridgesDecoyTip(sx, sy) &&
          canPlaceHold(sx, sy, 28)
        ) {
          const p = Math.max(0, Math.min(1, -sy / mountainHeight));
          const zone = p < 0.35 ? 0 : p < 0.7 ? 1 : 2;
          const r = rng();
          let cType: HoldType;
          if (st === seamSteps - 1) {
            cType = route.palette === 'glacial' && r < 0.5 ? 'ice' : r < 0.85 ? 'fragile' : 'crimp';
          } else if (route.palette === 'glacial') {
            cType =
              r < 0.22
                ? 'jug'
                : r < 0.48
                  ? 'crack'
                  : r < 0.72
                    ? 'crimp'
                    : r < 0.88
                      ? 'ice'
                      : r < 0.95
                        ? 'fragile'
                        : 'tremor';
          } else {
            cType =
              r < 0.24
                ? 'jug'
                : r < 0.52
                  ? 'crack'
                  : r < 0.78
                    ? 'crimp'
                    : r < 0.92
                      ? 'fragile'
                      : 'tremor';
          }
          pushHold(
            sx,
            sy,
            cType,
            zone,
            undefined,
            isWetHold(cType, p, 0.05),
            false,
            'far_distractor'
          );
        }
        sx += slopeDir * (lateralDrift + (rng() - 0.5) * 14);
        sy -= 32 + rng() * 14;
      }
    }

    // 4c-ii: Dense organic micro-holds scattered across open rock faces to break up silhouette lines
    const scatterTarget = 55 + masterLevel * 18;
    for (let sc = 0; sc < scatterTarget; sc++) {
      const progress = 0.05 + rng() * 0.89;
      const sy = -progress * mountainHeight;
      if (sy > -58 || sy < -mountainHeight + 66) continue;
      const b = getCliffBounds(sy, mountainHeight);
      const sx = b.left + 26 + rng() * Math.max(40, b.right - b.left - 52);
      const dCore = minDistToList(sx, sy, coreHolds);
      if (
        dCore < 56 ||
        nearKeyhole(sx, sy) ||
        bridgesDecoyTip(sx, sy) ||
        !canPlaceHold(sx, sy, 29)
      ) {
        continue;
      }
      const zone = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
      const r = rng();
      const sType: HoldType =
        route.palette === 'glacial'
          ? r < 0.34
            ? 'crimp'
            : r < 0.62
              ? 'crack'
              : r < 0.8
                ? 'ice'
                : r < 0.92
                  ? 'fragile'
                  : 'jug'
          : r < 0.38
            ? 'crimp'
            : r < 0.68
              ? 'crack'
              : r < 0.86
                ? 'fragile'
                : 'jug';
      pushHold(
        sx,
        sy,
        sType,
        zone,
        undefined,
        isWetHold(sType, progress, 0.04),
        false,
        'far_distractor'
      );
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

  // Step 3B: Optional off-axis Abandoned Wall Supply Caches (Tier >= 2, risk-reward detour)
  const supplyCaches: WallSupplyCache[] = [];
  if (tier >= 2 && mainLineNodes.length >= 6) {
    const cacheFractions = tier >= 6 ? [0.34, 0.68] : [0.46];
    const cacheLorePool: Array<{ reward: 'piton' | 'chalk'; label: string; note: string }> = [
      { reward: 'piton', label: '遗落岩钉包', note: '前人遗留的铬钼岩钉，静挂在侧壁岩缝中' },
      { reward: 'chalk', label: '避风镁粉袋', note: '岩檐下干燥完好的备用镁粉袋，附着旧路书残页' },
      { reward: 'piton', label: '首攀旧装备', note: '褪色扁带上拴着一枚完好钢钉，见证当年攀登' },
      { reward: 'chalk', label: '登山者粉袋', note: '细密白粉尚余大半，在凛冽山风里格外珍贵' },
    ];

    cacheFractions.forEach((frac, idx) => {
      const nodeIdx = Math.max(
        2,
        Math.min(mainLineNodes.length - 3, Math.floor(mainLineNodes.length * frac))
      );
      const anchor = mainLineNodes[nodeIdx];
      const side: -1 | 1 = (idx + tier) % 2 === 0 ? 1 : -1;
      const bounds = getCliffBounds(anchor.y, mountainHeight);
      let flankX = anchor.x + side * (46 + rng() * 12);
      if (flankX < bounds.left + 32 || flankX > bounds.right - 32) {
        flankX = anchor.x - side * (46 + rng() * 12);
      }
      flankX = Math.max(bounds.left + 30, Math.min(bounds.right - 30, flankX));
      const flankY = anchor.y - 8 + (rng() - 0.5) * 14;

      // Ensure there is a reachable flank hold right beneath the cache so detours are 100% fair
      if (canPlaceHold(flankX, flankY + 6, 22)) {
        pushHold(
          flankX,
          flankY + 6,
          tier >= 7 ? 'crack' : 'jug',
          anchor.zone,
          undefined,
          false,
          true,
          'core_path'
        );
      }
      const lore = cacheLorePool[(tier + idx) % cacheLorePool.length];
      supplyCaches.push({
        id: `supply-cache-${idx}`,
        x: flankX,
        y: flankY - 12,
        reward: lore.reward,
        label: lore.label,
        note: lore.note,
        collected: false,
      });
    });
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
    { x: summitCenter + 54, y: -mountainHeight - 8 },
    { x: summitCenter + 54, y: -mountainHeight - 17 },
    { x: summitCenter + 54, y: -mountainHeight - 25 },
    { x: summitCenter + 54, y: -mountainHeight - 31 },
  ];

  // Compute 12-band altitude difficulty slope profile from actual holds, weather & ledges
  const binCount = 12;
  const difficultyProfile: AltitudeDifficultyBin[] = [];
  const holdRiskWeight: Record<HoldType, number> = {
    ledge: 8,
    spring: 14,
    swing: 16,
    jug: 18,
    crack: 48,
    tremor: 68,
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
      if (h.isDecoy) return false;
      const hr = Math.max(0, Math.min(0.9999, -h.y / mountainHeight));
      return hr >= r0 && hr < r1;
    });

    let avgHoldScore = 24 + (tier - 1) * 4;
    let crackCount = 0;
    let crimpCount = 0;
    let fragileCount = 0;
    let tremorCount = 0;
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
        else if (h.type === 'tremor') tremorCount++;
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

    const binDensityPenalty =
      holdsInBin.length <= 2 ? 12 : holdsInBin.length === 3 ? 6 : 0;

    const rawDiff =
      avgHoldScore * 0.6 +
      (tier - 1) * 2.5 +
      weatherBonus +
      branchComplexity +
      binDensityPenalty +
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
    } else if (tremorCount >= 2) {
      challengeTag = '颤动危岩';
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

  const wallAnalysis = analyzeStaminaAndHoldDensity(holds, mountainHeight, 1.0, route);
  const pitchSections = buildPitchSectionsForRoute(route);

  const world: MountainWorld = {
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
    wallAnalysis,
    pitchSections,
    supplyCaches,
  };

  routeRoleBreakdownMap.set(world, {
    strategy,
    counts: {
      core_path: holdIdsByRole.core_path.length,
      decorative_dead_end: holdIdsByRole.decorative_dead_end.length,
      far_distractor: holdIdsByRole.far_distractor.length,
      master_decoy_path: holdIdsByRole.master_decoy_path.length,
    },
    holdIdsByRole,
    cruxPlacements,
    decoyPaths,
  });

  return world;
}
