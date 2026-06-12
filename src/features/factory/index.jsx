export default function Factory({ navigate }) {
  return (
    <section className="factory-screen">
      <div className="factory-hero">
        <span className="section-chip">Factory</span>
        <h2>学習素材を作る</h2>
        <p>第2フェーズでは、マイワード作成をFactory風の入口として整理しています。</p>
      </div>

      <div className="factory-flow">
        <article className="factory-flow-card">
          <span className="factory-number">1</span>
          <h3>自分の単語を作る</h3>
          <p>単語、意味、メモ、例文を登録します。保存先はlocalStorageのマイワードです。</p>
        </article>
        <article className="factory-flow-card">
          <span className="factory-number">2</span>
          <h3>復習へ送る</h3>
          <p>覚えたい単語だけ復習リストへ追加できます。Firestore化はしていません。</p>
        </article>
        <article className="factory-flow-card">
          <span className="factory-number">3</span>
          <h3>先生配信を待つ</h3>
          <p>先生のオリジナル問題は今後のフェーズで安全に接続します。</p>
        </article>
      </div>

      <div className="factory-actions">
        <button className="ox-button-primary" onClick={() => navigate?.("vocab")}>
          マイワードへ
        </button>
        <button className="ox-button-soft" onClick={() => navigate?.("teacher")}>
          先生からの問題
        </button>
      </div>
    </section>
  );
}
