// ─────────────────────────────────────────────────────────────────────────────
// Shared voxel world. The `world` Map is the SINGLE SOURCE OF TRUTH: every
// visual (block cubes, water surfaces, grass tufts) is derived from it, so
// nothing can be left orphaned after an edit. Imported by VoxelWorld
// (rendering/editing) and Player (collision).
// ─────────────────────────────────────────────────────────────────────────────

// ── Block types ──────────────────────────────────────────────────────────────
export const GRASS = 1
export const DIRT = 2
export const STONE = 3
export const WOOD = 4
export const LEAF = 5
export const WATER = 6 // grid-managed, non-solid (not directly placeable from hotbar)
export const SAND = 7
export const PLANKS = 8
export const BRICK = 9
export const GLASS = 10 // solid but rendered transparent
export const WORKBENCH = 11
export type BlockType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

// Solid cube types rendered as instanced boxes (WATER is rendered separately)
export const TYPES: BlockType[] = [
  GRASS, DIRT, STONE, WOOD, LEAF, SAND, PLANKS, BRICK, GLASS, WORKBENCH,
]

export const BLOCK_LABELS: Record<number, string> = {
  [GRASS]: '草',
  [DIRT]: '土',
  [STONE]: '石',
  [WOOD]: '木',
  [LEAF]: '葉',
  [SAND]: '砂',
  [PLANKS]: '板材',
  [BRICK]: 'レンガ',
  [GLASS]: 'ガラス',
  [WORKBENCH]: '作業台',
}

// ── Decorations: small no-collision placeables on top of blocks ───────────────
export type DecorKind = 'torch' | 'ladder' | 'flower' | 'pebble'
export const decorations = new Map<string, DecorKind>() // key -> kind

// ── World bounds ──────────────────────────────────────────────────────────────
export const HALF = 12 // world spans -HALF..HALF on X and Z (25x25 columns)
export const MIN_Y = -3 // solid stone floor depth
export const BLOCK_RENDER = 1.0 // full cubes — no gaps, so no grid-line look

// Direction of the sun (used by the light, the sky sun-sprite, and shading)
export const SUN_POSITION: [number, number, number] = [55, 80, 35]

// Player metrics shared by Player (collision) and VoxelWorld (placement guard)
export const PLAYER = { HW: 0.3, BODY: 1.7, EYE: 1.5 }

