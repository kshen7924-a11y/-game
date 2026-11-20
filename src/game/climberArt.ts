import type { ClimberSkinConfig, LoadoutId, Vec2 } from './types';

const INK = '#202621';
const WEBBING = '#333a33';
const ALLOY = '#d7cdb6';

const sleeve = {
  shape: new Path2D('M -2 -4 Q 4 -6 17 -5 L 27 -4.1 Q 30 -3.5 31 0 Q 31 4 27 4.8 L 12 5.5 L 1 6 Q -4 4 -4 0 Z'),
  shadow: new Path2D('M -3 1 Q 8 2.6 17 1.5 L 30 -0.6 Q 31 3 27 4.8 L 12 5.5 L 1 6 Z'),
  seam: new Path2D('M 4 -4.5 Q 13 -3.5 24 -3.7 M 22 -2 L 25 1 M 25 -2.2 L 28 0.8'),
};

const cuff = {
  shape: new Path2D('M -2 -3.6 Q 2 -5.2 8 -4.4 L 26 -3.3 L 28 -2.2 L 28 2.8 L 8 4.3 Q 1 5.2 -2 3.6 Z'),
  shadow: new Path2D('M -2 1 Q 3 2.1 9 1.6 L 28 -0.2 L 28 2.8 L 8 4.3 Q 1 5.2 -2 3.6 Z'),
  seam: new Path2D('M 3 -3.3 L 9 -2.2 L 21 -2.7 M 24 -2.8 L 24 2.8'),
};

const thigh = {
  shape: new Path2D('M -4 -5 Q 0 -8 10 -6.7 L 24 -5.6 L 33 -5.2 Q 37 -3 36 1.8 Q 35 5 30 5.8 L 8 7.6 Q 0 8 -4 4 Z'),
  shadow: new Path2D('M -3 1.5 Q 8 4.2 18 3.5 L 34 0.5 L 36 1.8 Q 35 5 30 5.8 L 8 7.6 Q 0 8 -4 4 Z'),
  seam: new Path2D('M 4 -5 L 24 -4.5 L 30 -3.4 M 17 -4.5 L 20 -2.8'),
};

const gaiter = {
  shape: new Path2D('M -3 -4 Q 1 -6 9 -4.9 Q 17 -3.8 28 -3.7 L 31 -2 L 32 2.8 L 18 3.9 L 8 5 Q 0 6 -3 3 Z'),
  shadow: new Path2D('M -3 -3 Q 0 -6 9 -4.9 L 11 0.5 L 9 4.8 Q 0 6 -3 3 Z M 13 2.3 L 31 -0.3 L 32 2.8 L 18 3.9 L 12 4.5 Z'),
  seam: new Path2D('M 3 -3.5 L 8 -2.6 L 10 0 M 25 -2.7 L 25 2.7 M 28 -2.6 L 28 2.5'),
};

