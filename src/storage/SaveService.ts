import {
  SAVE_VERSION,
  createDefaultSave,
  type GameSaveData,
  type GameSettings,
  type PendingStageUnlock,
} from "./saveTypes";
import { isCharacterId } from "../characters/characterCatalog";

const STORAGE_KEY = "crossing-journey.save";
const MAX_STAGE = 20;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeBooleanRecord(value: unknown): Record<string, boolean> {
  const source = asRecord(value);
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (/^(?:[1-9]|1\d|20)$/.test(key) && typeof entry === "boolean") {
      result[key] = entry;
    }
  }
  return result;
}

function sanitizeNumberRecord(
  value: unknown,
  minimum: number,
  maximum: number,
): Record<string, number> {
  const source = asRecord(value);
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (/^(?:[1-9]|1\d|20)$/.test(key) && typeof entry === "number" && Number.isFinite(entry)) {
      result[key] = Math.min(maximum, Math.max(minimum, Math.floor(entry)));
    }
  }
  return result;
}

function sanitizeSettings(value: unknown, fallback: GameSettings): GameSettings {
  const source = asRecord(value);
  return {
    soundEffects:
      typeof source.soundEffects === "boolean" ? source.soundEffects : fallback.soundEffects,
    backgroundMusic:
      typeof source.backgroundMusic === "boolean"
        ? source.backgroundMusic
        : fallback.backgroundMusic,
    vibration: typeof source.vibration === "boolean" ? source.vibration : fallback.vibration,
  };
}

function sanitizePendingUnlock(
  value: unknown,
  highestUnlockedStage: number,
): PendingStageUnlock | null {
  const source = asRecord(value);
  const fromStage = Math.floor(finiteNumber(source.fromStage, 0));
  const toStage = Math.floor(finiteNumber(source.toStage, 0));
  if (
    fromStage < 1 ||
    fromStage >= MAX_STAGE ||
    toStage !== fromStage + 1 ||
    toStage > highestUnlockedStage
  ) {
    return null;
  }
  return { fromStage, toStage };
}

function sanitizeSave(value: unknown): GameSaveData {
  const fallback = createDefaultSave();
  const source = asRecord(value);
  const purchased = Array.isArray(source.purchasedCharacters)
    ? source.purchasedCharacters.filter(
        (entry): entry is string => isCharacterId(entry),
      )
    : fallback.purchasedCharacters;
  const uniquePurchased = [...new Set(["main", ...purchased])];
  const selected =
    isCharacterId(source.selectedCharacter) &&
    uniquePurchased.includes(source.selectedCharacter)
      ? source.selectedCharacter
      : "main";
  const highestUnlockedStage = Math.min(
    MAX_STAGE,
    Math.max(1, Math.floor(finiteNumber(source.highestUnlockedStage, 1))),
  );
  const unlockAnimationSeenThroughStage = Math.min(
    highestUnlockedStage,
    Math.max(
      1,
      Math.floor(
        finiteNumber(source.unlockAnimationSeenThroughStage, highestUnlockedStage),
      ),
    ),
  );

  return {
    version: SAVE_VERSION,
    highestUnlockedStage,
    clearedStages: sanitizeBooleanRecord(source.clearedStages),
    bestScores: sanitizeNumberRecord(source.bestScores, 0, Number.MAX_SAFE_INTEGER),
    stageStars: sanitizeNumberRecord(source.stageStars, 0, 3),
    coins: Math.max(0, Math.floor(finiteNumber(source.coins, 0))),
    selectedCharacter: selected,
    purchasedCharacters: uniquePurchased,
    characterPurchaseAlertSeen:
      typeof source.characterPurchaseAlertSeen === "boolean"
        ? source.characterPurchaseAlertSeen
        : false,
    unlockAnimationSeenThroughStage,
    pendingStageUnlock: sanitizePendingUnlock(
      source.pendingStageUnlock,
      highestUnlockedStage,
    ),
    settings: sanitizeSettings(source.settings, fallback.settings),
  };
}

function resolveStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class SaveService {
  private current: GameSaveData;
  private readonly listeners = new Set<(save: Readonly<GameSaveData>) => void>();

  constructor(private readonly storage: StorageLike | null = resolveStorage()) {
    this.current = this.read();
  }

  getSnapshot(): Readonly<GameSaveData> {
    return structuredClone(this.current);
  }

  update(mutator: (draft: GameSaveData) => void): Readonly<GameSaveData> {
    const draft = structuredClone(this.current);
    mutator(draft);
    this.current = sanitizeSave(draft);
    this.persist();
    this.emit();
    return this.getSnapshot();
  }

  reset(): Readonly<GameSaveData> {
    this.current = createDefaultSave();
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage failure must not block the game.
    }
    this.emit();
    return this.getSnapshot();
  }

  subscribe(listener: (save: Readonly<GameSaveData>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private read(): GameSaveData {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw) as unknown;
      const source = asRecord(parsed);

      if (source.version !== SAVE_VERSION) {
        return sanitizeSave(parsed);
      }
      return sanitizeSave(parsed);
    } catch {
      const fallback = createDefaultSave();
      this.current = fallback;
      this.persist();
      return fallback;
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Quota or privacy-mode failures leave the in-memory save usable.
    }
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
