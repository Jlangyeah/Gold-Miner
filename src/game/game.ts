import { AudioEngine } from './audio';
import { ANCHOR, HIT_RADIUS, H, LEVEL_TIME, W, targetFor } from './constants';
import { generateLevel } from './generation';
import { Hook } from './hook';
import { Particles } from './particles';
import {
  drawBackground,
  drawMiner,
  drawRopeAndHook,
  drawTreasure,
} from './render';
import { SaveData, clearProgress, loadSave, writeSave } from './save';
import { Treasure } from './types';

type State = 'menu' | 'playing' | 'result' | 'shop';

interface ShopEntry {
  key: 'coffee' | 'speed' | 'tnt' | 'compass' | 'ball' | 'clover';
  name: string;
  desc: string;
  price: number;
  perm: boolean;
}

const SHOP: ShopEntry[] = [
  { key: 'coffee', name: '☕ 咖啡', desc: '下一关时间 +15 秒', price: 220, perm: false },
  { key: 'speed', name: '⚗️ 力量药水', desc: '下一关收线速度 +40%', price: 250, perm: false },
  { key: 'tnt', name: '🧨 炸药', desc: '下一关开局炸掉最大的石头', price: 180, perm: false },
  { key: 'compass', name: '🧭 指南针', desc: '永久显示宝物价值', price: 300, perm: true },
  { key: 'ball', name: '🔮 水晶球', desc: '永久预告下一关目标金额', price: 150, perm: true },
  { key: 'clover', name: '🍀 幸运草', desc: '永久提高钻石与钱袋出现率', price: 320, perm: true },
];

export class Game {
  private ctx: CanvasRenderingContext2D;
  private overlay: HTMLElement;
  private audio = new AudioEngine();
  private particles = new Particles();
  private hook = new Hook();
  private save: SaveData;

