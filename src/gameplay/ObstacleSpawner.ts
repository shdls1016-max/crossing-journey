import type Phaser from "phaser";
import { ASSET_KEYS } from "../assets/assetCatalog";
import type {
  GameplayStageDefinition,
  LogKind,
  RiverLaneDefinition,
  RoadLaneDefinition,
  VehicleKind,
} from "../data/gameplayStages";

export interface ObstacleLayout {
  readonly width: number;
  readonly playLeft: number;
  readonly playWidth: number;
  readonly laneHeight: number;
  readonly laneY: (lane: number) => number;
}

export interface ActiveVehicle {
  readonly image: Phaser.GameObjects.Image;
  readonly lane: number;
  readonly direction: -1 | 1;
  readonly speed: number;
  readonly collisionWidth: number;
  readonly collisionHeight: number;
}

interface MutableVehicle extends ActiveVehicle {
  readonly normalizedOffset: number;
}

export interface ActiveLog {
  readonly image: Phaser.GameObjects.Image;
  readonly lane: number;
  readonly direction: -1 | 1;
  readonly speed: number;
  supportWidth: number;
  frameDeltaX: number;
}

interface MutableLog extends ActiveLog {
  readonly kind: LogKind;
  readonly normalizedOffset: number;
}

const LOG_TOP_DOWN_ANGLE = 18;
const LOG_VISUAL_HEIGHT_SCALE = 0.82;
const LOG_LANDING_OFFSET = 0.16;
const LOG_MINIMUM_GAP = 8;

export class ObstacleSpawner {
  private scene: Phaser.Scene | null = null;
  private stage: GameplayStageDefinition | null = null;
  private layout: ObstacleLayout | null = null;
  private readonly vehicles: MutableVehicle[] = [];
  private readonly logs: MutableLog[] = [];
  private running = true;

  configure(
    scene: Phaser.Scene,
    stage: GameplayStageDefinition,
    layout: ObstacleLayout,
  ): void {
    this.reset();
    this.scene = scene;
    this.stage = stage;
    this.layout = layout;
    this.running = true;

    stage.lanes.forEach((lane, laneIndex) => {
      if (lane.type === "road") this.createLaneVehicles(lane, laneIndex);
      if (lane.type === "river") this.createLaneLogs(lane, laneIndex);
    });
    this.relayout(layout);
  }

  update(delta: number): void {
    if (!this.running || !this.layout) return;
    const seconds = Math.min(delta, 50) / 1000;
    for (const vehicle of this.vehicles) {
      vehicle.image.x += vehicle.speed * vehicle.direction * seconds;
      const margin = vehicle.image.displayWidth * 0.65;
      if (vehicle.direction > 0 && vehicle.image.x > this.layout.width + margin) {
        vehicle.image.x = -margin;
      } else if (vehicle.direction < 0 && vehicle.image.x < -margin) {
        vehicle.image.x = this.layout.width + margin;
      }
    }
    for (const log of this.logs) {
      log.frameDeltaX = log.speed * log.direction * seconds;
      log.image.x += log.frameDeltaX;
      const margin = log.image.displayWidth * 0.58;
      const left = this.layout.playLeft;
      const right = left + this.layout.playWidth;
      if (log.direction > 0 && log.image.x > right + margin) {
        log.image.x = this.findOpenSpawnX(log, left - margin);
      } else if (log.direction < 0 && log.image.x < left - margin) {
        log.image.x = this.findOpenSpawnX(log, right + margin);
      }
    }
  }

