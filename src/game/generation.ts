import { ITEM_AREA } from './constants';
import { KIND_SPEC, Treasure, TreasureKind } from './types';

let nextId = 1;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function pickKind(depth: number, level: number, luck: number): TreasureKind {
  const roll = Math.random();
  if (roll < 0.05 + luck * 0.05) return 'diamond';
  if (roll < 0.09 + luck * 0.07) return 'bag';
  if (level >= 2 && roll > 0.9 && roll < 0.95) return 'tnt';
  if (roll > 0.96) return 'bone';
  if (Math.random() < 0.14 + depth * 0.28) {
    return depth > 0.55 && Math.random() < 0.55 ? 'rock_l' : 'rock_s';
  }
  const g = Math.random();
  if (depth > 0.62 && g < 0.16) return 'gold_xl';
  if (depth > 0.35 && g < 0.5) return 'gold_l';
  if (g < 0.78) return 'gold_m';
  return 'gold_s';
}

function jaggedPoints(r: number) {
  const pts: { x: number; y: number }[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * rand(0.72, 1.05);
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
  }
  return pts;
}

export function generateLevel(level: number, luck: number): Treasure[] {
  const items: Treasure[] = [];
  const count = 15 + Math.min(level, 6);
  let guard = 0;
  while (items.length < count && guard++ < count * 60) {
    const x = rand(ITEM_AREA.x0, ITEM_AREA.x1);
    const y = rand(ITEM_AREA.y0, ITEM_AREA.y1);
    const depth = (y - ITEM_AREA.y0) / (ITEM_AREA.y1 - ITEM_AREA.y0);
    const kind = pickKind(depth, level, luck);
    const spec = KIND_SPEC[kind];
    const r = spec.r;
    const overlap = items.some((t) => {
      const dx = t.x - x;
      const dy = t.y - y;
      return Math.hypot(dx, dy) < t.r + r + 8;
    });
    if (overlap) continue;
    const value = Math.round((spec.base * rand(1 - spec.vary, 1 + spec.vary)) / 5) * 5;
    items.push({
      id: nextId++,
      kind,
      x,
      y,
      r,
      value,
      weight: spec.weight,
      points: kind.startsWith('rock') ? jaggedPoints(r) : null,
      taken: false,
    });
  }
  return items;
}

export function totalValue(items: Treasure[]): number {
  return items.reduce((s, t) => s + t.value, 0);
}
