export class EngineSound {
  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.noiseNode = null;
    this.noiseGain = null;
    this.isPlaying = false;

    // 音效参数
    this.baseFrequency = 80;
    this.maxFrequency = 200;
    this.baseVolume = 0.1;
    this.maxVolume = 0.3;
  }

  async init() {
    // Web Audio API 需要用户交互后才能启动
    // 我们在 start() 中初始化
  }

  createNoiseBuffer() {
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  start() {
    if (this.isPlaying) return;

    try {
      // 创建音频上下文
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // 创建主振荡器（引擎基础音）
      this.oscillator = this.audioContext.createOscillator();
      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.value = this.baseFrequency;

      // 创建增益节点
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.baseVolume;

      // 创建低通滤波器（让声音更柔和）
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      // 创建噪音（模拟引擎杂音）
      this.noiseNode = this.audioContext.createBufferSource();
      this.noiseNode.buffer = this.createNoiseBuffer();
      this.noiseNode.loop = true;

      this.noiseGain = this.audioContext.createGain();
      this.noiseGain.gain.value = 0.02;

      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 200;
      noiseFilter.Q.value = 1;

      // 连接节点
      this.oscillator.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.noiseNode.connect(noiseFilter);
      noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.audioContext.destination);

      // 启动
      this.oscillator.start();
      this.noiseNode.start();

      this.isPlaying = true;
    } catch (e) {
      console.warn('无法启动音效系统:', e);
    }
  }

  stop() {
    if (!this.isPlaying) return;

    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
      }
      if (this.noiseNode) {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
    } catch (e) {
      console.warn('停止音效时出错:', e);
    }

    this.isPlaying = false;
    this.oscillator = null;
    this.noiseNode = null;
    this.audioContext = null;
  }

  update(throttle, speed) {
    if (!this.isPlaying || !this.oscillator) return;

    // 根据油门和速度调整频率
    const throttleInfluence = Math.abs(throttle) * 0.6;
    const speedInfluence = Math.abs(speed) / 5 * 0.4;
    const totalInfluence = throttleInfluence + speedInfluence;

    const targetFrequency = this.baseFrequency +
      (this.maxFrequency - this.baseFrequency) * totalInfluence;

    // 平滑过渡频率
    this.oscillator.frequency.linearRampToValueAtTime(
      targetFrequency,
      this.audioContext.currentTime + 0.1
    );

    // 根据油门调整音量
    const targetVolume = this.baseVolume +
      (this.maxVolume - this.baseVolume) * Math.abs(throttle);

    this.gainNode.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + 0.1
    );

    // 调整噪音
    const noiseVolume = 0.02 + Math.abs(throttle) * 0.03;
    this.noiseGain.gain.linearRampToValueAtTime(
      noiseVolume,
      this.audioContext.currentTime + 0.1
    );
  }
}
