interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text: string | null;
  grow: number;
}

export class Particles {
  private list: Particle[] = [];

  floatText(x: number, y: number, text: string, color: string) {
    this.list.push({ x, y, vx: 0, vy: -45, life: 1.3, max: 1.3, color, size: 22, text, grow: 0 });
  }

  burst(x: number, y: number, color: string, n: number, speed: number, grow = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.6 + Math.random() * 0.4,
        max: 1,
        color,
        size: 3 + Math.random() * 4,
        text: null,
        grow,
      });
    }
  }

  update(dt: number) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.text ? 0 : 240) * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const alpha = Math.max(0, Math.min(1, p.life / (p.max * 0.6)));
      ctx.globalAlpha = alpha;
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.grow * (1 - p.life / p.max), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
