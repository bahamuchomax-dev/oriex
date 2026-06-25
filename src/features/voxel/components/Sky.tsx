import { useMemo, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { SUN_POSITION } from '../world'
import { makeSunGlow } from '../textures'

// Gradient sky dome + a soft sun glow sprite in the sun's direction.
export function Sky() {
  const spriteRef = useRef<THREE.Sprite | null>(null)

  const domeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#4d8fd6') }, // clear daytime blue
          bottom: { value: new THREE.Color('#cfe6ff') }, // pale horizon
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          uniform vec3 top;
          uniform vec3 bottom;
          void main() {
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 col = mix(bottom, top, smoothstep(0.0, 0.75, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  const domeGeom = useMemo(() => new THREE.SphereGeometry(300, 24, 16), [])
  const glow = useMemo(() => makeSunGlow(), [])
  const sunMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glow,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        transparent: true,
      }),
    [glow],
  )

  useLayoutEffect(() => {
    const dir = new THREE.Vector3(...SUN_POSITION).normalize().multiplyScalar(260)
    spriteRef.current?.position.copy(dir)
    return () => {
      domeMat.dispose()
      domeGeom.dispose()
      sunMat.dispose()
      glow.dispose()
    }
  }, [domeMat, domeGeom, sunMat, glow])

  return (
    <>
      <mesh geometry={domeGeom} material={domeMat} renderOrder={-1} frustumCulled={false} />
      <sprite ref={spriteRef} material={sunMat} scale={[70, 70, 1]} />
    </>
  )
}
