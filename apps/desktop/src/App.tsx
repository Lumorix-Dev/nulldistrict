import { useEffect, useState } from "react";
import { DoorOpen, Radio, ScrollText, Settings, ShoppingBag, UserRound, UsersRound } from "lucide-react";
import type { CharacterSummary } from "@nulldistrict/shared";
import { useAuth } from "./auth/AuthContext";
import { IconButton } from "./components/Panel";
import { AccountScreen } from "./screens/AccountScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterScreen } from "./screens/CharacterScreen";
import { PatchNotesScreen } from "./screens/PatchNotesScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { SplashScreen } from "./screens/SplashScreen";
import { StatusScreen } from "./screens/StatusScreen";
import { GameView } from "./game/GameView";

type MenuTab = "characters" | "shop" | "status" | "patch" | "settings" | "account";

export function App() {
  const { user, accessToken, logout, refreshAccount } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState<MenuTab>("characters");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSummary | null>(null);
  const [inGame, setInGame] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;
  if (!user || !accessToken) return <AuthScreen />;
  if (inGame && selectedCharacter) {
    return (
      <GameView
        token={accessToken}
        user={user}
        character={selectedCharacter}
        onExit={() => {
          setInGame(false);
          void refreshAccount();
        }}
      />
    );
  }

  return (
    <main className="shell">
      <aside className="side-rail">
        <div className="brand-stack">
          <div className="brand-mark small">LX</div>
          <span>Null District</span>
        </div>
        <IconButton title="Characters" active={tab === "characters"} onClick={() => setTab("characters")}><UsersRound /></IconButton>
        <IconButton title="Shop" active={tab === "shop"} onClick={() => setTab("shop")}><ShoppingBag /></IconButton>
        <IconButton title="Server" active={tab === "status"} onClick={() => setTab("status")}><Radio /></IconButton>
        <IconButton title="Patch notes" active={tab === "patch"} onClick={() => setTab("patch")}><ScrollText /></IconButton>
        <IconButton title="Settings" active={tab === "settings"} onClick={() => setTab("settings")}><Settings /></IconButton>
        <IconButton title="Account" active={tab === "account"} onClick={() => setTab("account")}><UserRound /></IconButton>
        <IconButton title="Exit app" onClick={() => window.close()}><DoorOpen /></IconButton>
      </aside>

      <section className="menu-stage">
        <header className="menu-header">
          <div>
            <span className="kicker">Lumorix flagship product beta</span>
            <h1>Lumorix: Null District</h1>
          </div>
          <div className="profile-chip">
            <span>{user.username}</span>
            <strong>{user.premiumCurrency} NC</strong>
          </div>
        </header>

        {tab === "characters" ? (
          <CharacterScreen
            token={accessToken}
            selected={selectedCharacter}
            onSelect={setSelectedCharacter}
            onPlay={() => setInGame(true)}
          />
        ) : null}
        {tab === "shop" ? <ShopScreen token={accessToken} premium={user.premiumCurrency} onPurchased={() => void refreshAccount()} /> : null}
        {tab === "status" ? <StatusScreen /> : null}
        {tab === "patch" ? <PatchNotesScreen /> : null}
        {tab === "settings" ? <SettingsScreen /> : null}
        {tab === "account" ? <AccountScreen user={user} onLogout={() => void logout()} /> : null}
      </section>
    </main>
  );
}
