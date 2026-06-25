// ─────────────────────────────────────────────────────────────────────────────
// Dropped item entities. Spawned when a block breaks; they bounce, fall, settle
// on the ground (rotating + bobbing), get attracted to a nearby player, and are
// collected into the inventory. Persisted (position + id + count) to localStorage.
// ─────────────────────────────────────────────────────────────────────────────
import { keyOf, isSolid, world, WATER } from './world'
import type { ItemId } from './itemDefs'

export interface Drop {
  id: ItemId
  count: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
  settled: boolean
}

export const drops: Drop[] = []

const MAX = 64
const G = 18
const MAX_FALL = 22
const PICK_START = 1.6 // start attracting within this distance
const PICK_GET = 0.5 // collect within this distance
const LIFETIME = 300 // seconds before despawn
const MERGE = 0.9 // merge same-id drops within this distance

export function spawnDrop(id: ItemId, count: number, x: number, y: number, z: number) {
  for (const d of drops) {
    if (d.id === id && Math.abs(d.x - x) < MERGE && Math.abs(d.y - y) < 1.3 && Math.abs(d.z - z) < MERGE) {
      d.count += count
      return
    }
  }
  if (drops.length >= MAX) drops.shift()
  drops.push({
    id,
    count,
    x: x + (Math.random() - 0.5) * 0.2,
    y: y + 0.2,
    z: z + (Math.random() - 0.5) * 0.2,
    vx: (Math.random() - 0.5) * 2,
    vy: 4 + Math.random() * 1.5,
    vz: (Math.random() - 0.5) * 2,
    age: 0,
    settled: false,
  })
}

// Advance physics + attraction. Returns items collected this frame.
export function updateDrops(dt: number, px: number, py: number, pz: number): { id: ItemId; count: number }[] {
  const got: { id: ItemId; count: number }[] = []
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.age += dt
    if (d.age > LIFETIME) {
      drops.splice(i, 1)
      continue
    }

    // attraction / collection (aim at roughly the player's chest)
    const dx = px - d.x
    const dy = py - 0.7 - d.y
    const dz = pz - d.z
    const dist = Math.hypot(dx, dy, dz)
    if (dist < PICK_GET) {
      got.push({ id: d.id, count: d.count })
      drops.splice(i, 1)
      continue
    }
    if (dist < PICK_START) {
      const s = (7 * dt) / Math.max(dist, 0.0001)
      d.x += dx * s
      d.y += dy * s
      d.z += dz * s
      d.settled = false
      continue
    }

    // gravity (slower in water)
    const inWater = world.get(keyOf(Math.round(d.x), Math.round(d.y), Math.round(d.z))) === WATER
    d.vy -= G * dt * (inWater ? 0.3 : 1)
    if (d.vy < -MAX_FALL) d.vy = -MAX_FALL
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.z += d.vz * dt
    d.vx *= 0.86
    d.vz *= 0.86

    const below = Math.round(d.y - 0.4)
    if (d.vy <= 0 && isSolid(Math.round(d.x), below, Math.round(d.z))) {
      const restY = below + 0.5 + 0.22
      if (d.y <= restY) {
        d.y = restY
        d.vy = 0
        d.vx = 0
        d.vz = 0
        d.settled = true
      }
    } else {
      d.settled = false
    }
    if (d.y < -30) drops.splice(i, 1)
  }
  return got
}

export function serializeDrops(): [ItemId, number, number, number, number][] {
  return drops.map((d) => [d.id, d.count, +d.x.toFixed(2), +d.y.toFixed(2), +d.z.toFixed(2)])
}
export function loadDrops(arr: [ItemId, number, number, number, number][]) {
  drops.length = 0
  for (const [id, count, x, y, z] of arr) {
    drops.push({ id, count, x, y, z, vx: 0, vy: 0, vz: 0, age: 0, settled: true })
  }
}
