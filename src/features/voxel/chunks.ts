// ─────────────────────────────────────────────────────────────────────────────
// Chunked, player-centred streaming. The live `world` map only ever holds the
// chunks near the player (so collision/water/mobs/drops keep reading it cheaply
// and the existing renderer stays bounded). Terrain is reproducible from the
// seed; only player edits are saved as a diff.
// ─────────────────────────────────────────────────────────────────────────────
import {
  world, waterLevel, waterSources, keyOf, WATER, type BlockType,
  genColumn, treeAt, plantTree, surfaceHeight, clearColumns,
} from './world'
import { touch } from './controls'

export const CHUNK = 16
export const chunkRadius = () => (touch.supported ? 2 : 3) // mobile vs PC

const loaded = new Set<string>()
// player edits: "x,y,z" -> BlockType, or 0 for "removed (air)"
export const edits = new Map<string, BlockType | 0>()

const ck = (cx: number, cz: number) => `${cx},${cz}`
const chunkOf = (v: number) => Math.floor(v / CHUNK)

function applyEditToWorld(k: string, val: BlockType | 0) {
  if (val === 0) {
    world.delete(k)
    waterLevel.delete(k)
    waterSources.delete(k)
  } else {
    world.set(k, val)
    if (val === WATER) {
      waterLevel.set(k, 0)
      waterSources.add(k)
    } else {
      waterLevel.delete(k)
      waterSources.delete(k)
    }
  }
}

function loadChunk(cx: number, cz: number) {
  const key = ck(cx, cz)
  if (loaded.has(key)) return false
  const bx = cx * CHUNK
  const bz = cz * CHUNK
  for (let dx = 0; dx < CHUNK; dx++)
    for (let dz = 0; dz < CHUNK; dz++) genColumn(bx + dx, bz + dz)
  // trees fully inside the chunk (canopy radius 2)
  for (let dx = 2; dx < CHUNK - 2; dx++)
    for (let dz = 2; dz < CHUNK - 2; dz++) {
      const x = bx + dx
      const z = bz + dz
      if (treeAt(x, z)) plantTree(x, z, surfaceHeight(x, z))
    }
  // overlay player edits within this chunk
  edits.forEach((val, k) => {
    const c = k.split(',')
    if (chunkOf(+c[0]) === cx && chunkOf(+c[2]) === cz) applyEditToWorld(k, val)
  })
  loaded.add(key)
  return true
}

function unloadChunk(cx: number, cz: number) {
  const key = ck(cx, cz)
  if (!loaded.has(key)) return
  const bx = cx * CHUNK
  const bz = cz * CHUNK
  clearColumns(bx, bx + CHUNK - 1, bz, bz + CHUNK - 1)
  loaded.delete(key)
}

// Load/unload chunks around the player. Returns true if the loaded set changed.
export function updateStreaming(px: number, pz: number): boolean {
  const r = chunkRadius()
  const pcx = chunkOf(px)
  const pcz = chunkOf(pz)
  let changed = false

  const want = new Set<string>()
  for (let cx = pcx - r; cx <= pcx + r; cx++)
    for (let cz = pcz - r; cz <= pcz + r; cz++) {
      want.add(ck(cx, cz))
      if (loadChunk(cx, cz)) changed = true
    }
  for (const key of [...loaded]) {
    if (!want.has(key)) {
      const [cx, cz] = key.split(',').map(Number)
      unloadChunk(cx, cz)
      changed = true
    }
  }
  return changed
}

// Record + apply a player edit (val 0 = break to air).
export function applyEdit(x: number, y: number, z: number, val: BlockType | 0) {
  const k = keyOf(x, y, z)
  edits.set(k, val)
  applyEditToWorld(k, val)
}

export function resetChunks() {
  loaded.clear()
  edits.clear()
  world.clear()
  waterLevel.clear()
  waterSources.clear()
}

export const serializeEdits = (): [string, BlockType | 0][] => [...edits.entries()]
export function loadEdits(arr: [string, BlockType | 0][]) {
  edits.clear()
  for (const [k, v] of arr) edits.set(k, v)
}
