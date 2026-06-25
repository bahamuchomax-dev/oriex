// ─────────────────────────────────────────────────────────────────────────────
// Inventory + hotbar state (a tiny external store React subscribes to).
// Counts are the source of truth; the hotbar holds item ids the player owns.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react'
import { type ItemId } from './itemDefs'
import { type Recipe } from './recipes'

export const HOTBAR_SIZE = 9

export const inv = {
  items: new Map<ItemId, number>(),
  hotbar: new Array<ItemId | null>(HOTBAR_SIZE).fill(null),
  selected: 0,
}

let version = 0
const listeners = new Set<() => void>()
let onChange: (() => void) | null = null // persist hook

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function setOnChange(fn: () => void) {
  onChange = fn
}
function emit() {
  version++
  listeners.forEach((l) => l())
  onChange?.()
}
export function bump() {
  emit()
}

export const useInventory = () => useSyncExternalStore(subscribe, () => version)

// ── queries ──
export const count = (id: ItemId) => inv.items.get(id) ?? 0
export const has = (id: ItemId, n = 1) => count(id) >= n
export const selectedItem = (): ItemId | null => inv.hotbar[inv.selected] ?? null

// ── mutations ──
export function addItem(id: ItemId, n = 1) {
  inv.items.set(id, count(id) + n)
  // surface newly-acquired items in the first empty hotbar slot
  if (!inv.hotbar.includes(id)) {
    const slot = inv.hotbar.indexOf(null)
    if (slot >= 0) inv.hotbar[slot] = id
  }
  emit()
}

export function removeItem(id: ItemId, n = 1) {
  const c = count(id) - n
  if (c <= 0) {
    inv.items.delete(id)
    for (let i = 0; i < inv.hotbar.length; i++) if (inv.hotbar[i] === id) inv.hotbar[i] = null
  } else {
    inv.items.set(id, c)
  }
  emit()
}

export function setSelected(i: number) {
  inv.selected = ((i % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE
  emit()
}

export function assignToHotbar(slot: number, id: ItemId | null) {
  if (slot < 0 || slot >= HOTBAR_SIZE) return
  // if the item is already on the bar elsewhere, clear that slot (no dupes)
  if (id) for (let i = 0; i < inv.hotbar.length; i++) if (inv.hotbar[i] === id) inv.hotbar[i] = null
  inv.hotbar[slot] = id
  emit()
}

// ── crafting ──
export function maxCraft(r: Recipe, atWorkbench: boolean): number {
  if (r.requiresWorkbench && !atWorkbench) return 0
  let m = Infinity
  for (const ing of r.ingredients) m = Math.min(m, Math.floor(count(ing.id) / ing.n))
  return m === Infinity ? 0 : m
}
export const canCraft = (r: Recipe, atWorkbench: boolean) => maxCraft(r, atWorkbench) >= 1

export function craft(r: Recipe, times: number, atWorkbench: boolean): boolean {
  if (times <= 0 || maxCraft(r, atWorkbench) < times) return false
  for (const ing of r.ingredients) {
    const left = count(ing.id) - ing.n * times
    if (left <= 0) {
      inv.items.delete(ing.id)
      for (let i = 0; i < inv.hotbar.length; i++) if (inv.hotbar[i] === ing.id) inv.hotbar[i] = null
    } else inv.items.set(ing.id, left)
  }
  inv.items.set(r.result, count(r.result) + r.count * times)
  if (!inv.hotbar.includes(r.result)) {
    const slot = inv.hotbar.indexOf(null)
    if (slot >= 0) inv.hotbar[slot] = r.result
  }
  emit()
  return true
}

// ── (de)serialization ──
export function serializeInv() {
  return { items: [...inv.items.entries()], hotbar: inv.hotbar, selected: inv.selected }
}
export function loadInv(s: { items: [ItemId, number][]; hotbar: (ItemId | null)[]; selected: number }) {
  inv.items.clear()
  for (const [k, v] of s.items) inv.items.set(k, v)
  inv.hotbar = s.hotbar.slice(0, HOTBAR_SIZE)
  while (inv.hotbar.length < HOTBAR_SIZE) inv.hotbar.push(null)
  inv.selected = s.selected ?? 0
  emit()
}
