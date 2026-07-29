import Phaser from "phaser";
import {
  navigationService,
  characterService,
  saveService,
  screenFlow,
  settingsService,
  soundService,
  vibrationService,
} from "./appServices";
import { createGameConfig } from "./game/createGameConfig";
import "./styles/global.css";
import { AppShell } from "./ui/AppShell";
import { BrowserAudioAdapter } from "./audio/BrowserAudioAdapter";
import { getMusicTrackForStage } from "./audio/musicTracks";
import { SOUND_EFFECTS } from "./audio/soundEffects";
import { gameplaySession } from "./gameplay/GameplaySessionStore";

const uiRoot = document.querySelector<HTMLElement>("#ui-root");
if (!uiRoot) throw new Error("UI root was not found.");

new AppShell(uiRoot, {
  flow: screenFlow,
  navigation: navigationService,
  saves: saveService,
  settings: settingsService,
  sound: soundService,
  vibration: vibrationService,
  characters: characterService,
});

const audioAdapter = new BrowserAudioAdapter();
soundService.attach(audioAdapter);
soundService.preloadSoundEffects(Object.values(SOUND_EFFECTS));
screenFlow.subscribe((state) => {
  const gameplayEnded = state.popup === "clear" || state.popup === "failure";
  if (state.screen === "game" && gameplayEnded) {
    return;
  }
  if (state.screen === "game") {
    soundService.setMusicTrack(getMusicTrackForStage(state.activeStage));
  } else if (state.screen === "world-map" || state.screen === "character-select") {
    soundService.setMusicTrack(getMusicTrackForStage(1), 0.5);
  } else {
    soundService.setMusicTrack(null);
  }
});
let previousGameplayStatus = gameplaySession.getSnapshot().status;
gameplaySession.subscribe((state) => {
  const justEnded =
    state.status !== previousGameplayStatus &&
    (state.status === "cleared" || state.status === "failed");
  previousGameplayStatus = state.status;
  if (justEnded) soundService.fadeOutMusic(5_000);
});

const game = new Phaser.Game(createGameConfig());
navigationService.attach(game);

let resizeFrame = 0;
const resizeGame = () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    if (game.scale.width === window.innerWidth && game.scale.height === window.innerHeight) return;
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
};

window.addEventListener("resize", resizeGame);
window.visualViewport?.addEventListener("resize", resizeGame);
const viewportObserver = new ResizeObserver(resizeGame);
viewportObserver.observe(document.documentElement);

window.addEventListener("pagehide", () => {
  audioAdapter.dispose();
  viewportObserver.disconnect();
  window.visualViewport?.removeEventListener("resize", resizeGame);
  window.removeEventListener("resize", resizeGame);
  window.cancelAnimationFrame(resizeFrame);
});

window.addEventListener("orientationchange", () => {
  window.setTimeout(resizeGame, 80);
});

window.addEventListener("pageshow", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && screenFlow.getSnapshot().screen === "game") {
    screenFlow.openPopup("pause");
  }
});
