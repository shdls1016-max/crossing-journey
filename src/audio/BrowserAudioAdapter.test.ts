import assert from "node:assert/strict";
import test from "node:test";

class FakeAudio extends EventTarget {
  static readonly instances: FakeAudio[] = [];

  currentSrc = "";
  loop = false;
  muted = false;
  paused = true;
  preload = "";
  src = "";
  volume = 1;
  playCount = 0;

  constructor(source = "") {
    super();
    this.src = source;
    FakeAudio.instances.push(this);
  }

  cloneNode(): FakeAudio {
    const clone = new FakeAudio(this.src);
    clone.preload = this.preload;
    clone.volume = this.volume;
    return clone;
  }

  load(): void {}

  pause(): void {
    this.paused = true;
  }

  play(): Promise<void> {
    this.paused = false;
    this.playCount += 1;
    return Promise.resolve();
  }

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }
}

test("music volume, fade and sound-effect mute state are applied", async () => {
  const originalAudio = globalThis.Audio;
  const originalWindow = globalThis.window;
  const animationFrames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;

  Object.assign(globalThis, {
    Audio: FakeAudio,
    window: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        const id = nextFrame++;
        animationFrames.set(id, callback);
        return id;
      },
      cancelAnimationFrame: (id: number) => animationFrames.delete(id),
      setTimeout,
      clearTimeout,
    },
  });

  try {
    const { BrowserAudioAdapter } = await import("./BrowserAudioAdapter");
    const adapter = new BrowserAudioAdapter();
    const music = FakeAudio.instances[0]!;

    adapter.setMusicMuted(false);
    adapter.setMusicTrack("theme.mp3", 0.5);
    assert.equal(music.loop, true);
    assert.equal(music.volume, 0.21);
    assert.equal(music.playCount, 1);

    const fadeStartedAt = performance.now();
    adapter.fadeOutMusic(5_000);
    const firstFrame = animationFrames.values().next().value as FrameRequestCallback;
    firstFrame(fadeStartedAt + 2_500);
    assert.ok(music.volume < 0.12 && music.volume > 0.09);
    const finalFrame = [...animationFrames.values()].at(-1)!;
    finalFrame(fadeStartedAt + 5_100);
    assert.equal(music.paused, true);

    adapter.preloadSoundEffects(["coin.mp3"]);
    adapter.setSoundEffectsMuted(false);
    adapter.playSoundEffect("coin.mp3");
    assert.equal(FakeAudio.instances.at(-1)?.playCount, 1);
    assert.equal(FakeAudio.instances.at(-1)?.volume, 2 / 3);

    adapter.playSoundEffect("game-over.mp3", { volumeScale: 1.5 });
    assert.equal(FakeAudio.instances.at(-1)?.volume, 1);

    adapter.setSoundEffectsMuted(true);
    adapter.playSoundEffect("coin.mp3");
    assert.equal(FakeAudio.instances.at(-1)?.playCount, 1);
    adapter.dispose();
  } finally {
    Object.assign(globalThis, { Audio: originalAudio, window: originalWindow });
    FakeAudio.instances.length = 0;
  }
});
