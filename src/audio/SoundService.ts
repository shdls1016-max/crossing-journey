import type { SettingsService } from "../settings/SettingsService";

export interface SoundEffectOptions {
  readonly delayMs?: number;
  readonly volumeScale?: number;
}

export interface AudioAdapter {
  setMusicTrack(source: string | null, volumeScale?: number): void;
  fadeOutMusic(durationMs: number): void;
  preloadSoundEffects(sources: readonly string[]): void;
  playSoundEffect(source: string, options?: SoundEffectOptions): void;
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

  setMusicTrack(source: string | null, volumeScale = 1): void {
    this.adapter?.setMusicTrack(source, volumeScale);
  }

  fadeOutMusic(durationMs: number): void {
    this.adapter?.fadeOutMusic(durationMs);
  }

  preloadSoundEffects(sources: readonly string[]): void {
    this.adapter?.preloadSoundEffects(sources);
  }

  playSoundEffect(source: string, options: SoundEffectOptions = {}): void {
    this.adapter?.playSoundEffect(source, options);
  }
}
