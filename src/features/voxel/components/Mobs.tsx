import { useMemo, useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  mobs, particles, updateMobs, updateParticles, spawnEnemy, spawnFriend, mobHooks,
} from '../mobs'
import { advanceTime, sunLevel, isNight } from '../time'
import { hurtPlayer } from '../playerState'
import { spawnDrop } from '../drops'
import { playHurt, playEnemyHit, playEnemyDie, playChirp } from '../audio'
import { session } from '../controls'
import { PLAYER } from '../world'

const MAX_SLIME = 16
const MAX_CRIT = 14
const MAX_PART = 90
const DAY_BG = new THREE.Color('#cfe6ff')
const NIGHT_BG = new THREE.Color('#0b1430')

export function Mobs() {
  const { camera, scene } = useThree()
  // slime parts
  const slimeBody = useRef<THREE.InstancedMesh | null>(null)
  const slimeEye = useRef<THREE.InstancedMesh | null>(null)
  // critter parts
  const critBody = useRef<THREE.InstancedMesh | null>(null)
  const critHead = useRef<THREE.InstancedMesh | null>(null)
  const critEar = useRef<THREE.InstancedMesh | null>(null)
  const critEye = useRef<THREE.InstancedMesh | null>(null)
  const critTail = useRef<THREE.InstancedMesh | null>(null)
  const critLeg = useRef<THREE.InstancedMesh | null>(null)
  const partRef = useRef<THREE.InstancedMesh | null>(null)

  const lights = useRef<{ dir: THREE.DirectionalLight | null; hemi: THREE.HemisphereLight | null }>({ dir: null, hemi: null })
  const spawnT = useRef(2)
  const chirpT = useRef(0)

  const geo = useMemo(
    () => ({
      slimeBody: new THREE.BoxGeometry(0.72, 0.72, 0.72),
      slimeEye: new THREE.BoxGeometry(0.12, 0.15, 0.06),
      critBody: new THREE.BoxGeometry(0.42, 0.32, 0.54),
      critHead: new THREE.BoxGeometry(0.3, 0.3, 0.3),
      critEar: new THREE.BoxGeometry(0.08, 0.18, 0.06),
      critEye: new THREE.BoxGeometry(0.06, 0.07, 0.05),
      critTail: new THREE.BoxGeometry(0.14, 0.14, 0.12),
      critLeg: new THREE.BoxGeometry(0.09, 0.14, 0.09),
      part: new THREE.BoxGeometry(0.13, 0.13, 0.13),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      slime: new THREE.MeshLambertMaterial({ color: '#5fbf4a', transparent: true, opacity: 0.85 }),
      eye: new THREE.MeshLambertMaterial({ color: '#1b1b1b' }),
      crit: new THREE.MeshLambertMaterial({ color: '#cbb083' }),
      tail: new THREE.MeshLambertMaterial({ color: '#f1ead6' }),
      part: new THREE.MeshBasicMaterial({ vertexColors: true }),
    }),
    [],
  )
  const tmp = useMemo(
    () => ({
      base: new THREE.Matrix4(), loc: new THREE.Matrix4(), out: new THREE.Matrix4(),
      q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0), c: new THREE.Color(),
    }),
    [],
  )

  useEffect(() => {
    mobHooks.onHurtPlayer = (dmg) => { hurtPlayer(dmg); playHurt() }
    mobHooks.onHit = () => playEnemyHit()
    mobHooks.onDeath = (m) => {
      playEnemyDie()
      if (Math.random() < 0.4) spawnDrop('pebble', 1, m.x, m.y, m.z)
    }
    return () => {
      mobHooks.onHurtPlayer = undefined
      mobHooks.onHit = undefined
      mobHooks.onDeath = undefined
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )

  useFrame((_, dtRaw) => {
    if (!session.playing) return
    const dt = Math.min(dtRaw, 0.05)
    const px = camera.position.x
    const py = camera.position.y - PLAYER.EYE
    const pz = camera.position.z

    // day/night → lights + sky
    advanceTime(dt)
    const sun = sunLevel()
    if (!lights.current.dir || !lights.current.hemi) {
      scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight) lights.current.dir = o as THREE.DirectionalLight
        if ((o as THREE.HemisphereLight).isHemisphereLight) lights.current.hemi = o as THREE.HemisphereLight
      })
    }
    if (lights.current.dir) lights.current.dir.intensity = 0.25 + sun * 1.35
    if (lights.current.hemi) lights.current.hemi.intensity = 0.2 + sun * 0.8
    tmp.c.copy(NIGHT_BG).lerp(DAY_BG, sun)
    if (scene.background instanceof THREE.Color) scene.background.copy(tmp.c)
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(tmp.c)

    spawnT.current -= dt
    if (spawnT.current <= 0) {
      spawnT.current = 2.5
      if (isNight()) spawnEnemy(px, pz)
      else if (Math.random() < 0.5) spawnFriend(px, pz)
    }

    updateMobs(dt, px, py, pz)
    updateParticles(dt)

    chirpT.current -= dt
    if (chirpT.current <= 0) {
      for (const m of mobs) {
        if (m.type === 'critter' && Math.hypot(px - m.x, pz - m.z) < 1.8) { playChirp(); chirpT.current = 1.5; break }
      }
    }

    // ── render mobs as multi-part models (instanced per part) ──────────────────
    const setPart = (mesh: THREE.InstancedMesh | null, idx: number, ox: number, oy: number, oz: number) => {
      if (!mesh) return
      tmp.loc.makeTranslation(ox, oy, oz)
      tmp.out.multiplyMatrices(tmp.base, tmp.loc)
      mesh.setMatrixAt(idx, tmp.out)
    }
    let sb = 0, se = 0, cb = 0, chd = 0, cer = 0, cey = 0, ct = 0, cl = 0
    for (const m of mobs) {
      if (m.type === 'slime') {
        if (sb >= MAX_SLIME) continue
        const yaw = Math.atan2(px - m.x, pz - m.z) // face the player
        tmp.q.setFromAxisAngle(tmp.up, yaw)
        const sy = m.vy > 0.5 ? 1.14 : m.vy < -0.5 ? 0.9 : 1.0 // squash/stretch on hop
        tmp.s.set(1, sy, 1)
        tmp.p.set(m.x, m.y, m.z)
        tmp.base.compose(tmp.p, tmp.q, tmp.s)
        slimeBody.current?.setMatrixAt(sb, tmp.base); sb++
        setPart(slimeEye.current, se++, 0.16, 0.08, 0.33)
        setPart(slimeEye.current, se++, -0.16, 0.08, 0.33)
      } else {
        if (cb >= MAX_CRIT) continue
        const yaw = Math.atan2(m.x - px, m.z - pz) // face away (shy)
        tmp.q.setFromAxisAngle(tmp.up, yaw)
        tmp.s.set(1, 1, 1)
        tmp.p.set(m.x, m.y, m.z)
        tmp.base.compose(tmp.p, tmp.q, tmp.s)
        critBody.current?.setMatrixAt(cb, tmp.base); cb++
        setPart(critHead.current, chd++, 0, 0.16, 0.3)
        setPart(critEar.current, cer++, 0.08, 0.4, 0.28)
        setPart(critEar.current, cer++, -0.08, 0.4, 0.28)
        setPart(critEye.current, cey++, 0.09, 0.2, 0.46)
        setPart(critEye.current, cey++, -0.09, 0.2, 0.46)
        setPart(critTail.current, ct++, 0, 0.08, -0.3)
        setPart(critLeg.current, cl++, 0.13, -0.18, 0.18)
        setPart(critLeg.current, cl++, -0.13, -0.18, 0.18)
        setPart(critLeg.current, cl++, 0.13, -0.18, -0.18)
        setPart(critLeg.current, cl++, -0.13, -0.18, -0.18)
      }
    }
    const commit = (mesh: THREE.InstancedMesh | null, n: number) => {
      if (!mesh) return
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    commit(slimeBody.current, sb); commit(slimeEye.current, se)
    commit(critBody.current, cb); commit(critHead.current, chd); commit(critEar.current, cer)
    commit(critEye.current, cey); commit(critTail.current, ct); commit(critLeg.current, cl)

    // particles
    const pm = partRef.current
    if (pm) {
      const n = Math.min(particles.length, MAX_PART)
      for (let i = 0; i < n; i++) {
        const p = particles[i]
        const k = Math.max(0.2, p.life / p.max)
        tmp.p.set(p.x, p.y, p.z)
        tmp.q.identity()
        tmp.s.set(k, k, k)
        pm.setMatrixAt(i, tmp.out.compose(tmp.p, tmp.q, tmp.s))
        pm.setColorAt(i, tmp.c.setRGB(p.r, p.g, p.b))
      }
      pm.count = n
      pm.instanceMatrix.needsUpdate = true
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={slimeBody} args={[geo.slimeBody, mat.slime, MAX_SLIME]} frustumCulled={false} castShadow />
      <instancedMesh ref={slimeEye} args={[geo.slimeEye, mat.eye, MAX_SLIME * 2]} frustumCulled={false} />
      <instancedMesh ref={critBody} args={[geo.critBody, mat.crit, MAX_CRIT]} frustumCulled={false} castShadow />
      <instancedMesh ref={critHead} args={[geo.critHead, mat.crit, MAX_CRIT]} frustumCulled={false} castShadow />
      <instancedMesh ref={critEar} args={[geo.critEar, mat.crit, MAX_CRIT * 2]} frustumCulled={false} />
      <instancedMesh ref={critEye} args={[geo.critEye, mat.eye, MAX_CRIT * 2]} frustumCulled={false} />
      <instancedMesh ref={critTail} args={[geo.critTail, mat.tail, MAX_CRIT]} frustumCulled={false} />
      <instancedMesh ref={critLeg} args={[geo.critLeg, mat.crit, MAX_CRIT * 4]} frustumCulled={false} />
      <instancedMesh ref={partRef} args={[geo.part, mat.part, MAX_PART]} frustumCulled={false} />
    </>
  )
}
