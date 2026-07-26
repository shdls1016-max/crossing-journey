import assert from "node:assert/strict";
import test from "node:test";
import { GameplayInputService } from "./GameplayInputService";
import type { MoveDirection } from "./PlayerController";

test("direction controls forward each requested move and unsubscribe cleanly", () => {
  const input = new GameplayInputService();
  const received: MoveDirection[] = [];
  const unsubscribe = input.subscribe((direction) => received.push(direction));

  input.requestMove("left");
  input.requestMove("forward");
  input.requestMove("right");
  unsubscribe();
  input.requestMove("forward");

  assert.deepEqual(received, ["left", "forward", "right"]);
});
