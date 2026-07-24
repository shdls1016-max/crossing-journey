import assert from "node:assert/strict";
import test from "node:test";
import { GAMEPLAY_STAGES, getGameplayStage } from "./gameplayStages";

test("Stage 1 through 10 have gameplay definitions", () => {
  assert.deepEqual(
    GAMEPLAY_STAGES.map((stage) => stage.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(getGameplayStage(6)?.id, 6);
  assert.equal(getGameplayStage(10)?.id, 10);
  assert.equal(getGameplayStage(11), null);
  assert.equal(getGameplayStage(20), null);
});

test("Stage 1 through 5 increase lanes, roads and traffic pressure", () => {
  const meadowStages = GAMEPLAY_STAGES.slice(0, 5);
  const laneCounts = meadowStages.map((stage) => stage.lanes.length);
  const roadCounts = meadowStages.map(
    (stage) => stage.lanes.filter((lane) => lane.type === "road").length,
  );
  const peakSpeeds = meadowStages.map((stage) =>
    Math.max(
      ...stage.lanes
        .filter((lane) => lane.type === "road")
        .map((lane) => lane.speed),
    ),
  );

  assert.deepEqual(laneCounts, [7, 9, 11, 13, 15]);
  assert.deepEqual(roadCounts, [2, 3, 4, 5, 7]);
  assert.ok(peakSpeeds.every((speed, index) => index === 0 || speed > peakSpeeds[index - 1]!));
});

test("Stage 6 through 10 progressively increase river pressure", () => {
  const riverStages = GAMEPLAY_STAGES.slice(5);
  const riverCounts = riverStages.map(
    (stage) => stage.lanes.filter((lane) => lane.type === "river").length,
  );
  const peakSpeeds = riverStages.map((stage) =>
    Math.max(
      ...stage.lanes
        .filter((lane) => lane.type === "river")
        .map((lane) => lane.speed),
    ),
  );

  assert.deepEqual(riverCounts, [2, 3, 4, 5, 7]);
  assert.ok(
    riverStages.every(
      (stage) => stage.lanes.every((lane) => lane.type !== "road"),
    ),
  );
  assert.ok(peakSpeeds.every((speed, index) => index === 0 || speed > peakSpeeds[index - 1]!));
  assert.ok(
    riverStages
      .slice(2)
      .every((stage) =>
        stage.lanes.some(
          (lane) => lane.type === "river" && lane.logs.includes("short"),
        ),
      ),
  );
});

test("every gameplay stage starts and finishes safely with valid coin cells", () => {
  for (const stage of GAMEPLAY_STAGES) {
    assert.equal(stage.lanes[0]?.type, "start");
    assert.equal(stage.lanes.at(-1)?.type, "finish");
    for (const coin of stage.coins) {
      assert.ok(coin.lane > 0 && coin.lane < stage.lanes.length - 1);
      assert.ok(coin.column >= 0 && coin.column < stage.columns);
    }
  }
});
