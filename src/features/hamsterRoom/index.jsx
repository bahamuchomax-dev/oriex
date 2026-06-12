import { useState } from "react";
import { saveProfile } from "../profile/profileApi.js";
import HamsterRoom3D from "./HamsterRoom3D.jsx";

// Hamster Room (v7.22-style, SAFE non-3D scaffold).
// This is an intentionally lightweight, WebGL-free "ハムスターのへや" so the 育成
// 導線 never lands on a blank/placeholder screen. The full three.js room is a
// later phase — see README.md. No Firestore writes happen here; XP/level/gauges
// are read-only/cosmetic derived from the already-loaded profile.

const HUB = [
  { key: "shop", label: "ショップ", sub: "アイテム交換（準備中）", icon: "店", tone: "amber" },
  { key: "achievements", label: "実績", sub: "がんばりの記録", icon: "章", tone: "violet" },
  { key: "typing", label: "タイピング", sub: "ミニゲーム（準備中）", icon: "打", tone: "green" },
];

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function HamsterRoom({ profile, uid, navigate, onProfileSaved }) {
  const [view, setView] = useState("room");
  const [roomMode, setRoomMode] = useState("3d"); // "3d" | "simple"; auto-falls back to simple on 3D error

  const hamsterName = profile?.hamsterName || "ハムスター";

  // --- Hamster naming (persisted to profile.hamsterName) ---
  // Edits stay local while typing; we only write to Firestore on the save button.
  const [nameInput, setNameInput] = useState(profile?.hamsterName || "");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | ok | err
  const saving = saveState === "saving";

  const saveName = async () => {
    const next = (nameInput || "").trim().slice(0, 16);
    if (!next) {
      setSaveState("err");
      return;
    }
    if (!uid) {
      setSaveState("err");
      return;
    }
    setSaveState("saving");
    try {
      const merged = await saveProfile(uid, { hamsterName: next }, profile);
      onProfileSaved?.(merged); // update the app-level profile so the room name refreshes
      setNameInput(next);
      setSaveState("ok");
    } catch (e) {
      console.error("hamsterName save failed", e);
      setSaveState("err");
    }
  };
  const xp = Number(profile?.xp) || 0;
  const level = Math.floor(xp / 100) + 1;
  const intoLevel = clampPct((xp % 100));

  // Cosmetic-only gauges (display HUD). Derived from xp so they feel alive, but
  // nothing is persisted and there is no Firestore involvement.
  const gauges = [
    { key: "food", label: "おなか", val: clampPct(58 + (xp % 43)), tone: "red" },
    { key: "mood", label: "ごきげん", val: clampPct(64 + (xp % 37)), tone: "amber" },
    { key: "clean", label: "きれい", val: clampPct(72 + (xp % 29)), tone: "blue" },
  ];

  if (view !== "room") {
    return (
      <HamsterSub
        view={view}
        onBack={() => setView("room")}
        hamsterName={hamsterName}
        level={level}
        xp={xp}
      />
    );
  }

  return (
    <section className="hamster-screen">
      <div className="hamster-titlebar">
        <button className="btn-link" onClick={() => navigate?.("home")}>‹ ホーム</button>
        <h2 className="ox-screen-title" style={{ margin: 0 }}>ハムスターのへや</h2>
        <span className="hamster-soft-note">育成</span>
      </div>

      <div className="hamster-room-modebar">
        <div className="ox-segment" role="tablist" aria-label="へや表示">
          <button
            role="tab"
            aria-selected={roomMode === "3d"}
            className={"ox-segment-btn" + (roomMode === "3d" ? " active" : "")}
            onClick={() => setRoomMode("3d")}
          >
            3Dへや
          </button>
          <button
            role="tab"
            aria-selected={roomMode === "simple"}
            className={"ox-segment-btn" + (roomMode === "simple" ? " active" : "")}
            onClick={() => setRoomMode("simple")}
          >
            シンプル表示
          </button>
        </div>
      </div>

      {roomMode === "3d" ? (
        <div className="hamster-room hamster-room-3d">
          <HamsterRoom3D onError={() => setRoomMode("simple")} />
        </div>
      ) : (
        /* Safe CSS-only room scene (no WebGL / no three.js) */
        <div className="hamster-room" aria-hidden="true">
          <div className="hamster-room-floor" />
          <div className="hamster-wheel">
            <span className="hamster-wheel-spoke" />
            <span className="hamster-wheel-spoke v" />
          </div>
          <div className="hamster-body">🐹</div>
          <div className="hamster-bed" />
          <div className="hamster-plant">🌱</div>
        </div>
      )}

      <div className="hamster-id-card">
        <div className="hamster-id-main">
          <div className="hamster-id-name">{hamsterName}</div>
          <div className="hamster-id-lv">Lv.{level}</div>
        </div>
        <div className="hamster-xp">
          <div className="hamster-xp-bar"><span style={{ width: `${intoLevel}%` }} /></div>
          <div className="hamster-xp-text">XP {xp} ・ 次のレベルまで {100 - intoLevel}</div>
        </div>
      </div>

      <div className="hamster-name-card">
        <label className="hamster-name-label" htmlFor="hamster-name-input">
          ハムスターの名前
        </label>
        <div className="hamster-name-row">
          <input
            id="hamster-name-input"
            className="hamster-name-input"
            type="text"
            maxLength={16}
            placeholder="例：ハムちゃん"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (saveState !== "idle") setSaveState("idle");
            }}
          />
          <button
            className="ox-button-primary"
            disabled={saving}
            onClick={saveName}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
        {saveState === "ok" && (
          <p className="hamster-name-msg ok">「{hamsterName}」に保存しました。</p>
        )}
        {saveState === "err" && (
          <p className="hamster-name-msg err">
            {(nameInput || "").trim() ? "保存に失敗しました。通信状況を確認してもう一度お試しください。" : "名前を入力してください。"}
          </p>
        )}
      </div>

      <div className="hamster-gauges">
        {gauges.map((g) => (
          <div key={g.key} className={`hamster-gauge hg-${g.tone}`}>
            <div className="hamster-gauge-head">
              <span>{g.label}</span>
              <strong>{g.val}%</strong>
            </div>
            <div className="hamster-gauge-bar"><span style={{ width: `${g.val}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>あそぶ・ためす</h2>
        <span>v7.22 style</span>
      </div>
      <div className="hamster-hub-grid">
        {HUB.map((item) => (
          <button
            key={item.key}
            className={`hamster-hub-card tone-${item.tone}`}
            onClick={() => setView(item.key)}
          >
            <span className="hamster-hub-icon" aria-hidden="true">{item.icon}</span>
            <span className="hamster-hub-label">{item.label}</span>
            <span className="hamster-hub-sub">{item.sub}</span>
          </button>
        ))}
      </div>

      <p className="hamster-foot-note">
        3Dハムスターのへやは次フェーズで段階的に移植します。ここは安全なUI版です。
      </p>
    </section>
  );
}

function levelFromXp(xp) {
  return Math.floor((Number(xp) || 0) / 100) + 1;
}

const SHOP_ITEMS = [
  { key: "food", emoji: "🥕", name: "ごはん", desc: "おなかを回復させるおやつ", cost: 30, state: "準備中" },
  { key: "toy", emoji: "🧶", name: "おもちゃ", desc: "ごきげんがアップする毛糸玉", cost: 60, state: "準備中" },
  { key: "deco", emoji: "🪴", name: "へやのかざり", desc: "へやを模様替えする小物", cost: 90, state: "交換予定" },
  { key: "wheel", emoji: "🎡", name: "回し車", desc: "あたらしい回し車にチェンジ", cost: 120, state: "交換予定" },
  { key: "bedding", emoji: "🌾", name: "床材", desc: "きれいをキープする床材", cost: 50, state: "準備中" },
  { key: "house", emoji: "🏠", name: "小屋", desc: "ねむり場所をグレードアップ", cost: 200, state: "交換予定" },
];

const ACHIEVEMENTS = [
  { key: "first", emoji: "🌱", name: "はじめての一歩", desc: "XP 10以上", need: 10 },
  { key: "effort", emoji: "🔥", name: "がんばり屋", desc: "XP 100以上", need: 100 },
  { key: "buddy", emoji: "🤝", name: "毎日の相棒", desc: "XP 300以上", need: 300 },
  { key: "master", emoji: "⭐", name: "育成マスター", desc: "XP 1000以上", need: 1000 },
];

const TYPING_RULES = [
  "画面に出てくる単語を、制限時間内に入力します。",
  "正確さとスピードでスコアが決まります。",
  "ミスはひかえめに減点。あせらず続けるのがコツです。",
  "結果に応じてハムちゃんのごきげんがアップする予定です。",
];

function HamsterSub({ view, onBack, hamsterName, xp }) {
  const safeXp = Number(xp) || 0;
  const level = levelFromXp(safeXp);
  const [shopMsg, setShopMsg] = useState("");

  const meta = {
    shop: { title: "ショップ", icon: "店", lead: "がんばって貯めたXPで、ハムちゃんのアイテムやへやの飾りを交換できるようにする予定です。" },
    achievements: { title: "実績", icon: "章", lead: "学習のがんばり（XP）に応じてバッジが増えていきます。" },
    typing: { title: "タイピングゲーム", icon: "打", lead: "単語をタイピングしてハムちゃんを応援するミニゲームを準備中です。" },
  }[view];

  let body = null;
  if (view === "shop") {
    body = (
      <>
        <div className="hamster-xp-pill">
          <span>もっているXP</span>
          <strong>{safeXp}</strong>
        </div>
        <div className="hamster-shop-grid">
          {SHOP_ITEMS.map((it) => {
            const enough = safeXp >= it.cost;
            return (
              <div key={it.key} className="hamster-shop-card">
                <div className="hamster-shop-card-emoji" aria-hidden="true">{it.emoji}</div>
                <div className="hamster-shop-card-name">{it.name}</div>
                <div className="hamster-shop-card-desc">{it.desc}</div>
                <div className="hamster-shop-card-foot">
                  <span className="hamster-shop-card-cost">{it.cost} XP</span>
                  <span className={`hamster-chip ${it.state === "交換予定" ? "soon" : "wip"}`}>{it.state}</span>
                </div>
                <div className={`hamster-shop-afford ${enough ? "ok" : "short"}`}>
                  {enough ? "XP たりています" : `あと ${it.cost - safeXp} XP`}
                </div>
                <button
                  className="ox-button-soft hamster-shop-btn"
                  onClick={() => setShopMsg(`「${it.name}」は準備中です。交換機能は今後のアップデートで対応します。`)}
                >
                  交換する
                </button>
              </div>
            );
          })}
        </div>
        {shopMsg && <p className="hamster-name-msg ok" role="status">{shopMsg}</p>}
        <p className="hamster-foot-note">※ いまは見た目のプレビューです。交換してもデータは保存されません。</p>
      </>
    );
  } else if (view === "achievements") {
    const earnedCount = ACHIEVEMENTS.filter((a) => safeXp >= a.need).length;
    body = (
      <>
        <div className="hamster-ach-summary">
          <div><strong>{earnedCount}</strong><span>/ {ACHIEVEMENTS.length} 達成</span></div>
          <div><strong>Lv.{level}</strong><span>XP {safeXp}</span></div>
        </div>
        <ul className="ox-card-list">
          {ACHIEVEMENTS.map((a) => {
            const earned = safeXp >= a.need;
            return (
              <li key={a.key} className={`ox-card hamster-ach-row ${earned ? "earned" : ""}`}>
                <span className="hamster-ach-badge" aria-hidden="true">{a.emoji}</span>
                <span className="hamster-ach-text">
                  <strong>{a.name}</strong>
                  <small>{earned ? a.desc : `${a.desc}（あと ${a.need - safeXp} XP）`}</small>
                </span>
                <span className="hamster-ach-state">{earned ? "達成" : "未達成"}</span>
              </li>
            );
          })}
        </ul>
      </>
    );
  } else if (view === "typing") {
    body = (
      <>
        <div className="hamster-typing-hero">
          <div className="hamster-typing-emoji" aria-hidden="true">⌨️</div>
          <p>単語をタイピングしてハムちゃんを応援する、かんたんなミニゲームです。</p>
        </div>
        <div className="section-head"><h2>予定しているルール</h2><span>準備中</span></div>
        <ul className="ox-card-list">
          {TYPING_RULES.map((r, i) => (
            <li key={i} className="ox-card hamster-rule-row">
              <span className="hamster-rule-num">{i + 1}</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="hamster-foot-note">将来的にスコアをXPや実績と連携する予定です。ゲーム本体は今後のフェーズで追加します。</p>
      </>
    );
  }

  if (!meta) {
    return (
      <section className="hamster-screen">
        <div className="hamster-titlebar">
          <button className="btn-link" onClick={onBack}>‹ へやへ</button>
          <h2 className="ox-screen-title" style={{ margin: 0 }}>準備中</h2>
          <span />
        </div>
        <div className="ox-empty compact"><p>この画面は準備中です。</p></div>
        <button className="ox-button-soft big" style={{ marginTop: 16 }} onClick={onBack}>へやへもどる</button>
      </section>
    );
  }

  return (
    <section className="hamster-screen">
      <div className="hamster-titlebar">
        <button className="btn-link" onClick={onBack}>‹ へやへ</button>
        <h2 className="ox-screen-title" style={{ margin: 0 }}>{meta.title}</h2>
        <span className="hamster-soft-note">{hamsterName}</span>
      </div>
      <div className="ox-card hamster-sub-lead">
        <span className="hamster-sub-icon" aria-hidden="true">{meta.icon}</span>
        <p>{meta.lead}</p>
      </div>
      {body}
      <button className="ox-button-soft big" style={{ marginTop: 16 }} onClick={onBack}>
        へやへもどる
      </button>
    </section>
  );
}
