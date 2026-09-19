import { ANCHOR, HORIZON_Y, view } from './constants';
import { Hook } from './hook';
import { Treasure } from './types';

const speckles: { x: number; y: number; r: number; a: number }[] = [];
let specklesH = -1;

function ensureSpeckles() {
  if (specklesH === view.H) return;
  specklesH = view.H;
  speckles.length = 0;
  let s = 12345;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 130; i++) {
    speckles.push({
      x: rnd() * view.W,
      y: HORIZON_Y + 20 + rnd() * (view.H - HORIZON_Y - 30),
      r: 1.5 + rnd() * 3.5,
      a: 0.08 + rnd() * 0.15,
    });
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
  ensureSpeckles();
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, '#8ecdea');
  sky.addColorStop(1, '#d8efb8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.W, HORIZON_Y);

  ctx.fillStyle = '#ffe27a';
  ctx.beginPath();
  ctx.arc(90, 52, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, sc] of [
    [view.W * 0.73, 45, 1],
    [view.W * 0.88, 75, 0.75],
    [view.W * 0.31, 40, 0.85],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 22 * sc, cy + 4 * sc, 15 * sc, 0, Math.PI * 2);
    ctx.arc(cx - 22 * sc, cy + 5 * sc, 14 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#6aaa3c';
  ctx.fillRect(0, HORIZON_Y - 10, view.W, 14);

  const dirt = ctx.createLinearGradient(0, HORIZON_Y, 0, view.H);
  dirt.addColorStop(0, '#8a5a30');
  dirt.addColorStop(1, '#4a2c15');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, HORIZON_Y + 4, view.W, view.H - HORIZON_Y);

  for (const sp of speckles) {
    ctx.fillStyle = `rgba(30,15,5,${sp.a})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#b98d4f';
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x - 130, HORIZON_Y + 4);
  ctx.lineTo(ANCHOR.x - 40, HORIZON_Y - 46);
  ctx.lineTo(ANCHOR.x + 55, HORIZON_Y - 30);
  ctx.lineTo(ANCHOR.x + 135, HORIZON_Y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a4a1e';
  ctx.beginPath();
  ctx.ellipse(ANCHOR.x, HORIZON_Y - 22, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTreasure(ctx: CanvasRenderingContext2D, t: Treasure, showValue: boolean) {
  ctx.save();
  ctx.translate(t.x, t.y);
  switch (t.kind) {
    case 'gold_s':
    case 'gold_m':
    case 'gold_l':
    case 'gold_xl':
      drawGold(ctx, t.r);
      break;
    case 'rock_s':
    case 'rock_l':
      drawRock(ctx, t);
      break;
    case 'diamond':
      drawDiamond(ctx, t.r);
      break;
    case 'bag':
      drawBag(ctx, t.r);
      break;
    case 'tnt':
      drawTnt(ctx, t.r);
      break;
    case 'bone':
      drawBone(ctx, t.r);
      break;
  }
  ctx.restore();
  if (showValue && t.value > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${t.value}`, t.x, t.y - t.r - 5);
  }
}

function drawGold(ctx: CanvasRenderingContext2D, r: number) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.15, 0, 0, r);
  g.addColorStop(0, '#fff1a8');
  g.addColorStop(0.5, '#ffd23e');
  g.addColorStop(1, '#c78a10');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.25);
  ctx.lineTo(-r * 0.55, -r * 0.6);
  ctx.lineTo(r * 0.25, -r * 0.85);
  ctx.lineTo(r, -r * 0.1);
  ctx.lineTo(r * 0.6, r * 0.75);
  ctx.lineTo(-r * 0.5, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a5c07';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, t: Treasure) {
  const g = ctx.createLinearGradient(0, -t.r, 0, t.r);
  g.addColorStop(0, '#a8a8a8');
  g.addColorStop(1, '#5f5f5f');
  ctx.fillStyle = g;
  ctx.beginPath();
  const pts = t.points!;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d3d3d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(-t.r * 0.3, -t.r * 0.2);
  ctx.lineTo(t.r * 0.15, t.r * 0.25);
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#9ff3ff';
  ctx.strokeStyle = '#2fa8c8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.3);
  ctx.lineTo(r, -r * 0.2);
  ctx.lineTo(0, r * 1.2);
  ctx.lineTo(-r, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.2);
  ctx.lineTo(0, -r * 1.05);
  ctx.lineTo(r * 0.5, -r * 0.2);
  ctx.stroke();
}

