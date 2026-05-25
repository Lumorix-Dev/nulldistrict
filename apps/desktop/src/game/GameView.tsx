import { useEffect, useRef } from "react";
import { DoorOpen } from "lucide-react";
import { createNullDistrictGame } from "./createGame";
import { createOfflineGameContext } from "./GameContext";

export function GameView() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    const game = createNullDistrictGame(parent, createOfflineGameContext());

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="game-shell">
      <div ref={containerRef} className="game-canvas" />
      <header className="solo-toolbar">
        <div>
          <strong>Null District</strong>
          <span>Solo escape-room campaign</span>
        </div>
        <button className="hud-icon" title="Close desktop app" onClick={() => window.close()}>
          <DoorOpen />
        </button>
      </header>
    </main>
  );
}
