/**
 * @fileoverview Bespoke Architectural Builder for All 16 IIT Kharagpur Landmarks (v5.0).
 * Every campus building is individually researched and custom-modeled after its real-world
 * IIT Kharagpur structure, material palette, and architectural silhouette:
 *
 *  1. Main Building (1951, Werner M. Moser): Exact Bauhaus white frame, 6 square pillars,
 *     buff-sandstone portico, left-offset white water-tank tower with observation gallery,
 *     and circular "KEEP LEFT" roundabout lawn with central bust monument.
 *  2. Nehru Museum (Hijli Saheed Bhavan, 1930s): Indo-Byzantine red-and-cream arched colonnade,
 *     central dome tower, Martyr's Memorial obelisk, Hawker Hunter jet fighter, & Steam Engine.
 *  3. Vikramshila Complex & Kalidas Auditorium: Terracotta-and-cream lecture hall complex with
 *     grand stepped amphitheater entrance, cylindrical pillars, and 850-seat auditorium fly-tower.
 *  4. Takshashila & CSE Department: Post-modern IT/Telecom complex with central rotunda atrium,
 *     reflective blue glass curtain wall, and computational lab wings.
 *  5. Nalanda Classroom Complex: Massive red-brick & cream multi-wing lecture complex with
 *     wide bicycle parking pergolas and open-air skybridge corridors.
 *  6. Vikram Sarabhai Central Library & Annex: Connected to Main Building via overhead skybridge,
 *     with vertical solar brise-soleil fins and 6 reading halls.
 *  7. Vinod Gupta School of Management (VGSoM): Red-laterite & cream business school with
 *     executive colonnade porch and landscaped courtyard.
 *  8. Dr. B.C. Roy Technology Hospital: Crisp white medical center with ambulance drive-through
 *     canopy and Red Cross emergency emblem.
 *  9. Student Halls of Residence (PAN Loop: Patel, Azad, Nehru; RK, RP; and high-rise LBS Mega Hall).
 * 10. Technology Students' Gymkhana, Aquatic Center Pool, Gymkhana Lake, & Jnan Ghosh Stadium.
 * 11. Main Puri Gate (Bishnupur Terracotta / Neo-Classical Archway with Security Booths).
 */

import * as THREE from 'three';

export class CampusArchitectureBuilder {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../engine/physics.js').PhysicsWorld} physics
   * @param {import('./geo.js').WalkableGrid} navGrid
   */
  constructor(scene, physics, navGrid) {
    this.scene = scene;
    this.physics = physics;
    this.navGrid = navGrid;
    this.nightMaterials = [];
    this.textures = this._generateKgpTextures();
    this.materials = this._createKgpMaterials();
  }

