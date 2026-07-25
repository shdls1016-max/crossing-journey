import { SoundService } from "./audio/SoundService";
import { NavigationService } from "./flow/NavigationService";
import { ScreenFlowStore } from "./flow/ScreenFlowStore";
import { GameProgressService } from "./progress/GameProgressService";
import { GameResultService } from "./progress/GameResultService";
import { SettingsService } from "./settings/SettingsService";
import { VibrationService } from "./settings/VibrationService";
import { SaveService } from "./storage/SaveService";
import { CharacterService } from "./characters/CharacterService";

export const saveService = new SaveService();
export const characterService = new CharacterService(saveService);
export const progressService = new GameProgressService(saveService);
export const settingsService = new SettingsService(saveService);
export const soundService = new SoundService(settingsService);
export const vibrationService = new VibrationService(settingsService);
export const screenFlow = new ScreenFlowStore();
export const gameResultService = new GameResultService(progressService, screenFlow);
export const navigationService = new NavigationService(screenFlow);
