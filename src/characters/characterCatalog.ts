import { ASSET_KEYS } from "../assets/assetCatalog";
import { DOM_ASSETS } from "../assets/assetPaths";

export type CharacterId = "main" | "otter";

export interface CharacterDefinition {
  readonly id: CharacterId;
  readonly name: string;
  readonly price: number;
  readonly dom: {
    readonly idle: string;
    readonly walk: string;
    readonly clear: string;
    readonly fail: string;
  };
  readonly texture: {
    readonly idle: string;
    readonly walk: string;
    readonly clear: string;
    readonly fail: string;
  };
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: "main",
    name: "여우",
    price: 0,
    dom: {
      idle: DOM_ASSETS.character.reference,
      walk: DOM_ASSETS.character.play,
      clear: DOM_ASSETS.character.clear,
      fail: DOM_ASSETS.character.fail,
    },
    texture: {
      idle: ASSET_KEYS.character.reference,
      walk: ASSET_KEYS.character.play,
      clear: ASSET_KEYS.character.clear,
      fail: ASSET_KEYS.character.fail,
    },
  },
  {
    id: "otter",
    name: "수달",
    price: 450,
    dom: {
      idle: DOM_ASSETS.character.otter.idle,
      walk: DOM_ASSETS.character.otter.walk,
      clear: DOM_ASSETS.character.otter.clear,
      fail: DOM_ASSETS.character.otter.fail,
    },
    texture: {
      idle: ASSET_KEYS.character.otter.idle,
      walk: ASSET_KEYS.character.otter.walk,
      clear: ASSET_KEYS.character.otter.clear,
      fail: ASSET_KEYS.character.otter.fail,
    },
  },
] as const;

export function isCharacterId(value: unknown): value is CharacterId {
  return value === "main" || value === "otter";
}

export function getCharacter(id: unknown): CharacterDefinition {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0]!;
}
