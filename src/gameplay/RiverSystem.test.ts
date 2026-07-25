import assert from "node:assert/strict";
import test from "node:test";
import type Phaser from "phaser";
import type { ActiveLog } from "./ObstacleSpawner";
import { findSupportingLog, RiverSystem } from "./RiverSystem";

function createLog(
  x: number,
  lane = 1,
  supportWidth = 100,
  frameDeltaX = 3,
): ActiveLog {
  return {
    image: { x, y: 0, active: true } as Phaser.GameObjects.Image,
    lane,
    direction: 1,
    speed: 60,
    supportWidth,
    frameDeltaX,
  };
}

test("support selection keeps the current log and otherwise chooses the nearest", () => {
  const left = createLog(86);
  const right = createLog(118);

  assert.equal(findSupportingLog(100, 1, [left, right], right), right);
  assert.equal(findSupportingLog(90, 1, [left, right]), left);
  assert.equal(findSupportingLog(200, 1, [left, right]), null);
});

test("the player's foot remains supported across the visible log width", () => {
  const log = createLog(100, 1, 120);

  assert.equal(findSupportingLog(40, 1, [log]), log);
  assert.equal(findSupportingLog(160, 1, [log]), log);
  assert.equal(findSupportingLog(39.99, 1, [log]), null);
  assert.equal(findSupportingLog(160.01, 1, [log]), null);
});

test("a rider follows the log and fails when support is lost", () => {
  const player = { x: 100, y: 240 } as Phaser.GameObjects.Image;
  const log = createLog(100);
  let failureCount = 0;
  const river = new RiverSystem();
  river.configure({
    player,
    getPlayerLane: () => 1,
    isPlayerMoving: () => false,
    isRiverLane: (lane) => lane === 1,
    getLogs: () => [log],
    getHorizontalBounds: () => ({ left: 20, right: 380 }),
    onPosition: () => undefined,
    onFailure: () => {
      failureCount += 1;
    },
  });

  assert.equal(river.handleArrival(), true);
  river.update();
  assert.equal(player.x, 103);
  assert.equal(failureCount, 0);

  log.image.x = 500;
  river.update();
  assert.equal(failureCount, 1);
});

test("a log cannot carry the player outside the playable horizontal bounds", () => {
  const player = { x: 378, y: 240 } as Phaser.GameObjects.Image;
  const log = createLog(378, 1, 100, 5);
  let failed = false;
  const river = new RiverSystem();
  river.configure({
    player,
    getPlayerLane: () => 1,
    isPlayerMoving: () => false,
    isRiverLane: () => true,
    getLogs: () => [log],
    getHorizontalBounds: () => ({ left: 20, right: 380 }),
    onPosition: () => undefined,
    onFailure: () => {
      failed = true;
    },
  });

  assert.equal(river.handleArrival(), true);
  river.update();
  assert.equal(failed, true);
});
