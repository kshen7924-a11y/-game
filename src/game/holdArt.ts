import graniteAtlasUrl from '../assets/images/granite-hold-atlas.webp';
import type { Hold, Vec2 } from './types';

const atlas = new Image();
const cellSize = 256;

// Coordinates within each cell at the lit lip or the center of the fissure.
const artwork: Partial<Record<Hold['type'], { column: number; contacts: [Vec2, Vec2]; scale: number }>> = {
  jug: { column: 0, contacts: [{ x: 130, y: 96 }, { x: 126, y: 94 }], scale: 0.012 },
  crimp: { column: 1, contacts: [{ x: 130, y: 134 }, { x: 128, y: 132 }], scale: 0.014 },
  crack: { column: 2, contacts: [{ x: 114, y: 127 }, { x: 117, y: 133 }], scale: 0.012 },
  ledge: { column: 0, contacts: [{ x: 130, y: 96 }, { x: 126, y: 94 }], scale: 0.012 },
};

export function drawGraniteHold(
  ctx: CanvasRenderingContext2D,
  hold: Pick<Hold, 'type' | 'shapeVariant' | 'radius'>,
): boolean {
  const sprite = artwork[hold.type];
  if (!sprite) return false;
  if (!atlas.getAttribute('src')) atlas.src = graniteAtlasUrl;
  if (!atlas.complete || !atlas.naturalWidth) return false;

  const row = hold.shapeVariant % 2;
  const contact = sprite.contacts[row];
  const scale = hold.radius * sprite.scale;

  ctx.drawImage(
    atlas, sprite.column * cellSize, row * cellSize, cellSize, cellSize,
    -contact.x * scale, -contact.y * scale, cellSize * scale, cellSize * scale,
  );
  return true;
}
