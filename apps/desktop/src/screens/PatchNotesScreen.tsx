import { ScrollText } from "lucide-react";
import { VERSION } from "@nulldistrict/shared";
import { Panel } from "../components/Panel";

export function PatchNotesScreen() {
  return (
    <Panel title="Patch Notes" kicker={VERSION}>
      <div className="patch-list">
        <div><ScrollText /><span>Case 001 and Case 002 are playable with extraction rewards, lore fragments and server-authoritative progression.</span></div>
        <div><ScrollText /><span>Account, character and market flow polished with better validation, loading states and clearer beta messaging.</span></div>
        <div><ScrollText /><span>Status and settings are improved for day-to-day testing: manual relay refresh plus local setting persistence.</span></div>
      </div>
    </Panel>
  );
}
