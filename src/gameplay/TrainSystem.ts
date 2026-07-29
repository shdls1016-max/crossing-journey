import type Phaser from "phaser";
import { ASSET_KEYS } from "../assets/assetCatalog";
import type {
  GameplayStageDefinition,
  RailwayLaneDefinition,
} from "../data/gameplayStages";
import type { ActiveVehicle, ObstacleLayout } from "./ObstacleSpawner";

export type TrainPhase =
  | "idle"
  | "warning"
  | "closing"
  | "waiting"
  | "passing"
  | "opening";

export interface TrainPhaseSnapshot {
  readonly phase: TrainPhase;
  readonly phaseProgress: number;
  readonly trainProgress: number;
}

interface TrainLaneRuntime {
  readonly definition: RailwayLaneDefinition;
  readonly lane: number;
  readonly trainImages: Phaser.GameObjects.Image[];
  readonly vehicles: ActiveVehicle[];
  readonly warningLeft: Phaser.GameObjects.Graphics;
  readonly warningRight: Phaser.GameObjects.Graphics;
  readonly barrierLeft: Phaser.GameObjects.Graphics;
  readonly barrierRight: Phaser.GameObjects.Graphics;
  elapsedMs: number;
  phase: TrainPhase;
}

const BARRIER_TRANSITION_MS = 650;
const TRAIN_LEAD_MS = 800;
const TRAIN_MARGIN = 80;
const TRAIN_PERSPECTIVE_ANGLE = 22;
const TRAIN_CARRIAGE_WIDTH_SCALE = 0.56;
const TRAIN_CARRIAGE_HEIGHT_SCALE = 0.37;
const TRAIN_CARRIAGE_Y_OFFSET = 0.022;
// Measured alpha bounds allow a small controlled overlap that hides the
// source PNG padding while keeping the visible carriage seams consistent.
const TRAIN_HEAD_ALPHA_WIDTH = 0.88;
const TRAIN_HEAD_ALPHA_HEIGHT = 0.577;
const TRAIN_CARRIAGE_ALPHA_WIDTH = 0.964;
const TRAIN_SEGMENT_GAP = -12;

export class TrainSystem {
  private scene: Phaser.Scene | null = null;
  private layout: ObstacleLayout | null = null;
  private readonly lanes: TrainLaneRuntime[] = [];
  private running = false;

  configure(
    scene: Phaser.Scene,
    stage: GameplayStageDefinition,
    layout: ObstacleLayout,
  ): void {
    this.reset();
    this.scene = scene;
    this.layout = layout;
    this.running = true;

    stage.lanes.forEach((definition, lane) => {
      if (definition.type !== "railway") return;
      this.lanes.push(this.createLane(definition, lane));
    });
    this.relayout(layout);
    this.renderAll();
  }

  update(delta: number): void {
    if (!this.running || !this.layout) return;
    const boundedDelta = Math.min(delta, 100);
    for (const lane of this.lanes) lane.elapsedMs += boundedDelta;
    this.renderAll();
  }

  relayout(layout: ObstacleLayout): void {
    this.layout = layout;
    for (const runtime of this.lanes) {
      const y = layout.laneY(runtime.lane);
      const trainSize = trainDisplaySize(layout.laneHeight);
      const barrierLength = Math.max(56, layout.playWidth * 0.43);
      const lightY = y - layout.laneHeight * 0.34;

      runtime.warningLeft
        .clear()
        .fillStyle(0x583b35, 0.96)
        .fillCircle(0, 0, 13)
        .fillStyle(0xff5a4a, 1)
        .fillCircle(0, 0, 8)
        .setPosition(layout.playLeft + 22, lightY);
      runtime.warningRight
        .clear()
        .fillStyle(0x583b35, 0.96)
        .fillCircle(0, 0, 13)
        .fillStyle(0xffd54a, 1)
        .fillCircle(0, 0, 8)
        .setPosition(layout.playLeft + layout.playWidth - 22, lightY);

      drawBarrier(runtime.barrierLeft, barrierLength, 1);
      drawBarrier(runtime.barrierRight, barrierLength, -1);
      runtime.barrierLeft.setPosition(layout.playLeft + 18, y);
      runtime.barrierRight.setPosition(layout.playLeft + layout.playWidth - 18, y);

      runtime.trainImages.forEach((image, index) => {
        const isHead = index === 0;
        image
          .setDisplaySize(
            isHead ? trainSize : trainSize * TRAIN_CARRIAGE_WIDTH_SCALE,
            isHead ? trainSize : trainSize * TRAIN_CARRIAGE_HEIGHT_SCALE,
          )
          .setFlipX(runtime.definition.direction < 0)
          .setAngle(
            isHead
              ? -TRAIN_PERSPECTIVE_ANGLE * runtime.definition.direction
              : 0,
          )
          .setOrigin(0.5);
      });
      this.positionTrain(runtime, 0);
    }
    this.renderAll();
  }

