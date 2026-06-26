// Player health (subscribable store). Hearts UI reads it; mobs damage it.
import { useSyncExternalStore } from 'react'

export const MAX_HP = 10
export const player = { hp: MAX_HP, hitId: 0, respawn: false }

let version = 0
const ls = new Set<() => void>()
const emit = () => {
  version++
  ls.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  ls.add(l)
  return () => {
    ls.delete(l)
  }
}
export const usePlayerHp = () => useSyncExternalStore(subscribe, () => version)

export function hurtPlayer(dmg: number) {
  if (player.respawn || dmg <= 0) return
  player.hp = Math.max(0, player.hp - dmg)
  player.hitId++ // re-triggers the red flash
  emit()
  if (player.hp <= 0) player.respawn = true
}
export function healPlayer(amt: number) {
  player.hp = Math.min(MAX_HP, player.hp + amt)
  emit()
}
export function resetHp() {
  player.hp = MAX_HP
  player.respawn = false
  emit()
}
