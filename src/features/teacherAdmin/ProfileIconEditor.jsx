import { useState } from "react";
import SignupIconPicker from "../auth/SignupIconPicker.jsx";
import { auth, db } from "../../firebase/firebase.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "../auth/authScreen.css"; // SignupIconPicker uses the .ox-auth-* styles
import "./profileIcon.css";

/* ============================================================
 * ProfileIconEditor — inline avatar editor for profile-edit (React).
 * ------------------------------------------------------------
 * Replaces the legacy "アイコンを変更" section (which adjusted position/zoom at
 * DISPLAY time via [data-oxav], so the icon looked right only where that attribute
 * was applied — inconsistent elsewhere). This reuses SignupIconPicker, which BAKES
 * the crop into the saved image (a char key, or a cropped photo data URL), so the
 * avatar looks the SAME everywhere. On save it writes the user's OWN profile + card
 * and RESETS the legacy display-time adjustment so the baked image is not
 * re-transformed. Inline preview + drag + zoom come from SignupIconPicker (no
 * separate "アイコンを調整" modal needed).
 * ============================================================ */

const APP_ID = "gen-ron-kai-app-v1";

export default function ProfileIconEditor() {
  const [icon, setIcon] = useState({ avatar: "", color: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) {
      setMsg("ログインが必要です。");
      return;
    }
    if (!icon.avatar) {
      setMsg("アイコンを選んでください。");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const patch = { avatar: icon.avatar, updatedAt: serverTimestamp() };
      if (icon.color) patch.color = icon.color;
      await setDoc(doc(db, "artifacts", APP_ID, "users", uid, "profile", "main"), patch, { merge: true });
      await setDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "customApp", uid),
        { ...patch, uid },
        { merge: true },
      );
      // The image is already cropped (baked), so clear the legacy display-time
      // position/zoom adjustment — otherwise [data-oxav] would re-transform it.
      try {
        if (window.__oxAv && typeof window.__oxAv.resetDefault === "function") window.__oxAv.resetDefault();
      } catch {
        /* ignore */
      }
      setMsg("アイコンを保存しました。どの画面でも同じ見た目になります。");
    } catch {
      setMsg("保存できませんでした。権限をご確認ください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ox-pie">
      <h3 className="ox-pie-h3">アイコンを変更</h3>
      <SignupIconPicker onChange={setIcon} />
      <button className="ox-pie-save" type="button" disabled={busy || !icon.avatar} onClick={save}>
        このアイコンに保存
      </button>
      {msg && <p className="ox-pie-note">{msg}</p>}
    </div>
  );
}
