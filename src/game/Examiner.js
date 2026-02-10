import * as THREE from 'three';

export class Examiner {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.mixer = null;
    this.animations = {};
    this.currentAnimation = null;
  }

  async init() {
    // 创建简化的考官模型（使用基础几何体）
    const group = new THREE.Group();

    // 身体
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffd5b4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    // 帽子（考官帽）
    const hatGeometry = new THREE.CylinderGeometry(0.28, 0.3, 0.15, 8);
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x1a252f });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 2.0;
    hat.castShadow = true;
    group.add(hat);

    const hatBrimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.03, 8);
    const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial);
    hatBrim.position.y = 1.93;
    hatBrim.castShadow = true;
    group.add(hatBrim);

    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.4, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // 手臂
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });

    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(-0.45, 1.1, 0);
    this.leftArm.rotation.z = Math.PI / 8;
    this.leftArm.castShadow = true;
    group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(0.45, 1.1, 0);
    this.rightArm.rotation.z = -Math.PI / 8;
    this.rightArm.castShadow = true;
    group.add(this.rightArm);

    // 手
    const handGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffd5b4 });

    this.leftHand = new THREE.Mesh(handGeometry, handMaterial);
    this.leftHand.position.set(-0.55, 0.75, 0);
    group.add(this.leftHand);

    this.rightHand = new THREE.Mesh(handGeometry, handMaterial);
    this.rightHand.position.set(0.55, 0.75, 0);
    group.add(this.rightHand);

    // 剪贴板
    const clipboardGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.03);
    const clipboardMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.clipboard = new THREE.Mesh(clipboardGeometry, clipboardMaterial);
    this.clipboard.position.set(-0.4, 0.9, 0.25);
    this.clipboard.rotation.x = -Math.PI / 6;
    group.add(this.clipboard);

    this.mesh = group;
    this.mesh.position.set(8, 0, 0);
    this.scene.add(this.mesh);

    // 动画状态
    this.animationState = 'idle';
    this.animationTime = 0;
    this.jumpPhase = 0;
  }

  setPosition(position) {
    this.mesh.position.set(position.x, position.y, position.z);
    // 让考官面向场地中心
    this.mesh.lookAt(0, 0, 0);
  }

  playIdle() {
    this.animationState = 'idle';
    this.animationTime = 0;
  }

  playSuccess() {
    this.animationState = 'success';
    this.animationTime = 0;
  }

  playFail() {
    this.animationState = 'fail';
    this.animationTime = 0;
    this.jumpPhase = 0;
  }

  update(delta) {
    this.animationTime += delta;

    switch (this.animationState) {
      case 'idle':
        this.updateIdleAnimation();
        break;
      case 'success':
        this.updateSuccessAnimation();
        break;
      case 'fail':
        this.updateFailAnimation();
        break;
    }
  }

  updateIdleAnimation() {
    // 轻微的呼吸动画
    const breathe = Math.sin(this.animationTime * 2) * 0.02;
    this.mesh.children[0].scale.y = 1 + breathe;
  }

  updateSuccessAnimation() {
    // 鼓掌动画
    const clapSpeed = 8;
    const clapAngle = Math.sin(this.animationTime * clapSpeed) * 0.3;

    // 举起手臂
    this.leftArm.rotation.z = Math.PI / 2 + clapAngle;
    this.leftArm.rotation.x = -Math.PI / 4;
    this.leftArm.position.y = 1.4;
    this.leftArm.position.x = -0.3;

    this.rightArm.rotation.z = -Math.PI / 2 - clapAngle;
    this.rightArm.rotation.x = -Math.PI / 4;
    this.rightArm.position.y = 1.4;
    this.rightArm.position.x = 0.3;

    // 手的位置
    this.leftHand.position.set(-0.1 - clapAngle * 0.2, 1.5, 0.3);
    this.rightHand.position.set(0.1 + clapAngle * 0.2, 1.5, 0.3);

    // 隐藏剪贴板
    this.clipboard.visible = false;

    // 轻微点头
    const nod = Math.sin(this.animationTime * 4) * 0.1;
    this.mesh.children[1].rotation.x = nod;
  }

  updateFailAnimation() {
    // 暴跳如雷动画
    const jumpHeight = Math.abs(Math.sin(this.animationTime * 10)) * 0.3;
    this.mesh.position.y = jumpHeight;

    // 挥舞手臂
    const armWave = Math.sin(this.animationTime * 12) * 0.5;

    this.leftArm.rotation.z = Math.PI / 4 + armWave;
    this.leftArm.rotation.x = Math.sin(this.animationTime * 8) * 0.3;
    this.leftArm.position.y = 1.2;

    this.rightArm.rotation.z = -Math.PI / 4 - armWave;
    this.rightArm.rotation.x = Math.sin(this.animationTime * 8 + Math.PI) * 0.3;
    this.rightArm.position.y = 1.2;

    // 手的位置跟随手臂
    this.leftHand.position.set(
      -0.5 + armWave * 0.2,
      0.9 + Math.abs(armWave) * 0.3,
      Math.sin(this.animationTime * 8) * 0.2
    );
    this.rightHand.position.set(
      0.5 - armWave * 0.2,
      0.9 + Math.abs(armWave) * 0.3,
      Math.sin(this.animationTime * 8 + Math.PI) * 0.2
    );

    // 摇头
    const headShake = Math.sin(this.animationTime * 15) * 0.2;
    this.mesh.children[1].rotation.y = headShake;

    // 隐藏剪贴板（扔掉了）
    this.clipboard.visible = false;
  }

  resetPose() {
    // 重置到默认姿势
    this.leftArm.rotation.set(0, 0, Math.PI / 8);
    this.leftArm.position.set(-0.45, 1.1, 0);

    this.rightArm.rotation.set(0, 0, -Math.PI / 8);
    this.rightArm.position.set(0.45, 1.1, 0);

    this.leftHand.position.set(-0.55, 0.75, 0);
    this.rightHand.position.set(0.55, 0.75, 0);

    this.clipboard.visible = true;
    this.mesh.position.y = 0;
  }
}
