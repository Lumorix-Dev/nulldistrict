export type BlockCategory = 'nature' | 'stone' | 'tech' | 'liquid' | 'deco' | 'industrial' | 'mystical' | 'cyberpunk';

export interface BlockDef {
  id: string;
  label: string;
  category: BlockCategory;
  color: number;
  stroke: number;
  solid: boolean;
  emissive?: boolean;
  fluid?: boolean;
}

export const EMPTY_TILE = '';

export const ALL_CATEGORIES: BlockCategory[] = ['nature', 'stone', 'tech', 'liquid', 'deco', 'industrial', 'mystical', 'cyberpunk'];

const BLOCK_DEFS: BlockDef[] = [
  // nature
  { id: 'grass',        label: 'Grass',        category: 'nature', color: 0x3a7d2c, stroke: 0x2d5a1b, solid: true  },
  { id: 'dirt',         label: 'Dirt',         category: 'nature', color: 0x7a4f2e, stroke: 0x5c3a1e, solid: true  },
  { id: 'stone',        label: 'Stone',        category: 'nature', color: 0x7a7a7a, stroke: 0x555555, solid: true  },
  { id: 'wood',         label: 'Wood',         category: 'nature', color: 0x6b3e1a, stroke: 0x4a2a0e, solid: true  },
  { id: 'leaves',       label: 'Leaves',       category: 'nature', color: 0x2d6e1a, stroke: 0x1e4d10, solid: false },

  // stone
  { id: 'slate',        label: 'Slate',        category: 'stone',  color: 0x4a4a5e, stroke: 0x333344, solid: true  },
  { id: 'marble',       label: 'Marble',       category: 'stone',  color: 0xe8e4d8, stroke: 0xbfb9a8, solid: true  },
  { id: 'obsidian',     label: 'Obsidian',     category: 'stone',  color: 0x1a0d2e, stroke: 0x0d0618, solid: true  },
  { id: 'cobblestone',  label: 'Cobblestone',  category: 'stone',  color: 0x5e5e5e, stroke: 0x3d3d3d, solid: true  },
  { id: 'basalt',       label: 'Basalt',       category: 'stone',  color: 0x2e2e38, stroke: 0x1a1a22, solid: true  },

  // tech
  { id: 'steel',        label: 'Steel',        category: 'tech',   color: 0x7a8fa6, stroke: 0x556070, solid: true  },
  { id: 'circuit',      label: 'Circuit',      category: 'tech',   color: 0x1a3d2b, stroke: 0x0d2018, solid: true, emissive: true },
  { id: 'energy-core',  label: 'Energy Core',  category: 'tech',   color: 0x9b00ff, stroke: 0x6600cc, solid: true, emissive: true },
  { id: 'neon-red',     label: 'Neon Red',     category: 'tech',   color: 0xff1a4b, stroke: 0xcc0033, solid: false, emissive: true },
  { id: 'neon-blue',    label: 'Neon Blue',    category: 'tech',   color: 0x00c8ff, stroke: 0x0099cc, solid: false, emissive: true },
  { id: 'null-block',   label: 'Null Block',   category: 'tech',   color: 0x0d0d0d, stroke: 0x330033, solid: true, emissive: true },

  // liquid
  { id: 'water',        label: 'Water',        category: 'liquid', color: 0x1a6ee8, stroke: 0x1255b5, solid: false, fluid: true },
  { id: 'lava',         label: 'Lava',         category: 'liquid', color: 0xff4500, stroke: 0xcc2200, solid: false, fluid: true, emissive: true },
  { id: 'acid',         label: 'Acid',         category: 'liquid', color: 0x39ff14, stroke: 0x25cc00, solid: false, fluid: true, emissive: true },
  { id: 'void-fluid',   label: 'Void Fluid',   category: 'liquid', color: 0x1a001a, stroke: 0x330033, solid: false, fluid: true },

  // deco
  { id: 'glowstone',    label: 'Glowstone',    category: 'deco',   color: 0xffe066, stroke: 0xd4aa00, solid: true, emissive: true },
  { id: 'torch',        label: 'Torch',        category: 'deco',   color: 0xff8c00, stroke: 0xcc5500, solid: false, emissive: true },
  { id: 'chest',        label: 'Chest',        category: 'deco',   color: 0xa0682a, stroke: 0x6b3e10, solid: true  },
  { id: 'ladder',       label: 'Ladder',       category: 'deco',   color: 0x8b6914, stroke: 0x5c430a, solid: false },
  { id: 'vines',        label: 'Vines',        category: 'deco',   color: 0x2e6b1a, stroke: 0x1a4210, solid: false },
  { id: 'crystal',      label: 'Crystal',      category: 'deco',   color: 0x7df9ff, stroke: 0x3ad0e0, solid: true, emissive: true },
  { id: 'rubble',       label: 'Rubble',       category: 'deco',   color: 0x666055, stroke: 0x403c35, solid: true  },

  // industrial
  { id: 'steel-plate',  label: 'Steel',                  category: 'industrial', color: 0x8090a0, stroke: 0x607080, solid: true },
  { id: 'copper',       label: 'Copper',                 category: 'industrial', color: 0xb87333, stroke: 0x8a5520, solid: true },
  { id: 'reactor',      label: 'Reactor Core',           category: 'industrial', color: 0x40e0d0, stroke: 0x20a0a0, solid: true, emissive: true },

  // nature additions
  { id: 'moss',         label: 'Moss',                   category: 'nature',     color: 0x4a7c59, stroke: 0x2e5a38, solid: true },
  { id: 'mushroom',     label: 'Biolumin. Mushroom',     category: 'nature',     color: 0xff6eb4, stroke: 0xcc3a80, solid: false, emissive: true },
  { id: 'ancient-wood', label: 'Ancient Wood',           category: 'nature',     color: 0x5c3d1e, stroke: 0x3a2210, solid: true },

  // mystical
  { id: 'void-crystal', label: 'Void Crystal',           category: 'mystical',   color: 0x4b0082, stroke: 0x2a0050, solid: true, emissive: true },
  { id: 'ether',        label: 'Ether Block',            category: 'mystical',   color: 0xe0e0ff, stroke: 0xa0a0cc, solid: false, emissive: true },

  // cyberpunk
  { id: 'hologram',     label: 'Hologram Panel',         category: 'cyberpunk',  color: 0x00ffff, stroke: 0x00aaaa, solid: false, emissive: true },
  { id: 'neon-sign',    label: 'Neon Sign',              category: 'cyberpunk',  color: 0xff1493, stroke: 0xcc0066, solid: false, emissive: true },
];

export const blockRegistry = new Map<string, BlockDef>(
  BLOCK_DEFS.map(b => [b.id, b])
);

export const blocksByCategory = new Map<BlockCategory, BlockDef[]>(
  ALL_CATEGORIES.map(cat => [cat, BLOCK_DEFS.filter(b => b.category === cat)])
);

export function getBlock(id: string): BlockDef | undefined {
  return blockRegistry.get(id);
}
