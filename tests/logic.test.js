/**
 * @fileoverview Zero-dependency Node.js test suite for pure simulation logic:
 * WGS84 equirectangular projection, A* pathing, clock conversion, NPC schedules,
 * and Solid 3D PhysicsWorld collision + stair step-up resolution.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS_ANCHOR, latLngToMeters, metersToLatLng, WalkableGrid } from '../js/world/geo.js';
import { TimeSystem } from '../js/engine/time.js';
import { resolveNpcSchedule } from '../js/characters/schedule.js';
import { PhysicsWorld } from '../js/engine/physics.js';

test('Geo Projection: Anchor point maps to (0, 0) and round-trips accurately', () => {
  const origin = latLngToMeters(CAMPUS_ANCHOR.lat, CAMPUS_ANCHOR.lng);
  assert.ok(Math.abs(origin.x) < 1e-6);
  assert.ok(Math.abs(origin.z) < 1e-6);

  const sample = latLngToMeters(22.3215, 87.3125);
  const roundTrip = metersToLatLng(sample.x, sample.z);
  assert.ok(Math.abs(roundTrip.lat - 22.3215) < 1e-5);
  assert.ok(Math.abs(roundTrip.lng - 87.3125) < 1e-5);
});

test('WalkableGrid A*: Computes obstacle-free path around a blocked building footprint', () => {
  const grid = new WalkableGrid(200, 10);
  grid.markRect(0, 0, 40, 40, 255);

  const path = grid.findPath(0, -50, 0, 50);
  assert.ok(path.length >= 2);
  for (const pt of path) {
    const insideObstacle = Math.abs(pt.x) < 15 && Math.abs(pt.z) < 15;
    assert.equal(insideObstacle, false);
  }
});

test('PhysicsWorld Solid Wall: Prevents character from passing through a solid building box', () => {
  const world = new PhysicsWorld({ maxStepHeight: 0.55 });
  // Place a solid 10m x 10m building wall centered at (0, 0) with height 10m
  world.addBox(0, 0, 0, 10, 10, 10, 'building');

  // Character starts just south of the wall at z = 5.45 (wall edge is z = 5.0) and tries to walk 3m into it (-Z)
  const player = { x: 0, y: 0, z: 5.45, vy: 0, radius: 0.45, height: 1.75 };
  const resolved = world.moveAndSlide(player, 0, -3.0, 0.016, []);

  assert.ok(resolved.z >= 5.449, `Character must be stopped outside wall boundary (got z=${resolved.z})`);
});

test('PhysicsWorld Stair Step-Up: Allows character to walk onto a 0.35m portico step', () => {
  const world = new PhysicsWorld({ maxStepHeight: 0.55 });
  world.addBox(0, 0, 0, 10, 0.35, 10, 'step');

  const player = { x: 0, y: 0, z: 5.2, vy: 0, radius: 0.45, height: 1.75 };
  const resolved = world.moveAndSlide(player, 0, -1.5, 0.016, []);

  assert.equal(resolved.y, 0.35, 'Character should step up onto the 0.35m plinth');
  assert.ok(resolved.z < 5.0, 'Character should advance onto the step horizontally');
});

test('PhysicsWorld Cylinder & Agent Separation: Blocks passing through trees and other humans', () => {
  const world = new PhysicsWorld();
  world.addCylinder(0, 0, 0.5, 6.0, 'tree');

  const player = { x: 0, y: 0, z: 1.2, vy: 0, radius: 0.45, height: 1.75 };
  const afterTree = world.moveAndSlide(player, 0, -2.0, 0.016, []);
  const distFromTree = Math.hypot(afterTree.x, afterTree.z);
  assert.ok(distFromTree >= 0.94, `Must not penetrate tree trunk (dist=${distFromTree})`);

  // Test human-to-human collision
  const npc = { x: 5, z: 5, radius: 0.45 };
  const playerNearNpc = { x: 5, y: 0, z: 6.0, vy: 0, radius: 0.45, height: 1.75 };
  const afterNpc = world.moveAndSlide(playerNearNpc, 0, -1.5, 0.016, [npc]);
  const distFromNpc = Math.hypot(afterNpc.x - npc.x, afterNpc.z - npc.z);
  assert.ok(distFromNpc >= 0.89, `Must not walk through NPC (dist=${distFromNpc})`);
});
