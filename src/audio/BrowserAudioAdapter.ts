import type { AudioAdapter } from "./SoundService";

const MUSIC_VOLUME = 0.42;

export class BrowserAudioAdapter implements AudioAdapter {
  private readonly music = new Audio();
  private currentTrack: string | null = null;
  private musicMuted = true;
  private soundEffectsMuted = true;

  constructor() {
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.volume = MUSIC_VOLUME;

    window.addEventListener("pointerdown", this.resumeMusic, { capture: true });
    window.addEventListener("keydown", this.resumeMusic, { capture: true });
  }

  setMusicTrack(source: string | null): void {
    if (source === this.currentTrack) {
      if (source && !this.musicMuted) this.tryPlay();
      return;
    }

    this.music.pause();
    this.currentTrack = source;

    if (!source) {
      this.music.removeAttribute("src");
      this.music.load();
      return;
    }

    this.music.src = source;
    this.music.currentTime = 0;
    this.music.load();
    if (!this.musicMuted) this.tryPlay();
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.music.muted = muted;

    if (muted) {
      this.music.pause();
    } else if (this.currentTrack) {
      this.tryPlay();
    }
  }

  setSoundEffectsMuted(muted: boolean): void {
    this.soundEffectsMuted = muted;
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.resumeMusic, { capture: true });
    window.removeEventListener("keydown", this.resumeMusic, { capture: true });
    this.music.pause();
    this.music.removeAttribute("src");
    this.music.load();
  }

  private readonly resumeMusic = (): void => {
    if (!this.musicMuted && this.currentTrack && this.music.paused) {
      this.tryPlay();
    }
  };

  private tryPlay(): void {
    void this.music.play().catch(() => {
      // Mobile browsers can defer autoplay until the next user interaction.
    });
  }
}
