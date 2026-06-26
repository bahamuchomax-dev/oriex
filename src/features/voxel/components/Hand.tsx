import { useMemo, useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  GRASS, DIRT, STONE, WOOD, LEAF, SAND, PLANKS, BRICK, GLASS, WORKBENCH,
} from '../world'
import {
  makeGrassTop, makeGrassSide, makeDirt, makeStone, makeWoodSide, makeWoodTop,
  makeLeaf, makeSand, makePlanks, makeBrick, makeGlass, makeWorkbenchTop,
} from '../textures'
import { def, type Tool } from '../itemDefs'
import { useInventory, selectedItem } from '../inventory'
import { handState } from '../handState'

// Always-on-top + transparent → renders in the late transparent pass, so water
// (also transparent) can never paint over the held item.
const overlay = (opts: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial({ depthTest: false, depthWrite: false, transparent: true, roughness: 0.8, ...opts })

function buildTool(kind: Tool): THREE.Group {
  const g = new THREE.Group()
  const wood = overlay({ color: '#7a5230' })
  const metal = overlay({ color: '#a6adb5', metalness: 0.35, roughness: 0.55 })
  const dark = overlay({ color: '#6f767d' }) // edge / shading for the head
  const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    g.add(m)
  }
  if (kind === 'bucket') {
    box(0.32, 0.3, 0.32, metal, 0, 0.04, 0)
    box(0.3, 0.05, 0.3, dark, 0, 0.2, 0) // rim
    box(0.04, 0.16, 0.04, metal, 0.17, 0.18, 0) // handle arc
    box(0.04, 0.16, 0.04, metal, -0.17, 0.18, 0)
    box(0.38, 0.04, 0.04, metal, 0, 0.27, 0)
  } else {
    // wooden stick handle (longer/chunkier, blocky like MC)
    box(0.08, 0.66, 0.08, wood, 0, -0.02, 0)
    if (kind === 'axe') {
      // square-ish head on one side near the top with a darker blade edge
      box(0.18, 0.28, 0.1, metal, 0.13, 0.26, 0)
      box(0.07, 0.22, 0.1, dark, 0.26, 0.26, 0) // blade
      box(0.1, 0.1, 0.1, metal, 0.04, 0.3, 0) // socket
    } else if (kind === 'shovel') {
      box(0.24, 0.26, 0.06, metal, 0, 0.42, 0) // wide flat blade
      box(0.24, 0.04, 0.06, dark, 0, 0.29, 0) // socket band
    } else {
      // pickaxe: a wide head bar with two angled points
      box(0.5, 0.08, 0.09, metal, 0, 0.36, 0)
      box(0.09, 0.14, 0.09, dark, 0.22, 0.28, 0) // left point
      box(0.09, 0.14, 0.09, dark, -0.22, 0.28, 0) // right point
      box(0.1, 0.07, 0.09, metal, 0, 0.3, 0) // socket to handle
    }
  }
  g.traverse((o) => (o.renderOrder = 1000))
  return g
}

function buildDecor(kind: 'torch' | 'ladder' | 'flower' | 'pebble'): THREE.Group {
  const g = new THREE.Group()
  const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, emissive?: string) => {
    const mat = overlay(emissive ? { color, emissive, emissiveIntensity: 0.8 } : { color })
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    g.add(m)
  }
  if (kind === 'torch') { box(0.07, 0.4, 0.07, '#6b4a2a', 0, 0, 0); box(0.1, 0.1, 0.1, '#ffae3a', 0, 0.24, 0, '#ff8a1e') }
  else if (kind === 'ladder') { box(0.34, 0.42, 0.05, '#7a5a30', 0, 0, 0) }
  else if (kind === 'flower') { box(0.04, 0.26, 0.04, '#3f8c33', 0, 0, 0); box(0.16, 0.14, 0.16, '#e85c8a', 0, 0.16, 0) }
  else { box(0.26, 0.12, 0.26, '#9a9ca2', 0, 0, 0) }
  g.traverse((o) => (o.renderOrder = 1000))
  return g
}

