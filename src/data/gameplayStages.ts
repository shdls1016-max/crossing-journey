export type GameplayLaneType = "start" | "grass" | "road" | "river" | "finish";
export type VehicleKind = "compact" | "sedan" | "truck";
export type LogKind = "short" | "medium" | "long";

export interface SafeLaneDefinition {
  readonly type: Exclude<GameplayLaneType, "road" | "river">;
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

export type GameplayLaneDefinition =
  | SafeLaneDefinition
  | RoadLaneDefinition
  | RiverLaneDefinition;

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
] as const;

export function getGameplayStage(stageId: number): GameplayStageDefinition | null {
  return GAMEPLAY_STAGES.find((stage) => stage.id === stageId) ?? null;
}