const shoulderYoke = new Path2D('M -6 -24 Q -12 -24 -16 -20 L -16 -13 L -10 -16 Q 0 -13 10 -17 L 16 -14 L 16 -19 Q 12 -23 6 -24 Q 0 -20 -6 -24 Z');
const hem = new Path2D('M -11 18 Q -1 22 12 18 L 12 21 Q 0 24 -11 21 Z');
const buckle = new Path2D('M -3 -1.9 L 2.5 -1.9 L 3.4 1.9 L -3 1.9 Z');
const head = new Path2D('M -8 -3 Q -10 -2 -9 1 L -8 4 Q -7 7 -5 8 L -4 12 Q 0 14 5 11 L 4 7 Q 7 6 8 3 Q 10 3 10 0 Q 10 -2 8 -2 L 6 -6 L -7 -6 Z');
const napeShade = new Path2D('M 1 6 L 6 4 L 4 7 L 5 11 L 1 12 Z');
const hair = new Path2D('M -8 2 Q -12 -4 -8 -9 L -9 -10 L -5 -10 L -3 -13 Q 5 -14 8 -9 L 10 -10 L 10 -7 Q 12 -4 9 1 L 7 4 L 4 7 L 4 5 L 1 8 L -1 6 L -4 8 L -5 5 L -7 6 Z');
const hairShade = new Path2D('M 4 -12 Q 11 -9 10 -4 L 9 1 L 7 4 L 4 7 L 4 5 L 1 8 L -1 6 L -4 8 L -5 5 L -2 3 Q 3 1 4 -4 Z');
const hairLight = new Path2D('M -7 -6 Q -4 -10 2 -10 M -7 -3 Q -5 -6 -1 -7');
const headband = new Path2D('M -10 -3 Q -2 1 8 -3 L 10 -5 L 10 -1 Q 2 5 -9 1 Z');
const headbandEdge = new Path2D('M -8 -1 Q -1 2 7 -1');
const tiedHair = new Path2D('M -1.6 -1.8 Q 2.8 -2.5 4 1.5 Q 4.8 4.4 7 5.6 Q 6 7 4.3 6.8 L 5.2 8.5 Q 1.8 7.4 1.5 4.8 Q -0.8 3.4 -1.6 -1.8 Z');
const tiedHairLight = new Path2D('M 1.5 0.4 Q 3 1.6 3.8 4.7');
const hairTie = new Path2D('M -2 0.4 L 1.6 -1.4 L 2.8 0.7 L -1 2.2 Z');
const hand = new Path2D('M -6 -2.7 L -3 -3.1 L -1 -4.6 Q 0 -5.4 1 -4.4 L 2 -3 L 4 -3 Q 5.7 -2.4 4.7 -0.8 L 4.8 1.4 Q 4.5 3.4 2.8 4 L -1.9 3.8 L -4 2.9 L -6 2.7 Z');
const handLight = new Path2D('M -1 -3.9 Q 0 -4.8 1 -4 L 2 -2.3 L 4 -2.7 L 4.8 -1.6 L 2.3 -0.7 L -0.5 -1.5 Z');
const shoe = new Path2D('M -11 -4 L -7 -6 L -2 -4.2 L 3 -3.3 Q 6 -2.6 6 0 Q 6.4 2.8 3 3.5 L -8 4.7 L -11 2.5 Z');
const shoeRubber = new Path2D('M -11 0.4 L -7 1.4 L 1 0.6 L 3 -3.3 Q 6 -2.6 6 0 Q 6.4 2.8 3 3.5 L -8 4.7 L -11 2.5 Z');
const shoeStrap = new Path2D('M -7 -5 L -4 -4.6 L -6 1.4 L -9 1.8 Z M -3 -3.9 L -1 -3.6 L -1.7 0.6 L -4.3 1 Z');

const packByLoadout: Record<Exclude<LoadoutId, 'free-solo'>, { shell: Path2D; pocket: Path2D; flap: Path2D }> = {
  light: {
    shell: new Path2D('M -6 -15 L 5 -16 L 8 -12 L 7 8 L 3 13 L -4 12 L -8 8 L -9 -10 Z'),
    pocket: new Path2D('M -7 2 L 6 1 L 6 7 L 3 11 L -3 11 L -7 7 Z'),
    flap: new Path2D('M -7 -14 L 4 -15 L 7 -12 L 5 -8 L -5 -7 L -8 -10 Z'),
  },
  balanced: {
    shell: new Path2D('M -7 -18 Q -1 -20 6 -18 L 11 -13 L 10 10 L 5 14 L -5 14 L -10 9 L -11 -12 Z'),
    pocket: new Path2D('M -9 1 Q 0 -1 8 1 L 8 8 L 4 12 L -5 12 L -8 8 Z'),
    flap: new Path2D('M -8 -17 Q -2 -19 5 -17 L 9 -14 L 7 -8 L -7 -7 L -10 -12 Z'),
  },
  heavy: {
    shell: new Path2D('M -9 -22 Q -2 -24 8 -22 L 13 -16 L 12 11 L 7 17 L -8 17 L -13 12 L -14 -14 Z'),
    pocket: new Path2D('M -11 0 Q 0 -2 10 0 L 10 9 L 6 15 L -7 15 L -10 10 Z'),
    flap: new Path2D('M -10 -21 Q 0 -23 8 -21 L 12 -16 L 9 -10 L -9 -9 L -13 -15 Z'),
  },
};

