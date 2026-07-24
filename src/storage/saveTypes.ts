export const SAVE_VERSION = 2;

export interface GameSettings {
  soundEffects: boolean;
  backgroundMusic: boolean;
  vibration: boolean;
}

export interface PendingStageUnlock {
  fromStage: number;
  toStage: number;
}

export interface GameSaveData {
  version: typeof SAVE_VERSION;
  highestUnlockedStage: number;
  clearedStages: Record<string, boolean>;
  bestScores: Record<string, number>;
  stageStars: Record<string, number>;
  coins: number;
  selectedCharacter: string;
  purchasedCharacters: string[];
  characterPurchaseAlertSeen: boolean;
  unlockAnimationSeenThroughStage: number;
  pendingStageUnlock: PendingStageUnlock | null;
  settings: GameSettings;
}

export function createDefaultSave(): GameSaveData {
  return {
    version: SAVE_VERSION,
    highestUnlockedStage: 1,
    clearedStages: {},
    bestScores: {},
    stageStars: {},
    coins: 0,
    selectedCharacter: "main",
    purchasedCharacters: ["main"],
    characterPurchaseAlertSeen: false,
    unlockAnimationSeenThroughStage: 1,
    pendingStageUnlock: null,
    settings: {
      soundEffects: true,
      backgroundMusic: true,
      vibration: true,
    },
  };
}
