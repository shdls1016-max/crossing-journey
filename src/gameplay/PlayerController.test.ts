import assert from "node:assert/strict";
import test from "node:test";
import type Phaser from "phaser";
import { PlayerController } from "./PlayerController";

interface CounterConfig {
  readonly onUpdate: (tween: { getValue: () => number; stop: () => void }) => void;
  readonly onComplete: () => void;
}

function createControllerHarness() {
  let counter: CounterConfig | null = null;
  const inputEvents: string[] = [];
  const scene = {
    input: {
      keyboard: {
        on: () => undefined,
        off: () => undefined,
      },
      on: (event: string) => {
        inputEvents.push(event);
      },
      off: () => undefined,
    },
    tweens: {
      addCounter: (config: CounterConfig) => {
        counter = config;
      },
    },
  } as unknown as Phaser.Scene;
  const playerObject = {
    x: 0,
    y: 0,
    setPosition(x: number, y: number) {
      playerObject.x = x;
      playerObject.y = y;
      return this;
    },
  };
  const player = playerObject as unknown as Phaser.GameObjects.Image;

  return {
    scene,
    player,
    playerState: playerObject,
    inputEvents,
    getCounter: () => counter,
  };
}

test("pointer gestures are not registered when on-screen controls are active", () => {
  const harness = createControllerHarness();
  const controller = new PlayerController();

  controller.attach(
    harness.scene,
    harness.player,
    {
      columns: 3,
      laneCount: 2,
      columnX: (column) => column * 100,
      laneY: (lane) => lane * 100,
    },
    {
      startColumn: 1,
      pointerGestures: false,
      onPosition: () => undefined,
      onArrive: () => undefined,
    },
  );

  assert.deepEqual(harness.inputEvents, []);
});

test("a jump follows the same relative point on a moving target", () => {
  const harness = createControllerHarness();
  const controller = new PlayerController();
  let targetX: number | null = 100;
  const events: string[] = [];

  controller.attach(
    harness.scene,
    harness.player,
    {
      columns: 1,
      laneCount: 2,
      columnX: () => 50,
      laneY: (lane) => lane * 100,
    },
    {
      startColumn: 0,
      resolveMovingTarget: () => ({ getCurrentX: () => targetX }),
      onPosition: () => undefined,
      onBeforeArrive: () => events.push("support"),
      onArrive: () => events.push("arrive"),
    },
  );

  controller.requestMove("forward");
  const counter = harness.getCounter();
  assert.ok(counter);

  targetX = 140;
  counter.onUpdate({ getValue: () => 0.5, stop: () => undefined });
  assert.equal(harness.playerState.x, 95);

  targetX = 160;
  counter.onComplete();
  assert.equal(harness.playerState.x, 160);
  assert.deepEqual(events, ["support", "arrive"]);
});

test("a lane-changing jump targets the player's current foot position", () => {
  const harness = createControllerHarness();
  const controller = new PlayerController();
  let targetReferenceX = 0;
  let targetX = 180;

  controller.attach(
    harness.scene,
    harness.player,
    {
      columns: 3,
      laneCount: 2,
      columnX: () => 100,
      laneY: (lane) => lane * 100,
    },
    {
      startColumn: 1,
      resolveMovingTarget: (_lane, _column, defaultX) => {
        targetReferenceX = defaultX;
        return { getCurrentX: () => targetX };
      },
      onPosition: () => undefined,
      onArrive: () => undefined,
    },
  );

  harness.player.setPosition(180, 0);
  controller.requestMove("forward");
  const counter = harness.getCounter();
  assert.ok(counter);
  assert.equal(targetReferenceX, 180);

  targetX = 166;
  counter.onComplete();
  assert.equal(harness.playerState.x, 166);
});

test("a jump fails only when its moving target becomes invalid", () => {
  const harness = createControllerHarness();
  const controller = new PlayerController();
  let targetX: number | null = 100;
  let stopped = false;
  let failures = 0;
  let arrivals = 0;

  controller.attach(
    harness.scene,
    harness.player,
    {
      columns: 1,
      laneCount: 2,
      columnX: () => 50,
      laneY: (lane) => lane * 100,
    },
    {
      startColumn: 0,
      resolveMovingTarget: () => ({ getCurrentX: () => targetX }),
      onPosition: () => undefined,
      onMoveFailed: () => {
        failures += 1;
      },
      onArrive: () => {
        arrivals += 1;
      },
    },
  );

  controller.requestMove("forward");
  const counter = harness.getCounter();
  assert.ok(counter);

  targetX = null;
  counter.onUpdate({
    getValue: () => 0.5,
    stop: () => {
      stopped = true;
    },
  });

  assert.equal(stopped, true);
  assert.equal(failures, 1);
  assert.equal(arrivals, 0);
});
