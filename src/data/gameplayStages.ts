export type GameplayLaneType =
  | "start"
  | "grass"
  | "road"
  | "river"
  | "railway"
  | "finish";
export type VehicleKind = "compact" | "sedan" | "truck";
export type LogKind = "short" | "medium" | "long";

export interface SafeLaneDefinition {
  readonly type: Exclude<GameplayLaneType, "road" | "river" | "railway">;
}

export interface RoadLaneDefinition {
  readonly type: "road";
  readonly direction: -1 | 1;
  readonly speed: number;
  readonly spawnInterval: number;
  readonly vehicleCount: number;
  readonly vehicles: readonly VehicleKind[];
  readonly phase: number;
}

export interface RiverLaneDefinition {
  readonly type: "river";
  readonly direction: -1 | 1;
  readonly speed: number;
  readonly logCount: number;
  readonly logs: readonly LogKind[];
  readonly phase: number;
  readonly spacingFactor: number;
}

export interface RailwayLaneDefinition {
  readonly type: "railway";
  readonly direction: -1 | 1;
  readonly speed: number;
  readonly trainCars: number;
  readonly cycleMs: number;
  readonly warningMs: number;
  readonly phase: number;
}

export type GameplayLaneDefinition =
  | SafeLaneDefinition
  | RoadLaneDefinition
  | RiverLaneDefinition
  | RailwayLaneDefinition;

export interface CoinPlacement {
  readonly lane: number;
  readonly column: number;
}

export interface GameplayStageDefinition {
  readonly id: number;
  readonly columns: number;
  readonly lanes: readonly GameplayLaneDefinition[];
  readonly coins: readonly CoinPlacement[];
  readonly parMoves: number;
  readonly parTimeMs: number;
}

const safe = (type: SafeLaneDefinition["type"]): SafeLaneDefinition => ({ type });

const road = (
  direction: -1 | 1,
  speed: number,
  spawnInterval: number,
  vehicleCount: number,
  vehicles: readonly VehicleKind[],
  phase: number,
): RoadLaneDefinition => ({
  type: "road",
  direction,
  speed,
  spawnInterval,
  vehicleCount,
  vehicles,
  phase,
});

const river = (
  direction: -1 | 1,
  speed: number,
  logCount: number,
  logs: readonly LogKind[],
  phase: number,
  spacingFactor = 1,
): RiverLaneDefinition => ({
  type: "river",
  direction,
  speed,
  logCount,
  logs,
  phase,
  spacingFactor,
});

const railway = (
  direction: -1 | 1,
  speed: number,
  trainCars: number,
  cycleMs: number,
  warningMs: number,
  phase = 0,
): RailwayLaneDefinition => ({
  type: "railway",
  direction,
  speed,
  trainCars,
  cycleMs,
  warningMs,
  phase,
});

