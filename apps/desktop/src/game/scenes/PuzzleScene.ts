import Phaser from "phaser";
import { PuzzleEngine, type PuzzleObjective } from "../systems/PuzzleEngine";
import { EntitySystem, type EntityDef } from "../systems/EntitySystem";
import { InputBindings } from "../systems/InputBindings";
import { gameBus } from "../EventBus";
import { audioManager } from "../systems/AudioManager";
import { ParticleSystem } from "../systems/ParticleSystem";
import { UISystem } from "../systems/UISystem";
import { FPSCounter } from "../systems/FPSCounter";
import { achievementSystem } from "../systems/AchievementSystem";
import { LeaderboardScene } from "./LeaderboardScene";
import { CameraEffects } from "../systems/CameraEffects";

export interface RoomDefinition {
  id: string;
  title: string;
  width: number;
  height: number;
  bgColor: number;
  accentColor: number;
  spawnX: number;
  spawnY: number;
  objectives: PuzzleObjective[];
  platforms: Array<{ x: number; y: number; width: number; height: number }>;
  entities: EntityDef[];
  /** Scene key to go to on completion */
  nextScene?: string;
  clueTexts?: Array<{ x: number; y: number; text: string; color?: string }>;
  checkpoints?: Array<{ x: number; y: number; id: string }>;
}

export interface PuzzleHUDState {
  roomTitle: string;
  objectives: PuzzleObjective[];
  inventoryItems: string[];
  elapsedSeconds: number;
  complete: boolean;
}

export abstract class PuzzleScene extends Phaser.Scene {
  protected abstract definition: RoomDefinition;

  protected engine!: PuzzleEngine;
  protected entities!: EntitySystem;
  protected particles!: ParticleSystem;
  protected ui!: UISystem;
  protected player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  protected platforms!: Phaser.Physics.Arcade.StaticGroup;
  protected inputBindings = new InputBindings();
  protected facing: "left" | "right" = "right";

  protected hudBg!: Phaser.GameObjects.Rectangle;
  protected hudText!: Phaser.GameObjects.Text;
  protected inventoryText!: Phaser.GameObjects.Text;
  protected timerText!: Phaser.GameObjects.Text;
  protected interactPrompt!: Phaser.GameObjects.Container;
  protected winBanner!: Phaser.GameObjects.Container;
  private interactKeyF!: Phaser.Input.Keyboard.Key;
  private fps!: FPSCounter;

  protected hints: string[] = [];
  private hintsUsed = 0;
  private currentSpawnX = 0;
  private currentSpawnY = 0;
  private parallaxStars: Phaser.GameObjects.Rectangle[] = [];
  private parallaxShapes: Array<{ rect: Phaser.GameObjects.Rectangle; speed: number }> = [];
  private hintBtn!: Phaser.GameObjects.Text;
  private isRespawning = false;
  private deathCount = 0;
  private wrongCodeAttempts = new Set<string>();
  private offAchievementListener!: () => void;
  private notificationQueue: string[] = [];
  private activeNotification: Phaser.GameObjects.Container | null = null;
  private _wasGrounded = false;

  public create() {
    const def = this.definition;

    this.physics.world.setBounds(0, 0, def.width, def.height);
    this.cameras.main.setBounds(0, 0, def.width, def.height);

    this.engine = new PuzzleEngine(def.id, def.objectives);
    this.entities = new EntitySystem(this);
    this.particles = new ParticleSystem(this);
    this.ui = new UISystem(this);

    this.drawBackground();
    this.createPlatforms();
    this.entities.spawn(def.entities);
    this.physics.add.collider(this.entities.getPhysicsGroup(), this.platforms);
    this.createPlayer();
    this.currentSpawnX = def.spawnX;
    this.currentSpawnY = def.spawnY;
    this.physics.add.collider(this.player, this.entities.getPhysicsGroup());
    this.createClueTexts();
    this.createCheckpoints();
    this.buildHUD();

    this.inputBindings.create(this);
    this.interactKeyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.fps = new FPSCounter(this);

    // Listen for achievement unlocks and surface them via UISystem
    this.offAchievementListener = gameBus.on("voidcraft:achievement", (data) => {
      this.ui.showAchievement(data.title, data.description, data.icon);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offAchievementListener();
    });

    // ESC → pause
    this.input.keyboard!.on("keydown-ESC", () => {
      if (!this.scene.isActive("PauseMenuScene")) {
        this.scene.launch("PauseMenuScene");
      }
    });
  }

