import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class CurveDriving {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.title = '曲线行驶';
    this.objects = [];
    this.colliders = [];
    this.checkpoints = [];
    this.currentCheckpoint = 0;
    this.isVisible = false;

    this.onSuccess = null;
    this.onFail = null;
  }

  async init() {
    this.createCurveRoad();
    this.createBoundaries();
    this.createCheckpoints();
  }

  createCurveRoad() {
    // 创建S形弯道的路面
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.9
    });

    // 使用多个矩形拼接成S形
    const roadWidth = 4;
    const segments = 20;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const nextT = (i + 1) / segments;

      const pos = this.getCurvePosition(t);
      const nextPos = this.getCurvePosition(nextT);

      const length = Math.sqrt(
        Math.pow(nextPos.x - pos.x, 2) +
        Math.pow(nextPos.z - pos.z, 2)
      );

      const angle = Math.atan2(nextPos.x - pos.x, nextPos.z - pos.z);

      const segment = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, length + 0.5),
        roadMaterial
      );
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = -angle;
      segment.position.set(
        (pos.x + nextPos.x) / 2,
        0.005,
        (pos.z + nextPos.z) / 2
      );
      segment.receiveShadow = true;
      this.objects.push(segment);
      this.scene.add(segment);
    }
  }

  getCurvePosition(t) {
    // S形曲线参数方程
    const length = 40;
    const amplitude = 8;
    const z = -20 + t * length;
    const x = Math.sin(t * Math.PI * 2) * amplitude;
    return { x, z };
  }

  createBoundaries() {
    const boundaryMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      roughness: 0.5
    });

    const roadWidth = 4;
    const segments = 40;

    // 左右边界
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const pos = this.getCurvePosition(t);

        // 计算法线方向
        const nextT = Math.min(t + 0.01, 1);
        const nextPos = this.getCurvePosition(nextT);
        const dx = nextPos.x - pos.x;
        const dz = nextPos.z - pos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const nx = -dz / len;
        const nz = dx / len;

        // 边界桩
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8),
          boundaryMaterial
        );
        pole.position.set(
          pos.x + nx * (roadWidth / 2) * side,
          0.4,
          pos.z + nz * (roadWidth / 2) * side
        );
        pole.castShadow = true;
        this.objects.push(pole);
        this.scene.add(pole);

        // 碰撞体
        const body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Cylinder(0.15, 0.15, 0.8, 8),
          position: new CANNON.Vec3(
            pos.x + nx * (roadWidth / 2) * side,
            0.4,
            pos.z + nz * (roadWidth / 2) * side
          )
        });
        this.world.addBody(body);
        this.colliders.push(body);
      }
    }
  }

  createCheckpoints() {
    // 创建检查点（用于判断是否完成）
    const checkpointPositions = [0.25, 0.5, 0.75, 1.0];

    checkpointPositions.forEach((t, index) => {
      const pos = this.getCurvePosition(t);
      this.checkpoints.push({
        x: pos.x,
        z: pos.z,
        passed: false
      });

      // 可视化检查点（半透明）
      if (index < checkpointPositions.length - 1) {
        const marker = new THREE.Mesh(
          new THREE.RingGeometry(1.5, 2, 16),
          new THREE.MeshStandardMaterial({
            color: 0x3498db,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
          })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(pos.x, 0.02, pos.z);
        this.objects.push(marker);
        this.scene.add(marker);
      }
    });

    // 终点标记
    const finishPos = this.getCurvePosition(1.0);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x27ae60,
        transparent: true,
        opacity: 0.5
      })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(finishPos.x, 0.02, finishPos.z);
    this.objects.push(finishLine);
    this.scene.add(finishLine);
  }

  getStartPosition() {
    const startPos = this.getCurvePosition(0);
    return {
      position: { x: startPos.x, y: 0.5, z: startPos.z - 5 },
      rotation: { x: 0, y: 0, z: 0 }
    };
  }

  getExaminerPosition() {
    return { x: 15, y: 0, z: 0 };
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
    this.currentCheckpoint = 0;
    this.checkpoints.forEach(cp => {
      cp.passed = false;
    });
  }

  checkStatus(car) {
    if (!this.isVisible) return;

    const carPos = car.getPosition();

    // 检查检查点
    this.checkpoints.forEach((checkpoint, index) => {
      if (!checkpoint.passed) {
        const distance = Math.sqrt(
          Math.pow(carPos.x - checkpoint.x, 2) +
          Math.pow(carPos.z - checkpoint.z, 2)
        );

        if (distance < 3) {
          checkpoint.passed = true;
          this.currentCheckpoint = index + 1;

          // 检查是否完成所有检查点
          if (this.currentCheckpoint >= this.checkpoints.length) {
            if (this.onSuccess) this.onSuccess();
          }
        }
      }
    });

    // 检查碰撞
    this.colliders.forEach(collider => {
      const polePos = collider.position;
      const distance = Math.sqrt(
        Math.pow(carPos.x - polePos.x, 2) +
        Math.pow(carPos.z - polePos.z, 2)
      );

      if (distance < 1.2) {
        if (this.onFail) this.onFail('压线了！');
      }
    });
  }
}
