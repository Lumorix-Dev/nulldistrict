import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { HubScene } from "./scenes/HubScene";
import { DistrictEntranceScene } from "./scenes/DistrictEntranceScene";
import { UndergroundSectorAScene } from "./scenes/UndergroundSectorAScene";
import { MirrorArchiveScene } from "./scenes/MirrorArchiveScene";
import { BlackoutTheaterScene } from "./scenes/BlackoutTheaterScene";
import { PvPZoneScene } from "./scenes/PvPZoneScene";
import { UIScene } from "./scenes/UIScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { GAME_CONTEXT_KEY, type GameContext } from "./GameContext";
// VoidCraft
import { VoidCraftMenuScene } from "./scenes/VoidCraftMenuScene";
import { PuzzleSelectScene } from "./scenes/PuzzleSelectScene";
import { WorldGenScene } from "./scenes/WorldGenScene";
import { CreativeScene } from "./scenes/CreativeScene";
import { CreativeHUDScene } from "./scenes/CreativeHUDScene";
import { EscapeRoom1Scene } from "./scenes/EscapeRoom1Scene";
import { EscapeRoom2Scene } from "./scenes/EscapeRoom2Scene";
import { EscapeRoom3Scene } from "./scenes/EscapeRoom3Scene";
import { EscapeRoom4Scene } from "./scenes/EscapeRoom4Scene";
import { EscapeRoom5Scene } from "./scenes/EscapeRoom5Scene";
import { EscapeRoom6Scene } from "./scenes/EscapeRoom6Scene";
import { PauseMenuScene } from "./scenes/PauseMenuScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { LevelTransitionScene } from "./scenes/LevelTransitionScene";
import { CoopHUDScene } from "./scenes/CoopHUDScene";
import { AchievementGalleryScene } from "./scenes/AchievementGalleryScene";
import { LevelEditorScene } from "./scenes/LevelEditorScene";
import { CustomLevelScene } from "./scenes/CustomLevelScene";
import { StatsScene } from "./scenes/StatsScene";
import { SaveSelectScene } from "./scenes/SaveSelectScene";
import { TutorialScene } from "./scenes/TutorialScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";
import { CreditsScene } from "./scenes/CreditsScene";

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
      MirrorArchiveScene,
      BlackoutTheaterScene,
      PvPZoneScene,
      UIScene,
      DialogueScene,
      // VoidCraft
      VoidCraftMenuScene,
      PuzzleSelectScene,
      WorldGenScene,
      CreativeScene,
      CreativeHUDScene,
      EscapeRoom1Scene,
      EscapeRoom2Scene,
      EscapeRoom3Scene,
      EscapeRoom4Scene,
      EscapeRoom5Scene,
      EscapeRoom6Scene,
      PauseMenuScene,
      SettingsScene,
      LevelTransitionScene,
      CoopHUDScene,
      AchievementGalleryScene,
      LevelEditorScene,
      CustomLevelScene,
      StatsScene,
      SaveSelectScene,
      TutorialScene,
      LeaderboardScene,
      CreditsScene,
    ]
  });
  game.registry.set(GAME_CONTEXT_KEY, context);
  return game;
}
