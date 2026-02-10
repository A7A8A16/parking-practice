export class Menu {
  constructor(game) {
    this.game = game;
    this.element = document.getElementById('menu');
    this.setupEventListeners();
  }

  setupEventListeners() {
    const buttons = this.element.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const scene = btn.dataset.scene;
        if (scene) {
          this.game.startScene(scene);
        }
      });
    });
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
