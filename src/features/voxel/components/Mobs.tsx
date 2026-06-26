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
  const slimeRef = useRef<THREE.InstancedMesh | null>(null)
  const critRef = useRef<THREE.InstancedMesh | null>(null)
  const partRef = useRef<THREE.InstancedMesh | null>(null)
  const lights = useRef<{ dir: THREE.DirectionalLight | null; hemi: THREE.HemisphereLight | null }>({ dir: null, hemi: null })
  const spawnT = useRef(2)
  const chirpT = useRef(0)

  const slimeGeom = useMemo(() => new THREE.BoxGeometry(0.7, 0.7, 0.7), [])
  const slimeMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#5fbf4a', transparent: true, opacity: 0.85 }), [])
  const critGeom = useMemo(() => new THREE.BoxGeometry(0.42, 0.38, 0.5), [])
  const critMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#d8b07a' }), [])
  const partGeom = useMemo(() => new THREE.BoxGeometry(0.13, 0.13, 0.13), [])
  const partMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true }), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), bg: new THREE.Color() }), [])

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
      slimeGeom.dispose(); slimeMat.dispose(); critGeom.dispose(); critMat.dispose(); partGeom.dispose(); partMat.dispose()
    },
    [slimeGeom, slimeMat, critGeom, critMat, partGeom, partMat],
  )

  useFrame((_, dtRaw) => {
    if (!session.playing) return
    const dt = Math.min(dtRaw, 0.05)
    const px = camera.position.x
    const py = camera.position.y - PLAYER.EYE
    const pz = camera.position.z

    // day/night clock → light + sky
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
    tmp.bg.copy(NIGHT_BG).lerp(DAY_BG, sun)
    if (scene.background instanceof THREE.Color) scene.background.copy(tmp.bg)
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(tmp.bg)

    // spawning
    spawnT.current -= dt
    if (spawnT.current <= 0) {
      spawnT.current = 2.5
      if (isNight()) spawnEnemy(px, pz)
      else if (Math.random() < 0.5) spawnFriend(px, pz)
    }

    updateMobs(dt, px, py, pz)
    updateParticles(dt)

    // chirp when a critter is very close
    chirpT.current -= dt
    if (chirpT.current <= 0) {
      for (const m of mobs) {
        if (m.type === 'critter' && Math.hypot(px - m.x, pz - m.z) < 1.8) { playChirp(); chirpT.current = 1.5; break }
      }
    }

    // render slimes
    const sm = slimeRef.current
    if (sm) {
      let n = 0
      for (const m of mobs) {
        if (m.type !== 'slime' || n >= MAX_SLIME) continue
        const sy = m.vy > 0.5 ? 1.1 : 0.85
        tmp.p.set(m.x, m.y, m.z)
        tmp.s.set(1, sy, 1)
        sm.setMatrixAt(n, tmp.m.compose(tmp.p, tmp.q, tmp.s))
        n++
      }
      sm.count = n
      sm.instanceMatrix.needsUpdate = true
    }
    // render critters
    const cm = critRef.current
    if (cm) {
      let n = 0
      for (const m of mobs) {
        if (m.type !== 'critter' || n >= MAX_CRIT) continue
        tmp.p.set(m.x, m.y, m.z)
        tmp.s.set(1, 1, 1)
        cm.setMatrixAt(n, tmp.m.compose(tmp.p, tmp.q, tmp.s))
        n++
      }
      cm.count = n
      cm.instanceMatrix.needsUpdate = true
    }
    // render particles
    const pm = partRef.current
    if (pm) {
      const n = Math.min(particles.length, MAX_PART)
      for (let i = 0; i < n; i++) {
        const p = particles[i]
        const k = Math.max(0.2, p.life / p.max)
        tmp.p.set(p.x, p.y, p.z)
        tmp.s.set(k, k, k)
        pm.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
        pm.setColorAt(i, tmp.c.setRGB(p.r, p.g, p.b))
      }
      pm.count = n
      pm.instanceMatrix.needsUpdate = true
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={slimeRef} args={[slimeGeom, slimeMat, MAX_SLIME]} frustumCulled={false} castShadow />
      <instancedMesh ref={critRef} args={[critGeom, critMat, MAX_CRIT]} frustumCulled={false} castShadow />
      <instancedMesh ref={partRef} args={[partGeom, partMat, MAX_PART]} frustumCulled={false} />
    </>
  )
}
