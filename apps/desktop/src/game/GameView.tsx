import { useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, MessageSquare, Package, Pause, Send, Shield, ShoppingBag, Skull, X } from "lucide-react";
import type { CharacterSummary, InventoryEntry, PublicUser, QuestProgressState, ShopProduct } from "@nulldistrict/shared";
import { api } from "../api/client";
import { gameBus, type HudState } from "./EventBus";
import { createNullDistrictGame } from "./createGame";
import { RealtimeClient } from "./network/realtime";

export function GameView({
  token,
  user,
  character,
  onExit
}: {
  token: string;
  user: PublicUser;
  character: CharacterSummary;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [quests, setQuests] = useState<QuestProgressState[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [dialogue, setDialogue] = useState<{ speaker: string; lines: string[] } | null>(null);
  const [death, setDeath] = useState<{ lostSoftCurrency: number } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopMessage, setShopMessage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<{ username: string; message: string }[]>([]);

  const realtime = useMemo(() => new RealtimeClient(), []);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
    if (realtime.socket) realtime.socket.auth = { token };
  }, [token, realtime]);

  useEffect(() => {
    realtime.connect(tokenRef.current);
    const gameContext = {
      token: tokenRef.current,
      user,
      character,
      realtime,
      api: {
        advanceQuest: async (payload: { questId: string; amount?: number; storyFlag?: { key: string; value: boolean } }) => {
          const response = await api.advanceQuest(tokenRef.current, payload);
          setQuests(response.quests);
        },
        loadInventory: async () => {
          const response = await api.inventory(tokenRef.current);
          setInventory(response.inventory);
          gameBus.emit("inventory:update", { inventory: response.inventory });
        },
        loadQuests: async () => {
          const response = await api.quests(tokenRef.current);
          setQuests(response.quests);
          gameBus.emit("quests:update", { quests: response.quests });
        }
      }
    };

    const parent = containerRef.current;
    if (!parent) return undefined;
    const game = createNullDistrictGame(parent, gameContext);

    const offHud = gameBus.on("hud:update", setHud);
    const offInventory = gameBus.on("inventory:update", (payload) => setInventory(payload.inventory));
    const offInventoryToggle = gameBus.on("inventory:toggle", () => setInventoryOpen((open) => !open));
    const offQuests = gameBus.on("quests:update", (payload) => setQuests(payload.quests));
    const offPause = gameBus.on("pause:toggle", () => setPauseOpen((open) => !open));
    const offDialogue = gameBus.on("dialogue:open", setDialogue);
    const offDeath = gameBus.on("death:show", (payload) => {
      setDeath(payload);
      window.setTimeout(() => setDeath(null), 2200);
    });
    const offChat = gameBus.on("chat:message", (payload) => {
      setChatLines((lines) => [...lines.slice(-5), payload]);
    });
    const offShop = gameBus.on("shop:open", () => {
      setShopOpen(true);
      void api.shopProducts().then((response) => setShopProducts(response.products));
    });

    return () => {
      offHud();
      offInventory();
      offInventoryToggle();
      offQuests();
      offPause();
      offDialogue();
      offDeath();
      offChat();
      offShop();
      realtime.disconnect();
      game.destroy(true);
    };
  }, [user.id, user.username, character, realtime]);

  function sendChat() {
    if (!chatInput.trim() || !hud) return;
    realtime.socket?.emit("chat:send", { areaId: hud.areaId, message: chatInput.trim() });
    setChatInput("");
  }

  async function purchaseFromGame(productSlug: string) {
    setShopMessage("");
    try {
      await api.purchaseTest(token, productSlug);
      setShopMessage("Purchase verified on server.");
    } catch (err) {
      setShopMessage(err instanceof Error ? err.message : "Purchase failed.");
    }
  }

  const activeQuest = quests.find((quest) => !quest.completed) ?? quests[0];

  return (
    <main className="game-shell">
      <div ref={containerRef} className="game-canvas" />

      <header className="game-hud top">
        <div className="area-chip">
          <strong>{hud?.areaTitle ?? "Signal Haven"}</strong>
          <span>{realtime.connected ? "online instance beta-1" : "connecting..."}</span>
        </div>
        <div className="hud-bars">
          <Meter label="HP" value={hud?.hp ?? 100} max={hud?.maxHp ?? 100} tone="health" />
          <Meter label="EN" value={hud?.energy ?? 100} max={hud?.maxEnergy ?? 100} tone="energy" />
        </div>
        <button className="hud-icon" title="ESC menu" onClick={() => setPauseOpen(true)}><Pause /></button>
      </header>

      <aside className="quest-tracker">
        <Shield size={16} />
        <div>
          <strong>{activeQuest?.title ?? "No active quest"}</strong>
          <span>{activeQuest ? `${activeQuest.current}/${activeQuest.target}` : "Explore the district"}</span>
        </div>
      </aside>

      <div className="chat-stack">
        {chatLines.map((line, index) => (
          <div className="chat-line" key={`${line.username}-${index}`}><strong>{line.username}</strong> {line.message}</div>
        ))}
      </div>

      <nav className="game-actions">
        <button title="Inventory" onClick={() => setInventoryOpen(true)}><Package /></button>
        <button title="Chat" onClick={() => setChatOpen((open) => !open)}><MessageSquare /></button>
        <button title="Shop" onClick={() => gameBus.emit("shop:open", undefined)}><ShoppingBag /></button>
      </nav>

      {chatOpen ? (
        <div className="chat-input">
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Instance chat" onKeyDown={(event) => { if (event.key === "Enter") sendChat(); }} />
          <button onClick={sendChat}><Send size={16} /></button>
        </div>
      ) : null}

      {inventoryOpen ? (
        <Overlay title="Inventory" onClose={() => setInventoryOpen(false)}>
          <div className="inventory-grid">
            {inventory.length ? inventory.map((item) => (
              <div className="inventory-item" key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.type} - x{item.quantity}</span>
                <p>{item.description}</p>
              </div>
            )) : <div className="notice-line">No items yet. Fragments and loot appear here after pickups.</div>}
          </div>
        </Overlay>
      ) : null}

      {dialogue ? (
        <div className="dialogue-box" onClick={() => setDialogue(null)}>
          <strong>{dialogue.speaker}</strong>
          {dialogue.lines.map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : null}

      {pauseOpen ? (
        <Overlay title="Paused" onClose={() => setPauseOpen(false)}>
          <div className="pause-actions">
            <button className="secondary-button" onClick={() => setInventoryOpen(true)}><Package size={16} /> Inventory</button>
            <button className="secondary-button" onClick={() => setPauseOpen(false)}><X size={16} /> Resume</button>
            <button className="secondary-button danger" onClick={onExit}><DoorOpen size={16} /> Exit to menu</button>
          </div>
        </Overlay>
      ) : null}

      {shopOpen ? (
        <Overlay title="Null Market" onClose={() => setShopOpen(false)}>
          <div className="inventory-grid">
            {shopProducts.map((product) => (
              <div className="inventory-item" key={product.id}>
                <strong>{product.title}</strong>
                <span>{product.productType}</span>
                <p>{product.description}</p>
                <button className="secondary-button" onClick={() => void purchaseFromGame(product.slug)}>Test purchase</button>
              </div>
            ))}
          </div>
          {shopMessage ? <div className="notice-line">{shopMessage}</div> : null}
        </Overlay>
      ) : null}

      {death ? (
        <div className="death-recap">
          <Skull />
          <strong>Signal lost</strong>
          <span>Respawned at safe point. Lost {death.lostSoftCurrency} normal credits.</span>
        </div>
      ) : null}
    </main>
  );
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: "health" | "energy" }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`meter ${tone}`}>
      <span>{label}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
      <strong>{Math.round(value)}</strong>
    </div>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <section className="overlay-panel">
      <header>
        <h2>{title}</h2>
        <button className="hud-icon" onClick={onClose} title="Close"><X /></button>
      </header>
      {children}
    </section>
  );
}
