import { AudioEngine } from './audio';
import {
  cloudDownload,
  cloudUpload,
  DEFAULT_NICK,
  displayNick,
  fetchLeaderboard,
  formatWhen,
  NICK_MAX,
  nickname,
  playerId,
  setNickname,
  submitScore,
} from './cloud';
import {
  ANCHOR,
  BONUS_TIME,
  HIT_RADIUS,
  LEVEL_TIME,
  ROPE_MIN,
  bonusGoalFor,
  isBonusLevel,
  itemArea,
  levelTarget,
  targetFor,
  view,
} from './constants';
import { generateLevel, spawnVein } from './generation';
import { Hook } from './hook';
import { Particles } from './particles';
import {
  drawBackground,
  drawMiner,
  drawRopeAndHook,
  drawTreasure,
} from './render';
import { SaveData, clearProgress, loadSave, writeSave } from './save';
import { RAT_REWARDS, Treasure, TreasureKind } from './types';

type State = 'menu' | 'playing' | 'result' | 'shop';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

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

const MAX_CARRY = 5;
/** 收线途中顺路带走轻质宝物上限 */
const CHAIN_MAX_WEIGHT = 2.5;
/** 钩上串着东西时粘取半径更宽（一大束在土里拖，会带出旁边的小宝物） */
const CHAIN_RADIUS = 22;
const MAGNET_RADIUS = 150;
const RAT_SPEED = 70;

