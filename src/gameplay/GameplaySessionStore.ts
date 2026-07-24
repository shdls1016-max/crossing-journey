export type GameplayStatus = "idle" | "playing" | "failed" | "cleared";

export interface GameplayResult {
  readonly score: number;
  readonly stars: number;
  readonly collectedCoins: number;
  readonly awardedCoins: number;
  readonly progress: number;
  readonly newBest: boolean;
}

export interface GameplaySessionState {
  readonly stageId: number;
  readonly collectedCoins: number;
  readonly moves: number;
  readonly progress: number;
  readonly status: GameplayStatus;
  readonly result: GameplayResult | null;
}

const INITIAL_STATE: GameplaySessionState = {
  stageId: 1,
  collectedCoins: 0,
  moves: 0,
  progress: 0,
  status: "idle",
  result: null,
};

export class GameplaySessionStore {
  private state: GameplaySessionState = INITIAL_STATE;
  private readonly listeners = new Set<(state: Readonly<GameplaySessionState>) => void>();

  getSnapshot(): Readonly<GameplaySessionState> {
    return { ...this.state, result: this.state.result ? { ...this.state.result } : null };
  }

  subscribe(listener: (state: Readonly<GameplaySessionState>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  start(stageId: number): void {
    this.patch({
      stageId,
      collectedCoins: 0,
      moves: 0,
      progress: 0,
      status: "playing",
      result: null,
    });
  }

  recordMove(progress: number): void {
    if (this.state.status !== "playing") return;
    this.patch({
      moves: this.state.moves + 1,
      progress: Math.max(this.state.progress, clamp01(progress)),
    });
  }

  collectCoin(): void {
    if (this.state.status !== "playing") return;
    this.patch({ collectedCoins: this.state.collectedCoins + 1 });
  }

  fail(progress: number): void {
    if (this.state.status !== "playing") return;
    this.patch({
      progress: Math.max(this.state.progress, clamp01(progress)),
      status: "failed",
      result: {
        score: 0,
        stars: 0,
        collectedCoins: this.state.collectedCoins,
        awardedCoins: 0,
        progress: Math.max(this.state.progress, clamp01(progress)),
        newBest: false,
      },
    });
  }

  clear(result: GameplayResult): void {
    if (this.state.status !== "playing") return;
    this.patch({ progress: 1, status: "cleared", result });
  }

  private patch(patch: Partial<GameplaySessionState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export const gameplaySession = new GameplaySessionStore();
