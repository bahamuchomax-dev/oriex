import { useMemo, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  world,
  keyOf,
  TYPES,
  type BlockType,
  GRASS, DIRT, STONE, WOOD, LEAF, WATER, SAND, PLANKS, BRICK, GLASS, WORKBENCH,
  BLOCK_RENDER, PLAYER, HALF, MIN_Y, tuftAt,
  waterLevel, waterLevelAt, waterSources,
  decorations, pruneDecorations, type DecorKind,
} from '../world'
import {
  makeGrassTop, makeGrassSide, makeDirt, makeStone, makeWoodSide, makeWoodTop,
  makeLeaf, makeGrassBlade, makeCrackTexture, makeSand, makePlanks, makeBrick,
  makeGlass, makeWorkbenchTop, makeWorkbenchSide,
} from '../textures'
import { buildWaterGeometry } from '../waterGeometry'
import { enqueueAround, stepWater } from '../waterSim'
import { def, BLOCK_DROPS, breakTimeFor, type Tool } from '../itemDefs'
import { selectedItem, count, removeItem, addItem } from '../inventory'
import { playHit, playBreak, playPlace } from '../audio'
import { handState } from '../handState'
import { markDirty } from '../persist'
import { pushToast } from '../toast'
import { touch } from '../controls'

const MAX = 8000
const MAX_DECO = 1000
const REACH = 6
const NDC_CENTER = new THREE.Vector2(0, 0)
const DECOR_KINDS: DecorKind[] = ['torch', 'ladder', 'flower', 'pebble']

type Coord = [number, number, number]

function crossedGeometry() {
  const w = 0.42
  const hh = 0.62
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array([
    -w, 0, 0, w, 0, 0, w, hh, 0, -w, hh, 0,
    0, 0, -w, 0, 0, w, 0, hh, w, 0, hh, -w,
  ])
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1])
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  g.computeVertexNormals()
  return g
}