  getVehicles(): readonly ActiveVehicle[] {
    return this.lanes.flatMap((lane) => lane.vehicles);
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  reset(): void {
    for (const lane of this.lanes) {
      for (const image of lane.trainImages) image.destroy();
      lane.warningLeft.destroy();
      lane.warningRight.destroy();
      lane.barrierLeft.destroy();
      lane.barrierRight.destroy();
    }
    this.lanes.length = 0;
    this.scene = null;
    this.layout = null;
    this.running = false;
  }

  private createLane(
    definition: RailwayLaneDefinition,
    lane: number,
  ): TrainLaneRuntime {
    const scene = this.scene!;
    const trainImages: Phaser.GameObjects.Image[] = [];
    const vehicles: ActiveVehicle[] = [];
    for (let index = 0; index < definition.trainCars; index += 1) {
      const image = scene.add
        .image(
          0,
          0,
          index === 0
            ? ASSET_KEYS.vehicle.train
            : ASSET_KEYS.vehicle.trainCarriage,
        )
        .setDepth(18)
        .setVisible(false)
        .setActive(false);
      trainImages.push(image);
      vehicles.push({
        image,
        lane,
        direction: definition.direction,
        speed: definition.speed,
        collisionWidth: 0,
        collisionHeight: 0,
      });
    }

    return {
      definition,
      lane,
      trainImages,
      vehicles,
      warningLeft: scene.add.graphics().setDepth(16),
      warningRight: scene.add.graphics().setDepth(16),
      barrierLeft: scene.add.graphics().setDepth(17),
      barrierRight: scene.add.graphics().setDepth(17),
      elapsedMs: 0,
      phase: "idle",
    };
  }

  private renderAll(): void {
    if (!this.layout) return;
    for (const runtime of this.lanes) {
      const trainSize = trainDisplaySize(this.layout.laneHeight);
      const trainLength =
        trainSize +
        trainOffsetForIndex(runtime.definition.trainCars - 1, trainSize);
      const passMs =
        ((this.layout.width + trainLength + TRAIN_MARGIN * 2) /
          runtime.definition.speed) *
        1000;
      const snapshot = resolveTrainPhase(
        runtime.elapsedMs,
        runtime.definition,
        passMs,
      );
      runtime.phase = snapshot.phase;
      this.renderSignals(runtime, snapshot);

      const passing = snapshot.phase === "passing";
      for (const image of runtime.trainImages) {
        image.setVisible(passing).setActive(passing);
      }
      if (passing) this.positionTrain(runtime, snapshot.trainProgress);
    }
  }

  private renderSignals(
    runtime: TrainLaneRuntime,
    snapshot: TrainPhaseSnapshot,
  ): void {
    const flashing =
      snapshot.phase !== "idle" && snapshot.phase !== "opening";
    const alternate = Math.floor(runtime.elapsedMs / 220) % 2 === 0;
    runtime.warningLeft.setAlpha(flashing ? (alternate ? 1 : 0.28) : 0.22);
    runtime.warningRight.setAlpha(flashing ? (alternate ? 0.28 : 1) : 0.22);

    let leftAngle = -68;
    let rightAngle = 68;
    if (snapshot.phase === "closing") {
      leftAngle *= 1 - snapshot.phaseProgress;
      rightAngle *= 1 - snapshot.phaseProgress;
    } else if (
      snapshot.phase === "waiting" ||
      snapshot.phase === "passing"
    ) {
      leftAngle = 0;
      rightAngle = 0;
    } else if (snapshot.phase === "opening") {
      leftAngle *= snapshot.phaseProgress;
      rightAngle *= snapshot.phaseProgress;
    }
    runtime.barrierLeft.setAngle(leftAngle);
    runtime.barrierRight.setAngle(rightAngle);
  }

  private positionTrain(runtime: TrainLaneRuntime, progress: number): void {
    if (!this.layout) return;
    const trainSize = trainDisplaySize(this.layout.laneHeight);
    const trainLength =
      trainSize +
      trainOffsetForIndex(runtime.definition.trainCars - 1, trainSize);
    const start =
      runtime.definition.direction > 0
        ? -TRAIN_MARGIN - trainLength * 0.5
        : this.layout.width + TRAIN_MARGIN + trainLength * 0.5;
    const distance = this.layout.width + trainLength + TRAIN_MARGIN * 2;
    const headX =
      start + runtime.definition.direction * distance * progress;
    const y = this.layout.laneY(runtime.lane);

    runtime.trainImages.forEach((image, index) => {
      image.setPosition(
        headX -
          runtime.definition.direction * trainOffsetForIndex(index, trainSize),
        y + (index === 0 ? 0 : trainSize * TRAIN_CARRIAGE_Y_OFFSET),
      );
      const vehicle = runtime.vehicles[index]!;
      vehicle.collisionWidth =
        trainSize * (index === 0 ? 0.7 : TRAIN_CARRIAGE_WIDTH_SCALE * 0.9);
      vehicle.collisionHeight =
        this.layout!.laneHeight * (index === 0 ? 0.58 : 0.5);
    });
  }
}

export function resolveTrainPhase(
  elapsedMs: number,
  definition: Pick<
    RailwayLaneDefinition,
    "cycleMs" | "warningMs" | "phase"
  >,
  passingMs: number,
): TrainPhaseSnapshot {
  const activeMs =
    definition.warningMs +
    BARRIER_TRANSITION_MS +
    TRAIN_LEAD_MS +
    passingMs +
    BARRIER_TRANSITION_MS;
  const idleMs = Math.max(1_500, definition.cycleMs - activeMs);
  const cycleMs = idleMs + activeMs;
  let cursor =
    ((elapsedMs + definition.phase * cycleMs) % cycleMs + cycleMs) % cycleMs;

  if (cursor < idleMs) return snapshot("idle", cursor / idleMs);
  cursor -= idleMs;
  if (cursor < definition.warningMs) {
    return snapshot("warning", cursor / definition.warningMs);
  }
  cursor -= definition.warningMs;
  if (cursor < BARRIER_TRANSITION_MS) {
    return snapshot("closing", cursor / BARRIER_TRANSITION_MS);
  }
  cursor -= BARRIER_TRANSITION_MS;
  if (cursor < TRAIN_LEAD_MS) {
    return snapshot("waiting", cursor / TRAIN_LEAD_MS);
  }
  cursor -= TRAIN_LEAD_MS;
  if (cursor < passingMs) {
    const progress = cursor / passingMs;
    return { phase: "passing", phaseProgress: progress, trainProgress: progress };
  }
  cursor -= passingMs;
  return snapshot(
    "opening",
    Math.min(1, cursor / BARRIER_TRANSITION_MS),
  );
}

function snapshot(
  phase: TrainPhase,
  phaseProgress: number,
): TrainPhaseSnapshot {
  return { phase, phaseProgress, trainProgress: 0 };
}

function trainDisplaySize(laneHeight: number): number {
  return Math.min(164, laneHeight * 1.58);
}

function trainOffsetForIndex(index: number, trainSize: number): number {
  if (index <= 0) return 0;
  const headWidth = trainHeadVisibleWidth(trainSize);
  const carriageWidth = trainCarriageVisibleWidth(trainSize);
  const headToFirstCarriage =
    (headWidth + carriageWidth) * 0.5 + TRAIN_SEGMENT_GAP;
  const carriageStep = carriageWidth + TRAIN_SEGMENT_GAP;
  return headToFirstCarriage + carriageStep * (index - 1);
}

function trainHeadVisibleWidth(trainSize: number): number {
  const radians = (TRAIN_PERSPECTIVE_ANGLE * Math.PI) / 180;
  return (
    trainSize * TRAIN_HEAD_ALPHA_WIDTH * Math.cos(radians) +
    trainSize * TRAIN_HEAD_ALPHA_HEIGHT * Math.sin(radians)
  );
}

function trainCarriageVisibleWidth(trainSize: number): number {
  return (
    trainSize *
    TRAIN_CARRIAGE_WIDTH_SCALE *
    TRAIN_CARRIAGE_ALPHA_WIDTH
  );
}

export function trainSegmentLayout(
  trainCars: number,
  trainSize: number,
): readonly { offset: number; visibleWidth: number }[] {
  return Array.from({ length: trainCars }, (_, index) => ({
    offset: trainOffsetForIndex(index, trainSize),
    visibleWidth:
      index === 0
        ? trainHeadVisibleWidth(trainSize)
        : trainCarriageVisibleWidth(trainSize),
  }));
}

function drawBarrier(
  graphics: Phaser.GameObjects.Graphics,
  length: number,
  direction: -1 | 1,
): void {
  graphics.clear();
  graphics.fillStyle(0xfff7ea, 1);
  graphics.fillRoundedRect(
    direction > 0 ? 0 : -length,
    -6,
    length,
    12,
    6,
  );
  graphics.fillStyle(0xef5b5b, 0.95);
  const stripeWidth = 24;
  for (let offset = 8; offset < length - 4; offset += stripeWidth * 2) {
    graphics.fillRect(
      direction > 0 ? offset : -offset - stripeWidth,
      -6,
      stripeWidth,
      12,
    );
  }
  graphics.fillStyle(0x6f7d8a, 1);
  graphics.fillCircle(0, 0, 10);
}
