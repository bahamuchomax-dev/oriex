import { useState, useEffect, useRef, useReducer } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from './components/Player'
import { VoxelWorld } from './components/VoxelWorld'
import { Hotbar } from './components/Hotbar'
import { Hand } from './components/Hand'
import { DropItems } from './components/DropItems'
import { Sky } from './components/Sky'
import { Clouds } from './components/Clouds'
import { CraftPanel } from './components/CraftPanel'
import { MobileControls } from './components/MobileControls'
import { GameMenus, type Screen } from './components/GameMenus'
import { SUN_POSITION } from './world'
import { hasSave, startContinue, startNewGame } from './persist'
import { config, type Difficulty } from './config'
import { session } from './controls'
import { startBGM, stopBGM } from './audio'
import { setSelected, HOTBAR_SIZE } from './inventory'
import { useToasts } from './toast'
import './voxel.css'

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
  const [screen, setScreen] = useState<Screen>('title')
  const [panel, setPanel] = useState<null | 'inv' | 'bench'>(null)
  const [canCont, setCanCont] = useState(() => hasSave())
  const prev = useRef<Screen>('title')
  const [, force] = useReducer((c: number) => c + 1, 0)

  useEffect(() => {
    session.playing = screen === 'playing'
    return () => {
      session.playing = false
    }
  }, [screen])

  const relock = () => {
    const c = document.querySelector('canvas') as HTMLCanvasElement | null
    c?.requestPointerLock?.()
  }

  const act = (a: string) => {
    if (a === 'continue') {
      if (startContinue()) setScreen('playing')
    } else if (a === 'new') setScreen('difficulty')
    else if (a.startsWith('diff:')) {
      startNewGame(a.slice(5) as Difficulty)
      setScreen('playing')
    } else if (a === 'settings') {
      prev.current = screen
      setScreen('settings')
    } else if (a === 'help') {
      prev.current = screen
      setScreen('help')
    } else if (a === 'back') setScreen(prev.current === 'paused' ? 'paused' : 'title')
    else if (a === 'resume') {
      setScreen('playing')
      relock()
    } else if (a === 'title') {
      setScreen('title')
      setCanCont(hasSave())
    } else if (a === 'exit') onBack?.()
    else if (a.startsWith('setdiff:')) {
      config.difficulty = a.slice(8) as Difficulty
      force()
    } else if (a === 'bgm') {
      config.bgm = !config.bgm
      if (config.bgm) startBGM()
      else stopBGM()
      force()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panel) {
          setPanel(null)
          relock()
        } else if (screen === 'playing') setScreen('paused')
        return
      }
      if (screen !== 'playing') return
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= HOTBAR_SIZE) setSelected(n - 1)
      else if (e.key === 'e' || e.key === 'E') setPanel((p) => (p ? null : 'inv'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, panel])

  useEffect(() => {
    if (panel && document.pointerLockElement) document.exitPointerLock()
  }, [panel])

  const inWorld = screen === 'playing' || screen === 'paused'

  return (
    <div className="game-container">
      {screen === 'playing' && (
        <div className="ui-overlay">
          <div className="instructions compact">
            <span>左:破壊 ｜ 右:設置 ｜ 1-9:選択 ｜ E:クラフト ｜ Esc:ポーズ</span>
          </div>
          {onBack && (
            <button className="voxel-back" onClick={onBack}>
              ← 広場
            </button>
          )}
          {!panel && <div className="crosshair" />}
          <Hotbar />
          <Toasts />
        </div>
      )}
      {screen === 'playing' && !panel && <MobileControls onCraft={() => setPanel('inv')} />}
      {panel && <CraftPanel atWorkbench={panel === 'bench'} onClose={() => { setPanel(null); relock() }} />}
      {screen !== 'playing' && <GameMenus screen={screen} canContinue={canCont} hasExit={!!onBack} onAct={act} />}

      {inWorld && (
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
      )}
    </div>
  )
}
