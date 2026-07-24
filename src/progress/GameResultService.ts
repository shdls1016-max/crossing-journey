import type { ScreenFlowStore } from "../flow/ScreenFlowStore";
import type { GameProgressService, StageClearOutcome } from "./GameProgressService";

export class GameResultService {
  constructor(
    private readonly progress: GameProgressService,
    private readonly flow: ScreenFlowStore,
  ) {}

  clearStage(
    stageId: number,
    score: number,
    stars: number,
    collectedCoins = 0,
  ): StageClearOutcome {
    const outcome = this.progress.recordClear({ stageId, score, stars, collectedCoins });
    this.flow.openPopup("clear");
    return outcome;
  }

  failStage(): void {
    this.flow.openPopup("failure");
  }
}
