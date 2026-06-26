// ─────────────────────────────────────────────────────────────────────────────
// Unified item registry. An item may be a placeable block, a placeable
// decoration, a tool, or a plain material. Item ids double as inventory keys.
// ─────────────────────────────────────────────────────────────────────────────
import {
  GRASS, DIRT, STONE, WOOD, LEAF, SAND, PLANKS, BRICK, GLASS, WORKBENCH,
  type BlockType, type DecorKind,
} from './world'

export type Tool = 'axe' | 'shovel' | 'pickaxe' | 'bucket'
export type ItemId =
  | 'dirt' | 'stone' | 'wood' | 'leaf' | 'grass' | 'sand'
  | 'planks' | 'brick' | 'glass' | 'workbench'
  | 'torch' | 'ladder' | 'flower' | 'pebble' | 'bed'
  | 'axe' | 'shovel' | 'pickaxe' | 'bucket'
  | 'stick' | 'seed'

export interface ItemDef {
  id: ItemId
  name: string
  placesBlock?: BlockType
  placesDecor?: DecorKind
  tool?: Tool
  swatch: string // CSS background for hotbar / inventory icon
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  grass: { id: 'grass', name: '草', placesBlock: GRASS, swatch: 'linear-gradient(#7cc349 0 38%,#8a6a3f 38% 100%)' },
  dirt: { id: 'dirt', name: '土', placesBlock: DIRT, swatch: '#7a5230' },
  stone: { id: 'stone', name: '石', placesBlock: STONE, swatch: '#8f9094' },
  wood: { id: 'wood', name: '原木', placesBlock: WOOD, swatch: 'repeating-linear-gradient(90deg,#5a4326 0 3px,#6b5030 3px 6px)' },
  leaf: { id: 'leaf', name: '葉', placesBlock: LEAF, swatch: 'radial-gradient(circle at 30% 30%,#6bbf4d,#3f8c33 70%)' },
  sand: { id: 'sand', name: '砂', placesBlock: SAND, swatch: '#d6c98c' },
  planks: { id: 'planks', name: '板材', placesBlock: PLANKS, swatch: 'repeating-linear-gradient(0deg,#b08247 0 5px,#9c7038 5px 7px)' },
  brick: { id: 'brick', name: 'レンガ', placesBlock: BRICK, swatch: 'repeating-linear-gradient(0deg,#a84e3c 0 4px,#7d2f22 4px 5px)' },
  glass: { id: 'glass', name: 'ガラス', placesBlock: GLASS, swatch: 'linear-gradient(135deg,rgba(200,230,240,.85),rgba(150,200,220,.5))' },
  workbench: { id: 'workbench', name: '作業台', placesBlock: WORKBENCH, swatch: 'linear-gradient(#7d5d34 0 35%,#9c7038 35% 100%)' },

  torch: { id: 'torch', name: 'たいまつ', placesDecor: 'torch', swatch: 'linear-gradient(#ffcf57 0 30%,#6b4a2a 30% 100%)' },
  bed: { id: 'bed', name: 'ベッド', placesDecor: 'bed', swatch: 'linear-gradient(#c0444f 0 60%,#f3f0e8 60% 100%)' },
  ladder: { id: 'ladder', name: 'はしご', placesDecor: 'ladder', swatch: 'repeating-linear-gradient(0deg,#8a6a3f 0 3px,transparent 3px 6px)' },
  flower: { id: 'flower', name: '花', placesDecor: 'flower', swatch: 'radial-gradient(circle at 50% 35%,#ff6b9d 30%,#3f8c33 32%)' },
  pebble: { id: 'pebble', name: '小石', placesDecor: 'pebble', swatch: 'radial-gradient(circle,#b8babf,#7d7f86)' },

  axe: { id: 'axe', name: '斧', tool: 'axe', swatch: 'linear-gradient(135deg,#b9bcc2 0 45%,#6b4a2a 45% 100%)' },
  shovel: { id: 'shovel', name: 'スコップ', tool: 'shovel', swatch: 'linear-gradient(#b9bcc2 0 40%,#6b4a2a 40% 100%)' },
  pickaxe: { id: 'pickaxe', name: 'ツルハシ', tool: 'pickaxe', swatch: 'linear-gradient(135deg,#b9bcc2 0 35%,#6b4a2a 35% 100%)' },
  bucket: { id: 'bucket', name: 'バケツ', tool: 'bucket', swatch: 'linear-gradient(#cfd2d8,#9aa0a8)' },

  stick: { id: 'stick', name: '枝', swatch: '#7a5a30' },
  seed: { id: 'seed', name: '草の種', swatch: '#9bcb5a' },
}

export const def = (id: ItemId) => ITEM_DEFS[id]
export const isTool = (id: ItemId) => !!ITEM_DEFS[id].tool
export const isPlaceable = (id: ItemId) =>
  ITEM_DEFS[id].placesBlock !== undefined || ITEM_DEFS[id].placesDecor !== undefined

// Which item(s) a broken block drops: [itemId, count, chance]
export const BLOCK_DROPS: Record<number, [ItemId, number, number][]> = {
  [GRASS]: [['dirt', 1, 1], ['seed', 1, 0.15]],
  [DIRT]: [['dirt', 1, 1]],
  [STONE]: [['stone', 1, 1]],
  [WOOD]: [['wood', 1, 1]],
  [LEAF]: [['leaf', 1, 1], ['stick', 1, 0.2]],
  [SAND]: [['sand', 1, 1]],
  [PLANKS]: [['planks', 1, 1]],
  [BRICK]: [['brick', 1, 1]],
  [GLASS]: [['glass', 1, 0.4]],
  [WORKBENCH]: [['workbench', 1, 1]],
}

// Map a placed BlockType back to the tool that mines it fastest (for break time)
export const EFFECTIVE: Record<string, BlockType[]> = {
  axe: [WOOD, LEAF, PLANKS, WORKBENCH],
  shovel: [GRASS, DIRT, SAND],
  pickaxe: [STONE, BRICK, GLASS],
}

// Base break time per block (seconds)
const BASE: Record<number, number> = {
  [GRASS]: 0.45, [DIRT]: 0.55, [LEAF]: 0.4, [WOOD]: 1.0, [STONE]: 1.4,
  [SAND]: 0.5, [PLANKS]: 0.8, [BRICK]: 1.5, [GLASS]: 0.4, [WORKBENCH]: 0.9,
}
export function breakTimeFor(block: BlockType, heldTool: Tool | undefined): number {
  const base = BASE[block] ?? 0.6
  if (heldTool && EFFECTIVE[heldTool]?.includes(block)) return base * 0.4
  return base
}