const comboGroup = (kind: TreasureKind): string =>
  kind.startsWith('gold') || kind === 'nugget'
    ? 'gold'
    : kind === 'diamond' || kind === 'bone'
      ? 'gem'
      : kind.startsWith('rock')
        ? 'rock'
        : kind;

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
  private combo = 0;
  private comboGroupKey: string | null = null;
  private comboTimer = 0;
  private doubleTimer = 0;
  private banner = '';
  private bannerTimer = 0;
  private bonusPay = 0;

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
    if (this.doubleTimer > 0) this.doubleTimer = Math.max(0, this.doubleTimer - dt);
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.combo = 0;
    }
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endLevel();
      return;
    }

    this.moveRats(dt);
    const evt = this.hook.update(dt);
    this.layoutCarry();

    if (this.hook.phase === 'extend' || this.hook.phase === 'retract') this.checkHits();
    if (this.hook.attached?.kind === 'tnt' && this.hook.phase === 'retract') this.updateTnt(dt);
    if (evt === 'release') {
      if (this.hook.carry.length) this.collectAll(this.hook.carry);
      else this.combo = 0;
      this.hook.carry = [];
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0)
      ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);
    ctx.clearRect(-20, -20, view.W + 40, view.H + 40);
    drawBackground(ctx);
    for (const t of this.items) if (!t.taken) drawTreasure(ctx, t, this.save.perm.compass);
    drawRopeAndHook(ctx, this.hook);
    const swing = Math.sin(performance.now() / 130) * 0.05;
    for (const t of this.hook.carry) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(swing);
      ctx.translate(-t.x, -t.y);
      drawTreasure(ctx, t, false);
      ctx.restore();
    }
    drawMiner(ctx, this.hook);
    this.particles.draw(ctx);
    ctx.restore();
    if (this.state === 'playing' || this.state === 'result') this.drawHud(ctx);
  }

  private moveRats(dt: number) {
    for (const t of this.items) {
      if (t.taken || t.kind !== 'rat') continue;
      const x0 = t.x0 ?? t.x;
      const x1 = t.x1 ?? t.x;
      t.vx ??= 1;
      t.x += t.vx * RAT_SPEED * dt;
      if (t.x <= x0) {
        t.x = x0;
        t.vx = 1;
      } else if (t.x >= x1) {
        t.x = x1;
        t.vx = -1;
      }
    }
  }

  /** 钩上的物品沿绳索依次排开，形成「一串」的视觉效果 */
  private layoutCarry() {
    const h = this.hook;
    if (!h.carry.length) return;
    let back = 0;
    for (const t of h.carry) {
      const d = Math.max(ROPE_MIN - 6, h.len - back);
      t.x = ANCHOR.x + h.dirX * d;
      t.y = ANCHOR.y + h.dirY * d;
      back += Math.max(12, t.r * 0.9);
    }
  }

  private checkHits() {
    const h = this.hook;
    const tx = h.tipX();
    const ty = h.tipY();
    for (const t of this.items) {
      if (t.taken) continue;
      const reach = t.r + (h.carry.length ? CHAIN_RADIUS : HIT_RADIUS);
      if (Math.hypot(t.x - tx, t.y - ty) > reach) continue;
      if (h.carry.length) {
        // 连抓：挂着的那一串会刮走两侧轻质宝物；重物与 TNT 不粘钩，直接跳过继续找
        if (h.carry.length >= MAX_CARRY) return;
        if (t.weight > CHAIN_MAX_WEIGHT || t.kind === 'tnt') continue;
      }
      t.taken = true;
      t.ox = t.x;
      t.oy = t.y;
      h.grab(t);
      this.audio.hit();
      if (t.kind === 'magnet') this.magnetSuck(t);
      return;
    }
  }

  /** 磁铁：把附近宝物直接吸上钩 */
  private magnetSuck(src: Treasure) {
    let n = 0;
    for (const other of this.items) {
      if (other.taken || other.kind === 'tnt' || other.kind.startsWith('rock')) continue;
      if (Math.hypot(other.x - src.x, other.y - src.y) > MAGNET_RADIUS) continue;
      if (this.hook.carry.length >= MAX_CARRY) break;
      other.taken = true;
      this.hook.carry.push(other);
      this.particles.burst(other.x, other.y, '#8ec8ff', 6, 90);
      n++;
    }
    if (n) {
      this.particles.floatText(src.x, src.y - 28, `🧲 吸走 ${n} 件!`, '#8ec8ff');
      this.particles.burst(src.x, src.y, '#8ec8ff', 14, 160);
    }
  }

  private updateTnt(dt: number) {
    this.hook.fuse -= dt;
    if (this.hook.fuse > 0) return;
    const x = this.hook.tipX();
    const y = this.hook.tipY();
    for (const t of this.hook.carry) {
      t.value = 0;
      this.particles.floatText(t.x, t.y, '报废…', '#ff9d9d');
    }
    this.hook.carry = [];
    this.hook.fuse = -1;
    this.audio.explode();
    this.shake = 1;
    this.particles.burst(x, y, '#ff8c2e', 26, 260, 6);
    this.particles.burst(x, y, '#5a5a5a', 18, 150, 8);
    for (const other of this.items) {
      if (other.taken) continue;
      if (Math.hypot(other.x - x, other.y - y) < 95) {
        other.taken = true;
        if (other.value > 0) this.particles.floatText(other.x, other.y, '报废…', '#ff9d9d');
      }
    }
    this.particles.floatText(x, y - 24, 'BOOM!', '#ff5c5c');
    this.combo = 0;
  }

  /** 连击倍率：连续同类收获递增 */
  private comboMul(): number {
    return this.combo >= 3 ? Math.min(3, 1 + 0.25 * (this.combo - 2)) : 1;
  }

  private bumpCombo(t: Treasure) {
    const g = comboGroup(t.kind);
    this.combo = g === this.comboGroupKey ? this.combo + 1 : 1;
    this.comboGroupKey = g;
    this.comboTimer = 6;
    if (this.combo >= 3) {
      const mul = this.comboMul();
      this.particles.floatText(
        this.hook.tipX(),
        this.hook.tipY() - 30,
        `连击 ×${this.combo} · 金额 ×${mul.toFixed(2)}`,
        '#ff9dff'
      );
    }
  }

  private collectAll(carry: Treasure[]) {
    for (const t of carry) this.collect(t);
  }

  private collect(t: Treasure) {
    this.bumpCombo(t);
    const mul = this.comboMul() * (this.doubleTimer > 0 ? 2 : 1);
    const label = this.doubleTimer > 0 && this.combo < 3 ? ' ×2' : '';

    switch (t.kind) {
      case 'tnt':
        this.particles.floatText(ANCHOR.x + 60, ANCHOR.y + 20, '拆除成功!', '#9dff8c');
        return;
      case 'rat': {
        const prize = RAT_REWARDS[Math.floor(Math.random() * RAT_REWARDS.length)];
        this.addMoney(prize * mul, '#b6ff8c', `🐀 老鼠赏金 +$${Math.round(prize * mul)}`);
        this.audio.coin(prize);
        this.showBanner(`🐀 抓到矿工鼠！赏金 $${prize}${mul > 1 ? '（加成后更多）' : ''}`);
        return;
      }
      case 'magnet':
        this.showBanner('🧲 磁铁把附近的宝物一起吸上钩了');
        return;
      case 'bag':
        this.addMoney(t.value * mul, '#ffd23e', '+$' + Math.round(t.value * mul));
        this.audio.coin(t.value);
        this.bagReward(t);
        return;
      case 'rock_s':
      case 'rock_l':
        this.audio.rock();
        this.addMoney(t.value * mul, '#c8c8c8', '+$' + Math.round(t.value * mul));
        return;
      default:
        this.audio.coin(t.value);
        this.addMoney(t.value * mul, '#ffd23e', '+$' + Math.round(t.value * mul) + label);
        this.particles.burst(ANCHOR.x + 60, ANCHOR.y + 30, '#ffd23e', 10, 120);
    }
  }

  private addMoney(amount: number, color: string, text: string) {
    const v = Math.round(amount);
    this.money += v;
    this.save.money = this.money;
    writeSave(this.save);
    this.particles.floatText(ANCHOR.x + 60, ANCHOR.y + 20, text, color);
  }

  /** 幸运钱袋：随机开出时间 / 双倍财富 / 金矿脉 */
  private bagReward(t: Treasure) {
    const roll = Math.random();
    if (roll < 0.3) {
      this.timeLeft += 10;
      this.levelTime = Math.max(this.levelTime, this.timeLeft);
      this.showBanner('💰 钱袋里是怀表：+10 秒！');
      this.particles.floatText(t.x, t.y - 20, '+10s', '#9dff8c');
    } else if (roll < 0.6) {
      this.doubleTimer = 20;
      this.showBanner('💰 钱袋里是双钞票：20 秒内金额翻倍！');
      this.particles.floatText(t.x, t.y - 20, '×2 财富', '#ff9dff');
    } else {
      const vein = spawnVein(t.ox ?? t.x, t.oy ?? t.y, this.items);
      this.items.push(...vein);
      this.showBanner(`💰 钱袋里是金矿脉图：散落 ${vein.length} 块金粒！`);
      for (const v of vein) this.particles.burst(v.x, v.y, '#ffd23e', 4, 70);
    }
  }

  private showBanner(text: string) {
    this.banner = text;
    this.bannerTimer = 2.6;
  }

  private endLevel() {
    this.audio.stopBgm();
    // 时间到也先把钩上的东西结算掉，避免最后一秒到手的宝物凭空消失
    if (this.hook.carry.length) {
      this.collectAll(this.hook.carry);
      this.hook.carry = [];
    }
    if (this.money >= this.target) {
      if (isBonusLevel(this.level)) {
        const bonus = 400 + 150 * this.level;
        this.money += bonus;
        this.save.money = this.money;
        this.bonusPay = bonus;
      }
      this.save.level = this.level + 1;
      if (this.save.level > this.save.high) {
        this.save.high = this.save.level;
      }
      writeSave(this.save);
      this.state = 'result';
      this.audio.win();
      submitScore(this.level, this.money, this.currentNick());
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
    this.target = levelTarget(lv, this.money);
    const bonus = isBonusLevel(lv);
    this.levelTime = (bonus ? BONUS_TIME : LEVEL_TIME) + 15 * this.save.pending.coffee;
    this.timeLeft = this.levelTime;
    this.hook.speedMul = Math.min(2.2, Math.pow(1.4, this.save.pending.speed));
    const tntCount = this.save.pending.tnt;
    this.save.pending = { coffee: 0, speed: 0, tnt: 0 };
    writeSave(this.save);
    this.combo = 0;
    this.comboGroupKey = null;
    this.comboTimer = 0;
    this.doubleTimer = 0;
    this.bannerTimer = 0;
    this.bonusPay = 0;
    this.lastSec = -1;
    this.items = generateLevel(lv, this.save.perm.clover ? 1 : 0);
    this.hook.reset();
    this.state = 'playing';
    this.hideOverlay();
    this.audio.ensure();
    if (!this.audio.muted) this.audio.startBgm();
    if (bonus)
      this.showBanner(`🎁 奖励关！${BONUS_TIME} 秒内再挖 $${bonusGoalFor(lv)}，过关有额外奖金`);
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
    ctx.roundRect(view.W - 290, 10, 276, 40, 10);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = this.money >= this.target ? '#7dff7d' : '#ffd23e';
    ctx.fillText(`$${this.money}`, 28, 40);
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `第 ${this.level} 关${isBonusLevel(this.level) ? ' · 🎁奖励关' : ''} · 目标 $${this.target}`,
      28,
      64
    );

    const barW = 250;
    const frac = Math.max(0, Math.min(1, this.timeLeft / this.levelTime));
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(view.W - 278, 22, barW, 16);
    ctx.fillStyle = frac < 0.17 ? '#ff5c5c' : '#ffb340';
    ctx.fillRect(view.W - 278, 22, barW * frac, 16);
    ctx.strokeStyle = '#1c1208';
    ctx.lineWidth = 2;
    ctx.strokeRect(view.W - 278, 22, barW, 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(`${Math.ceil(this.timeLeft)}s`, view.W - 20, 54);

    const badges: string[] = [];
    if (this.combo >= 2) badges.push(`🔥 连击 ×${this.combo}（金额 ×${this.comboMul().toFixed(2)}）`);
    if (this.doubleTimer > 0) badges.push(`✨ 双倍财富 ${Math.ceil(this.doubleTimer)}s`);
    if (this.hook.carry.length > 1) badges.push(`⚓ 一串 ${this.hook.carry.length} 件`);
    if (badges.length) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      let i = 0;
      for (const b of badges) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        const w = ctx.measureText(b).width + 16;
        ctx.beginPath();
        ctx.roundRect(14, 84 + i * 26, w, 22, 8);
        ctx.fill();
        ctx.fillStyle = i === 0 ? '#ff9dff' : i === 1 ? '#ffe98c' : '#9de1ff';
        ctx.fillText(b, 22, 100 + i * 26);
        i++;
      }
    }

    if (this.bannerTimer > 0 && this.banner) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      const alpha = Math.max(0, Math.min(1, this.bannerTimer / 0.6));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const w = ctx.measureText(this.banner).width + 40;
      ctx.beginPath();
      ctx.roundRect(view.W / 2 - w / 2, 96, w, 42, 12);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.fillText(this.banner, view.W / 2, 124);
      ctx.globalAlpha = 1;
    }
  }

  onResize() {
    const a = itemArea();
    for (const t of this.items) {
      if (t.taken) continue;
      t.x = Math.min(Math.max(t.x, a.x0 + t.r), a.x1 - t.r);
      t.y = Math.min(Math.max(t.y, a.y0 + t.r), a.y1 - t.r);
    }
  }

  private onOverlayClick(e: Event) {
    const el = (e.target as HTMLElement).closest('[data-action]');
    if (!el) return;
    const action = (el as HTMLElement).dataset.action!;
    this.audio.click();
    if (action === 'start') this.startLevel();
    else if (action === 'shop') this.showShop();
    else if (action === 'menu') this.showMenu();
    else if (action === 'mute') this.toggleMute();
    else if (action === 'board') this.showLeaderboard();
    else if (action === 'cloud-up') this.doCloudUpload();
    else if (action === 'cloud-down') this.doCloudDownload();
    else if (action.startsWith('buy:')) this.buy(SHOP.find((s) => s.key === action.slice(4))!);
  }

  private async doCloudUpload() {
    this.setStatus('上传中…');
    const nick = this.currentNick();
    this.save.nickname = nickname();
    const ok = await cloudUpload(this.save, nick);
    this.setStatus(ok ? '✅ 已上传到云端' : '❌ 上传失败，请检查网络');
  }

  private async doCloudDownload() {
    this.setStatus('读取中…');
    const d = await cloudDownload();
    if (!d) {
      this.setStatus('云端暂无存档');
      return;
    }
    this.save = d;
    writeSave(d);
    if (d.nickname) setNickname(d.nickname);
    this.showMenu('✅ 已恢复云端存档');
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

  private showMenu(msg = '') {
    this.state = 'menu';
    const cont = this.save.level > 1 ? `继续 · 第 ${this.save.level} 关` : '开始游戏';
    const nick = nickname();
    this.showOverlay(`
      <div class="card">
        <h1>⛏️ 黄金矿工</h1>
        <p>经典玩法复刻 · 点击/空格 放钩</p>
        <p class="tips">🧲 磁铁吸走一片 · 💰 钱袋开随机奖励 · 🐀 老鼠给赏金 · 🎁 每 3 关是奖励关<br>收线途中擦过轻质宝物可连抓，连续抓同类有连击加成</p>
        <p>最高纪录：${this.save.high ? `第 <b>${this.save.high}</b> 关` : '暂无'} · 存款 <b>$${this.save.money}</b></p>
        <button class="btn" data-action="start">${cont}</button>
        <p style="margin-top:12px"><input id="nick" class="nick" maxlength="${NICK_MAX}" placeholder="${DEFAULT_NICK}" value="${esc(nick)}" autocomplete="off"></p>
        <div class="cloud-row">
          <button class="btn small" data-action="cloud-up">☁️ 上传存档</button>
          <button class="btn small" data-action="cloud-down">☁️ 读取存档</button>
          <button class="btn small" data-action="board">🏆 排行榜</button>
        </div>
        <p id="cloud-status" class="cloud-status">${esc(msg)}</p>
        <div class="mute-row"><button class="btn small" data-action="mute">🔊 音效：${this.save.mute ? '关' : '开'}（M）</button></div>
      </div>`);
    this.bindNickInput();
  }

  /** 输入即存，避免用户没点任何按钮就直接开始游戏导致昵称丢失 */
  private bindNickInput() {
    const el = document.getElementById('nick') as HTMLInputElement | null;
    if (!el) return;
    const commit = () => this.saveNick(el.value);
    el.addEventListener('input', commit);
    el.addEventListener('change', commit);
    el.addEventListener('blur', commit);
    // 回车直接开局
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commit();
        this.audio.ensure();
        this.startLevel();
      }
    });
  }

  private saveNick(raw: string) {
    setNickname(raw);
    const v = nickname();
    if (this.save.nickname !== v) {
      this.save.nickname = v;
      writeSave(this.save);
    }
  }

  /** 提交/展示时统一取当前昵称，避免拿到空值或过期值 */
  private currentNick(): string {
    const el = document.getElementById('nick') as HTMLInputElement | null;
    if (el) this.saveNick(el.value);
    return displayNick(nickname());
  }

  private setStatus(text: string) {
    const el = document.getElementById('cloud-status');
    if (el) el.textContent = text;
  }

  private async showLeaderboard() {
    this.state = 'menu';
    const nick = this.currentNick();
    this.showOverlay('<div class="card"><h2>🏆 全球排行榜</h2><p>加载中…</p></div>');
    const list = await fetchLeaderboard();
    if (list === null) {
      this.showOverlay(
        '<div class="card"><h2>🏆 全球排行榜</h2><p>网络不可用</p><button class="btn" data-action="menu">返回</button></div>'
      );
      return;
    }
    const myId = playerId();
    const rows = list.length
      ? list
          .map((r, i) => {
            const name = displayNick(r.nickname || '');
            const me = !!r.playerId && r.playerId === myId;
            return `<tr class="${me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(name)}${
              me ? ' <span class="you">你</span>' : ''
            }</td><td>第 ${r.level} 关</td><td>$${r.money}</td><td class="when">${formatWhen(
              r.updatedAt
            )}</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="5">虚位以待</td></tr>';
    const onBoard = list.some((r) => !!r.playerId && r.playerId === myId);
    this.showOverlay(`
      <div class="card">
        <h2>🏆 全球排行榜（Top 20）</h2>
        <table class="board"><tr><th>#</th><th>矿工</th><th>到达</th><th>资产</th><th>时间</th></tr>${rows}</table>
        <p class="board-tip">你的名字：<b>${esc(nick)}</b>${
          onBoard
            ? ''
            : nick === DEFAULT_NICK
              ? '（回主页填写矿工名，过关后即可上榜）'
              : '（还没有上榜记录，过关后自动提交）'
        }</p>
        <button class="btn" data-action="menu">返回</button>
      </div>`);
  }

  private showResult(win: boolean) {
    const earned = this.money - this.startMoney - this.bonusPay;
    this.showOverlay(`
      <div class="card">
        <h2>${win ? isBonusLevel(this.level) ? '🎁 奖励关通关！' : '🎉 过关！' : '💥 时间到，未达标…'}</h2>
        <p>本关挖到 <b>$${earned}</b>${this.bonusPay ? ` · 奖励金 <b style="color:#1d8348">+$${this.bonusPay}</b>` : ''} · 总资产 <b>$${this.money}</b> / 目标 $${this.target}</p>
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
    const nextTarget = levelTarget(nextLv, this.money);
    const targetTip = this.save.perm.ball
      ? isBonusLevel(nextLv)
        ? `（本关目标再挖 $${bonusGoalFor(nextLv)}）`
        : `（目标 $${nextTarget}）`
      : '';
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
        <h2>🛒 商店 · 即将进入第 ${nextLv} 关${isBonusLevel(nextLv) ? ' 🎁奖励关' : ''}${targetTip}</h2>
        <p>持有金币：<b style="color:#a2740b">$${this.money}</b>${this.save.perm.ball ? '' : ' · 水晶球可预告目标'}</p>
        <div class="shop-grid">${rows}</div>
        <button class="btn" data-action="start">开始第 ${nextLv} 关 →</button>
      </div>`);
  }
}
