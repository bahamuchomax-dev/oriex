// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence + new-game / continue entry points. The world is no
// longer auto-generated at import; the title screen calls startContinue() or
// startNewGame(). Block data stays the single source of truth.
// ─────────────────────────────────────────────────────────────────────────────
import { serializeWorld, loadWorld, generateWorld, resetWorld, type WorldSave } from './world'
import { serializeInv, loadInv, addItem, inv, bump } from './inventory'
import { serializeDrops, loadDrops, drops } from './drops'
import { setOnChange } from './inventory'
import { config, type Difficulty } from './config'
import type { ItemId } from './itemDefs'

const KEY = 'mc_save_v1'
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
      v: 1,
      world: serializeWorld(),
      inv: serializeInv(),
      drops: serializeDrops(),
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

// 続きから — load the saved world/inventory/drops. Returns false if no save.
export function startContinue(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as {
      world: WorldSave
      inv: { items: [ItemId, number][]; hotbar: (ItemId | null)[]; selected: number }
      drops?: [ItemId, number, number, number, number][]
      difficulty?: Difficulty
      bgm?: boolean
    }
    loadWorld(data.world)
    loadInv(data.inv)
    if (data.drops) loadDrops(data.drops)
    if (data.difficulty) config.difficulty = data.difficulty
    if (typeof data.bgm === 'boolean') config.bgm = data.bgm
    wireAutosave()
    return true
  } catch {
    return false
  }
}

// 初めから — fresh world at the chosen difficulty (overwrites the save).
export function startNewGame(difficulty: Difficulty) {
  config.difficulty = difficulty
  resetWorld()
  generateWorld()
  inv.items.clear()
  inv.hotbar.fill(null)
  inv.selected = 0
  drops.length = 0
  addItem('dirt', 5)
  addItem('wood', 3)
  addItem('stone', 3)
  bump()
  wireAutosave()
  saveNow()
}
