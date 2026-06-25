import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from './components/Player'
import { VoxelWorld } from './components/VoxelWorld'
import { Hotbar } from './components/Hotbar'
import { Hand } from './components/Hand'
import { DropItems } from './components/DropItems'
import { OrientationGate } from './components/OrientationGate'
import { Sky } from './components/Sky'
import { Clouds } from './components/Clouds'
import { CraftPanel } from './components/CraftPanel'
import { MobileControls } from './components/MobileControls'
import { SUN_POSITION } from './world'
import { initGame } from './persist'
import { setSelected, HOTBAR_SIZE } from './inventory'
import { useToasts } from './toast'
import './voxel.css'

// Initialise world + inventory once, when this lazy feature first loads.
initGame()

function Toasts() {
  const toasts = useToasts()
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  )
}

export default function VoxelGame({ onBack }: { onBack?: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [panel, setPanel] = useState<null | 'inv' | 'bench'>(null)

  // hotbar selection + open inventory
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= HOTBAR_SIZE) setSelected(n - 1)
      else if (e.key === 'e' || e.key === 'E') setPanel((p) => (p ? null : 'inv'))
      // Esc intentionally does NOT pause/stop the game (browser still releases
      // the pointer lock natively; clicking resumes).
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onLock = () => setPlaying(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onLock)
    return () => document.removeEventListener('pointerlockchange', onLock)
  }, [])

  // opening a panel releases the pointer so the cursor can use the UI
  useEffect(() => {
    if (panel && document.pointerLockElement) document.exitPointerLock()
  }, [panel])

  return (
    <div className="game-container">
      <OrientationGate />
      <div className="ui-overlay">
        <div className={`instructions ${playing ? 'compact' : ''}`}>
          {playing ? (
            <span>左:破壊 ｜ 右:設置/作業台 ｜ 1-9:アイテム ｜ E:持ち物 ｜ Esc:解除</span>
          ) : (
            <span>
              クリックで開始 ｜ WASD:移動 ｜ Space:ジャンプ ｜ 左:破壊 ｜ 右:設置 ｜ E:クラフト ｜
              作業台を右クリックで作業台クラフト
            </span>
          )}
        </div>
        {!panel && <div className="crosshair" />}
        {onBack && (
          <button className="voxel-back" onClick={onBack}>
            ← 戻る
          </button>
        )}
        <Hotbar />
        <Toasts />
      </div>

      {!panel && <MobileControls onCraft={() => setPanel('inv')} />}
      {panel && (
        <CraftPanel
          atWorkbench={panel === 'bench'}
          onClose={() => {
            setPanel(null)
            // resume immediately — don't leave the game "stopped" after the workbench
            const c = document.querySelector('canvas') as HTMLCanvasElement | null
            c?.requestPointerLock?.()
          }}
        />
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 400 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#cfe6ff')
        }}
      >
        <fog attach="fog" args={['#cfe6ff', 30, 120]} />
        <hemisphereLight args={['#bfe0ff', '#5b6b42', 0.9]} />
        <directionalLight
          position={SUN_POSITION}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={160}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-bias={-0.0002}
          shadow-normalBias={0.08}
        />

        <Sky />
        <Clouds />
        <VoxelWorld onOpenCraft={() => setPanel('bench')} />
        <DropItems />
        <Hand />
        <Player />
      </Canvas>
    </div>
  )
}
