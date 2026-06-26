// ─────────────────────────────────────────────────────────────────────────────
// Tiny Web Audio sound effects (no external files). Soft mining "tick" sounds
// per tool and a stronger break sound. The context is created lazily on the
// first call (which happens after a user gesture, so it is allowed to start).
// ─────────────────────────────────────────────────────────────────────────────
import type { Tool } from './itemDefs'
import { GRASS, DIRT, STONE, WOOD, LEAF, type BlockType } from './world'
import { config } from './config'

let ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, peak: number) {
  const a = getCtx()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  const t = a.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, peak: number, cutoff: number) {
  const a = getCtx()
  if (!a) return
  const n = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const g = a.createGain()
  g.gain.value = peak
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

// light repeated hit while mining — timbre varies per tool
export function playHit(tool?: Tool) {
  if (tool === 'pickaxe') tone(300, 0.06, 'square', 0.05)
  else if (tool === 'axe') tone(170, 0.07, 'square', 0.05)
  else if (tool === 'shovel') noise(0.05, 0.04, 900)
  else tone(210, 0.05, 'triangle', 0.045)
}

// stronger sound when a block finally breaks — timbre matches the material
export function playBreak(block?: BlockType, _tool?: Tool) {
  switch (block) {
    case STONE: // sharp, clacky shatter
      noise(0.16, 0.08, 2600)
      tone(220, 0.1, 'square', 0.04)
      break
    case WOOD: // low woody thud
      noise(0.16, 0.06, 900)
      tone(120, 0.14, 'square', 0.05)
      break
    case LEAF: // soft high rustle
      noise(0.14, 0.05, 5000)
      break
    case GRASS: // soft, earthy
    case DIRT:
      noise(0.16, 0.07, 700)
      tone(110, 0.1, 'sine', 0.035)
      break
    default:
      noise(0.16, 0.07, 1200)
      tone(150, 0.12, 'square', 0.04)
  }
}

// soft thud when placing a block
export function playPlace() {
  tone(160, 0.07, 'sine', 0.05)
}

// short blip when an item is collected
export function playPickup() {
  tone(660, 0.05, 'triangle', 0.045)
  tone(990, 0.05, 'triangle', 0.035)
}

// soft footstep — short low filtered noise burst, slight random pitch
export function playStep() {
  const a = getCtx()
  if (!a) return
  const dur = 0.07
  const n = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 380 + Math.random() * 120
  const g = a.createGain()
  g.gain.value = 0.05
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

// hit a mob (soft squish)
export function playEnemyHit() {
  tone(180, 0.08, 'square', 0.05)
}
// mob defeated (pop)
export function playEnemyDie() {
  noise(0.16, 0.07, 1400)
  tone(140, 0.12, 'square', 0.05)
}
// player takes damage (low thud)
export function playHurt() {
  tone(90, 0.16, 'sawtooth', 0.06)
}
// friendly critter chirp
export function playChirp() {
  tone(880, 0.05, 'triangle', 0.04)
  tone(1175, 0.05, 'triangle', 0.03)
}

// ── gentle ambient BGM (procedural, low volume) ──────────────────────────────
let bgmTimer: number | null = null
let bgmStep = 0
export function startBGM() {
  if (!config.bgm) return
  const a = getCtx()
  if (!a || bgmTimer !== null) return
  const master = a.createGain()
  master.gain.value = 0.045
  master.connect(a.destination)
  // soft A-minor-ish palette
  const arp = [220, 262, 294, 330, 392, 330, 294, 262]
  const bass = [110, 110, 98, 131]
  const beat = 0.62
  const voice = (freq: number, t: number, dur: number, type: OscillatorType, peak: number) => {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.06)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  bgmTimer = window.setInterval(() => {
    const ctx = getCtx()
    if (!ctx) return
    const t = ctx.currentTime + 0.05
    voice(arp[bgmStep % arp.length], t, beat * 1.4, 'triangle', 0.5)
    if (bgmStep % 4 === 0) voice(bass[(bgmStep / 4) % bass.length], t, beat * 3, 'sine', 0.7)
    bgmStep++
  }, beat * 1000)
}
export function stopBGM() {
  if (bgmTimer !== null) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
}
