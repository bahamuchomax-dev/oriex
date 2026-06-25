// ─────────────────────────────────────────────────────────────────────────────
// Builds a water surface mesh from the WATER cells in the block map.
// Water is a voxel like any other block — we emit ONLY the faces that touch an
// air cell, so water never shows a flat panel cutting through terrain, and
// breaking a block can never leave an orphaned blue plane (it is rebuilt from
// the block data every time).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { world, keyOf, WATER } from './world'

// Water surface sits a little below the top of the cell. We keep ALL water at
// the same height (flat) so adjacent cells never leave a gap between differing
// surface heights — that made flowing water look broken. Flow still spreads
// logically; it just renders as one continuous flat surface per cell layer.
const TOP_BASE = 0.35 // relative to cell centre (cube top is +0.5)
export const topForLevel = (_level: number) => TOP_BASE

// natural pond blue-green (not a pale white glass)
const BASE = new THREE.Color(0.13, 0.4, 0.5)
const C_TOP = BASE.clone().multiplyScalar(1.25) // upper face a touch brighter
const C_SIDE = BASE.clone().multiplyScalar(0.78) // sides a touch darker
const C_BOT = BASE.clone().multiplyScalar(0.6)

export function buildWaterGeometry(
  levelOf: (x: number, y: number, z: number) => number,
): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []

  const isAir = (x: number, y: number, z: number) => !world.has(keyOf(x, y, z))

  // a,b,c,d in order → two triangles (a,b,c) + (a,c,d). DoubleSide material, so
  // winding doesn't matter for visibility.
  const quad = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    color: THREE.Color,
  ) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz)
    for (let i = 0; i < 6; i++) col.push(color.r, color.g, color.b)
  }

  world.forEach((t, k) => {
    if (t !== WATER) return
    const p = k.split(',')
    const x = Number(p[0])
    const y = Number(p[1])
    const z = Number(p[2])

    const top = y + topForLevel(levelOf(x, y, z))
    const yb = y - 0.5
    const x0 = x - 0.5
    const x1 = x + 0.5
    const z0 = z - 0.5
    const z1 = z + 0.5

    if (isAir(x, y + 1, z)) quad(x0, top, z0, x1, top, z0, x1, top, z1, x0, top, z1, C_TOP)
    if (isAir(x, y - 1, z)) quad(x0, yb, z0, x1, yb, z0, x1, yb, z1, x0, yb, z1, C_BOT)
    if (isAir(x + 1, y, z)) quad(x1, yb, z0, x1, top, z0, x1, top, z1, x1, yb, z1, C_SIDE)
    if (isAir(x - 1, y, z)) quad(x0, yb, z0, x0, top, z0, x0, top, z1, x0, yb, z1, C_SIDE)
    if (isAir(x, y, z + 1)) quad(x0, yb, z1, x1, yb, z1, x1, top, z1, x0, top, z1, C_SIDE)
    if (isAir(x, y, z - 1)) quad(x0, yb, z0, x1, yb, z0, x1, top, z0, x0, top, z0, C_SIDE)
  })

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeBoundingSphere()
  return g
}
