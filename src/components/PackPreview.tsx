import { useEffect, useRef } from 'react';
import { drawArmPanels, drawClimberHand, drawClimberKit, drawPack } from '../game/climberArt';
import type { ClimberSkinConfig, LoadoutId } from '../game/types';

const SIZE = 42;
const SCALE = 3;

export function PackPreview({ loadout, trim }: { loadout: LoadoutId; trim: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.scale(0.8, 0.8);
    drawPack(ctx, loadout, trim);
  }, [loadout, trim]);

  return (
    <canvas
      ref={canvas}
      width={SIZE * SCALE}
      height={SIZE * SCALE}
      style={{ width: SIZE, height: SIZE, display: 'block' }}
      aria-hidden="true"
    />
  );
}

export function OutfitPreview({ skin, loadout }: { skin: ClimberSkinConfig; loadout: LoadoutId }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;

    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, element.width / 2, element.height / 2);
    ctx.translate(34, 34);
    ctx.scale(0.7, 0.7);
    for (const side of [-1, 1]) {
      const left = side === -1;
      const wrist = { x: side * 19, y: 14 };
      drawArmPanels(ctx, { x: side * 12, y: -16 }, { x: side * 22, y: -2 }, wrist, left, skin.jacket, skin.jacketShadow);
      drawClimberHand(ctx, wrist, Math.PI / 2, left, false, false);
    }
    drawClimberKit(ctx, skin, loadout, { lookAngle: 0.25 });
  }, [skin, loadout]);

  return <canvas ref={canvas} width={136} height={112} className="block h-14 w-[68px] shrink-0" aria-hidden="true" />;
}
