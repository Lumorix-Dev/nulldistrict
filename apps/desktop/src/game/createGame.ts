import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { HubScene } from "./scenes/HubScene";
import { DistrictEntranceScene } from "./scenes/DistrictEntranceScene";
import { UndergroundSectorAScene } from "./scenes/UndergroundSectorAScene";
import { PvPZoneScene } from "./scenes/PvPZoneScene";
import { UIScene } from "./scenes/UIScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { GAME_CONTEXT_KEY, type GameContext } from "./GameContext";

export function createNullDistrictGame(parent: HTMLElement, context: GameContext) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#05070b",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 980, x: 0 },
        debug: false
      }
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      HubScene,
      DistrictEntranceScene,
      UndergroundSectorAScene,
      PvPZoneScene,
      UIScene,
      DialogueScene
    ]
  });
  game.registry.set(GAME_CONTEXT_KEY, context);
  return game;
}
