import Phaser from "phaser";

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustDown: boolean;
  dashJustDown: boolean;
  meleeJustDown: boolean;
  abilityJustDown: boolean;
  interactJustDown: boolean;
  inventoryJustDown: boolean;
  pauseJustDown: boolean;
}

export class InputBindings {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  public create(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      K: Phaser.Input.Keyboard.KeyCodes.K,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      I: Phaser.Input.Keyboard.KeyCodes.I,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  public read(): InputState {
    const up = this.cursors.up!;
    const left = this.cursors.left!;
    const right = this.cursors.right!;
    const W = this.keys.W!;
    const A = this.keys.A!;
    const D = this.keys.D!;
    const SPACE = this.keys.SPACE!;
    const SHIFT = this.keys.SHIFT!;
    const J = this.keys.J!;
    const K = this.keys.K!;
    const E = this.keys.E!;
    const I = this.keys.I!;
    const ESC = this.keys.ESC!;
    const jump = up.isDown || W.isDown || SPACE.isDown;
    return {
      left: left.isDown || A.isDown,
      right: right.isDown || D.isDown,
      jump,
      jumpJustDown:
        Phaser.Input.Keyboard.JustDown(up) ||
        Phaser.Input.Keyboard.JustDown(W) ||
        Phaser.Input.Keyboard.JustDown(SPACE),
      dashJustDown: Phaser.Input.Keyboard.JustDown(SHIFT),
      meleeJustDown: Phaser.Input.Keyboard.JustDown(J),
      abilityJustDown: Phaser.Input.Keyboard.JustDown(K),
      interactJustDown: Phaser.Input.Keyboard.JustDown(E),
      inventoryJustDown: Phaser.Input.Keyboard.JustDown(I),
      pauseJustDown: Phaser.Input.Keyboard.JustDown(ESC)
    };
  }
}
