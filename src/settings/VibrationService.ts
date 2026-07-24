import type { SettingsService } from "./SettingsService";

export class VibrationService {
  constructor(private readonly settings: SettingsService) {}

  pulse(pattern: number | number[] = 18): void {
    if (!this.settings.getSnapshot().vibration) return;
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  }
}
