import { useEffect, useState } from "react";
import { Gamepad2, Monitor, Volume2 } from "lucide-react";
import { Panel } from "../components/Panel";

const SETTINGS_KEY = "nulldistrict-settings";

export function SettingsScreen() {
  const [volume, setVolume] = useState(60);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showFps, setShowFps] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { volume?: number; reducedMotion?: boolean; showFps?: boolean };
      if (typeof parsed.volume === "number") setVolume(Math.max(0, Math.min(100, parsed.volume)));
      if (typeof parsed.reducedMotion === "boolean") setReducedMotion(parsed.reducedMotion);
      if (typeof parsed.showFps === "boolean") setShowFps(parsed.showFps);
    } catch {
      // Ignore invalid saved settings and continue with defaults.
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({ volume, reducedMotion, showFps });
    window.localStorage.setItem(SETTINGS_KEY, payload);
  }, [volume, reducedMotion, showFps]);

  return (
    <Panel title="Settings" kicker="Desktop beta">
      <div className="settings-list">
        <label className="setting-row"><Volume2 /><span>Volume</span><input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <label className="setting-row"><Monitor /><span>Reduced motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
        <label className="setting-row"><Gamepad2 /><span>Show debug FPS</span><input type="checkbox" checked={showFps} onChange={(event) => setShowFps(event.target.checked)} /></label>
      </div>
      <div className="notice-line">Settings save automatically on this device. Full key rebinding lands after beta 0.1.</div>
    </Panel>
  );
}
