import { getStage } from "../data/stages";
import type { SaveService } from "../storage/SaveService";
import type { PendingStageUnlock } from "../storage/saveTypes";

export interface StageClearInput {
  stageId: number;
  score: number;
  stars: number;
  collectedCoins?: number;
}

export interface StageClearOutcome {
  firstClear: boolean;
  unlockedStage: number | null;
  bestScore: number;
  bestStars: number;
  coinsAwarded: number;
}

function clampStageId(stageId: number): number {
  return Math.min(20, Math.max(1, Math.floor(stageId)));
}

export class GameProgressService {
  constructor(private readonly saves: SaveService) {}

  recordClear(input: StageClearInput): StageClearOutcome {
    const stageId = clampStageId(input.stageId);
    const stageKey = String(stageId);
    const score = Math.max(0, Math.floor(Number.isFinite(input.score) ? input.score : 0));
    const stars = Math.min(
      3,
      Math.max(0, Math.floor(Number.isFinite(input.stars) ? input.stars : 0)),
    );
    const before = this.saves.getSnapshot();
    const firstClear = before.clearedStages[stageKey] !== true;
    const canUnlockNext =
      firstClear && stageId === before.highestUnlockedStage && stageId < 20;
    const unlockedStage = canUnlockNext ? stageId + 1 : null;
    const collectedCoins = Math.max(
      0,
      Math.floor(Number.isFinite(input.collectedCoins) ? input.collectedCoins! : 0),
    );
    const coinsAwarded = collectedCoins + (firstClear ? getStage(stageId).baseCoinReward : 0);

    const after = this.saves.update((draft) => {
      draft.clearedStages[stageKey] = true;
      draft.bestScores[stageKey] = Math.max(draft.bestScores[stageKey] ?? 0, score);
      draft.stageStars[stageKey] = Math.max(draft.stageStars[stageKey] ?? 0, stars);

      if (coinsAwarded > 0) draft.coins += coinsAwarded;
      if (unlockedStage !== null) {
        draft.highestUnlockedStage = unlockedStage;
        draft.pendingStageUnlock = {
          fromStage: stageId,
          toStage: unlockedStage,
        };
      }
    });

    return {
      firstClear,
      unlockedStage,
      bestScore: after.bestScores[stageKey] ?? 0,
      bestStars: after.stageStars[stageKey] ?? 0,
      coinsAwarded,
    };
  }

  consumePendingUnlock(): PendingStageUnlock | null {
    const pending = this.saves.getSnapshot().pendingStageUnlock;
    if (!pending) return null;

    this.saves.update((draft) => {
      draft.pendingStageUnlock = null;
      draft.unlockAnimationSeenThroughStage = Math.max(
        draft.unlockAnimationSeenThroughStage,
        pending.toStage,
      );
    });
    return pending;
  }
}
