/**
 * @fileoverview Solid 3D Collision & Physics Solver for IIT KGP Open World.
 * Ensures the player and NPCs cannot pass through walls, pillars, trees, lamp posts,
 * or each other, while allowing smooth sliding along walls and walking up stairs/plinths.
 */

export class PhysicsWorld {
  /**
   * @param {object} [options]
   * @param {number} [options.maxStepHeight=0.55] - Max height in meters a character can step up (stairs/plinths).
   * @param {number} [options.gravity=22.0] - Downward acceleration in m/s^2.
   */
  constructor(options = {}) {
    this.maxStepHeight = options.maxStepHeight ?? 0.55;
    this.gravity = options.gravity ?? 22.0;

    /**
     * Solid Axis-Aligned Bounding Boxes (buildings, portico plinths, stairs, walls, benches)
     * @type {Array<{minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, tag: string}>}
     */
    this.boxes = [];

    /**
     * Solid Vertical Cylinders (tree trunks, pillars, lamp posts, gate columns)
     * @type {Array<{x: number, z: number, radius: number, height: number, tag: string}>}
     */
    this.cylinders = [];
  }

  /**
   * Register a solid box centered at (cx, bottomY + height/2, cz).
   */
  addBox(cx, bottomY, cz, width, height, depth, tag = 'building') {
    const hw = width / 2;
    const hd = depth / 2;
    this.boxes.push({
      minX: cx - hw,
      maxX: cx + hw,
      minY: bottomY,
      maxY: bottomY + height,
      minZ: cz - hd,
      maxZ: cz + hd,
      tag
    });
  }

  /**
   * Register a solid vertical cylinder (e.g. tree trunk, column, lamp post).
   */
  addCylinder(x, z, radius, height = 8.0, tag = 'prop') {
    this.cylinders.push({ x, z, radius, height, tag });
  }

  /**
   * Resolves horizontal & vertical movement for a solid character cylinder against all world
   * boxes, cylinders, and dynamic agents. Returns the new resolved position and grounded flag.
   *
   * @param {object} body
   * @param {number} body.x
   * @param {number} body.y - Foot elevation (0 = ground level)
   * @param {number} body.z
   * @param {number} body.vy - Vertical velocity
   * @param {number} body.radius - Character collision radius (e.g., 0.45m walking, 0.65m biking)
   * @param {number} body.height - Character height (e.g., 1.75m)
   * @param {number} dx - Desired X displacement this frame
   * @param {number} dz - Desired Z displacement this frame
   * @param {number} dt - Delta time in seconds
   * @param {Array<{x: number, z: number, radius?: number}>} [otherAgents=[]] - Other solid humans to avoid passing through
   */
  moveAndSlide(body, dx, dz, dt, otherAgents = []) {
    const r = body.radius ?? 0.45;
    const h = body.height ?? 1.75;

    // Sub-step horizontal displacement so fast sprinting/biking never tunnels through thin walls
    const totalDist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(totalDist / (r * 0.45)));
    const stepX = dx / steps;
    const stepZ = dz / steps;

    let x = body.x;
    let y = body.y;
    let z = body.z;
    let vy = body.vy ?? 0;

    for (let s = 0; s < steps; s++) {
      x += stepX;
      z += stepZ;

      // 1. Resolve Circle vs Solid AABBs (Minimum Translation Vector push-out + Stair Step-up)
      for (let i = 0; i < this.boxes.length; i++) {
        const b = this.boxes[i];

        // Quick 2D bounding rejection
        if (x + r <= b.minX || x - r >= b.maxX || z + r <= b.minZ || z - r >= b.maxZ) {
          continue;
        }

        // Check if character is already standing on top of this box (e.g. portico plinth or step)
        if (y >= b.maxY - 0.04) {
          continue;
        }

        // Check if this box is low enough relative to current foot height to step onto (stairs/plinth)
        const stepDiff = b.maxY - y;
        if (stepDiff > 0 && stepDiff <= this.maxStepHeight) {
          y = b.maxY;
          vy = Math.max(0, vy);
          continue;
        }

        // Ignore overhead arches/bridges above the character's head
        if (y + h <= b.minY) {
          continue;
        }

        // Solid wall collision! Compute nearest point on AABB in XZ plane
        const closestX = Math.max(b.minX, Math.min(x, b.maxX));
        const closestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
        const distX = x - closestX;
        const distZ = z - closestZ;
        const distSq = distX * distX + distZ * distZ;

        if (distSq < r * r) {
          if (distSq > 1e-8) {
            // Push radially outward from closest point on wall/corner
            const dist = Math.sqrt(distSq);
            const overlap = r - dist;
            x += (distX / dist) * overlap;
            z += (distZ / dist) * overlap;
          } else {
            // Center of character is inside the box; push out along shallowest axis
            const penLeft = (x + r) - b.minX;
            const penRight = b.maxX - (x - r);
            const penTop = (z + r) - b.minZ;
            const penBottom = b.maxZ - (z - r);
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);

            if (minPen === penLeft) x = b.minX - r;
            else if (minPen === penRight) x = b.maxX + r;
            else if (minPen === penTop) z = b.minZ - r;
            else z = b.maxZ + r;
          }
        }
      }

      // 2. Resolve Circle vs Solid Cylinders (Trees, Pillars, Lamp Posts)
      for (let i = 0; i < this.cylinders.length; i++) {
        const c = this.cylinders[i];
        if (y >= c.height) continue;

        const cdx = x - c.x;
        const cdz = z - c.z;
        const minDist = r + c.radius;
        const distSq = cdx * cdx + cdz * cdz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          x += (cdx / dist) * overlap;
          z += (cdz / dist) * overlap;
        }
      }

      // 3. Resolve Circle vs Other Humans (Solid Character-to-Character Separation)
      for (let i = 0; i < otherAgents.length; i++) {
        const other = otherAgents[i];
        if (other === body) continue;
        const otherR = other.radius ?? 0.42;
        const minDist = r + otherR;
        const adx = x - other.x;
        const adz = z - other.z;
        const distSq = adx * adx + adz * adz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          x += (adx / dist) * overlap;
          z += (adz / dist) * overlap;
        }
      }
    }

    // 4. Compute highest supporting floor beneath (x, z)
    let supportY = 0;
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (x + r * 0.6 > b.minX && x - r * 0.6 < b.maxX && z + r * 0.6 > b.minZ && z - r * 0.6 < b.maxZ) {
        if (b.maxY <= y + this.maxStepHeight + 0.08 && b.maxY > supportY) {
          supportY = b.maxY;
        }
      }
    }

    // Apply gravity / ground snap
    vy -= this.gravity * dt;
    y += vy * dt;

    let isGrounded = false;
    if (y <= supportY) {
      y = supportY;
      vy = 0;
      isGrounded = true;
    }

    // Keep within 1km x 1km world boundary
    x = Math.max(-780, Math.min(780, x));
    z = Math.max(-780, Math.min(780, z));

    return { x, y, z, vy, isGrounded };
  }
}
