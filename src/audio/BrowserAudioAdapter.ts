import type { AudioAdapter, SoundEffectOptions } from "./SoundService";

const MUSIC_VOLUME = 0.42;
const SOUND_EFFECT_VOLUME = 2 / 3;

export class BrowserAudioAdapter implements AudioAdapter {
  private readonly music = new Audio();
  private readonly effectTemplates = new Map<string, HTMLAudioElement>();
  private readonly activeEffects = new Set<HTMLAudioElement>();
  private readonly effectTimers = new Set<number>();
  private currentTrack: string | null = null;
  private musicMuted = true;
  private soundEffectsMuted = true;
  private musicVolumeScale = 1;
  private fadeFrame = 0;

  constructor() {
    this.music.loop = true;
    this.music.autoplay = true;
    this.music.setAttribute("playsinline", "");
    this.music.preload = "auto";
    this.music.volume = MUSIC_VOLUME;
    this.music.addEventListener("canplay", this.resumeMusic);

    window.addEventListener("pointerdown", this.resumeMusic, { capture: true });
    window.addEventListener("keydown", this.resumeMusic, { capture: true });
    window.addEventListener("pageshow", this.resumeMusic);
    window.addEventListener("focus", this.resumeMusic);
  }

  setMusicTrack(source: string | null, volumeScale = 1): void {
    this.cancelMusicFade();
    this.musicVolumeScale = Math.min(1, Math.max(0, volumeScale));
    this.music.volume = MUSIC_VOLUME * this.musicVolumeScale;

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

  fadeOutMusic(durationMs: number): void {
    this.cancelMusicFade();
    if (!this.currentTrack || this.music.paused || durationMs <= 0) {
      this.music.pause();
      return;
    }

    const startedAt = performance.now();
    const startVolume = this.music.volume;
    const tick = (now: number): void => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
      this.music.volume = startVolume * (1 - progress);

      if (progress >= 1) {
        this.fadeFrame = 0;
        this.music.pause();
        return;
      }
      this.fadeFrame = window.requestAnimationFrame(tick);
    };
    this.fadeFrame = window.requestAnimationFrame(tick);
  }

  preloadSoundEffects(sources: readonly string[]): void {
    for (const source of sources) {
      if (this.effectTemplates.has(source)) continue;
      const template = new Audio(source);
      template.preload = "auto";
      template.volume = SOUND_EFFECT_VOLUME;
      template.load();
      this.effectTemplates.set(source, template);
    }
  }

  playSoundEffect(source: string, options: SoundEffectOptions = {}): void {
    if (this.soundEffectsMuted) return;
    const delayMs = Math.max(0, options.delayMs ?? 0);
    const volumeScale = Math.max(0, options.volumeScale ?? 1);
    if (delayMs > 0) {
      const timer = window.setTimeout(() => {
        this.effectTimers.delete(timer);
        this.playSoundEffectNow(source, volumeScale);
      }, delayMs);
      this.effectTimers.add(timer);
      return;
    }
    this.playSoundEffectNow(source, volumeScale);
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.music.muted = muted;

    if (muted) {
      this.cancelMusicFade();
      this.music.pause();
    } else if (this.currentTrack) {
      this.music.volume = MUSIC_VOLUME * this.musicVolumeScale;
      this.tryPlay();
    }
  }

  setSoundEffectsMuted(muted: boolean): void {
    this.soundEffectsMuted = muted;
    if (!muted) return;

    for (const timer of this.effectTimers) window.clearTimeout(timer);
    this.effectTimers.clear();
    for (const effect of this.activeEffects) effect.pause();
    this.activeEffects.clear();
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.resumeMusic, { capture: true });
    window.removeEventListener("keydown", this.resumeMusic, { capture: true });
    window.removeEventListener("pageshow", this.resumeMusic);
    window.removeEventListener("focus", this.resumeMusic);
    this.music.removeEventListener("canplay", this.resumeMusic);
    this.cancelMusicFade();
    this.setSoundEffectsMuted(true);
    this.music.pause();
    this.music.removeAttribute("src");
    this.music.load();
    this.effectTemplates.clear();
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

  private playSoundEffectNow(source: string, volumeScale: number): void {
    if (this.soundEffectsMuted) return;
    const template = this.effectTemplates.get(source) ?? new Audio(source);
    const effect = template.cloneNode(true) as HTMLAudioElement;
    effect.preload = "auto";
    effect.volume = Math.min(1, SOUND_EFFECT_VOLUME * volumeScale);
    const release = (): void => {
      this.activeEffects.delete(effect);
    };
    effect.addEventListener("ended", release, { once: true });
    effect.addEventListener("error", release, { once: true });
    this.activeEffects.add(effect);
    void effect.play().catch(release);
  }

  private cancelMusicFade(): void {
    if (!this.fadeFrame) return;
    window.cancelAnimationFrame(this.fadeFrame);
    this.fadeFrame = 0;
  }
}
