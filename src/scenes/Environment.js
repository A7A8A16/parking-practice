import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Environment {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.balloons = [];
  }

  async init() {
    // 创建渐变天空
    this.createSky();

    // 创建地面
    this.createGround();

    // 创建草地
    this.createGrass();

    // 创建热气球
    this.createBalloons();

    // 添加光照
    this.createLights();
  }

  createSky() {
    // 使用渐变色天空盒
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vWorldPosition;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;

      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077be) },
      bottomColor: { value: new THREE.Color(0x87ceeb) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(500, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // 添加雾效
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
  }

  createGround() {
    // 创建考场地面（灰色沥青）
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 物理地面
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  createGrass() {
    // 在考场周围创建草地
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c23,
      roughness: 0.8
    });

    // 四周的草地
    const grassAreas = [
      { x: 0, z: -60, width: 100, depth: 20 },
      { x: 0, z: 60, width: 100, depth: 20 },
      { x: -60, z: 0, width: 20, depth: 100 },
      { x: 60, z: 0, width: 20, depth: 100 }
    ];

    grassAreas.forEach(area => {
      const geometry = new THREE.PlaneGeometry(area.width, area.depth);
      const grass = new THREE.Mesh(geometry, grassMaterial);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(area.x, 0.01, area.z);
      grass.receiveShadow = true;
      this.scene.add(grass);
    });

    // 添加一些简单的草丛装饰
    const bushGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });

    for (let i = 0; i < 30; i++) {
      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      const angle = Math.random() * Math.PI * 2;
      const radius = 55 + Math.random() * 10;
      bush.position.set(
        Math.cos(angle) * radius,
        0.3,
        Math.sin(angle) * radius
      );
      bush.scale.set(
        0.5 + Math.random() * 1,
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 1
      );
      bush.castShadow = true;
      this.scene.add(bush);
    }
  }

  createBalloons() {
    const balloonColors = [0xe74c3c, 0xf39c12, 0x9b59b6, 0x3498db, 0x2ecc71];

    for (let i = 0; i < 5; i++) {
      const balloon = this.createBalloon(balloonColors[i]);
      const angle = (i / 5) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      balloon.position.set(
        Math.cos(angle) * radius,
        30 + Math.random() * 20,
        Math.sin(angle) * radius
      );
      balloon.userData = {
        baseY: balloon.position.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.2
      };
      this.balloons.push(balloon);
      this.scene.add(balloon);
    }
  }

  createBalloon(color) {
    const group = new THREE.Group();

    // 气球主体
    const balloonGeometry = new THREE.SphereGeometry(3, 16, 16);
    const balloonMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.1
    });
    const balloonMesh = new THREE.Mesh(balloonGeometry, balloonMaterial);
    balloonMesh.scale.y = 1.2;
    group.add(balloonMesh);

    // 气球底部
    const bottomGeometry = new THREE.ConeGeometry(1.5, 2, 16);
    const bottomMesh = new THREE.Mesh(bottomGeometry, balloonMaterial);
    bottomMesh.position.y = -3.5;
    bottomMesh.rotation.x = Math.PI;
    group.add(bottomMesh);

    // 吊篮
    const basketGeometry = new THREE.BoxGeometry(2, 1.5, 2);
    const basketMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8
    });
    const basket = new THREE.Mesh(basketGeometry, basketMaterial);
    basket.position.y = -8;
    group.add(basket);

    // 绳索
    const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });

    const ropePositions = [
      { x: -0.8, z: -0.8 },
      { x: 0.8, z: -0.8 },
      { x: -0.8, z: 0.8 },
      { x: 0.8, z: 0.8 }
    ];

    ropePositions.forEach(pos => {
      const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
      rope.position.set(pos.x, -6, pos.z);
      group.add(rope);
    });

    return group;
  }

  createLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 主方向光（太阳）
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);

    // 半球光（天空和地面的反射）
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c23, 0.3);
    this.scene.add(hemiLight);
  }

  update(delta) {
    // 更新热气球动画
    this.balloons.forEach(balloon => {
      const data = balloon.userData;
      data.phase += delta * data.speed;
      balloon.position.y = data.baseY + Math.sin(data.phase) * 2;
      balloon.rotation.y += delta * 0.1;
    });
  }
}
