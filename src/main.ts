import './styles.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

type SwipeForce = {
  direction: { x: number; z: number };
  strength: number;
  lift: number;
};

type DiceEntity = {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  reported: boolean;
};

class DiceLounge {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;
  private diceEntities: DiceEntity[] = [];
  private diceSize = 0.9;
  private diceGeometry: THREE.BoxGeometry;
  private diceMaterials: THREE.MeshStandardMaterial[];
  private diceShape: CANNON.Box;
  private diceMaterial: CANNON.Material;
  private tableMaterial: CANNON.Material;
  private arenaHalfSize = { x: 3.2, z: 3.2 };
  private container: HTMLDivElement;
  private rollButton: HTMLButtonElement;
  private resetButton: HTMLButtonElement;
  private diceSelect: HTMLSelectElement;
  private resultsList: HTMLDivElement;
  private totalResult: HTMLDivElement;
  private diceCount = 1;
  private isRolling = false;
  private results: number[] = [];
  private swipeState?: { id: number; x: number; y: number; time: number };
  private lastTime = performance.now();
  private lastRollStarted = 0;

  constructor() {
    this.container = document.getElementById('three-container') as HTMLDivElement;
    this.rollButton = document.getElementById('roll-button') as HTMLButtonElement;
    this.resetButton = document.getElementById('reset-button') as HTMLButtonElement;
    this.diceSelect = document.getElementById('dice-count') as HTMLSelectElement;
    this.resultsList = document.getElementById('dice-results') as HTMLDivElement;
    this.totalResult = document.getElementById('total-result') as HTMLDivElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a17);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 6.5, 9.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 15;

