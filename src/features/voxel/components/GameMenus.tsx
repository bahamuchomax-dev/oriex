import { config, DIFFICULTY_LABEL, type Difficulty } from '../config'

export type Screen = 'title' | 'difficulty' | 'help' | 'settings' | 'playing' | 'paused'
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

export function GameMenus({
  screen,
  canContinue,
  hasExit,
  onAct,
}: {
  screen: Screen
  canContinue: boolean
  hasExit: boolean
  onAct: (action: string) => void
}) {
  return (
    <div className="menu-overlay">
      {screen !== 'paused' && <div className="menu-bg" />}
      <div className="menu-card">
        {screen === 'title' && (
          <>
            <h1 className="menu-title">ボクセル ワールド</h1>
            <button className="menu-btn" disabled={!canContinue} onClick={() => onAct('continue')}>続きから</button>
            <button className="menu-btn primary" onClick={() => onAct('new')}>初めから</button>
            <button className="menu-btn" onClick={() => onAct('settings')}>設定</button>
            <button className="menu-btn" onClick={() => onAct('help')}>操作説明</button>
          </>
        )}

        {screen === 'difficulty' && (
          <>
            <h2 className="menu-h2">難易度をえらぶ</h2>
            {DIFFS.map((d) => (
              <button key={d} className="menu-btn primary" onClick={() => onAct('diff:' + d)}>{DIFFICULTY_LABEL[d]}</button>
            ))}
            <button className="menu-btn ghost" onClick={() => onAct('back')}>戻る</button>
          </>
        )}

        {screen === 'settings' && (
          <>
            <h2 className="menu-h2">設定</h2>
            <div className="menu-row">
              <span>難易度</span>
              <div className="seg">
                {DIFFS.map((d) => (
                  <button key={d} className={`seg-btn ${config.difficulty === d ? 'on' : ''}`} onClick={() => onAct('setdiff:' + d)}>{DIFFICULTY_LABEL[d]}</button>
                ))}
              </div>
            </div>
            <div className="menu-row">
              <span>BGM</span>
              <button className={`seg-btn ${config.bgm ? 'on' : ''}`} onClick={() => onAct('bgm')}>{config.bgm ? 'ON' : 'OFF'}</button>
            </div>
            <button className="menu-btn ghost" onClick={() => onAct('back')}>戻る</button>
          </>
        )}

        {screen === 'help' && (
          <>
            <h2 className="menu-h2">操作説明</h2>
            <div className="help-cols">
              <div>
                <h3>PC</h3>
                <ul>
                  <li>WASD / 矢印: 移動</li>
                  <li>マウス: 視点</li>
                  <li>左: 破壊 / 右: 設置</li>
                  <li>1-9: 選択 / E: クラフト</li>
                  <li>Space: ジャンプ / Esc: ポーズ</li>
                </ul>
              </div>
              <div>
                <h3>スマホ</h3>
                <ul>
                  <li>左スティック: 移動</li>
                  <li>右スワイプ: 視点</li>
                  <li>壊 / 置 / 跳 / 作: ボタン</li>
                  <li>下のスロット: 選択</li>
                </ul>
              </div>
            </div>
            <button className="menu-btn ghost" onClick={() => onAct('back')}>戻る</button>
          </>
        )}

        {screen === 'paused' && (
          <>
            <h2 className="menu-h2">ポーズ</h2>
            <button className="menu-btn primary" onClick={() => onAct('resume')}>再開</button>
            <button className="menu-btn" onClick={() => onAct('settings')}>設定</button>
            <button className="menu-btn" onClick={() => onAct('help')}>操作説明</button>
            <button className="menu-btn" onClick={() => onAct('title')}>タイトルへ</button>
            {hasExit && <button className="menu-btn ghost" onClick={() => onAct('exit')}>広場へ戻る</button>}
          </>
        )}
      </div>
    </div>
  )
}