export const GAMEPLAY_STAGES: readonly GameplayStageDefinition[] = [
  {
    id: 1,
    columns: 5,
    lanes: [
      safe("start"),
      road(1, 66, 4.9, 2, ["compact"], 0.34),
      safe("grass"),
      road(1, 74, 4.5, 2, ["sedan"], 0.74),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 2, column: 1 },
      { lane: 4, column: 3 },
      { lane: 5, column: 2 },
    ],
    parMoves: 9,
    parTimeMs: 24_000,
  },
  {
    id: 2,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 70, 4.7, 2, ["compact"], 0.18),
      road(-1, 76, 4.4, 2, ["sedan"], 0.66),
      safe("grass"),
      road(1, 82, 4.1, 2, ["compact", "sedan"], 0.42),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 3 },
      { lane: 3, column: 1 },
      { lane: 6, column: 2 },
      { lane: 7, column: 4 },
    ],
    parMoves: 12,
    parTimeMs: 30_000,
  },
  {
    id: 3,
    columns: 5,
    lanes: [
      safe("start"),
      road(-1, 72, 4.5, 2, ["compact"], 0.52),
      safe("grass"),
      road(1, 84, 4.1, 2, ["sedan"], 0.12),
      road(-1, 94, 3.9, 3, ["compact"], 0.7),
      safe("grass"),
      road(1, 104, 3.7, 3, ["compact", "sedan"], 0.36),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 2, column: 0 },
      { lane: 4, column: 4 },
      { lane: 5, column: 2 },
      { lane: 7, column: 1 },
      { lane: 9, column: 3 },
    ],
    parMoves: 15,
    parTimeMs: 36_000,
  },
  {
    id: 4,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 82, 4.1, 2, ["compact"], 0.24),
      road(-1, 92, 3.8, 3, ["sedan"], 0.76),
      safe("grass"),
      road(1, 102, 3.6, 3, ["compact", "truck"], 0.44),
      road(-1, 108, 3.5, 3, ["sedan"], 0.08),
      safe("grass"),
      road(1, 116, 3.3, 3, ["compact", "truck"], 0.62),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 4 },
      { lane: 3, column: 1 },
      { lane: 4, column: 2 },
      { lane: 6, column: 3 },
      { lane: 9, column: 0 },
      { lane: 11, column: 2 },
    ],
    parMoves: 18,
    parTimeMs: 43_000,
  },
  {
    id: 5,
    columns: 5,
    lanes: [
      safe("start"),
      road(1, 88, 3.9, 3, ["compact"], 0.16),
      safe("grass"),
      road(-1, 98, 3.6, 3, ["sedan"], 0.64),
      road(1, 108, 3.4, 3, ["compact", "truck"], 0.38),
      safe("grass"),
      road(-1, 116, 3.2, 3, ["compact", "sedan"], 0.82),
      road(1, 124, 3, 4, ["sedan"], 0.2),
      safe("grass"),
      road(-1, 132, 2.9, 4, ["compact", "truck"], 0.56),
      road(1, 140, 2.8, 4, ["compact", "sedan"], 0.04),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 2, column: 4 },
      { lane: 4, column: 1 },
      { lane: 5, column: 2 },
      { lane: 7, column: 3 },
      { lane: 9, column: 0 },
      { lane: 11, column: 4 },
      { lane: 13, column: 2 },
    ],
    parMoves: 22,
    parTimeMs: 50_000,
  },
  {
    id: 6,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      river(1, 34, 2, ["long"], 0.12),
      safe("grass"),
      river(-1, 38, 2, ["long", "medium"], 0.58),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 1 },
      { lane: 3, column: 3 },
      { lane: 5, column: 2 },
      { lane: 6, column: 4 },
    ],
    parMoves: 11,
    parTimeMs: 34_000,
  },
  {
    id: 7,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      river(1, 42, 2, ["long", "medium"], 0.2),
      river(-1, 46, 3, ["long", "medium"], 0.64, 0.96),
      safe("grass"),
      river(1, 49, 3, ["medium", "long"], 0.38, 0.94),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 4 },
      { lane: 4, column: 1 },
      { lane: 6, column: 3 },
      { lane: 7, column: 2 },
    ],
    parMoves: 13,
    parTimeMs: 38_000,
  },
  {
    id: 8,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      river(-1, 50, 3, ["medium", "long"], 0.08, 0.94),
      river(1, 56, 3, ["short", "medium", "long"], 0.48, 0.92),
      safe("grass"),
      river(-1, 60, 3, ["medium", "short"], 0.76, 0.9),
      river(1, 63, 3, ["long", "medium"], 0.26, 0.92),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 0 },
      { lane: 4, column: 4 },
      { lane: 7, column: 2 },
      { lane: 8, column: 1 },
      { lane: 9, column: 3 },
    ],
    parMoves: 16,
    parTimeMs: 44_000,
  },
  {
    id: 9,
    columns: 5,
    lanes: [
      safe("start"),
      river(1, 58, 3, ["medium", "short"], 0.16, 0.9),
      river(-1, 62, 3, ["short", "medium"], 0.58, 0.88),
      safe("grass"),
      river(1, 66, 3, ["medium", "short"], 0.34, 0.88),
      river(-1, 70, 3, ["short", "medium"], 0.82, 0.86),
      safe("grass"),
      river(1, 73, 3, ["medium", "short", "long"], 0.44, 0.88),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 3, column: 1 },
      { lane: 6, column: 3 },
      { lane: 8, column: 4 },
      { lane: 9, column: 0 },
      { lane: 10, column: 2 },
    ],
    parMoves: 18,
    parTimeMs: 50_000,
  },
  {
    id: 10,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      river(-1, 66, 3, ["medium", "short"], 0.1, 0.88),
      river(1, 72, 3, ["short", "medium"], 0.52, 0.86),
      river(-1, 76, 3, ["long", "short"], 0.84, 0.87),
      safe("grass"),
      river(1, 74, 3, ["medium", "short"], 0.28, 0.86),
      river(-1, 80, 3, ["short", "medium"], 0.7, 0.84),
      river(1, 84, 4, ["medium", "short", "long"], 0.42, 0.86),
      river(-1, 88, 4, ["short", "medium"], 0.92, 0.82),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 4 },
      { lane: 5, column: 1 },
      { lane: 10, column: 3 },
      { lane: 11, column: 0 },
      { lane: 12, column: 2 },
    ],
    parMoves: 21,
    parTimeMs: 56_000,
  },
  {
    id: 11,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 74, 4.8, 2, ["compact", "sedan"], 0.18),
      safe("grass"),
      safe("grass"),
      road(-1, 80, 4.5, 2, ["sedan", "compact"], 0.66),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 1 },
      { lane: 3, column: 3 },
      { lane: 6, column: 0 },
      { lane: 7, column: 4 },
    ],
    parMoves: 12,
    parTimeMs: 34_000,
  },
  {
    id: 12,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 84, 4.4, 2, ["compact", "sedan"], 0.12),
      road(-1, 92, 4.1, 3, ["sedan", "truck"], 0.62),
      safe("grass"),
      safe("grass"),
      road(1, 98, 3.9, 3, ["compact", "truck"], 0.34),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 4 },
      { lane: 4, column: 1 },
      { lane: 7, column: 3 },
      { lane: 9, column: 2 },
    ],
    parMoves: 15,
    parTimeMs: 40_000,
  },
  {
    id: 13,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(-1, 92, 4.1, 2, ["compact", "sedan"], 0.42),
      safe("grass"),
      railway(1, 180, 1, 16_000, 2_800, 0),
      safe("grass"),
      safe("grass"),
      road(1, 104, 3.8, 3, ["sedan", "truck"], 0.16),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 0 },
      { lane: 3, column: 4 },
      { lane: 6, column: 2 },
      { lane: 8, column: 1 },
      { lane: 10, column: 3 },
    ],
    parMoves: 17,
    parTimeMs: 48_000,
  },
  {
    id: 14,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 98, 3.9, 3, ["compact", "sedan"], 0.2),
      road(-1, 110, 3.6, 3, ["sedan", "truck"], 0.72),
      safe("grass"),
      railway(-1, 205, 2, 15_000, 2_500, 0),
      safe("grass"),
      road(1, 116, 3.5, 3, ["compact", "truck"], 0.46),
      road(-1, 126, 3.3, 3, ["sedan", "compact"], 0.08),
      safe("grass"),
      railway(1, 220, 2, 15_500, 2_400, 0.48),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 4 },
      { lane: 4, column: 0 },
      { lane: 6, column: 3 },
      { lane: 9, column: 1 },
      { lane: 11, column: 4 },
      { lane: 12, column: 2 },
    ],
    parMoves: 20,
    parTimeMs: 56_000,
  },
  {
    id: 15,
    columns: 5,
    lanes: [
      safe("start"),
      road(1, 108, 3.7, 3, ["compact", "sedan"], 0.12),
      road(-1, 120, 3.4, 3, ["sedan", "truck"], 0.58),
      safe("grass"),
      railway(1, 235, 2, 14_500, 2_300, 0),
      safe("grass"),
      road(-1, 130, 3.2, 4, ["compact", "truck"], 0.78),
      road(1, 138, 3, 4, ["sedan", "compact"], 0.3),
      safe("grass"),
      railway(-1, 255, 3, 14_000, 2_200, 0.46),
      safe("grass"),
      road(1, 146, 2.9, 4, ["compact", "sedan", "truck"], 0.64),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 3, column: 4 },
      { lane: 5, column: 1 },
      { lane: 8, column: 3 },
      { lane: 10, column: 0 },
      { lane: 12, column: 4 },
      { lane: 14, column: 2 },
    ],
    parMoves: 23,
    parTimeMs: 64_000,
  },
  {
    id: 16,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 102, 3.9, 3, ["compact", "sedan"], 0.18),
      safe("grass"),
      road(-1, 112, 3.6, 3, ["sedan", "truck"], 0.7),
      safe("grass"),
      river(1, 54, 3, ["long", "medium"], 0.34, 0.92),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 1 },
      { lane: 3, column: 4 },
      { lane: 5, column: 0 },
      { lane: 7, column: 3 },
      { lane: 8, column: 2 },
    ],
    parMoves: 14,
    parTimeMs: 42_000,
  },
  {
    id: 17,
    columns: 5,
    lanes: [
      safe("start"),
      road(-1, 114, 3.6, 3, ["compact", "sedan"], 0.52),
      safe("grass"),
      river(1, 62, 3, ["medium", "long"], 0.2, 0.9),
      river(-1, 66, 3, ["short", "medium"], 0.68, 0.88),
      safe("grass"),
      road(1, 124, 3.3, 3, ["sedan", "truck"], 0.3),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 2, column: 4 },
      { lane: 5, column: 1 },
      { lane: 7, column: 3 },
      { lane: 9, column: 2 },
    ],
    parMoves: 16,
    parTimeMs: 48_000,
  },
  {
    id: 18,
    columns: 5,
    lanes: [
      safe("start"),
      safe("grass"),
      road(1, 120, 3.4, 3, ["compact", "truck"], 0.14),
      road(-1, 132, 3.2, 4, ["sedan", "compact"], 0.62),
      safe("grass"),
      railway(1, 230, 2, 15_000, 2_400, 0),
      safe("grass"),
      river(-1, 68, 3, ["medium", "short"], 0.76, 0.88),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 1, column: 0 },
      { lane: 4, column: 4 },
      { lane: 6, column: 2 },
      { lane: 8, column: 1 },
      { lane: 10, column: 3 },
    ],
    parMoves: 18,
    parTimeMs: 54_000,
  },
  {
    id: 19,
    columns: 5,
    lanes: [
      safe("start"),
      road(-1, 128, 3.2, 4, ["compact", "sedan"], 0.48),
      river(1, 70, 3, ["short", "medium"], 0.16, 0.86),
      safe("grass"),
      railway(-1, 250, 2, 14_500, 2_200, 0),
      safe("grass"),
      road(1, 142, 3, 4, ["sedan", "truck"], 0.32),
      river(-1, 76, 4, ["medium", "short"], 0.72, 0.84),
      safe("grass"),
      road(-1, 150, 2.8, 4, ["compact", "truck"], 0.58),
      safe("grass"),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 3, column: 4 },
      { lane: 5, column: 0 },
      { lane: 8, column: 3 },
      { lane: 10, column: 1 },
      { lane: 12, column: 2 },
    ],
    parMoves: 21,
    parTimeMs: 62_000,
  },
  {
    id: 20,
    columns: 5,
    lanes: [
      safe("start"),
      road(1, 138, 3, 4, ["compact", "sedan", "truck"], 0.12),
      road(-1, 150, 2.8, 4, ["sedan", "compact"], 0.62),
      safe("grass"),
      river(1, 76, 4, ["short", "medium"], 0.24, 0.84),
      river(-1, 82, 4, ["medium", "short"], 0.74, 0.82),
      safe("grass"),
      railway(1, 270, 3, 13_500, 2_100, 0),
      safe("grass"),
      road(-1, 158, 2.7, 4, ["compact", "truck"], 0.46),
      river(1, 86, 4, ["short", "medium", "long"], 0.18, 0.82),
      safe("grass"),
      railway(-1, 285, 3, 13_500, 2_000, 0.5),
      safe("grass"),
      road(1, 166, 2.6, 4, ["sedan", "truck"], 0.7),
      safe("grass"),
      safe("grass"),
      safe("finish"),
    ],
    coins: [
      { lane: 3, column: 4 },
      { lane: 6, column: 1 },
      { lane: 8, column: 3 },
      { lane: 11, column: 0 },
      { lane: 13, column: 4 },
      { lane: 16, column: 2 },
    ],
    parMoves: 26,
    parTimeMs: 72_000,
  },
] as const;

export function getGameplayStage(stageId: number): GameplayStageDefinition | null {
  return GAMEPLAY_STAGES.find((stage) => stage.id === stageId) ?? null;
}
