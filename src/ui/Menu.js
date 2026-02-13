export class Menu {
  constructor(game) {
    this.game = game;
    this.element = document.getElementById('menu');
    this.bgm = document.getElementById('menu-bgm');
    this.bgmVolume = 0.3; // 背景音乐音量
    this.isFadingOut = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const buttons = this.element.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const scene = btn.dataset.scene;
        if (scene) {
          this.fadeOutBgm(); // 开始游戏时淡出音乐
          this.game.startScene(scene);
        }
      });
    });
  }

  show() {
    this.element.classList.remove('hidden');
    // 触发彩带效果
    if (typeof window.createConfetti === 'function') {
      setTimeout(() => window.createConfetti(), 100);
    }
    // 播放背景音乐
    this.playBgm();
  }

  hide() {
    this.element.classList.add('hidden');
  }

  playBgm() {
    if (!this.bgm) {
      console.error('❌ 背景音乐元素未找到');
      return;
    }

    if (this.isFadingOut) {
      console.log('⏸️ 音乐正在淡出中，跳过播放');
      return;
    }

    this.bgm.volume = this.bgmVolume;
    console.log('🎵 尝试播放背景音乐，音量:', this.bgmVolume);

    // 尝试播放，如果失败（自动播放策略限制），则等待用户交互
    const playPromise = this.bgm.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ 背景音乐开始播放');
        })
        .catch(error => {
          console.warn('⚠️ 背景音乐自动播放被阻止:', error.message);
          console.log('💡 等待用户点击任意位置后播放...');
          // 添加一次性点击监听来启动音乐
          const startBgm = () => {
            this.bgm.play()
              .then(() => console.log('✅ 用户交互后，背景音乐开始播放'))
              .catch(err => console.error('❌ 播放失败:', err));
            document.removeEventListener('click', startBgm);
          };
          document.addEventListener('click', startBgm);
        });
    }
  }

  fadeOutBgm() {
    if (!this.bgm || this.isFadingOut) return;

    this.isFadingOut = true;
    const fadeOutDuration = 1000; // 1秒淡出
    const startVolume = this.bgm.volume;
    const startTime = Date.now();

    const fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);

      // 线性淡出
      this.bgm.volume = startVolume * (1 - progress);

      if (progress >= 1) {
        clearInterval(fadeInterval);
        this.bgm.pause();
        this.bgm.currentTime = 0;
        this.bgm.volume = this.bgmVolume; // 重置音量
        this.isFadingOut = false;
      }
    }, 20);
  }
}
