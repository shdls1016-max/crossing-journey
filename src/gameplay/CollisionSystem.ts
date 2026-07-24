import type Phaser from "phaser";
import type { ActiveVehicle } from "./ObstacleSpawner";

export interface CollisionSystemOptions {
  readonly player: Phaser.GameObjects.Image;
  readonly getPlayerLane: () => number;
  readonly getVehicles: () => readonly ActiveVehicle[];
  readonly onCollision: () => void;
}

export class CollisionSystem {
  private options: CollisionSystemOptions | null = null;
  private enabled = true;

  configure(options: CollisionSystemOptions): void {
    this.options = options;
    this.enabled = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  update(): void {
    if (!this.enabled || !this.options) return;
    const playerLane = this.options.getPlayerLane();
    const player = this.options.player;
    const playerLeft = player.x - 18;
    const playerRight = player.x + 18;
    const playerTop = player.y - 37;
    const playerBottom = player.y - 5;

    for (const vehicle of this.options.getVehicles()) {
      if (vehicle.lane !== playerLane || !vehicle.image.active) continue;
      const vehicleLeft = vehicle.image.x - vehicle.collisionWidth / 2;
      const vehicleRight = vehicle.image.x + vehicle.collisionWidth / 2;
      const vehicleTop = vehicle.image.y - vehicle.collisionHeight * 0.72;
      const vehicleBottom = vehicle.image.y + vehicle.collisionHeight * 0.28;
      if (
        playerRight > vehicleLeft &&
        playerLeft < vehicleRight &&
        playerBottom > vehicleTop &&
        playerTop < vehicleBottom
      ) {
        this.enabled = false;
        this.options.onCollision();
        return;
      }
    }
  }

  reset(): void {
    this.options = null;
    this.enabled = false;
  }
}

