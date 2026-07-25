import assert from "node:assert/strict";
import test from "node:test";
import { SaveService } from "../storage/SaveService";
import { GameProgressService } from "./GameProgressService";
import { GameResultService } from "./GameResultService";
import { ScreenFlowStore } from "../flow/ScreenFlowStore";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("new save unlocks only Stage 1", () => {
  const saves = new SaveService(new MemoryStorage());
  const snapshot = saves.getSnapshot();
  assert.equal(snapshot.highestUnlockedStage, 1);
  assert.deepEqual(snapshot.clearedStages, {});
  assert.deepEqual(snapshot.bestScores, {});
  assert.deepEqual(snapshot.stageStars, {});
});

test("first clear unlocks once, pays once and queues one movement", () => {
  const saves = new SaveService(new MemoryStorage());
  const progress = new GameProgressService(saves);
  const result = progress.recordClear({ stageId: 1, score: 120, stars: 1 });

  assert.equal(result.firstClear, true);
  assert.equal(result.unlockedStage, 2);
  assert.equal(result.coinsAwarded, 25);
  assert.equal(saves.getSnapshot().highestUnlockedStage, 2);
  assert.deepEqual(saves.getSnapshot().pendingStageUnlock, {
    fromStage: 1,
    toStage: 2,
  });

  assert.deepEqual(progress.consumePendingUnlock(), {
    fromStage: 1,
    toStage: 2,
  });
  assert.equal(progress.consumePendingUnlock(), null);
  assert.equal(saves.getSnapshot().unlockAnimationSeenThroughStage, 2);
});

test("replay keeps the highest score and stars without moving progress backward", () => {
  const saves = new SaveService(new MemoryStorage());
  const progress = new GameProgressService(saves);
  progress.recordClear({ stageId: 1, score: 120, stars: 2 });
  progress.consumePendingUnlock();

  const lower = progress.recordClear({ stageId: 1, score: 80, stars: 1 });
  assert.equal(lower.firstClear, false);
  assert.equal(lower.unlockedStage, null);
  assert.equal(lower.bestScore, 120);
  assert.equal(lower.bestStars, 2);
  assert.equal(lower.coinsAwarded, 0);

  const higher = progress.recordClear({ stageId: 1, score: 180, stars: 3 });
  assert.equal(higher.bestScore, 180);
  assert.equal(higher.bestStars, 3);
  assert.equal(saves.getSnapshot().highestUnlockedStage, 2);
  assert.equal(saves.getSnapshot().coins, 25);
});

test("collected coins are paid on clear without repeating the first-clear reward", () => {
  const saves = new SaveService(new MemoryStorage());
  const progress = new GameProgressService(saves);

  const first = progress.recordClear({
    stageId: 1,
    score: 200,
    stars: 3,
    collectedCoins: 3,
  });
  assert.equal(first.coinsAwarded, 28);
  assert.equal(saves.getSnapshot().coins, 28);

  const replay = progress.recordClear({
    stageId: 1,
    score: 100,
    stars: 1,
    collectedCoins: 2,
  });
  assert.equal(replay.firstClear, false);
  assert.equal(replay.coinsAwarded, 2);
  assert.equal(replay.bestScore, 200);
  assert.equal(replay.bestStars, 3);
  assert.equal(saves.getSnapshot().coins, 30);
});

test("invalid stored JSON recovers to defaults", () => {
  const storage = new MemoryStorage();
  storage.setItem("crossing-journey.save", "{not-json");
  const saves = new SaveService(storage);
  assert.equal(saves.getSnapshot().highestUnlockedStage, 1);
  assert.equal(saves.getSnapshot().selectedCharacter, "main");
});

test("failure opens only the failure popup and never unlocks a stage", () => {
  const saves = new SaveService(new MemoryStorage());
  const progress = new GameProgressService(saves);
  const flow = new ScreenFlowStore();
  const results = new GameResultService(progress, flow);

  flow.showGame(1);
  results.failStage();

  assert.equal(flow.getSnapshot().popup, "failure");
  assert.equal(saves.getSnapshot().highestUnlockedStage, 1);
  assert.equal(saves.getSnapshot().pendingStageUnlock, null);
});

test("Stage 10 unlocks Stage 11 and city stages continue sequentially", () => {
  const saves = new SaveService(new MemoryStorage());
  saves.update((draft) => {
    draft.highestUnlockedStage = 10;
    draft.unlockAnimationSeenThroughStage = 10;
    for (let stage = 1; stage < 10; stage += 1) {
      draft.clearedStages[String(stage)] = true;
    }
  });
  const progress = new GameProgressService(saves);

  for (let stage = 10; stage <= 15; stage += 1) {
    const result = progress.recordClear({
      stageId: stage,
      score: stage * 1_000,
      stars: 2,
    });
    assert.equal(result.unlockedStage, stage + 1);
    assert.equal(saves.getSnapshot().highestUnlockedStage, stage + 1);
    assert.deepEqual(progress.consumePendingUnlock(), {
      fromStage: stage,
      toStage: stage + 1,
    });
  }
});
