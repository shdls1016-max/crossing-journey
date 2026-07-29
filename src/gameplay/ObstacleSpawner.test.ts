import assert from "node:assert/strict";
import test from "node:test";
import type Phaser from "phaser";
import { GAMEPLAY_STAGES, type VehicleKind } from "../data/gameplayStages";
import {
  ObstacleSpawner,
  shouldFlipVehicle,
  vehicleVisibleWidth,
  type ActiveLog,
  type ActiveVehicle,
  type ObstacleLayout,
} from "./ObstacleSpawner";

test("every vehicle image faces its actual travel direction", () => {
  assert.equal(shouldFlipVehicle("compact", 1), true);
  assert.equal(shouldFlipVehicle("compact", -1), false);
  assert.equal(shouldFlipVehicle("sedan", 1), false);
  assert.equal(shouldFlipVehicle("sedan", -1), true);
  assert.equal(shouldFlipVehicle("truck", 1), true);
  assert.equal(shouldFlipVehicle("truck", -1), false);
});

test("vehicles and logs never overlap while every stage runs and wraps", () => {
  for (const width of [390, 844, 1_440]) {
    for (const laneHeight of [84, 108]) {
      const layout: ObstacleLayout = {
        width,
        playLeft: Math.max(0, (width - 620) * 0.5),
        playWidth: Math.min(width, 620),
        laneHeight,
        laneY: (lane) => lane * laneHeight,
      };

      for (const stage of GAMEPLAY_STAGES) {
        const spawner = new ObstacleSpawner();
        spawner.configure(createScene(), stage, layout);
        assertNoVisualOverlap(spawner.getVehicles(), spawner.getLogs());

        for (let frame = 0; frame < 1_600; frame += 1) {
          spawner.update(50);
          assertNoVisualOverlap(spawner.getVehicles(), spawner.getLogs());
        }
        spawner.reset();
      }
    }
  }
});

function createScene(): Phaser.Scene {
  return {
    add: {
      image: (_x: number, _y: number, key: string) => {
        const image = {
          x: 0,
          y: 0,
          angle: 0,
          active: true,
          displayWidth: 0,
          displayHeight: 0,
          texture: { key },
          setOrigin() {
            return this;
          },
          setFlipX() {
            return this;
          },
          setDepth() {
            return this;
          },
          setDisplaySize(width: number, height: number) {
            this.displayWidth = width;
            this.displayHeight = height;
            return this;
          },
          setAngle(angle: number) {
            this.angle = angle;
            return this;
          },
          destroy() {
            this.active = false;
          },
        };
        return image;
      },
    },
  } as unknown as Phaser.Scene;
}

function assertNoVisualOverlap(
  vehicles: readonly ActiveVehicle[],
  logs: readonly ActiveLog[],
): void {
  const vehicleLanes = new Set(vehicles.map((vehicle) => vehicle.lane));
  for (const lane of vehicleLanes) {
    const laneVehicles = vehicles
      .filter((vehicle) => vehicle.lane === lane)
      .sort((left, right) => left.image.x - right.image.x);
    for (let index = 1; index < laneVehicles.length; index += 1) {
      const previous = laneVehicles[index - 1]!;
      const current = laneVehicles[index]!;
      const previousWidth = visibleVehicleWidth(previous);
      const currentWidth = visibleVehicleWidth(current);
      assert.ok(
        current.image.x - previous.image.x >=
          (previousWidth + currentWidth) * 0.5 + 12 - 0.001,
      );
    }
  }

  const logLanes = new Set(logs.map((log) => log.lane));
  for (const lane of logLanes) {
    const laneLogs = logs
      .filter((log) => log.lane === lane)
      .sort((left, right) => left.image.x - right.image.x);
    for (let index = 1; index < laneLogs.length; index += 1) {
      const previous = laneLogs[index - 1]!;
      const current = laneLogs[index]!;
      assert.ok(
        current.image.x - previous.image.x >=
          (previous.supportWidth + current.supportWidth) * 0.5 + 8 - 0.001,
      );
    }
  }
}

function visibleVehicleWidth(vehicle: ActiveVehicle): number {
  return vehicleVisibleWidth(
    kindForTexture(vehicle.image.texture.key),
    vehicle.image.displayWidth,
  );
}

function kindForTexture(textureKey: string): VehicleKind {
  if (textureKey.includes("truck")) return "truck";
  if (textureKey.includes("sedan")) return "sedan";
  return "compact";
}
