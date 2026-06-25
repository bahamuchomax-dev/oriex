// ─────────────────────────────────────────────────────────────────────────────
// Procedural block textures drawn to a small CanvasTexture (pixel-art style).
// Each type gets subtle per-pixel colour variation so faces never look flat.
// Generated once and shared; the owner disposes them on unmount.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'

const SIZE = 16

function canvas() {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  return { c, ctx: c.getContext('2d')! }
}

function finalize(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter // crisp blocky pixels up close
  t.minFilter = THREE.NearestMipmapLinearFilter // smooth at distance, cheap
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
const rnd = (a: number) => (Math.random() * 2 - 1) * a
const put = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, g: number, b: number) => {
  ctx.fillStyle = `rgb(${clamp(r) | 0},${clamp(g) | 0},${clamp(b) | 0})`
  ctx.fillRect(x, y, 1, 1)
}

// flat colour + per-pixel brightness jitter, with optional darker speckles
function noiseTile(base: [number, number, number], jitter: number, specks = 0, speckShift = -28) {
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(jitter)
      put(ctx, x, y, base[0] + j, base[1] + j, base[2] + j)
    }
  for (let i = 0; i < specks; i++) {
    const x = (Math.random() * SIZE) | 0
    const y = (Math.random() * SIZE) | 0
    put(ctx, x, y, base[0] + speckShift, base[1] + speckShift, base[2] + speckShift)
  }
  return finalize(c)
}

export const makeGrassTop = () => noiseTile([108, 170, 64], 16, 22, -26)
export const makeDirt = () => noiseTile([124, 86, 52], 16, 26, -30)
export const makeStone = () => noiseTile([142, 142, 148], 12, 30, -26)
export const makeLeaf = () => {
  // mottled green with lighter and darker blotches
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(20)
      put(ctx, x, y, 58 + j, 138 + j, 52 + j)
    }
  for (let i = 0; i < 26; i++) {
    const x = (Math.random() * SIZE) | 0
    const y = (Math.random() * SIZE) | 0
    const lighter = Math.random() < 0.5
    put(ctx, x, y, lighter ? 96 : 40, lighter ? 172 : 108, lighter ? 70 : 40)
  }
  return finalize(c)
}

export const makeGrassSide = () => {
  const { c, ctx } = canvas()
  // dirt body
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(15)
      put(ctx, x, y, 124 + j, 86 + j, 52 + j)
    }
  // grass overhang along the top edge (canvas top == top of the face), jagged
  for (let x = 0; x < SIZE; x++) {
    const h = 4 + ((Math.random() * 3) | 0) // 4..6 px
    for (let y = 0; y < h; y++) {
      const j = rnd(14)
      put(ctx, x, y, 96 + j, 156 + j, 54 + j)
    }
    // a slightly darker green pixel at the fringe for definition
    put(ctx, x, h, 70, 120, 44)
  }
  return finalize(c)
}

export const makeWoodSide = () => {
  const { c, ctx } = canvas()
  for (let x = 0; x < SIZE; x++) {
    const col = rnd(10) + (x % 4 === 0 ? -16 : 0) // vertical grain columns
    for (let y = 0; y < SIZE; y++) {
      const j = rnd(6)
      put(ctx, x, y, 104 + col + j, 70 + col + j, 36 + col + j)
    }
  }
  // a couple of darker vertical streaks
  for (let i = 0; i < 3; i++) {
    const x = (Math.random() * SIZE) | 0
    for (let y = 0; y < SIZE; y++) put(ctx, x, y, 78, 50, 24)
  }
  return finalize(c)
}

export const makeWoodTop = () => {
  const { c, ctx } = canvas()
  const cx = 7.5
  const cy = 7.5
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - cx, y - cy)
      const ring = Math.sin(d * 1.7) * 13 // concentric growth rings
      const j = rnd(5)
      put(ctx, x, y, 132 + ring + j, 96 + ring + j, 52 + ring + j)
    }
  return finalize(c)
}