// ── The live world: "x,y,z" -> BlockType ──────────────────────────────────────
export const world = new Map<string, BlockType>()
// Per-water-cell flow distance from a source: 0 = source, 1..N = flowing water.
export const waterLevel = new Map<string, number>()
// Source cells never dry up; flowing water recedes when its source is gone.
export const waterSources = new Set<string>()
export const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`
export const blockAt = (x: number, y: number, z: number) => world.get(keyOf(x, y, z))
export const waterLevelAt = (x: number, y: number, z: number) =>
  waterLevel.get(keyOf(x, y, z)) ?? 0
// Water is NOT solid — only true blocks collide.
export const isSolid = (x: number, y: number, z: number) => {
  const b = world.get(keyOf(x, y, z))
  return b !== undefined && b !== WATER
}

// Drop decorations that lost their support or got covered by a block.
export function pruneDecorations() {
  for (const k of [...decorations.keys()]) {
    const [x, y, z] = k.split(',').map(Number)
    if (isSolid(x, y, z) || !isSolid(x, y - 1, z)) decorations.delete(k)
  }
}

// ── (De)serialization for localStorage save/load ─────────────────────────────
export interface WorldSave {
  world: [string, BlockType][]
  waterLevel: [string, number][]
  waterSources: string[]
  decor: [string, DecorKind][]
}
export function serializeWorld(): WorldSave {
  return {
    world: [...world.entries()],
    waterLevel: [...waterLevel.entries()],
    waterSources: [...waterSources],
    decor: [...decorations.entries()],
  }
}
export function loadWorld(s: WorldSave) {
  world.clear()
  waterLevel.clear()
  waterSources.clear()
  decorations.clear()
  for (const [k, v] of s.world) world.set(k, v)
  for (const [k, v] of s.waterLevel) waterLevel.set(k, v)
  for (const k of s.waterSources) waterSources.add(k)
  for (const [k, v] of s.decor) decorations.set(k, v)
}

// ── Deterministic value noise (hash based — no Math.random, fully reproducible) ─
function hash(x: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function smoothNoise(x: number, z: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = x - xi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = zf * zf * (3 - 2 * zf)
  const a = hash(xi, zi)
  const b = hash(xi + 1, zi)
  const c = hash(xi, zi + 1)
  const d = hash(xi + 1, zi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

// Does a column get a small grass tuft? (deterministic, per x/z column)
export const tuftAt = (x: number, z: number) => hash(x * 5 + 3, z * 5 + 9) > 0.86

// Surface height for a column — broad, gentle, walkable hills (no jagged spikes)
export function surfaceHeight(x: number, z: number): number {
  const n =
    smoothNoise(x * 0.08, z * 0.08) * 1.0 + // broad rolling hills
    smoothNoise(x * 0.19, z * 0.19) * 0.4 // gentle smaller bumps
  return Math.round(n * 3.0) // ~0..4, mostly 1-step neighbours
}

const isPond = (x: number, z: number, h: number) =>
  h <= 1 && smoothNoise(x * 0.16 + 50, z * 0.16 + 50) > 0.6
const isRock = (x: number, z: number, h: number) =>
  h >= 3 && smoothNoise(x * 0.22 + 90, z * 0.22 + 90) > 0.66

const set = (x: number, y: number, z: number, t: BlockType) => world.set(keyOf(x, y, z), t)

function plantTree(x: number, z: number, groundY: number) {
  const r = hash(x * 13 + 1, z * 13 + 7)
  const trunk = 3 + (r > 0.66 ? 2 : r > 0.33 ? 1 : 0) // 3..5 tall, varied
  const topY = groundY + trunk
  for (let y = groundY + 1; y <= topY; y++) set(x, y, z, WOOD)

  const leaf = (px: number, py: number, pz: number) => {
    if (px < -HALF || px > HALF || pz < -HALF || pz > HALF) return
    if (!world.has(keyOf(px, py, pz))) set(px, py, pz, LEAF)
  }
  // roughly spherical canopy around the trunk top
  const rad = 2
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -rad; dx <= rad; dx++)
      for (let dz = -rad; dz <= rad; dz++) {
        const dist = Math.hypot(dx, dy * 1.15, dz)
        if (dist > rad + 0.45) continue
        if (dist > rad - 0.3 && hash(x * 7 + dx * 31 + dy * 53, z * 7 + dz * 17) > 0.55) continue
        leaf(x + dx, topY + dy, z + dz)
      }
}

export function generateWorld() {
  if (world.size > 0) return // guard against double generation (HMR / re-import)

  for (let x = -HALF; x <= HALF; x++) {
    for (let z = -HALF; z <= HALF; z++) {
      const h = surfaceHeight(x, z)

      if (isPond(x, z, h)) {
        // carved basin: dirt bed one below, a WATER block sits in the hollow
        const bed = h - 1
        set(x, bed, z, DIRT)
        for (let y = bed - 1; y >= MIN_Y; y--) set(x, y, z, STONE)
        set(x, h, z, WATER)
        waterLevel.set(keyOf(x, h, z), 0) // pond water is a source
        waterSources.add(keyOf(x, h, z))
        continue
      }

      const rock = isRock(x, z, h)
      const topType: BlockType = rock ? STONE : GRASS
      set(x, h, z, topType)
      const sub: BlockType = rock ? STONE : DIRT
      if (h - 1 >= MIN_Y) set(x, h - 1, z, sub)
      if (!rock && h - 2 >= MIN_Y) set(x, h - 2, z, DIRT)
      for (let y = h - 3; y >= MIN_Y; y--) set(x, y, z, STONE)
    }
  }

  // Trees — deterministic, kept away from the border so canopies fit
  for (let x = -HALF + 2; x <= HALF - 2; x++)
    for (let z = -HALF + 2; z <= HALF - 2; z++) {
      const h = surfaceHeight(x, z)
      if (isPond(x, z, h) || isRock(x, z, h)) continue
      if (hash(x * 91 + 17, z * 53 + 29) > 0.984) plantTree(x, z, h)
    }
}

generateWorld()
