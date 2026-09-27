export const view = { W: 960, H: 540 };
export const ANCHOR = { x: 480, y: 100 };
export const HORIZON_Y = 138;

export const SWING_MAX = (80 * Math.PI) / 180;
export const SWING_PERIOD = 3.4;
export const ROPE_MIN = 36;
export const ROPE_START = 60;
export const EXTEND_SPEED = 540;
export const RETRACT_BASE = 560;
export const HIT_RADIUS = 9;

export const LEVEL_TIME = 60;

export const itemArea = () => ({
  x0: 40,
  x1: view.W - 40,
  y0: HORIZON_Y + 55,
  y1: view.H - 24,
});

export const targetFor = (level: number) =>
  Math.round((500 + 280 * level + 18 * level * level) / 10) * 10;

export const isBonusLevel = (level: number) => level > 1 && level % 3 === 0;

/** 奖励关没有石头拖慢节奏，时限也更短，所以目标改成「本关再挖多少」 */
export const bonusGoalFor = (level: number) => Math.round((400 + 180 * level) / 10) * 10;

export const BONUS_TIME = 45;

export const levelTarget = (level: number, money: number) =>
  isBonusLevel(level) ? money + bonusGoalFor(level) : targetFor(level);
