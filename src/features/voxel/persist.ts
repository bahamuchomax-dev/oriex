// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence. The world is chunked & reproducible from a seed, so
// we save only the seed + the player's edit diff + placed decorations (plus
// inventory, drops, health, time, settings) — not every block.
// ─────────────────────────────────────────────────────────────────────────────
import { seed, setSeed, decorations, type DecorKind } from './world'
import { serializeInv, loadInv, addItem, inv, bump, setOnChange } from './inventory'
import { serializeDrops, loadDrops, drops } from './drops'
import { serializeEdits, loadEdits, resetChunks, updateStreaming } from './chunks'
import { config, type Difficulty } from './config'
import { player, resetHp } from './playerState'
import { time } from './time'
import { clearMobs } from './mobs'
import type { ItemId } from './itemDefs'
import type { BlockType } from './world'

const KEY = 'mc_save_v2'
let pending = false
let wired = false

export const hasSave = (): boolean => {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export function saveNow() {
  try {
    const data = {
      v: 2,
      seed,
      edits: serializeEdits(),
      decor: [...decorations.entries()],
      inv: serializeInv(),
      drops: serializeDrops(),
      hp: player.hp,
      t: time.t,
      difficulty: config.difficulty,
      bgm: config.bgm,
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable — ignore */
  }
}

export function markDirty() {
  if (pending) return
  pending = true
  window.setTimeout(() => {
    pending = false
    saveNow()
  }, 800)
}

function wireAutosave() {
  if (wired) return
  wired = true
  setOnChange(markDirty)
  window.addEventListener('beforeunload', saveNow)
}

// 続きから
export function startContinue(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as {
      seed: number
      edits: [string, BlockType | 0][]
      decor: [string, DecorKind][]
      inv: { items: [ItemId, number][]; hotbar: (ItemId | null)[]; selected: number }
      drops?: [ItemId, number, number, number, number][]
      hp?: number
      t?: number
      difficulty?: Difficulty
      bgm?: boolean
    }
    resetChunks()
    clearMobs()
    setSeed(data.seed ?? 1337)
    loadEdits(data.edits ?? [])
    decorations.clear()
    for (const [k, v] of data.decor ?? []) decorations.set(k, v)
    loadInv(data.inv)
    if (data.drops) loadDrops(data.drops)
    if (typeof data.hp === 'number') player.hp = data.hp
    if (typeof data.t === 'number') time.t = data.t
    if (data.difficulty) config.difficulty = data.difficulty
    if (typeof data.bgm === 'boolean') config.bgm = data.bgm
    updateStreaming(0, 0) // load spawn chunks (applies edits)
    wireAutosave()
    return true
  } catch {
    return false
  }
}

// 初めから
export function startNewGame(difficulty: Difficulty) {
  config.difficulty = difficulty
  setSeed((Math.random() * 1e9) | 0)
  resetChunks()
  clearMobs()
  decorations.clear()
  inv.items.clear()
  inv.hotbar.fill(null)
  inv.selected = 0
  drops.length = 0
  resetHp()
  time.t = 0.3
  addItem('dirt', 5)
  addItem('wood', 3)
  addItem('stone', 3)
  bump()
  updateStreaming(0, 0) // generate spawn chunks
  wireAutosave()
  saveNow()
}
