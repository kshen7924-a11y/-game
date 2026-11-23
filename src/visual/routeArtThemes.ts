import { RouteId } from '../game/types';
import { VisualAtmosphereGrade } from './artPackAssets';

export type RouteGeologyKind =
  | 'swan_slab'
  | 'whitehorse_ridge'
  | 'royal_arches'
  | 'high_exposure_roof'
  | 'snake_dike'
  | 'moonlight_sandstone'
  | 'devils_basalt_columns'
  | 'lotus_fluted_spire'
  | 'eiger_white_spider'
  | 'matterhorn_pyramid_gneiss'
  | 'dawn_wall_monolith';

export type RomanticMoteKind =
  | 'gold_pollen'
  | 'rose_mist'
  | 'golden_alpenglow'
  | 'sunset_embers'
  | 'twilight_petals'
  | 'moon_stardust'
  | 'prairie_gold'
  | 'arctic_aurora'
  | 'alpine_snow_plume'
  | 'starlight_frost'
  | 'dawn_radiance';

export interface RouteArtTheme {
  routeId: RouteId;
  /** Generated ultra-romantic semi-realistic full-mountain wide ending painting */
  wideEndingUrl: string;
  /** Normalized summit peak focal alignment in wideEnding painting (0..1) */
  wideFocalX: number;
  wideFocalY: number;
  wideDissolveStartScale: number;

  /** Bespoke geological style for the climbing wall */
  geologyKind: RouteGeologyKind;
  /** Base tint blended cleanly over painted rock grain */
  wallTintColor: string;
  wallTintAlpha: number;
  wallFallbackColor: string;
  wallShadowColor: string;
  wallHighlightColor: string;
  wallVeinColor: string;
  wallCrackColor: string;

  /** Per-route hold material finish (preserves calibrated silhouette & hitbox) */
  holdTintColor: string;
  holdTintAlpha: number;
  holdRimColor: string;
  holdShadowColor: string;
  holdAccentColor: string;
  holdSpecularAlpha: number;

  /** Romantic near-summit sky, distant cloud-sea & sculpted summit formation palette */
  skyTopColor: string;
  skyMidColor: string;
  skyHorizonColor: string;
  sunOrMoonColor: string;
  sunOrMoonPos: { x: number; y: number };
  isMoonlit?: boolean;
  hasStars?: boolean;
  cloudHighlightColor: string;
  cloudShadowColor: string;
  distantRangeFarColor: string;
  distantRangeNearColor: string;
  summitRockLight: string;
  summitRockMid: string;
  summitRockDark: string;
  summitCrestRim: string;
  summitSnowColor?: string;

  /** Live romantic atmospheric overlay during wide summit panorama */
  godRayColor: string;
  godRayOrigin: { x: number; y: number };
  moteKind: RomanticMoteKind;
  moteColor: string;
  bloomColor: string;
  vignetteTintRgb: [number, number, number];

  /** Atmosphere grading integrated with AssetRegistry */
  atmosphere: VisualAtmosphereGrade;
}

