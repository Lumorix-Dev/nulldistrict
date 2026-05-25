import { useEffect, useState } from "react";
import { SplashScreen } from "./screens/SplashScreen";
import { GameView } from "./game/GameView";

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;
  return <GameView />;
}
