import type { SettingsService } from "../settings/SettingsService";

export interface AudioAdapter {
  setMusicMuted(muted: boolean): void;
  setSoundEffectsMuted(muted: boolean): void;
}

export class SoundService {
  private adapter: AudioAdapter | null = null;

  constructor(private readonly settings: SettingsService) {}

  attach(adapter: AudioAdapter): void {
    this.adapter = adapter;
    this.applySettings();
  }

  applySettings(): void {
    const current = this.settings.getSnapshot();
    this.adapter?.setMusicMuted(!current.backgroundMusic);
    this.adapter?.setSoundEffectsMuted(!current.soundEffects);
  }
}
