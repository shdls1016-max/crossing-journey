import type { MoveDirection } from "./PlayerController";

export class GameplayInputService {
  private readonly listeners = new Set<(direction: MoveDirection) => void>();

  requestMove(direction: MoveDirection): void {
    for (const listener of this.listeners) listener(direction);
  }

  subscribe(listener: (direction: MoveDirection) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const gameplayInput = new GameplayInputService();
