import buttressUrl from '../assets/images/granite-buttress.webp';
import middleUrl from '../assets/images/granite-wall-middle.webp';
import variantsUrl from '../assets/images/granite-wall-variants.webp';
import type { MountainWorld } from './mountain';

const buttress = new Image();
const middle = new Image();
const variants = new Image();
const TOP_MARGIN = 56;
const ART_WIDTH = 590;

let paintedWall: { world: MountainWorld; canvas: HTMLCanvasElement; left: number; width: number } | undefined;

// The renderer clips the painted strips to the route's existing silhouette.
export function drawGraniteWall(
  ctx: CanvasRenderingContext2D,
  world: MountainWorld,
  minY: number,
  maxY: number,
): boolean {
  const { mountainHeight: height, route: { seed } } = world;
  if (!buttress.hasAttribute('src')) buttress.src = buttressUrl;
  if (!middle.hasAttribute('src')) middle.src = middleUrl;
  if (!variants.hasAttribute('src')) variants.src = variantsUrl;
  if ([buttress, middle, variants].some((image) => !image.complete || !image.naturalWidth)) return false;

  if (height < 400) return false;
  if (paintedWall?.world !== world) {
    const canvas = document.createElement('canvas');
    canvas.width = ART_WIDTH;
    canvas.height = Math.ceil(height + TOP_MARGIN + 120);
    const wall = canvas.getContext('2d');
    if (!wall) return false;

    const scratch = document.createElement('canvas');
    const topHeight = 196;
    const baseHeight = 253;
    const overlap = 110;
    const middleStart = topHeight - overlap;
    const baseStart = canvas.height - baseHeight;
    const middleSpan = baseStart + overlap - middleStart;
    const count = Math.max(1, Math.ceil(middleSpan / 660));
    const sectionHeight = (middleSpan + overlap * (count - 1)) / count;
    const stride = (middleSpan - sectionHeight) / Math.max(1, count - 1);
    scratch.width = ART_WIDTH;
    scratch.height = Math.ceil(Math.max(sectionHeight, topHeight, baseHeight));
    const scratchContext = scratch.getContext('2d');
    if (!scratchContext) return false;
    const layer = scratchContext;
    const painter = wall;

    function addSection(
      image: HTMLImageElement, source: [number, number, number, number],
      x: number, y: number, width: number, layerHeight: number, fadeIn: boolean, fadeOut: boolean,
    ) {
      layer.clearRect(0, 0, scratch.width, scratch.height);
      layer.drawImage(image, ...source, x, 0, width, layerHeight);
      const opacity = layer.createLinearGradient(0, 0, 0, layerHeight);
      opacity.addColorStop(0, fadeIn ? 'transparent' : '#fff');
      if (fadeIn) opacity.addColorStop(overlap / layerHeight, '#fff');
      if (fadeOut) opacity.addColorStop(1 - overlap / layerHeight, '#fff');
      opacity.addColorStop(1, fadeOut ? 'transparent' : '#fff');
      layer.globalCompositeOperation = 'destination-in';
      layer.fillStyle = opacity;
      layer.fillRect(0, 0, scratch.width, layerHeight);
      layer.globalCompositeOperation = 'source-over';
      // Overlapping strips use complementary alpha to keep the front face opaque.
      painter.drawImage(scratch, 0, 0, scratch.width, layerHeight, 0, y, scratch.width, layerHeight);
    }

    const cell = variants.naturalWidth / 3;
    // Keep the few transparent border pixels outside the sampled strip.
    const tileCut = Math.round(variants.naturalHeight * 0.014);
    const tileHeight = variants.naturalHeight - tileCut * 2;
    wall.globalCompositeOperation = 'lighter';
    if (seed % 2 === 0) {
      addSection(variants, [cell * 2, tileCut, cell, tileHeight * 0.64], 17, 0, 550, topHeight, false, true);
    } else {
      addSection(buttress, [0, 0, buttress.naturalWidth, buttress.naturalHeight * 0.49], 16, 0, 550, topHeight, false, true);
    }

    for (let index = 0; index < count; index++) {
      const tile = (seed + index) % 3;
      const y = middleStart + stride * index;
      if (tile === 0) {
        addSection(middle, [0, 0, middle.naturalWidth, middle.naturalHeight], 30, y, 535, sectionHeight, true, true);
      } else {
        addSection(variants, [(tile - 1) * cell, tileCut, cell, tileHeight], 21, y, 554, sectionHeight, true, true);
      }
    }
    addSection(buttress, [0, buttress.naturalHeight * 0.42, buttress.naturalWidth, buttress.naturalHeight * 0.58], 0, baseStart, ART_WIDTH, baseHeight, true, false);
    // Overscan keeps soft transparent edges outside the playable face.
    const left = Math.min(...world.outlineLeft.map(point => point.x));
    const right = Math.max(...world.outlineRight.map(point => point.x));
    const margin = (right - left) * 0.10;
    paintedWall = { world, canvas, left: left - margin, width: right - left + margin * 2 };
  }

  const top = -height - TOP_MARGIN;
  const { canvas, left, width } = paintedWall;
  const start = Math.max(0, Math.floor(minY - top));
  const end = Math.min(canvas.height, Math.ceil(maxY - top));
  if (end > start) {
    const rows = end - start;
    ctx.drawImage(canvas, 0, start, canvas.width, rows, left, top + start, width, rows);
  }
  return true;
}
