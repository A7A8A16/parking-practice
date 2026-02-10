import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Car {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    // 车辆配置
    this.config = {
      maxSpeed: 10,
      acceleration: 15,
      brakeForce: 20,
      turnSpeed: 2.5,
      friction: 0.98,
      steeringSmoothing: 0.15
    };

    // 状态
    this.throttleInput = 0;
    this.steering = 0;
    this.currentSteering = 0;
    this.speed = 0;
    this.gear = 'P';
    this.isBraking = false;

    // Three.js 对象
    this.mesh = null;
    this.wheels = [];

    // 简化物理 - 不使用 Cannon.js 物理体进行移动
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.rotation = 0; // Y轴旋转角度
    this.velocity = 0; // 沿车头方向的速度
  }

  async init() {
    // 创建车身
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      metalness: 0.6,
      roughness: 0.4
    });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 创建车顶
    const roofGeometry = new THREE.BoxGeometry(1.6, 0.6, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x2980b9,
      metalness: 0.6,
      roughness: 0.4
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 0.7, -0.3);
    roof.castShadow = true;
    this.mesh.add(roof);

    // 创建车窗
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });

    const frontWindowGeometry = new THREE.PlaneGeometry(1.5, 0.5);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.set(0, 0.7, 0.75);
    frontWindow.rotation.x = -Math.PI / 6;
    this.mesh.add(frontWindow);

    const rearWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    rearWindow.position.set(0, 0.7, -1.35);
    rearWindow.rotation.x = Math.PI / 6;
    rearWindow.rotation.y = Math.PI;
    this.mesh.add(rearWindow);

    // 创建车轮
    const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      metalness: 0.3,
      roughness: 0.8
    });

    const wheelPositions = [
      { x: -0.9, y: -0.3, z: 1.3 },
      { x: 0.9, y: -0.3, z: 1.3 },
      { x: -0.9, y: -0.3, z: -1.3 },
      { x: 0.9, y: -0.3, z: -1.3 }
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    // 车灯
    const headlightGeometry = new THREE.CircleGeometry(0.15, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5
    });

    [{ x: -0.7, z: 2.26 }, { x: 0.7, z: 2.26 }].forEach(pos => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(pos.x, 0, pos.z);
      this.mesh.add(headlight);
    });

    // 尾灯
    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });

    [{ x: -0.7, z: -2.26 }, { x: 0.7, z: -2.26 }].forEach(pos => {
      const taillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
      taillight.position.set(pos.x, 0, pos.z);
      taillight.rotation.y = Math.PI;
      this.mesh.add(taillight);
    });

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  setThrottle(value) {
    this.throttleInput = value;
  }

  setSteering(value) {
    this.steering = value;
  }

  setBrake(value) {
    this.isBraking = value;
  }

  reset(position, rotation) {
    this.position.set(position.x, position.y, position.z);
    this.rotation = rotation.y || 0;
    this.velocity = 0;
    this.throttleInput = 0;
    this.steering = 0;
    this.currentSteering = 0;
    this.speed = 0;
    this.gear = 'P';
    this.isBraking = false;
  }

  update(delta) {
    // 平滑转向
    this.currentSteering += (this.steering - this.currentSteering) * this.config.steeringSmoothing;

    // 自动档逻辑
    if (Math.abs(this.velocity) < 0.5) {
      if (this.throttleInput > 0) {
        this.gear = 'D';
      } else if (this.throttleInput < 0) {
        this.gear = 'R';
      }
    }

    // 计算加速度
    let acceleration = 0;

    if (this.isBraking) {
      // 刹车
      if (Math.abs(this.velocity) > 0.1) {
        acceleration = -Math.sign(this.velocity) * this.config.brakeForce;
      } else {
        this.velocity = 0;
      }
    } else if (this.gear === 'D' && this.throttleInput > 0) {
      // 前进
      if (this.velocity < this.config.maxSpeed) {
        acceleration = this.throttleInput * this.config.acceleration;
      }
    } else if (this.gear === 'R' && this.throttleInput < 0) {
      // 倒车
      if (this.velocity > -this.config.maxSpeed * 0.5) {
        acceleration = this.throttleInput * this.config.acceleration;
      }
    } else if (this.gear === 'D' && this.throttleInput < 0) {
      // D档按S键 = 刹车
      if (this.velocity > 0.1) {
        acceleration = -this.config.brakeForce;
      } else {
        this.velocity = 0;
      }
    } else if (this.gear === 'R' && this.throttleInput > 0) {
      // R档按W键 = 刹车
      if (this.velocity < -0.1) {
        acceleration = this.config.brakeForce;
      } else {
        this.velocity = 0;
      }
    }

    // 更新速度
    this.velocity += acceleration * delta;

    // 自然减速（摩擦力）
    if (this.throttleInput === 0 && !this.isBraking) {
      this.velocity *= this.config.friction;
      if (Math.abs(this.velocity) < 0.01) {
        this.velocity = 0;
      }
    }

    // 限制速度
    this.velocity = Math.max(-this.config.maxSpeed * 0.5, Math.min(this.config.maxSpeed, this.velocity));

    // 转向（只有在移动时才能转向）
    if (Math.abs(this.velocity) > 0.1) {
      const turnAmount = this.currentSteering * this.config.turnSpeed * delta;
      // 倒车时转向方向相反
      this.rotation += turnAmount * Math.sign(this.velocity);
    }

    // 更新位置
    const moveDistance = this.velocity * delta;
    this.position.x += Math.sin(this.rotation) * moveDistance;
    this.position.z += Math.cos(this.rotation) * moveDistance;

    // 更新速度显示值
    this.speed = this.velocity;

    // 更新档位显示
    if (Math.abs(this.velocity) < 0.1 && this.throttleInput === 0) {
      // 停车时如果没有输入，保持当前档位
    }

    // 同步 Three.js 网格
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // 旋转车轮
    const wheelRotation = this.velocity * delta * 3;
    this.wheels.forEach((wheel, index) => {
      wheel.rotation.x += wheelRotation;
      if (index < 2) {
        wheel.rotation.y = this.currentSteering * 0.5;
      }
    });
  }

  getPosition() {
    return this.position.clone();
  }

  getRotation() {
    return this.rotation;
  }

  getBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    return box;
  }
}
