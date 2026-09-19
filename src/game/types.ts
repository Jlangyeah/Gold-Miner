export type TreasureKind =
  | 'gold_s'
  | 'gold_m'
  | 'gold_l'
  | 'gold_xl'
  | 'rock_s'
  | 'rock_l'
  | 'diamond'
  | 'bag'
  | 'tnt'
  | 'bone';

export interface Treasure {
  id: number;
  kind: TreasureKind;
  x: number;
  y: number;
  r: number;
  value: number;
  weight: number;
  points: { x: number; y: number }[] | null;
  taken: boolean;
}

interface KindSpec {
  r: number;
  base: number;
  weight: number;
  vary: number;
}

export const KIND_SPEC: Record<TreasureKind, KindSpec> = {
  gold_s: { r: 16, base: 65, weight: 1, vary: 0.35 },
  gold_m: { r: 25, base: 170, weight: 2.2, vary: 0.25 },
  gold_l: { r: 36, base: 380, weight: 4.2, vary: 0.25 },
  gold_xl: { r: 50, base: 820, weight: 7.5, vary: 0.2 },
  rock_s: { r: 22, base: 40, weight: 5, vary: 0.5 },
  rock_l: { r: 38, base: 90, weight: 9.5, vary: 0.5 },
  diamond: { r: 13, base: 350, weight: 0.6, vary: 0.7 },
  bag: { r: 21, base: 200, weight: 1.4, vary: 0.9 },
  tnt: { r: 19, base: 0, weight: 1, vary: 0 },
  bone: { r: 27, base: 130, weight: 2.4, vary: 0.6 },
};