export const ROUTE_ART_THEMES: Record<RouteId, RouteArtTheme> = {
  kids: {
    routeId: 'kids',
    wideEndingUrl: '/src/assets/images/summit_swan_slab_1795325497025.jpg',
    wideFocalX: 0.54,
    wideFocalY: 0.25,
    wideDissolveStartScale: 1.32,
    geologyKind: 'swan_slab',
    wallTintColor: '#E5CFA8',
    wallTintAlpha: 0.34,
    wallFallbackColor: '#C5B191',
    wallShadowColor: '#7D6A52',
    wallHighlightColor: '#FFF5DD',
    wallVeinColor: '#F3E5C8',
    wallCrackColor: '#564736',
    holdTintColor: '#EAD5B0',
    holdTintAlpha: 0.34,
    holdRimColor: '#FFF8E3',
    holdShadowColor: '#5C4B38',
    holdAccentColor: '#D4B584',
    holdSpecularAlpha: 0.32,
    skyTopColor: '#6997C4',
    skyMidColor: '#E5C89E',
    skyHorizonColor: '#FFE8BA',
    sunOrMoonColor: '#FFF3C4',
    sunOrMoonPos: { x: 0.78, y: 0.16 },
    cloudHighlightColor: '#FFF6E2',
    cloudShadowColor: '#D9B896',
    distantRangeFarColor: '#98ACC0',
    distantRangeNearColor: '#6A7B73',
    summitRockLight: '#EEDBBE',
    summitRockMid: '#C6AF8E',
    summitRockDark: '#7C6850',
    summitCrestRim: '#FFF9E8',
    godRayColor: '255, 232, 174',
    godRayOrigin: { x: 0.82, y: 0.12 },
    moteKind: 'gold_pollen',
    moteColor: '255, 244, 198',
    bloomColor: 'rgba(255, 224, 150, 0.20)',
    vignetteTintRgb: [28, 22, 16],
    atmosphere: {
      shadowWashColor: 'rgba(92, 68, 42, 0.06)',
      sunRimWashColor: 'rgba(255, 238, 196, 0.18)',
      castShadowColor: 'rgba(54, 42, 30, 0.38)',
      castShadowOffsetX: 11,
      castShadowOffsetY: 13,
      vignetteStrength: 0.78,
    },
  },
  intro: {
    routeId: 'intro',
    wideEndingUrl: '/src/assets/images/summit_whitehorse_ledge_1795325496686.jpg',
    wideFocalX: 0.48,
    wideFocalY: 0.28,
    wideDissolveStartScale: 1.32,
    geologyKind: 'whitehorse_ridge',
    wallTintColor: '#E8E6E9',
    wallTintAlpha: 0.42,
    wallFallbackColor: '#CFCBD0',
    wallShadowColor: '#7C7A86',
    wallHighlightColor: '#FFFFFF',
    wallVeinColor: '#F7F5FA',
    wallCrackColor: '#504E5B',
    holdTintColor: '#F2EFF4',
    holdTintAlpha: 0.42,
    holdRimColor: '#FFFFFF',
    holdShadowColor: '#625E6D',
    holdAccentColor: '#D8CBD2',
    holdSpecularAlpha: 0.45,
    skyTopColor: '#B87B95',
    skyMidColor: '#F2B1A4',
    skyHorizonColor: '#FFE0BA',
    sunOrMoonColor: '#FFF5DB',
    sunOrMoonPos: { x: 0.28, y: 0.2 },
    cloudHighlightColor: '#FFEAE2',
    cloudShadowColor: '#C98FA0',
    distantRangeFarColor: '#B4889A',
    distantRangeNearColor: '#8B5E5A',
    summitRockLight: '#F4F1F4',
    summitRockMid: '#C9C4CC',
    summitRockDark: '#7C7582',
    summitCrestRim: '#FFF3EC',
    godRayColor: '255, 212, 196',
    godRayOrigin: { x: 0.28, y: 0.2 },
    moteKind: 'rose_mist',
    moteColor: '255, 232, 224',
    bloomColor: 'rgba(255, 196, 182, 0.22)',
    vignetteTintRgb: [36, 20, 28],
    atmosphere: {
      shadowWashColor: 'rgba(98, 72, 92, 0.08)',
      sunRimWashColor: 'rgba(255, 224, 214, 0.18)',
      castShadowColor: 'rgba(58, 48, 66, 0.4)',
      castShadowOffsetX: 12,
      castShadowOffsetY: 13,
      vignetteStrength: 0.82,
    },
  },
  beginner: {
    routeId: 'beginner',
    wideEndingUrl: '/src/assets/images/summit_royal_arches_1795325497432.jpg',
    wideFocalX: 0.37,
    wideFocalY: 0.2,
    wideDissolveStartScale: 1.32,
    geologyKind: 'royal_arches',
    wallTintColor: '#D6A672',
    wallTintAlpha: 0.38,
    wallFallbackColor: '#B98D60',
    wallShadowColor: '#6D4B2F',
    wallHighlightColor: '#FFE7BF',
    wallVeinColor: '#E7C192',
    wallCrackColor: '#48311E',
    holdTintColor: '#DFB07C',
    holdTintAlpha: 0.38,
    holdRimColor: '#FFEAC4',
    holdShadowColor: '#5B3E26',
    holdAccentColor: '#C48A52',
    holdSpecularAlpha: 0.34,
    skyTopColor: '#769AC2',
    skyMidColor: '#DFC09C',
    skyHorizonColor: '#FFDF9F',
    sunOrMoonColor: '#FFE8AD',
    sunOrMoonPos: { x: 0.82, y: 0.26 },
    cloudHighlightColor: '#FFF3DA',
    cloudShadowColor: '#C4A58C',
    distantRangeFarColor: '#98A8BD',
    distantRangeNearColor: '#6E7466',
    summitRockLight: '#EBC290',
    summitRockMid: '#BC8D5D',
    summitRockDark: '#6B492E',
    summitCrestRim: '#FFF1CE',
    godRayColor: '255, 220, 152',
    godRayOrigin: { x: 0.86, y: 0.24 },
    moteKind: 'golden_alpenglow',
    moteColor: '255, 236, 186',
    bloomColor: 'rgba(255, 210, 132, 0.22)',
    vignetteTintRgb: [30, 21, 14],
    atmosphere: {
      shadowWashColor: 'rgba(84, 52, 26, 0.1)',
      sunRimWashColor: 'rgba(255, 224, 168, 0.2)',
      castShadowColor: 'rgba(54, 34, 18, 0.44)',
      castShadowOffsetX: 12,
      castShadowOffsetY: 14,
      vignetteStrength: 0.86,
    },
  },
  'beginner-plus': {
    routeId: 'beginner-plus',
    wideEndingUrl: '/src/assets/images/summit_high_exposure_1795325496909.jpg',
    wideFocalX: 0.62,
    wideFocalY: 0.25,
    wideDissolveStartScale: 1.32,
    geologyKind: 'high_exposure_roof',
    wallTintColor: '#DDD5CA',
    wallTintAlpha: 0.4,
    wallFallbackColor: '#C4BBB0',
    wallShadowColor: '#5B4C49',
    wallHighlightColor: '#FFF1DE',
    wallVeinColor: '#B87A56',
    wallCrackColor: '#3A2E2C',
    holdTintColor: '#E5DBD0',
    holdTintAlpha: 0.4,
    holdRimColor: '#FFE5C2',
    holdShadowColor: '#4D3D39',
    holdAccentColor: '#D9895B',
    holdSpecularAlpha: 0.36,
    skyTopColor: '#7A3E52',
    skyMidColor: '#DF6D4F',
    skyHorizonColor: '#FFD16B',
    sunOrMoonColor: '#FFE999',
    sunOrMoonPos: { x: 0.66, y: 0.34 },
    cloudHighlightColor: '#FFD89A',
    cloudShadowColor: '#8B4657',
    distantRangeFarColor: '#98555C',
    distantRangeNearColor: '#663B3F',
    summitRockLight: '#EFE4D6',
    summitRockMid: '#BAAB9C',
    summitRockDark: '#594743',
    summitCrestRim: '#FFD99B',
    godRayColor: '255, 192, 118',
    godRayOrigin: { x: 0.68, y: 0.32 },
    moteKind: 'sunset_embers',
    moteColor: '255, 212, 148',
    bloomColor: 'rgba(255, 152, 86, 0.24)',
    vignetteTintRgb: [38, 16, 20],
    atmosphere: {
      shadowWashColor: 'rgba(72, 34, 42, 0.11)',
      sunRimWashColor: 'rgba(255, 198, 134, 0.2)',
      castShadowColor: 'rgba(44, 24, 28, 0.46)',
      castShadowOffsetX: 13,
      castShadowOffsetY: 15,
      vignetteStrength: 0.88,
    },
  },
  intermediate: {
    routeId: 'intermediate',
    wideEndingUrl: '/src/assets/images/summit_snake_dike_1795325496743.jpg',
    wideFocalX: 0.55,
    wideFocalY: 0.24,
    wideDissolveStartScale: 1.32,
    geologyKind: 'snake_dike',
    wallTintColor: '#C9C0BE',
    wallTintAlpha: 0.38,
    wallFallbackColor: '#ADA4A4',
    wallShadowColor: '#5B4F58',
    wallHighlightColor: '#FFE5D9',
    wallVeinColor: '#7A4E34',
    wallCrackColor: '#3B2B28',
    holdTintColor: '#9E6E4E',
    holdTintAlpha: 0.46,
    holdRimColor: '#FFDCC4',
    holdShadowColor: '#3E281E',
    holdAccentColor: '#7B4D32',
    holdSpecularAlpha: 0.34,
    skyTopColor: '#7C5A76',
    skyMidColor: '#DC8E87',
    skyHorizonColor: '#FFD0A6',
    sunOrMoonColor: '#FFE4BE',
    sunOrMoonPos: { x: 0.32, y: 0.24 },
    cloudHighlightColor: '#FFE0C4',
    cloudShadowColor: '#8E6278',
    distantRangeFarColor: '#9B758A',
    distantRangeNearColor: '#695363',
    summitRockLight: '#E8CFC9',
    summitRockMid: '#A69395',
    summitRockDark: '#594B54',
    summitCrestRim: '#FFDEC8',
    godRayColor: '255, 198, 162',
    godRayOrigin: { x: 0.32, y: 0.24 },
    moteKind: 'twilight_petals',
    moteColor: '255, 214, 194',
    bloomColor: 'rgba(244, 164, 146, 0.22)',
    vignetteTintRgb: [30, 18, 28],
    atmosphere: {
      shadowWashColor: 'rgba(72, 46, 66, 0.1)',
      sunRimWashColor: 'rgba(255, 206, 178, 0.18)',
      castShadowColor: 'rgba(42, 28, 38, 0.46)',
      castShadowOffsetX: 12,
      castShadowOffsetY: 14,
      vignetteStrength: 0.9,
    },
  },
  'intermediate-plus': {
    routeId: 'intermediate-plus',
    wideEndingUrl: '/src/assets/images/summit_moonlight_buttress_1795325496172.jpg',
    wideFocalX: 0.54,
    wideFocalY: 0.22,
    wideDissolveStartScale: 1.32,
    geologyKind: 'moonlight_sandstone',
    wallTintColor: '#B85D43',
    wallTintAlpha: 0.52,
    wallFallbackColor: '#994C38',
    wallShadowColor: '#412328',
    wallHighlightColor: '#C8E6FF',
    wallVeinColor: '#6E2E24',
    wallCrackColor: '#25151C',
    holdTintColor: '#C4684B',
    holdTintAlpha: 0.5,
    holdRimColor: '#BAE6FD',
    holdShadowColor: '#351B22',
    holdAccentColor: '#E59573',
    holdSpecularAlpha: 0.38,
    skyTopColor: '#152244',
    skyMidColor: '#2F4670',
    skyHorizonColor: '#8B688E',
    sunOrMoonColor: '#DDF4FF',
    sunOrMoonPos: { x: 0.35, y: 0.16 },
    isMoonlit: true,
    hasStars: true,
    cloudHighlightColor: '#BCE2F5',
    cloudShadowColor: '#2C3A5E',
    distantRangeFarColor: '#3E486B',
    distantRangeNearColor: '#6E4548',
    summitRockLight: '#D88264',
    summitRockMid: '#9B4C3B',
    summitRockDark: '#442228',
    summitCrestRim: '#C8EEFF',
    godRayColor: '174, 224, 255',
    godRayOrigin: { x: 0.35, y: 0.14 },
    moteKind: 'moon_stardust',
    moteColor: '202, 238, 255',
    bloomColor: 'rgba(148, 210, 255, 0.20)',
    vignetteTintRgb: [10, 14, 30],
    atmosphere: {
      shadowWashColor: 'rgba(24, 30, 58, 0.16)',
      sunRimWashColor: 'rgba(174, 224, 255, 0.18)',
      castShadowColor: 'rgba(22, 16, 34, 0.52)',
      castShadowOffsetX: 11,
      castShadowOffsetY: 13,
      vignetteStrength: 0.94,
    },
  },
  advanced: {
    routeId: 'advanced',
    wideEndingUrl: '/src/assets/images/summit_devils_tower_1795325496204.jpg',
    wideFocalX: 0.4,
    wideFocalY: 0.24,
    wideDissolveStartScale: 1.32,
    geologyKind: 'devils_basalt_columns',
    wallTintColor: '#6E635D',
    wallTintAlpha: 0.54,
    wallFallbackColor: '#5B514C',
    wallShadowColor: '#292224',
    wallHighlightColor: '#FFC982',
    wallVeinColor: '#8B715C',
    wallCrackColor: '#191417',
    holdTintColor: '#786A62',
    holdTintAlpha: 0.52,
    holdRimColor: '#FFD394',
    holdShadowColor: '#241D1F',
    holdAccentColor: '#B8895C',
    holdSpecularAlpha: 0.34,
    skyTopColor: '#4C3668',
    skyMidColor: '#B85A72',
    skyHorizonColor: '#FFC468',
    sunOrMoonColor: '#FFE89E',
    sunOrMoonPos: { x: 0.72, y: 0.42 },
    cloudHighlightColor: '#FFC78A',
    cloudShadowColor: '#5C3B66',
    distantRangeFarColor: '#6D4A68',
    distantRangeNearColor: '#513D3A',
    summitRockLight: '#9B8270',
    summitRockMid: '#64554F',
    summitRockDark: '#2E2628',
    summitCrestRim: '#FFD492',
    godRayColor: '255, 196, 124',
    godRayOrigin: { x: 0.74, y: 0.4 },
    moteKind: 'prairie_gold',
    moteColor: '255, 224, 168',
    bloomColor: 'rgba(245, 164, 96, 0.22)',
    vignetteTintRgb: [28, 16, 30],
    atmosphere: {
      shadowWashColor: 'rgba(54, 30, 56, 0.14)',
      sunRimWashColor: 'rgba(255, 198, 128, 0.2)',
      castShadowColor: 'rgba(26, 18, 28, 0.52)',
      castShadowOffsetX: 12,
      castShadowOffsetY: 14,
      vignetteStrength: 0.94,
    },
  },
  'advanced-crux': {
    routeId: 'advanced-crux',
    wideEndingUrl: '/src/assets/images/summit_lotus_tower_1795325496483.jpg',
    wideFocalX: 0.5,
    wideFocalY: 0.16,
    wideDissolveStartScale: 1.34,
    geologyKind: 'lotus_fluted_spire',
    wallTintColor: '#D6C8D6',
    wallTintAlpha: 0.44,
    wallFallbackColor: '#BEB3C2',
    wallShadowColor: '#5B5670',
    wallHighlightColor: '#FFF0FA',
    wallVeinColor: '#A8D8E6',
    wallCrackColor: '#3E3A52',
    holdTintColor: '#E2D4E4',
    holdTintAlpha: 0.46,
    holdRimColor: '#FFF5FC',
    holdShadowColor: '#4D4761',
    holdAccentColor: '#98D4E2',
    holdSpecularAlpha: 0.44,
    skyTopColor: '#7C74B0',
    skyMidColor: '#CFA2C8',
    skyHorizonColor: '#FFE0C2',
    sunOrMoonColor: '#FFF2DC',
    sunOrMoonPos: { x: 0.78, y: 0.34 },
    cloudHighlightColor: '#FFF0E6',
    cloudShadowColor: '#8E7EB0',
    distantRangeFarColor: '#8A84AA',
    distantRangeNearColor: '#616C84',
    summitRockLight: '#F4E8F2',
    summitRockMid: '#C0B4C6',
    summitRockDark: '#605A72',
    summitCrestRim: '#FFF4FC',
    summitSnowColor: '#F3F8FF',
    godRayColor: '240, 210, 255',
    godRayOrigin: { x: 0.76, y: 0.26 },
    moteKind: 'arctic_aurora',
    moteColor: '226, 244, 255',
    bloomColor: 'rgba(218, 186, 245, 0.22)',
    vignetteTintRgb: [22, 18, 36],
    atmosphere: {
      shadowWashColor: 'rgba(66, 56, 94, 0.11)',
      sunRimWashColor: 'rgba(255, 224, 240, 0.18)',
      castShadowColor: 'rgba(42, 36, 62, 0.46)',
      castShadowOffsetX: 11,
      castShadowOffsetY: 13,
      vignetteStrength: 0.88,
    },
  },
  'master-1': {
    routeId: 'master-1',
    wideEndingUrl: '/src/assets/images/summit_eiger_north_1795325496714.jpg',
    wideFocalX: 0.54,
    wideFocalY: 0.21,
    wideDissolveStartScale: 1.32,
    geologyKind: 'eiger_white_spider',
    wallTintColor: '#4E5D70',
    wallTintAlpha: 0.44,
    wallFallbackColor: '#475566',
    wallShadowColor: '#1E2A3A',
    wallHighlightColor: '#F0F7FF',
    wallVeinColor: '#E5F2FF',
    wallCrackColor: '#141D28',
    holdTintColor: '#63768C',
    holdTintAlpha: 0.42,
    holdRimColor: '#F0F9FF',
    holdShadowColor: '#1D2938',
    holdAccentColor: '#93C5FD',
    holdSpecularAlpha: 0.46,
    skyTopColor: '#6C5682',
    skyMidColor: '#C98AA6',
    skyHorizonColor: '#FFD6B4',
    sunOrMoonColor: '#FFECD2',
    sunOrMoonPos: { x: 0.52, y: 0.22 },
    cloudHighlightColor: '#FFE7DB',
    cloudShadowColor: '#6D6892',
    distantRangeFarColor: '#8B7B9C',
    distantRangeNearColor: '#566480',
    summitRockLight: '#C8D8E8',
    summitRockMid: '#586A80',
    summitRockDark: '#233144',
    summitCrestRim: '#FFF4F0',
    summitSnowColor: '#F2F7FC',
    godRayColor: '255, 214, 206',
    godRayOrigin: { x: 0.52, y: 0.18 },
    moteKind: 'alpine_snow_plume',
    moteColor: '240, 248, 255',
    bloomColor: 'rgba(240, 186, 208, 0.20)',
    vignetteTintRgb: [18, 20, 34],
    atmosphere: {
      shadowWashColor: 'rgba(26, 38, 62, 0.16)',
      sunRimWashColor: 'rgba(244, 212, 224, 0.16)',
      castShadowColor: 'rgba(18, 28, 46, 0.54)',
      castShadowOffsetX: 11,
      castShadowOffsetY: 13,
      vignetteStrength: 0.94,
    },
  },
  'master-2': {
    routeId: 'master-2',
    wideEndingUrl: '/src/assets/images/summit_matterhorn_north_1795325496381.jpg',
    wideFocalX: 0.49,
    wideFocalY: 0.21,
    wideDissolveStartScale: 1.32,
    geologyKind: 'matterhorn_pyramid_gneiss',
    wallTintColor: '#3B4A62',
    wallTintAlpha: 0.48,
    wallFallbackColor: '#36455C',
    wallShadowColor: '#162033',
    wallHighlightColor: '#FFE2A8',
    wallVeinColor: '#7DD3FC',
    wallCrackColor: '#0F1726',
    holdTintColor: '#4C5E78',
    holdTintAlpha: 0.46,
    holdRimColor: '#BAE6FD',
    holdShadowColor: '#131C2E',
    holdAccentColor: '#FDE68A',
    holdSpecularAlpha: 0.5,
    skyTopColor: '#0C234A',
    skyMidColor: '#1F4B88',
    skyHorizonColor: '#7C93BE',
    sunOrMoonColor: '#FFE6A6',
    sunOrMoonPos: { x: 0.56, y: 0.22 },
    hasStars: true,
    cloudHighlightColor: '#C5CEE6',
    cloudShadowColor: '#344268',
    distantRangeFarColor: '#34486E',
    distantRangeNearColor: '#253149',
    summitRockLight: '#E8B86A',
    summitRockMid: '#4A5B74',
    summitRockDark: '#1A2438',
    summitCrestRim: '#FFE6A8',
    summitSnowColor: '#DCEEFF',
    godRayColor: '255, 222, 148',
    godRayOrigin: { x: 0.52, y: 0.2 },
    moteKind: 'starlight_frost',
    moteColor: '232, 244, 255',
    bloomColor: 'rgba(255, 206, 122, 0.20)',
    vignetteTintRgb: [8, 16, 36],
    atmosphere: {
      shadowWashColor: 'rgba(14, 28, 58, 0.18)',
      sunRimWashColor: 'rgba(255, 224, 152, 0.16)',
      castShadowColor: 'rgba(12, 20, 38, 0.56)',
      castShadowOffsetX: 11,
      castShadowOffsetY: 13,
      vignetteStrength: 0.96,
    },
  },
  'master-3': {
    routeId: 'master-3',
    wideEndingUrl: '/src/assets/images/summit_dawn_wall_1795325496641.jpg',
    wideFocalX: 0.47,
    wideFocalY: 0.18,
    wideDissolveStartScale: 1.34,
    geologyKind: 'dawn_wall_monolith',
    wallTintColor: '#E5B892',
    wallTintAlpha: 0.42,
    wallFallbackColor: '#C59A7C',
    wallShadowColor: '#4E445A',
    wallHighlightColor: '#FFF1C9',
    wallVeinColor: '#F6C99E',
    wallCrackColor: '#322938',
    holdTintColor: '#EBC29B',
    holdTintAlpha: 0.42,
    holdRimColor: '#FFF4CC',
    holdShadowColor: '#45384B',
    holdAccentColor: '#F59E6C',
    holdSpecularAlpha: 0.46,
    skyTopColor: '#3E4B72',
    skyMidColor: '#CC7F78',
    skyHorizonColor: '#FFE09E',
    sunOrMoonColor: '#FFF6CE',
    sunOrMoonPos: { x: 0.88, y: 0.28 },
    cloudHighlightColor: '#FFE4BA',
    cloudShadowColor: '#8A5B6B',
    distantRangeFarColor: '#6D6886',
    distantRangeNearColor: '#4A4358',
    summitRockLight: '#FFE0B2',
    summitRockMid: '#C89878',
    summitRockDark: '#4D4256',
    summitCrestRim: '#FFF6D4',
    godRayColor: '255, 218, 138',
    godRayOrigin: { x: 0.9, y: 0.28 },
    moteKind: 'dawn_radiance',
    moteColor: '255, 240, 190',
    bloomColor: 'rgba(255, 198, 118, 0.26)',
    vignetteTintRgb: [28, 18, 26],
    atmosphere: {
      shadowWashColor: 'rgba(66, 46, 78, 0.1)',
      sunRimWashColor: 'rgba(255, 224, 156, 0.24)',
      castShadowColor: 'rgba(42, 30, 48, 0.48)',
      castShadowOffsetX: 12,
      castShadowOffsetY: 14,
      vignetteStrength: 0.88,
    },
  },
};

