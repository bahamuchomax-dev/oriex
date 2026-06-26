import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isSolid, surfaceHeight, PLAYER } from '../world'
import { touch, session } from '../controls'
import { startBGM, stopBGM, playStep } from '../audio'
import { player, resetHp } from '../playerState'

const { HW, BODY, EYE } = PLAYER

// ── feel tuning ──────────────────────────────────────────────────────────────
const WALK = 4.5 // target horizontal speed (m/s)
const ACCEL_GROUND = 45 // brisk but not instant on the ground
const ACCEL_AIR = 12 // limited air control
const GRAVITY = 24
const JUMP = 7.4 // apex ≈ 1.14 → just clears one block
const MAX_FALL = 32
const EPS = 1e-3

// ── mouse-look tuning ──────────────────────────────────────────────────────────
const SENS = 0.0022 // radians per pixel — natural FPS feel
const MAX_MOUSE_DELTA = 100 // ignore absurd movementX/Y spikes (relock/refocus)
const PITCH_LIMIT = (85 * Math.PI) / 180 // clamp so we never flip over

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const approach = (cur: number, target: number, maxStep: number) => {
  const d = target - cur
  if (Math.abs(d) <= maxStep) return target
  return cur + Math.sign(d) * maxStep
}

// Player AABB (feet at x,y,z) overlapping any SOLID block (water excluded)?
function bodyOverlaps(x: number, y: number, z: number): boolean {
  for (let ix = Math.round(x - HW + EPS); ix <= Math.round(x + HW - EPS); ix++)
    for (let iy = Math.round(y + EPS); iy <= Math.round(y + BODY - EPS); iy++)
      for (let iz = Math.round(z - HW + EPS); iz <= Math.round(z + HW - EPS); iz++)
        if (isSolid(ix, iy, iz)) return true
  return false
}

// If supported from below, return the surface Y to rest the feet on; else null.
function groundSupport(x: number, y: number, z: number): number | null {
  const iy = Math.round(y - 0.05)
  for (let ix = Math.round(x - HW + EPS); ix <= Math.round(x + HW - EPS); ix++)
    for (let iz = Math.round(z - HW + EPS); iz <= Math.round(z + HW - EPS); iz++)
      if (isSolid(ix, iy, iz)) return iy + 0.5
  return null
}

