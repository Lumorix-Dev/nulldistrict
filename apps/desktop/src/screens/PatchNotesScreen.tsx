import { ScrollText } from "lucide-react";
import { VERSION } from "@nulldistrict/shared";
import { Panel } from "../components/Panel";

export function PatchNotesScreen() {
  return (
    <Panel title="Patch Notes" kicker={VERSION}>
      <div className="patch-list">
        <div><ScrollText /><span>Playable hub, District Entrance, Underground Sector A, and PvP Breach Zone.</span></div>
        <div><ScrollText /><span>Account login/register, character creation, inventory, quests, shop, and status screens.</span></div>
        <div><ScrollText /><span>Socket.IO co-op visibility, chat, basic combat authority, and enemy sync.</span></div>
      </div>
    </Panel>
  );
}