export const makeSand = () => noiseTile([214, 201, 140], 14, 18, -22)

export const makePlanks = () => {
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(10)
      put(ctx, x, y, 176 + j, 130 + j, 71 + j)
    }
  // horizontal plank seams
  for (const sy of [4, 9, 14]) for (let x = 0; x < SIZE; x++) put(ctx, x, sy, 120, 84, 40)
  // a couple of staggered end-seams
  for (let y = 0; y < 4; y++) put(ctx, 6, y, 120, 84, 40)
  for (let y = 9; y < 14; y++) put(ctx, 11, y, 120, 84, 40)
  return finalize(c)
}

export const makeBrick = () => {
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(10)
      put(ctx, x, y, 168 + j, 78 + j, 60 + j)
    }
  // mortar lines (horizontal every 4px, staggered verticals)
  for (const my of [3, 7, 11, 15]) for (let x = 0; x < SIZE; x++) put(ctx, x, my, 205, 200, 190)
  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / 4)
    const vx = row % 2 === 0 ? 8 : 0
    put(ctx, vx, y, 205, 200, 190)
    put(ctx, (vx + 8) % SIZE, y, 205, 200, 190)
  }
  return finalize(c)
}

export const makeGlass = () => {
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) put(ctx, x, y, 205, 230, 240)
  // pane frame
  ctx.strokeStyle = 'rgb(150,195,215)'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1)
  // a light highlight streak
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.moveTo(3, 12)
  ctx.lineTo(10, 4)
  ctx.stroke()
  return finalize(c)
}

export const makeWorkbenchTop = () => {
  const { c, ctx } = canvas()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const j = rnd(10)
      put(ctx, x, y, 158 + j, 116 + j, 64 + j)
    }
  // a cross of tool-grooves on the work surface
  for (let x = 0; x < SIZE; x++) put(ctx, x, 8, 96, 66, 32)
  for (let y = 0; y < SIZE; y++) put(ctx, 8, y, 96, 66, 32)
  return finalize(c)
}

export const makeWorkbenchSide = () => {
  const t = makePlanks()
  return t
}

// transparent texture with a few green blades, for small grass decorations
export const makeGrassBlade = () => {
  const { c, ctx } = canvas()
  ctx.clearRect(0, 0, SIZE, SIZE)
  const blades = 5
  for (let i = 0; i < blades; i++) {
    const x = 2 + ((Math.random() * (SIZE - 4)) | 0)
    const h = 7 + ((Math.random() * 6) | 0)
    const shade = 120 + ((Math.random() * 50) | 0)
    ctx.fillStyle = `rgb(${(shade * 0.45) | 0},${shade | 0},${(shade * 0.4) | 0})`
    for (let y = 0; y < h; y++) {
      const w = y < h - 2 ? 1 : 1
      ctx.fillRect(x + (y > h / 2 ? 1 : 0), SIZE - 1 - y, w, 1)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// jagged dark cracks on a transparent tile, for the break-progress overlay
export const makeCrackTexture = () => {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 32, 32)
  ctx.strokeStyle = 'rgba(10,10,10,0.95)'
  ctx.lineWidth = 1.4
  const cx = 16
  const cy = 16
  const branches = 6
  for (let b = 0; b < branches; b++) {
    let x = cx
    let y = cy
    let ang = (b / branches) * Math.PI * 2 + (Math.random() - 0.5)
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segs = 4 + ((Math.random() * 3) | 0)
    for (let s = 0; s < segs; s++) {
      ang += (Math.random() - 0.5) * 1.1
      x += Math.cos(ang) * 4
      y += Math.sin(ang) * 4
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  return t
}

// soft radial glow for the sun sprite
export const makeSunGlow = () => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,250,230,1)')
  g.addColorStop(0.25, 'rgba(255,244,200,0.9)')
  g.addColorStop(0.6, 'rgba(255,230,160,0.25)')
  g.addColorStop(1, 'rgba(255,230,160,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
