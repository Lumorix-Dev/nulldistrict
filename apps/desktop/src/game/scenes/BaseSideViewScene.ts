import Phaser from "phaser";
import type {
  AreaId,
  DamageEvent,
  EnemyNetState,
  InventoryEntry,
  PlayerNetState,
  QuestId,
  QuestProgressState
} from "@nulldistrict/shared";
import { getAreaDefinition, getPuzzleDefinition, type AreaDefinition, type InteractableDef } from "@nulldistrict/game-data";
import { GAME_CONTEXT_KEY, type GameContext } from "../GameContext";
import { gameBus } from "../EventBus";
import { InputBindings } from "../systems/InputBindings";

type PlayerSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

interface InteractableRuntime {
  def: InteractableDef;
  sprite: Phaser.GameObjects.Sprite;
  used: boolean;
}

interface EnemyHud {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class BaseSideViewScene extends Phaser.Scene {
  protected readonly areaId: AreaId;
  protected area!: AreaDefinition;
  protected context!: GameContext;
  protected player!: PlayerSprite;
  protected platforms!: Phaser.Physics.Arcade.StaticGroup;
  protected inputBindings = new InputBindings();
  protected interactables: InteractableRuntime[] = [];
  protected enemies = new Map<string, PlayerSprite>();
  protected enemyHud = new Map<string, EnemyHud>();
  protected enemyMaxHp = new Map<string, number>();
  protected enemyShotCooldowns = new Map<string, number>();
  protected remotePlayers = new Map<string, Phaser.GameObjects.Container>();
  protected questProgress = new Map<QuestId, QuestProgressState>();
  protected facing: "left" | "right" = "right";
  protected hp = 100;
  protected energy = 100;
  protected softCurrency = 100;
  protected dashUntil = 0;
  protected attackCooldownUntil = 0;
  protected abilityCooldownUntil = 0;
  protected lastNetSend = 0;
  protected lastGrounded = 0;
  protected jumpCount = 0;
  protected dead = false;

  public constructor(key: string, areaId: AreaId) {
    super(key);
    this.areaId = areaId;
  }

  public create() {
    this.area = getAreaDefinition(this.areaId);
    this.context = this.game.registry.get(GAME_CONTEXT_KEY) as GameContext;
    this.inputBindings.create(this);
    this.physics.world.setBounds(0, 0, this.area.width, this.area.height);
    this.cameras.main.setBounds(0, 0, this.area.width, this.area.height);

    this.createBackground();
    this.createPlatforms();
    this.createInteractables();
    this.createPlayer();
    this.setupRealtime();
    this.context.realtime.join(this.areaId, this.context.character.id);
    void this.context.api.loadInventory();
    void this.context.api.loadQuests();

    gameBus.emit("hud:update", this.hudState());
  }

  public override update(time: number, delta: number) {
    if (this.dead) return;
    const input = this.inputBindings.read();
    if (input.inventoryJustDown) gameBus.emit("inventory:toggle", undefined);
    if (input.pauseJustDown) gameBus.emit("pause:toggle", undefined);
    if (input.interactJustDown) this.tryInteract();
    this.updateInteractPrompt();
    this.updateMovement(time, input);
    this.updateEnemyThreats(time, delta);
    this.syncNetwork(time);
    gameBus.emit("hud:update", this.hudState());
  }

  protected createBackground() {
    const colors: Record<string, [number, number, number]> = {
      haven: [0x05070b, 0x071316, 0x0f2530],
      entrance: [0x07080e, 0x12101b, 0x162536],
      "sector-a": [0x040609, 0x0e1320, 0x1a1130],
      archive: [0x05070b, 0x07121b, 0x102c35],
      theater: [0x060407, 0x180b12, 0x2d1225],
      pvp: [0x09040a, 0x1b0c14, 0x2b1220]
    };
    const fallback: [number, number, number] = [0x05070b, 0x071316, 0x0f2530];
    const [top, mid, accent] = colors[this.area.background] ?? fallback;
    this.add.rectangle(this.area.width / 2, this.area.height / 2, this.area.width, this.area.height, top).setScrollFactor(0.2);
    for (let x = 0; x < this.area.width; x += 220) {
      const height = 160 + ((x / 220) % 4) * 45;
      this.add.rectangle(x + 60, this.area.height - 120 - height / 2, 90, height, mid, 0.9).setScrollFactor(0.45);
      this.add.rectangle(x + 105, this.area.height - 150 - height, 8, 50, accent, 0.6).setScrollFactor(0.45);
    }
    this.add.text(28, 28, this.area.title, {
      fontFamily: "monospace",
      color: this.area.pvpEnabled ? "#ff6b8a" : "#9be7ff",
      fontSize: "22px"
    }).setScrollFactor(0);
  }