  public override update(time: number, delta: number) {
    const input = this.inputBindings.read();
    this.updateMovement(input);

    const activated = this.entities.update(this.player.x, this.player.y);
    for (const id of activated) this.onEntityActivated(id, time);

    if (Phaser.Input.Keyboard.JustDown(this.interactKeyF)) this.tryInteract(time);

    if (!this.isRespawning && this.player.y > this.definition.height + 100) {
      this.isRespawning = true;
      this.deathCount++;
      this.respawnPlayer();
    }

    this.updateParallax(delta);
    this.updateHUD();
    this.processNotifications();
    this.fps.update(this);
  }

  // ── Background ─────────────────────────────────────────────────────────

  private drawBackground() {
    const def = this.definition;

    // Layer 0: Base fill
    this.add.rectangle(def.width / 2, def.height / 2, def.width, def.height, def.bgColor).setDepth(0);

    // Layer 1: Parallax stars — 50 small 2×2 rects, drifted in updateParallax()
    for (let i = 0; i < 50; i++) {
      const sx = Phaser.Math.Between(0, def.width);
      const sy = Phaser.Math.Between(0, def.height);
      const alpha = Phaser.Math.FloatBetween(0.06, 0.32);
      const star = this.add.rectangle(sx, sy, 2, 2, def.accentColor, alpha).setDepth(1);
      this.parallaxStars.push(star);
    }

    // Layer 2: Grid lines (static)
    for (let x = 0; x < def.width; x += 120) {
      this.add.rectangle(x, def.height / 2, 1, def.height, def.accentColor, 0.08).setDepth(2);
    }
    for (let y = 0; y < def.height; y += 80) {
      this.add.rectangle(def.width / 2, y, def.width, 1, def.accentColor, 0.05).setDepth(2);
    }

    // Layer 3: Slow-drifting large geometric shapes (drifted in updateParallax())
    const shapeDefs = [
      { xr: 0.14, yr: 0.30, w: 280, h: 180, angle: -12, alpha: 0.05, speed: 12 },
      { xr: 0.44, yr: 0.65, w: 240, h: 140, angle:  8,  alpha: 0.07, speed: 18 },
      { xr: 0.72, yr: 0.20, w: 200, h: 260, angle: -6,  alpha: 0.06, speed: 10 },
      { xr: 0.88, yr: 0.55, w: 260, h: 160, angle: 15,  alpha: 0.05, speed: 14 },
    ];
    for (const sd of shapeDefs) {
      const rect = this.add.rectangle(
        def.width * sd.xr, def.height * sd.yr, sd.w, sd.h, def.accentColor, sd.alpha
      ).setDepth(2).setAngle(sd.angle);
      this.parallaxShapes.push({ rect, speed: sd.speed });
    }

    // Room title fixed to camera
    this.add.text(24, 18, this.definition.title, {
      fontFamily: "monospace", fontSize: "20px", color: "#9be7ff"
    }).setScrollFactor(0).setDepth(5);
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    for (const p of this.definition.platforms) {
      const tile = this.add.rectangle(p.x + p.width / 2, p.y + p.height / 2, p.width, p.height, 0x141b26);
      tile.setStrokeStyle(2, 0x31445d, 0.95);
      this.physics.add.existing(tile, true);
      this.platforms.add(tile);
    }
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(this.definition.spawnX, this.definition.spawnY, "player-sheet");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 40);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.platforms);
  }

  private createClueTexts() {
    for (const clue of this.definition.clueTexts ?? []) {
      this.add.text(clue.x, clue.y, clue.text, {
        fontFamily: "monospace", fontSize: "11px",
        color: clue.color ?? "#7aabb8",
        backgroundColor: "rgba(5,7,11,0.78)",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 }
      }).setDepth(15);
    }
  }

  // ── Player movement ────────────────────────────────────────────────────

  private updateMovement(input: ReturnType<InputBindings["read"]>) {
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;

    if (input.left) {
      this.player.setVelocityX(-200);
      this.facing = "left";
    } else if (input.right) {
      this.player.setVelocityX(200);
      this.facing = "right";
    } else {
      this.player.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.25));
    }

    if (input.jumpJustDown && grounded) {
      this.player.setVelocityY(-400);
      audioManager.playJump();
    }

    if (grounded && !this._wasGrounded) {
      audioManager.playLand(0.7);
      this.particles.spawnLandDust(this.player.x, this.player.y + 20, 0.5);
    }
    this._wasGrounded = grounded;

    this.player.setFlipX(this.facing === "left");

    const moving = Math.abs(body.velocity.x) > 10;
    if (!grounded) {
      this.player.play(body.velocity.y < 0 ? "player-jump" : "player-fall", true);
    } else if (moving) {
      this.player.play("player-walk", true);
    } else {
      this.player.play("player-idle", true);
    }
  }

  // ── Interaction ────────────────────────────────────────────────────────

  protected tryInteract(time: number) {
    void time;
    const entity = this.entities.getEntityAt(this.player.x, this.player.y, 80);
    if (!entity) return;

    const def = entity.def;

    switch (def.type) {
      case "key":
      case "crystal_shard":
        if (!this.entities.isCollected(def.id)) {
          const item = this.entities.collect(def.id);
          if (item) {
            this.engine.pickUp(def.id);
            audioManager.playKeyPickup();
            CameraEffects.keyPickup(this);
            this.particles.spawnKeyPickup(def.x, def.y);
            this.notify(`Picked up: ${item.label ?? def.id}`);
            achievementSystem.checkItemCollected();
            this.checkObjectives();
            // Trigger linked
            for (const lid of def.linkedTo ?? []) this.onLinkedTrigger(lid);
          }
        }
        break;

      case "chest":
        if (!this.entities.isCollected(def.id)) {
          this.entities.collect(def.id);
          const items = def.items ?? [];
          for (const itm of items) this.engine.pickUp(itm);
          audioManager.playNotification();
          this.notify(def.message ?? "Chest opened!");
          achievementSystem.checkItemCollected();
          this.checkObjectives();
        }
        break;

      case "door":
        if (this.entities.isLocked(def.id)) {
          if (def.requiredKey && this.engine.hasItem(def.requiredKey)) {
            const ok = this.engine.tryUnlock(def.id, def.requiredKey);
            if (ok) {
              this.entities.unlock(def.id);
              audioManager.playDoorUnlock();
              CameraEffects.doorUnlock(this);
              this.particles.spawnDoorUnlock(def.x, def.y);
              this.notify("Door unlocked!");
              this.checkObjectives();
              for (const lid of def.linkedTo ?? []) this.onLinkedTrigger(lid);
            }
          } else {
            this.notify(def.requiredKey ? `Requires: ${def.requiredKey}` : "Locked.");
          }
        } else {
          // Walk through / transition
          this.onDoorEntered(def.id);
        }
        break;

      case "lever":
        this.entities.activate(def.id);
        this.engine.activateSwitch(def.id);
        audioManager.playLeverFlip(this.entities.isActive(def.id));
        this.notify(this.entities.isActive(def.id) ? "Lever: ON" : "Lever: OFF");
        for (const lid of def.linkedTo ?? []) this.onLinkedTrigger(lid);
        this.checkObjectives();
        break;

      case "code_panel":
        if (!this.engine.isPanelSolved(def.id)) {
          this.openCodePanel(def.id, def.code ?? "0000");
        } else {
          this.notify("Panel already solved.");
        }
        break;

      case "text_sign":
        this.notify(def.message ?? "...");
        break;

      case "portal":
        if (def.targetScene) {
          audioManager.playPortalEnter();
          this.scene.start(def.targetScene);
        }
        break;
    }
  }

  protected onEntityActivated(id: string, _time: number) {
    const entity = this.entities.getEntity(id);
    if (!entity) return;

    if (entity.def.type === "pressure_plate" || entity.def.type === "pressure_switch") {
      audioManager.playPressurePlate();
    }
    this.engine.activateSwitch(id);
    for (const lid of entity.def.linkedTo ?? []) this.onLinkedTrigger(lid);
    this.checkObjectives();
  }

  protected onLinkedTrigger(entityId: string) {
    const entity = this.entities.getEntity(entityId);
    if (!entity) return;

    if (entity.def.type === "door" && entity.def.locked !== false) {
      this.engine.forceUnlock(entityId);
      this.entities.unlock(entityId);
    } else {
      this.entities.activate(entityId);
      this.engine.activateSwitch(entityId);
    }
  }

  protected onDoorEntered(doorId: string) {
    const def = this.definition.entities.find(e => e.id === doorId);
    if (def?.targetScene) {
      this.scene.start(def.targetScene);
    }
  }

  protected openCodePanel(panelId: string, code: string) {
    // Simple code entry via on-screen prompt
    const cx = this.cameras.main.scrollX + this.scale.width / 2;
    const cy = this.cameras.main.scrollY + this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, 280, 160, 0x05070b, 0.95).setDepth(500).setStrokeStyle(2, 0x9be7ff, 0.9);
    const title = this.add.text(cx - 100, cy - 55, "Enter Code (4 digits):", {
      fontFamily: "monospace", fontSize: "13px", color: "#9be7ff"
    }).setDepth(501);

    let entered = "";
    const display = this.add.text(cx - 20, cy - 20, "____", {
      fontFamily: "monospace", fontSize: "28px", color: "#ffe066"
    }).setDepth(501);

    const hint = this.add.text(cx - 110, cy + 30, "Type digits. Press ENTER to submit, ESC to cancel.", {
      fontFamily: "monospace", fontSize: "9px", color: "#5a8a9a",
      wordWrap: { width: 250 }
    }).setDepth(501);

    const close = () => { overlay.destroy(); title.destroy(); display.destroy(); hint.destroy(); };

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); this.input.keyboard!.off("keydown", handler); return; }
      if (event.key === "Enter") {
        const solved = this.engine.tryCode(panelId, entered, code);
        close();
        this.input.keyboard!.off("keydown", handler);
        if (solved) {
          this.notify("Code accepted! ✓");
          audioManager.playCodeAccepted();
          CameraEffects.codeSolved(this);
          achievementSystem.checkCodeFirstTry(!this.wrongCodeAttempts.has(panelId));
          const entity = this.entities.getEntity(panelId);
          if (entity) {
            for (const lid of entity.def.linkedTo ?? []) this.onLinkedTrigger(lid);
          }
          this.checkObjectives();
        } else {
          this.wrongCodeAttempts.add(panelId);
          this.notify("Wrong code.");
          audioManager.playCodeRejected();
        }
        return;
      }
      if (/^\d$/.test(event.key) && entered.length < 4) {
        entered += event.key;
        display.setText(entered.padEnd(4, "_"));
      }
      if (event.key === "Backspace" && entered.length > 0) {
        entered = entered.slice(0, -1);
        display.setText(entered.padEnd(4, "_"));
      }
    };

    this.input.keyboard!.on("keydown", handler);
  }

  // ── Objectives ─────────────────────────────────────────────────────────

  protected checkObjectives() {
    // Subclasses can override; base checks if all done
    if (this.engine.allObjectivesComplete()) {
      this.onPuzzleComplete();
    }
  }

  protected onPuzzleComplete() {
    this.engine.complete();
    audioManager.playPuzzleComplete();
    CameraEffects.roomComplete(this);
    this.particles.spawnPuzzleComplete(this.player.x, this.player.y);

    // Best-time tracking
    const elapsed = this.engine.getElapsedSeconds();
    const storageKey = `voidcraft:best-${this.definition.id}`;
    const stored = parseFloat(localStorage.getItem(storageKey) ?? "");
    const isNewBest = isNaN(stored) || elapsed < stored;
    if (isNewBest) localStorage.setItem(storageKey, elapsed.toFixed(2));

    achievementSystem.checkPuzzleComplete(this.definition.id, elapsed, this.hintsUsed, this.deathCount);
    LeaderboardScene.recordScore(this.definition.id, "Player", Math.floor(elapsed));
    this.showWinBanner(elapsed, isNewBest ? undefined : stored);
  }

  private showWinBanner(elapsed: number, prevBest?: number) {
    const nextScene = this.definition.nextScene;
    const isEscapeChain = nextScene?.startsWith("EscapeRoom");
    const bestLine = prevBest !== undefined
      ? `Best: ${prevBest.toFixed(1)}s`
      : `New best: ${elapsed.toFixed(1)}s 🏆`;
    this.ui.showModal({
      title: "PUZZLE COMPLETE",
      message: `Time: ${elapsed.toFixed(1)}s  •  ${bestLine}\n\nPress the button below to continue.`,
      buttons: [
        {
          label: "Continue →",
          color: 0x0d2b1e,
          action: () => {
            if (isEscapeChain) {
              this.scene.start("LevelTransitionScene", {
                fromScene: this.scene.key,
                toScene: nextScene,
                time: elapsed,
              });
            } else if (nextScene) {
              this.scene.start(nextScene);
            } else {
              this.scene.start("PuzzleSelectScene");
            }
          },
        },
        {
          label: "Level Select",
          color: 0x0d1a2b,
          action: () => this.scene.start("PuzzleSelectScene"),
        },
      ],
    });
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private buildHUD() {
    // Objectives panel (bottom left)
    this.hudBg = this.add.rectangle(120, this.scale.height - 80, 230, 110, 0x05070b, 0.85)
      .setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x334155, 0.9);

    this.hudText = this.add.text(12, this.scale.height - 128, "", {
      fontFamily: "monospace", fontSize: "10px", color: "#9be7ff",
      lineSpacing: 3
    }).setScrollFactor(0).setDepth(101);

    // Inventory (bottom right)
    this.inventoryText = this.add.text(this.scale.width - 180, this.scale.height - 110, "", {
      fontFamily: "monospace", fontSize: "10px", color: "#ffe066",
      lineSpacing: 3
    }).setScrollFactor(0).setDepth(101);

    // Timer (top right)
    this.timerText = this.add.text(this.scale.width - 90, 16, "", {
      fontFamily: "monospace", fontSize: "14px", color: "#45f5c8"
    }).setScrollFactor(0).setDepth(101);

    // Interact prompt
    const promptBg = this.add.rectangle(0, 0, 160, 24, 0x0d1a22, 0.88).setStrokeStyle(1, 0x9be7ff, 0.8);
    const promptText = this.add.text(0, 0, "[F] Interact", {
      fontFamily: "monospace", fontSize: "11px", color: "#9be7ff"
    }).setOrigin(0.5);
    this.interactPrompt = this.add.container(this.scale.width / 2, this.scale.height - 32, [promptBg, promptText])
      .setScrollFactor(0).setDepth(100).setVisible(false);

    // Hint button (bottom right, fixed to camera)
    if (this.hints.length > 0) {
      this.hintBtn = this.add.text(
        this.scale.width - 20, this.scale.height - 20,
        "[?] Hint",
        { fontFamily: "monospace", fontSize: "11px", color: "#ffe066", backgroundColor: "#0d1a2b", padding: { x: 8, y: 4 } }
      ).setOrigin(1, 1).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
      this.hintBtn.on("pointerdown", () => this.showNextHint());
    }
  }

  private updateHUD() {
    const objectives = this.engine.roomState.objectives;
    const objLines = objectives.map(o => `${o.completed ? "✓" : "○"} ${o.description}`);
    this.hudText.setText(["OBJECTIVES:", ...objLines].join("\n"));

    const inv = this.engine.inventory;
    this.inventoryText.setText(inv.length > 0 ? ["INVENTORY:", ...inv].join("\n") : "INVENTORY: (empty)");

    this.timerText.setText(`${this.engine.getElapsedSeconds().toFixed(0)}s`);

    // Show interact prompt if near entity
    const near = this.entities.getEntityAt(this.player.x, this.player.y, 80);
    this.interactPrompt.setVisible(!!near);
  }

  // ── Notifications ──────────────────────────────────────────────────────

  protected notify(message: string) {
    audioManager.playNotification();
    this.ui.showToast(message, "info");
  }

  private processNotifications() {
    // Notifications are now handled by UISystem toasts; keeping method for update() call compat.
    if (this.activeNotification || this.notificationQueue.length === 0) return;
    this.notificationQueue.shift();
  }

  private showNextHint() {
    if (this.hints.length === 0) return;
    const hint = this.hints[this.hintsUsed % this.hints.length];
    this.hintsUsed++;
    this.ui.showToast(`Hint ${this.hintsUsed}: ${hint}`, "info");
    achievementSystem.checkHintUsed();
  }

  private createCheckpoints() {
    const checkpoints = this.definition.checkpoints;
    if (!checkpoints?.length) return;
    for (const cp of checkpoints) {
      const zone = this.add.zone(cp.x, cp.y, 60, 80);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => {
        if (this.currentSpawnX !== cp.x || this.currentSpawnY !== cp.y) {
          this.currentSpawnX = cp.x;
          this.currentSpawnY = cp.y;
          this.ui.showToast("Checkpoint saved ✓", "info");
        }
      });
    }
  }

  private respawnPlayer() {
    CameraEffects.death(this);
    this.time.delayedCall(350, () => {
      this.player.setPosition(this.currentSpawnX, this.currentSpawnY - 40);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.isRespawning = false;
    });
  }

  private updateParallax(delta: number) {
    const w = this.definition.width;
    for (const star of this.parallaxStars) {
      star.x -= 0.008 * delta;
      if (star.x < 0) star.x += w;
    }
    for (const { rect, speed } of this.parallaxShapes) {
      rect.x -= speed * 0.001 * delta;
      if (rect.x < -200) rect.x += w + 400;
    }
  }
}