export function VoxelWorld({ onOpenCraft }: { onOpenCraft: () => void }) {
  const { camera, gl } = useThree()

  // one InstancedMesh ref per cube type
  const meshRefs = useMemo(() => {
    const m = new Map<BlockType, { current: THREE.InstancedMesh | null }>()
    for (const t of TYPES) m.set(t, { current: null })
    return m
  }, [])
  const coordsRef = useRef(new Map<BlockType, Coord[]>())

  const waterRef = useRef<THREE.Mesh | null>(null)
  const decoRef = useRef<THREE.InstancedMesh | null>(null) // grass tufts
  const decorRefs = useMemo(() => {
    const m = new Map<DecorKind, { current: THREE.InstancedMesh | null }>()
    for (const k of DECOR_KINDS) m.set(k, { current: null })
    return m
  }, [])
  const outlineRef = useRef<THREE.LineSegments | null>(null)
  const crackRef = useRef<THREE.Mesh | null>(null)

  // break-progress
  const leftHeld = useRef(false)
  const breakKey = useRef<string | null>(null)
  const progress = useRef(0)
  const hitTimer = useRef(0)
  const lastSel = useRef<string | null>(null)
  const lastTouchPlace = useRef(0)
  const doPlaceRef = useRef<() => void>(() => {})
  const targetRef = useRef<{ hit: Coord; place: Coord } | null>(null)

  // ── geometry + textures + materials ─────────────────────────────────────────
  const geom = useMemo(() => new THREE.BoxGeometry(BLOCK_RENDER, BLOCK_RENDER, BLOCK_RENDER), [])
  const tuftGeom = useMemo(crossedGeometry, [])

  const tex = useMemo(
    () => ({
      grassTop: makeGrassTop(), grassSide: makeGrassSide(), dirt: makeDirt(), stone: makeStone(),
      woodSide: makeWoodSide(), woodTop: makeWoodTop(), leaf: makeLeaf(), blade: makeGrassBlade(),
      sand: makeSand(), planks: makePlanks(), brick: makeBrick(), glass: makeGlass(),
      wbTop: makeWorkbenchTop(), wbSide: makeWorkbenchSide(),
    }),
    [],
  )

  const mats = useMemo(() => {
    const m = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map })
    const map: Record<number, THREE.Material | THREE.Material[]> = {
      [GRASS]: [m(tex.grassSide), m(tex.grassSide), m(tex.grassTop), m(tex.dirt), m(tex.grassSide), m(tex.grassSide)],
      [DIRT]: m(tex.dirt),
      [STONE]: m(tex.stone),
      [WOOD]: [m(tex.woodSide), m(tex.woodSide), m(tex.woodTop), m(tex.woodTop), m(tex.woodSide), m(tex.woodSide)],
      [LEAF]: m(tex.leaf),
      [SAND]: m(tex.sand),
      [PLANKS]: m(tex.planks),
      [BRICK]: m(tex.brick),
      [GLASS]: new THREE.MeshLambertMaterial({ map: tex.glass, transparent: true, opacity: 0.55 }),
      [WORKBENCH]: [m(tex.wbSide), m(tex.wbSide), m(tex.wbTop), m(tex.planks), m(tex.wbSide), m(tex.wbSide)],
    }
    return map
  }, [tex])

  const waterMat = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
    [],
  )
  const tuftMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: tex.blade, alphaTest: 0.5, side: THREE.DoubleSide }),
    [tex],
  )

  // decoration geometries + materials
  const decorAssets = useMemo(() => {
    return {
      torch: { geom: new THREE.BoxGeometry(0.14, 0.55, 0.14), mat: new THREE.MeshStandardMaterial({ color: '#6b4a2a', emissive: '#ff9a2e', emissiveIntensity: 0.7 }), off: -0.5 + 0.28 },
      ladder: { geom: new THREE.BoxGeometry(0.84, 1.0, 0.08), mat: new THREE.MeshLambertMaterial({ color: '#7a5a30' }), off: 0 },
      flower: { geom: new THREE.BoxGeometry(0.22, 0.34, 0.22), mat: new THREE.MeshLambertMaterial({ color: '#e85c8a' }), off: -0.5 + 0.18 },
      pebble: { geom: new THREE.BoxGeometry(0.4, 0.16, 0.4), mat: new THREE.MeshLambertMaterial({ color: '#9a9ca2' }), off: -0.5 + 0.09 },
    } as Record<DecorKind, { geom: THREE.BufferGeometry; mat: THREE.Material; off: number }>
  }, [])

  const outlineGeom = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)), [])
  const crackGeom = useMemo(() => new THREE.BoxGeometry(1.02, 1.02, 1.02), [])
  const crackTex = useMemo(() => makeCrackTexture(), [])
  const crackMat = useMemo(() => new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }), [crackTex])

  const rebuildWater = useCallback(() => {
    const wm = waterRef.current
    if (!wm) return
    const old = wm.geometry
    wm.geometry = buildWaterGeometry(waterLevelAt)
    old?.dispose()
  }, [])

  const rebuild = useCallback(() => {
    const buckets = new Map<BlockType, Coord[]>()
    for (const t of TYPES) buckets.set(t, [])
    const tufts: Coord[] = []

    world.forEach((t, k) => {
      const p = k.split(',')
      const x = Number(p[0]); const y = Number(p[1]); const z = Number(p[2])
      if (t === WATER) return
      buckets.get(t)!.push([x, y, z])
      if (t === GRASS && tuftAt(x, z) && !world.has(keyOf(x, y + 1, z))) tufts.push([x, y, z])
    })

    const m = new THREE.Matrix4()
    for (const t of TYPES) {
      const mesh = meshRefs.get(t)!.current
      if (!mesh) continue
      const list = buckets.get(t)!
      coordsRef.current.set(t, list)
      for (let i = 0; i < list.length; i++) {
        const [x, y, z] = list[i]
        mesh.setMatrixAt(i, m.makeTranslation(x, y, z))
      }
      mesh.count = list.length
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }

    rebuildWater()

    // grass tufts
    const dm = decoRef.current
    if (dm) {
      const q = new THREE.Quaternion()
      const p = new THREE.Vector3()
      const s = new THREE.Vector3()
      const up = new THREE.Vector3(0, 1, 0)
      const n = Math.min(tufts.length, MAX_DECO)
      for (let i = 0; i < n; i++) {
        const [x, y, z] = tufts[i]
        const seed = (x * 73856093) ^ (z * 19349663)
        q.setFromAxisAngle(up, (seed % 360) * (Math.PI / 180))
        const sc = 0.8 + ((seed >>> 3) % 100) / 250
        s.set(sc, sc, sc)
        p.set(x, y + 0.5, z)
        dm.setMatrixAt(i, m.compose(p, q, s))
      }
      dm.count = n
      dm.instanceMatrix.needsUpdate = true
      dm.computeBoundingSphere()
    }

    // placed decorations (torch/ladder/flower/pebble)
    const decBy = new Map<DecorKind, Coord[]>()
    for (const k of DECOR_KINDS) decBy.set(k, [])
    decorations.forEach((kind, key) => {
      const p = key.split(',')
      decBy.get(kind)!.push([Number(p[0]), Number(p[1]), Number(p[2])])
    })
    for (const kind of DECOR_KINDS) {
      const mesh = decorRefs.get(kind)!.current
      if (!mesh) continue
      const list = decBy.get(kind)!
      const off = decorAssets[kind].off
      for (let i = 0; i < list.length; i++) {
        const [x, y, z] = list[i]
        mesh.setMatrixAt(i, m.makeTranslation(x, y + off, z))
      }
      mesh.count = Math.min(list.length, 500)
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [meshRefs, decorRefs, decorAssets, rebuildWater])

  useLayoutEffect(() => {
    rebuild()
    return () => {
      geom.dispose(); tuftGeom.dispose(); outlineGeom.dispose(); crackGeom.dispose()
      crackMat.dispose(); crackTex.dispose(); waterMat.dispose(); tuftMat.dispose()
      waterRef.current?.geometry?.dispose()
      Object.values(mats).flat().forEach((mm) => (mm as THREE.Material).dispose())
      Object.values(tex).forEach((t) => t.dispose())
      for (const k of DECOR_KINDS) { decorAssets[k].geom.dispose(); decorAssets[k].mat.dispose() }
    }
  }, [rebuild, geom, tuftGeom, outlineGeom, crackGeom, crackMat, crackTex, waterMat, tuftMat, mats, tex, decorAssets])

  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster()
    r.far = REACH
    return r
  }, [])

  useFrame((state, dt) => {
    // crosshair targeting (cubes only)
    raycaster.setFromCamera(NDC_CENTER, camera)
    const meshes = TYPES.map((t) => meshRefs.get(t)!.current).filter(Boolean) as THREE.InstancedMesh[]
    const hits = raycaster.intersectObjects(meshes, false)
    const hit = hits.find((hh) => hh.instanceId !== undefined && hh.face)
    const outline = outlineRef.current
    if (hit && hit.instanceId !== undefined && hit.face) {
      const type = hit.object.userData.type as BlockType
      const coord = coordsRef.current.get(type)?.[hit.instanceId]
      if (coord) {
        const n = hit.face.normal
        targetRef.current = {
          hit: coord,
          place: [coord[0] + Math.round(n.x), coord[1] + Math.round(n.y), coord[2] + Math.round(n.z)],
        }
        if (outline) { outline.visible = true; outline.position.set(coord[0], coord[1], coord[2]) }
      } else {
        targetRef.current = null
        if (outline) outline.visible = false
      }
    } else {
      targetRef.current = null
      if (outline) outline.visible = false
    }

    // progressive breaking
    const crack = crackRef.current
    const sel = selectedItem()
    const heldTool: Tool | undefined = sel ? def(sel).tool : undefined
    const tgt = targetRef.current
    const active = document.pointerLockElement === gl.domElement || touch.active
    let mining = false

    const selKey = sel ?? ''
    if (selKey !== lastSel.current) { lastSel.current = selKey; progress.current = 0; breakKey.current = null }

    if ((leftHeld.current || touch.breaking) && active && tgt) {
      const [hx, hy, hz] = tgt.hit
      const k = keyOf(hx, hy, hz)
      const block = world.get(k)
      if (block !== undefined && block !== WATER) {
        if (k !== breakKey.current) { breakKey.current = k; progress.current = 0; hitTimer.current = 0 }
        const need = breakTimeFor(block, heldTool)
        progress.current += dt
        mining = true
        hitTimer.current -= dt
        if (hitTimer.current <= 0) { playHit(heldTool); hitTimer.current = 0.22 }
        if (crack) {
          const ratio = Math.min(1, progress.current / need)
          crack.visible = true
          crack.position.set(hx, hy, hz)
          crack.scale.setScalar(1 + ratio * 0.03)
          crackMat.opacity = 0.2 + ratio * 0.75
        }
        if (progress.current >= need) {
          // drops
          for (const [id, n, chance] of BLOCK_DROPS[block] ?? []) {
            if (Math.random() < chance) { addItem(id, n); pushToast(`${def(id).name} +${n}`) }
          }
          world.delete(k)
          waterLevel.delete(k)
          waterSources.delete(k)
          pruneDecorations()
          enqueueAround(hx, hy, hz)
          rebuild()
          playBreak(block, heldTool)
          handState.breakPulse++
          markDirty()
          progress.current = 0
          breakKey.current = null
          if (crack) crack.visible = false
        }
      }
    } else {
      progress.current = 0
      breakKey.current = null
      if (crack) crack.visible = false
    }
    handState.mining = mining

    // touch place button (single-shot via pulse counter)
    if (touch.active && touch.placePulse !== lastTouchPlace.current) {
      lastTouchPlace.current = touch.placePulse
      doPlaceRef.current()
    }

    if (stepWater(256)) rebuildWater()
    waterMat.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 1.3) * 0.07
  })

  const playerOverlapsCell = useCallback(
    (cx: number, cy: number, cz: number) => {
      const fx = camera.position.x
      const fz = camera.position.z
      const fyMin = camera.position.y - PLAYER.EYE
      const fyMax = fyMin + PLAYER.BODY
      return Math.abs(fx - cx) < PLAYER.HW + 0.5 && Math.abs(fz - cz) < PLAYER.HW + 0.5 && cy + 0.5 > fyMin && cy - 0.5 < fyMax
    },
    [camera],
  )

  // place / use the selected item at the crosshair target (mouse or touch)
  const doPlace = useCallback(() => {
    const tgt = targetRef.current
    if (!tgt) return
    // workbench → open crafting
    if (world.get(keyOf(tgt.hit[0], tgt.hit[1], tgt.hit[2])) === WORKBENCH) {
      onOpenCraft()
      return
    }
    const sel = selectedItem()
    if (!sel) return
    const d = def(sel)
    const [px, pyy, pz] = tgt.place
    if (pyy < MIN_Y || px < -HALF || px > HALF || pz < -HALF || pz > HALF) return
    const pk = keyOf(px, pyy, pz)

    if (d.tool === 'bucket') {
      if (!world.has(pk) && !playerOverlapsCell(px, pyy, pz)) {
        world.set(pk, WATER); waterLevel.set(pk, 0); waterSources.add(pk)
        enqueueAround(px, pyy, pz); rebuild(); markDirty(); playPlace()
        handState.placePulse++
      }
      return
    }
    if (d.tool) return // other tools never place

    if (count(sel) <= 0) return
    if (d.placesBlock !== undefined) {
      if (world.has(pk) && world.get(pk) !== WATER) return
      if (playerOverlapsCell(px, pyy, pz)) return
      waterLevel.delete(pk); waterSources.delete(pk)
      world.set(pk, d.placesBlock)
      removeItem(sel, 1)
      enqueueAround(px, pyy, pz)
      pruneDecorations()
      rebuild(); markDirty(); playPlace()
      handState.placePulse++
    } else if (d.placesDecor) {
      if (world.has(pk)) return
      if (!world.has(keyOf(px, pyy - 1, pz)) || world.get(keyOf(px, pyy - 1, pz)) === WATER) return
      decorations.set(pk, d.placesDecor)
      removeItem(sel, 1)
      rebuild(); markDirty(); playPlace()
      handState.placePulse++
    }
  }, [rebuild, playerOverlapsCell, onOpenCraft])
  doPlaceRef.current = doPlace

  useEffect(() => {
    const dom = gl.domElement
    const onDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return
      if (e.button === 0) {
        leftHeld.current = true
        return
      }
      if (e.button !== 2) return
      doPlace()
    }
    const onUp = (e: MouseEvent) => { if (e.button === 0) leftHeld.current = false }
    const onCtx = (e: Event) => e.preventDefault()
    const onLock = () => { if (document.pointerLockElement !== dom) leftHeld.current = false }
    dom.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    dom.addEventListener('contextmenu', onCtx)
    document.addEventListener('pointerlockchange', onLock)
    return () => {
      dom.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      dom.removeEventListener('contextmenu', onCtx)
      document.removeEventListener('pointerlockchange', onLock)
    }
  }, [gl, doPlace])

  return (
    <>
      {TYPES.map((t) => (
        <instancedMesh
          key={t}
          ref={(el) => { meshRefs.get(t)!.current = el }}
          args={[geom, mats[t], MAX]}
          frustumCulled={false}
          userData={{ type: t }}
          castShadow
          receiveShadow
        />
      ))}

      <mesh ref={waterRef} material={waterMat} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={decoRef} args={[tuftGeom, tuftMat, MAX_DECO]} frustumCulled={false} />

      {DECOR_KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(el) => { decorRefs.get(k)!.current = el }}
          args={[decorAssets[k].geom, decorAssets[k].mat, 500]}
          frustumCulled={false}
          castShadow
        />
      ))}

      <lineSegments ref={outlineRef} geometry={outlineGeom} visible={false} frustumCulled={false}>
        <lineBasicMaterial color="#1a1a1a" transparent opacity={0.55} />
      </lineSegments>
      <mesh ref={crackRef} geometry={crackGeom} material={crackMat} visible={false} frustumCulled={false} />
    </>
  )
}
