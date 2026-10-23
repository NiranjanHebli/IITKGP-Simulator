/**
 * @fileoverview Rotating 2D Canvas radar in the lower-left corner.
 * Renders campus roads, building footprints, NPC blips, landmark icons, compass N/E/S/W,
 * and a dynamic A* GPS polyline from the player to the active objective.
 */

export class MinimapRadar {
  constructor(canvas, landmarks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.landmarks = landmarks;
    this.zoomScale = 0.42; // Pixels per world meter (adjustable with +/-)
    this.minZoom = 0.22;
    this.maxZoom = 0.95;

    // Main campus road segments in local meters for radar background rendering
    this.roads = [
      { x1: 0, z1: -220, x2: 0, z2: 420, width: 18, name: "Scholar's Avenue" },
      { x1: -440, z1: 55, x2: 420, z2: 55, width: 14, name: 'Nalanda - PAN Loop Avenue' },
      { x1: -440, z1: -10, x2: 380, z2: -10, width: 12, name: 'Academic & Mega Hostel Road' },
      { x1: -175, z1: -140, x2: -175, z2: 280, width: 12, name: 'PAN Loop Road' },
      { x1: -305, z1: -140, x2: -305, z2: 260, width: 12, name: 'MMM & LBS Hall Road' },
      { x1: 155, z1: -180, x2: 155, z2: 340, width: 12, name: 'East Academic & Museum Road' }
    ];
  }

  adjustZoom(delta) {
    this.zoomScale = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomScale + delta));
  }

  render({ player, npcs, gpsPath, objective }) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 6;

    ctx.clearRect(0, 0, w, h);

    // 1. Circular radar clip & dark slate background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Subtle range rings
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (const r of [radius * 0.45, radius * 0.8]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Rotate world space around player so player's heading points UP (-Y on canvas)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.heading);
    ctx.scale(this.zoomScale, this.zoomScale);
    ctx.translate(-player.x, -player.z);

    // 2a. Render main campus roads
    ctx.lineCap = 'round';
    for (const road of this.roads) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = road.width;
      ctx.beginPath();
      ctx.moveTo(road.x1, road.z1);
      ctx.lineTo(road.x2, road.z2);
      ctx.stroke();
    }

    // 2b. Render building footprints
    for (const b of this.landmarks) {
      ctx.fillStyle = this._categoryColor(b.category);
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
      ctx.strokeRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
    }

    // 2c. Render purple/cyan GPS A* route line from player to objective
    if (gpsPath && gpsPath.length > 0) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 5 / this.zoomScale;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(player.x, player.z);
      for (const pt of gpsPath) {
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();

      // Inner bright core line
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.2 / this.zoomScale;
      ctx.stroke();
    }

    // 2d. Render nearby NPC blips
    const blipRadius = 3.2 / this.zoomScale;
    for (const npc of npcs) {
      ctx.fillStyle = npc.role === 'vendor' ? '#22c55e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(npc.x, npc.z, blipRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2e. Render objective marker if inside radar bounds
    if (objective) {
      const pulse = 5.5 / this.zoomScale;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8 / this.zoomScale;
      ctx.beginPath();
      ctx.arc(objective.x, objective.z, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore(); // Exit world-space rotation

    // 3. Clamp objective indicator to radar rim if objective is far away
    if (objective) {
      const dx = (objective.x - player.x) * this.zoomScale;
      const dz = (objective.z - player.z) * this.zoomScale;
      const distPx = Math.hypot(dx, dz);
      if (distPx > radius - 10) {
        const angle = Math.atan2(dz, dx) + player.heading;
        const rimX = cx + Math.cos(angle) * (radius - 10);
        const rimY = cy + Math.sin(angle) * (radius - 10);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rimX, rimY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 4. Center Player Directional Arrow (Always points UP)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Exit circular clip

    // 5. Radar Outer Bezel & Rotating Cardinal North ('N') Badge
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North is -Z in world space, which is -PI/2 + player.heading on screen
    const northAngle = -Math.PI / 2 + player.heading;
    const nx = cx + Math.cos(northAngle) * (radius - 2);
    const ny = cy + Math.sin(northAngle) * (radius - 2);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(nx, ny, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);
  }

  _categoryColor(cat) {
    switch (cat) {
      case 'academic': return '#d97706';
      case 'library': return '#0284c7';
      case 'hostel': return '#4f46e5';
      case 'canteen': return '#16a34a';
      case 'sports': return '#0d9488';
      default: return '#64748b';
    }
  }
}
