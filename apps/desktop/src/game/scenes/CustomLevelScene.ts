import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";

export class CustomLevelScene extends PuzzleScene {
  protected definition!: RoomDefinition;
  protected hints = ["Custom level — no hints available.", "", ""];

  public constructor() {
    super("CustomLevelScene");
  }

  public override create(): void {
    const data = this.scene.settings.data as { definition: RoomDefinition } | undefined;
    if (!data?.definition) {
      this.scene.start("LevelEditorScene");
      return;
    }
    this.definition = data.definition;
    super.create();
  }
}
