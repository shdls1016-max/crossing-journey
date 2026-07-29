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
screenFlow.subscribe((state) => {
  const gameplayEnded = state.popup === "clear" || state.popup === "failure";
  soundService.setMusicTrack(
    state.screen === "game" && !gameplayEnded
      ? getMusicTrackForStage(state.activeStage)
      : null,
  );
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
