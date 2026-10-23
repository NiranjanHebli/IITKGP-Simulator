/**
 * @fileoverview Main entry point for IIT KGP Open World.
 * Integrates:
 *  - 360° Free-Orbit 3D Camera + Head/Eye Tracking
 *  - Photo-Accurate Bauhaus Main Building & Unified KGP Campus Palette
 *  - Solid PhysicsWorld & Organic Lathe-Sculpted Articulated Humanoids
 */

import * as THREE from 'three';
import { InputManager } from './engine/input.js';
import { TimeSystem } from './engine/time.js';
import { PhysicsWorld } from './engine/physics.js';
import { WalkableGrid, metersToLatLng } from './world/geo.js';
import { CampusArchitectureBuilder } from './world/buildings.js';
import { ArticulatedHumanoid } from './characters/humanoid.js';
import {
  CAMPUS_LANDMARKS,
  LOCALIZED_GREETINGS,
  resolveNpcSchedule
} from './characters/schedule.js';
import { MinimapRadar } from './hud/minimap.js';

const STORAGE_KEY = 'iit_kgp_open_world_save_v4';

class IITKGPOpenWorldGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.minimapCanvas = document.getElementById('minimap-canvas');

    this.settings = this._loadSettings();
    this.weatherMode = this.settings.weather || 'CLEAR';
    this.language = this.settings.language || 'en';
    this.outfit = this.settings.outfit || 'hostel_tee';

    this.input = new InputManager(this.canvas);
    this.time = new TimeSystem({
      initialMinutes: 510, // 08:30 AM crisp morning light matching the photo
      timeScale: Number(this.settings.timeScale) || 60
    });
    this.physics = new PhysicsWorld({ maxStepHeight: 0.55, gravity: 22.0 });
    this.navGrid = new WalkableGrid(1600, 8);
    this.minimap = new MinimapRadar(this.minimapCanvas, CAMPUS_LANDMARKS);

    // Solid Player State with Independent CameraYaw & Body Heading
    this.player = {
      x: 0,
      y: 0,
      z: 58, // Positioned right in front of the Main Building Roundabout Lawn!
      vy: 0,
      radius: 0.45,
      height: 1.75,
      isGrounded: true,
      heading: 0,    // Character body facing direction (0 = North / -Z toward Main Building)
      cameraYaw: 0,  // Independent 360-degree mouse orbit yaw
      pitch: 0.08,   // Camera vertical angle
      stamina: 100,
      isRidingBike: false,
      firstPerson: false,
      humanoid: null
    };

    this.objectives = [
      { landmarkId: 'main_building', title: 'Inspect the Main Building Portico & Roundabout Lawn' },
      { landmarkId: 'nalanda', title: 'Ride East to the Massive 4-Block Nalanda Classroom Complex' },
      { landmarkId: 'mmm_hall', title: 'Visit Pandit Madan Mohan Malaviya (MMM) Hall of Residence' },
      { landmarkId: 'patel_hall', title: 'Visit the PAN Loop (Patel, Azad & Nehru Halls)' },
      { landmarkId: 'nehru_museum', title: 'Inspect the Fighter Jet & Steam Engine at Nehru Museum' }
    ];
    this.currentObjectiveIdx = 0;
    this.gpsPath = [];
    this.gpsRecalcTimer = 0;

    /** @type {Array<object>} */
    this.npcs = [];
    /** @type {Array<THREE.Material>} */
    this.emissiveNightMaterials = [];

    this.debugVisible = false;
    this.fpsFrames = 0;
    this.fpsAccumulator = 0;
    this.currentFps = 60;

    this._init();
  }

  _loadSettings() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { language: 'en', timeScale: 60, weather: 'CLEAR', outfit: 'hostel_tee' };
    } catch {
      return { language: 'en', timeScale: 60, weather: 'CLEAR', outfit: 'hostel_tee' };
    }
  }

  _saveSettings() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        language: this.language,
        timeScale: this.time.timeScale,
        weather: this.weatherMode,
        outfit: this.outfit
      }));
    } catch {
      // Ignore storage quota errors
    }
  }

  _checkWebGL2() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      return Boolean(gl);
    } catch {
      return false;
    }
  }

  _init() {
    if (!this._checkWebGL2()) {
      document.getElementById('loading-screen')?.classList.add('hidden');
      document.getElementById('webgl-error')?.classList.remove('hidden');
      return;
    }

    this._updateLoading(30, 'Configuring WebGL2 renderer & cascaded shadows...');
    this._setupRendererAndScene();

    this._updateLoading(60, 'Constructing photo-accurate IIT KGP Main Building & campus...');
    this._buildCampusWorld();

    this._updateLoading(85, 'Sculpting organic 3D student, faculty, guard & vendor characters...');
    this._buildPlayerCharacter();
    this._spawnNpcs(22);
    this._recalculateGpsRoute();
    this._bindUiEvents();

    this._updateLoading(100, 'Ready!');
    setTimeout(() => {
      document.getElementById('loading-screen')?.classList.add('hidden');
      this._showToast('Move mouse (or click & drag) to orbit 360° 3D Camera! Press [B] for Bicycle.');
    }, 250);

    this.lastTime = performance.now();
    requestAnimationFrame((now) => this._animate(now));
  }

  _updateLoading(percent, statusText) {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-status');
    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.textContent = statusText;
  }

  _setupRendererAndScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5B82A6);
    this.scene.fog = new THREE.FogExp2(0x5B82A6, 0.0009);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.25, 900);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x7c2d12, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _buildCampusWorld() {
    // 1. Campus Lawn & Laterite Terrain Plane
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x435933,
      roughness: 0.92,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Paved Campus Roads & Sidewalks
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3A3835, roughness: 0.88 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xE5E7EB, roughness: 0.8 });
    const addRoad = (x, z, w, d) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.10, d + 2.4), curbMat);
      curb.position.set(x, 0.05, z);
      curb.receiveShadow = true;
      this.scene.add(curb);

      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), roadMat);
      m.position.set(x, 0.07, z);
      m.receiveShadow = true;
      this.scene.add(m);
      this.navGrid.markRect(x, z, w, d, 1);
    };
    addRoad(0, 80, 18, 680);      // Scholar's Avenue (Main Building to Puri Gate)
    addRoad(-10, 55, 880, 14);    // Main East-West Avenue (MMM/PAN Loop to Nalanda Complex)
    addRoad(-30, -10, 840, 12);   // Academic & Mega Hostel Avenue (LBS/MMM to Takshashila/Nalanda)
    addRoad(-175, 70, 12, 420);   // PAN Loop Road (Patel, Azad, Nehru Halls)
    addRoad(-305, 45, 12, 420);   // MMM & LBS Mega Hostel Avenue
    addRoad(155, 80, 12, 520);    // East Academic, Gymkhana, Stadium & Museum Road

    // 3. Authentic IIT KGP Architecture + Solid Colliders
    const archBuilder = new CampusArchitectureBuilder(this.scene, this.physics, this.navGrid);
    archBuilder.buildAllLandmarks(CAMPUS_LANDMARKS);
    this.emissiveNightMaterials.push(...archBuilder.nightMaterials);

    // 4. Instanced Solid Trees (Trunks + Foliage Crowns with Solid Cylinder Colliders)
    const treeCount = 200;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.50, 3.6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const instancedTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    instancedTrunks.castShadow = true;
    instancedTrunks.receiveShadow = true;

    const crownGeo = new THREE.DodecahedronGeometry(3.6, 1);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2E4C1E, roughness: 0.85 });
    const instancedCrowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    instancedCrowns.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    while (placed < treeCount) {
      const tx = (rand() - 0.5) * 760;
      const tz = (rand() - 0.5) * 760;
      const cell = this.navGrid.worldToCell(tx, tz);
      if (this.navGrid.weights[cell.row * this.navGrid.cols + cell.col] !== 2) continue;
      if (Math.hypot(tx, tz - 32) < 42) continue; // Keep Main Building front plaza & roundabout clear

      const scale = 0.8 + rand() * 0.55;
      dummy.position.set(tx, 1.8 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedTrunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(tx, 5.0 * scale, tz);
      dummy.updateMatrix();
      instancedCrowns.setMatrixAt(placed, dummy.matrix);

      this.physics.addCylinder(tx, tz, 0.48 * scale, 6.0 * scale, 'tree');
      placed++;
    }
    this.scene.add(instancedTrunks);
    this.scene.add(instancedCrowns);

    // 5. Solid Streetlamps along Scholar's Avenue
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.0
    });
    this.emissiveNightMaterials.push(bulbMat);

    for (let z = -220; z <= 280; z += 40) {
      for (const side of [-10.5, 10.5]) {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(side, 0, z);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 8), poleMat);
        pole.position.y = 2.75;
        pole.castShadow = true;
        lampGroup.add(pole);

        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), bulbMat);
        lantern.position.y = 5.6;
        lampGroup.add(lantern);

        this.scene.add(lampGroup);
        this.physics.addCylinder(side, z, 0.22, 5.6, 'lamp');
      }
    }

    // 6. Monsoon Rain Particle System
    const rainCount = 1200;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 180;
      rainPositions[i * 3 + 1] = Math.random() * 60;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 180;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.35, transparent: true, opacity: 0.65 });
    this.rainSystem = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainSystem);
  }

  _buildPlayerCharacter() {
    this.player.humanoid = new ArticulatedHumanoid({
      role: 'student',
      outfit: this.outfit,
      seed: 1
    });
    this.scene.add(this.player.humanoid.root);
  }

  _spawnNpcs(count) {
    const roles = ['student', 'student', 'student', 'professor', 'guard', 'vendor'];

    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      const sched = resolveNpcSchedule(role, this.time.totalMinutes, i);

      const humanoid = new ArticulatedHumanoid({
        role,
        seed: i + 10
      });
      this.scene.add(humanoid.root);

      const startX = ((i % 4) - 1.5) * 18;
      const startZ = Math.floor(i / 4) * 28 + 48;
      humanoid.root.position.set(startX, 0, startZ);

      const path = this.navGrid.findPath(startX, startZ, sched.targetX, sched.targetZ);
      this.npcs.push({
        id: i,
        role,
        x: startX,
        y: 0,
        z: startZ,
        vy: 0,
        radius: 0.42,
        height: 1.75,
        heading: 0,
        speed: role === 'student' ? 3.1 : 2.2,
        humanoid,
        path,
        pathIndex: 0,
        lastScheduleLandmark: sched.landmarkId,
        activity: sched.activity
      });
    }
  }

  _recalculateGpsRoute() {
    const obj = this.objectives[this.currentObjectiveIdx];
    const lm = CAMPUS_LANDMARKS.find((l) => l.id === obj.landmarkId) || CAMPUS_LANDMARKS[0];
    const targetZ = lm.z + lm.d / 2 + 8;
    this.gpsPath = this.navGrid.findPath(this.player.x, this.player.z, lm.x, targetZ);

    const objText = document.getElementById('hud-objective-text');
    if (objText) objText.textContent = obj.title;
  }

  _bindUiEvents() {
    const outfitSel = document.getElementById('setting-outfit');
    const langSel = document.getElementById('setting-lang');
    const timeSel = document.getElementById('setting-timescale');
    const weathSel = document.getElementById('setting-weather');
    const resumeBtn = document.getElementById('btn-resume');

    if (outfitSel) {
      outfitSel.value = this.outfit;
      outfitSel.addEventListener('change', (e) => {
        this.outfit = e.target.value;
        this.player.humanoid.setOutfit(this.outfit);
        this._saveSettings();
      });
    }
    if (langSel) {
      langSel.value = this.language;
      langSel.addEventListener('change', (e) => {
        this.language = e.target.value;
        this._saveSettings();
      });
    }
    if (timeSel) {
      timeSel.value = String(this.time.timeScale);
      timeSel.addEventListener('change', (e) => {
        this.time.timeScale = Number(e.target.value);
        this._saveSettings();
      });
    }
    if (weathSel) {
      weathSel.value = this.weatherMode;
      weathSel.addEventListener('change', (e) => {
        this.weatherMode = e.target.value;
        this._saveSettings();
      });
    }
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this._togglePause(false));
    }
  }

  _togglePause(forceState) {
    const modal = document.getElementById('pause-modal');
    if (!modal) return;
    const nextPaused = forceState !== undefined ? forceState : !this.time.paused;
    this.time.paused = nextPaused;
    modal.classList.toggle('hidden', !nextPaused);
    if (nextPaused && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  _showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  _showSubtitle(speaker, text) {
    const box = document.getElementById('subtitle-box');
    const spk = document.getElementById('subtitle-speaker');
    const txt = document.getElementById('subtitle-text');
    if (!box || !spk || !txt) return;
    spk.textContent = `[${speaker.toUpperCase()}]:`;
    txt.textContent = text;
    box.classList.remove('hidden');
    clearTimeout(this._subTimeout);
    this._subTimeout = setTimeout(() => box.classList.add('hidden'), 4500);
  }

  _updatePlayer(dt, inputState) {
    if (inputState.toggleBike) {
      this.player.isRidingBike = !this.player.isRidingBike;
      this.player.radius = this.player.isRidingBike ? 0.62 : 0.45;
      const modeEl = document.getElementById('hud-mode');
      if (modeEl) modeEl.textContent = this.player.isRidingBike ? 'Bicycle' : 'Walking';
      this._showToast(this.player.isRidingBike ? 'Mounted Student Bicycle' : 'Dismounted Bicycle');
    }

    if (inputState.toggleCamera) {
      this.player.firstPerson = !this.player.firstPerson;
      this.player.humanoid.root.visible = !this.player.firstPerson;
    }

    if (inputState.zoomIn || inputState.wheelDelta < 0) this.minimap.adjustZoom(0.06);
    if (inputState.zoomOut || inputState.wheelDelta > 0) this.minimap.adjustZoom(-0.06);

    if (inputState.jump && this.player.isGrounded) {
      this.player.vy = 7.6;
      this.player.isGrounded = false;
    }

    // 1. Free-Orbit 3D Camera Angles (Mouse controls Camera Yaw & Pitch 360 deg)
    this.player.cameraYaw -= inputState.lookDeltaX * 0.0032;
    this.player.pitch = Math.max(-0.65, Math.min(1.05, this.player.pitch + inputState.lookDeltaY * 0.0026));

    // 2. Camera-Relative Movement Vector (W/A/S/D moves relative to where the camera is looking)
    const baseSpeed = this.player.isRidingBike ? 13.5 : 5.4;
    const isMoving = Math.abs(inputState.moveX) > 0.04 || Math.abs(inputState.moveZ) > 0.04;
    const isSprinting = inputState.sprint && this.player.stamina > 5 && isMoving;
    const speed = isSprinting ? baseSpeed * 1.55 : baseSpeed;

    if (isSprinting) {
      this.player.stamina = Math.max(0, this.player.stamina - 18 * dt);
    } else {
      this.player.stamina = Math.min(100, this.player.stamina + 14 * dt);
    }

    const camForwardX = -Math.sin(this.player.cameraYaw);
    const camForwardZ = -Math.cos(this.player.cameraYaw);
    const camRightX = Math.cos(this.player.cameraYaw);
    const camRightZ = -Math.sin(this.player.cameraYaw);

    const moveWorldX = camForwardX * (-inputState.moveZ) + camRightX * inputState.moveX;
    const moveWorldZ = camForwardZ * (-inputState.moveZ) + camRightZ * inputState.moveX;

    // 3. Smoothly rotate character body toward movement direction (locomotion)
    if (isMoving) {
      const targetBodyHeading = Math.atan2(-moveWorldX, -moveWorldZ);
      let angleDiff = targetBodyHeading - this.player.heading;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      this.player.heading += angleDiff * Math.min(1, dt * 11.0);
    }

    // 4. Solve solid physics collision
    const prevX = this.player.x;
    const prevZ = this.player.z;
    const resolved = this.physics.moveAndSlide(
      this.player,
      moveWorldX * speed * dt,
      moveWorldZ * speed * dt,
      dt,
      this.npcs
    );

    this.player.x = resolved.x;
    this.player.y = resolved.y;
    this.player.z = resolved.z;
    this.player.vy = resolved.vy;
    this.player.isGrounded = resolved.isGrounded;

    const actualHorizontalSpeed = Math.hypot(this.player.x - prevX, this.player.z - prevZ) / dt;

    // 5. Update articulated human body + make the character's head look toward the mouse camera direction!
    this.player.humanoid.root.position.set(this.player.x, this.player.y, this.player.z);
    this.player.humanoid.root.rotation.y = this.player.heading;
    this.player.humanoid.updateAnimation(
      dt,
      actualHorizontalSpeed,
      this.player.isRidingBike,
      this.player.isGrounded
    );

    let headLookDiff = this.player.cameraYaw - this.player.heading;
    headLookDiff = Math.atan2(Math.sin(headLookDiff), Math.cos(headLookDiff));
    if (Math.abs(headLookDiff) < 1.35 && this.player.humanoid.joints.head) {
      this.player.humanoid.joints.head.rotation.y = headLookDiff * 0.75;
      this.player.humanoid.joints.head.rotation.x = -this.player.pitch * 0.45;
    }

    // 6. Position 3D Orbital Camera
    if (this.player.firstPerson) {
      this.camera.position.set(this.player.x, this.player.y + 1.68, this.player.z);
      const lookX = this.player.x - Math.sin(this.player.cameraYaw) * Math.cos(this.player.pitch) * 10;
      const lookY = this.player.y + 1.68 - Math.sin(this.player.pitch) * 10;
      const lookZ = this.player.z - Math.cos(this.player.cameraYaw) * Math.cos(this.player.pitch) * 10;
      this.camera.lookAt(lookX, lookY, lookZ);
    } else {
      const desiredDist = this.player.isRidingBike ? 7.4 : 5.4;
      const camX = this.player.x + Math.sin(this.player.cameraYaw) * desiredDist * Math.cos(this.player.pitch);
      const camY = Math.max(this.player.y + 0.65, this.player.y + 1.9 + Math.sin(this.player.pitch) * desiredDist);
      const camZ = this.player.z + Math.cos(this.player.cameraYaw) * desiredDist * Math.cos(this.player.pitch);
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(this.player.x, this.player.y + 1.45, this.player.z);
    }

    this.sunLight.target.position.set(this.player.x, 0, this.player.z);
  }

  _updateNpcsAndInteractions(dt, inputState) {
    let nearestNpc = null;
    let nearestDist = Infinity;
    const allAgents = [this.player, ...this.npcs];

    for (const npc of this.npcs) {
      const sched = resolveNpcSchedule(npc.role, this.time.totalMinutes, npc.id);
      if (sched.landmarkId !== npc.lastScheduleLandmark) {
        npc.lastScheduleLandmark = sched.landmarkId;
        npc.activity = sched.activity;
        npc.path = this.navGrid.findPath(npc.x, npc.z, sched.targetX, sched.targetZ);
        npc.pathIndex = 0;
      }

      let moveDx = 0;
      let moveDz = 0;
      const waypoint = npc.path[npc.pathIndex];
      if (waypoint) {
        const dx = waypoint.x - npc.x;
        const dz = waypoint.z - npc.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.6) {
          npc.pathIndex = Math.min(npc.path.length - 1, npc.pathIndex + 1);
        } else {
          moveDx = (dx / dist) * npc.speed * dt;
          moveDz = (dz / dist) * npc.speed * dt;
          npc.heading = Math.atan2(-dx, -dz);
        }
      }

      const prevX = npc.x;
      const prevZ = npc.z;
      const res = this.physics.moveAndSlide(npc, moveDx, moveDz, dt, allAgents);
      npc.x = res.x;
      npc.y = res.y;
      npc.z = res.z;
      npc.vy = res.vy;

      const actualSpeed = Math.hypot(npc.x - prevX, npc.z - prevZ) / dt;
      npc.humanoid.root.position.set(npc.x, npc.y, npc.z);
      npc.humanoid.root.rotation.y = npc.heading;
      npc.humanoid.updateAnimation(dt, actualSpeed, false, true);

      const dPlayer = Math.hypot(npc.x - this.player.x, npc.z - this.player.z);
      if (dPlayer < nearestDist) {
        nearestDist = dPlayer;
        nearestNpc = npc;
      }
    }

    const promptEl = document.getElementById('interaction-prompt');
    if (nearestNpc && nearestDist < 4.5) {
      promptEl?.classList.remove('hidden');
      if (inputState.interact) {
        nearestNpc.heading = Math.atan2(-(this.player.x - nearestNpc.x), -(this.player.z - nearestNpc.z));
        nearestNpc.humanoid.root.rotation.y = nearestNpc.heading;
        const dict = LOCALIZED_GREETINGS[this.language] || LOCALIZED_GREETINGS.en;
        this._showSubtitle(nearestNpc.role, dict[nearestNpc.role]);
      }
    } else {
      promptEl?.classList.add('hidden');
    }
  }

  _animate(now) {
    requestAnimationFrame((t) => this._animate(t));

    const realDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const inputState = this.input.getFrameState();
    if (inputState.pause) this._togglePause();
    if (inputState.debugOverlay) {
      this.debugVisible = !this.debugVisible;
      document.getElementById('debug-overlay')?.classList.toggle('hidden', !this.debugVisible);
    }

    const dt = this.time.update(realDt);
    if (dt > 0) {
      this._updatePlayer(dt, inputState);
      this._updateNpcsAndInteractions(dt, inputState);

      const lightState = this.time.getLightingState(this.weatherMode);
      this.sunLight.position.set(
        this.player.x + lightState.sunDirection.x * 160,
        Math.max(15, lightState.sunDirection.y * 160),
        this.player.z + lightState.sunDirection.z * 160
      );
      this.sunLight.intensity = lightState.sunIntensity;
      this.hemiLight.intensity = lightState.hemiIntensity;
      this.scene.background.setHex(lightState.skyHorizonHex);
      this.scene.fog.color.setHex(lightState.skyHorizonHex);
      this.scene.fog.density = lightState.fogDensity;

      for (const mat of this.emissiveNightMaterials) {
        mat.emissiveIntensity = 0.08 + lightState.lampIntensity * 1.25;
      }

      this.rainSystem.visible = this.weatherMode === 'MONSOON';
      if (this.rainSystem.visible) {
        this.rainSystem.position.set(this.player.x, 0, this.player.z);
        const pos = this.rainSystem.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 38 * dt;
          if (y < 0) y = 55;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      const activeObj = this.objectives[this.currentObjectiveIdx];
      const targetLm = CAMPUS_LANDMARKS.find((l) => l.id === activeObj.landmarkId) || CAMPUS_LANDMARKS[0];
      const objGoalZ = targetLm.z + targetLm.d / 2 + 8;
      const distToObj = Math.hypot(targetLm.x - this.player.x, objGoalZ - this.player.z);

      if (distToObj < 15) {
        this._showToast(`Completed: ${activeObj.title}`);
        this.currentObjectiveIdx = (this.currentObjectiveIdx + 1) % this.objectives.length;
        this._recalculateGpsRoute();
      }

      this.gpsRecalcTimer += dt;
      if (this.gpsRecalcTimer > 1.2) {
        this.gpsRecalcTimer = 0;
        this._recalculateGpsRoute();
      }

      const clock = this.time.getClockTime();
      document.getElementById('hud-clock').textContent = clock.formatted12h;
      document.getElementById('hud-weather').textContent = this.weatherMode;
      document.getElementById('hud-stamina-bar').style.width = `${this.player.stamina}%`;
      document.getElementById('hud-objective-dist').textContent = `${Math.round(distToObj)} m`;

      // Rotate radar with the camera Yaw!
      this.minimap.render({
        player: { x: this.player.x, z: this.player.z, heading: this.player.cameraYaw },
        npcs: this.npcs,
        gpsPath: this.gpsPath,
        objective: { x: targetLm.x, z: objGoalZ, label: targetLm.name }
      });
    }

    this.renderer.render(this.scene, this.camera);
    this._updateProfiler(realDt);
  }

  _updateProfiler(realDt) {
    this.fpsFrames++;
    this.fpsAccumulator += realDt;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccumulator);
      this.fpsFrames = 0;
      this.fpsAccumulator = 0;

      if (this.debugVisible) {
        const info = this.renderer.info;
        const coords = metersToLatLng(this.player.x, this.player.z);
        document.getElementById('debug-fps').textContent = `FPS: ${this.currentFps}`;
        document.getElementById('debug-draws').textContent = `Draw Calls: ${info.render.calls} (Budget: <300)`;
        document.getElementById('debug-tris').textContent = `Triangles: ${info.render.triangles}`;
        document.getElementById('debug-colliders').textContent = `Solid Colliders: ${this.physics.boxes.length} Boxes + ${this.physics.cylinders.length} Cylinders`;
        document.getElementById('debug-coords').textContent = `Pos: (${this.player.x.toFixed(1)}m, y=${this.player.y.toFixed(2)}m, ${this.player.z.toFixed(1)}m) | ${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E`;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new IITKGPOpenWorldGame();
});