export function getRouteArtTheme(routeId?: RouteId): RouteArtTheme {
  if (!routeId) return ROUTE_ART_THEMES.kids;
  return ROUTE_ART_THEMES[routeId] ?? ROUTE_ART_THEMES.kids;
}

/**
 * Builds a one-time cached route-tinted & geological-accented seamless climbing wall tile
 * so every single route exhibits its own distinctive stone color, strata, fissures, and lighting
 * at silky 60fps without per-frame offscreen work.
 */
export function buildRouteThemedWallTile(
  baseSeamlessTile: HTMLCanvasElement,
  theme: RouteArtTheme
): HTMLCanvasElement {
  if (typeof document === 'undefined') return baseSeamlessTile;
  const w = baseSeamlessTile.width;
  const h = baseSeamlessTile.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseSeamlessTile;

  // 1. Draw base high-detail painted rock grain
  ctx.drawImage(baseSeamlessTile, 0, 0);

  // 2. Harmonize stone hue to the route's mineral palette (color + soft multiply wash)
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = Math.min(0.82, theme.wallTintAlpha + 0.24);
  ctx.fillStyle = theme.wallTintColor;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = theme.wallTintAlpha * 0.58;
  ctx.fillStyle = theme.wallTintColor;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 3. Paint route-specific iconic geological macro-structures (tiled vertically cleanly!)
  ctx.save();
  const kind = theme.geologyKind;

  if (kind === 'swan_slab') {
    // Sunlit Yosemite golden exfoliation curved sweeps & quartz shimmer
    ctx.strokeStyle = theme.wallHighlightColor;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = Math.max(4, w * 0.012);
    for (let i = 0; i < 4; i++) {
      const y0 = (i / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, y0 + h * 0.06);
      ctx.bezierCurveTo(w * 0.34, y0 - h * 0.04, w * 0.68, y0 + h * 0.14, w, y0 + h * 0.06);
      ctx.stroke();
    }
    const sunWash = ctx.createLinearGradient(0, 0, w, 0);
    sunWash.addColorStop(0, 'rgba(255, 244, 210, 0.16)');
    sunWash.addColorStop(0.6, 'rgba(255, 244, 210, 0)');
    sunWash.addColorStop(1, 'rgba(92, 72, 48, 0.16)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = sunWash;
    ctx.fillRect(0, 0, w, h);
  } else if (kind === 'whitehorse_ridge') {
    // Pale pearl-white quartz granite with diagonal flowing mane-like mineral ribbons
    const brightWash = ctx.createLinearGradient(0, 0, w, 0);
    brightWash.addColorStop(0, 'rgba(255, 250, 252, 0.28)');
    brightWash.addColorStop(0.55, 'rgba(244, 240, 248, 0.16)');
    brightWash.addColorStop(1, 'rgba(130, 122, 146, 0.14)');
    ctx.fillStyle = brightWash;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = Math.max(6, w * 0.018);
    for (let i = -1; i <= 5; i++) {
      const y0 = (i / 5) * h;
      ctx.beginPath();
      ctx.moveTo(-w * 0.05, y0 + h * 0.18);
      ctx.quadraticCurveTo(w * 0.5, y0, w * 1.05, y0 - h * 0.12);
      ctx.stroke();
    }
  } else if (kind === 'royal_arches') {
    // Concentric monumental honey-ochre granite stone arches
    for (let i = 0; i < 3; i++) {
      const cy = ((i + 0.55) / 3) * h;
      const radX = w * (0.44 + (i % 2) * 0.08);
      const radY = h * 0.16;
      // Dark arch under-shadow
      ctx.strokeStyle = 'rgba(72, 46, 24, 0.34)';
      ctx.lineWidth = Math.max(10, w * 0.022);
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy + 8, radX, radY, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // Warm sunlit arch rim
      ctx.strokeStyle = 'rgba(255, 234, 190, 0.32)';
      ctx.lineWidth = Math.max(4, w * 0.009);
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy - 3, radX, radY, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (kind === 'high_exposure_roof') {
    // Stark pale Shawangunk quartz conglomerate horizontal overhang ledges & deep roof shadows
    const bandCount = 5;
    for (let i = 0; i < bandCount; i++) {
      const y = ((i + 0.4) / bandCount) * h;
      const bandH = h * 0.052;
      const shGrad = ctx.createLinearGradient(0, y, 0, y + bandH * 1.45);
      shGrad.addColorStop(0, 'rgba(34, 24, 26, 0.54)');
      shGrad.addColorStop(0.45, 'rgba(46, 34, 36, 0.24)');
      shGrad.addColorStop(1, 'rgba(46, 34, 36, 0)');
      ctx.fillStyle = shGrad;
      ctx.fillRect(0, y, w, bandH * 1.45);

      ctx.fillStyle = 'rgba(255, 242, 224, 0.34)';
      ctx.fillRect(0, y - 5, w, 5);
    }
    // Warm rusty mineral streaks
    ctx.strokeStyle = 'rgba(184, 114, 72, 0.2)';
    ctx.lineWidth = Math.max(4, w * 0.01);
    for (let x = w * 0.14; x < w; x += w * 0.24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 8, h);
      ctx.stroke();
    }
  } else if (kind === 'snake_dike') {
    // Smooth pale granite face bisected by a bold winding dark-amber volcanic "snake" dike vein
    const dikeWidth = w * 0.115;
    const drawDikePath = (offsetX: number) => {
      ctx.beginPath();
      const steps = 32;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const y = t * h;
        const x = w * 0.5 + Math.sin(t * Math.PI * 2) * (w * 0.11) + offsetX;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };
    // Cast shadow right of dike
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawDikePath(dikeWidth * 0.26);
    ctx.strokeStyle = 'rgba(38, 26, 26, 0.42)';
    ctx.lineWidth = dikeWidth * 1.04;
    ctx.stroke();

    // Main volcanic dark-ochre dike spine
    drawDikePath(0);
    ctx.strokeStyle = 'rgba(116, 74, 48, 0.62)';
    ctx.lineWidth = dikeWidth * 0.88;
    ctx.stroke();

    // Sunlit left rim along dike crest
    drawDikePath(-dikeWidth * 0.28);
    ctx.strokeStyle = 'rgba(255, 222, 190, 0.34)';
    ctx.lineWidth = Math.max(4, dikeWidth * 0.16);
    ctx.stroke();
  } else if (kind === 'moonlight_sandstone') {
    // Towering Navajo red-terracotta sandstone dihedral + desert-varnish streaks + silver moonlight edge
    const dihedral = ctx.createLinearGradient(0, 0, w, 0);
    dihedral.addColorStop(0, 'rgba(180, 78, 52, 0.28)');
    dihedral.addColorStop(0.47, 'rgba(64, 24, 28, 0.34)');
    dihedral.addColorStop(0.51, 'rgba(30, 20, 38, 0.48)');
    dihedral.addColorStop(0.54, 'rgba(186, 228, 255, 0.18)');
    dihedral.addColorStop(1, 'rgba(38, 46, 78, 0.28)');
    ctx.fillStyle = dihedral;
    ctx.fillRect(0, 0, w, h);

    // Vertical desert-varnish dark streaks & central moonlit finger-crack fissure
    for (let i = 0; i < 9; i++) {
      const vx = ((i + 0.5) / 9) * w;
      ctx.fillStyle = i === 4 ? 'rgba(18, 12, 22, 0.54)' : 'rgba(34, 18, 22, 0.18)';
      ctx.fillRect(vx, 0, i === 4 ? Math.max(5, w * 0.012) : Math.max(3, w * 0.008), h);
    }
  } else if (kind === 'devils_basalt_columns') {
    // Monumental vertical hexagonal dark basalt/phonolite columns with golden grazing light
    const colCount = 7;
    const colW = w / colCount;
    for (let c = 0; c < colCount; c++) {
      const x0 = c * colW;
      const colGrad = ctx.createLinearGradient(x0, 0, x0 + colW, 0);
      colGrad.addColorStop(0, 'rgba(20, 15, 18, 0.52)');
      colGrad.addColorStop(0.14, 'rgba(92, 76, 68, 0.24)');
      colGrad.addColorStop(0.58, 'rgba(54, 46, 46, 0.12)');
      colGrad.addColorStop(0.84, 'rgba(255, 204, 134, 0.26)');
      colGrad.addColorStop(0.95, 'rgba(255, 218, 154, 0.34)');
      colGrad.addColorStop(1, 'rgba(16, 12, 16, 0.62)');
      ctx.fillStyle = colGrad;
      ctx.fillRect(x0, 0, colW, h);

      // Razor-straight vertical column fissure
      ctx.fillStyle = 'rgba(14, 10, 14, 0.62)';
      ctx.fillRect(x0, 0, Math.max(3, colW * 0.045), h);
    }
  } else if (kind === 'lotus_fluted_spire') {
    // Pale rose-silver fluted alpine granite ribs flaring softly like carved lotus petals
    const ribCount = 5;
    const ribW = w / ribCount;
    for (let r = 0; r < ribCount; r++) {
      const x0 = r * ribW;
      const grad = ctx.createLinearGradient(x0, 0, x0 + ribW, 0);
      grad.addColorStop(0, 'rgba(72, 66, 98, 0.28)');
      grad.addColorStop(0.32, 'rgba(255, 238, 250, 0.26)');
      grad.addColorStop(0.7, 'rgba(210, 198, 224, 0.1)');
      grad.addColorStop(1, 'rgba(72, 66, 98, 0.32)');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, 0, ribW, h);
    }
    // Subtle turquoise glacial crystal veins
    ctx.strokeStyle = 'rgba(154, 224, 236, 0.22)';
    ctx.lineWidth = Math.max(2, w * 0.005);
    for (let i = 0; i < 4; i++) {
      const y0 = (i / 4) * h;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, y0);
      ctx.quadraticCurveTo(w * 0.5, y0 + h * 0.12, w * 0.85, y0 + h * 0.04);
      ctx.stroke();
    }
  } else if (kind === 'eiger_white_spider') {
    // Dark brooding limestone north face laced with branching white ice/snow spider ribbons
    ctx.fillStyle = 'rgba(22, 34, 52, 0.26)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(235, 246, 255, 0.34)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const y0 = ((i + 0.2) / 4) * h;
      ctx.lineWidth = Math.max(5, w * 0.015);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y0);
      ctx.quadraticCurveTo(w * 0.22, y0 + h * 0.07, 0, y0 + h * 0.13);
      ctx.moveTo(w * 0.5, y0);
      ctx.quadraticCurveTo(w * 0.78, y0 + h * 0.06, w, y0 + h * 0.12);
      ctx.stroke();

      ctx.lineWidth = Math.max(2.5, w * 0.007);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y0);
      ctx.lineTo(w * 0.34, y0 - h * 0.07);
      ctx.moveTo(w * 0.5, y0);
      ctx.lineTo(w * 0.68, y0 - h * 0.08);
      ctx.stroke();
    }
  } else if (kind === 'matterhorn_pyramid_gneiss') {
    // Sharp diagonal faceted dark gneiss & sapphire blue-ice pyramid ribs converging upward
    const splitGrad = ctx.createLinearGradient(0, 0, w, 0);
    splitGrad.addColorStop(0, 'rgba(255, 214, 140, 0.18)');
    splitGrad.addColorStop(0.46, 'rgba(34, 48, 72, 0.16)');
    splitGrad.addColorStop(0.5, 'rgba(12, 20, 38, 0.44)');
    splitGrad.addColorStop(0.55, 'rgba(125, 211, 252, 0.16)');
    splitGrad.addColorStop(1, 'rgba(14, 24, 46, 0.38)');
    ctx.fillStyle = splitGrad;
    ctx.fillRect(0, 0, w, h);

    // Chiseled crystalline blue-ice diagonal flutes
    ctx.strokeStyle = 'rgba(147, 219, 255, 0.24)';
    ctx.lineWidth = Math.max(3, w * 0.008);
    for (let i = 0; i < 5; i++) {
      const y0 = (i / 5) * h;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y0);
      ctx.lineTo(w * 0.08, y0 + h * 0.16);
      ctx.moveTo(w * 0.5, y0 + h * 0.04);
      ctx.lineTo(w * 0.92, y0 + h * 0.18);
      ctx.stroke();
    }
  } else if (kind === 'dawn_wall_monolith') {
    // Luminous sheer El Capitan ivory-gold & rose-tinted monolith catching breaking dawn rays
    const dawnWash = ctx.createLinearGradient(0, 0, w, 0);
    dawnWash.addColorStop(0, 'rgba(66, 52, 86, 0.24)');
    dawnWash.addColorStop(0.44, 'rgba(220, 152, 118, 0.12)');
    dawnWash.addColorStop(0.76, 'rgba(255, 216, 146, 0.28)');
    dawnWash.addColorStop(1, 'rgba(255, 236, 178, 0.36)');
    ctx.fillStyle = dawnWash;
    ctx.fillRect(0, 0, w, h);

    // Delicate vertical El Capitan granite dihedral & quartz micro-seams
    ctx.strokeStyle = 'rgba(255, 244, 210, 0.24)';
    ctx.lineWidth = Math.max(2, w * 0.005);
    for (let i = 1; i <= 5; i++) {
      const x = (i / 6) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (i % 2 === 0 ? 5 : -5), h);
      ctx.stroke();
    }
  }

  ctx.restore();
  return canvas;
}

/**
 * Pre-bakes a route-themed offscreen rock hold sprite from a calibrated transparent PNG cutout,
 * preserving 100% of the transparent alpha silhouette & grip contact anchor while giving every
 * route its own distinctive rock mineral finish and sunlit/moonlit rim character.
 */
export function buildRouteThemedHoldCanvas(
  baseImg: HTMLImageElement,
  theme: RouteArtTheme
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;
  if (w <= 0 || h <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Original sculpted hold sprite (sets alpha channel)
  ctx.drawImage(baseImg, 0, 0);

  // 2. Apply route mineral colorization strictly inside the hold's opaque pixels
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  ctx.globalAlpha = Math.min(0.78, theme.holdTintAlpha + 0.18);
  ctx.fillStyle = theme.holdTintColor;
  ctx.fillRect(0, 0, w, h);

  // Directional sunlit / moonlit top-rim sheen & deep lower-right under-shadow for tactile volume
  const rimGrad = ctx.createLinearGradient(0, 0, w * 0.2, h);
  rimGrad.addColorStop(0, theme.holdRimColor);
  rimGrad.addColorStop(0.32, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(1, theme.holdShadowColor);
  ctx.globalAlpha = theme.holdSpecularAlpha;
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  return canvas;
}
