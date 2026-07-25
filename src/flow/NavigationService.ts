import type Phaser from "phaser";
import type { ScreenFlowStore } from "./ScreenFlowStore";

export const SCENE_KEYS = {
  loading: "LoadingScene",
  worldMap: "WorldMapScene",
  game: "GameScene",
} as const;

export class NavigationService {
  private game: Phaser.Game | null = null;

  constructor(private readonly flow: ScreenFlowStore) {}

  attach(game: Phaser.Game): void {
    this.game = game;
    this.flow.subscribe((state) => {
      if (state.screen !== "game") return;
      if (state.popup && game.scene.isActive(SCENE_KEYS.game)) {
        game.scene.pause(SCENE_KEYS.game);
      } else if (!state.popup && game.scene.isPaused(SCENE_KEYS.game)) {
        game.scene.resume(SCENE_KEYS.game);
      }
    });
  }

  toWorldMap(): void {
    this.flow.showWorldMap();
    if (!this.game) return;
    if (this.game.scene.isActive(SCENE_KEYS.game) || this.game.scene.isPaused(SCENE_KEYS.game)) {
      this.game.scene.stop(SCENE_KEYS.game);
    }
    if (this.game.scene.isSleeping(SCENE_KEYS.worldMap)) {
      this.game.scene.wake(SCENE_KEYS.worldMap);
    } else if (!this.game.scene.isActive(SCENE_KEYS.worldMap)) {
      this.game.scene.start(SCENE_KEYS.worldMap);
    }
  }

  resumeGame(): void {
    const state = this.flow.getSnapshot();
    if (state.screen !== "game" || state.popup !== "pause") return;
    this.flow.closePopup();
    if (!this.game) return;
    this.game.loop.wake();
    this.game.input.enabled = true;
    const scene = this.game.scene.getScene(SCENE_KEYS.game);
    scene.input.enabled = true;
    if (this.game.scene.isPaused(SCENE_KEYS.game)) {
      this.game.scene.resume(SCENE_KEYS.game);
    }
  }

  toGame(stageId: number): void {
    const playableStageId = Math.floor(stageId);
    if (playableStageId < 1 || playableStageId > 20) return;
    const current = this.flow.getSnapshot();
    if (
      current.screen === "game" &&
      current.activeStage === playableStageId &&
      current.popup === null
    ) {
      return;
    }
    this.flow.showGame(playableStageId);
    if (!this.game) return;
    if (
      this.game.scene.isActive(SCENE_KEYS.worldMap) ||
      this.game.scene.isSleeping(SCENE_KEYS.worldMap)
    ) {
      this.game.scene.stop(SCENE_KEYS.worldMap);
    }
    this.game.scene.start(SCENE_KEYS.game, { stageId: playableStageId });
  }

  toCharacterSelect(): void {
    if (this.flow.getSnapshot().screen !== "world-map") return;
    this.flow.showCharacterSelect();
    this.game?.scene.sleep(SCENE_KEYS.worldMap);
  }

  backFromCharacterSelect(): void {
    if (this.flow.getSnapshot().screen !== "character-select") return;
    this.flow.showWorldMap();
    if (this.game?.scene.isSleeping(SCENE_KEYS.worldMap)) {
      this.game.scene.wake(SCENE_KEYS.worldMap);
    } else {
      this.game?.scene.start(SCENE_KEYS.worldMap);
    }
  }
}
