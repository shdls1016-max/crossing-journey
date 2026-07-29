import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getMusicTrackForStage, MUSIC_TRACK_FILES } from "./musicTracks";
import { SOUND_EFFECT_FILES } from "./soundEffects";

test("each five-stage theme uses its matching background track", () => {
  assert.ok(getMusicTrackForStage(1).endsWith(MUSIC_TRACK_FILES.stage01To05));
  assert.ok(getMusicTrackForStage(5).endsWith(MUSIC_TRACK_FILES.stage01To05));
  assert.ok(getMusicTrackForStage(6).endsWith(MUSIC_TRACK_FILES.stage06To10));
  assert.ok(getMusicTrackForStage(10).endsWith(MUSIC_TRACK_FILES.stage06To10));
  assert.ok(getMusicTrackForStage(11).endsWith(MUSIC_TRACK_FILES.stage11To15));
  assert.ok(getMusicTrackForStage(15).endsWith(MUSIC_TRACK_FILES.stage11To15));
  assert.ok(getMusicTrackForStage(16).endsWith(MUSIC_TRACK_FILES.stage16To20));
  assert.ok(getMusicTrackForStage(20).endsWith(MUSIC_TRACK_FILES.stage16To20));
});

test("every declared audio file exists in the public assets folder", () => {
  const files = [
    ...Object.values(MUSIC_TRACK_FILES),
    ...Object.values(SOUND_EFFECT_FILES),
  ];
  for (const file of files) {
    assert.ok(existsSync(join(process.cwd(), "public", file)), `Missing audio: ${file}`);
  }
});
