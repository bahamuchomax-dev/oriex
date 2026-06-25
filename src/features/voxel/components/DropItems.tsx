import { useMemo, useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { drops, updateDrops } from '../drops'
import { addItem } from '../inventory'
import { def, type ItemId } from '../itemDefs'
import { pushToast } from '../toast'
import { playPickup } from '../audio'
import { markDirty } from '../persist'

const MAX = 64

// representative solid colours per item (no external assets)
const COLOR: Record<string, string> = {
  grass: '#7cc349', dirt: '#7a5230', stone: '#8f9094', wood: '#6b4a2a', leaf: '#4f9e3a',
  sand: '#d6c98c', planks: '#b08247', brick: '#a84e3c', glass: '#bfe6f0', workbench: '#9c7038',
  torch: '#ffae3a', ladder: '#7a5a30', flower: '#e85c8a', pebble: '#9a9ca2',
  stick: '#7a5a30', seed: '#9bcb5a',
}

export function DropItems() {
  const { camera } = useThree()
  const ref = useRef<THREE.InstancedMesh | null>(null)
  const geom = useMemo(() => new THREE.BoxGeometry(0.26, 0.26, 0.26), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])
  const t = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(1, 1, 1),
      up: new THREE.Vector3(0, 1, 0),
      c: new THREE.Color(),
    }),
    [],
  )

  useEffect(
    () => () => {
      geom.dispose()
      mat.dispose()
    },
    [geom, mat],
  )

  useFrame((_, dtRaw) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(dtRaw, 0.05)
    const got = updateDrops(dt, camera.position.x, camera.position.y, camera.position.z)
    if (got.length) {
      for (const g of got) {
        addItem(g.id, g.count)
        pushToast(`${def(g.id).name} +${g.count}`)
      }
      playPickup()
      markDirty()
    }

    const n = Math.min(drops.length, MAX)
    for (let i = 0; i < n; i++) {
      const d = drops[i]
      t.q.setFromAxisAngle(t.up, d.age * 2.2)
      const bob = d.settled ? Math.sin(d.age * 3) * 0.07 : 0
      t.p.set(d.x, d.y + bob, d.z)
      mesh.setMatrixAt(i, t.m.compose(t.p, t.q, t.s))
      mesh.setColorAt(i, t.c.set(COLOR[d.id as ItemId] ?? '#cccccc'))
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geom, mat, MAX]} frustumCulled={false} castShadow />
}
