import * as THREE from 'three';

// 角度转弧度
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

// 弧度转角度
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

// 限制值在范围内
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 线性插值
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// 平滑插值
export function smoothstep(start, end, t) {
  t = clamp((t - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

// 创建简单的纹理
export function createSimpleTexture(color, width = 64, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return new THREE.CanvasTexture(canvas);
}

// 创建棋盘格纹理
export function createCheckerTexture(color1, color2, size = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = size * 8;
  canvas.height = size * 8;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? color1 : color2;
      ctx.fillRect(i * size, j * size, size, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
