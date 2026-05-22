import Phaser from 'phaser';
import { gameBus } from '../EventBus';
import { GAME_CONTEXT_KEY, type GameContext } from '../GameContext';

const PANEL_W = 172;
const PANEL_RIGHT_MARGIN = 10;
const PANEL_TOP = 10;
const HEADER_H = 26;
const ROW_H = 22;
const PLAYER_COLORS = [0x9be7ff, 0x45f5c8, 0xff6eb4, 0xf1c84b] as const;

interface PlayerRow {
  playerId: string;
  square: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

/** Parallel HUD scene that renders the co-op player list and chat bubbles. */
export class CoopHUDScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private rows: PlayerRow[] = [];
  private localPlayerId = '';
  private chatBubbles: Phaser.GameObjects.Text[] = [];
  private offs: Array<() => void> = [];

  constructor() {
    super({ key: 'CoopHUDScene', active: false });
  }

  create(): void {
    // Ensure this scene renders on top of everything
    this.scene.bringToTop();

    const ctx = this.game.registry.get(GAME_CONTEXT_KEY) as GameContext | undefined;
    this.localPlayerId = ctx?.character?.id ?? '';

    const rx = this.scale.width - PANEL_RIGHT_MARGIN;

    // Panel background
    this.panel = this.add
      .rectangle(rx, PANEL_TOP, PANEL_W, HEADER_H + ROW_H + 6, 0x0a1628, 0.85)
      .setScrollFactor(0)
      .setDepth(900)
      .setOrigin(1, 0)
      .setStrokeStyle(1, 0x1a3d55, 0.8);

    // "SOLO" / "2P" / "3P" / "4P" label
    this.headerText = this.add
      .text(rx - PANEL_W / 2, PANEL_TOP + HEADER_H / 2, 'SOLO', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9be7ff',
      })
      .setScrollFactor(0)
      .setDepth(901)
      .setOrigin(0.5, 0.5);

    // Local player row is always present
    if (this.localPlayerId) {
      this.addRow(this.localPlayerId, 'You', PLAYER_COLORS[0], true);
    }

    // Remote players joining / leaving
    this.offs.push(
      gameBus.on('voidcraft:player-joined', (data) => {
        if (data.playerId !== this.localPlayerId) {
          this.addRow(data.playerId, data.playerName, data.color, false);
        }
      }),
    );

    this.offs.push(
      gameBus.on('voidcraft:player-left', (data) => {
        this.removeRow(data.playerId);
      }),
    );

    // Chat messages → floating bubbles
    this.offs.push(
      gameBus.on('chat:message', (data) => {
        this.showChatBubble(data.username, data.message);
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs) off();
      this.offs = [];
    });
  }

  override update(): void {
    // Nothing per-frame; layout is event-driven
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private addRow(playerId: string, name: string, color: number, isLocal: boolean): void {
    if (this.rows.some((r) => r.playerId === playerId)) return;

    const rx = this.scale.width - PANEL_RIGHT_MARGIN;
    const rowIndex = this.rows.length;
    const y = PANEL_TOP + HEADER_H + rowIndex * ROW_H + ROW_H / 2;

    const square = this.add
      .rectangle(rx - PANEL_W + 12, y, 10, 10, color, 1)
      .setScrollFactor(0)
      .setDepth(901)
      .setOrigin(0.5);

    const hex = '#' + color.toString(16).padStart(6, '0');
    const displayName = isLocal ? `${name} ★` : name;
    const label = this.add
      .text(rx - PANEL_W + 22, y, displayName, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: hex,
      })
      .setScrollFactor(0)
      .setDepth(901)
      .setOrigin(0, 0.5);

    this.rows.push({ playerId, square, label });
    this.refreshPanel();
  }

  private removeRow(playerId: string): void {
    const idx = this.rows.findIndex((r) => r.playerId === playerId);
    if (idx === -1) return;

    const row = this.rows[idx]!;
    row.square.destroy();
    row.label.destroy();
    this.rows.splice(idx, 1);

    // Re-stack remaining rows
    const rx = this.scale.width - PANEL_RIGHT_MARGIN;
    this.rows.forEach((r, i) => {
      const y = PANEL_TOP + HEADER_H + i * ROW_H + ROW_H / 2;
      r.square.setPosition(rx - PANEL_W + 12, y);
      r.label.setPosition(rx - PANEL_W + 22, y);
    });

    this.refreshPanel();
  }

  private refreshPanel(): void {
    const count = this.rows.length;
    const panelH = HEADER_H + Math.max(1, count) * ROW_H + 6;
    this.panel.setSize(PANEL_W, panelH);

    const labels = ['SOLO', '2P', '3P', '4P'];
    this.headerText.setText(labels[Math.min(count - 1, 3)] ?? 'SOLO');
  }

  private showChatBubble(username: string, message: string): void {
    // Chat bubbles stack upward from just left of the player panel
    const rx = this.scale.width - PANEL_RIGHT_MARGIN - PANEL_W - 8;
    const baseY = PANEL_TOP + this.chatBubbles.length * 32;

    const bubble = this.add
      .text(rx, baseY, `${username}: ${message}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#9be7ff',
        backgroundColor: 'rgba(10,22,40,0.88)',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 },
      })
      .setScrollFactor(0)
      .setDepth(901)
      .setOrigin(1, 0)
      .setAlpha(0);

    this.chatBubbles.push(bubble);

    this.tweens.add({
      targets: bubble,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        this.time.delayedCall(3500, () => {
          this.tweens.add({
            targets: bubble,
            alpha: 0,
            duration: 400,
            onComplete: () => {
              bubble.destroy();
              const i = this.chatBubbles.indexOf(bubble);
              if (i !== -1) this.chatBubbles.splice(i, 1);
            },
          });
        });
      },
    });
  }
}
