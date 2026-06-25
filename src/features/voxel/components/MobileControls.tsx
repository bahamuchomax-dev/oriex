import { useRef, type TouchEvent } from 'react'
import { touch } from '../controls'

// On-screen controls for touch devices: left joystick to move, drag the screen
// to look, and buttons for jump / break / place / craft. Hidden on desktop.
export function MobileControls({ onCraft }: { onCraft: () => void }) {
  const joyRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const joyId = useRef<number | null>(null)
  const lookId = useRef<number | null>(null)
  const lookLast = useRef({ x: 0, y: 0 })

  if (!touch.supported) return null

  const updateJoy = (t: React.Touch) => {
    const el = joyRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = (t.clientX - cx) / (r.width / 2)
    let dy = (t.clientY - cy) / (r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > 1) { dx /= len; dy /= len }
    touch.mx = dx
    touch.my = dy
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * 28}px,${dy * 28}px)`
  }

  const onJoyStart = (e: TouchEvent) => {
    touch.active = true
    const t = e.changedTouches[0]
    joyId.current = t.identifier
    updateJoy(t)
  }
  const onJoyMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === joyId.current) updateJoy(t)
    }
  }
  const onJoyEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyId.current) {
        joyId.current = null
        touch.mx = 0
        touch.my = 0
        if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
      }
    }
  }

  const onLookStart = (e: TouchEvent) => {
    touch.active = true
    const t = e.changedTouches[0]
    lookId.current = t.identifier
    lookLast.current = { x: t.clientX, y: t.clientY }
  }
  const onLookMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === lookId.current) {
        touch.lookDX += t.clientX - lookLast.current.x
        touch.lookDY += t.clientY - lookLast.current.y
        lookLast.current = { x: t.clientX, y: t.clientY }
      }
    }
  }
  const onLookEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookId.current) lookId.current = null
    }
  }

  return (
    <>
      <div
        className="look-zone"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
      />
      <div
        ref={joyRef}
        className="joy"
        onTouchStart={onJoyStart}
        onTouchMove={onJoyMove}
        onTouchEnd={onJoyEnd}
        onTouchCancel={onJoyEnd}
      >
        <div ref={knobRef} className="joy-knob" />
      </div>
      <div className="touch-btns">
        <button className="tbtn" onTouchStart={(e) => { e.preventDefault(); touch.active = true; onCraft() }}>作</button>
        <button className="tbtn" onTouchStart={(e) => { e.preventDefault(); touch.active = true; touch.placePulse++ }}>置</button>
        <button
          className="tbtn break"
          onTouchStart={(e) => { e.preventDefault(); touch.active = true; touch.breaking = true }}
          onTouchEnd={() => { touch.breaking = false }}
          onTouchCancel={() => { touch.breaking = false }}
        >
          壊
        </button>
        <button
          className="tbtn jump"
          onTouchStart={(e) => { e.preventDefault(); touch.active = true; touch.jump = true }}
          onTouchEnd={() => { touch.jump = false }}
          onTouchCancel={() => { touch.jump = false }}
        >
          跳
        </button>
      </div>
    </>
  )
}