function fillPath(ctx: CanvasRenderingContext2D, path: Path2D, color: string) {
  ctx.fillStyle = color;
  ctx.fill(path);
}

function strokePath(ctx: CanvasRenderingContext2D, path: Path2D, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(path);
}

function paintPanel(ctx: CanvasRenderingContext2D, path: Path2D, color: string, edge = 1.35) {
  fillPath(ctx, path, color);
  strokePath(ctx, path, INK, edge);
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  length: number,
  panel: typeof sleeve,
  main: string,
  shade: string,
  mirror: boolean,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const projectedLength = Math.hypot(dx, dy);
  if (projectedLength < 0.25) return;

  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.scale(projectedLength / length, mirror ? -1 : 1);
  ctx.lineJoin = 'round';
  paintPanel(ctx, panel.shape, main);
  fillPath(ctx, panel.shadow, shade);
  strokePath(ctx, panel.seam, 'rgba(236, 223, 188, 0.49)', 0.75);
  ctx.restore();
}

export function drawLegPanels(
  ctx: CanvasRenderingContext2D,
  hip: Vec2,
  knee: Vec2,
  toe: Vec2,
  left: boolean,
  fabric: string,
  shadow: string,
) {
  drawSegment(ctx, hip, knee, 34, thigh, fabric, shadow, left);
  drawSegment(ctx, knee, toe, 32, gaiter, fabric, shadow, !left);
}

export function drawClimberShoe(
  ctx: CanvasRenderingContext2D,
  toe: Vec2,
  angle: number,
  flatten: number,
  mirrored: boolean,
  accent: string,
) {
  ctx.save();
  ctx.translate(toe.x, toe.y);
  if (mirrored) ctx.scale(-1, 1);
  ctx.rotate(angle);
  ctx.scale(1, flatten);
  ctx.lineJoin = 'round';
  paintPanel(ctx, shoe, accent, 1.4);
  fillPath(ctx, shoeRubber, '#292f29');
  fillPath(ctx, shoeStrap, '#dec8a4');
  ctx.restore();
}

export function drawArmPanels(
  ctx: CanvasRenderingContext2D,
  shoulder: Vec2,
  elbow: Vec2,
  grip: Vec2,
  left: boolean,
  fabric: string,
  shadow: string,
) {
  drawSegment(ctx, shoulder, elbow, 30, sleeve, fabric, shadow, left);
  drawSegment(ctx, elbow, grip, 28, cuff, fabric, shadow, left);
}

export function drawClimberHand(
  ctx: CanvasRenderingContext2D,
  grip: Vec2,
  angle: number,
  left: boolean,
  chalked: boolean,
  anchored: boolean,
) {
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(angle);
  if (left) ctx.scale(1, -1);
  ctx.lineJoin = 'round';
  paintPanel(ctx, hand, chalked ? '#e7dfce' : '#bb8364', 1.2);
  fillPath(ctx, handLight, chalked ? '#faf4e8' : '#dfaf88');
  if (anchored) {
    ctx.strokeStyle = '#493b2d';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(2.2, -3.1);
    ctx.lineTo(2.2, 2.9);
    ctx.stroke();
  }
  ctx.restore();
}

