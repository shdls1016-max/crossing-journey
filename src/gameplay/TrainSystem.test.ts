import assert from "node:assert/strict";
import test from "node:test";
import { resolveTrainPhase, trainSegmentLayout } from "./TrainSystem";

const definition = {
  cycleMs: 15_000,
  warningMs: 2_500,
  phase: 0,
};

test("a train cycle always warns before closing and passing", () => {
  const passingMs = 4_000;
  assert.equal(resolveTrainPhase(0, definition, passingMs).phase, "idle");
  assert.equal(resolveTrainPhase(7_000, definition, passingMs).phase, "warning");
  assert.equal(resolveTrainPhase(9_000, definition, passingMs).phase, "closing");
  assert.equal(resolveTrainPhase(10_000, definition, passingMs).phase, "waiting");
  assert.equal(resolveTrainPhase(11_000, definition, passingMs).phase, "passing");
});

test("train collision progress exists only while the train is passing", () => {
  const passingMs = 4_000;
  const passing = resolveTrainPhase(12_000, definition, passingMs);
  assert.equal(passing.phase, "passing");
  assert.ok(passing.trainProgress > 0 && passing.trainProgress < 1);

  const opening = resolveTrainPhase(14_600, definition, passingMs);
  assert.equal(opening.phase, "opening");
  assert.equal(opening.trainProgress, 0);
});

test("train carriages overlap transparent seams at every gameplay size", () => {
  for (const trainSize of [132.72, 164]) {
    for (const trainCars of [1, 2, 3]) {
      const segments = trainSegmentLayout(trainCars, trainSize);
      for (let index = 1; index < segments.length; index += 1) {
        const previous = segments[index - 1]!;
        const current = segments[index]!;
        const gap =
          current.offset -
          previous.offset -
          (previous.visibleWidth + current.visibleWidth) * 0.5;
        assert.ok(Math.abs(gap + 20) < 1e-6);
      }
    }
  }
});
