import { useState } from "react";
import { auth, db } from "../../firebase/firebase.js";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { parseSheetCsvUrl, parseCsv, rowsToVocab } from "./sheetImport.js";
import "./teacherAdmin.css";

/* ============================================================
 * TeacherAdminPanel — clean React rebuild of the legacy 先生用管理 screen.
 * ------------------------------------------------------------
 * Replaces the dark, hard-to-read legacy settingsApp (which a DOM patch could not
 * fix — React kept resetting the inline styles). Three features, all writing via
 * the modern Firebase instance to the SAME legacy paths the app reads:
 *   - お知らせ投稿  -> artifacts/{appId}/public/data/announcements (addDoc)
 *   - 全体ロック    -> artifacts/{appId}/public/data/system/appLock (setDoc merge)
 *   - スプレッドシート取込 (ADD-ONLY) -> append rows to .../public/data/customVocabulary
 *     The dangerous 全置換 (replace-all) mode is intentionally NOT here.
 * Writes need the teacher/admin custom claim (already provisioned) + the deployed
 * rules. UI only; no password/secret handled.
 * ============================================================ */

const APP_ID = "gen-ron-kai-app-v1";

export default function TeacherAdminPanel({ onClose } = {}) {
  // お知らせ
  const [announce, setAnnounce] = useState("");
  const [annBusy, setAnnBusy] = useState(false);
  const [annMsg, setAnnMsg] = useState("");
  // 全体ロック
  const [lockMsg, setLockMsg] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [lockNote, setLockNote] = useState("");
  // スプレッドシート取込
  const [sheetUrl, setSheetUrl] = useState("");
  const [stage, setStage] = useState("1");
  const [preview, setPreview] = useState(null); // { ok: [...], bad: [...] }
  const [impBusy, setImpBusy] = useState(false);
  const [impMsg, setImpMsg] = useState("");

  const uid = () => (auth && auth.currentUser ? auth.currentUser.uid : "teacher");

  const postAnnounce = async () => {
    const text = announce.trim();
    if (!text) return;
    setAnnBusy(true);
    setAnnMsg("");
    try {
      await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "announcements"), {
        text,
        timestamp: Date.now(),
        uid: uid(),
      });
      setAnnounce("");
      setAnnMsg("送信しました。");
    } catch {
      setAnnMsg("送信できませんでした。権限をご確認ください。");
    } finally {
      setAnnBusy(false);
    }
  };

  const setLock = async (locked) => {
    setLockBusy(true);
    setLockNote("");
    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "system", "appLock"),
        { locked, message: lockMsg.trim(), updatedAt: Date.now() },
        { merge: true },
      );
      setLockNote(locked ? "全体ロックを有効にしました。" : "ロックを解除しました。");
    } catch {
      setLockNote("変更できませんでした。権限をご確認ください。");
    } finally {
      setLockBusy(false);
    }
  };

  const doPreview = async () => {
    setImpMsg("");
    setPreview(null);
    const exportUrl = parseSheetCsvUrl(sheetUrl);
    if (!exportUrl) {
      setImpMsg("URLが正しくありません。GoogleスプレッドシートのURLを入力してください。");
      return;
    }
    setImpBusy(true);
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("fetch");
      const csv = await res.text();
      const rows = parseCsv(csv);
      const { ok, bad } = rowsToVocab(rows);
      setPreview({ ok, bad });
      if (!ok.length) setImpMsg("有効な行が見つかりませんでした（1行目は見出しとして無視されます）。");
    } catch {
      setImpMsg("スプレッドシートを取得できません。「ウェブに公開」されているかご確認ください。");
    } finally {
      setImpBusy(false);
    }
  };

  const doImport = async () => {
    if (!preview || !preview.ok.length) return;
    const st = Number(stage) || 1;
    setImpBusy(true);
    setImpMsg("");
    let done = 0;
    try {
      for (const w of preview.ok) {
        // ADD-ONLY: never deletes existing words (sequential to keep order/limits sane).
        await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "customVocabulary"), {
          en: w.en,
          ja: w.ja,
          sentence: w.sentence,
          category: "英単語",
          stage: st,
          timestamp: Date.now(),
          seenBy: [],
        });
        done += 1;
      }
      setImpMsg(`${done}件を追加しました。`);
      setPreview(null);
    } catch {
      setImpMsg(`${done}件まで追加しました（途中でエラー）。権限をご確認ください。`);
    } finally {
      setImpBusy(false);
    }
  };

  return (
    <div className="ox-ta">
      <div className="ox-ta-head">
        <h2 className="ox-ta-title">先生用管理</h2>
        <button type="button" className="ox-ta-close" onClick={onClose}>
          終了
        </button>
      </div>

      <section className="ox-ta-card">
        <h3 className="ox-ta-h3">お知らせの投稿</h3>
        <textarea
          className="ox-ta-textarea"
          placeholder="メッセージを入力…"
          value={announce}
          onChange={(e) => setAnnounce(e.target.value)}
        />
        <button className="ox-ta-primary" disabled={annBusy || !announce.trim()} onClick={postAnnounce}>
          送信
        </button>
        {annMsg && <p className="ox-ta-note">{annMsg}</p>}
      </section>

      <section className="ox-ta-card">
        <h3 className="ox-ta-h3">全体ロック（緊急停止）</h3>
        <input
          className="ox-ta-input"
          placeholder="ロック中に表示するメッセージ（任意）"
          value={lockMsg}
          onChange={(e) => setLockMsg(e.target.value)}
        />
        <div className="ox-ta-row">
          <button className="ox-ta-danger" disabled={lockBusy} onClick={() => setLock(true)}>
            ロックする
          </button>
          <button className="ox-ta-ghost" disabled={lockBusy} onClick={() => setLock(false)}>
            解除
          </button>
        </div>
        {lockNote && <p className="ox-ta-note">{lockNote}</p>}
      </section>

      <section className="ox-ta-card">
        <h3 className="ox-ta-h3">スプレッドシートから単語を追加</h3>
        <p className="ox-ta-hint">
          A列=英単語 / B列=日本語訳 / C列=例文（任意）。1行目は見出しとして無視されます。既存の単語は消さず、追加のみ行います。
        </p>
        <input
          className="ox-ta-input"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
        <div className="ox-ta-row">
          <label className="ox-ta-stage">
            ステージ番号
            <input
              className="ox-ta-input sm"
              type="number"
              min="1"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            />
          </label>
          <button className="ox-ta-ghost" disabled={impBusy || !sheetUrl.trim()} onClick={doPreview}>
            プレビュー
          </button>
        </div>

        {preview && (
          <div className="ox-ta-preview">
            <p className="ox-ta-note">
              有効: {preview.ok.length}件{preview.bad.length ? ` / 無効: ${preview.bad.length}件` : ""}
            </p>
            <ul className="ox-ta-list">
              {preview.ok.slice(0, 8).map((w, i) => (
                <li key={i}>
                  <b>{w.en}</b> — {w.ja}
                </li>
              ))}
              {preview.ok.length > 8 && <li>…ほか {preview.ok.length - 8}件</li>}
            </ul>
            <button className="ox-ta-primary" disabled={impBusy || !preview.ok.length} onClick={doImport}>
              {preview.ok.length}件を追加登録
            </button>
          </div>
        )}
        {impMsg && <p className="ox-ta-note">{impMsg}</p>}
      </section>
    </div>
  );
}
