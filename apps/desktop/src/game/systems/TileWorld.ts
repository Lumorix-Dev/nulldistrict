export type TileId = string;
export type LayerIndex = 0 | 1 | 2;

export interface TileCell {
  bg: TileId;
  terrain: TileId;
  fg: TileId;
}

export interface WorldMeta {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  createdAt: number;
  authorId?: string;
}

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 100;
const DEFAULT_TILE_SIZE = 32;
const FLOOD_FILL_LIMIT = 5000;
const STORAGE_KEY_PREFIX = 'voidcraft-world-';

function rleEncode(tiles: TileId[]): string {
  if (tiles.length === 0) return '';
  const parts: string[] = [];
  let current = tiles[0]!;
  let count = 1;
  for (let i = 1; i < tiles.length; i++) {
    if (tiles[i] === current) {
      count++;
    } else {
      parts.push(count === 1 ? (current === '' ? '~' : current) : `${count}*${current === '' ? '~' : current}`);
      current = tiles[i]!;
      count = 1;
    }
  }
  parts.push(count === 1 ? (current === '' ? '~' : current) : `${count}*${current === '' ? '~' : current}`);
  return parts.join(',');
}

function rleDecode(encoded: string): TileId[] {
  if (!encoded) return [];
  const parts = encoded.split(',');
  const result: TileId[] = [];
  for (const part of parts) {
    const starIdx = part.indexOf('*');
    if (starIdx === -1) {
      result.push(part === '~' ? '' : part);
    } else {
      const count = parseInt(part.slice(0, starIdx), 10);
      const value = part.slice(starIdx + 1);
      for (let i = 0; i < count; i++) {
        result.push(value === '~' ? '' : value);
      }
    }
  }
  return result;
}

interface SerializedWorld {
  meta: WorldMeta;
  layers: [string, string, string];
}

export class TileWorld {
  readonly meta: WorldMeta;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  private readonly layers: [TileId[], TileId[], TileId[]];

  constructor(meta: Partial<WorldMeta> & { width?: number; height?: number } = {}) {
    const w = meta.width ?? DEFAULT_WIDTH;
    const h = meta.height ?? DEFAULT_HEIGHT;
    const ts = meta.tileSize ?? DEFAULT_TILE_SIZE;
    this.width = w;
    this.height = h;
    this.tileSize = ts;
    this.meta = {
      name: meta.name ?? 'Unnamed World',
      width: w,
      height: h,
      tileSize: ts,
      createdAt: meta.createdAt ?? Date.now(),
      authorId: meta.authorId,
    };
    const size = w * h;
    this.layers = [
      new Array<TileId>(size).fill(''),
      new Array<TileId>(size).fill(''),
      new Array<TileId>(size).fill(''),
    ];
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private idx(x: number, y: number): number {
    return y * this.width + x;
  }

  get(x: number, y: number): TileCell {
    if (!this.inBounds(x, y)) return { bg: '', terrain: '', fg: '' };
    const i = this.idx(x, y);
    return {
      bg: this.layers[0][i]!,
      terrain: this.layers[1][i]!,
      fg: this.layers[2][i]!,
    };
  }

  getTile(x: number, y: number, layer: LayerIndex): TileId {
    if (!this.inBounds(x, y)) return '';
    return this.layers[layer][this.idx(x, y)]!;
  }

  set(x: number, y: number, layer: LayerIndex, id: TileId): boolean {
    if (!this.inBounds(x, y)) return false;
    this.layers[layer][this.idx(x, y)] = id;
    return true;
  }

  fill(x1: number, y1: number, x2: number, y2: number, layer: LayerIndex, id: TileId): void {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.height - 1, Math.max(y1, y2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.layers[layer][this.idx(x, y)] = id;
      }
    }
  }

  floodFill(startX: number, startY: number, layer: LayerIndex, id: TileId): void {
    if (!this.inBounds(startX, startY)) return;
    const target = this.getTile(startX, startY, layer);
    if (target === id) return;

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();
    visited.add(this.idx(startX, startY));
    let count = 0;

    while (queue.length > 0 && count < FLOOD_FILL_LIMIT) {
      const [cx, cy] = queue.shift()!;
      this.layers[layer][this.idx(cx, cy)] = id;
      count++;

      const neighbors: [number, number][] = [
        [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (!this.inBounds(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        if (visited.has(ni)) continue;
        if (this.layers[layer][ni] !== target) continue;
        visited.add(ni);
        queue.push([nx, ny]);
      }
    }
  }

  getTilesInRect(worldX: number, worldY: number, worldW: number, worldH: number): Array<{ x: number; y: number; cell: TileCell }> {
    const ts = this.tileSize;
    const x1 = Math.max(0, Math.floor(worldX / ts));
    const y1 = Math.max(0, Math.floor(worldY / ts));
    const x2 = Math.min(this.width - 1, Math.floor((worldX + worldW) / ts));
    const y2 = Math.min(this.height - 1, Math.floor((worldY + worldH) / ts));

    const result: Array<{ x: number; y: number; cell: TileCell }> = [];
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const cell = this.get(x, y);
        if (cell.bg !== '' || cell.terrain !== '' || cell.fg !== '') {
          result.push({ x, y, cell });
        }
      }
    }
    return result;
  }

  serialize(): string {
    const data: SerializedWorld = {
      meta: this.meta,
      layers: [
        rleEncode(this.layers[0]),
        rleEncode(this.layers[1]),
        rleEncode(this.layers[2]),
      ],
    };
    return JSON.stringify(data);
  }

  static deserialize(data: string): TileWorld {
    const parsed = JSON.parse(data) as SerializedWorld;
    const world = new TileWorld(parsed.meta);
    const decoded: [TileId[], TileId[], TileId[]] = [
      rleDecode(parsed.layers[0]),
      rleDecode(parsed.layers[1]),
      rleDecode(parsed.layers[2]),
    ];
    const size = world.width * world.height;
    for (let layer = 0; layer < 3; layer++) {
      const src = decoded[layer as LayerIndex];
      for (let i = 0; i < size; i++) {
        world.layers[layer as LayerIndex][i] = src[i] ?? '';
      }
    }
    return world;
  }

  static saveToStorage(world: TileWorld, slot = 0): void {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, world.serialize());
  }

  static loadFromStorage(slot = 0): TileWorld | null {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
    if (!raw) return null;
    try {
      return TileWorld.deserialize(raw);
    } catch {
      return null;
    }
  }

  static listStorageSlots(): Array<{ slot: number; meta: WorldMeta }> {
    const results: Array<{ slot: number; meta: WorldMeta }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;
      const slot = parseInt(key.slice(STORAGE_KEY_PREFIX.length), 10);
      if (isNaN(slot)) continue;
      try {
        const raw = localStorage.getItem(key)!;
        const parsed = JSON.parse(raw) as SerializedWorld;
        results.push({ slot, meta: parsed.meta });
      } catch {
        // corrupted slot, skip
      }
    }
    return results.sort((a, b) => a.slot - b.slot);
  }
}
