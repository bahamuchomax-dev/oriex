// ─────────────────────────────────────────────────────────────────────────────
// Lightweight cellular water flow. The block map is the source of truth; this
// only adds/removes WATER cells and tracks a per-cell flow level. Updates are
// queue-based around changed cells (never a full-world sweep) and capped per
// frame, so it stays cheap.
//
// Rules:
//  • water falls straight down into air
//  • if it can't fall, it spreads to the 4 horizontal air neighbours
//  • flow level: source = 0, each spread step +1, up to MAX (then it dries)
//  • sources never dry; flowing water recedes once its source is gone
//  • breaking a block lets neighbouring water flow into the gap
//  • placing a block removes water there and re-flows the neighbourhood
// ─────────────────────────────────────────────────────────────────────────────
import { world, waterLevel, waterSources, keyOf, WATER, HALF, MIN_Y } from './world'

const MAX = 6 // max spread distance before water thins out and dries
const Y_CAP = 48
const HORIZ: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const inBounds = (x: number, y: number, z: number) =>
  x >= -HALF && x <= HALF && z >= -HALF && z <= HALF && y >= MIN_Y && y <= Y_CAP

const isWater = (x: number, y: number, z: number) => world.get(keyOf(x, y, z)) === WATER
const isAir = (x: number, y: number, z: number) => !world.has(keyOf(x, y, z))
const isSolidCell = (x: number, y: number, z: number) => {
  const b = world.get(keyOf(x, y, z))
  return b !== undefined && b !== WATER
}
const lvl = (x: number, y: number, z: number) => waterLevel.get(keyOf(x, y, z)) ?? MAX

const queue: [number, number, number][] = []
const pending = new Set<string>()

export function enqueue(x: number, y: number, z: number) {
  if (!inBounds(x, y, z)) return
  const k = keyOf(x, y, z)
  if (pending.has(k)) return
  pending.add(k)
  queue.push([x, y, z])
}

export function enqueueAround(x: number, y: number, z: number) {
  enqueue(x, y, z)
  enqueue(x + 1, y, z)
  enqueue(x - 1, y, z)
  enqueue(x, y + 1, z)
  enqueue(x, y - 1, z)
  enqueue(x, y, z + 1)
  enqueue(x, y, z - 1)
}

// What level should this (non-solid) cell hold? MAX means "should be dry".
function supportedLevel(x: number, y: number, z: number): number {
  if (waterSources.has(keyOf(x, y, z))) return 0
  let best = MAX
  if (isWater(x, y + 1, z)) best = 1 // fed from above (falling water)
  for (const [dx, dz] of HORIZ) {
    if (isWater(x + dx, y, z + dz)) {
      const nl = lvl(x + dx, y, z + dz)
      const blockedBelow = !isAir(x + dx, y - 1, z + dz)
      if (nl < MAX && blockedBelow) best = Math.min(best, nl + 1)
    }
  }
  return best
}

// Process up to `budget` queued cells. Returns true if any water cell changed.
export function stepWater(budget = 256): boolean {
  let changed = false
  let n = 0
  while (queue.length && n < budget) {
    const cell = queue.shift()!
    const [x, y, z] = cell
    pending.delete(keyOf(x, y, z))
    n++
    if (isSolidCell(x, y, z)) continue

    const k = keyOf(x, y, z)
    const cur = isWater(x, y, z)
    const want = supportedLevel(x, y, z)

    if (want < MAX) {
      if (!cur) {
        world.set(k, WATER)
        waterLevel.set(k, want)
        changed = true
        enqueueAround(x, y, z)
      } else if (!waterSources.has(k) && lvl(x, y, z) !== want) {
        waterLevel.set(k, want)
        changed = true
        enqueueAround(x, y, z)
      }
      // propagate: fall if possible, otherwise spread sideways
      if (isAir(x, y - 1, z)) enqueue(x, y - 1, z)
      else for (const [dx, dz] of HORIZ) if (isAir(x + dx, y, z + dz)) enqueue(x + dx, y, z + dz)
    } else if (cur && !waterSources.has(k)) {
      world.delete(k)
      waterLevel.delete(k)
      changed = true
      enqueueAround(x, y, z)
    }
  }
  return changed
}
