import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class ReverseParking {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.title = '倒车入库';
    this.objects = [];
    this.colliders = [];
    this.targetZone = null;
    this.isVisible = false;

    this.onSuccess = null;
    this.onFail = null;

    this.checkTimer = 0;
    this.isInZone = false;
    this.zoneTimer = 0;
    this.requiredTime = 2; // 需要在目标区域停留2秒
  }

  async init() {
    this.createParkingLines();
    this.createPoles();
    this.createTargetZone();
  }

  createParkingLines() {
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    });

    // 车库线条配置
    const lineWidth = 0.1;
    const parkingWidth = 3;
    const parkingLength = 6;

    // 左边线
    const leftLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.02, parkingLength),
      lineMaterial
    );
    leftLine.position.set(-parkingWidth / 2, 0.01, 0);
    this.objects.push(leftLine);

    // 右边线
    const rightLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.02, parkingLength),
      lineMaterial
    );
    rightLine.position.set(parkingWidth / 2, 0.01, 0);
    this.objects.push(rightLine);

    // 后边线
    const backLine = new THREE.Mesh(
      new THREE.BoxGeometry(parkingWidth + lineWidth, 0.02, lineWidth),
      lineMaterial
    );
    backLine.position.set(0, 0.01, -parkingLength / 2);
    this.objects.push(backLine);

    // 入口引导线
    const guideLine1 = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.02, 8),
      lineMaterial
    );
    guideLine1.position.set(-parkingWidth / 2, 0.01, 7);
    this.objects.push(guideLine1);

    const guideLine2 = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.02, 8),
      lineMaterial
    );
    guideLine2.position.set(parkingWidth / 2, 0.01, 7);
    this.objects.push(guideLine2);

    // 添加到场景
    this.objects.forEach(obj => this.scene.add(obj));
  }

  createPoles() {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      roughness: 0.5
    });

    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);

    // 标杆位置
    const polePositions = [
      { x: -1.5, z: 3 },
      { x: 1.5, z: 3 },
      { x: -1.5, z: -3 },
      { x: 1.5, z: -3 }
    ];

    polePositions.forEach(pos => {
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(pos.x, 0.75, pos.z);
      pole.castShadow = true;
      this.objects.push(pole);
      this.scene.add(pole);

      // 添加碰撞体
      const shape = new CANNON.Cylinder(0.1, 0.1, 1.5, 8);
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        position: new CANNON.Vec3(pos.x, 0.75, pos.z)
      });
      this.world.addBody(body);
      this.colliders.push(body);
    });
  }

  createTargetZone() {
    // 目标停车区域（半透明绿色）
    const zoneGeometry = new THREE.PlaneGeometry(2.5, 5);
    const zoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.targetZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    this.targetZone.rotation.x = -Math.PI / 2;
    this.targetZone.position.set(0, 0.02, -0.5);
    this.objects.push(this.targetZone);
    this.scene.add(this.targetZone);
  }

  getStartPosition() {
    return {
      position: { x: 0, y: 0.5, z: 15 },
      rotation: { x: 0, y: Math.PI, z: 0 }
    };
  }

  getExaminerPosition() {
    return { x: 8, y: 0, z: 0 };
  }

  show() {
    this.objects.forEach(obj => {
      obj.visible = true;
    });
    this.isVisible = true;
    this.resetState();
  }

  hide() {
    this.objects.forEach(obj => {
      obj.visible = false;
    });
    this.isVisible = false;
  }

  resetState() {
    this.isInZone = false;
    this.zoneTimer = 0;
    this.checkTimer = 0;
  }

  checkStatus(car) {
    if (!this.isVisible) return;

    const carPos = car.getPosition();
    const carSpeed = Math.abs(car.speed);

    // 检查是否在目标区域内
    const zoneCenter = this.targetZone.position;
    const inZoneX = Math.abs(carPos.x - zoneCenter.x) < 1.2;
    const inZoneZ = Math.abs(carPos.z - zoneCenter.z) < 2.4;
    const isInZone = inZoneX && inZoneZ;

    // 检查车辆朝向（应该是倒车入库，车头朝外）
    const carRotation = car.getRotation();
    const isCorrectOrientation = Math.abs(Math.cos(carRotation)) > 0.9;

    if (isInZone && isCorrectOrientation && carSpeed < 0.1) {
      if (!this.isInZone) {
        this.isInZone = true;
        this.zoneTimer = 0;
        // 更新目标区域颜色为黄色（正在判定）
        this.targetZone.material.color.setHex(0xffff00);
      }

      this.zoneTimer += 1 / 60;

      if (this.zoneTimer >= this.requiredTime) {
        // 成功！
        this.targetZone.material.color.setHex(0x00ff00);
        this.targetZone.material.opacity = 0.5;
        if (this.onSuccess) this.onSuccess();
      }
    } else {
      if (this.isInZone) {
        this.isInZone = false;
        this.zoneTimer = 0;
        this.targetZone.material.color.setHex(0x00ff00);
        this.targetZone.material.opacity = 0.2;
      }
    }

    // 检查碰撞（简化版：检查是否撞到标杆）
    this.colliders.forEach((collider, index) => {
      const polePos = collider.position;
      const distance = Math.sqrt(
        Math.pow(carPos.x - polePos.x, 2) +
        Math.pow(carPos.z - polePos.z, 2)
      );

      if (distance < 1.2) {
        if (this.onFail) this.onFail('撞到标杆了！');
      }
    });
  }
}