const strapPaths = new Path2D('M -11 -17 Q -8 -6 -10 8 L -10 13 M 10 -17 Q 8 -6 10 8 L 10 13');
const waistBelt = new Path2D('M -12 14 Q 0 18 12 14');
const legLoops = new Path2D('M -11 18 Q -8 22 -4 22 M 4 22 Q 9 21 11 18');
const packDrawcord = new Path2D('M -5 -5 Q 1 -1 5 -5 M -3 2 L 4 2');
const packTopStitch = new Path2D('M -6 -14 L -3 -15 L 3 -15 L 6 -13');
const packZipper = new Path2D('M -6 3 L 5 3');
const chalkBag = new Path2D('M -4 -3 L 4 -3 L 3.5 5 Q 0 7 -3.5 5 Z');
const chalkBagLip = new Path2D('M -4 -3 Q 0 -4.3 4 -3 L 4 -1 Q 0 0 -4 -1 Z');
const carabiner = new Path2D('M 0 -4 Q 3 -4 3.2 -0.5 L 2.4 3 Q 1 5 -1 4 Q -3 3 -3 0 L -1.8 -3 Z');
const carabinerGate = new Path2D('M 2.4 3 L 3.1 -1');
const mat = new Path2D('M -10 -3 L 9 -3 Q 12 -2 12 1 Q 11 4 9 4 L -10 4 Q -13 3 -13 0 Q -13 -2 -10 -3 Z');
const matStraps = new Path2D('M -5 -2.5 L -5 3.5 M 5 -2.5 L 5 3.5');

export function drawPack(ctx: CanvasRenderingContext2D, loadout: LoadoutId, trim: string) {
  if (loadout === 'free-solo') return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pack = packByLoadout[loadout];
  paintPanel(ctx, pack.shell, '#565d48', 1.65);
  paintPanel(ctx, pack.pocket, '#767a59', 0.9);
  paintPanel(ctx, pack.flap, '#909170', 0.9);
  strokePath(ctx, packTopStitch, '#c0baa0', 0.8);
  strokePath(ctx, packDrawcord, '#cfc2a3', 0.95);
  strokePath(ctx, packZipper, '#3c4437', 1);
  ctx.fillStyle = '#d1b678';
  ctx.fillRect(3.7, 2.4, 1.8, 3);
  ctx.fillStyle = trim;
  ctx.fillRect(-2.6, 6.5, 5.2, 2.6);

  if (loadout === 'heavy') {
    ctx.save();
    ctx.translate(0, 13);
    ctx.rotate(-0.08);
    paintPanel(ctx, mat, '#aa825d', 1.2);
    strokePath(ctx, matStraps, WEBBING, 1.6);
    ctx.restore();
  }
  ctx.restore();
}

interface KitPose {
  lookAngle: number;
  scarfSwing?: number;
  bagSwing?: number;
  twist?: number;
  waistX?: number;
  waistY?: number;
  rimColor?: string;
}

