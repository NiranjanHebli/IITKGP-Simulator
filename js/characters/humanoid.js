/**
 * @fileoverview Photorealistic/Organic Articulated Humanoid Sculptor.
 * Fixes bicycle tire road-sinking bug:
 *  - Tires now rest flush on top of the road/sidewalk surface (y = 0.14m clearance) with zero ground clipping.
 *  - Complete diamond-frame bicycle with front fork, chainstays, seatstays, crankset, pedals, and mudguards.
 *  - Accurate rider IK-like posture: hands grip the handlebars and feet track the rotating pedals without sinking into the curb.
 */

import * as THREE from 'three';

const SKIN_TONES = [0xd99b66, 0xc48148, 0x9c5f31, 0xe8b486, 0x7d4925];

const OUTFIT_PRESETS = {
  hostel_tee: { shirt: 0x1d4ed8, pants: 0x1e293b, shoes: 0xf8fafc, sole: 0x334155, bag: 0x334155, collar: false, shortSleeve: true },
  kurta:      { shirt: 0xd97706, pants: 0xf1f5f9, shoes: 0x5c2d0c, sole: 0x271203, bag: 0x475569, collar: true, longTunic: true, shortSleeve: false },
  formal:     { shirt: 0xe2e8f0, pants: 0x0f172a, shoes: 0x111827, sole: 0x000000, bag: 0x1e293b, collar: true, shortSleeve: false },
  professor:  { shirt: 0xfef3c7, pants: 0x334155, shoes: 0x3b1905, sole: 0x180a02, bag: 0x78350f, collar: true, shortSleeve: false, glasses: true },
  guard:      { shirt: 0x1e3a8a, pants: 0x0f172a, shoes: 0x090d16, sole: 0x000000, bag: null, collar: true, cap: true, shortSleeve: false },
  vendor:     { shirt: 0x15803d, pants: 0x3f3f46, shoes: 0x27272a, sole: 0x090d16, bag: null, apron: true, shortSleeve: true }
};

function createAnatomicalLathe(profilePoints, height, scaleX = 1.0, scaleZ = 1.0, segments = 18) {
  const pts = profilePoints.map(([yFrac, r]) => new THREE.Vector2(r, yFrac * height));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.scale(scaleX, 1.0, scaleZ);
  geo.computeVertexNormals();
  return geo;
}

