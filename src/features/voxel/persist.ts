// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence. Saves the full world (blocks, water, decorations)
// and the inventory/hotbar, debounced. Block data stays the single source of
// truth — visuals are always rebuilt from it after a load.
// ─────────────────────────────────────────────────────────────────────────────
import { serializeWorld, loadWorld, generateWorld, type WorldSave } from './world'
import { serializeInv, loadInv, addItem, setOnChange } from './inventory'
import { serializeDrops, loadDrops } from './drops'
import type { ItemId } from './itemDefs'

const KEY = 'mc_save_v1'
let pending = false

export function saveNow() {
  try {
    const data = { v: 1, world: serializeWorld(), inv: serializeInv(), drops: serializeDrops() }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage full / unavailable — ignore */
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

export function initGame() {
  let loaded = false
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw) as {
        world: WorldSave
        inv: { items: [ItemId, number][]; hotbar: (ItemId | null)[]; selected: number }
        drops?: [ItemId, number, number, number, number][]
      }
      loadWorld(data.world)
      loadInv(data.inv)
      if (data.drops) loadDrops(data.drops)
      loaded = true
    }
  } catch {
    loaded = false
  }

  if (!loaded) {
    generateWorld() // (already auto-generated at import; guarded no-op if so)
    // a few starter materials so the crafting loop is testable immediately
    addItem('dirt', 5)
    addItem('wood', 3)
    addItem('stone', 3)
  }

  setOnChange(markDirty)
  window.addEventListener('beforeunload', saveNow)
}
