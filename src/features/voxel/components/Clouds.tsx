import { useMemo, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Slow-drifting blocky clouds made of a few flattened white boxes.
const COUNT = 16
const RANGE = 90 // wrap distance
const SPEED = 0.7

export function Clouds() {
  const ref = useRef<THREE.InstancedMesh | null>(null)
  const geom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  )

  // deterministic-ish layout computed once
  const layout = useMemo(() => {
    const out: { pos: [number, number, number]; scale: [number, number, number] }[] = []
    for (let i = 0; i < COUNT; i++) {
      out.push({
        pos: [
          (Math.random() * 2 - 1) * RANGE,
          40 + Math.random() * 14,
          (Math.random() * 2 - 1) * RANGE,
        ],
        scale: [4 + Math.random() * 6, 1.5 + Math.random() * 1.5, 3 + Math.random() * 5],
      })
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    layout.forEach((c, i) => {
      p.set(...c.pos)
      s.set(...c.scale)
      mesh.setMatrixAt(i, m.compose(p, q, s))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return () => {
      geom.dispose()
      mat.dispose()
    }
  }, [layout, geom, mat])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    mesh.position.x += SPEED * dt
    if (mesh.position.x > RANGE) mesh.position.x -= RANGE * 2
  })

  return (
    <instancedMesh
      ref={ref}
      args={[geom, mat, COUNT]}
      frustumCulled={false}
      renderOrder={-1}
    />
  )
}
