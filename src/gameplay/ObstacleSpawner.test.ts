import assert from "node:assert/strict";
import test from "node:test";
import { shouldFlipVehicle } from "./ObstacleSpawner";

test("every vehicle image faces its actual travel direction", () => {
  assert.equal(shouldFlipVehicle("compact", 1), true);
  assert.equal(shouldFlipVehicle("compact", -1), false);
  assert.equal(shouldFlipVehicle("sedan", 1), false);
  assert.equal(shouldFlipVehicle("sedan", -1), true);
  assert.equal(shouldFlipVehicle("truck", 1), true);
  assert.equal(shouldFlipVehicle("truck", -1), false);
});
