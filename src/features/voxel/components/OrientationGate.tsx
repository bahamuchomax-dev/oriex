import { useState, useEffect } from 'react'

// Show "rotate to landscape" ONLY when the real viewport is portrait on a touch
// device. We measure innerWidth/innerHeight (not a CSS orientation media query),
// because orientation-lock / fullscreen can make the media query report the
// wrong value — which made the hint appear even in landscape.
export function OrientationGate() {
  const [portrait, setPortrait] = useState(false)

  useEffect(() => {
    const coarse =
      typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
    const check = () =>
      setPortrait(coarse && window.innerHeight > window.innerWidth + 24)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!portrait) return null
  return (
    <div className="rotate-hint">
      <span className="icon">📱</span>
      <span>横画面にしてください</span>
    </div>
  )
}
