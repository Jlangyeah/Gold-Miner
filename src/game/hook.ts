import {
  ANCHOR,
  EXTEND_SPEED,
  RETRACT_BASE,
  ROPE_MIN,
  ROPE_START,
  SWING_MAX,
  SWING_PERIOD,
  W,
  H,
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
  attached: Treasure | null = null;
  fuse = -1;
  speedMul = 1;

  reset() {
    this.phase = 'swing';
    this.t = Math.random() * SWING_PERIOD;
    this.len = ROPE_START;
    this.attached = null;
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

  attach(item: Treasure) {
    this.attached = item;
    this.phase = 'retract';
    if (item.kind === 'tnt') this.fuse = 3;
  }

  retractSpeed(): number {
    const w = this.attached ? this.attached.weight : 0;
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
      if (x < -20 || x > W + 20 || y > H + 20) {
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