    this.diceMaterial = new CANNON.Material('dice');
    this.tableMaterial = new CANNON.Material('table');
    const diceOnTable = new CANNON.ContactMaterial(this.diceMaterial, this.tableMaterial, {
      friction: 0.3,
      restitution: 0.25
    });
    const diceOnDice = new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
      friction: 0.25,
      restitution: 0.2
    });
    this.world.addContactMaterial(diceOnTable);
    this.world.addContactMaterial(diceOnDice);

    this.diceGeometry = new THREE.BoxGeometry(this.diceSize, this.diceSize, this.diceSize);
    this.diceMaterials = this.createDiceMaterials();
    const half = this.diceSize / 2;
    this.diceShape = new CANNON.Box(new CANNON.Vec3(half, half, half));

    this.addLights();
    this.addStage();
    this.createBounds();

    this.setupControls();
    this.setDiceCount(parseInt(this.diceSelect.value, 10));
    this.animate();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private addLights() {
    const ambient = new THREE.AmbientLight(0xf4f6ff, 0.55);
    this.scene.add(ambient);

    const spot = new THREE.SpotLight(0xffffff, 1.5, 40, Math.PI / 5, 0.4, 1);
    spot.position.set(8, 15, 10);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    this.scene.add(spot);

    const rim = new THREE.PointLight(0x6f7bff, 0.4, 30);
    rim.position.set(-6, 6, -5);
    this.scene.add(rim);
  }

  private addStage() {
    const baseGeometry = new THREE.CylinderGeometry(5.5, 5.7, 0.4, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1224,
      metalness: 0.35,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.receiveShadow = true;
    base.position.y = -0.35;
    this.scene.add(base);

    const feltGeometry = new THREE.CylinderGeometry(5.2, 5.2, 0.2, 64);
    const feltMaterial = new THREE.MeshStandardMaterial({
      color: 0x162041,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x090d1c,
      emissiveIntensity: 0.3
    });
    const felt = new THREE.Mesh(feltGeometry, feltMaterial);
    felt.receiveShadow = true;
    felt.position.y = -0.25;
    this.scene.add(felt);
  }

  private createBounds() {
    const floorShape = new CANNON.Box(new CANNON.Vec3(this.arenaHalfSize.x, 0.05, this.arenaHalfSize.z));
    const floor = new CANNON.Body({ mass: 0, shape: floorShape, material: this.tableMaterial });
    floor.position.set(0, -0.05, 0);
    this.world.addBody(floor);

    const wallThickness = 0.2;
    const wallHeight = 3.5;
    const createWall = (pos: CANNON.Vec3) => {
      const wallShape = new CANNON.Box(new CANNON.Vec3(
        pos.x === 0 ? this.arenaHalfSize.x + wallThickness : wallThickness,
        wallHeight / 2,
        pos.z === 0 ? this.arenaHalfSize.z + wallThickness : wallThickness
      ));
      const wall = new CANNON.Body({ mass: 0, shape: wallShape, position: pos, material: this.tableMaterial });
      this.world.addBody(wall);
    };

    createWall(new CANNON.Vec3(this.arenaHalfSize.x + wallThickness, wallHeight / 2 - 0.05, 0));
    createWall(new CANNON.Vec3(-(this.arenaHalfSize.x + wallThickness), wallHeight / 2 - 0.05, 0));
    createWall(new CANNON.Vec3(0, wallHeight / 2 - 0.05, this.arenaHalfSize.z + wallThickness));
    createWall(new CANNON.Vec3(0, wallHeight / 2 - 0.05, -(this.arenaHalfSize.z + wallThickness)));

    const ceiling = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    ceiling.addShape(new CANNON.Plane());
    ceiling.position.set(0, this.ceilingLimit, 0);
    const ceilingQuat = new CANNON.Quaternion();
    ceilingQuat.setFromEuler(Math.PI / 2, 0, 0);
    ceiling.quaternion.copy(ceilingQuat);
    this.world.addBody(ceiling);
  }

  private setupControls() {
    this.rollButton.addEventListener('click', () => this.rollDice());
    this.resetButton.addEventListener('click', () => this.resetScene());
    this.diceSelect.addEventListener('change', () => {
      const count = parseInt(this.diceSelect.value, 10);
      this.setDiceCount(count);
    });
    this.setupSwipeControls();
  }

  private setupSwipeControls() {
    this.container.addEventListener('pointerdown', (event) => {
      if (this.isRolling) return;
      this.swipeState = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
      this.container.setPointerCapture(event.pointerId);
    });

    const endSwipe = (event: PointerEvent) => {
      if (!this.swipeState || this.swipeState.id !== event.pointerId) return;
      this.container.releasePointerCapture(event.pointerId);
      const dx = event.clientX - this.swipeState.x;
      const dy = this.swipeState.y - event.clientY;
      const distance = Math.hypot(dx, dy);
      if (distance > 35) {
        const dir = new THREE.Vector2(dx, dy).normalize();
        const strength = THREE.MathUtils.clamp(distance / 220, 0.55, 1.15);
        const lift = THREE.MathUtils.clamp(1 + dy / 250, 0.8, 1.5);
        this.rollDice({
          direction: { x: dir.x, z: dir.y },
          strength,
          lift
        });
      }
      this.swipeState = undefined;
    };

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((eventName) => {
      this.container.addEventListener(eventName, endSwipe);
    });
  }

  private createDiceMaterials() {
    const faces = [3, 4, 1, 6, 2, 5];
    return faces.map((value) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#d6dbea');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#10121f';
      ctx.lineWidth = 18;
      ctx.strokeRect(30, 30, size - 60, size - 60);

      ctx.fillStyle = '#050912';
      const pipRadius = 32;
      const offset = size / 3;
      const positions: Record<number, [number, number][]> = {
        1: [[0, 0]],
        2: [[-1, -1], [1, 1]],
        3: [[-1, -1], [0, 0], [1, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
      };
      positions[value].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(size / 2 + x * offset / 1.5, size / 2 + y * offset / 1.5, pipRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.15, metalness: 0.2 });
    });
  }

  private setDiceCount(count: number) {
    this.diceCount = THREE.MathUtils.clamp(count, 1, 6);
    this.resetScene();
  }

  private resetScene() {
    this.diceEntities.forEach(({ mesh, body }) => {
      this.scene.remove(mesh);
      this.world.removeBody(body);
    });
    this.diceEntities = [];
    this.results = [];
    this.updateResultsPanel();
    for (let i = 0; i < this.diceCount; i += 1) {
      this.diceEntities.push(this.createDiceEntity(i));
    }
    this.isRolling = false;
    this.rollButton.disabled = false;
  }

  private createDiceEntity(index: number): DiceEntity {
    const mesh = new THREE.Mesh(this.diceGeometry, this.diceMaterials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1,
      shape: this.diceShape,
      material: this.diceMaterial,
      linearDamping: 0.35,
      angularDamping: 0.4
    });
    body.sleepSpeedLimit = 0.2;
    body.sleepTimeLimit = 0.6;
    body.position.set(
      (index - (this.diceCount - 1) / 2) * 1.2,
      1.2,
      THREE.MathUtils.randFloatSpread(0.8)
    );
    const entity: DiceEntity = { mesh, body, reported: false };
    body.addEventListener('sleep', () => this.onDiceSleep(entity));
    this.world.addBody(body);
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    return entity;
  }

  private onDiceSleep(entity: DiceEntity) {
    if (!this.isRolling || entity.reported) return;
    entity.reported = true;
    this.snapEntityToGrid(entity);
    const value = this.getTopFaceValue(entity.mesh.quaternion);
    this.results.push(value);
    this.updateResultsPanel();
    if (this.results.length === this.diceEntities.length) {
      this.finishRoll();
    }
  }

  private rollDice(force?: SwipeForce) {
    if (this.isRolling) return;
    this.isRolling = true;
    this.results = [];
    this.resultsList.innerHTML = '';
    this.totalResult.textContent = 'Rolling…';
    this.rollButton.disabled = true;
    this.lastRollStarted = performance.now();

    const direction = force?.direction ?? { x: 0, z: 1 };
    const dirLength = Math.hypot(direction.x, direction.z) || 1;
    const dirX = direction.x / dirLength;
    const dirZ = direction.z / dirLength;
    const strength = force?.strength ?? 1;
    const lift = force?.lift ?? 1;

    this.diceEntities.forEach((entity, index) => {
      entity.reported = false;
      const body = entity.body;
      body.wakeUp();
      body.velocity.setZero();
      body.angularVelocity.setZero();
      body.quaternion.setFromEuler(
        THREE.MathUtils.randFloatSpread(Math.PI),
        THREE.MathUtils.randFloatSpread(Math.PI),
        THREE.MathUtils.randFloatSpread(Math.PI)
      );

      const spread = 1.1;
      body.position.set(
        (index - (this.diceEntities.length - 1) / 2) * spread,
        2.2 + Math.random() * 0.8,
        -1 + Math.random() * 0.4
      );

      const baseForce = 4.5 * strength;
      body.velocity.set(
        dirX * baseForce + THREE.MathUtils.randFloatSpread(1.5),
        (6 + Math.random() * 2) * lift,
        dirZ * baseForce + THREE.MathUtils.randFloatSpread(1.5)
      );
      const angularRange = force ? 10 : 18;
      body.angularVelocity.set(
        THREE.MathUtils.randFloatSpread(angularRange),
        THREE.MathUtils.randFloatSpread(angularRange),
        THREE.MathUtils.randFloatSpread(angularRange)
      );
    });
  }

  private finishRoll() {
    this.isRolling = false;
    this.rollButton.disabled = false;
    this.updateResultsPanel();
  }

  private updateResultsPanel() {
    this.resultsList.innerHTML = '';
    if (this.results.length === 0) {
      this.totalResult.textContent = '合計: –';
      return;
    }
    this.results.forEach((value) => {
      const span = document.createElement('span');
      span.className = 'dice-result';
      span.textContent = String(value);
      this.resultsList.appendChild(span);
    });
    const total = this.results.reduce((sum, val) => sum + val, 0);
    this.totalResult.textContent = `合計: ${total}`;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.world.step(1 / 120, delta, 5);

    this.diceEntities.forEach((entity) => {
      const { body, mesh } = entity;
      this.keepBodyWithinBounds(body);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    });

    if (this.isRolling && now - this.lastRollStarted > 8000) {
      this.forceStopAllDice();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private forceStopAllDice() {
    this.diceEntities.forEach((entity) => {
      if (entity.reported) return;
      entity.body.velocity.setZero();
      entity.body.angularVelocity.setZero();
      entity.body.sleep();
      this.onDiceSleep(entity);
    });
  }

  private keepBodyWithinBounds(body: CANNON.Body) {
    const limitX = this.arenaHalfSize.x;
    const limitZ = this.arenaHalfSize.z;
    if (body.position.x > limitX) {
      body.position.x = limitX;
      body.velocity.x = -Math.abs(body.velocity.x) * 0.6;
    } else if (body.position.x < -limitX) {
      body.position.x = -limitX;
      body.velocity.x = Math.abs(body.velocity.x) * 0.6;
    }

    if (body.position.z > limitZ) {
      body.position.z = limitZ;
      body.velocity.z = -Math.abs(body.velocity.z) * 0.6;
    } else if (body.position.z < -limitZ) {
      body.position.z = -limitZ;
      body.velocity.z = Math.abs(body.velocity.z) * 0.6;
    }

    if (body.position.y > this.ceilingLimit) {
      body.position.y = this.ceilingLimit;
      body.velocity.y = -Math.abs(body.velocity.y) * 0.5;
    }
  }

  private snapEntityToGrid(entity: DiceEntity) {
    const meshQuat = entity.mesh.quaternion;
    const euler = new THREE.Euler().setFromQuaternion(meshQuat, 'XYZ');
    const snap = (value: number) => Math.round(value / (Math.PI / 2)) * (Math.PI / 2);
    euler.set(snap(euler.x), snap(euler.y), snap(euler.z));
    entity.mesh.quaternion.setFromEuler(euler);
    entity.mesh.position.y = this.diceSize / 2;

    const { x, y, z, w } = entity.mesh.quaternion;
    entity.body.position.y = entity.mesh.position.y;
    entity.body.quaternion.set(x, y, z, w);
    entity.body.velocity.setZero();
    entity.body.angularVelocity.setZero();
  }

  private getTopFaceValue(quaternion: THREE.Quaternion) {
    const up = new THREE.Vector3(0, 1, 0);
    const directions: { value: number; normal: THREE.Vector3 }[] = [
      { value: 1, normal: new THREE.Vector3(0, 1, 0) },
      { value: 6, normal: new THREE.Vector3(0, -1, 0) },
      { value: 2, normal: new THREE.Vector3(0, 0, 1) },
      { value: 5, normal: new THREE.Vector3(0, 0, -1) },
      { value: 3, normal: new THREE.Vector3(1, 0, 0) },
      { value: 4, normal: new THREE.Vector3(-1, 0, 0) }
    ];
    let bestValue = 1;
    let bestDot = -Infinity;
    directions.forEach(({ value, normal }) => {
      const worldNormal = normal.clone().applyQuaternion(quaternion);
      const dot = worldNormal.dot(up);
      if (dot > bestDot) {
        bestDot = dot;
        bestValue = value;
      }
    });
    return bestValue;
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DiceLounge();
});
