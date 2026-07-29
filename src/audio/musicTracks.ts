import { assetUrl } from "../assets/assetPaths";

export const MUSIC_TRACK_FILES = {
  stage01To05: "assets/audio/music-stage-01-05.mp3",
  stage06To10: "assets/audio/music-stage-06-10.mp3",
  stage11To15: "assets/audio/music-stage-11-15.mp3",
  stage16To20: "assets/audio/music-stage-16-20.mp3",
} as const;

export function getMusicTrackForStage(stageId: number): string {
  const stage = Math.min(20, Math.max(1, Math.floor(stageId)));

  if (stage <= 5) return assetUrl(MUSIC_TRACK_FILES.stage01To05);
  if (stage <= 10) return assetUrl(MUSIC_TRACK_FILES.stage06To10);
  if (stage <= 15) return assetUrl(MUSIC_TRACK_FILES.stage11To15);
  return assetUrl(MUSIC_TRACK_FILES.stage16To20);
}
