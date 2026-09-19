export class AudioEngine {
  private ctx: AudioContext | null = null;
  muted = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmNext = 0;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
    glideTo?: number
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq = 1200, delay = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    const t0 = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  shoot() {
    this.noise(0.35, 0.25, 2600);
  }

  hit() {
    this.tone(880, 0.09, 'square', 0.18);
    this.tone(1320, 0.07, 'square', 0.12, 0.02);
  }

  coin(value: number) {
    const base = value > 300 ? 1046 : 880;
    this.tone(base, 0.1, 'triangle', 0.3);
    this.tone(base * 1.26, 0.1, 'triangle', 0.28, 0.08);
    this.tone(base * 1.5, 0.16, 'triangle', 0.28, 0.16);
    this.tone(base * 2, 0.2, 'triangle', 0.2, 0.24);
  }

  rock() {
    this.tone(130, 0.22, 'sine', 0.35, 0, 70);
    this.noise(0.18, 0.15, 300);
  }

  explode() {
    this.noise(0.6, 0.5, 900);
    this.tone(90, 0.5, 'sine', 0.4, 0, 35);
  }

  tick() {
    this.tone(1250, 0.05, 'square', 0.12);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.3, i * 0.12));
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.15, i * 0.16));
  }

  click() {
    this.tone(660, 0.06, 'square', 0.12);
  }

  startBgm() {
    if (this.bgmTimer !== null) return;
    const ctx = this.ensure();
    this.bgmNext = ctx.currentTime + 0.1;
    this.bgmStep = 0;
    this.bgmTimer = window.setInterval(() => this.bgmTick(), 120);
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private bgmTick() {
    if (!this.ctx) return;
    const melody = [
      392, 0, 494, 587, 494, 0, 392, 0, 440, 0, 523, 0, 440, 392, 330, 0,
      392, 0, 494, 587, 659, 0, 587, 0, 523, 0, 440, 0, 392, 0, 0, 0,
    ];
    while (this.bgmNext < this.ctx.currentTime + 0.3) {
      const f = melody[this.bgmStep % melody.length];
      if (f && !this.muted) {
        this.tone(f, 0.2, 'triangle', 0.06);
        if (this.bgmStep % 4 === 0) this.tone(f / 2, 0.34, 'sine', 0.05);
      }
      this.bgmNext += 0.24;
      this.bgmStep++;
    }
  }
}
