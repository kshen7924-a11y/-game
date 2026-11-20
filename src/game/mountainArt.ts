import alpineValleyUrl from '../assets/images/alpine-valley.jpg';
import glacialTextureUrl from '../assets/images/cliff-glacial.jpg';
import graniteTextureUrl from '../assets/images/cliff-granite.jpg';
import talusUrl from '../assets/images/talus-foreground.webp';
import { drawGraniteWall } from './graniteWallArt';
import type { MountainWorld } from './mountain';
import type { CameraState } from './types';

const alpineValley = new Image();
alpineValley.src = alpineValleyUrl;

const graniteTexture = new Image();
graniteTexture.src = graniteTextureUrl;

const glacialTexture = new Image();

const talus = new Image();
talus.src = talusUrl;

const rockPatterns = new WeakMap<CanvasRenderingContext2D, Map<HTMLImageElement, CanvasPattern>>();
const rockTiles = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

function blendTileEdge(
  tile: HTMLCanvasElement,
  source: HTMLCanvasElement,
  overlap: number,
  axis: 'x' | 'y',
) {
  const horizontal = axis === 'x';
  const strip = document.createElement('canvas');
  strip.width = horizontal ? overlap : tile.width;
  strip.height = horizontal ? tile.height : overlap;
  const painter = strip.getContext('2d');
  const target = tile.getContext('2d');
  if (!painter || !target) return false;
  const edge = painter.createLinearGradient(0, 0, horizontal ? overlap : 0, horizontal ? 0 : overlap);
  edge.addColorStop(0, '#000');
  edge.addColorStop(1, 'transparent');

  target.drawImage(source, 0, 0);
  painter.drawImage(source, horizontal ? -tile.width : 0, horizontal ? 0 : -tile.height);
  painter.globalCompositeOperation = 'destination-in';
  painter.fillStyle = edge;
  painter.fillRect(0, 0, strip.width, strip.height);
  target.drawImage(strip, 0, 0);
  return true;
}

function rockPattern(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let patterns = rockPatterns.get(ctx);
  if (!patterns) {
    patterns = new Map();
    rockPatterns.set(ctx, patterns);
  }
  const cached = patterns.get(image);
  if (cached) return cached;
  if (!image.complete || !image.naturalWidth) return null;

  let tile = rockTiles.get(image);
  if (!tile) {
    const size = 1024;
    const overlap = 160;
    const source = document.createElement('canvas');
    source.width = source.height = size;
    const painter = source.getContext('2d');
    if (!painter) return null;
    painter.drawImage(image, 0, 0, size, size);

    // Crossfade the wrap once so veins stay in the same direction over the entire ascent.
    const horizontal = document.createElement('canvas');
    horizontal.width = size - overlap;
    horizontal.height = size;
    if (!blendTileEdge(horizontal, source, overlap, 'x')) return null;
    tile = document.createElement('canvas');
    tile.width = tile.height = size - overlap;
    if (!blendTileEdge(tile, horizontal, overlap, 'y')) return null;
    rockTiles.set(image, tile);
  }
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    pattern.setTransform(new DOMMatrix().translate(-430, -246));
    patterns.set(image, pattern);
  }
  return pattern;
}

export function drawAlpineBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  altRatio: number,
  palette: MountainWorld['route']['palette'],
) {
  if (!alpineValley.complete || !alpineValley.naturalWidth) return false;

  const scale = Math.max((height * 1.22) / alpineValley.naturalHeight, (width * 1.12) / alpineValley.naturalWidth);
  const drawWidth = alpineValley.naturalWidth * scale;
  const drawHeight = alpineValley.naturalHeight * scale;
  const pan = Math.max(-width * 0.05, Math.min(width * 0.05, camera.x * 0.13));
  const drift = Math.max(0, Math.min(drawHeight - height, (drawHeight - height) * (0.63 - altRatio * 0.58)));
  ctx.save();
  ctx.drawImage(alpineValley, (width - drawWidth) * 0.5 - pan, -drift, drawWidth, drawHeight);

  if (palette !== 'granite') {
    ctx.fillStyle = palette === 'glacial'
      ? 'rgba(41, 70, 102, 0.34)'
      : palette === 'slate'
        ? 'rgba(44, 54, 68, 0.28)'
        : 'rgba(55, 81, 76, 0.15)';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
  return true;
}

export function drawCliffMaterial(
  ctx: CanvasRenderingContext2D,
  world: MountainWorld,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): boolean {
  const palette = world.route.palette;
  const isIce = palette === 'glacial';
  if (isIce && !glacialTexture.hasAttribute('src')) glacialTexture.src = glacialTextureUrl;
  const pattern = rockPattern(ctx, isIce ? glacialTexture : graniteTexture);

  if (pattern) {
    ctx.save();
    ctx.fillStyle = pattern;
    ctx.globalAlpha = isIce || palette === 'granite' ? 0.84 : 0.65;
    if (!isIce && palette !== 'granite') ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    ctx.restore();
  }

  const paintedGranite = palette === 'granite' && drawGraniteWall(ctx, world, minY, maxY);
  return paintedGranite || pattern !== null;
}

export function drawTalusForeground(ctx: CanvasRenderingContext2D, width: number, center: number) {
  if (!talus.complete || !talus.naturalWidth) return;
  const foregroundWidth = Math.max(1120, Math.min(2100, width * 1.12));
  ctx.drawImage(talus, center - foregroundWidth * 0.5, -66, foregroundWidth, 505);
}
