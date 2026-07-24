import type Phaser from "phaser";
import { IMAGE_ASSETS } from "./assetCatalog";

export class AssetPreloader {
  static queue(scene: Phaser.Scene): void {
    const queuedKeys = new Set<string>();
    scene.load.on("loaderror", (file: { key?: string; url?: string }) => {
      console.error(
        `[AssetPreloader] Failed to load "${file.key ?? "unknown"}" from "${file.url ?? "unknown"}".`,
      );
    });

    for (const asset of IMAGE_ASSETS) {
      if (queuedKeys.has(asset.key)) {
        console.error(`[AssetPreloader] Duplicate texture key: "${asset.key}".`);
        continue;
      }
      queuedKeys.add(asset.key);
      if (!scene.textures.exists(asset.key)) {
        scene.load.image(asset.key, asset.path);
      }
    }
  }
}
