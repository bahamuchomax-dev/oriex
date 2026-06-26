// Game-wide config (difficulty etc.). Persisted via persist.ts.
export type Difficulty = 'easy' | 'normal' | 'hard'

export const config: { difficulty: Difficulty; bgm: boolean } = {
  difficulty: 'normal',
  bgm: true,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'やさしい',
  normal: 'ふつう',
  hard: 'むずかしい',
}

// Tuning per difficulty (used by mobs / regen later).
export const DIFFICULTY_SCALE: Record<Difficulty, { enemies: number; enemyHp: number; enemyDmg: number; regen: number }> = {
  easy: { enemies: 0.5, enemyHp: 0.7, enemyDmg: 0.6, regen: 1.5 },
  normal: { enemies: 1, enemyHp: 1, enemyDmg: 1, regen: 1 },
  hard: { enemies: 1.6, enemyHp: 1.4, enemyDmg: 1.5, regen: 0.6 },
}
