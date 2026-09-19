import { ANCHOR, view } from './game/constants';
import { Game } from './game/game';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const wrap = document.getElementById('wrap')!;
const game = new Game(canvas);
(window as any).game = game;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  view.W = vw < vh ? 640 : 960;
  view.H = Math.max(540, Math.min(1600, Math.round((view.W * vh) / vw)));
  ANCHOR.x = view.W / 2;
  canvas.width = view.W;
  canvas.height = view.H;
  const scale = Math.min(vw / view.W, vh / view.H);
  wrap.style.width = `${view.W * scale}px`;
  wrap.style.height = `${view.H * scale}px`;
  game.onResize();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();

function frame(now: number) {
  requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  game.render();
}
requestAnimationFrame(frame);

canvas.addEventListener('pointerdown', () => game.press());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    game.press();
  } else if (e.key.toLowerCase() === 'm') {
    game.toggleMute();
  }
});
