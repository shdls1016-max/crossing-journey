export type StageRegion = "meadow" | "forest-river" | "city-rail" | "snow-night";

export interface StageDefinition {
  readonly id: number;
  readonly region: StageRegion;
  readonly baseCoinReward: number;
}

function regionFor(stageId: number): StageRegion {
  if (stageId <= 5) return "meadow";
  if (stageId <= 10) return "forest-river";
  if (stageId <= 15) return "city-rail";
  return "snow-night";
}

export const STAGES: readonly StageDefinition[] = Array.from({ length: 20 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    region: regionFor(id),
    baseCoinReward: 20 + id * 5,
  };
});

export function getStage(stageId: number): StageDefinition {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0]!;
}