export function Hand() {
  useInventory() // re-render when selection / inventory changes
  const { camera } = useThree()
  const group = useRef<THREE.Group | null>(null)
  const pivot = useRef<THREE.Group | null>(null)

  const tex = useMemo(
    () => ({
      grassTop: makeGrassTop(), grassSide: makeGrassSide(), dirt: makeDirt(), stone: makeStone(),
      woodSide: makeWoodSide(), woodTop: makeWoodTop(), leaf: makeLeaf(), sand: makeSand(),
      planks: makePlanks(), brick: makeBrick(), glass: makeGlass(), wbTop: makeWorkbenchTop(),
    }),
    [],
  )
  const blockMats = useMemo(() => {
    const m = (map: THREE.Texture, extra?: THREE.MeshStandardMaterialParameters) => overlay({ map, ...extra })
    return {
      [GRASS]: [m(tex.grassSide), m(tex.grassSide), m(tex.grassTop), m(tex.dirt), m(tex.grassSide), m(tex.grassSide)],
      [DIRT]: m(tex.dirt),
      [STONE]: m(tex.stone),
      [WOOD]: [m(tex.woodSide), m(tex.woodSide), m(tex.woodTop), m(tex.woodTop), m(tex.woodSide), m(tex.woodSide)],
      [LEAF]: m(tex.leaf),
      [SAND]: m(tex.sand),
      [PLANKS]: m(tex.planks),
      [BRICK]: m(tex.brick),
      [GLASS]: m(tex.glass, { opacity: 0.6 }),
      [WORKBENCH]: [m(tex.planks), m(tex.planks), m(tex.wbTop), m(tex.planks), m(tex.planks), m(tex.planks)],
    } as Record<number, THREE.Material | THREE.Material[]>
  }, [tex])

  const cubeGeom = useMemo(() => new THREE.BoxGeometry(0.36, 0.36, 0.36), [])
  const itemGeom = useMemo(() => new THREE.BoxGeometry(0.26, 0.26, 0.06), [])
  const armMat = useMemo(() => overlay({ color: '#e0a878' }), [])
  const armGeom = useMemo(() => new THREE.BoxGeometry(0.16, 0.5, 0.16), [])
  const matMat = useMemo(() => overlay({ color: '#b9a06a' }), []) // generic material chip
  const tools = useMemo(
    () => ({ axe: buildTool('axe'), shovel: buildTool('shovel'), pickaxe: buildTool('pickaxe'), bucket: buildTool('bucket') }),
    [],
  )
  const decors = useMemo(
    () => ({ torch: buildDecor('torch'), ladder: buildDecor('ladder'), flower: buildDecor('flower'), pebble: buildDecor('pebble') }),
    [],
  )

  useEffect(() => {
    return () => {
      Object.values(tex).forEach((t) => t.dispose())
      Object.values(blockMats).flat().forEach((mm) => (mm as THREE.Material).dispose())
      cubeGeom.dispose(); itemGeom.dispose(); armGeom.dispose(); armMat.dispose(); matMat.dispose()
      const killGroup = (gr: THREE.Group) =>
        gr.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          if (mesh.material) (mesh.material as THREE.Material).dispose()
        })
      Object.values(tools).forEach(killGroup)
      Object.values(decors).forEach(killGroup)
    }
  }, [tex, blockMats, cubeGeom, itemGeom, armGeom, armMat, matMat, tools, decors])

  const anim = useRef({ breakT: 0, placeT: 0, lastBreak: 0, lastPlace: 0 })
  const BASE_Z = -0.8
  const BASE_X = 0.42
  const BASE_Y = -0.22

  useFrame((state, dt) => {
    const g = group.current
    const pv = pivot.current
    if (!g || !pv) return
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    const a = anim.current
    if (handState.breakPulse !== a.lastBreak) { a.lastBreak = handState.breakPulse; a.breakT = 0.25 }
    if (handState.placePulse !== a.lastPlace) { a.lastPlace = handState.placePulse; a.placeT = 0.18 }
    let rotX = -0.15
    let posZ = BASE_Z
    if (handState.mining) rotX += Math.sin(state.clock.elapsedTime * 14) * 0.18 - 0.08
    if (a.breakT > 0) { a.breakT -= dt; const p = Math.max(0, a.breakT) / 0.25; rotX -= Math.sin((1 - p) * Math.PI) * 0.7 }
    if (a.placeT > 0) { a.placeT -= dt; const p = Math.max(0, a.placeT) / 0.18; posZ -= Math.sin((1 - p) * Math.PI) * 0.25 }
    pv.rotation.x = rotX
    pv.position.set(BASE_X, BASE_Y, posZ)
  })

  const sel = selectedItem()
  const d = sel ? def(sel) : null

  return (
    <group ref={group}>
      <group ref={pivot} position={[BASE_X, BASE_Y, BASE_Z]} rotation={[-0.15, -0.35, 0]} scale={[0.8, 0.8, 0.8]}>
        <mesh geometry={armGeom} material={armMat} position={[0.3, -0.3, 0.16]} rotation={[0.5, 0, 0.32]} renderOrder={1000} />
        {d?.placesBlock !== undefined && (
          <mesh geometry={cubeGeom} material={blockMats[d.placesBlock]} rotation={[0.35, 0.6, 0]} renderOrder={1000} />
        )}
        {d?.tool && <primitive object={tools[d.tool]} position={[0.02, -0.08, 0]} rotation={[0.3, 0.15, 0.5]} />}
        {d?.placesDecor && <primitive object={decors[d.placesDecor]} position={[0, -0.1, 0]} rotation={[0.1, 0, 0.1]} />}
        {d && d.placesBlock === undefined && !d.tool && !d.placesDecor && (
          <mesh geometry={itemGeom} material={matMat} rotation={[0.2, 0.4, 0]} renderOrder={1000} />
        )}
      </group>
    </group>
  )
}