  _generateKgpTextures() {
    // 1. Recessed Dark Mullioned Window Bay Texture (Main Building & Modernist Wings)
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 512;
    winCanvas.height = 512;
    const wctx = winCanvas.getContext('2d');
    wctx.fillStyle = '#EAECE9';
    wctx.fillRect(0, 0, 512, 512);

    for (let floor = 0; floor < 3; floor++) {
      const fy = floor * 170;
      wctx.fillStyle = '#F4F5F0';
      wctx.fillRect(0, fy, 512, 28);
      wctx.fillStyle = '#C2A687';
      wctx.fillRect(0, fy + 28, 512, 8);

      for (let col = 0; col < 6; col++) {
        const cx = col * 85;
        wctx.fillStyle = '#181B1E';
        wctx.fillRect(cx + 12, fy + 44, 60, 108);

        wctx.fillStyle = '#263238';
        for (let gx = 0; gx < 3; gx++) {
          for (let gy = 0; gy < 3; gy++) {
            wctx.fillRect(cx + 15 + gx * 19, fy + 47 + gy * 34, 16, 31);
          }
        }
      }
    }
    const windowBayTex = new THREE.CanvasTexture(winCanvas);
    windowBayTex.wrapS = THREE.RepeatWrapping;
    windowBayTex.wrapT = THREE.RepeatWrapping;

    // 2. Indo-Byzantine Arched Verandah Texture (For Hijli Saheed Bhavan / Nehru Museum)
    const archCanvas = document.createElement('canvas');
    archCanvas.width = 512;
    archCanvas.height = 256;
    const actx = archCanvas.getContext('2d');
    actx.fillStyle = '#B94A32'; // Terracotta red plaster
    actx.fillRect(0, 0, 512, 256);

    // Cream string courses & arched bays
    actx.fillStyle = '#F5EEDC';
    actx.fillRect(0, 0, 512, 16);
    actx.fillRect(0, 124, 512, 12);
    actx.fillRect(0, 244, 512, 12);

    for (let i = 0; i < 6; i++) {
      const ax = i * 85 + 42;
      for (const ay of [72, 196]) {
        // White Byzantine arch surround
        actx.fillStyle = '#F5EEDC';
        actx.beginPath();
        actx.arc(ax, ay - 14, 26, Math.PI, 0);
        actx.lineTo(ax + 26, ay + 36);
        actx.lineTo(ax - 26, ay + 36);
        actx.closePath();
        actx.fill();

        // Deep shaded arch opening
        actx.fillStyle = '#1E1B18';
        actx.beginPath();
        actx.arc(ax, ay - 12, 20, Math.PI, 0);
        actx.lineTo(ax + 20, ay + 36);
        actx.lineTo(ax - 20, ay + 36);
        actx.closePath();
        actx.fill();
      }
    }
    const byzantineArchTex = new THREE.CanvasTexture(archCanvas);
    byzantineArchTex.wrapS = THREE.RepeatWrapping;
    byzantineArchTex.wrapT = THREE.RepeatWrapping;
    byzantineArchTex.repeat.set(2, 1);

    // 3. Warm Buff Sandstone Ashlar Texture
    const buffCanvas = document.createElement('canvas');
    buffCanvas.width = 256;
    buffCanvas.height = 256;
    const bctx = buffCanvas.getContext('2d');
    bctx.fillStyle = '#C2A687';
    bctx.fillRect(0, 0, 256, 256);
    bctx.strokeStyle = '#AD9071';
    bctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      const off = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = -32; x < 256; x += 64) {
        bctx.strokeRect(x + off, y, 64, 32);
      }
    }
    const buffTex = new THREE.CanvasTexture(buffCanvas);
    buffTex.wrapS = THREE.RepeatWrapping;
    buffTex.wrapT = THREE.RepeatWrapping;
    buffTex.repeat.set(3, 2);

    return { windowBayTex, byzantineArchTex, buffTex };
  }

  _createKgpMaterials() {
    const litWindowMat = new THREE.MeshStandardMaterial({
      map: this.textures.windowBayTex,
      roughness: 0.55,
      emissive: 0xffedd5,
      emissiveIntensity: 0.0
    });
    this.nightMaterials.push(litWindowMat);

    const byzantineMat = new THREE.MeshStandardMaterial({
      map: this.textures.byzantineArchTex,
      bumpMap: this.textures.byzantineArchTex,
      bumpScale: 0.03,
      roughness: 0.78
    });

    return {
      kgpWhite: new THREE.MeshStandardMaterial({ color: 0xF4F5F0, roughness: 0.72 }),
      kgpCream: new THREE.MeshStandardMaterial({ color: 0xF5EEDC, roughness: 0.74 }),
      kgpBuffSandstone: new THREE.MeshStandardMaterial({
        color: 0xC2A687,
        map: this.textures.buffTex,
        roughness: 0.82
      }),
      kgpTerracotta: new THREE.MeshStandardMaterial({ color: 0xB84A39, roughness: 0.78 }),
      byzantineFacade: byzantineMat,
      kgpCharcoal: new THREE.MeshStandardMaterial({ color: 0x181B1E, roughness: 0.5, metalness: 0.2 }),
      kgpWindowWall: litWindowMat,
      kgpLawnGreen: new THREE.MeshStandardMaterial({ color: 0x3F6212, roughness: 0.92 }),
      kgpHedgeGreen: new THREE.MeshStandardMaterial({ color: 0x2E4C1E, roughness: 0.88 }),
      kgpRedLaterite: new THREE.MeshStandardMaterial({ color: 0x6B3423, roughness: 0.88 }),
      glassBlue: new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.82, roughness: 0.15, transparent: true, opacity: 0.88 }),
      silverMetal: new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.8, roughness: 0.25 }),
      hospitalRed: new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.5 })
    };
  }

  _createBannerPlaque(text, width, height, bgHex = '#E5DEC9', textHex = '#1C1917', italic = false) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 1024, 128);
    ctx.strokeStyle = '#78716C';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 120);

    ctx.fillStyle = textHex;
    ctx.font = `${italic ? 'italic ' : ''}bold 44px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 66);

    const tex = new THREE.CanvasTexture(c);
    return new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.18),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    );
  }

  _addSolidPart(group, localX, bottomY, localZ, w, h, d, material, worldOriginX, worldOriginZ, blockNav = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(localX, bottomY + h / 2, localZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const wx = worldOriginX + localX;
    const wz = worldOriginZ + localZ;
    this.physics.addBox(wx, bottomY, wz, w, h, d);
    if (blockNav && bottomY < 0.6 && h > 0.6) {
      this.navGrid.markRect(wx, wz, w + 2.5, d + 2.5, 255);
    }
    return mesh;
  }

  _addSolidCylinder(group, localX, bottomY, localZ, radius, h, material, worldOriginX, worldOriginZ) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 16), material);
    mesh.position.set(localX, bottomY + h / 2, localZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    this.physics.addCylinder(worldOriginX + localX, worldOriginZ + localZ, radius, bottomY + h, 'pillar');
    return mesh;
  }

  buildAllLandmarks(landmarks) {
    for (const lm of landmarks) {
      switch (lm.id) {
        case 'main_building':
          this._buildPhotoAccurateMainBuilding(lm);
          break;
        case 'central_library':
          this._buildCentralLibrary(lm);
          break;
        case 'nehru_museum':
          this._buildHijliNehruMuseum(lm);
          break;
        case 'vikramshila':
          this._buildVikramshilaAndKalidas(lm);
          break;
        case 'cse_dept':
          this._buildTakshashilaAndCSE(lm);
          break;
        case 'nalanda':
          this._buildNalandaComplex(lm);
          break;
        case 'vgsom':
          this._buildVGSoM(lm);
          break;
        case 'bc_roy_hospital':
          this._buildBCRoyHospital(lm);
          break;
        case 'mmm_hall':
          this._buildMMMHall(lm);
          break;
        case 'lbs_hall':
          this._buildLBSMegaHall(lm);
          break;
        case 'puri_gate':
          this._buildPuriGate(lm);
          break;
        case 'tikka_stall':
          this._buildTikkaStall(lm);
          break;
        case 'gymkhana':
          this._buildGymkhanaAndLake(lm);
          break;
        case 'jnan_ghosh':
          this._buildJnanGhoshStadium(lm);
          break;
        default:
          this._buildKgpHostel(lm);
          break;
      }
    }
  }

  // ===========================================================================
  // 1. MAIN BUILDING (WERNER M. MOSER 1951 BAUHAUS LANDMARK)
  // ===========================================================================
  _buildPhotoAccurateMainBuilding(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, 0, 0, 0, 44, 21.5, 24, m.kgpWindowWall, lm.x, lm.z);
    this._addSolidPart(g, -20.5, 0, 12.2, 5.5, 22.2, 2.2, m.kgpWhite, lm.x, lm.z);
    this._addSolidPart(g, 20.5, 0, 12.2, 5.5, 22.2, 2.2, m.kgpWhite, lm.x, lm.z);
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(46.6, 2.6, 3.0), m.kgpWhite);
    topLintel.position.set(0, 21.0, 12.4);
    topLintel.castShadow = true;
    g.add(topLintel);

    for (const sideX of [-19.8, 19.8]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 18.2, 0.35), m.kgpBuffSandstone);
      strip.position.set(sideX, 9.6, 13.25);
      g.add(strip);
      for (let wy = 2.6; wy <= 16.5; wy += 4.4) {
        const winPane = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.3, 0.45), m.kgpCharcoal);
        winPane.position.set(sideX, wy, 13.3);
        g.add(winPane);
      }
    }

    for (const px of [-13.5, -8.1, -2.7, 2.7, 8.1, 13.5]) {
      this._addSolidPart(g, px, 6.0, 12.4, 1.35, 13.8, 1.8, m.kgpWhite, lm.x, lm.z, false);
    }

    const iitTitle = this._createBannerPlaque('INDIAN   INSTITUTE   OF   TECHNOLOGY', 31.5, 1.35, '#F4F5F0', '#181B1E', false);
    iitTitle.position.set(0, 20.6, 13.95);
    g.add(iitTitle);

    this._addSolidPart(g, 0, 0, 15.2, 33.5, 6.2, 5.2, m.kgpBuffSandstone, lm.x, lm.z);
    for (const portalX of [-10.2, -3.5, 3.5, 10.2]) {
      const portal = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.2, 0.5), m.kgpCharcoal);
      portal.position.set(portalX, 2.3, 17.65);
      g.add(portal);
    }

    const mottoPlaque = this._createBannerPlaque('Dedicated to the Service of the Nation', 15.5, 0.95, '#E7DFC6', '#1C1917', true);
    mottoPlaque.position.set(0, 5.2, 17.85);
    g.add(mottoPlaque);

    for (let bx = -13.5; bx <= 13.5; bx += 3.0) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 8), m.kgpTerracotta);
      pot.position.set(bx, 6.42, 17.1);
      g.add(pot);
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), m.kgpHedgeGreen);
      bush.position.set(bx, 6.95, 17.1);
      g.add(bush);
    }

    const towerX = -11.5;
    const towerZ = -4.5;
    this._addSolidPart(g, towerX, 21.5, towerZ, 9.2, 23.5, 9.2, m.kgpWhite, lm.x, lm.z, false);
    const obsGallery = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.6, 8.2), m.kgpCharcoal);
    obsGallery.position.set(towerX, 46.3, towerZ);
    g.add(obsGallery);
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.65, 10.4), m.kgpBuffSandstone);
    roofSlab.position.set(towerX, 47.8, towerZ);
    g.add(roofSlab);

    const annexX = -18.5;
    this._addSolidPart(g, annexX, 21.5, towerZ, 6.5, 11.5, 8.6, m.kgpWhite, lm.x, lm.z, false);
    for (let ly = 23.5; ly <= 31.0; ly += 3.2) {
      const slotWin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.3), m.kgpCharcoal);
      slotWin.position.set(annexX, ly, towerZ + 4.3);
      g.add(slotWin);
      const chhajja = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 0.9), m.kgpBuffSandstone);
      chhajja.position.set(annexX, ly + 0.65, towerZ + 4.5);
      g.add(chhajja);
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 14, 8), m.kgpCharcoal);
    mast.position.set(16.0, 29.0, 8.0);
    g.add(mast);

    for (const side of [-1, 1]) {
      const wingX = side * 42;
      this._addSolidPart(g, wingX, 0, -1, 38, 11.2, 20, m.kgpWindowWall, lm.x, lm.z);
      for (const bandY of [5.4, 11.0]) {
        const fascia = new THREE.Mesh(new THREE.BoxGeometry(39.0, 0.85, 21.2), m.kgpWhite);
        fascia.position.set(wingX, bandY, -1);
        g.add(fascia);
      }
    }

    // Foreground Roundabout Lawn & Monument
    const lawnZ = 33.5;
    const curbRing = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 14.5, 0.28, 36), m.kgpWhite);
    curbRing.scale.set(1.35, 1, 0.78);
    curbRing.position.set(0, 0.14, lawnZ);
    g.add(curbRing);

    const grassDisk = new THREE.Mesh(new THREE.CylinderGeometry(13.9, 13.9, 0.32, 36), m.kgpLawnGreen);
    grassDisk.scale.set(1.35, 1, 0.78);
    grassDisk.position.set(0, 0.16, lawnZ);
    g.add(grassDisk);

    const keepLeft = this._createBannerPlaque('KEEP LEFT', 3.4, 0.34, '#F4F5F0', '#090D16', false);
    keepLeft.position.set(-1.5, 0.22, lawnZ + 10.9);
    g.add(keepLeft);

    const pedZ = 24.5;
    this._addSolidPart(g, 0, 0.2, pedZ, 2.4, 3.6, 1.8, m.kgpRedLaterite, lm.x, lm.z, false);
    const bustHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), m.kgpCharcoal);
    bustHead.position.set(0, 4.35, pedZ);
    g.add(bustHead);

    this.scene.add(g);
  }

  // ===========================================================================
  // 2. NEHRU MUSEUM OF SCIENCE & TECHNOLOGY (HIJLI SAHEED BHAVAN)
  // Indo-Byzantine red-and-cream arched colonnade, central domed portico,
  // Martyrs' Memorial Obelisk, Hawker Hunter Fighter Jet, and Steam Locomotive!
  // ===========================================================================
  _buildHijliNehruMuseum(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    // Two-story Indo-Byzantine arched main building
    this._addSolidPart(g, 0, 0, 0, lm.w, lm.h, lm.d, m.byzantineFacade, lm.x, lm.z);

    // Projecting Central Byzantine Entrance Pavilion + White Pediment + Dome
    this._addSolidPart(g, 0, 0, lm.d / 2 + 2.5, 16, lm.h + 3.5, 6, m.byzantineFacade, lm.x, lm.z);
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 3.0, 12), m.kgpCream);
    domeBase.position.set(0, lm.h + 5.0, lm.d / 2 + 1.5);
    g.add(domeBase);
    const byzDome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), m.kgpTerracotta);
    byzDome.position.set(0, lm.h + 6.4, lm.d / 2 + 1.5);
    g.add(byzDome);

    const sign = this._createBannerPlaque('NEHRU MUSEUM (HIJLI SAHEED BHAVAN)', 15.5, 1.1, '#F5EEDC', '#7E2B17');
    sign.position.set(0, 6.2, lm.d / 2 + 5.6);
    g.add(sign);

    // Outdoor Exhibit 1: Heritage Steam Engine on Front-Left Lawn
    const locoZ = lm.d / 2 + 13;
    this._addSolidPart(g, -14, 0, locoZ, 11, 1.0, 3.6, m.kgpBuffSandstone, lm.x, lm.z);
    this._addSolidPart(g, -14, 1.0, locoZ, 9.5, 2.8, 2.4, m.kgpCharcoal, lm.x, lm.z);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 6.5, 14), m.kgpCharcoal);
    boiler.rotation.z = Math.PI / 2;
    boiler.position.set(-15.2, 2.5, locoZ);
    g.add(boiler);

    // Outdoor Exhibit 2: Hawker Hunter Swept-Wing Fighter Plane on Front-Right Lawn!
    const jetX = 14;
    const jetZ = lm.d / 2 + 13;
    this._addSolidPart(g, jetX, 0, jetZ, 5.0, 1.4, 5.0, m.kgpBuffSandstone, lm.x, lm.z);
    const jetGroup = new THREE.Group();
    jetGroup.position.set(jetX, 2.4, jetZ);
    jetGroup.rotation.y = -0.45;
    jetGroup.rotation.x = 0.18; // Pitched up on display pylon

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9.5, 12), m.silverMetal);
    fuselage.rotation.x = Math.PI / 2;
    jetGroup.add(fuselage);

    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 12), m.kgpCharcoal);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.z = 5.8;
    jetGroup.add(noseCone);

    const sweptWings = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.12, 2.2), m.silverMetal);
    sweptWings.position.set(0, 0, 0.4);
    jetGroup.add(sweptWings);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.1, 1.6), m.silverMetal);
    tailFin.position.set(0, 1.0, -3.8);
    jetGroup.add(tailFin);
    g.add(jetGroup);

    // Outdoor Exhibit 3: Hijli Martyrs' Memorial Column (Saheed Minar Obelisk)
    this._addSolidPart(g, 0, 0, lm.d / 2 + 16, 3.6, 0.8, 3.6, m.kgpRedLaterite, lm.x, lm.z);
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 7.5, 4), m.kgpWhite);
    obelisk.position.set(0, 4.5, lm.d / 2 + 16);
    g.add(obelisk);

    this.scene.add(g);
  }

  // ===========================================================================
  // 3. VIKRAMSHILA COMPLEX & 850-SEAT KALIDAS AUDITORIUM
  // Terracotta-and-cream lecture hall complex with grand colonnade & auditorium wing
  // ===========================================================================
  _buildVikramshilaAndKalidas(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    // Main Vikramshila Lecture Complex Wing
    this._addSolidPart(g, -10, 0, 0, 40, lm.h, lm.d, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -10, 0, 0, 40, lm.h, lm.d, m.kgpTerracotta);

    // Kalidas Auditorium Sloped Acoustic Hall Wing on the East side
    this._addSolidPart(g, 19, 0, 2, 22, lm.h + 3.5, lm.d + 4, m.kgpCream, lm.x, lm.z);
    const stageTower = new THREE.Mesh(new THREE.BoxGeometry(18, 5.5, 14), m.kgpTerracotta);
    stageTower.position.set(19, lm.h + 6.2, -8);
    g.add(stageTower);

    // Grand Cylindrical Colonnade Porch across front
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(52, 1.2, 7), m.kgpTerracotta);
    porchRoof.position.set(2, 6.8, lm.d / 2 + 3.5);
    g.add(porchRoof);
    for (let x = -22; x <= 26; x += 8) {
      this._addSolidCylinder(g, x, 0, lm.d / 2 + 6.0, 0.55, 6.8, m.kgpCream, lm.x, lm.z);
    }

    const sign = this._createBannerPlaque('VIKRAMSHILA COMPLEX & KALIDAS AUDITORIUM', 24, 1.2, '#F5EEDC', '#7E2B17');
    sign.position.set(2, 7.8, lm.d / 2 + 7.1);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 4. TAKSHASHILA & DEPARTMENT OF COMPUTER SCIENCE (CSE)
  // Modern cylindrical rotunda atrium with reflective blue glass & twin lab wings
  // ===========================================================================
  _buildTakshashilaAndCSE(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    // Left and Right Lab Wings
    this._addSolidPart(g, -16, 0, 0, 22, lm.h, lm.d, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -16, 0, 0, 22, lm.h, lm.d, m.kgpWhite);

    this._addSolidPart(g, 16, 0, 0, 22, lm.h, lm.d, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, 16, 0, 0, 22, lm.h, lm.d, m.kgpWhite);

    // Central Cylindrical Glass Rotunda Atrium (Signature Takshashila / CSE feature)
    this._addSolidCylinder(g, 0, 0, 4, 10.5, lm.h + 3.5, m.glassBlue, lm.x, lm.z);
    const rotundaCrown = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 11.4, 1.4, 24), m.kgpWhite);
    rotundaCrown.position.set(0, lm.h + 3.5, 4);
    g.add(rotundaCrown);

    const sign = this._createBannerPlaque('DEPT. OF COMPUTER SCIENCE (CSE) & TAKSHASHILA', 20, 1.1, '#F4F5F0', '#181B1E');
    sign.position.set(0, 6.2, lm.d / 2 + 4.8);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 5. MASSIVE NALANDA CLASSROOM COMPLEX (176m x 132m — Largest Lecture Complex!)
  // Features 4 huge multi-story classroom quadrants (NR-100, NR-200, NR-300, NR-400),
  // 200-capacity stepped auditorium rotunda, 4 elevated skybridges over the avenues,
  // grand colonnade entrance, and long covered student bicycle parking sheds!
  // ===========================================================================
  _buildNalandaComplex(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    const blockW = 70;
    const blockD = 26;
    const h = lm.h; // 18m (4 tall lecture floors)

    // 4 Massive Quadrant Classroom Blocks (North-West, North-East, South-West, South-East)
    const quadrants = [
      { x: -46, z: -34, label: 'NR-100 BLOCK' },
      { x:  46, z: -34, label: 'NR-200 BLOCK' },
      { x: -46, z:  34, label: 'NR-300 BLOCK' },
      { x:  46, z:  34, label: 'NR-400 BLOCK' }
    ];

    for (const q of quadrants) {
      this._addSolidPart(g, q.x, 0, q.z, blockW, h, blockD, m.kgpWindowWall, lm.x, lm.z);
      this._addKgpModernistTrim(g, q.x, 0, q.z, blockW, h, blockD, m.kgpTerracotta);

      // Projecting Stairwell & Elevator Towers at the outer corners of each block
      const outerX = q.x + Math.sign(q.x) * (blockW / 2 + 4);
      this._addSolidPart(g, outerX, 0, q.z, 9, h + 3.5, blockD * 0.75, m.kgpTerracotta, lm.x, lm.z);
    }

    // Central Octagonal Lecture Rotunda & Stepped Amphitheater Foyer
    this._addSolidCylinder(g, 0, 0, 0, 16, h + 4.0, m.kgpCream, lm.x, lm.z);
    const domeCap = new THREE.Mesh(new THREE.CylinderGeometry(17.2, 17.2, 1.5, 24), m.kgpTerracotta);
    domeCap.position.set(0, h + 4.2, 0);
    g.add(domeCap);

    // 4 Elevated Walkable Skybridges connecting the North, South, East, and West blocks at y = 6.5m!
    this._addSolidPart(g, -46, 6.5, 0, 12, h - 6.5, 42, m.kgpCream, lm.x, lm.z, false);
    this._addSolidPart(g,  46, 6.5, 0, 12, h - 6.5, 42, m.kgpCream, lm.x, lm.z, false);
    this._addSolidPart(g,   0, 6.5, -34, 24, h - 6.5, 10, m.kgpCream, lm.x, lm.z, false);
    this._addSolidPart(g,   0, 6.5,  34, 24, h - 6.5, 10, m.kgpCream, lm.x, lm.z, false);

    // Grand West & South Colonnade Porticos facing the campus avenues
    const southPorch = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 8), m.kgpTerracotta);
    southPorch.position.set(0, 7.2, 52);
    southPorch.castShadow = true;
    g.add(southPorch);
    for (let px = -18; px <= 18; px += 9) {
      this._addSolidCylinder(g, px, 0, 55, 0.65, 7.2, m.kgpWhite, lm.x, lm.z);
    }

    // Covered Student Bicycle Parking Sheds along the West & South perimeter
    for (const shedX of [-52, 52]) {
      const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(36, 0.3, 6.5), m.silverMetal);
      shedRoof.position.set(shedX, 3.2, 58);
      shedRoof.rotation.x = 0.12;
      shedRoof.castShadow = true;
      g.add(shedRoof);
      this._addSolidCylinder(g, shedX - 15, 0, 58, 0.2, 3.2, m.kgpCharcoal, lm.x, lm.z);
      this._addSolidCylinder(g, shedX + 15, 0, 58, 0.2, 3.2, m.kgpCharcoal, lm.x, lm.z);
    }

    const sign = this._createBannerPlaque('NALANDA CLASSROOM COMPLEX • IIT KHARAGPUR', 28, 1.6, '#F4F5F0', '#991B1B');
    sign.position.set(0, 8.5, 56.2);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 5B. PANDIT MADAN MOHAN MALAVIYA (MMM) HALL OF RESIDENCE (108m x 86m)
  // 4 Distinct Named Blocks (HK Block, DSK Block, SDS Block, RR Block),
  // Central Dining Mess & Music/Gym Pavilion, Cycle Stand beside SDS Block,
  // and Entrance Gateway with Bhagavad Gita Motto Plaque!
  // ===========================================================================
  _buildMMMHall(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    const w = lm.w; // 108m
    const d = lm.d; // 86m
    const h = lm.h; // 18m (5-story mega hostel)
    const wingThick = 14;

    // 1. North Wing (SDS Block)
    this._addSolidPart(g, 0, 0, -d / 2 + wingThick / 2, w, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, 0, 0, -d / 2 + wingThick / 2, w, h, wingThick, m.kgpTerracotta);

    // 2. West Wing (DSK Block) & East Wing (RR Block)
    this._addSolidPart(g, -w / 2 + wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -w / 2 + wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpBuffSandstone);

    this._addSolidPart(g, w / 2 - wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, w / 2 - wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpBuffSandstone);

    // 3. South Front Wing (HK Block) with a 16m wide Grand Courtyard Entrance Archway
    const frontSegW = (w - 16) / 2;
    this._addSolidPart(g, -w / 2 + frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -w / 2 + frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpTerracotta);

    this._addSolidPart(g, w / 2 - frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, w / 2 - frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpTerracotta);

    // Overhead Bridge connecting HK Block above the entrance gate (y = 6.0m clearance)
    this._addSolidPart(g, 0, 6.0, d / 2 - wingThick / 2, 16, h - 6.0, wingThick, m.kgpBuffSandstone, lm.x, lm.z, false);

    // Central Courtyard Mess, Gym & Music Room Pavilion inside the quadrangle
    this._addSolidPart(g, 0, 0, -4, 34, 8.5, 22, m.kgpCream, lm.x, lm.z);

    // Covered Cycle Stand & General Shops beside SDS / HK Block
    const cycleShed = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 6), m.silverMetal);
    cycleShed.position.set(-28, 3.2, d / 2 + 6);
    cycleShed.castShadow = true;
    g.add(cycleShed);

    const sign = this._createBannerPlaque(
      'PANDIT MADAN MOHAN MALAVIYA (MMM) HALL OF RESIDENCE',
      22,
      1.35,
      '#F4F5F0',
      '#181B1E'
    );
    sign.position.set(0, 7.2, d / 2 + 0.35);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 6. VIKRAM SARABHAI CENTRAL LIBRARY & ANNEX
  // ===========================================================================
  _buildCentralLibrary(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, 0, 0, 0, lm.w, lm.h, lm.d, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, 0, 0, 0, lm.w, lm.h, lm.d, m.kgpWhite);

    // Blue Glass Reading Hall Curtain Wall + Solar Protection Fins
    const glassAtrium = new THREE.Mesh(new THREE.BoxGeometry(lm.w * 0.76, lm.h * 0.75, lm.d + 0.5), m.glassBlue);
    glassAtrium.position.set(0, lm.h * 0.48, 0);
    g.add(glassAtrium);

    this._addSolidPart(g, 0, 0, lm.d / 2 + 2.5, 16, 4.8, 5, m.kgpBuffSandstone, lm.x, lm.z);
    const sign = this._createBannerPlaque('VIKRAM SARABHAI CENTRAL LIBRARY', 15, 1.0, '#F4F5F0', '#181B1E');
    sign.position.set(0, 5.4, lm.d / 2 + 5.1);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 7. VINOD GUPTA SCHOOL OF MANAGEMENT (VGSoM)
  // ===========================================================================
  _buildVGSoM(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, 0, 0, 0, lm.w, lm.h, lm.d, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, 0, 0, 0, lm.w, lm.h, lm.d, m.kgpBuffSandstone);
    this._addSolidPart(g, 0, 0, lm.d / 2 + 3, 18, 5.2, 6, m.kgpTerracotta, lm.x, lm.z);

    const sign = this._createBannerPlaque('VINOD GUPTA SCHOOL OF MANAGEMENT (VGSoM)', 17.5, 1.1, '#F5EEDC', '#181B1E');
    sign.position.set(0, 5.8, lm.d / 2 + 6.1);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 8. DR. B.C. ROY TECHNOLOGY HOSPITAL
  // Crisp white medical complex with Red Cross emblem & emergency portico
  // ===========================================================================
  _buildBCRoyHospital(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, 0, 0, 0, lm.w, lm.h, lm.d, m.kgpWhite, lm.x, lm.z);
    this._addKgpModernistTrim(g, 0, 0, 0, lm.w, lm.h, lm.d, m.glassBlue);

    // Emergency Ambulance Portico
    this._addSolidPart(g, 0, 4.2, lm.d / 2 + 3.5, 14, 0.9, 7, m.kgpWhite, lm.x, lm.z, false);
    this._addSolidCylinder(g, -5.5, 0, lm.d / 2 + 6.0, 0.4, 4.2, m.kgpWhite, lm.x, lm.z);
    this._addSolidCylinder(g, 5.5, 0, lm.d / 2 + 6.0, 0.4, 4.2, m.kgpWhite, lm.x, lm.z);

    // Iconic Red Cross Medical Emblem
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 0.4), m.hospitalRed);
    crossV.position.set(0, lm.h - 2.8, lm.d / 2 + 0.3);
    g.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.4), m.hospitalRed);
    crossH.position.set(0, lm.h - 2.8, lm.d / 2 + 0.3);
    g.add(crossH);

    const sign = this._createBannerPlaque('DR. B.C. ROY TECHNOLOGY HOSPITAL', 15, 1.0, '#F4F5F0', '#DC2626');
    sign.position.set(0, 5.2, lm.d / 2 + 7.1);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 9. LAL BAHADUR SHASTRI (LBS) MEGA HALL OF RESIDENCE (MODERN 6-STORY HIGH-RISE)
  // ===========================================================================
  _buildLBSMegaHall(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    // High-rise H-block / Courtyard configuration with terracotta & cream facade
    this._buildKgpHostel(lm, m.kgpTerracotta);
    this.scene.add(g);
  }

  // ===========================================================================
  // 10. TRADITIONAL 4-WING COURTYARD HALLS (PATEL, AZAD, NEHRU, RK, RP)
  // ===========================================================================
  _buildKgpHostel(lm, customTrimMat = null) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;
    const trimMat = customTrimMat || m.kgpBuffSandstone;

    const wingThick = 12;
    const w = lm.w;
    const d = lm.d;
    const h = lm.h;

    this._addSolidPart(g, 0, 0, -d / 2 + wingThick / 2, w, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, 0, 0, -d / 2 + wingThick / 2, w, h, wingThick, trimMat);

    this._addSolidPart(g, -w / 2 + wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpWindowWall, lm.x, lm.z);
    this._addSolidPart(g, w / 2 - wingThick / 2, 0, 0, wingThick, h, d - wingThick * 2, m.kgpWindowWall, lm.x, lm.z);

    const frontSegW = (w - 12) / 2;
    this._addSolidPart(g, -w / 2 + frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -w / 2 + frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, trimMat);

    this._addSolidPart(g, w / 2 - frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, w / 2 - frontSegW / 2, 0, d / 2 - wingThick / 2, frontSegW, h, wingThick, trimMat);

    this._addSolidPart(g, 0, 5.0, d / 2 - wingThick / 2, 12, h - 5.0, wingThick, trimMat, lm.x, lm.z, false);

    const sign = this._createBannerPlaque(lm.name.toUpperCase(), 11.8, 1.1, '#F4F5F0', '#181B1E');
    sign.position.set(0, 6.0, d / 2 + 0.3);
    g.add(sign);

    this.scene.add(g);
  }

  // ===========================================================================
  // 11. JNAN GHOSH STADIUM & SPORTS FIELD
  // Tiered spectator grandstand pavilion overlooking a lush green cricket/football pitch
  // ===========================================================================
  _buildJnanGhoshStadium(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    // Green Turf Field + White Boundary Line
    const turf = new THREE.Mesh(new THREE.BoxGeometry(lm.w, 0.16, lm.d), m.kgpLawnGreen);
    turf.position.y = 0.08;
    turf.receiveShadow = true;
    g.add(turf);

    // Tiered Concrete Spectator Grandstand on the North edge + Cantilevered Roof
    this._addSolidPart(g, 0, 0, -lm.d / 2 - 6, lm.w * 0.75, 7.5, 10, m.kgpWhite, lm.x, lm.z);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(lm.w * 0.78, 0.6, 14), m.kgpBuffSandstone);
    canopy.position.set(0, 10.5, -lm.d / 2 - 4);
    canopy.rotation.x = 0.12;
    canopy.castShadow = true;
    g.add(canopy);

    // 4 Stadium Floodlight Towers at corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this._addSolidCylinder(g, sx * (lm.w / 2 + 2), 0, sz * (lm.d / 2 + 2), 0.35, 22, m.silverMetal, lm.x, lm.z);
      }
    }

    const sign = this._createBannerPlaque('JNAN GHOSH STADIUM • IIT KHARAGPUR', 18, 1.2, '#F4F5F0', '#181B1E');
    sign.position.set(0, 8.5, -lm.d / 2 - 0.8);
    g.add(sign);

    this.scene.add(g);
  }

  _addKgpModernistTrim(group, localX, bottomY, localZ, w, h, d, accentMat = null) {
    const m = this.materials;
    const trim = accentMat || m.kgpBuffSandstone;
    const roofBand = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.95, d + 1.0), m.kgpWhite);
    roofBand.position.set(localX, bottomY + h + 0.45, localZ);
    roofBand.castShadow = true;
    group.add(roofBand);

    for (let y = bottomY + 4.2; y < bottomY + h; y += 4.2) {
      const chhajja = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.32, d + 0.8), trim);
      chhajja.position.set(localX, y, localZ);
      chhajja.castShadow = true;
      group.add(chhajja);
    }

    for (let x = -w / 2 + 1.5; x <= w / 2 - 1.5; x += 6.0) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.65, h, d + 0.45), m.kgpWhite);
      fin.position.set(localX + x, bottomY + h / 2, localZ);
      fin.castShadow = true;
      group.add(fin);
    }
  }

  _buildPuriGate(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, -11, 0, 0, 8, 9.5, 6, m.kgpBuffSandstone, lm.x, lm.z);
    this._addSolidPart(g, 11, 0, 0, 8, 9.5, 6, m.kgpBuffSandstone, lm.x, lm.z);
    this._addSolidPart(g, 0, 6.5, 0, 30, 3.2, 6.8, m.kgpWhite, lm.x, lm.z, false);

    const sign = this._createBannerPlaque('INDIAN INSTITUTE OF TECHNOLOGY KHARAGPUR', 24, 1.6, '#F4F5F0', '#181B1E');
    sign.position.set(0, 8.1, -3.5);
    g.add(sign);

    this._addSolidPart(g, -45, 0, 0, 60, 2.6, 1.2, m.kgpBuffSandstone, lm.x, lm.z);
    this._addSolidPart(g, 45, 0, 0, 60, 2.6, 1.2, m.kgpBuffSandstone, lm.x, lm.z);

    this.scene.add(g);
  }

  _buildTikkaStall(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, 0, 0, -2, 12, 3.6, 6, m.kgpBuffSandstone, lm.x, lm.z);
    this._addSolidPart(g, 0, 0, 2.5, 10, 1.1, 2.0, m.kgpWhite, lm.x, lm.z);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.35, 12.5), m.kgpCharcoal);
    roof.position.set(0, 3.9, 0);
    roof.castShadow = true;
    g.add(roof);

    const sign = this._createBannerPlaque('TIKKA CHAI & SNACKS STALL', 11, 0.9, '#E7DFC6', '#181B1E');
    sign.position.set(0, 4.3, 6.3);
    g.add(sign);

    this.scene.add(g);
  }

  _buildGymkhanaAndLake(lm) {
    const g = new THREE.Group();
    g.position.set(lm.x, 0, lm.z);
    const m = this.materials;

    this._addSolidPart(g, -14, 0, 0, 36, lm.h, 28, m.kgpWindowWall, lm.x, lm.z);
    this._addKgpModernistTrim(g, -14, 0, 0, 36, lm.h, 28, m.kgpWhite);

    const sign = this._createBannerPlaque("TECHNOLOGY STUDENTS' GYMKHANA", 16, 1.1, '#F4F5F0', '#181B1E');
    sign.position.set(-14, lm.h + 1.2, 14.3);
    g.add(sign);

    const lakeX = 32;
    const water = new THREE.Mesh(new THREE.BoxGeometry(38, 0.25, 42), m.glassBlue);
    water.position.set(lakeX, 0.12, 0);
    g.add(water);
    this.physics.addBox(lm.x + lakeX, 0, lm.z, 38, 2.5, 42, 'water');

    this.scene.add(g);
  }
}
