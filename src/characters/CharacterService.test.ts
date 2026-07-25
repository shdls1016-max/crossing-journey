import assert from "node:assert/strict";
import test from "node:test";
import { SaveService } from "../storage/SaveService";
import { CharacterService } from "./CharacterService";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("the otter costs 450 coins and is equipped immediately after purchase", () => {
  const saves = new SaveService(createMemoryStorage());
  const characters = new CharacterService(saves);
  saves.update((draft) => {
    draft.coins = 500;
  });

  assert.equal(characters.purchaseOrEquip("otter"), "purchased");
  const snapshot = saves.getSnapshot();
  assert.equal(snapshot.coins, 50);
  assert.equal(snapshot.selectedCharacter, "otter");
  assert.ok(snapshot.purchasedCharacters.includes("otter"));
});

test("an owned character can be equipped again without charging coins", () => {
  const saves = new SaveService(createMemoryStorage());
  const characters = new CharacterService(saves);
  saves.update((draft) => {
    draft.coins = 450;
  });
  characters.purchaseOrEquip("otter");
  characters.purchaseOrEquip("main");

  assert.equal(characters.purchaseOrEquip("otter"), "equipped");
  assert.equal(saves.getSnapshot().coins, 0);
  assert.equal(saves.getSnapshot().selectedCharacter, "otter");
});

test("the otter remains locked when the player does not have enough coins", () => {
  const saves = new SaveService(createMemoryStorage());
  const characters = new CharacterService(saves);

  assert.equal(characters.purchaseOrEquip("otter"), "insufficient-coins");
  assert.equal(saves.getSnapshot().selectedCharacter, "main");
  assert.deepEqual(saves.getSnapshot().purchasedCharacters, ["main"]);
});

test("the purchased and selected otter survives a save-service reload", () => {
  const storage = createMemoryStorage();
  const saves = new SaveService(storage);
  saves.update((draft) => {
    draft.coins = 450;
  });
  new CharacterService(saves).purchaseOrEquip("otter");

  const reloaded = new SaveService(storage).getSnapshot();
  assert.equal(reloaded.selectedCharacter, "otter");
  assert.ok(reloaded.purchasedCharacters.includes("otter"));
});
