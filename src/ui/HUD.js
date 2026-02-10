export class HUD {
  constructor(game) {
    this.game = game;
    this.element = document.getElementById('hud');
    this.speedValue = document.getElementById('speed-value');
    this.gearDisplay = document.getElementById('gear-display');
    this.sceneTitle = document.getElementById('scene-title');
    this.resultModal = document.getElementById('result-modal');
    this.resultContent = document.getElementById('result-content');
    this.resultTitle = document.getElementById('result-title');
    this.resultMessage = document.getElementById('result-message');

    this.setupEventListeners();
  }

  setupEventListeners() {
    // 返回菜单按钮
    document.getElementById('back-to-menu').addEventListener('click', () => {
      this.game.stopScene();
    });

    // 重试按钮
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.game.retryScene();
    });

    // 返回菜单按钮（结果弹窗）
    document.getElementById('menu-btn').addEventListener('click', () => {
      this.hideResult();
      this.game.stopScene();
    });
  }

  show() {
    this.element.classList.add('active');
  }

  hide() {
    this.element.classList.remove('active');
  }

  setSceneTitle(title) {
    this.sceneTitle.textContent = title;
  }

  update(speed, gear) {
    // 更新速度显示（转换为 km/h）
    const kmh = Math.abs(Math.round(speed * 3.6));
    this.speedValue.textContent = kmh;

    // 更新档位显示
    const gearText = {
      'P': 'P 驻车',
      'N': 'N 空挡',
      'D': 'D 前进',
      'R': 'R 倒车'
    };
    this.gearDisplay.textContent = gearText[gear] || gear + ' 档';
  }

  showResult(success, title, message) {
    this.resultContent.className = 'result-content ' + (success ? 'success' : 'fail');
    this.resultTitle.textContent = title;
    this.resultMessage.textContent = message;
    this.resultModal.classList.add('active');
  }

  hideResult() {
    this.resultModal.classList.remove('active');
  }
}
