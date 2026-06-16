import { useEffect, useRef, useState } from "react";
import { fileToImage, renderCroppedIcon, isIconWithinLimit } from "./iconImage.js";
import { AvatarArt, AVATAR_CHARS, DEFAULT_AVATAR_CHAR } from "./avatarArt.jsx";

/* ============================================================
 * SignupIconPicker — set an account icon on signup, SAME as profile-edit.
 * ------------------------------------------------------------
 *   - illustration: the SAME 9 character illustrations (avatarArt.jsx) + a
 *     background color. Stored as avatar:"<char>" (the key the app renders).
 *   - photo: a WYSIWYG crop stage — drag to move HORIZONTALLY/VERTICALLY, slider
 *     to ZOOM, with a live circular PREVIEW. The framed square is encoded to a
 *     compact JPEG, so it stays tiny and saves reliably.
 * Reports the chosen icon via onChange({ avatar, color, photo }). UI only.
 * ============================================================ */

const COLORS = ["#c88040", "#9060b8", "#208050", "#14b8a6", "#ef4444", "#3b82f6"];
const STAGE = 176; // crop stage display px
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function dispDims(img, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(STAGE / iw, STAGE / ih); // cover-fit
  return { w: iw * base * zoom, h: ih * base * zoom };
}
function clampPan(pan, img, zoom) {
  const { w, h } = dispDims(img, zoom);
  return { x: clamp(pan.x, STAGE - w, 0), y: clamp(pan.y, STAGE - h, 0) };
}

export default function SignupIconPicker({ onChange } = {}) {
  const [mode, setMode] = useState("illust"); // "illust" | "photo"
  const [char, setChar] = useState(DEFAULT_AVATAR_CHAR);
  const [color, setColor] = useState(COLORS[0]);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const dragRef = useRef(null);

  useEffect(() => {
    if (typeof onChange !== "function") return;
    // The legacy app renders the avatar as <img src={avatar}>, so a custom photo
    // is stored in `avatar` as a data URL; a character is stored as its char key.
    if (mode === "photo" && photo) onChange({ avatar: photo, color });
    else onChange({ avatar: char, color });
  }, [mode, char, color, photo, onChange]);

  // Re-render the cropped photo whenever the source / zoom / pan changes.
  useEffect(() => {
    if (mode !== "photo" || !img) return;
    const url = renderCroppedIcon(img, { stageSize: STAGE, zoom, panX: pan.x, panY: pan.y });
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
  }, [mode, img, zoom, pan]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    setError("");
    const loaded = await fileToImage(file);
    if (!loaded) {
      setError("この画像は読み込めません。別の画像をお試しください。");
      return;
    }
    const { w, h } = dispDims(loaded, 1);
    setImg(loaded);
    setZoom(1);
    setPan({ x: (STAGE - w) / 2, y: (STAGE - h) / 2 }); // centered
    setMode("photo");
  };

  const onZoom = (z) => {
    const nz = Math.max(1, Number(z) || 1);
    setZoom(nz);
    if (img) setPan((p) => clampPan(p, img, nz));
  };

  const onPointerDown = (e) => {
    if (!img) return;
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };
  const onPointerMove = (e) => {
    if (!dragRef.current || !img) return;
    const nx = dragRef.current.px + (e.clientX - dragRef.current.x);
    const ny = dragRef.current.py + (e.clientY - dragRef.current.y);
    setPan(clampPan({ x: nx, y: ny }, img, zoom));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const stageDims = img ? dispDims(img, zoom) : { w: STAGE, h: STAGE };
  const showPhoto = mode === "photo" && photo;

  return (
    <div className="ox-auth-iconpick">
      {/* SINGLE preview. In photo mode it IS the live circular crop editor —
          drag to move H/V + slider to zoom — so there is no separate 2nd preview. */}
      {showPhoto ? (
        <div
          className="ox-auth-cropstage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ background: color }}
          role="img"
          aria-label="アイコンのプレビュー（ドラッグで上下左右に移動、スライダーで拡大）"
        >
          <img
            src={img.src}
            alt=""
            draggable="false"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: stageDims.w,
              height: stageDims.h,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          />
          <div className="ox-auth-cropring" aria-hidden="true" />
        </div>
      ) : (
        <div className="ox-auth-iconpreview" style={{ background: color }} role="img" aria-label="アイコンのプレビュー">
          <AvatarArt char={char} size={64} />
        </div>
      )}

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
          {!img && (
            <label className="ox-auth-iconupload">
              写真を選ぶ
              <input type="file" accept="image/*" onChange={onFile} hidden />
            </label>
          )}
          {img && (
            <>
              <label className="ox-auth-iconzoom">
                ズーム
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => onZoom(e.target.value)}
                />
              </label>
              <p className="ox-auth-hint">ドラッグで上下左右に移動できます。</p>
              <div className="ox-auth-iconphoto-actions">
                <label className="ox-auth-iconupload sm">
                  別の写真
                  <input type="file" accept="image/*" onChange={onFile} hidden />
                </label>
                <button
                  type="button"
                  className="ox-auth-iconremove"
                  onClick={() => {
                    setImg(null);
                    setPhoto("");
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setMode("illust");
                  }}
                >
                  イラストに戻す
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="ox-auth-error" role="alert">{error}</p>}
    </div>
  );
}
