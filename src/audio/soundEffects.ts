import { assetUrl } from "../assets/assetPaths";

export const SOUND_EFFECT_FILES = {
  coin: "assets/audio/sfx-coin.mp3",
  stageClear: "assets/audio/sfx-stage-clear.mp3",
  gameOver: "assets/audio/sfx-game-over.mp3",
  newRecord: "assets/audio/sfx-new-record.mp3",
} as const;

export const SOUND_EFFECTS = {
  coin: assetUrl(SOUND_EFFECT_FILES.coin),
  stageClear: assetUrl(SOUND_EFFECT_FILES.stageClear),
  gameOver: assetUrl(SOUND_EFFECT_FILES.gameOver),
  newRecord: assetUrl(SOUND_EFFECT_FILES.newRecord),
} as const;
