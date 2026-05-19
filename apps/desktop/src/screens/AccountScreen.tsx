import { Crown, LogOut, Shield } from "lucide-react";
import type { PublicUser } from "@nulldistrict/shared";
import { Panel } from "../components/Panel";

export function AccountScreen({ user, onLogout }: { user: PublicUser; onLogout: () => void }) {
  return (
    <Panel title="Account" kicker="Lumorix identity">
      <div className="account-grid">
        <div><strong>{user.username}</strong><span>{user.email}</span></div>
        <div><Shield size={18} /><span>{user.role}</span></div>
        <div><Crown size={18} /><span>{user.premiumCurrency} Null Credits</span></div>
      </div>
      <button className="secondary-button" onClick={onLogout}>
        <LogOut size={16} /> Logout
      </button>
    </Panel>
  );
}
