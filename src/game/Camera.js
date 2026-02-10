import * as THREE from 'three';

export class CameraController {
  constructor(car) {
    this.car = car;

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 视角模式：'third' 或 'first'
    this.viewMode = 'third';

    // 第三人称参数
    this.thirdPersonOffset = new THREE.Vector3(0, 4, -8);
    this.thirdPersonLookOffset = new THREE.Vector3(0, 1, 4);

    // 第一人称参数
    this.firstPersonOffset = new THREE.Vector3(0, 1.2, 0.5);

    // 平滑跟随
    this.smoothness = 0.1;
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // 初始化位置
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 0);
  }

  toggleView() {
    this.viewMode = this.viewMode === 'third' ? 'first' : 'third';
  }

  update(delta) {
    const carPosition = this.car.mesh.position;
    const carQuaternion = this.car.mesh.quaternion;

    let targetPosition = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.viewMode === 'third') {
      // 第三人称视角
      const offset = this.thirdPersonOffset.clone();
      offset.applyQuaternion(carQuaternion);
      targetPosition.copy(carPosition).add(offset);

      const lookOffset = this.thirdPersonLookOffset.clone();
      lookOffset.applyQuaternion(carQuaternion);
      targetLookAt.copy(carPosition).add(lookOffset);
    } else {
      // 第一人称视角
      const offset = this.firstPersonOffset.clone();
      offset.applyQuaternion(carQuaternion);
      targetPosition.copy(carPosition).add(offset);

      // 看向车辆前方
      const forward = new THREE.Vector3(0, 0, 10);
      forward.applyQuaternion(carQuaternion);
      targetLookAt.copy(carPosition).add(forward);
    }

    // 平滑插值
    this.currentPosition.lerp(targetPosition, this.smoothness);
    this.currentLookAt.lerp(targetLookAt, this.smoothness);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
