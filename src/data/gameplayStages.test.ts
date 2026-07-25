import assert from "node:assert/strict";
import test from "node:test";
import { GAMEPLAY_STAGES, getGameplayStage } from "./gameplayStages";

test("Stage 1 through 20 have gameplay definitions", () => {
  assert.deepEqual(
    GAMEPLAY_STAGES.map((stage) => stage.id),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  assert.equal(getGameplayStage(6)?.id, 6);
  assert.equal(getGameplayStage(10)?.id, 10);
  assert.equal(getGameplayStage(11)?.id, 11);
  assert.equal(getGameplayStage(20)?.id, 20);
  assert.equal(getGameplayStage(21), null);
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
  const riverStages = GAMEPLAY_STAGES.slice(5, 10);
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

test("Stage 11 through 15 introduce city traffic and railway pressure", () => {
  const cityStages = GAMEPLAY_STAGES.slice(10, 15);
  const railwayCounts = cityStages.map(
    (stage) => stage.lanes.filter((lane) => lane.type === "railway").length,
  );
  assert.deepEqual(railwayCounts, [0, 0, 1, 2, 2]);
  assert.ok(
    cityStages.every((stage) =>
      stage.lanes.some((lane) => lane.type === "road"),
    ),
  );
  assert.ok(
    cityStages
      .slice(1)
      .every((stage) =>
        stage.lanes.some(
          (lane) => lane.type === "road" && lane.direction === -1,
        ),
      ),
  );
  assert.ok(
    cityStages.every((stage) =>
      stage.lanes.every(
        (lane) =>
          lane.type !== "railway" ||
          (lane.warningMs >= 2_200 && lane.cycleMs >= 14_000),
      ),
    ),
  );
});

test("Stage 16 through 20 reuse mixed hazards without changing lane rules", () => {
  const snowStages = GAMEPLAY_STAGES.slice(15);
  assert.equal(snowStages.length, 5);
  assert.ok(
    snowStages.every((stage) =>
      stage.lanes.some((lane) => lane.type === "road"),
    ),
  );
  assert.ok(
    snowStages.every((stage) =>
      stage.lanes.some((lane) => lane.type === "river"),
    ),
  );
  assert.ok(
    snowStages.slice(2).every((stage) =>
      stage.lanes.some((lane) => lane.type === "railway"),
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
