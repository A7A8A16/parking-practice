import { Game } from './game/Game.js';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
