import { Game } from './game/game';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const game = new Game(canvas);
(window as any).game = game;

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
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    game.press();
  } else if (e.key.toLowerCase() === 'm') {
    game.toggleMute();
  }
});
