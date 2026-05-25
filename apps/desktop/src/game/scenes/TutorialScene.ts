import Phaser from "phaser";

interface TutorialCard {
  title: string;
  description: string;
}

const CARDS: TutorialCard[] = [
  {
    title: "Welcome to Null District",
    description:
      "This version of the game is a solo escape-room campaign.\n\n" +
      "Each room is a contained puzzle space with platforming, clues and locked routes.\n" +
      "Your goal is to clear the five main rooms and unlock the hidden sixth chamber."
  },
  {
    title: "Core Controls",
    description:
      "WASD or Arrow Keys  - Move\n" +
      "Space               - Jump\n" +
      "F                   - Interact\n" +
      "ESC                 - Pause\n\n" +
      "Stay close to objects until the interaction prompt appears."
  },
  {
    title: "Read the Room",
    description:
      "Progress rarely comes from speed alone.\n\n" +
      "Look for signs, color patterns, door labels and the order of objects in the level.\n" +
      "Code panels and lever chains always have environmental clues nearby."
  },
  {
    title: "Use the HUD",
    description:
      "Bottom left  - Active objectives\n" +
      "Bottom right - Inventory\n" +
      "Top right    - Timer\n\n" +
      "If you get stuck, use the hint button. It reveals escalating guidance for the current room."
  },
  {
    title: "Campaign Flow",
    description:
      "Pick a case file from the main menu.\n" +
      "Clear rooms to unlock the next one.\n" +
      "Best times and completions are saved locally.\n\n" +
      "After clearing all five main rooms, the secret sixth room becomes available."
  }
];

export class TutorialScene extends Phaser.Scene {
  private currentCard = 0;
  private cardContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];

  public constructor() {
    super("TutorialScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    this.add.rectangle(cx, h / 2, w, h, 0x080c14);
    this.drawGrid(w, h);

    const skip = this.add.text(w - 18, 18, "Skip", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a",
      backgroundColor: "rgba(10,10,26,0.8)",
      padding: { x: 10, y: 5 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    skip.on("pointerover", () => skip.setColor("#ff7aa2"));
    skip.on("pointerout", () => skip.setColor("#5a8a9a"));
    skip.on("pointerdown", () => this.scene.start("MainMenuScene"));

    for (let i = 0; i < CARDS.length; i++) {
      this.dots.push(this.add.circle(cx + (i - CARDS.length / 2 + 0.5) * 20, h - 28, 5, 0x334155));
    }

    this.add.text(cx, h - 12, "Left/Right or Space to navigate", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#334155"
    }).setOrigin(0.5);

    this.cardContainer = this.add.container(cx, h / 2);
    this.renderCard();

    this.input.keyboard?.on("keydown-RIGHT", () => this.advance());
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());
    this.input.keyboard?.on("keydown-ENTER", () => this.advance());
    this.input.keyboard?.on("keydown-LEFT", () => this.goBack());
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("MainMenuScene"));
  }

  private advance() {
    if (this.currentCard < CARDS.length - 1) {
      this.currentCard++;
      this.renderCard();
      return;
    }
    this.scene.start("MainMenuScene");
  }

  private goBack() {
    if (this.currentCard === 0) return;
    this.currentCard--;
    this.renderCard();
  }

  private renderCard() {
    this.cardContainer.removeAll(true);
    const w = Math.min(720, this.scale.width - 100);
    const h = Math.min(420, this.scale.height - 140);
    const card = CARDS[this.currentCard]!;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1b2e, 0.97);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(2, 0x00c8ff, 0.5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.cardContainer.add(bg);

    const step = this.add.text(-w / 2 + 18, -h / 2 + 18, `${this.currentCard + 1}/${CARDS.length}`, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#00c8ff"
    });
    this.cardContainer.add(step);

    const title = this.add.text(0, -h / 2 + 58, card.title, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#00c8ff",
      align: "center"
    }).setOrigin(0.5);
    this.cardContainer.add(title);

    const body = this.add.text(0, 14, card.description, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#7aabb8",
      align: "left",
      lineSpacing: 6,
      wordWrap: { width: w - 110 }
    }).setOrigin(0.5);
    this.cardContainer.add(body);

    const next = this.add.text(w / 2 - 18, h / 2 - 18, this.currentCard === CARDS.length - 1 ? "Finish" : "Next", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#45f5c8",
      backgroundColor: "rgba(0,20,10,0.8)",
      padding: { x: 12, y: 6 }
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    next.on("pointerdown", () => this.advance());
    this.cardContainer.add(next);

    if (this.currentCard > 0) {
      const back = this.add.text(-w / 2 + 18, h / 2 - 18, "Back", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#5a8a9a",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: { x: 12, y: 6 }
      }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
      back.on("pointerdown", () => this.goBack());
      this.cardContainer.add(back);
    }

    this.dots.forEach((dot, index) => {
      dot.setFillStyle(index === this.currentCard ? 0x00c8ff : 0x334155);
      dot.setRadius(index === this.currentCard ? 7 : 5);
    });
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x173248, 0.1);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }
}
