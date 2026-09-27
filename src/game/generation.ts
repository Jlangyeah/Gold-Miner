import { isBonusLevel, itemArea } from './constants';
import { KIND_SPEC, Treasure, TreasureKind } from './types';

let nextId = 1;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function pickKind(depth: number, level: number, luck: number): TreasureKind {
  const roll = Math.random();
  if (roll < 0.05 + luck * 0.05) return 'diamond';
  if (roll < 0.09 + luck * 0.07) return 'bag';
  if (roll > 0.86 && roll <= 0.9) return 'magnet';
  if (level >= 3 && roll > 0.9 && roll <= 0.918) return 'rat';
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

export function makeTreasure(kind: TreasureKind, x: number, y: number, valueMul = 1): Treasure {
  const spec = KIND_SPEC[kind];
  const value =
    spec.base === 0
      ? 0
      : Math.round((spec.base * rand(1 - spec.vary, 1 + spec.vary) * valueMul) / 5) * 5;
  return {
    id: nextId++,
    kind,
    x,
    y,
    r: spec.r,
    value,
    weight: spec.weight,
    points: kind.startsWith('rock') ? jaggedPoints(spec.r) : null,
    taken: false,
  };
}

const overlaps = (items: Treasure[], x: number, y: number, r: number) =>
  items.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 8);

/** 钻石簇：3~5 颗小钻连成一小片，钩子擦过可连抓 */
function diamondCluster(items: Treasure[], area: ReturnType<typeof itemArea>) {
  const cx = rand(area.x0 + 70, area.x1 - 70);
  const cy = rand(area.y0 + 40, area.y1 - 40);
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
    const d = i === 0 ? 0 : rand(24, 34);
    const x = Math.min(Math.max(cx + Math.cos(a) * d, area.x0), area.x1);
    const y = Math.min(Math.max(cy + Math.sin(a) * d, area.y0), area.y1);
    if (overlaps(items, x, y, KIND_SPEC.diamond.r)) continue;
    items.push(makeTreasure('diamond', x, y, 0.75));
  }
}

function rat(items: Treasure[], area: ReturnType<typeof itemArea>) {
  const x0 = rand(area.x0 + 30, area.x1 - 220);
  const x1 = x0 + rand(150, 260);
  const y = rand(area.y0 + 30, area.y1 - 30);
  if (overlaps(items, (x0 + x1) / 2, y, KIND_SPEC.rat.r + 30)) return;
  const t = makeTreasure('rat', (x0 + x1) / 2, y);
  t.x0 = x0;
  t.x1 = x1;
  t.vx = Math.random() < 0.5 ? -1 : 1;
  items.push(t);
}

/** 每 3 关为奖励关：无石头无 TNT，纯宝物 */
const BONUS_KINDS: TreasureKind[] = [
  'gold_s',
  'gold_m',
  'gold_l',
  'gold_xl',
  'diamond',
  'bag',
  'bone',
];

export function generateLevel(level: number, luck: number): Treasure[] {
  const items: Treasure[] = [];
  const area = itemArea();

  if (isBonusLevel(level)) {
    const count = 20 + Math.min(level, 8);
    let guard = 0;
    while (items.length < count && guard++ < count * 60) {
      const kind = pick(BONUS_KINDS);
      const x = rand(area.x0, area.x1);
      const y = rand(area.y0, area.y1);
      if (overlaps(items, x, y, KIND_SPEC[kind].r)) continue;
      items.push(makeTreasure(kind, x, y, 1.2));
    }
    return items;
  }

  const count = 15 + Math.min(level, 6);
  let guard = 0;
  while (items.length < count && guard++ < count * 60) {
    const x = rand(area.x0, area.x1);
    const y = rand(area.y0, area.y1);
    const depth = (y - area.y0) / (area.y1 - area.y0);
    const kind = pickKind(depth, level, luck);
    if (kind === 'rat') {
      if (overlaps(items, x, y, KIND_SPEC.rat.r)) continue;
      rat(items, area);
      continue;
    }
    const spec = KIND_SPEC[kind];
    if (overlaps(items, x, y, spec.r)) continue;
    items.push(makeTreasure(kind, x, y));
  }
  if (Math.random() < 0.45 + luck * 0.25) diamondCluster(items, area);
  return items;
}

/** 「金矿脉」奖励：以 (cx, cy) 为中心散落一串小金币 */
export function spawnVein(cx: number, cy: number, existing: Treasure[]): Treasure[] {
  const area = itemArea();
  const out: Treasure[] = [];
  for (let i = 0; i < 7; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const x = Math.min(Math.max(cx + rand(-150, 150), area.x0 + 14), area.x1 - 14);
      const y = Math.min(Math.max(cy + rand(-110, 110), area.y0 + 14), area.y1 - 14);
      if (overlaps(existing, x, y, KIND_SPEC.nugget.r) || overlaps(out, x, y, KIND_SPEC.nugget.r))
        continue;
      out.push(makeTreasure('nugget', x, y));
      break;
    }
  }
  return out;
}

export function totalValue(items: Treasure[]): number {
  return items.reduce((s, t) => s + t.value, 0);
}
