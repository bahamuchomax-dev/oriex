// ─────────────────────────────────────────────────────────────────────────────
// Mob manager: a hostile slime and a friendly critter, plus a tiny particle
// pool for hits/deaths. Pure logic; Mobs.tsx renders and drives it.
// ─────────────────────────────────────────────────────────────────────────────
import { isSolid, HALF, MIN_Y } from './world'
import { config, DIFFICULTY_SCALE } from './config'

export type MobType = 'slime' | 'critter'
export interface Mob {
  type: MobType
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  hp: number; maxHp: number
  cd: number
  age: number
  wx: number; wz: number
}
export interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number; max: number
  r: number; g: number; b: number
}

export const mobs: Mob[] = []
export const particles: Particle[] = []

const MAX_ENEMY = 10
const MAX_FRIEND = 12
const G = 20
const MAXFALL = 24
const SLIME_H = 0.4
const CRITTER_H = 0.3

export const mobHooks: {
  onHurtPlayer?: (dmg: number) => void
  onHit?: (m: Mob) => void
  onDeath?: (m: Mob) => void
} = {}

export function clearMobs() {
  mobs.length = 0
  particles.length = 0
}

function groundTop(x: number, z: number, fromY: number): number | null {
  const ix = Math.round(x)
  const iz = Math.round(z)
  for (let y = Math.round(fromY) + 2; y >= MIN_Y; y--) if (isSolid(ix, y, iz)) return y + 0.5
  return null
}
const inBounds = (x: number, z: number) => x >= -HALF && x <= HALF && z >= -HALF && z <= HALF
const enemyCount = () => mobs.reduce((n, m) => n + (m.type === 'slime' ? 1 : 0), 0)
const friendCount = () => mobs.reduce((n, m) => n + (m.type === 'critter' ? 1 : 0), 0)

export function spawnEnemy(px: number, pz: number) {
  const sc = DIFFICULTY_SCALE[config.difficulty]
  if (enemyCount() >= Math.round(MAX_ENEMY * sc.enemies)) return
  const ang = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 15
  const x = Math.round(px + Math.cos(ang) * dist)
  const z = Math.round(pz + Math.sin(ang) * dist)
  if (!inBounds(x, z)) return
  const g = groundTop(x, z, 16)
  if (g == null) return
  const hp = 6 * sc.enemyHp
  mobs.push({ type: 'slime', x, y: g + SLIME_H, z, vx: 0, vy: 0, vz: 0, hp, maxHp: hp, cd: 0, age: 0, wx: 0, wz: 0 })
}

export function spawnFriend(px: number, pz: number) {
  if (friendCount() >= MAX_FRIEND) return
  const ang = Math.random() * Math.PI * 2
  const dist = 8 + Math.random() * 8
  const x = Math.round(px + Math.cos(ang) * dist)
  const z = Math.round(pz + Math.sin(ang) * dist)
  if (!inBounds(x, z)) return
  const g = groundTop(x, z, 16)
  if (g == null) return
  mobs.push({ type: 'critter', x, y: g + CRITTER_H, z, vx: 0, vy: 0, vz: 0, hp: 3, maxHp: 3, cd: 0, age: 0, wx: Math.random() * 2 - 1, wz: Math.random() * 2 - 1 })
}

function puff(x: number, y: number, z: number, r: number, g: number, b: number, count: number) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 3,
      life: 0.6, max: 0.6,
      r, g, b,
    })
  }
}

export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) { particles.splice(i, 1); continue }
    p.vy -= 12 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
  }
}

export function updateMobs(dt: number, px: number, py: number, pz: number) {
  const sc = DIFFICULTY_SCALE[config.difficulty]
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i]
    m.age += dt
    m.cd -= dt
    const dx = px - m.x
    const dz = pz - m.z
    const distH = Math.hypot(dx, dz)
    if (distH > 45) { mobs.splice(i, 1); continue }

    if (m.type === 'slime') {
      const onGround = isSolid(Math.round(m.x), Math.round(m.y - SLIME_H - 0.1), Math.round(m.z))
      if (onGround && m.cd <= 0) {
        m.vy = 5.2
        const s = 2.4
        if (distH > 0.1) { m.vx = (dx / distH) * s; m.vz = (dz / distH) * s }
        m.cd = 0.9
      }
      m.vy -= G * dt
      if (m.vy < -MAXFALL) m.vy = -MAXFALL
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.z += m.vz * dt
      m.vx *= 0.9
      m.vz *= 0.9
      const g = groundTop(m.x, m.z, m.y + 1)
      if (g != null && m.vy <= 0 && m.y <= g + SLIME_H) { m.y = g + SLIME_H; m.vy = 0 }
      if (distH < 1.2 && Math.abs(py - m.y) < 1.8 && m.cd <= 0) {
        mobHooks.onHurtPlayer?.(Math.max(1, Math.round(2 * sc.enemyDmg)))
        m.cd = 1.0
      }
    } else {
      if (m.cd <= 0) { m.wx = Math.random() * 2 - 1; m.wz = Math.random() * 2 - 1; m.cd = 1.5 + Math.random() }
      let mvx = m.wx
      let mvz = m.wz
      if (distH < 4 && distH > 0.1) { mvx = -dx / distH; mvz = -dz / distH } // flee
      m.vy -= G * dt
      if (m.vy < -MAXFALL) m.vy = -MAXFALL
      m.x += mvx * 1.8 * dt
      m.y += m.vy * dt
      m.z += mvz * 1.8 * dt
      const g = groundTop(m.x, m.z, m.y + 1)
      if (g != null && m.vy <= 0 && m.y <= g + CRITTER_H) { m.y = g + CRITTER_H; m.vy = 0 }
      if (!inBounds(m.x, m.z)) { m.x = Math.max(-HALF, Math.min(HALF, m.x)); m.z = Math.max(-HALF, Math.min(HALF, m.z)) }
    }
    if (m.y < MIN_Y - 5) mobs.splice(i, 1)
  }
}

// Player melee: damage the nearest hostile in front. Returns true if it hit one.
export function attackFromCamera(
  cx: number, cy: number, cz: number,
  fx: number, fy: number, fz: number,
  dmg: number,
): boolean {
  let best = -1
  let bestD = 3.4
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i]
    if (m.type !== 'slime') continue
    const dx = m.x - cx
    const dy = m.y - cy
    const dz = m.z - cz
    const d = Math.hypot(dx, dy, dz)
    if (d > bestD) continue
    if ((dx * fx + dy * fy + dz * fz) / (d || 1) < 0.5) continue // must be in front
    bestD = d
    best = i
  }
  if (best < 0) return false
  const m = mobs[best]
  m.hp -= dmg
  const dx = m.x - cx
  const dz = m.z - cz
  const dl = Math.hypot(dx, dz) || 1
  m.vx += (dx / dl) * 4
  m.vz += (dz / dl) * 4
  m.vy += 3
  if (m.hp <= 0) {
    puff(m.x, m.y, m.z, 0.45, 0.8, 0.35, 8)
    mobHooks.onDeath?.(m)
    mobs.splice(best, 1)
  } else {
    puff(m.x, m.y, m.z, 0.5, 0.85, 0.4, 3)
    mobHooks.onHit?.(m)
  }
  return true
}
