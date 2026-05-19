import { useEffect, useState } from "react";
import { CirclePlus, Play, UserRound } from "lucide-react";
import type { CharacterSummary } from "@nulldistrict/shared";
import { api } from "../api/client";
import { EmptyState, Panel } from "../components/Panel";

const classes: CharacterSummary["className"][] = ["Signal Runner", "Relay Warden", "Null Analyst"];

export function CharacterScreen({
  token,
  selected,
  onSelect,
  onPlay
}: {
  token: string;
  selected: CharacterSummary | null;
  onSelect: (character: CharacterSummary) => void;
  onPlay: () => void;
}) {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [name, setName] = useState("");
  const [className, setClassName] = useState<CharacterSummary["className"]>("Signal Runner");
  const [error, setError] = useState("");

  async function load() {
    const response = await api.characters(token);
    setCharacters(response.characters);
    if (!selected && response.characters[0]) onSelect(response.characters[0]);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load characters."));
  }, [token]);

  async function createCharacter() {
    setError("");
    try {
      const response = await api.createCharacter(token, { name, className });
      setCharacters((current) => [...current, response.character]);
      onSelect(response.character);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create character.");
    }
  }

  return (
    <Panel title="Character Selection" kicker="Account-bound progression">
      <div className="character-grid">
        <div className="character-list">
          {characters.length === 0 ? (
            <EmptyState icon={<UserRound />} title="No character yet" body="Create one to enter Signal Haven." />
          ) : (
            characters.map((character) => (
              <button
                className={`character-row ${selected?.id === character.id ? "active" : ""}`}
                key={character.id}
                onClick={() => onSelect(character)}
              >
                <span>{character.name}</span>
                <small>{character.className} - Lv {character.level}</small>
              </button>
            ))
          )}
        </div>

        <div className="creation-box">
          <h3>Create beta character</h3>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Character name" />
          <div className="segmented wrap">
            {classes.map((entry) => (
              <button className={entry === className ? "active" : ""} key={entry} onClick={() => setClassName(entry)}>
                {entry}
              </button>
            ))}
          </div>
          <button className="secondary-button" onClick={() => void createCharacter()} disabled={!name.trim()}>
            <CirclePlus size={16} /> Create
          </button>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
      </div>

      <div className="panel-actions">
        <button className="primary-button" disabled={!selected} onClick={onPlay}>
          <Play size={18} /> Play
        </button>
      </div>
    </Panel>
  );
}