  protected createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.area.platforms) {
      const tile = this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        platform.width,
        platform.height,
        0x141b26
      );
      tile.setStrokeStyle(2, 0x31445d, 0.95);
      this.physics.add.existing(tile, true);
      this.platforms.add(tile);
    }
  }

  protected createPlayer() {
    this.player = this.physics.add.sprite(this.area.spawn.x, this.area.spawn.y, "player");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 40);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  protected createInteractables() {
    this.interactables = this.area.interactables.map((def) => {
      const texture =
        def.type === "npc" ? "npc" : def.type === "terminal" ? "terminal" : def.type === "relay" ? "relay" : def.type === "pickup" ? "pickup" : "door";
      const sprite = this.add.sprite(def.x, def.y, texture).setDepth(10);
      this.add.text(def.x - 50, def.y - 58, def.label, {
        fontFamily: "monospace",
        color: "#d8f7ff",
        fontSize: "12px",
        backgroundColor: "rgba(5,7,11,0.72)",
        padding: { x: 4, y: 2 }
      }).setDepth(11);
      return { def, sprite, used: false };
    });
  }

  protected setupRealtime() {
    const realtime = this.context.realtime;
    const onEnemies = (event: Event) => this.renderEnemies((event as CustomEvent<EnemyNetState[]>).detail);
    const onPlayers = (event: Event) => this.renderRemotePlayers((event as CustomEvent<PlayerNetState[]>).detail);
    const onDamage = (event: Event) => this.showDamage((event as CustomEvent<DamageEvent>).detail);
    const onInventory = (event: Event) => {
      gameBus.emit("inventory:update", { inventory: (event as CustomEvent<InventoryEntry[]>).detail });
    };
    const onQuests = (event: Event) => {
      const quests = (event as CustomEvent<QuestProgressState[]>).detail;
      this.questProgress = new Map(quests.map((quest) => [quest.questId, quest]));
      gameBus.emit("quests:update", { quests });
    };
    const onChat = (event: Event) => {
      const msg = (event as CustomEvent<{ username: string; message: string }>).detail;
      gameBus.emit("chat:message", msg);
    };
    const onDeath = (event: Event) => {
      const detail = (event as CustomEvent<{ lostSoftCurrency: number }>).detail;
      this.softCurrency = Math.max(0, this.softCurrency - detail.lostSoftCurrency);
      gameBus.emit("death:show", detail);
      this.respawn();
    };
    const onDefeated = (event: Event) => {
      const detail = (event as CustomEvent<{ targetId: string; rewards?: InventoryEntry[] }>).detail;
      const enemy = this.enemies.get(detail.targetId);
      if (enemy) {
        enemy.setTint(0x45f5c8);
        this.tweens.add({ targets: enemy, alpha: 0.2, duration: 180, yoyo: true });
      }
      const reward = detail.rewards?.[0];
      gameBus.emit("combat:notice", {
        title: "Target neutralized",
        body: reward ? `Recovered ${reward.name}.` : "The signal collapses for now."
      });
    };
    const offHeal = gameBus.on("player:heal", ({ amount }) => {
      this.hp = Math.min(100, this.hp + amount);
      this.showFloatingText(this.player.x, this.player.y - 58, `+${amount}`, "#45f5c8");
    });
    const offQuestBus = gameBus.on("quests:update", ({ quests }) => {
      this.questProgress = new Map(quests.map((quest) => [quest.questId, quest]));
    });
    realtime.addEventListener("enemies", onEnemies);
    realtime.addEventListener("players", onPlayers);
    realtime.addEventListener("damage", onDamage);
    realtime.addEventListener("inventory", onInventory);
    realtime.addEventListener("quests", onQuests);
    realtime.addEventListener("chat", onChat);
    realtime.addEventListener("death", onDeath);
    realtime.addEventListener("defeated", onDefeated);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      realtime.removeEventListener("enemies", onEnemies);
      realtime.removeEventListener("players", onPlayers);
      realtime.removeEventListener("damage", onDamage);
      realtime.removeEventListener("inventory", onInventory);
      realtime.removeEventListener("quests", onQuests);
      realtime.removeEventListener("chat", onChat);
      realtime.removeEventListener("death", onDeath);
      realtime.removeEventListener("defeated", onDefeated);
      offHeal();
      offQuestBus();
      realtime.leave();
    });
  }

  protected updateMovement(time: number, input: ReturnType<InputBindings["read"]>) {
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      this.lastGrounded = time;
      this.jumpCount = 0;
    }

    const speed = time < this.dashUntil ? 430 : 210;
    if (input.left) {
      this.player.setVelocityX(-speed);
      this.facing = "left";
    } else if (input.right) {
      this.player.setVelocityX(speed);
      this.facing = "right";
    } else {
      this.player.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.22));
    }

    if (input.jumpJustDown && (grounded || time - this.lastGrounded < 120 || this.jumpCount < 2)) {
      this.player.setVelocityY(this.jumpCount === 0 ? -420 : -360);
      this.jumpCount += 1;
    }
    if (!input.jump && body.velocity.y < -120) {
      this.player.setVelocityY(body.velocity.y * 0.93);
    }
    if (input.dashJustDown && this.energy >= 24) {
      this.energy -= 24;
      this.dashUntil = time + 150;
      this.player.setVelocityX(this.facing === "right" ? 520 : -520);
    }
    if (input.meleeJustDown) this.melee(time);
    if (input.abilityJustDown) this.ability(time);

    this.energy = Math.min(100, this.energy + 0.035 * this.game.loop.delta);
    this.player.setFlipX(this.facing === "left");
  }

  protected melee(time: number) {
    if (time < this.attackCooldownUntil) return;
    this.attackCooldownUntil = time + 380;
    const x = this.player.x + (this.facing === "right" ? 42 : -42);
    const hit = this.add.sprite(x, this.player.y - 4, "slash").setAlpha(0.72).setDepth(30).setFlipX(this.facing === "left");
    this.tweens.add({ targets: hit, alpha: 0, scaleX: 1.4, duration: 140, onComplete: () => hit.destroy() });
    this.attackAt(x, this.player.y, "melee");
  }

  protected ability(time: number) {
    if (time < this.abilityCooldownUntil || this.energy < 30) return;
    this.energy -= 30;
    this.abilityCooldownUntil = time + 720;
    const projectile = this.physics.add.sprite(this.player.x, this.player.y - 12, "projectile");
    projectile.body.setAllowGravity(false);
    projectile.setVelocityX(this.facing === "right" ? 620 : -620);
    projectile.setDepth(30);
    this.physics.add.collider(projectile, this.platforms, () => projectile.destroy());
    this.time.delayedCall(650, () => projectile.destroy());
    this.attackAt(this.player.x + (this.facing === "right" ? 180 : -180), this.player.y, "ability");
  }

  protected attackAt(x: number, y: number, kind: "melee" | "ability") {
    let closest: { id: string; distance: number } | undefined;
    for (const [id, enemy] of this.enemies) {
      if (!enemy.active) continue;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance < (kind === "ability" ? 260 : 90) && (!closest || distance < closest.distance)) {
        closest = { id, distance };
      }
    }
    if (closest) {
      this.context.realtime.socket?.emit("combat:attack", {
        attackId: `${Date.now()}-${closest.id}`,
        areaId: this.areaId,
        targetId: closest.id,
        targetType: "enemy",
        kind,
        x,
        y
      });
    } else if (this.area.pvpEnabled) {
      const target = [...this.remotePlayers.entries()].find(([, sprite]) => Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y) < 100);
      if (target) {
        this.context.realtime.socket?.emit("combat:attack", {
          attackId: `${Date.now()}-${target[0]}`,
          areaId: this.areaId,
          targetId: target[0],
          targetType: "player",
          kind,
          x,
          y
        });
      }
    }
  }

  protected updateEnemyThreats(time: number, delta: number) {
    for (const [id, enemy] of this.enemies) {
      if (!enemy.active) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < 42) {
        this.damagePlayer(0.022 * delta);
      }
      if (distance < 520 && Math.abs(this.player.y - enemy.y) < 170) {
        this.fireEnemyShot(id, enemy, time);
      }
    }
  }

  protected fireEnemyShot(id: string, enemy: PlayerSprite, time: number) {
    const nextShot = this.enemyShotCooldowns.get(id) ?? 0;
    if (time < nextShot) return;
    this.enemyShotCooldowns.set(id, time + 1300 + Math.random() * 700);
    const bolt = this.physics.add.sprite(enemy.x, enemy.y - 10, "enemy-projectile");
    bolt.body.setAllowGravity(false);
    bolt.setDepth(28);
    bolt.setVelocityX(this.player.x >= enemy.x ? 280 : -280);
    bolt.setVelocityY(Phaser.Math.Clamp((this.player.y - enemy.y) * 1.4, -180, 180));
    this.physics.add.collider(bolt, this.platforms, () => bolt.destroy());
    this.physics.add.overlap(bolt, this.player, () => {
      bolt.destroy();
      this.damagePlayer(11);
    });
    this.time.delayedCall(1600, () => bolt.destroy());
  }

  protected damagePlayer(amount: number) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.player.setTint(0xff5f7e);
    this.time.delayedCall(80, () => this.player.clearTint());
    if (this.hp <= 0) this.die();
  }

  protected die() {
    if (this.dead) return;
    this.dead = true;
    this.player.setTint(0x6b7280);
    this.player.setVelocity(0, 0);
    this.context.realtime.socket?.emit("player:death", { characterId: this.context.character.id, areaId: this.areaId });
    this.time.delayedCall(900, () => {
      if (this.dead) this.respawn();
    });
  }

  protected respawn() {
    this.dead = false;
    this.hp = 100;
    this.energy = 100;
    this.player.clearTint();
    this.player.setPosition(this.area.safePoint.x, this.area.safePoint.y);
  }

  protected tryInteract() {
    const nearest = this.interactables
      .filter((entry) => !entry.used || entry.def.type !== "pickup")
      .map((entry) => ({ entry, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.sprite.x, entry.sprite.y) }))
      .filter(({ distance }) => distance < 96)
      .sort((a, b) => a.distance - b.distance)[0]?.entry;
    if (!nearest) return;

    if (nearest.def.type === "transition" && nearest.def.targetArea) {
      if (nearest.def.targetArea === "underground-sector-a" && !this.hasQuestComplete("restore-first-relay")) {
        gameBus.emit("dialogue:open", {
          speaker: "District Seal",
          lines: [
            "Access denied. The First Relay is still scrambled.",
            "Solve the relay harmonic lock before entering Underground Sector A."
          ]
        });
        return;
      }
      if (nearest.def.targetArea === "pvp-breach-zone" && !this.hasQuestComplete("read-broken-terminal")) {
        gameBus.emit("dialogue:open", {
          speaker: "Breach Gate",
          lines: [
            "The breach refuses blind access.",
            "Decode the Broken Terminal first. It contains the gate's memory phrase."
          ]
        });
        return;
      }
      if (nearest.def.targetArea === "mirror-archive" && !this.hasQuestComplete("extract-first-signal")) {
        gameBus.emit("dialogue:open", {
          speaker: "Mirror Archive Seal",
          lines: [
            "The Archive rejects incomplete routes.",
            "Extract Case 001 in Signal Haven first. The second path only appears after proof is banked."
          ]
        });
        return;
      }
      if (
        nearest.def.targetArea === "blackout-theater" &&
        (!this.hasQuestComplete("synchronize-archive-nodes") || !this.hasQuestComplete("decode-mirror-archive"))
      ) {
        gameBus.emit("dialogue:open", {
          speaker: "Theater Lock",
          lines: [
            "The projector will not open on a single memory.",
            "Synchronize both Archive nodes with another operator and decode the Mirror Cipher first."
          ]
        });
        return;
      }
      if (nearest.def.targetArea === "district-entrance") {
        void this.context.api.advanceQuest({ questId: "enter-null-district", amount: 1 });
      }
      this.scene.start(this.sceneKeyForArea(nearest.def.targetArea));
      return;
    }

    if (nearest.def.type === "pickup") {
      nearest.used = true;
      nearest.sprite.destroy();
      this.context.realtime.socket?.emit("inventory:pickup", {
        pickupId: nearest.def.id,
        areaId: this.areaId,
        x: nearest.def.x,
        y: nearest.def.y
      });
      gameBus.emit("combat:notice", {
        title: "Item recovered",
        body: nearest.def.label
      });
      return;
    }

    if (nearest.def.action === "open-shop") {
      gameBus.emit("shop:open", undefined);
      return;
    }
    if (nearest.def.action === "extract-case") {
      gameBus.emit("run:extract", undefined);
      return;
    }
    if (nearest.def.action === "sync-node") {
      if (nearest.def.text) {
        gameBus.emit("dialogue:open", { speaker: nearest.def.label, lines: nearest.def.text });
      }
      this.context.realtime.socket?.emit("coop:sync-node", {
        areaId: this.areaId,
        nodeId: nearest.def.id,
        puzzleId: nearest.def.puzzleId ?? nearest.def.id
      });
      return;
    }

    if (nearest.def.puzzleId) {
      const puzzle = getPuzzleDefinition(nearest.def.puzzleId);
      if (puzzle && this.hasQuestComplete(puzzle.questId)) {
        gameBus.emit("dialogue:open", { speaker: puzzle.title, lines: puzzle.successLines });
        return;
      }
      gameBus.emit("puzzle:open", { puzzleId: nearest.def.puzzleId });
      return;
    }

    if (nearest.def.text) {
      gameBus.emit("dialogue:open", { speaker: nearest.def.label, lines: nearest.def.text });
    }
    if (nearest.def.questId) {
      void this.context.api.advanceQuest({
        questId: nearest.def.questId,
        amount: 1,
        storyFlag:
          nearest.def.type === "relay"
            ? { key: "restored_first_relay", value: true }
            : nearest.def.type === "terminal"
              ? { key: `read_${nearest.def.id}`, value: true }
              : undefined
      });
      if (nearest.def.type === "relay") {
        this.context.realtime.socket?.emit("quest:choice", {
          questId: nearest.def.questId as QuestId,
          flag: "opened_underground_sector_a",
          value: true
        });
      }
    }
  }

  protected hasQuestComplete(questId: QuestId) {
    return this.questProgress.get(questId)?.completed === true;
  }

  protected updateInteractPrompt() {
    const nearest = this.interactables
      .filter((entry) => !entry.used || entry.def.type !== "pickup")
      .map((entry) => ({ entry, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.sprite.x, entry.sprite.y) }))
      .filter(({ distance }) => distance < 96)
      .sort((a, b) => a.distance - b.distance)[0]?.entry;
    gameBus.emit("interact:prompt", nearest ? { label: nearest.def.label, type: nearest.def.type } : null);
  }

  protected renderEnemies(enemies: EnemyNetState[]) {
    for (const enemyState of enemies) {
      let sprite = this.enemies.get(enemyState.id);
      if (!sprite) {
        const texture = enemyState.kind === "signal-wraith" ? "enemy-signal-wraith" : "enemy-corrupted-scout";
        sprite = this.physics.add.sprite(enemyState.x, enemyState.y, texture);
        sprite.setDepth(18);
        this.physics.add.collider(sprite, this.platforms);
        this.enemies.set(enemyState.id, sprite);
        this.enemyMaxHp.set(enemyState.id, enemyState.maxHp);
        this.enemyHud.set(enemyState.id, {
          background: this.add.rectangle(enemyState.x, enemyState.y - 42, 48, 5, 0x05070b, 0.9).setDepth(40),
          fill: this.add.rectangle(enemyState.x - 24, enemyState.y - 42, 48, 5, 0xff5f7e, 1).setOrigin(0, 0.5).setDepth(41),
          label: this.add.text(enemyState.x - 42, enemyState.y - 62, enemyState.kind === "signal-wraith" ? "Signal Wraith" : "Corrupted Scout", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#ffb0bf",
            backgroundColor: "rgba(5,7,11,0.62)",
            padding: { x: 3, y: 1 }
          }).setDepth(41)
        });
      }
      sprite.setPosition(enemyState.x, enemyState.y);
      sprite.setVisible(enemyState.hp > 0);
      sprite.setActive(enemyState.hp > 0);
      if (enemyState.hp > 0) sprite.setTint(enemyState.animation === "chase" ? 0xff8fa3 : 0xffffff);

      const hud = this.enemyHud.get(enemyState.id);
      if (hud) {
        const visible = enemyState.hp > 0;
        const percent = Phaser.Math.Clamp(enemyState.hp / enemyState.maxHp, 0, 1);
        hud.background.setPosition(enemyState.x, enemyState.y - 42).setVisible(visible);
        hud.fill.setPosition(enemyState.x - 24, enemyState.y - 42).setDisplaySize(48 * percent, 5).setVisible(visible);
        hud.label.setPosition(enemyState.x - 42, enemyState.y - 62).setVisible(visible);
      }
    }
  }

  protected renderRemotePlayers(players: PlayerNetState[]) {
    const ids = new Set(players.map((player) => player.characterId));
    for (const [id, container] of this.remotePlayers) {
      if (!ids.has(id) || id === this.context.character.id) {
        container.destroy();
        this.remotePlayers.delete(id);
      }
    }
    for (const player of players) {
      if (player.characterId === this.context.character.id) continue;
      let container = this.remotePlayers.get(player.characterId);
      if (!container) {
        const sprite = this.add.sprite(0, 0, "remote-player");
        const label = this.add.text(-36, -42, player.username, { fontFamily: "monospace", fontSize: "11px", color: "#d8b4fe" });
        container = this.add.container(player.x, player.y, [sprite, label]).setDepth(19);
        this.remotePlayers.set(player.characterId, container);
      }
      container.setPosition(player.x, player.y);
    }
  }

  protected showDamage(event: DamageEvent) {
    if (event.targetId === this.context.character.id && event.kind === "pvp") {
      this.damagePlayer(event.amount);
    }
    const enemy = this.enemies.get(event.targetId);
    if (enemy) {
      enemy.setTint(0xf8f871);
      this.time.delayedCall(90, () => {
        if (enemy.active) enemy.clearTint();
      });
    }
    this.showFloatingText(event.x, event.y, `-${event.amount}`, event.kind === "pvp" ? "#ff8fa3" : "#f8f871");
  }

  protected showFloatingText(x: number, y: number, label: string, color: string) {
    const text = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "18px",
      color,
      stroke: "#05070b",
      strokeThickness: 4
    }).setDepth(60);
    this.tweens.add({
      targets: text,
      y: text.y - 38,
      alpha: 0,
      duration: 650,
      onComplete: () => text.destroy()
    });
  }

  protected syncNetwork(time: number) {
    if (time - this.lastNetSend < 65) return;
    this.lastNetSend = time;
    const body = this.player.body;
    const animation: PlayerNetState["animation"] = this.dead
      ? "dead"
      : time < this.dashUntil
        ? "dash"
        : Math.abs(body.velocity.x) > 20
          ? "run"
          : body.velocity.y < -20
            ? "jump"
            : body.velocity.y > 20
              ? "fall"
              : "idle";
    this.context.realtime.sendState({
      userId: this.context.user.id,
      username: this.context.user.username,
      characterId: this.context.character.id,
      areaId: this.areaId,
      x: this.player.x,
      y: this.player.y,
      vx: body.velocity.x,
      vy: body.velocity.y,
      facing: this.facing,
      hp: this.hp,
      energy: this.energy,
      animation,
      updatedAt: Date.now()
    });
  }

  protected sceneKeyForArea(areaId: AreaId) {
    return {
      "signal-haven": "HubScene",
      "district-entrance": "DistrictEntranceScene",
      "underground-sector-a": "UndergroundSectorAScene",
      "mirror-archive": "MirrorArchiveScene",
      "blackout-theater": "BlackoutTheaterScene",
      "pvp-breach-zone": "PvPZoneScene"
    }[areaId];
  }

  protected hudState() {
    const now = this.time.now;
    return {
      hp: Math.round(this.hp),
      maxHp: 100,
      energy: Math.round(this.energy),
      maxEnergy: 100,
      abilityReady: now >= this.abilityCooldownUntil && this.energy >= 30,
      meleeReady: now >= this.attackCooldownUntil,
      areaId: this.areaId,
      areaTitle: this.area.title,
      softCurrency: this.softCurrency
    };
  }
}
