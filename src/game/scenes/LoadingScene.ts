import Phaser from "phaser";
import { AssetPreloader } from "../../assets/AssetPreloader";
import { navigationService, screenFlow } from "../../appServices";
import { SCENE_KEYS } from "../../flow/NavigationService";

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.loading);
  }

  preload(): void {
    screenFlow.setLoadingProgress(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      screenFlow.setLoadingProgress(progress);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      screenFlow.setLoadingProgress(1);
    });
    AssetPreloader.queue(this);
  }

  create(): void {
    this.time.delayedCall(180, () => navigationService.toWorldMap());
  }
}
