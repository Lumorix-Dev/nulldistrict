import { useEffect, useState } from "react";
import { Activity, Database, RadioTower } from "lucide-react";
import type { ServerStatus } from "@nulldistrict/shared";
import { api } from "../api/client";
import { Panel } from "../components/Panel";

export function StatusScreen() {
  const [status, setStatus] = useState<(ServerStatus & { database: string }) | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setLoading(true);
    try {
      setStatus(await api.status());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server is unreachable.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Panel title="Server Status" kicker="Realtime relay">
      <div className="panel-actions">
        <button className="secondary-button" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh now"}
        </button>
      </div>
      {status ? (
        <div className="status-grid">
          <div><Activity /> <strong>{status.online ? "Online" : "Degraded"}</strong><span>{status.message}</span></div>
          <div><RadioTower /> <strong>{status.connectedPlayers}</strong><span>players connected</span></div>
          <div><Database /> <strong>{status.database}</strong><span>database</span></div>
        </div>
      ) : (
        <div className="notice-line">{error || "Checking server relay and database..."}</div>
      )}
    </Panel>
  );
}