export function drawClimberKit(
  ctx: CanvasRenderingContext2D,
  skin: ClimberSkinConfig,
  loadout: LoadoutId,
  pose: KitPose,
) {
  const {
    lookAngle, scarfSwing = 0, bagSwing = 0,
    twist = 0, waistX = 0, waistY = 0, rimColor = '#d2bf9f',
  } = pose;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const shoulderScale = 1 - Math.abs(twist) * 0.14;
  const hipScale = 1 - Math.abs(twist) * 0.22;
  const chestWidth = 16 * shoulderScale;
  const hipWidth = 12.5 * hipScale;
  const waistControl = waistX * 0.45 + twist * 2.2;
  const jacket = new Path2D();
  jacket.moveTo(-6 * shoulderScale, -24);
  jacket.quadraticCurveTo(-chestWidth, -24, -chestWidth, -16);
  jacket.quadraticCurveTo(waistControl - hipWidth, 2, waistX - hipWidth, 20 + waistY);
  jacket.quadraticCurveTo(waistX, 24 + waistY, waistX + hipWidth, 20 + waistY);
  jacket.quadraticCurveTo(waistControl + hipWidth, 2, chestWidth, -16);
  jacket.quadraticCurveTo(chestWidth, -24, 6 * shoulderScale, -24);
  jacket.quadraticCurveTo(0, -21, -6 * shoulderScale, -24);
  jacket.closePath();
  fillPath(ctx, jacket, skin.jacket);

  ctx.save();
  ctx.clip(jacket);
  ctx.fillStyle = skin.jacketShadow;
  ctx.beginPath();
  ctx.moveTo(twist * 7.5, -24);
  ctx.lineTo(chestWidth + 3, -24);
  ctx.lineTo(waistX + hipWidth + 4, 25 + waistY);
  ctx.lineTo(waistX + twist * 4, 25 + waistY);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.scale(shoulderScale, 1);
  fillPath(ctx, shoulderYoke, skin.accent);
  ctx.restore();
  ctx.translate(waistX, waistY);
  ctx.scale(hipScale, 1);
  fillPath(ctx, hem, skin.jacketShadow);
  ctx.restore();
  strokePath(ctx, jacket, INK, 1.65);
  if (twist > -0.55) {
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-chestWidth + 2, -18);
    ctx.quadraticCurveTo(waistControl - hipWidth + 1.8, 2, waistX - hipWidth + 2, 15 + waistY);
    ctx.stroke();
  }

  if (loadout !== 'free-solo') {
    strokePath(ctx, strapPaths, WEBBING, 2.4);
    ctx.save();
    ctx.translate(waistX, waistY);
    ctx.rotate(twist * 0.08);
    ctx.scale(hipScale, 1);
    strokePath(ctx, legLoops, '#333a31', 2.5);
    strokePath(ctx, waistBelt, INK, 5.6);
    strokePath(ctx, waistBelt, '#7e7056', 2.6);
    ctx.save();
    ctx.translate(-8, 15.7);
    paintPanel(ctx, buckle, '#c1b393', 1);
    ctx.restore();

    ctx.save();
    ctx.translate(10.5, 15.3);
    ctx.rotate(0.18 + bagSwing);
    paintPanel(ctx, chalkBag, '#825d48', 1.2);
    fillPath(ctx, chalkBagLip, '#d2bf9f');
    ctx.restore();

    ctx.translate(-12.3, 17);
    ctx.rotate(-0.22 - bagSwing * 0.65);
    strokePath(ctx, carabiner, INK, 3.1);
    strokePath(ctx, carabiner, ALLOY, 1.6);
    strokePath(ctx, carabinerGate, skin.accent, 1.65);
    ctx.restore();

    ctx.save();
    ctx.translate(waistX * 0.25 - twist * 4.2, waistY * 0.25);
    ctx.scale(1 - Math.abs(twist) * 0.18, 1);
    drawPack(ctx, loadout, skin.accent);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.moveTo(-5, -21);
  ctx.quadraticCurveTo(-14 + scarfSwing * 0.4, -23, -17 + scarfSwing, -13);
  ctx.lineTo(-20 + scarfSwing, -11.5);
  ctx.quadraticCurveTo(-14 + scarfSwing * 0.35, -18, -4, -18);
  ctx.closePath();
  ctx.fillStyle = skin.scarf;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.save();
  ctx.translate(-twist * 1.8, -32);
  ctx.rotate(lookAngle);
  paintPanel(ctx, head, '#bb8364', 1.25);
  fillPath(ctx, napeShade, '#8c644e');
  paintPanel(ctx, hair, '#534032', 1.15);
  fillPath(ctx, hairShade, '#332d27');
  strokePath(ctx, hairLight, '#a27755', 0.95);
  paintPanel(ctx, headband, skin.beanie, 0.85);
  strokePath(ctx, headbandEdge, '#e4be90', 0.75);

  ctx.translate(4.6, 3);
  ctx.rotate(-0.08 + scarfSwing * 0.023);
  paintPanel(ctx, tiedHair, '#47362b', 1.1);
  strokePath(ctx, tiedHairLight, '#8c6549', 0.85);
  paintPanel(ctx, hairTie, skin.accent, 0.65);
  ctx.restore();
  ctx.restore();
}
