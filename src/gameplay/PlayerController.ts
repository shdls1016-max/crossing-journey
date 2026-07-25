import type Phaser from "phaser";

export type MoveDirection = "forward" | "backward" | "left" | "right";

export interface PlayerGridMetrics {
  readonly columns: number;
  readonly laneCount: number;
  readonly columnX: (column: number) => number;
  readonly laneY: (lane: number) => number;
}

export interface MovingTarget {
  readonly getCurrentX: () => number | null;
}

export interface PlayerControllerOptions {
  readonly startColumn: number;
  readonly onMoveStart?: (
    fromLane: number,
    fromColumn: number,
    toLane: number,
    toColumn: number,
  ) => void;
  readonly resolveMovingTarget?: (
    toLane: number,
    toColumn: number,
    defaultX: number,
  ) => MovingTarget | null;
  readonly onBeforeArrive?: (lane: number, column: number) => void;
  readonly onMoveFailed?: () => void;
  readonly onArrive: (lane: number, column: number) => void;
  readonly onPosition: (x: number, y: number) => void;
}

export class PlayerController {
  private scene: Phaser.Scene | null = null;
  private player: Phaser.GameObjects.Image | null = null;
  private metrics: PlayerGridMetrics | null = null;
  private options: PlayerControllerOptions | null = null;
  private lane = 0;
  private column = 0;
  private moving = false;
  private enabled = true;
  private bufferedMove: MoveDirection | null = null;
  private pointerStart: { x: number; y: number } | null = null;
  private keyboardHandler?: (event: KeyboardEvent) => void;
  private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerUpHandler?: (pointer: Phaser.Input.Pointer) => void;

  attach(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Image,
    metrics: PlayerGridMetrics,
    options: PlayerControllerOptions,
  ): void {
    this.destroy();
    this.scene = scene;
    this.player = player;
    this.metrics = metrics;
    this.options = options;
    this.lane = 0;
    this.column = clamp(options.startColumn, 0, metrics.columns - 1);
    this.moving = false;
    this.enabled = true;
    this.bufferedMove = null;
    this.placeAtGridPosition();

    this.keyboardHandler = (event) => {
      if (event.repeat) return;
      const direction = directionForKey(event.key);
      if (!direction) return;
      event.preventDefault();
      this.requestMove(direction);
    };
    scene.input.keyboard?.on("keydown", this.keyboardHandler);

    this.pointerDownHandler = (pointer) => {
      if (!this.enabled) return;
      this.pointerStart = { x: pointer.x, y: pointer.y };
    };
    this.pointerUpHandler = (pointer) => {
      if (!this.enabled || !this.pointerStart) return;
      const deltaX = pointer.x - this.pointerStart.x;
      const deltaY = pointer.y - this.pointerStart.y;
      this.pointerStart = null;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < 28) {
        this.requestMove("forward");
      } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.requestMove(deltaX > 0 ? "right" : "left");
      } else {
        this.requestMove(deltaY > 0 ? "backward" : "forward");
      }
    };
    scene.input.on("pointerdown", this.pointerDownHandler);
    scene.input.on("pointerup", this.pointerUpHandler);
  }

  setMetrics(metrics: PlayerGridMetrics, preserveHorizontalPosition = false): void {
    this.metrics = metrics;
    if (!this.moving) this.placeAtGridPosition(preserveHorizontalPosition);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.bufferedMove = null;
      this.pointerStart = null;
    }
  }

  getLane(): number {
    return this.lane;
  }

  getColumn(): number {
    return this.column;
  }

  isMoving(): boolean {
    return this.moving;
  }

  requestMove(direction: MoveDirection): void {
    if (!this.enabled || !this.scene || !this.player || !this.metrics || !this.options) return;
    if (this.moving) {
      this.bufferedMove = direction;
      return;
    }

    const next = this.resolveDestination(direction);
    if (!next || (next.lane === this.lane && next.column === this.column)) return;

    const fromX = this.player.x;
    const fromY = this.player.y;
    const defaultToX = this.metrics.columnX(next.column);
    const toY = this.metrics.laneY(next.lane);
    const movingTarget =
      this.options.resolveMovingTarget?.(next.lane, next.column, defaultToX) ?? null;
    this.options.onMoveStart?.(this.lane, this.column, next.lane, next.column);
    this.moving = true;
    let moveFailed = false;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 180,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        if (!this.player || !this.options) return;
        const currentToX = movingTarget
          ? movingTarget.getCurrentX()
          : defaultToX;
        if (currentToX === null) {
          moveFailed = true;
          this.moving = false;
          this.bufferedMove = null;
          tween.stop();
          this.options.onMoveFailed?.();
          return;
        }
        const progress = tween.getValue() ?? 0;
        const x = lerp(fromX, currentToX, progress);
        const y = lerp(fromY, toY, progress) - Math.sin(progress * Math.PI) * 14;
        this.player.setPosition(x, y);
        this.options.onPosition(x, y);
      },
      onComplete: () => {
        if (moveFailed || !this.player || !this.options) return;
        const currentToX = movingTarget
          ? movingTarget.getCurrentX()
          : defaultToX;
        if (currentToX === null) {
          this.moving = false;
          this.bufferedMove = null;
          this.options.onMoveFailed?.();
          return;
        }
        this.lane = next.lane;
        this.column = next.column;
        this.player.setPosition(currentToX, toY);
        this.options.onPosition(currentToX, toY);
        this.moving = false;
        this.options.onBeforeArrive?.(this.lane, this.column);
        this.options.onArrive(this.lane, this.column);
        const buffered = this.bufferedMove;
        this.bufferedMove = null;
        if (buffered) this.requestMove(buffered);
      },
    });
  }

  destroy(): void {
    if (this.scene) {
      if (this.keyboardHandler) this.scene.input.keyboard?.off("keydown", this.keyboardHandler);
      if (this.pointerDownHandler) this.scene.input.off("pointerdown", this.pointerDownHandler);
      if (this.pointerUpHandler) this.scene.input.off("pointerup", this.pointerUpHandler);
    }
    this.scene = null;
    this.player = null;
    this.metrics = null;
    this.options = null;
    this.keyboardHandler = undefined;
    this.pointerDownHandler = undefined;
    this.pointerUpHandler = undefined;
    this.bufferedMove = null;
    this.pointerStart = null;
  }

  private resolveDestination(direction: MoveDirection): { lane: number; column: number } | null {
    if (!this.metrics) return null;
    const laneDelta = direction === "forward" ? 1 : direction === "backward" ? -1 : 0;
    const columnDelta = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    return {
      lane: clamp(this.lane + laneDelta, 0, this.metrics.laneCount - 1),
      column: clamp(this.column + columnDelta, 0, this.metrics.columns - 1),
    };
  }

  private placeAtGridPosition(preserveHorizontalPosition = false): void {
    if (!this.player || !this.metrics || !this.options) return;
    const x = preserveHorizontalPosition
      ? this.player.x
      : this.metrics.columnX(this.column);
    const y = this.metrics.laneY(this.lane);
    this.player.setPosition(x, y);
    this.options.onPosition(x, y);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function directionForKey(key: string): MoveDirection | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return "forward";
    case "arrowdown":
    case "s":
      return "backward";
    case "arrowleft":
    case "a":
      return "left";
    case "arrowright":
    case "d":
      return "right";
    default:
      return null;
  }
}
