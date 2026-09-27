import {
  ANCHOR,
  EXTEND_SPEED,
  RETRACT_BASE,
  ROPE_MIN,
  ROPE_START,
  SWING_MAX,
  SWING_PERIOD,
  view,
} from './constants';
import { Treasure } from './types';

export type HookPhase = 'swing' | 'extend' | 'retract';

export class Hook {
  phase: HookPhase = 'swing';
  t = 0;
  angle = 0;
  len = ROPE_START;
  dirX = 0;
  dirY = 1;
  /** 钩上串着的物品，第一件决定行为（TNT 引信、抓空判定） */
  carry: Treasure[] = [];
  fuse = -1;
  speedMul = 1;

  get attached(): Treasure | null {
    return this.carry[0] ?? null;
  }

  reset() {
    this.phase = 'swing';
    this.t = Math.random() * SWING_PERIOD;
    this.len = ROPE_START;
    this.carry = [];
    this.fuse = -1;
  }

  tipX() {
    return ANCHOR.x + this.dirX * this.len;
  }

  tipY() {
    return ANCHOR.y + this.dirY * this.len;
  }

  release() {
    if (this.phase !== 'swing') return;
    this.dirX = Math.sin(this.angle);
    this.dirY = Math.cos(this.angle);
    this.phase = 'extend';
  }

  grab(item: Treasure) {
    this.carry.push(item);
    this.phase = 'retract';
    // 咬住瞬间再往前冲一点，让成片的宝物有机会一起被兜住
    if (this.carry.length === 1) this.len += 22;
    if (item === this.carry[0] && item.kind === 'tnt') this.fuse = 3;
  }

  retractSpeed(): number {
    let w = 0;
    for (const t of this.carry) w += t.weight;
    return (RETRACT_BASE * this.speedMul) / (1 + 0.45 * w);
  }

  update(dt: number): 'release' | null {
    if (this.phase === 'swing') {
      this.t += dt;
      this.angle = SWING_MAX * Math.sin((this.t / SWING_PERIOD) * Math.PI * 2);
      this.dirX = Math.sin(this.angle);
      this.dirY = Math.cos(this.angle);
      return null;
    }
    if (this.phase === 'extend') {
      this.len += EXTEND_SPEED * dt;
      const x = this.tipX();
      const y = this.tipY();
      if (x < -20 || x > view.W + 20 || y > view.H + 20) {
        this.phase = 'retract';
      }
      return null;
    }
    this.len -= this.retractSpeed() * dt;
    if (this.len <= ROPE_MIN) {
      this.len = ROPE_MIN;
      this.fuse = -1;
      this.phase = 'swing';
      return 'release';
    }
    return null;
  }
}
