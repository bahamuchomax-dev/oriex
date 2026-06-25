import { RECIPES } from '../recipes'
import { def } from '../itemDefs'
import {
  inv, useInventory, count, craft, canCraft, maxCraft, assignToHotbar,
} from '../inventory'

export function CraftPanel({
  atWorkbench,
  onClose,
}: {
  atWorkbench: boolean
  onClose: () => void
}) {
  useInventory()
  const recipes = RECIPES.filter((r) => atWorkbench || !r.requiresWorkbench)
  const owned = [...inv.items.entries()].filter(([, n]) => n > 0)

  return (
    <div className="craft-overlay" onClick={onClose}>
      <div className="craft-panel" onClick={(e) => e.stopPropagation()}>
        <div className="craft-head">
          <h2>{atWorkbench ? '作業台' : '持ち物'}</h2>
          <button className="craft-close" onClick={onClose}>
            × 閉じる (E)
          </button>
        </div>

        <div className="craft-body">
          {/* left: owned materials (click → put on the selected hotbar slot) */}
          <div className="craft-left">
            <h3>所持素材</h3>
            <p className="hint">クリックで選択中スロット{inv.selected + 1}にセット</p>
            <div className="mat-grid">
              {owned.length === 0 && <p className="empty-note">なし</p>}
              {owned.map(([id, n]) => (
                <div key={id} className="mat-cell" title={`${def(id).name} をスロットへ`} onClick={() => assignToHotbar(inv.selected, id)}>
                  <span className="swatch" style={{ background: def(id).swatch }} />
                  <span className="mat-name">{def(id).name}</span>
                  <span className="qty">{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right: recipes */}
          <div className="craft-right">
            <h3>作れるもの{atWorkbench ? '' : '（手作り）'}</h3>
            <div className="recipe-list">
              {recipes.map((r) => {
                const ok = canCraft(r, atWorkbench)
                const max = maxCraft(r, atWorkbench)
                return (
                  <div key={r.id} className={`recipe ${ok ? '' : 'dim'}`}>
                    <div className="recipe-result">
                      <span className="swatch" style={{ background: def(r.result).swatch }} />
                      <span>{def(r.result).name} ×{r.count}</span>
                      <span className="cat">{r.category}</span>
                    </div>
                    <div className="recipe-ing">
                      {r.ingredients.map((ing) => (
                        <span key={ing.id} className={count(ing.id) >= ing.n ? 'have' : 'lack'}>
                          {def(ing.id).name} {count(ing.id)}/{ing.n}
                        </span>
                      ))}
                    </div>
                    <div className="recipe-actions">
                      <button disabled={!ok} onClick={() => craft(r, 1, atWorkbench)}>作る</button>
                      <button disabled={max < 2} onClick={() => craft(r, max, atWorkbench)}>×{Math.max(max, 1)}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
