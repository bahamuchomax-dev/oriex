import { useEffect, useRef, useState } from "react";
import { fileToImage, renderIconDataUrl, isIconWithinLimit } from "./iconImage.js";
import { AvatarArt, AVATAR_CHARS, DEFAULT_AVATAR_CHAR } from "./avatarArt.jsx";

/* ============================================================
 * SignupIconPicker — set an account icon on signup, SAME as profile-edit.
 * ------------------------------------------------------------
 * Two modes, both with a live PREVIEW and ADJUSTMENT — matching the legacy
 * profile editor's icon setting:
 *   - illustration: pick one of the SAME 9 character illustrations the profile
 *     editor offers (avatarArt.jsx, rendered from the identical SVG) + a
 *     background color. Stored as avatar:"<char>" — the exact key the app renders.
 *   - photo: upload an image, then ZOOM (slider) and reposition (drag / 範囲指定);
 *     it is square-cropped to a compact JPEG the same way the editor encodes its
 *     icon photo, so it stays tiny and saves reliably.
 * Reports the chosen icon via onChange({ avatar, color, photo }).
 * UI only — no auth/secret handling.
 * ============================================================ */

const COLORS = ["#c88040", "#9060b8", "#208050", "#14b8a6", "#ef4444", "#3b82f6"];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function SignupIconPicker({ onChange } = {}) {
  const [mode, setMode] = useState("illust"); // "illust" | "photo"
  const [char, setChar] = useState(DEFAULT_AVATAR_CHAR);
  const [color, setColor] = useState(COLORS[0]);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const dragRef = useRef(null);

  useEffect(() => {
    if (typeof onChange !== "function") return;
    if (mode === "photo" && photo) onChange({ avatar: "", color, photo });
    else onChange({ avatar: char, color, photo: "" });
  }, [mode, char, color, photo, onChange]);

  useEffect(() => {
    if (mode !== "photo" || !img) return;
    const url = renderIconDataUrl(img, { zoom, offsetX: offset.x, offsetY: offset.y });
    if (!url) {
      setError("画像を処理できませんでした。");
      return;
    }
    if (!isIconWithinLimit(url)) {
      setError("画像が大きすぎます。別の画像をお試しください。");
      return;
    }
    setError("");
    setPhoto(url);
  }, [mode, img, zoom, offset]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    setError("");
    const loaded = await fileToImage(file);
    if (!loaded) {
      setError("この画像は読み込めません。別の画像をお試しください。");
      return;
    }
    setImg(loaded);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMode("photo");
  };

  const onPointerDown = (e) => {
    if (mode !== "photo" || !img) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.x) / 90;
    const dy = (e.clientY - dragRef.current.y) / 90;
    setOffset({
      x: clamp(dragRef.current.ox - dx, -1, 1),
      y: clamp(dragRef.current.oy - dy, -1, 1),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const showPhoto = mode === "photo" && photo;

  return (
    <div className="ox-auth-iconpick">
      <div
        className="ox-auth-iconpreview"
        style={{ background: color }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label="アイコンのプレビュー"
        title={showPhoto ? "ドラッグで位置を調整" : undefined}
      >
        {showPhoto ? <img src={photo} alt="" draggable="false" /> : <AvatarArt char={char} size={64} />}
      </div>

      <div className="ox-auth-icontabs" role="tablist">
        <button
          type="button"
          className={"ox-auth-icontab" + (mode === "illust" ? " is-on" : "")}
          onClick={() => setMode("illust")}
        >
          イラスト
        </button>
        <button
          type="button"
          className={"ox-auth-icontab" + (mode === "photo" ? " is-on" : "")}
          onClick={() => setMode("photo")}
        >
          写真
        </button>
      </div>

      {mode === "illust" && (
        <>
          <div className="ox-auth-iconrow" aria-label="イラストを選ぶ">
            {AVATAR_CHARS.map((a) => (
              <button
                key={a.char}
                type="button"
                className={"ox-auth-iconchip" + (char === a.char ? " is-on" : "")}
                onClick={() => setChar(a.char)}
                aria-pressed={char === a.char}
                title={a.label}
              >
                <AvatarArt char={a.char} size={34} />
              </button>
            ))}
          </div>
          <div className="ox-auth-iconrow" aria-label="背景色を選ぶ">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={"ox-auth-iconswatch" + (color === c ? " is-on" : "")}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={"色 " + c}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </>
      )}

      {mode === "photo" && (
        <div className="ox-auth-iconphoto">
          <label className="ox-auth-iconupload">
            写真を選ぶ
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          {img && (
            <label className="ox-auth-iconzoom">
              ズーム
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value) || 1)}
              />
            </label>
          )}
          {img && <p className="ox-auth-hint">ドラッグで範囲（位置）を調整できます。</p>}
          {img && (
            <button
              type="button"
              className="ox-auth-iconremove"
              onClick={() => {
                setImg(null);
                setPhoto("");
                setZoom(1);
                setOffset({ x: 0, y: 0 });
                setMode("illust");
              }}
            >
              写真を削除してイラストに戻す
            </button>
          )}
        </div>
      )}

      {error && <p className="ox-auth-error" role="alert">{error}</p>}
    </div>
  );
}