  state: State = 'menu';
  private level = 1;
  private money = 0;
  private startMoney = 0;
  private target = targetFor(1);
  private timeLeft = LEVEL_TIME;
  private levelTime = LEVEL_TIME;
  private items: Treasure[] = [];
  private lastSec = -1;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.overlay = document.getElementById('overlay')!;
    this.save = loadSave();
    this.audio.muted = this.save.mute;
    this.overlay.addEventListener('click', (e) => this.onOverlayClick(e));
    this.showMenu();
  }

  press() {
    this.audio.ensure();
    if (this.state !== 'playing') return;
    if (this.hook.phase === 'swing') {
      this.hook.release();
      this.audio.shoot();
    }
  }

  toggleMute() {
    this.save.mute = !this.save.mute;
    this.audio.muted = this.save.mute;
    if (!this.save.mute && this.state === 'playing') this.audio.startBgm();
    if (this.save.mute) this.audio.stopBgm();
    writeSave(this.save);
  }

  update(dt: number) {
    this.particles.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.state !== 'playing') return;

    this.timeLeft -= dt;
    const sec = Math.ceil(this.timeLeft);
    if (sec !== this.lastSec) {
      this.lastSec = sec;
      if (sec <= 10 && sec > 0) this.audio.tick();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endLevel();
      return;
    }

    const evt = this.hook.update(dt);

    if (this.hook.phase === 'extend') this.checkHits();
    if (this.hook.attached?.kind === 'tnt' && this.hook.phase === 'retract')
      this.updateTnt(dt);
    if (evt === 'release') {
      if (this.hook.attached) this.collect(this.hook.attached);
      this.hook.attached = null;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0)
      ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBackground(ctx);
    for (const t of this.items) if (!t.taken) drawTreasure(ctx, t, this.save.perm.compass);
    drawRopeAndHook(ctx, this.hook);
    drawMiner(ctx, this.hook);
    this.particles.draw(ctx);
    ctx.restore();
    if (this.state === 'playing' || this.state === 'result') this.drawHud(ctx);
  }

  private checkHits() {
    const tx = this.hook.tipX();
    const ty = this.hook.tipY();
    for (const t of this.items) {
      if (t.taken) continue;
      if (Math.hypot(t.x - tx, t.y - ty) < t.r + HIT_RADIUS) {
        t.taken = true;
        this.hook.attach(t);
        this.audio.hit();
        return;
      }
    }
  }

  private updateTnt(dt: number) {
    this.hook.fuse -= dt;
    if (this.hook.fuse > 0) return;
    const t = this.hook.attached!;
    const x = this.hook.tipX();
    const y = this.hook.tipY();
    t.value = 0;
    this.hook.attached = null;
    this.hook.fuse = -1;
    this.audio.explode();
    this.shake = 1;
    this.particles.burst(x, y, '#ff8c2e', 26, 260, 6);
    this.particles.burst(x, y, '#5a5a5a', 18, 150, 8);
    for (const other of this.items) {
      if (other.taken || other === t) continue;
      if (Math.hypot(other.x - x, other.y - y) < 95) {
        other.taken = true;
        if (other.value > 0)
          this.particles.floatText(other.x, other.y, '报废…', '#ff9d9d');
      }
    }
    this.particles.floatText(x, y - 24, 'BOOM!', '#ff5c5c');
  }

  private collect(t: Treasure) {
    if (t.kind === 'tnt') {
      this.particles.floatText(ANCHOR.x + 60, ANCHOR.y + 20, '拆除成功!', '#9dff8c');
      return;
    }
    this.money += t.value;
    this.save.money = this.money;
    writeSave(this.save);
    if (t.kind === 'rock_s' || t.kind === 'rock_l') {
      this.audio.rock();
      this.particles.floatText(ANCHOR.x + 60, ANCHOR.y + 20, `+$${t.value}`, '#c8c8c8');
    } else {
      this.audio.coin(t.value);
      this.particles.floatText(ANCHOR.x + 60, ANCHOR.y + 20, `+$${t.value}`, '#ffd23e');
      this.particles.burst(ANCHOR.x + 60, ANCHOR.y + 30, '#ffd23e', 10, 120);
    }
  }

  private endLevel() {
    this.audio.stopBgm();
    if (this.money >= this.target) {
      this.save.level = this.level + 1;
      if (this.save.level > this.save.high) {
        this.save.high = this.save.level;
      }
      writeSave(this.save);
      this.state = 'result';
      this.audio.win();
      this.showResult(true);
    } else {
      this.state = 'result';
      this.audio.lose();
      this.save.high = Math.max(this.save.high, this.save.level);
      this.save = clearProgress(this.save);
      this.showResult(false);
    }
  }

  private startLevel() {
    const lv = this.save.level;
    this.level = lv;
    this.money = this.save.money;
    this.startMoney = this.money;
    this.target = targetFor(lv);
    this.levelTime = LEVEL_TIME + 15 * this.save.pending.coffee;
    this.timeLeft = this.levelTime;
    this.hook.speedMul = Math.min(2.2, Math.pow(1.4, this.save.pending.speed));
    const tntCount = this.save.pending.tnt;
    this.save.pending = { coffee: 0, speed: 0, tnt: 0 };
    writeSave(this.save);
    this.items = generateLevel(lv, this.save.perm.clover ? 1 : 0);
    this.hook.reset();
    this.state = 'playing';
    this.hideOverlay();
    this.audio.ensure();
    if (!this.audio.muted) this.audio.startBgm();
    if (tntCount > 0) {
      const rock = this.items
        .filter((t) => !t.taken && t.kind.startsWith('rock'))
        .sort((a, b) => b.weight - a.weight)[0];
      if (rock) {
        rock.taken = true;
        this.particles.burst(rock.x, rock.y, '#ff8c2e', 30, 280, 6);
        this.particles.burst(rock.x, rock.y, '#5a5a5a', 20, 160, 8);
        this.audio.explode();
        this.shake = 1;
      }
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(14, 10, 300, 66, 10);
    ctx.roundRect(W - 290, 10, 276, 40, 10);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = this.money >= this.target ? '#7dff7d' : '#ffd23e';
    ctx.fillText(`$${this.money}`, 28, 40);
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`第 ${this.level} 关 · 目标 $${this.target}`, 28, 64);

    const barW = 250;
    const frac = this.timeLeft / this.levelTime;
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(W - 278, 22, barW, 16);
    ctx.fillStyle = frac < 0.17 ? '#ff5c5c' : '#ffb340';
    ctx.fillRect(W - 278, 22, barW * frac, 16);
    ctx.strokeStyle = '#1c1208';
    ctx.lineWidth = 2;
    ctx.strokeRect(W - 278, 22, barW, 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 20, 54);
  }

  private onOverlayClick(e: Event) {
    const el = (e.target as HTMLElement).closest('[data-action]');
    if (!el) return;
    const action = (el as HTMLElement).dataset.action!;
    this.audio.click();
    if (action === 'start') this.startLevel();
    else if (action === 'shop') this.showShop();
    else if (action === 'menu') {
      this.state = 'menu';
      this.showMenu();
    }
    else if (action === 'mute') this.toggleMute();
    else if (action.startsWith('buy:')) this.buy(SHOP.find((s) => s.key === action.slice(4))!);
  }

  private buy(entry: ShopEntry) {
    if (this.money < entry.price) return;
    this.money -= entry.price;
    this.save.money = this.money;
    if (entry.perm) {
      (this.save.perm as any)[entry.key] = true;
    } else {
      (this.save.pending as any)[entry.key]++;
    }
    writeSave(this.save);
    this.showShop();
  }

  private hideOverlay() {
    this.overlay.classList.remove('show');
    this.overlay.innerHTML = '';
  }

  private showOverlay(html: string) {
    this.overlay.innerHTML = html;
    this.overlay.classList.add('show');
  }

  private showMenu() {
    this.state = 'menu';
    const cont = this.save.level > 1 ? `继续 · 第 ${this.save.level} 关` : '开始游戏';
    this.showOverlay(`
      <div class="card">
        <h1>⛏️ 黄金矿工</h1>
        <p>经典玩法复刻 · 点击/空格 放钩</p>
        <p style="margin-top:10px">最高纪录：${this.save.high ? `第 <b>${this.save.high}</b> 关` : '暂无'} · 存款 <b>$${this.save.money}</b></p>
        <button class="btn" data-action="start">${cont}</button>
        <div class="mute-row"><button class="btn" style="font-size:14px;padding:6px 18px" data-action="mute">🔊 音效：${this.save.mute ? '关' : '开'}（M）</button></div>
      </div>`);
  }

  private showResult(win: boolean) {
    const earned = this.money - this.startMoney;
    this.showOverlay(`
      <div class="card">
        <h2>${win ? '🎉 过关！' : '💥 时间到，未达标…'}</h2>
        <p>本关挖到 <b>$${earned}</b> · 总资产 <b>$${this.money}</b> / 目标 $${this.target}</p>
        ${win ? '<p>带着你的金币去商店看看吧</p>' : '<p>本次冒险进度清零，卷土重来！</p>'}
        ${
          win
            ? '<button class="btn" data-action="shop">前往商店 →</button>'
            : '<button class="btn" data-action="menu">回到主页</button>'
        }
      </div>`);
  }

  private showShop() {
    this.state = 'shop';
    const nextLv = this.save.level;
    const nextTarget = targetFor(nextLv);
    const rows = SHOP.map((s) => {
      const owned = s.perm
        ? (this.save.perm as any)[s.key]
          ? '已拥有'
          : ''
        : `已囤 ${(this.save.pending as any)[s.key]}`;
      const afford = this.money >= s.price && !(s.perm && (this.save.perm as any)[s.key]);
      return `<div class="shop-item"><b>${s.name}</b>${s.desc}<div class="price">$${s.price}</div>
        <div style="height:16px;font-size:12px;color:#6b3f12">${owned}</div>
        <button ${afford ? '' : 'disabled'} data-action="buy:${s.key}">购买</button></div>`;
    }).join('');
    this.showOverlay(`
      <div class="card">
        <h2>🛒 商店 · 即将进入第 ${nextLv} 关${this.save.perm.ball ? `（目标 $${nextTarget}）` : ''}</h2>
        <p>持有金币：<b style="color:#a2740b">$${this.money}</b>${this.save.perm.ball ? '' : ' · 水晶球可预告目标'}</p>
        <div class="shop-grid">${rows}</div>
        <button class="btn" data-action="start">开始第 ${nextLv} 关 →</button>
      </div>`);
  }
}
