import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class ParallelParking {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.title = '侧方停车';
    this.objects = [];
    this.colliders = [];
    this.targetZone = null;
    this.isVisible = false;

    this.onSuccess = null;
    this.onFail = null;

    this.isInZone = false;
    this.zoneTimer = 0;
    this.requiredTime = 2;
  }

  async init() {
    this.createParkingLines();
    this.createObstacleCars();
    this.createTargetZone();
  }

  createParkingLines() {
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    });

    const lineWidth = 0.1;
    const parkingWidth = 3;
    const parkingLength = 7;

    // 路边线
    const curbLine = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.02, 30),
      lineMaterial
    );
    curbLine.position.set(-parkingWidth, 0.01, 0);
    this.objects.push(curbLine);

    // 车位前线
    const frontLine = new THREE.Mesh(
      new THREE.BoxGeometry(parkingWidth, 0.02, lineWidth),
      lineMaterial
    );
    frontLine.position.set(-parkingWidth / 2, 0.01, parkingLength / 2);
    this.objects.push(frontLine);

    // 车位后线
    const backLine = new THREE.Mesh(
      new THREE.BoxGeometry(parkingWidth, 0.02, lineWidth),
      lineMaterial
    );
    backLine.position.set(-parkingWidth / 2, 0.01, -parkingLength / 2);
    this.objects.push(backLine);

    // 道路中心线（虚线效果）
    for (let i = -5; i <= 5; i++) {
      const dashLine = new THREE.Mesh(
        new THREE.BoxGeometry(lineWidth, 0.02, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.5 })
      );
      dashLine.position.set(3, 0.01, i * 3);
      this.objects.push(dashLine);
    }

    this.objects.forEach(obj => this.scene.add(obj));
  }

  createObstacleCars() {
    // 创建前后两辆障碍车
    const carMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f8c8d,
      metalness: 0.5,
      roughness: 0.5
    });

    // 前车
    const frontCar = this.createSimpleCar(carMaterial);
    frontCar.position.set(-1.5, 0.5, 6);
    this.objects.push(frontCar);
    this.scene.add(frontCar);

    // 前车碰撞体
    const frontCarBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2.25)),
      position: new CANNON.Vec3(-1.5, 0.5, 6)
    });
    this.world.addBody(frontCarBody);
    this.colliders.push(frontCarBody);

    // 后车
    const backCar = this.createSimpleCar(carMaterial);
    backCar.position.set(-1.5, 0.5, -6);
    this.objects.push(backCar);
    this.scene.add(backCar);

    // 后车碰撞体
    const backCarBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2.25)),
      position: new CANNON.Vec3(-1.5, 0.5, -6)
    });
    this.world.addBody(backCarBody);
    this.colliders.push(backCarBody);
  }

  createSimpleCar(material) {
    const group = new THREE.Group();

    // 车身
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 4.5),
      material
    );
    body.castShadow = true;
    group.add(body);

    // 车顶
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 2),
      material
    );
    roof.position.set(0, 0.7, -0.3);
    roof.castShadow = true;
    group.add(roof);

    return group;
  }

  createTargetZone() {
    const zoneGeometry = new THREE.PlaneGeometry(2.5, 6);
    const zoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.targetZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    this.targetZone.rotation.x = -Math.PI / 2;
    this.targetZone.position.set(-1.5, 0.02, 0);
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
  }

  checkStatus(car) {
    if (!this.isVisible) return;

    const carPos = car.getPosition();
    const carSpeed = Math.abs(car.speed);

    // 检查是否在目标区域内
    const zoneCenter = this.targetZone.position;
    const inZoneX = Math.abs(carPos.x - zoneCenter.x) < 1.2;
    const inZoneZ = Math.abs(carPos.z - zoneCenter.z) < 2.8;
    const isInZone = inZoneX && inZoneZ;

    // 检查车辆朝向（应该与道路平行）
    const carRotation = car.getRotation();
    const isCorrectOrientation = Math.abs(Math.sin(carRotation)) < 0.2;

    if (isInZone && isCorrectOrientation && carSpeed < 0.1) {
      if (!this.isInZone) {
        this.isInZone = true;
        this.zoneTimer = 0;
        this.targetZone.material.color.setHex(0xffff00);
      }

      this.zoneTimer += 1 / 60;

      if (this.zoneTimer >= this.requiredTime) {
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

    // 检查碰撞
    this.colliders.forEach(collider => {
      const obstaclePos = collider.position;
      const dx = Math.abs(carPos.x - obstaclePos.x);
      const dz = Math.abs(carPos.z - obstaclePos.z);

      if (dx < 2 && dz < 3.5) {
        if (this.onFail) this.onFail('撞到其他车辆了！');
      }
    });
  }
}
