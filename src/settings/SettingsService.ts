import type { SaveService } from "../storage/SaveService";
import type { GameSettings } from "../storage/saveTypes";

export type SettingKey = keyof GameSettings;

export class SettingsService {
  constructor(private readonly saves: SaveService) {}

  getSnapshot(): Readonly<GameSettings> {
    return this.saves.getSnapshot().settings;
  }

  set(key: SettingKey, enabled: boolean): Readonly<GameSettings> {
    const save = this.saves.update((draft) => {
      draft.settings[key] = enabled;
    });
    return save.settings;
  }

  toggle(key: SettingKey): Readonly<GameSettings> {
    return this.set(key, !this.getSnapshot()[key]);
  }
}
