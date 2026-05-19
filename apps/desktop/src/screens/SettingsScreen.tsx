import { useState } from "react";
import { Gamepad2, Monitor, Volume2 } from "lucide-react";
import { Panel } from "../components/Panel";

export function SettingsScreen() {
  const [volume, setVolume] = useState(60);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showFps, setShowFps] = useState(false);

  return (
    <Panel title="Settings" kicker="Desktop beta">
      <div className="settings-list">
        <label className="setting-row"><Volume2 /><span>Volume</span><input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <label className="setting-row"><Monitor /><span>Reduced motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
        <label className="setting-row"><Gamepad2 /><span>Show debug FPS</span><input type="checkbox" checked={showFps} onChange={(event) => setShowFps(event.target.checked)} /></label>
      </div>
      <div className="notice-line">Controller-ready input mapping is scaffolded; full rebinding comes after beta 0.1.</div>
    </Panel>
  );
}
