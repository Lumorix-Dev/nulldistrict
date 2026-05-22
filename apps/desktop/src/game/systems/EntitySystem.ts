import Phaser from 'phaser';

export type EntityType =
  | 'lever'
  | 'pressure_plate'
  | 'door'
  | 'key'
  | 'code_panel'
  | 'chest'
  | 'moving_block'
  | 'portal'
  | 'text_sign'
  | 'pressure_switch'
  | 'crystal_shard';

export interface EntityDef {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  linkedTo?: string[];
  requiredKey?: string;
  code?: string;
  message?: string;
  items?: string[];
  locked?: boolean;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  targetScene?: string;
  color?: number;
}

export interface EntityInstance {
  def: EntityDef;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  label?: Phaser.GameObjects.Text;
  state: {
    active: boolean;
    locked: boolean;
    collected: boolean;
  };
}

const PRESSURE_PLATE_RADIUS = 28;

const ENTITY_SIZE: Record<EntityType, { w: number; h: number }> = {
  lever:            { w: 20, h: 28 },
  pressure_plate:   { w: 36, h: 10 },
  door:             { w: 24, h: 48 },
  key:              { w: 14, h: 14 },
  code_panel:       { w: 28, h: 32 },
  chest:            { w: 32, h: 24 },
  moving_block:     { w: 32, h: 32 },
  portal:           { w: 32, h: 48 },
  text_sign:        { w: 24, h: 20 },
  pressure_switch:  { w: 28, h: 12 },
  crystal_shard:    { w: 16, h: 20 },
};

function entityColor(def: EntityDef, active: boolean, locked: boolean): number {
  if (def.color !== undefined) return def.color;
  switch (def.type) {
    case 'lever':           return active ? 0xffdd00 : 0x665500;
    case 'pressure_plate':  return active ? 0x66ff66 : 0x3a7a3a;
    case 'door':            return locked  ? 0xcc2200 : 0x22aa44;
    case 'key':             return 0xffd700;
    case 'code_panel':      return 0x00c8ff;
    case 'chest':           return 0xa0682a;
    case 'moving_block':    return 0x7a8fa6;
    case 'portal':          return 0x9b00ff;
    case 'text_sign':       return 0x8b6914;
    case 'pressure_switch': return active ? 0xffaa00 : 0x664400;
    case 'crystal_shard':   return 0x7df9ff;
  }
}

// Types that physically block the player
const SOLID_TYPES: EntityType[] = ['door', 'moving_block'];

export class EntitySystem {
  private readonly scene: Phaser.Scene;
  private readonly instances = new Map<string, EntityInstance>();
  private physicsGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.physicsGroup = scene.physics.add.staticGroup();
  }

  spawn(defs: EntityDef[]): void {
    for (const def of defs) {
      const size = ENTITY_SIZE[def.type];
      const w = def.width ?? size.w;
      const h = def.height ?? size.h;
      const locked = def.locked ?? false;
      const color = entityColor(def, false, locked);

      const sprite = this.scene.add.rectangle(def.x, def.y, w, h, color) as Phaser.GameObjects.Rectangle;
      sprite.setStrokeStyle(1, 0x000000, 0.5);

      // Only solid types (doors, moving_blocks) get physics collision
      if (SOLID_TYPES.includes(def.type)) {
        this.physicsGroup.add(sprite);
      }

      let labelObj: Phaser.GameObjects.Text | undefined;
      if (def.label) {
        labelObj = this.scene.add.text(def.x, def.y - h / 2 - 10, def.label, {
          fontSize: '10px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5, 1);
      }

      const instance: EntityInstance = {
        def,
        sprite,
        label: labelObj,
        state: { active: false, locked, collected: false },
      };
      this.instances.set(def.id, instance);
    }
  }

  getPhysicsGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.physicsGroup;
  }

  update(playerX: number, playerY: number): string[] {
    const activated: string[] = [];
    for (const [id, inst] of this.instances) {
      if (inst.state.collected) continue;
      if (inst.def.type !== 'pressure_plate' && inst.def.type !== 'pressure_switch') continue;
      if (inst.def.type === 'pressure_switch' && inst.state.active) continue;

      const dx = playerX - inst.def.x;
      const dy = playerY - inst.def.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wasActive = inst.state.active;

      if (inst.def.type === 'pressure_plate') {
        inst.state.active = dist <= PRESSURE_PLATE_RADIUS;
        if (inst.state.active !== wasActive) {
          this.refreshSprite(inst);
          if (inst.state.active) activated.push(id);
        }
      } else if (inst.def.type === 'pressure_switch' && dist <= PRESSURE_PLATE_RADIUS) {
        inst.state.active = true;
        this.refreshSprite(inst);
        activated.push(id);
      }
    }
    return activated;
  }

  activate(id: string): void {
    const inst = this.instances.get(id);
    if (!inst || inst.state.collected) return;
    if (inst.def.type === 'lever') {
      inst.state.active = !inst.state.active;
      this.refreshSprite(inst);
    } else if (inst.def.type === 'pressure_switch' && !inst.state.active) {
      inst.state.active = true;
      this.refreshSprite(inst);
    }
  }

  collect(id: string): EntityDef | null {
    const inst = this.instances.get(id);
    if (!inst || inst.state.collected) return null;
    const collectible: EntityType[] = ['key', 'crystal_shard', 'chest'];
    if (!collectible.includes(inst.def.type)) return null;
    inst.state.collected = true;
    inst.sprite.setVisible(false);
    inst.label?.setVisible(false);
    return inst.def;
  }

  unlock(doorId: string): void {
    const inst = this.instances.get(doorId);
    if (!inst || inst.def.type !== 'door') return;
    inst.state.locked = false;
    this.refreshSprite(inst);
    // Remove door from physics group so player can walk through it
    this.physicsGroup.remove(inst.sprite, false, false);
    this.physicsGroup.refresh();
  }

  getEntityAt(worldX: number, worldY: number, radius = 32): EntityInstance | null {
    let closest: EntityInstance | null = null;
    let closestDist = Infinity;
    for (const inst of this.instances.values()) {
      if (inst.state.collected) continue;
      const dx = worldX - inst.def.x;
      const dy = worldY - inst.def.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist < closestDist) {
        closestDist = dist;
        closest = inst;
      }
    }
    return closest;
  }

  getEntity(id: string): EntityInstance | undefined {
    return this.instances.get(id);
  }

  isActive(id: string): boolean {
    return this.instances.get(id)?.state.active ?? false;
  }

  isLocked(id: string): boolean {
    return this.instances.get(id)?.state.locked ?? false;
  }

  isCollected(id: string): boolean {
    return this.instances.get(id)?.state.collected ?? false;
  }

  destroy(): void {
    for (const inst of this.instances.values()) {
      inst.sprite.destroy();
      inst.label?.destroy();
    }
    this.instances.clear();
    this.physicsGroup.destroy(true);
  }

  private refreshSprite(inst: EntityInstance): void {
    if (inst.sprite instanceof Phaser.GameObjects.Rectangle) {
      inst.sprite.setFillStyle(entityColor(inst.def, inst.state.active, inst.state.locked));
    }
  }
}
