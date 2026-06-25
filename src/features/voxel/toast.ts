// Tiny transient on-screen notifications ("土 +1") shown at the screen edge.
import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  text: string
}

let items: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const getToasts = () => items

export function pushToast(text: string) {
  const id = nextId++
  items = [...items, { id, text }]
  emit()
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 1600)
}

export const useToasts = () => useSyncExternalStore(subscribe, getToasts)
