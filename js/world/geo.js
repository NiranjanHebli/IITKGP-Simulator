/**
 * @fileoverview WGS84 Latitude/Longitude <-> Local Meter Equirectangular Projection
 * anchored at the IIT Kharagpur Main Building Clock Tower, plus deterministic A* pathing.
 */

export const CAMPUS_ANCHOR = Object.freeze({
  name: 'IIT Kharagpur Main Building Plaza',
  lat: 22.3190,
  lng: 87.3091,
  earthRadiusMeters: 6371000
});

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const COS_ANCHOR_LAT = Math.cos(CAMPUS_ANCHOR.lat * DEG_TO_RAD);

/**
 * Converts WGS84 (lat, lng) into local Three.js world meters (x = East, z = South).
 */
export function latLngToMeters(lat, lng, anchor = CAMPUS_ANCHOR) {
  const dLat = (lat - anchor.lat) * DEG_TO_RAD;
  const dLng = (lng - anchor.lng) * DEG_TO_RAD;
  const x = dLng * anchor.earthRadiusMeters * COS_ANCHOR_LAT;
  // In Three.js right-handed coords, -Z is North and +Z is South
  const z = -dLat * anchor.earthRadiusMeters;
  return { x, z };
}

/**
 * Converts local Three.js world meters (x, z) back to WGS84 (lat, lng).
 */
export function metersToLatLng(x, z, anchor = CAMPUS_ANCHOR) {
  const dLat = (-z / anchor.earthRadiusMeters) * RAD_TO_DEG;
  const dLng = (x / (anchor.earthRadiusMeters * COS_ANCHOR_LAT)) * RAD_TO_DEG;
  return {
    lat: anchor.lat + dLat,
    lng: anchor.lng + dLng
  };
}

/**
 * Lightweight 2D Walkable Tile Grid & A* Pathfinder for NPC routines and Minimap GPS.
 */
export class WalkableGrid {
  constructor(sizeMeters = 1600, cellSize = 8) {
    this.sizeMeters = sizeMeters;
    this.cellSize = cellSize;
    this.halfSize = sizeMeters / 2;
    this.cols = Math.ceil(sizeMeters / cellSize);
    this.rows = Math.ceil(sizeMeters / cellSize);
    /** 1 = walkable road/path, 2 = normal ground, 255 = blocked building/water */
    this.weights = new Uint8Array(this.cols * this.rows);
    this.weights.fill(2);
  }

  worldToCell(x, z) {
    const col = Math.max(0, Math.min(this.cols - 1, Math.floor((x + this.halfSize) / this.cellSize)));
    const row = Math.max(0, Math.min(this.rows - 1, Math.floor((z + this.halfSize) / this.cellSize)));
    return { col, row };
  }

  cellToWorld(col, row) {
    return {
      x: -this.halfSize + (col + 0.5) * this.cellSize,
      z: -this.halfSize + (row + 0.5) * this.cellSize
    };
  }

  markRect(centerX, centerZ, width, depth, cost = 255) {
    const minCell = this.worldToCell(centerX - width / 2, centerZ - depth / 2);
    const maxCell = this.worldToCell(centerX + width / 2, centerZ + depth / 2);
    for (let r = minCell.row; r <= maxCell.row; r++) {
      for (let c = minCell.col; c <= maxCell.col; c++) {
        this.weights[r * this.cols + c] = cost;
      }
    }
  }

  isWalkable(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.weights[row * this.cols + col] < 255;
  }

  findPath(startX, startZ, goalX, goalZ, maxIterations = 2500) {
    const start = this.worldToCell(startX, startZ);
    const goal = this.worldToCell(goalX, goalZ);

    const snapWalkable = (cell) => {
      if (this.isWalkable(cell.col, cell.row)) return cell;
      for (let rad = 1; rad <= 6; rad++) {
        for (let dr = -rad; dr <= rad; dr++) {
          for (let dc = -rad; dc <= rad; dc++) {
            if (this.isWalkable(cell.col + dc, cell.row + dr)) {
              return { col: cell.col + dc, row: cell.row + dr };
            }
          }
        }
      }
      return cell;
    };

    const s = snapWalkable(start);
    const g = snapWalkable(goal);
    const startIdx = s.row * this.cols + s.col;
    const goalIdx = g.row * this.cols + g.col;

    if (startIdx === goalIdx) {
      return [{ x: goalX, z: goalZ }];
    }

    const totalCells = this.cols * this.rows;
    const gScore = new Float32Array(totalCells).fill(Infinity);
    const parent = new Int32Array(totalCells).fill(-1);
    const closed = new Uint8Array(totalCells);

    const open = [{ idx: startIdx, f: 0 }];
    gScore[startIdx] = 0;

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]
    ];

    let iterations = 0;
    let bestFallbackIdx = startIdx;
    let bestFallbackDist = Infinity;

    while (open.length > 0 && iterations++ < maxIterations) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift().idx;
      if (current === goalIdx) {
        return this._reconstructPath(parent, goalIdx, goalX, goalZ);
      }
      closed[current] = 1;

      const cRow = Math.floor(current / this.cols);
      const cCol = current % this.cols;

      for (const [dc, dr, stepLen] of dirs) {
        const nCol = cCol + dc;
        const nRow = cRow + dr;
        if (!this.isWalkable(nCol, nRow)) continue;

        const nIdx = nRow * this.cols + nCol;
        if (closed[nIdx]) continue;

        const tileWeight = this.weights[nIdx];
        const tentativeG = gScore[current] + stepLen * tileWeight;

        if (tentativeG < gScore[nIdx]) {
          parent[nIdx] = current;
          gScore[nIdx] = tentativeG;
          const h = Math.hypot(g.col - nCol, g.row - nRow);
          if (h < bestFallbackDist) {
            bestFallbackDist = h;
            bestFallbackIdx = nIdx;
          }
          open.push({ idx: nIdx, f: tentativeG + h });
        }
      }
    }

    return this._reconstructPath(parent, bestFallbackIdx, goalX, goalZ);
  }

  _reconstructPath(parent, targetIdx, exactGoalX, exactGoalZ) {
    const raw = [];
    let curr = targetIdx;
    while (curr !== -1) {
      const r = Math.floor(curr / this.cols);
      const c = curr % this.cols;
      raw.push(this.cellToWorld(c, r));
      curr = parent[curr];
    }
    raw.reverse();
    const simplified = [];
    for (let i = 0; i < raw.length; i += 2) {
      simplified.push(raw[i]);
    }
    simplified.push({ x: exactGoalX, z: exactGoalZ });
    return simplified;
  }
}
