export type ScreenId = "loading" | "world-map" | "game" | "character-select";
export type PopupId = "pause" | "failure" | "clear" | "settings" | "stage-card";

export interface FlowState {
  readonly screen: ScreenId;
  readonly popup: PopupId | null;
  readonly loadingProgress: number;
  readonly activeStage: number;
  readonly selectedStage: number | null;
}

export class ScreenFlowStore {
  private state: FlowState = {
    screen: "loading",
    popup: null,
    loadingProgress: 0,
    activeStage: 1,
    selectedStage: null,
  };

  private readonly listeners = new Set<(state: Readonly<FlowState>) => void>();

  getSnapshot(): Readonly<FlowState> {
    return { ...this.state };
  }

  subscribe(listener: (state: Readonly<FlowState>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  setLoadingProgress(progress: number): void {
    this.patch({ loadingProgress: Math.min(1, Math.max(0, progress)) });
  }

  showWorldMap(): void {
    this.patch({ screen: "world-map", popup: null, selectedStage: null });
  }

  showGame(stageId: number): void {
    this.patch({ screen: "game", popup: null, activeStage: stageId, selectedStage: null });
  }

  showCharacterSelect(): void {
    this.patch({ screen: "character-select", popup: null, selectedStage: null });
  }

  openPopup(popup: PopupId): void {
    this.patch({ popup });
  }

  openStageCard(stageId: number): void {
    this.patch({
      popup: "stage-card",
      selectedStage: Math.min(20, Math.max(1, Math.floor(stageId))),
    });
  }

  closePopup(): void {
    this.patch({
      popup: null,
      selectedStage: this.state.popup === "stage-card" ? null : this.state.selectedStage,
    });
  }

  private patch(patch: Partial<FlowState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
