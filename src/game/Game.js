import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Car } from './Car.js';
import { CameraController } from './Camera.js';
import { Examiner } from './Examiner.js';
import { Environment } from '../scenes/Environment.js';
import { ReverseParking } from '../scenes/ReverseParking.js';
import { ParallelParking } from '../scenes/ParallelParking.js';
import { CurveDriving } from '../scenes/CurveDriving.js';
import { EngineSound } from '../audio/EngineSound.js';
import { Menu } from '../ui/Menu.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor() {
    this.scene = null;
    this.renderer = null;
    this.world = null;
    this.car = null;
    this.cameraController = null;
    this.examiner = null;
    this.environment = null;
    this.engineSound = null;
    this.menu = null;
    this.hud = null;

    this.currentScene = null;
    this.scenes = {};

    this.isPlaying = false;

    // 结果音效
    this.successSound = new Audio('/success.mp3');
    this.failSound = new Audio('/fail.mp3');
    this.clock = new THREE.Clock();

    // 触屏控制状态
    this.touchControlsEnabled = false;
    this.touchGearReverse = false;
    this.steeringAngle = 0;
  }

  async init() {
    // 创建 Three.js 场景
    this.scene = new THREE.Scene();

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // 创建物理世界
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // 设置默认接触材质 - 降低摩擦力让车辆能够移动
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.1;

    // 创建环境
    this.environment = new Environment(this.scene, this.world);
    await this.environment.init();

    // 创建车辆
    this.car = new Car(this.scene, this.world);
    await this.car.init();

    // 创建相机控制器
    this.cameraController = new CameraController(this.car);

    // 创建考官
    this.examiner = new Examiner(this.scene);
    await this.examiner.init();

    // 创建音效系统
    this.engineSound = new EngineSound();
    await this.engineSound.init();

    // 创建场景
    this.scenes.reverse = new ReverseParking(this.scene, this.world);
    this.scenes.parallel = new ParallelParking(this.scene, this.world);
    this.scenes.curve = new CurveDriving(this.scene, this.world);

    // 初始化所有场景
    for (const scene of Object.values(this.scenes)) {
      await scene.init();
      scene.hide();
    }

    // 创建 UI
    this.menu = new Menu(this);
    this.hud = new HUD(this);

    // 设置事件监听
    this.setupEventListeners();

    // 设置触屏控制
    this.setupTouchControls();

    // 隐藏加载界面，显示菜单
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');

    // 触发彩带效果
    if (typeof window.createConfetti === 'function') {
      setTimeout(() => window.createConfetti(), 100);
    }

    // 开始渲染循环
    this.animate();
  }

  setupEventListeners() {
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.cameraController.camera.aspect = window.innerWidth / window.innerHeight;
      this.cameraController.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 键盘输入
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  setupTouchControls() {
    const touchControls = document.getElementById('touch-controls');
    const gamepadToggle = document.getElementById('gamepad-toggle');
    const steerLeft = document.getElementById('steer-left');
    const steerRight = document.getElementById('steer-right');
    const steeringButtons = document.getElementById('steering-buttons');
    const pedalThrottle = document.getElementById('pedal-throttle');
    const pedalBrake = document.getElementById('pedal-brake');
    const gearToggle = document.getElementById('gear-toggle');
    const pedalsArea = document.getElementById('pedals-area');
    const touchView = document.getElementById('touch-view');
    const touchReset = document.getElementById('touch-reset');
    const hud = document.getElementById('hud');

    // 自动检测触屏设备
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.enableTouchControls();
    }

    // 手柄图标切换
    gamepadToggle?.addEventListener('click', () => {
      if (this.touchControlsEnabled) {
        this.disableTouchControls();
      } else {
        this.enableTouchControls();
      }
    });

    // 左转按键
    steerLeft?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      steerLeft.classList.add('active');
      steeringButtons?.classList.add('touching');
      if (this.isPlaying) {
        this.car.setSteering(1);
      }
    });

    steerLeft?.addEventListener('touchend', () => {
      steerLeft.classList.remove('active');
      steeringButtons?.classList.remove('touching');
      if (this.isPlaying) {
        this.car.setSteering(0);
      }
    });

    // 右转按键
    steerRight?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      steerRight.classList.add('active');
      steeringButtons?.classList.add('touching');
      if (this.isPlaying) {
        this.car.setSteering(-1);
      }
    });

    steerRight?.addEventListener('touchend', () => {
      steerRight.classList.remove('active');
      steeringButtons?.classList.remove('touching');
      if (this.isPlaying) {
        this.car.setSteering(0);
      }
    });

    // 油门踏板
    pedalThrottle?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      pedalThrottle.classList.add('active');
      pedalsArea?.classList.add('touching');
      if (this.isPlaying) {
        const throttleValue = this.touchGearReverse ? -1 : 1;
        this.car.setThrottle(throttleValue);
      }
    });

    pedalThrottle?.addEventListener('touchend', () => {
      pedalThrottle.classList.remove('active');
      pedalsArea?.classList.remove('touching');
      if (this.isPlaying) {
        this.car.setThrottle(0);
      }
    });

    // 刹车踏板
    pedalBrake?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      pedalBrake.classList.add('active');
      pedalsArea?.classList.add('touching');
      if (this.isPlaying) {
        this.car.setBrake(true);
      }
    });

    pedalBrake?.addEventListener('touchend', () => {
      pedalBrake.classList.remove('active');
      pedalsArea?.classList.remove('touching');
      if (this.isPlaying) {
        this.car.setBrake(false);
      }
    });

    // 档位切换
    gearToggle?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      gearToggle.classList.add('touching');
      this.touchGearReverse = !this.touchGearReverse;
      this.updateGearDisplay();
    });

    gearToggle?.addEventListener('touchend', () => {
      gearToggle.classList.remove('touching');
    });

    // 切换视角按钮
    touchView?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.isPlaying) {
        this.cameraController.toggleView();
      }
    });

    // 重置按钮
    touchReset?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.isPlaying && this.currentScene) {
        const startPos = this.currentScene.getStartPosition();
        this.car.reset(startPos.position, startPos.rotation);
      }
    });
  }

  enableTouchControls() {
    this.touchControlsEnabled = true;
    document.getElementById('touch-controls')?.classList.add('active');
    document.getElementById('gamepad-toggle')?.classList.add('active');
    document.getElementById('hud')?.classList.add('touch-mode');
    document.querySelector('.controls-hint')?.style.setProperty('display', 'none');
  }

  disableTouchControls() {
    this.touchControlsEnabled = false;
    document.getElementById('touch-controls')?.classList.remove('active');
    document.getElementById('gamepad-toggle')?.classList.remove('active');
    document.getElementById('hud')?.classList.remove('touch-mode');
    document.querySelector('.controls-hint')?.style.setProperty('display', '');
  }

  updateGearDisplay() {
    const gearForward = document.getElementById('gear-forward');
    const gearReverse = document.getElementById('gear-reverse');

    if (this.touchGearReverse) {
      gearForward?.classList.remove('forward');
      gearForward?.classList.add('inactive');
      gearReverse?.classList.remove('inactive');
      gearReverse?.classList.add('reverse');
    } else {
      gearForward?.classList.remove('inactive');
      gearForward?.classList.add('forward');
      gearReverse?.classList.remove('reverse');
      gearReverse?.classList.add('inactive');
    }
  }

  handleKeyDown(e) {
    if (!this.isPlaying) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.car.setThrottle(1);
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.car.setThrottle(-1);
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.car.setSteering(1);
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.car.setSteering(-1);
        break;
      case 'Space':
        this.car.setBrake(true);
        e.preventDefault();
        break;
      case 'KeyV':
        this.cameraController.toggleView();
        break;
    }
  }

  handleKeyUp(e) {
    if (!this.isPlaying) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
      case 'KeyS':
      case 'ArrowDown':
        this.car.setThrottle(0);
        break;
      case 'KeyA':
      case 'ArrowLeft':
      case 'KeyD':
      case 'ArrowRight':
        this.car.setSteering(0);
        break;
      case 'Space':
        this.car.setBrake(false);
        break;
    }
  }

  startScene(sceneName) {
    // 隐藏当前场景
    if (this.currentScene) {
      this.currentScene.hide();
    }

    // 显示新场景
    this.currentScene = this.scenes[sceneName];
    this.currentScene.show();

    // 重置车辆位置
    const startPos = this.currentScene.getStartPosition();
    this.car.reset(startPos.position, startPos.rotation);

    // 设置考官位置
    const examinerPos = this.currentScene.getExaminerPosition();
    this.examiner.setPosition(examinerPos);
    this.examiner.playIdle();

    // 设置场景回调
    this.currentScene.onSuccess = () => this.onSceneSuccess();
    this.currentScene.onFail = (message) => this.onSceneFail(message);

    // 更新 UI
    this.menu.hide();
    this.hud.show();
    this.hud.setSceneTitle(this.currentScene.title);

    // 开始游戏
    this.isPlaying = true;
    this.engineSound.start();
  }

  stopScene() {
    this.isPlaying = false;
    this.engineSound.stop();
    this.stopResultSounds();

    if (this.currentScene) {
      this.currentScene.hide();
      this.currentScene = null;
    }

    this.hud.hide();
    this.menu.show();
  }

  stopResultSounds() {
    this.successSound.pause();
    this.successSound.currentTime = 0;
    this.failSound.pause();
    this.failSound.currentTime = 0;
  }

  onSceneSuccess() {
    this.isPlaying = false;
    this.examiner.playSuccess();
    this.successSound.currentTime = 0;
    this.successSound.play();
    this.hud.showResult(true, '考试通过！', '恭喜你完成了' + this.currentScene.title + '！');
  }

  onSceneFail(message) {
    this.isPlaying = false;
    this.examiner.playFail();
    this.failSound.currentTime = 0;
    this.failSound.play();
    this.hud.showResult(false, '考试失败', message || '请重新练习');
  }

  retryScene() {
    if (this.currentScene) {
      this.stopResultSounds();
      const sceneName = Object.keys(this.scenes).find(
        key => this.scenes[key] === this.currentScene
      );
      this.hud.hideResult();
      this.startScene(sceneName);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.isPlaying) {
      // 更新物理世界
      this.world.step(1 / 60, delta, 3);

      // 更新车辆
      this.car.update(delta);

      // 更新相机
      this.cameraController.update(delta);

      // 更新音效
      this.engineSound.update(this.car.throttleInput, this.car.speed);

      // 更新 HUD
      this.hud.update(this.car.speed, this.car.gear);

      // 检测场景状态
      if (this.currentScene) {
        this.currentScene.checkStatus(this.car);
      }
    }

    // 更新考官动画
    this.examiner.update(delta);

    // 更新环境动画
    this.environment.update(delta);

    // 渲染
    this.renderer.render(this.scene, this.cameraController.camera);
  }
}
