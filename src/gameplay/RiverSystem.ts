import type Phaser from "phaser";
import type { ActiveLog } from "./ObstacleSpawner";

export interface HorizontalPlayBounds {
  readonly left: number;
  readonly right: number;
}

export interface RiverSystemOptions {
  readonly player: Phaser.GameObjects.Image;
  readonly getPlayerLane: () => number;
  readonly isPlayerMoving: () => boolean;
  readonly isRiverLane: (lane: number) => boolean;
  readonly getLogs: () => readonly ActiveLog[];
  readonly getHorizontalBounds: () => HorizontalPlayBounds;
  readonly onPosition: (x: number, y: number) => void;
  readonly onFailure: () => void;
}

export class RiverSystem {
  private options: RiverSystemOptions | null = null;
  private support: ActiveLog | null = null;
  private enabled = false;

  configure(options: RiverSystemOptions): void {
    this.options = options;
    this.support = null;
    this.enabled = true;
  }

  handleArrival(): boolean {
    if (!this.enabled || !this.options) return true;
    const lane = this.options.getPlayerLane();
    if (!this.options.isRiverLane(lane)) {
      this.support = null;
      return true;
    }

    this.support = findSupportingLog(
      this.options.player.x,
      lane,
      this.options.getLogs(),
      this.support,
    );
    if (this.support) return true;
    this.fail();
    return false;
  }

  update(): void {
    if (!this.enabled || !this.options || this.options.isPlayerMoving()) return;
    const lane = this.options.getPlayerLane();
    if (!this.options.isRiverLane(lane)) {
      this.support = null;
      return;
    }

    if (this.support?.lane === lane && this.support.image.active) {
      this.options.player.x += this.support.frameDeltaX;
      this.options.onPosition(this.options.player.x, this.options.player.y);
    }

    const bounds = this.options.getHorizontalBounds();
    if (
      this.options.player.x < bounds.left ||
      this.options.player.x > bounds.right
    ) {
      this.fail();
      return;
    }

    this.support = findSupportingLog(
      this.options.player.x,
      lane,
      this.options.getLogs(),
      this.support,
    );
    if (!this.support) this.fail();
  }

  releaseSupport(): void {
    this.support = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.support = null;
  }

  reset(): void {
    this.options = null;
    this.support = null;
    this.enabled = false;
  }

  private fail(): void {
    if (!this.enabled || !this.options) return;
    this.enabled = false;
    this.support = null;
    this.options.onFailure();
  }
}

export function findSupportingLog(
  playerFootX: number,
  lane: number,
  logs: readonly ActiveLog[],
  preferred: ActiveLog | null = null,
): ActiveLog | null {
  const candidates = logs.filter(
    (log) =>
      log.lane === lane &&
      log.image.active &&
      Math.abs(playerFootX - log.image.x) <= log.supportWidth * 0.5,
  );
  if (preferred && candidates.includes(preferred)) return preferred;
  return (
    candidates.sort(
      (left, right) =>
        Math.abs(playerFootX - left.image.x) - Math.abs(playerFootX - right.image.x),
    )[0] ?? null
  );
}