export function Player() {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())

  const feet = useRef(new THREE.Vector3(0, surfaceHeight(0, 0) + 2, 0))
  const hvel = useRef({ x: 0, z: 0 }) // horizontal velocity (smoothed)
  const vy = useRef(0) // vertical velocity (gravity + jump only)
  const stepTimer = useRef(0) // footstep cadence
  const bgmOn = useRef(false)

  // mouse-look state kept as plain numbers
  const yaw = useRef(0)
  const pitch = useRef(0)
  const locked = useRef(false)
  const skipMouse = useRef(false) // ignore the first move after a (re)lock

  const fwd = useRef(new THREE.Vector3())
  const rgt = useRef(new THREE.Vector3())
  const wish = useRef(new THREE.Vector3())
  const UP = useRef(new THREE.Vector3(0, 1, 0))

  // ── set up camera + all input listeners ─────────────────────────────────────
  useEffect(() => {
    const dom = gl.domElement
    camera.rotation.order = 'YXZ'
    camera.rotation.set(0, 0, 0)
    const f = feet.current
    camera.position.set(f.x, f.y + EYE, f.z)

    const onClick = () => {
      if (document.pointerLockElement !== dom) dom.requestPointerLock()
    }
    const onLockChange = () => {
      locked.current = document.pointerLockElement === dom
      if (locked.current) skipMouse.current = true // discard the first mousemove
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return // never rotate while unlocked
      if (skipMouse.current) {
        skipMouse.current = false
        return
      }
      const mx = e.movementX
      const my = e.movementY
      // drop spurious huge deltas (focus return / relock glitches)
      if (Math.abs(mx) >= MAX_MOUSE_DELTA || Math.abs(my) >= MAX_MOUSE_DELTA) return
      yaw.current -= mx * SENS
      pitch.current = clamp(pitch.current - my * SENS, -PITCH_LIMIT, PITCH_LIMIT)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
    }
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)

    dom.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      dom.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      stopBGM() // halt music when the game closes (Player unmounts)
    }
  }, [camera, gl])

  useFrame((_, dtRaw) => {
    if (!session.playing) return // stopped on title / pause / menus
    if (!locked.current && !touch.active) return
    const dt = Math.min(dtRaw, 0.05) // clamp big frame gaps to avoid tunneling
    if (!bgmOn.current) {
      bgmOn.current = true
      startBGM() // first frame after a gesture (lock/touch) → audio is allowed
    }
    const f = feet.current
    const h = hvel.current

    // ── touch look (applied as a per-frame delta, then consumed) ──────────────
    if (touch.active && (touch.lookDX !== 0 || touch.lookDY !== 0)) {
      yaw.current -= touch.lookDX * SENS
      pitch.current = clamp(pitch.current - touch.lookDY * SENS, -PITCH_LIMIT, PITCH_LIMIT)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
      touch.lookDX = 0
      touch.lookDY = 0
    }

    // ── desired horizontal direction (camera yaw only) ────────────────────────
    camera.getWorldDirection(fwd.current)
    fwd.current.y = 0
    fwd.current.normalize()
    rgt.current.crossVectors(fwd.current, UP.current)
    wish.current.set(0, 0, 0)
    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) wish.current.add(fwd.current)
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) wish.current.sub(fwd.current)
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) wish.current.add(rgt.current)
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) wish.current.sub(rgt.current)
    if (touch.active) {
      wish.current.addScaledVector(fwd.current, -touch.my)
      wish.current.addScaledVector(rgt.current, touch.mx)
    }
    if (wish.current.lengthSq() > 0) wish.current.normalize()

    // ── smooth acceleration / deceleration (less in the air) ──────────────────
    const grounded0 = groundSupport(f.x, f.y, f.z) !== null && vy.current <= 0.001
    const accel = (grounded0 ? ACCEL_GROUND : ACCEL_AIR) * dt
    h.x = approach(h.x, wish.current.x * WALK, accel)
    h.z = approach(h.z, wish.current.z * WALK, accel)

    // ── horizontal movement — collide and STOP (no auto step-up) ──────────────
    f.x += h.x * dt
    if (bodyOverlaps(f.x, f.y, f.z)) {
      if (h.x > 0) f.x = Math.round(f.x + HW) - 0.5 - HW - EPS
      else if (h.x < 0) f.x = Math.round(f.x - HW) + 0.5 + HW + EPS
      h.x = 0
    }
    f.z += h.z * dt
    if (bodyOverlaps(f.x, f.y, f.z)) {
      if (h.z > 0) f.z = Math.round(f.z + HW) - 0.5 - HW - EPS
      else if (h.z < 0) f.z = Math.round(f.z - HW) + 0.5 + HW + EPS
      h.z = 0
    }

    // ── vertical: jump + gravity only ─────────────────────────────────────────
    const support = groundSupport(f.x, f.y, f.z)
    let grounded = support !== null && vy.current <= 0.001
    const jumpHeld = keys.current.has('Space') || touch.jump

    if (grounded && jumpHeld) {
      vy.current = JUMP
      grounded = false
    }

    if (grounded) {
      // rest exactly on the surface — no per-frame dip, so the camera is steady
      f.y = support as number
      vy.current = 0
    } else {
      vy.current -= GRAVITY * dt
      if (vy.current < -MAX_FALL) vy.current = -MAX_FALL
      f.y += vy.current * dt
      if (bodyOverlaps(f.x, f.y, f.z)) {
        if (vy.current > 0) f.y = Math.round(f.y + BODY) - 0.5 - BODY - EPS // ceiling
        else f.y = Math.round(f.y) + 0.5 + EPS // landed on a block top
        vy.current = 0
      }
    }

    // ── footsteps while walking on the ground ─────────────────────────────────
    const speed = Math.hypot(h.x, h.z)
    const onFloor = groundSupport(f.x, f.y, f.z) !== null && vy.current <= 0.001
    if (onFloor && speed > 1.2) {
      stepTimer.current -= dt
      if (stepTimer.current <= 0) {
        playStep()
        stepTimer.current = 0.34
      }
    } else {
      stepTimer.current = 0 // step promptly when movement resumes
    }

    // ── death → respawn at the centre column with full health ─────────────────
    if (f.y < -20 || player.respawn) {
      f.set(0, surfaceHeight(0, 0) + 2, 0)
      vy.current = 0
      h.x = 0
      h.z = 0
      if (player.respawn) resetHp()
    }

    camera.position.set(f.x, f.y + EYE, f.z)
  })

  return null
}
