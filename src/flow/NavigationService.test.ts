import assert from "node:assert/strict";
import test from "node:test";
import type Phaser from "phaser";
import { NavigationService, SCENE_KEYS } from "./NavigationService";
import { ScreenFlowStore } from "./ScreenFlowStore";

test("Continue resumes the paused scene, game loop and input", () => {
  const flow = new ScreenFlowStore();
  const navigation = new NavigationService(flow);
  let active = true;
  let paused = false;
  let loopAwake = false;
  const sceneInput = { enabled: false };
  const gameInput = { enabled: false };
  const game = {
    loop: {
      wake: () => {
        loopAwake = true;
      },
    },
    input: gameInput,
    scene: {
      isActive: (key: string) => key === SCENE_KEYS.game && active,
      isPaused: (key: string) => key === SCENE_KEYS.game && paused,
      pause: (key: string) => {
        if (key !== SCENE_KEYS.game) return;
        active = false;
        paused = true;
      },
      resume: (key: string) => {
        if (key !== SCENE_KEYS.game) return;
        active = true;
        paused = false;
      },
      getScene: () => ({ input: sceneInput }),
    },
  } as unknown as Phaser.Game;

  navigation.attach(game);
  flow.showGame(6);
  flow.openPopup("pause");
  assert.equal(paused, true);

  navigation.resumeGame();

  assert.equal(flow.getSnapshot().popup, null);
  assert.equal(paused, false);
  assert.equal(active, true);
  assert.equal(loopAwake, true);
  assert.equal(gameInput.enabled, true);
  assert.equal(sceneInput.enabled, true);
});
