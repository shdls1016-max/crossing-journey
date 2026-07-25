import type { SaveService } from "../storage/SaveService";
import { getCharacter, type CharacterId } from "./characterCatalog";

export type CharacterSelectionResult = "equipped" | "purchased" | "insufficient-coins";

export class CharacterService {
  constructor(private readonly saves: SaveService) {}

  purchaseOrEquip(id: CharacterId): CharacterSelectionResult {
    const character = getCharacter(id);
    const before = this.saves.getSnapshot();

    if (before.purchasedCharacters.includes(character.id)) {
      if (before.selectedCharacter !== character.id) {
        this.saves.update((draft) => {
          draft.selectedCharacter = character.id;
        });
      }
      return "equipped";
    }

    if (before.coins < character.price) return "insufficient-coins";

    this.saves.update((draft) => {
      draft.coins -= character.price;
      draft.purchasedCharacters.push(character.id);
      draft.selectedCharacter = character.id;
      draft.characterPurchaseAlertSeen = true;
    });
    return "purchased";
  }
}
