// ─────────────────────────────────────────────────────────────────────────────
// Crafting recipes (original recipes for this game's materials). Add freely.
// requiresWorkbench:false recipes are hand-craftable from the inventory (E);
// the rest only appear at a placed workbench.
// ─────────────────────────────────────────────────────────────────────────────
import type { ItemId } from './itemDefs'

export type Category = '素材' | '建築' | '道具' | '小物'

export interface Recipe {
  id: string
  result: ItemId
  count: number
  ingredients: { id: ItemId; n: number }[]
  requiresWorkbench: boolean
  category: Category
}

export const RECIPES: Recipe[] = [
  // ── 素材 ──
  { id: 'planks', result: 'planks', count: 4, ingredients: [{ id: 'wood', n: 1 }], requiresWorkbench: false, category: '素材' },
  { id: 'glass', result: 'glass', count: 2, ingredients: [{ id: 'sand', n: 2 }, { id: 'stone', n: 1 }], requiresWorkbench: true, category: '素材' },
  { id: 'brick', result: 'brick', count: 2, ingredients: [{ id: 'dirt', n: 2 }, { id: 'stone', n: 1 }], requiresWorkbench: true, category: '素材' },

  // ── 建築 ──
  { id: 'workbench', result: 'workbench', count: 1, ingredients: [{ id: 'planks', n: 4 }], requiresWorkbench: false, category: '建築' },

  // ── 道具 ──
  { id: 'pickaxe', result: 'pickaxe', count: 1, ingredients: [{ id: 'planks', n: 2 }, { id: 'stone', n: 3 }], requiresWorkbench: true, category: '道具' },
  { id: 'axe', result: 'axe', count: 1, ingredients: [{ id: 'planks', n: 2 }, { id: 'stone', n: 2 }], requiresWorkbench: true, category: '道具' },
  { id: 'shovel', result: 'shovel', count: 1, ingredients: [{ id: 'planks', n: 2 }, { id: 'stone', n: 1 }], requiresWorkbench: true, category: '道具' },
  { id: 'bucket', result: 'bucket', count: 1, ingredients: [{ id: 'stone', n: 3 }, { id: 'planks', n: 1 }], requiresWorkbench: true, category: '道具' },

  // ── 小物 ──
  { id: 'torch', result: 'torch', count: 4, ingredients: [{ id: 'wood', n: 1 }, { id: 'leaf', n: 1 }], requiresWorkbench: true, category: '小物' },
  { id: 'ladder', result: 'ladder', count: 3, ingredients: [{ id: 'planks', n: 2 }], requiresWorkbench: true, category: '小物' },
  { id: 'pebble', result: 'pebble', count: 4, ingredients: [{ id: 'stone', n: 2 }], requiresWorkbench: true, category: '小物' },
  { id: 'flower', result: 'flower', count: 1, ingredients: [{ id: 'leaf', n: 1 }], requiresWorkbench: true, category: '小物' },
  { id: 'bed', result: 'bed', count: 1, ingredients: [{ id: 'planks', n: 3 }, { id: 'leaf', n: 3 }], requiresWorkbench: true, category: '建築' },
]
