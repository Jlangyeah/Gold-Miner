export const W = 960;
export const H = 540;
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
export const TIME_BONUS_PER_SEC = 10;

export const ITEM_AREA = { x0: 40, x1: W - 40, y0: HORIZON_Y + 55, y1: H - 24 };

export const targetFor = (level: number) =>
  Math.round((500 + 280 * level + 18 * level * level) / 10) * 10;
