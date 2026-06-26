import { player, usePlayerHp, MAX_HP } from '../playerState'

export function Hud() {
  usePlayerHp()
  const hp = player.hp
  return (
    <>
      <div className="hp-bar">
        {Array.from({ length: MAX_HP }).map((_, i) => (
          <span key={i} className={`pip ${i < hp ? 'on' : 'off'}`} />
        ))}
      </div>
      {player.hitId > 0 && <div key={player.hitId} className="hurt-flash" />}
    </>
  )
}