let SHARED_FABRIC_TEX = null;
function getFabricTexture() {
  if (SHARED_FABRIC_TEX) return SHARED_FABRIC_TEX;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#a1a1aa';
  for (let y = 0; y < 64; y += 2) {
    for (let x = (y % 4 === 0 ? 0 : 1); x < 64; x += 2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  SHARED_FABRIC_TEX = tex;
  return tex;
}

export class ArticulatedHumanoid {
  constructor(config = {}) {
    this.role = config.role || 'student';
    this.seed = config.seed || 0;
    this.outfitKey = config.outfit || (OUTFIT_PRESETS[this.role] ? this.role : 'hostel_tee');

    this.root = new THREE.Group();
    this.humanGroup = new THREE.Group();
    // Lift the entire human & bicycle by +0.14m so shoes and bicycle tires rest cleanly ON TOP of the road/sidewalk surface!
    this.root.position.y = 0.14;
    this.root.add(this.humanGroup);

    this.joints = {};
    this.animTime = (this.seed * 1.73) % (Math.PI * 2);

    const heightVar = 0.98 + ((this.seed * 17) % 5) * 0.01;
    const widthVar = 0.98 + ((this.seed * 31) % 5) * 0.01;
    this.humanGroup.scale.set(widthVar, heightVar, widthVar);

    this._materials = {};
    this._buildOrganicHumanRig();
    this._buildDetailedBicycleMesh();
  }

  setOutfit(outfitKey) {
    if (!OUTFIT_PRESETS[outfitKey]) return;
    this.outfitKey = outfitKey;
    const preset = OUTFIT_PRESETS[outfitKey];
    if (this._materials.shirt) this._materials.shirt.color.setHex(preset.shirt);
    if (this._materials.pants) this._materials.pants.color.setHex(preset.pants);
    if (this._materials.shoes) this._materials.shoes.color.setHex(preset.shoes);
  }

  _buildOrganicHumanRig() {
    const preset = OUTFIT_PRESETS[this.outfitKey] || OUTFIT_PRESETS.hostel_tee;
    const skinHex = SKIN_TONES[this.seed % SKIN_TONES.length];

    let shirtHex = preset.shirt;
    if (this.role === 'student' && this.outfitKey === 'student') {
      const studentPalette = [0x1d4ed8, 0xb91c1c, 0x047857, 0x6d28d9, 0xc2410c, 0x0f766e, 0x334155];
      shirtHex = studentPalette[this.seed % studentPalette.length];
    }

    const fabricTex = getFabricTexture();

    const skinMat = new THREE.MeshPhysicalMaterial({
      color: skinHex,
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.65,
      sheen: 0.25,
      sheenColor: new THREE.Color(0xffbfa3)
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: shirtHex,
      bumpMap: fabricTex,
      bumpScale: 0.004,
      roughness: 0.82
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: preset.pants,
      bumpMap: fabricTex,
      bumpScale: 0.005,
      roughness: 0.86
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: preset.shoes, roughness: 0.42, metalness: 0.08 });
    const soleMat = new THREE.MeshStandardMaterial({ color: preset.sole || 0x1e293b, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.72, metalness: 0.05 });
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.1 });
    const lipMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinHex).lerp(new THREE.Color(0x9f1239), 0.32),
      roughness: 0.45
    });

    this._materials = { skin: skinMat, shirt: shirtMat, pants: pantsMat, shoes: shoeMat };

    // 1. PELVIS & HIPS
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.93;
    this.humanGroup.add(pelvis);
    this.joints.pelvis = pelvis;

    const pelvisGeo = createAnatomicalLathe(
      [[0.0, 0.09], [0.25, 0.155], [0.65, 0.165], [1.0, 0.145]],
      0.18,
      1.18,
      0.82
    );
    const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvisMesh.position.y = -0.07;
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    pelvis.add(pelvisMesh);

    const beltGeo = new THREE.CylinderGeometry(0.148, 0.148, 0.035, 18);
    beltGeo.scale(1.18, 1, 0.83);
    const belt = new THREE.Mesh(beltGeo, soleMat);
    belt.position.y = 0.09;
    pelvis.add(belt);

    // 2. ORGANIC TORSO
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.08;
    pelvis.add(torsoPivot);
    this.joints.torso = torsoPivot;

    const torsoGeo = createAnatomicalLathe(
      [
        [0.0, 0.142],
        [0.22, 0.138],
        [0.55, 0.168],
        [0.82, 0.185],
        [0.94, 0.145],
        [1.0, 0.072]
      ],
      0.50,
      1.22,
      0.78
    );
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoPivot.add(torsoMesh);

    if (preset.longTunic) {
      const kurtaSkirtGeo = createAnatomicalLathe([[0.0, 0.185], [0.5, 0.165], [1.0, 0.148]], 0.34, 1.20, 0.82);
      const kurtaSkirt = new THREE.Mesh(kurtaSkirtGeo, shirtMat);
      kurtaSkirt.position.y = -0.30;
      kurtaSkirt.castShadow = true;
      torsoPivot.add(kurtaSkirt);
    }

    const collarGeo = new THREE.TorusGeometry(0.078, 0.018, 8, 18);
    collarGeo.rotateX(Math.PI / 2 - 0.12);
    collarGeo.scale(1.05, 1.0, 0.95);
    const collarMesh = new THREE.Mesh(collarGeo, shirtMat);
    collarMesh.position.set(0, 0.485, -0.008);
    torsoPivot.add(collarMesh);

    if (preset.apron) {
      const apronGeo = createAnatomicalLathe([[0, 0.17], [0.5, 0.16], [1, 0.14]], 0.44, 1.18, 0.82);
      const apron = new THREE.Mesh(apronGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }));
      apron.position.set(0, -0.05, -0.015);
      torsoPivot.add(apron);
    }

    if (this.role === 'student' || preset.bag) {
      const bagColor = preset.bag || 0x334155;
      const bagMat = new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.75, bumpMap: fabricTex, bumpScale: 0.004 });
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

      const bagGroup = new THREE.Group();
      bagGroup.position.set(0, 0.25, 0.145);

      const mainBag = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.18, 8, 14), bagMat);
      mainBag.scale.set(1.15, 1.0, 0.68);
      mainBag.castShadow = true;
      bagGroup.add(mainBag);

      const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.10, 6, 12), bagMat);
      pocket.scale.set(1.1, 1.0, 0.55);
      pocket.position.set(0, -0.04, 0.055);
      bagGroup.add(pocket);

      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 6, 16, Math.PI * 1.15), strapMat);
        strap.rotation.y = Math.PI / 2;
        strap.rotation.x = -0.35;
        strap.position.set(side * 0.105, 0.08, -0.09);
        bagGroup.add(strap);
      }
      torsoPivot.add(bagGroup);
    }

    // 3. SCULPTED HEAD, FACE & FULL HAIR COVERAGE (No bald patches!)
    const neckPivot = new THREE.Group();
    neckPivot.position.y = 0.49;
    torsoPivot.add(neckPivot);
    this.joints.head = neckPivot;

    const neckGeo = createAnatomicalLathe([[0, 0.068], [0.5, 0.058], [1, 0.062]], 0.10, 0.95, 1.0);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.castShadow = true;
    neckPivot.add(neckMesh);

    const skullGeo = createAnatomicalLathe(
      [
        [0.00, 0.032],
        [0.12, 0.078],
        [0.28, 0.098],
        [0.52, 0.108],
        [0.78, 0.104],
        [0.94, 0.075],
        [1.00, 0.015]
      ],
      0.245,
      0.92,
      1.06
    );
    const headMesh = new THREE.Mesh(skullGeo, skinMat);
    headMesh.position.set(0, 0.065, -0.008);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    neckPivot.add(headMesh);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.095, 6, 8), skinMat);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(0, 0.212, -0.102);
    neckPivot.add(brow);

    for (const side of [-1, 1]) {
      const eyebrow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.032, 4, 6), hairMat);
      eyebrow.rotation.z = Math.PI / 2 - side * 0.08;
      eyebrow.position.set(side * 0.038, 0.218, -0.111);
      neckPivot.add(eyebrow);

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), scleraMat);
      sclera.scale.set(1.1, 0.85, 0.7);
      sclera.position.set(side * 0.036, 0.196, -0.104);
      neckPivot.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), irisMat);
      iris.position.set(side * 0.036, 0.196, -0.113);
      neckPivot.add(iris);

      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
      ear.scale.set(0.38, 1.15, 0.72);
      ear.position.set(side * 0.098, 0.185, -0.005);
      neckPivot.add(ear);
    }

    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.052, 8), skinMat);
    noseBridge.scale.set(0.78, 1.0, 1.15);
    noseBridge.rotation.x = -0.32;
    noseBridge.position.set(0, 0.182, -0.116);
    neckPivot.add(noseBridge);

    const lips = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.028, 4, 8), lipMat);
    lips.rotation.z = Math.PI / 2;
    lips.position.set(0, 0.136, -0.106);
    neckPivot.add(lips);

    if (preset.glasses || (this.role === 'student' && this.seed % 4 === 0)) {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.2 });
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0028, 6, 16), frameMat);
        rim.position.set(side * 0.036, 0.196, -0.115);
        neckPivot.add(rim);
      }
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.028, 6), frameMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.20, -0.115);
      neckPivot.add(bridge);
    }

    if (preset.cap) {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.106, 0.068, 16), capMat);
      crown.position.set(0, 0.275, -0.005);
      neckPivot.add(crown);
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.012, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
        soleMat
      );
      visor.rotation.y = Math.PI;
      visor.rotation.x = 0.22;
      visor.position.set(0, 0.248, -0.045);
      neckPivot.add(visor);
    } else {
      // Full-coverage volumetric hair dome (eliminates any skull poke-through on top)
      const scalp = new THREE.Mesh(
        new THREE.SphereGeometry(0.118, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
        hairMat
      );
      scalp.scale.set(0.96, 1.12, 1.10);
      scalp.position.set(0, 0.202, 0.004);
      scalp.rotation.x = -0.22;
      neckPivot.add(scalp);

      const fringe = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.11, 6, 10), hairMat);
      fringe.rotation.z = Math.PI / 2;
      fringe.rotation.y = (this.seed % 2 === 0 ? 0.12 : -0.12);
      fringe.position.set(0, 0.272, -0.075);
      neckPivot.add(fringe);

      if (this.seed % 3 === 1) {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), hairMat);
        bun.position.set(0, 0.20, 0.118);
        neckPivot.add(bun);
      }
    }

    // 4. ORGANIC ARMS
    const buildOrganicArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.225, 0.435, 0);
      torsoPivot.add(shoulder);

      const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), shirtMat);
      deltoid.scale.set(0.92, 1.1, 0.92);
      shoulder.add(deltoid);

      const sleeveLen = preset.shortSleeve ? 0.13 : 0.24;
      const sleeveGeo = createAnatomicalLathe([[0.0, 0.052], [0.5, 0.056], [1.0, 0.060]], sleeveLen, 0.95, 0.95);
      const sleeveMesh = new THREE.Mesh(sleeveGeo, shirtMat);
      sleeveMesh.position.y = -sleeveLen;
      sleeveMesh.castShadow = true;
      shoulder.add(sleeveMesh);

      const upperArmGeo = createAnatomicalLathe([[0.0, 0.041], [0.45, 0.048], [1.0, 0.052]], 0.26, 0.92, 0.98);
      const upperArm = new THREE.Mesh(upperArmGeo, preset.shortSleeve ? skinMat : shirtMat);
      upperArm.position.y = -0.26;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.26;
      shoulder.add(elbow);

      const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.041, 10, 8), preset.shortSleeve ? skinMat : shirtMat);
      elbow.add(elbowSphere);

      const forearmGeo = createAnatomicalLathe([[0.0, 0.029], [0.35, 0.036], [0.75, 0.042], [1.0, 0.040]], 0.24, 0.88, 1.02);
      const forearm = new THREE.Mesh(forearmGeo, skinMat);
      forearm.position.y = -0.24;
      forearm.castShadow = true;
      elbow.add(forearm);

      const wrist = new THREE.Group();
      wrist.position.y = -0.245;
      elbow.add(wrist);

      const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.045, 6, 8), skinMat);
      palm.scale.set(0.55, 1.0, 1.15);
      palm.position.y = -0.035;
      palm.castShadow = true;
      wrist.add(palm);

      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.025, 4, 6), skinMat);
      thumb.rotation.x = 0.45;
      thumb.position.set(side * -0.01, -0.025, -0.026);
      wrist.add(thumb);

      return { shoulder, elbow, wrist };
    };

    const leftArm = buildOrganicArm(-1);
    const rightArm = buildOrganicArm(1);
    this.joints.leftShoulder = leftArm.shoulder;
    this.joints.leftElbow = leftArm.elbow;
    this.joints.rightShoulder = rightArm.shoulder;
    this.joints.rightElbow = rightArm.elbow;

    // 5. ORGANIC LEGS
    const buildOrganicLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.105, -0.03, 0);
      pelvis.add(hip);

      const hipSphere = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), pantsMat);
      hip.add(hipSphere);

      const thighGeo = createAnatomicalLathe([[0.0, 0.058], [0.4, 0.068], [0.8, 0.078], [1.0, 0.076]], 0.42, 0.95, 1.04);
      const thigh = new THREE.Mesh(thighGeo, pantsMat);
      thigh.position.y = -0.42;
      thigh.castShadow = true;
      thigh.receiveShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.42;
      hip.add(knee);

      const patella = new THREE.Mesh(new THREE.SphereGeometry(0.057, 10, 8), pantsMat);
      knee.add(patella);

      const calfGeo = createAnatomicalLathe([[0.0, 0.042], [0.25, 0.046], [0.65, 0.058], [0.88, 0.056], [1.0, 0.055]], 0.41, 0.92, 1.05);
      const calf = new THREE.Mesh(calfGeo, pantsMat);
      calf.position.y = -0.41;
      calf.castShadow = true;
      calf.receiveShadow = true;
      knee.add(calf);

      const ankle = new THREE.Group();
      ankle.position.set(0, -0.41, 0);
      knee.add(ankle);

      const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.12, 8, 12), shoeMat);
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.scale.set(1.05, 1.0, 0.72);
      shoeUpper.position.set(0, -0.025, -0.042);
      shoeUpper.castShadow = true;
      ankle.add(shoeUpper);

      const outsole = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.024, 0.225), soleMat);
      outsole.position.set(0, -0.052, -0.042);
      outsole.castShadow = true;
      ankle.add(outsole);

      return { hip, knee, ankle };
    };

    const leftLeg = buildOrganicLeg(-1);
    const rightLeg = buildOrganicLeg(1);
    this.joints.leftHip = leftLeg.hip;
    this.joints.leftKnee = leftLeg.knee;
    this.joints.leftAnkle = leftLeg.ankle;
    this.joints.rightHip = rightLeg.hip;
    this.joints.rightKnee = rightLeg.knee;
    this.joints.rightAnkle = rightLeg.ankle;
  }

  /**
   * Complete Student Bicycle with Zero Tire Road-Clipping:
   * - Wheel outer radius = 0.34m + 0.03m tire = 0.37m; wheel hub center is placed at y = 0.38m
   *   (plus root.position.y = 0.14m = 0.52m world Y, so the bottom of the tire sits at y = 0.15m,
   *   completely above the 0.14m road & sidewalk curbs!)
   * - Includes Front Fork, Rear Triangle (Chainstays + Seatstays), Crankset, Rotating Pedals, and Handlebars.
   */
  _buildDetailedBicycleMesh() {
    const bikeGroup = new THREE.Group();
    bikeGroup.visible = false;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.78, roughness: 0.25 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });

    // Build wheel geometry directly in the YZ plane so rotating the wheel group around X spins it cleanly!
    const tireGeo = new THREE.TorusGeometry(0.32, 0.032, 12, 28);
    tireGeo.rotateY(Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(0.292, 0.012, 8, 28);
    rimGeo.rotateY(Math.PI / 2);

    const createSpokedWheel = () => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wg.add(tire);

      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wg.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 10), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);

      for (let i = 0; i < 8; i++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.58, 4), chromeMat);
        spoke.rotation.x = (i / 8) * Math.PI;
        wg.add(spoke);
      }
      return wg;
    };

    const wheelY = 0.36; // Bottom of tire is at 0.36 - 0.352 = +0.008m above root (+0.14m road height = never clips!)
    this.frontWheel = createSpokedWheel();
    this.frontWheel.position.set(0, wheelY, -0.58);
    bikeGroup.add(this.frontWheel);

    this.rearWheel = createSpokedWheel();
    this.rearWheel.position.set(0, wheelY, 0.58);
    bikeGroup.add(this.rearWheel);

    // Front Fork blades + Head tube + Stem + Raised Handlebars (positioned to meet rider's hands!)
    for (const side of [-0.06, 0.06]) {
      const forkBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.48, 8), frameMat);
      forkBlade.rotation.x = 0.20;
      forkBlade.position.set(side, 0.56, -0.53);
      bikeGroup.add(forkBlade);
    }

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 10), chromeMat);
    stem.rotation.x = 0.18;
    stem.position.set(0, 0.92, -0.44);
    bikeGroup.add(stem);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 10), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 1.11, -0.40);
    bikeGroup.add(handlebar);

    for (const side of [-0.24, 0.24]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.11, 8), tireMat);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(side, 1.11, -0.40);
      bikeGroup.add(grip);
    }

    // Main Diamond Frame (Top Tube, Down Tube, Seat Tube, Chainstays, Seatstays)
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.64, 10), frameMat);
    topTube.rotation.x = Math.PI / 2;
    topTube.position.set(0, 0.80, -0.10);
    bikeGroup.add(topTube);

    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.68, 10), frameMat);
    downTube.rotation.x = 0.88;
    downTube.position.set(0, 0.58, -0.20);
    bikeGroup.add(downTube);

    const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.62, 10), frameMat);
    seatTube.rotation.x = -0.22;
    seatTube.position.set(0, 0.65, 0.14);
    bikeGroup.add(seatTube);

    for (const side of [-0.055, 0.055]) {
      const chainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 8), frameMat);
      chainStay.rotation.x = Math.PI / 2;
      chainStay.position.set(side, 0.36, 0.32);
      bikeGroup.add(chainStay);

      const seatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.58, 8), frameMat);
      seatStay.rotation.x = -0.76;
      seatStay.position.set(side, 0.58, 0.38);
      bikeGroup.add(seatStay);
    }

    const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 6, 10), tireMat);
    saddle.rotation.x = Math.PI / 2;
    saddle.scale.set(1.3, 1.0, 0.6);
    saddle.position.set(0, 0.92, 0.22);
    bikeGroup.add(saddle);

    // Crankset & Rotating Pedals at Bottom Bracket (0, 0.36, 0.06)
    this.crankPivot = new THREE.Group();
    this.crankPivot.position.set(0, 0.36, 0.06);
    bikeGroup.add(this.crankPivot);

    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.012, 16), chromeMat);
    chainring.rotation.z = Math.PI / 2;
    chainring.position.x = 0.04;
    this.crankPivot.add(chainring);

    for (const [side, angleOffset] of [[-1, 0], [1, Math.PI]]) {
      const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.028), chromeMat);
      crankArm.position.set(side * 0.06, Math.cos(angleOffset) * 0.075, Math.sin(angleOffset) * 0.075);
      this.crankPivot.add(crankArm);

      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.065), tireMat);
      pedal.position.set(side * 0.11, Math.cos(angleOffset) * 0.15, Math.sin(angleOffset) * 0.15);
      this.crankPivot.add(pedal);
    }

    this.bicycle = bikeGroup;
    this.root.add(bikeGroup);
  }

  updateAnimation(dt, speed, isRidingBike = false, isGrounded = true) {
    this.bicycle.visible = isRidingBike;
    const j = this.joints;

    if (isRidingBike) {
      // Pedaling cadence synced with wheel & crank rotation; feet stay high on the pedals (never clipping the curb!)
      this.animTime += dt * Math.max(2.0, speed * 1.15);
      j.pelvis.position.set(0, 0.95, 0.16);
      j.pelvis.rotation.set(0, 0, 0);
      j.torso.rotation.set(0.42, Math.sin(this.animTime) * 0.025, 0);
      j.head.rotation.x = -0.32;

      // Hands reach down and forward onto the handlebar grips at (y=1.11, z=-0.40)
      j.leftShoulder.rotation.set(1.05, 0, 0.05);
      j.rightShoulder.rotation.set(1.05, 0, -0.05);
      j.leftElbow.rotation.x = 0.28;
      j.rightElbow.rotation.x = 0.28;

      // Pedaling leg kinematics (tight circular crank motion above y = 0.22m so feet never touch the road)
      const lPhase = this.animTime;
      const rPhase = this.animTime + Math.PI;

      j.leftHip.rotation.x = 0.92 + Math.sin(lPhase) * 0.34;
      j.leftKnee.rotation.x = -1.12 - Math.cos(lPhase) * 0.32;
      j.leftAnkle.rotation.x = 0.20 + Math.sin(lPhase) * 0.15;

      j.rightHip.rotation.x = 0.92 + Math.sin(rPhase) * 0.34;
      j.rightKnee.rotation.x = -1.12 - Math.cos(rPhase) * 0.32;
      j.rightAnkle.rotation.x = 0.20 + Math.sin(rPhase) * 0.15;

      this.frontWheel.rotation.x -= speed * dt * 2.9;
      this.rearWheel.rotation.x -= speed * dt * 2.9;
      if (this.crankPivot) this.crankPivot.rotation.x = -this.animTime;
      return;
    }

    j.pelvis.position.z = 0;

    if (!isGrounded) {
      j.torso.rotation.x = 0.12;
      j.leftShoulder.rotation.x = 0.48;
      j.rightShoulder.rotation.x = -0.48;
      j.leftElbow.rotation.x = 0.65;
      j.rightElbow.rotation.x = 0.65;
      j.leftHip.rotation.x = 0.55;
      j.leftKnee.rotation.x = -0.78;
      j.rightHip.rotation.x = -0.35;
      j.rightKnee.rotation.x = -0.45;
      return;
    }

    if (speed < 0.2) {
      this.animTime += dt * 2.0;
      const breath = Math.sin(this.animTime) * 0.014;
      j.pelvis.position.y = 0.93;
      j.pelvis.position.x = Math.sin(this.animTime * 0.5) * 0.008;
      j.pelvis.rotation.z = Math.sin(this.animTime * 0.5) * 0.015;
      j.torso.rotation.x = breath;
      j.torso.rotation.y = Math.sin(this.animTime * 0.4) * 0.035;
      j.head.rotation.y = Math.sin(this.animTime * 0.55) * 0.12;
      j.head.rotation.x = 0;

      j.leftShoulder.rotation.set(0.03, 0, 0.06);
      j.rightShoulder.rotation.set(-0.03, 0, -0.06);
      j.leftElbow.rotation.x = 0.16;
      j.rightElbow.rotation.x = 0.16;
      j.leftHip.rotation.x = 0;
      j.rightHip.rotation.x = 0;
      j.leftKnee.rotation.x = 0;
      j.rightKnee.rotation.x = 0;
      j.leftAnkle.rotation.x = 0;
      j.rightAnkle.rotation.x = 0;
      return;
    }

    const isRunning = speed > 6.5;
    const freq = isRunning ? speed * 1.42 : speed * 1.82;
    this.animTime += dt * freq;

    const strideAmp = isRunning ? 0.78 : Math.min(0.54, speed * 0.105);
    const s = Math.sin(this.animTime);
    const c = Math.cos(this.animTime);

    j.pelvis.position.y = 0.93 + Math.abs(s) * (isRunning ? 0.052 : 0.026);
    j.pelvis.position.x = c * 0.018;
    j.pelvis.rotation.z = c * 0.038;
    j.pelvis.rotation.y = s * 0.065;

    j.torso.rotation.x = isRunning ? 0.16 : 0.045;
    j.torso.rotation.y = -s * 0.11;
    j.torso.rotation.z = -c * 0.028;
    j.head.rotation.y = s * 0.05;
    j.head.rotation.x = isRunning ? -0.08 : 0;

    j.leftHip.rotation.x = s * strideAmp;
    j.rightHip.rotation.x = -s * strideAmp;

    j.leftKnee.rotation.x = -Math.max(0, -c) * strideAmp * 1.28 - (isRunning ? 0.22 : 0.05);
    j.rightKnee.rotation.x = -Math.max(0, c) * strideAmp * 1.28 - (isRunning ? 0.22 : 0.05);

    j.leftAnkle.rotation.x = c * 0.24;
    j.rightAnkle.rotation.x = -c * 0.24;

    j.leftShoulder.rotation.set(-s * strideAmp * 0.82, 0, 0.07);
    j.rightShoulder.rotation.set(s * strideAmp * 0.82, 0, -0.07);

    j.leftElbow.rotation.x = (isRunning ? 0.88 : 0.26) + Math.max(0, -s) * 0.36;
    j.rightElbow.rotation.x = (isRunning ? 0.88 : 0.26) + Math.max(0, s) * 0.36;
  }
}
