import { inv, useInventory, count, setSelected } from '../inventory'
import { def } from '../itemDefs'

export function Hotbar() {
  useInventory()
  return (
    <div className="hotbar">
      {inv.hotbar.map((id, i) => (
        <div
          key={i}
          className={`slot ${inv.selected === i ? 'active' : ''}`}
          style={{ pointerEvents: 'auto' }}
          onClick={() => setSelected(i)}
        >
          <span className="num">{i + 1}</span>
          {id ? (
            <>
              <span className="swatch" style={{ background: def(id).swatch }} />
              <span className="label">{def(id).name}</span>
              <span className="qty">{count(id)}</span>
            </>
          ) : (
            <span className="swatch empty" />
          )}
        </div>
      ))}
    </div>
  )
}
