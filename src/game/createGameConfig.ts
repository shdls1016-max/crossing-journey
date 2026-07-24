import Phaser from "phaser";
import { DESIGN_TOKENS } from "../config/designTokens";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";
import { WorldMapScene } from "./scenes/WorldMapScene";

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,
    parent: "game-root",
    backgroundColor: DESIGN_TOKENS.colors.secondary,
    scene: [LoadingScene, WorldMapScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: {
      antialias: true,
      roundPixels: false,
      transparent: false,
    },
    input: {
      activePointers: 3,
      touch: {
        capture: true,
      },
    },
    banner: false,
  };
}