  relayout(layout: ObstacleLayout, preservePositions = false): void {
    const previousWidth = this.layout?.width ?? layout.width;
    const previousPlayLeft = this.layout?.playLeft ?? layout.playLeft;
    const previousPlayWidth = this.layout?.playWidth ?? layout.playWidth;
    this.layout = layout;
    for (const vehicle of this.vehicles) {
      const displaySize =
        vehicle.image.texture.key === ASSET_KEYS.vehicle.truck
          ? Math.min(118, layout.laneHeight * 1.24)
          : Math.min(92, layout.laneHeight * 0.98);
      vehicle.image.setDisplaySize(displaySize, displaySize);
      vehicle.image.y = layout.laneY(vehicle.lane);
      vehicle.image.x = preservePositions
        ? (vehicle.image.x / previousWidth) * layout.width
        : vehicle.direction > 0
          ? vehicle.normalizedOffset * layout.width
          : (1 - vehicle.normalizedOffset) * layout.width;
    }
    for (const log of this.logs) {
      const displaySize = logDisplaySize(log.kind, layout.laneHeight);
      log.image
        .setDisplaySize(displaySize, displaySize * LOG_VISUAL_HEIGHT_SCALE)
        .setAngle(LOG_TOP_DOWN_ANGLE);
      log.image.y =
        layout.laneY(log.lane) + layout.laneHeight * LOG_LANDING_OFFSET;
      log.image.x = preservePositions
        ? layout.playLeft +
          ((log.image.x - previousPlayLeft) / previousPlayWidth) * layout.playWidth
        : log.direction > 0
          ? layout.playLeft + log.normalizedOffset * layout.playWidth
          : layout.playLeft + (1 - log.normalizedOffset) * layout.playWidth;
      log.supportWidth = logVisibleWidth(log.kind, displaySize);
      log.frameDeltaX = 0;
    }
    this.separateOverlappingLogs();
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  getVehicles(): readonly ActiveVehicle[] {
    return this.vehicles;
  }

  getLogs(): readonly ActiveLog[] {
    return this.logs;
  }

  reset(): void {
    for (const vehicle of this.vehicles) vehicle.image.destroy();
    for (const log of this.logs) log.image.destroy();
    this.vehicles.length = 0;
    this.logs.length = 0;
    this.scene = null;
    this.stage = null;
    this.layout = null;
    this.running = false;
  }

  private createLaneVehicles(lane: RoadLaneDefinition, laneIndex: number): void {
    if (!this.scene || !this.layout) return;
    const intervalFactor = clamp(lane.spawnInterval / 4, 0.72, 1.24);
    const spacing = (1 / lane.vehicleCount) * intervalFactor;
    for (let index = 0; index < lane.vehicleCount; index += 1) {
      const kind = lane.vehicles[index % lane.vehicles.length] ?? "compact";
      const image = this.scene.add
        .image(0, 0, keyForVehicle(kind))
        .setOrigin(0.5, 0.78)
        .setDepth(18);
      const normalizedOffset = (lane.phase + index * spacing) % 1;
      const collisionScale = kind === "truck" ? 0.58 : 0.5;
      this.vehicles.push({
        image,
        lane: laneIndex,
        direction: lane.direction,
        speed: lane.speed,
        normalizedOffset,
        collisionWidth: (kind === "truck" ? 118 : 92) * collisionScale,
        collisionHeight: kind === "truck" ? 42 : 34,
      });
    }
  }

  private createLaneLogs(lane: RiverLaneDefinition, laneIndex: number): void {
    if (!this.scene || !this.layout) return;
    const spacing = (1 / lane.logCount) * lane.spacingFactor;
    for (let index = 0; index < lane.logCount; index += 1) {
      const kind = lane.logs[index % lane.logs.length] ?? "medium";
      const image = this.scene.add
        .image(0, 0, keyForLog(kind))
        .setOrigin(0.5)
        .setDepth(17);
      this.logs.push({
        image,
        kind,
        lane: laneIndex,
        direction: lane.direction,
        speed: lane.speed,
        normalizedOffset: (lane.phase + index * spacing) % 1,
        supportWidth: 0,
        frameDeltaX: 0,
      });
    }
  }

  private findOpenSpawnX(log: MutableLog, initialX: number): number {
    const direction = log.direction;
    let spawnX = initialX;
    for (let attempt = 0; attempt < this.logs.length; attempt += 1) {
      const overlapping = this.logs.find(
        (candidate) =>
          candidate !== log &&
          candidate.lane === log.lane &&
          logsOverlapAt(spawnX, log.supportWidth, candidate.image.x, candidate.supportWidth),
      );
      if (!overlapping) break;
      const separation =
        (log.supportWidth + overlapping.supportWidth) * 0.5 + LOG_MINIMUM_GAP;
      spawnX =
        direction > 0
          ? overlapping.image.x - separation
          : overlapping.image.x + separation;
    }
    return spawnX;
  }

  private separateOverlappingLogs(): void {
    const laneIndexes = new Set(this.logs.map((log) => log.lane));
    for (const lane of laneIndexes) {
      const laneLogs = this.logs
        .filter((log) => log.lane === lane)
        .sort((left, right) => left.image.x - right.image.x);
      for (let index = 1; index < laneLogs.length; index += 1) {
        const previous = laneLogs[index - 1]!;
        const current = laneLogs[index]!;
        const minimumDistance =
          (previous.supportWidth + current.supportWidth) * 0.5 + LOG_MINIMUM_GAP;
        if (current.image.x - previous.image.x < minimumDistance) {
          current.image.x = previous.image.x + minimumDistance;
        }
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function keyForVehicle(kind: VehicleKind): string {
  switch (kind) {
    case "sedan":
      return ASSET_KEYS.vehicle.sedan;
    case "truck":
      return ASSET_KEYS.vehicle.truck;
    default:
      return ASSET_KEYS.vehicle.compact;
  }
}

function keyForLog(kind: LogKind): string {
  return kind === "short" ? ASSET_KEYS.obstacle.logSmall : ASSET_KEYS.obstacle.logLong;
}

function logDisplaySize(kind: LogKind, laneHeight: number): number {
  switch (kind) {
    case "short":
      return Math.min(150, laneHeight * 1.58);
    case "long":
      return Math.min(228, laneHeight * 2.4);
    default:
      return Math.min(188, laneHeight * 1.98);
  }
}

function logVisibleWidth(kind: LogKind, displaySize: number): number {
  return displaySize * (kind === "short" ? 0.78 : 1.02);
}

function logsOverlapAt(
  leftX: number,
  leftWidth: number,
  rightX: number,
  rightWidth: number,
): boolean {
  const minimumDistance = (leftWidth + rightWidth) * 0.5 + LOG_MINIMUM_GAP;
  return Math.abs(leftX - rightX) < minimumDistance;
}