function drawBag(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#a06a35';
  ctx.strokeStyle = '#5d3a16';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.5);
  ctx.quadraticCurveTo(-r * 1.15, r * 0.3, 0, r * 0.9);
  ctx.quadraticCurveTo(r * 1.15, r * 0.3, r * 0.45, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8c86a';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.4, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = `bold ${r}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('$', 0, r * 0.55);
}

function drawTnt(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#c03030';
  ctx.strokeStyle = '#6d1414';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r * 0.9, r * 1.6, r * 1.9, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(9, r * 0.55)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('TNT', 0, r * 0.3);
  ctx.strokeStyle = '#3d2b12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.25, -r * 1.8);
  ctx.stroke();
  ctx.fillStyle = '#ffb340';
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 1.8, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBone(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = '#e8e0c8';
  ctx.fillStyle = '#e8e0c8';
  ctx.lineWidth = r * 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.4);
  ctx.lineTo(r * 0.6, r * 0.4);
  ctx.stroke();
  for (const [bx, by] of [
    [-r * 0.6, -r * 0.4],
    [r * 0.6, r * 0.4],
  ]) {
    ctx.beginPath();
    ctx.arc(bx - 5, by - 4, r * 0.2, 0, Math.PI * 2);
    ctx.arc(bx + 5, by + 1, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

export function drawRopeAndHook(ctx: CanvasRenderingContext2D, hook: Hook) {
  const tx = hook.tipX();
  const ty = hook.tipY();
  ctx.strokeStyle = '#a87838';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, ANCHOR.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  const ang = Math.atan2(hook.dirY, hook.dirX);
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(ang - Math.PI / 2);
  ctx.strokeStyle = '#6e6e6e';
  ctx.fillStyle = '#9a9a9a';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 9, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.quadraticCurveTo(-11, 12, -4, 13);
  ctx.moveTo(9, 2);
  ctx.quadraticCurveTo(11, 12, 4, 13);
  ctx.moveTo(0, 9);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMiner(ctx: CanvasRenderingContext2D, hook: Hook) {
  const x = ANCHOR.x - 62;
  const y = ANCHOR.y - 8;
  const pulling = hook.phase === 'retract';
  ctx.save();
  ctx.translate(x, y);
  if (pulling) ctx.rotate(Math.sin(performance.now() / 60) * 0.04);

  ctx.fillStyle = '#3a6ea8';
  ctx.beginPath();
  ctx.roundRect(-14, -6, 28, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(0, -18, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8a51c';
  ctx.beginPath();
  ctx.arc(0, -22, 12.5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-14.5, -23, 29, 4);
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.arc(4, -17, 1.8, 0, Math.PI * 2);
  ctx.arc(-1, -17, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4a1e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(34, pulling ? -14 : -8);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#5d3a16';
  ctx.beginPath();
  ctx.roundRect(ANCHOR.x - 22, ANCHOR.y - 26, 44, 34, 5);
  ctx.fill();
  ctx.strokeStyle = '#2e1a08';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ANCHOR.x, ANCHOR.y - 9, 11, 0, Math.PI * 2);
  ctx.stroke();
  const spin = hook.phase === 'retract' ? performance.now() / 90 : hook.t;
  ctx.save();
  ctx.translate(ANCHOR.x, ANCHOR.y - 9);
  ctx.rotate(spin);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.restore();
}
