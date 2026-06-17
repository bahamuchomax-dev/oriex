import { useEffect, useState } from "react";
import { useIconCrop } from "./useIconCrop.js";
import { AvatarArt, AVATAR_CHARS, DEFAULT_AVATAR_CHAR } from "./avatarArt.jsx";

/* ============================================================
 * SignupIconPicker — set an account icon on signup, SAME as profile-edit.
 * ------------------------------------------------------------
 *   - illustration: the SAME 9 character illustrations (avatarArt.jsx) + a
 *     background color. Stored as avatar:"<char>" (the key the app renders).
 *   - photo: a WYSIWYG crop stage — drag with ONE finger to move, PINCH with two
 *     fingers (or wheel) to zoom, with a live circular PREVIEW. No slider. The
 *     framed square is baked to a compact JPEG so it stays tiny and shows the
 *     SAME everywhere (header, cards, other viewers).
 * Reports the chosen icon via onChange({ avatar, color, photo }). UI only.
 * ============================================================ */

const COLORS = ["#c88040", "#9060b8", "#208050", "#14b8a6", "#ef4444", "#3b82f6"];

export default function SignupIconPicker({ onChange } = {}) {
  const [mode, setMode] = useState("illust"); // "illust" | "photo"
  const [char, setChar] = useState(DEFAULT_AVATAR_CHAR);
  const [color, setColor] = useState(COLORS[0]);
  const crop = useIconCrop();
  const { img, pan, photo, error, dims, stageHandlers } = crop;

  useEffect(() => {
    if (typeof onChange !== "function") return;
    // The legacy app renders the avatar as <img src={avatar}>, so a custom photo
    // is stored in `avatar` as a (cropped) data URL; a character is its char key.
    if (mode === "photo" && photo) onChange({ avatar: photo, color });
    else onChange({ avatar: char, color });
  }, [mode, char, color, photo, onChange]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (await crop.loadFile(file)) setMode("photo");
  };

  const showPhoto = mode === "photo" && img;

  return (
    <div className="ox-auth-iconpick">
      {/* SINGLE preview. In photo mode it IS the live circular crop editor —
          drag to move, pinch/wheel to zoom — so there is no separate 2nd preview. */}
      {showPhoto ? (
        <div
          className="ox-auth-cropstage"
          {...stageHandlers}
          style={{ background: color }}
          role="img"
          aria-label="アイコンのプレビュー（ドラッグで移動、2本指のピンチで拡大）"
        >
          <img
            src={img.src}
            alt=""
            draggable="false"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: dims.w,
              height: dims.h,
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
              <p className="ox-auth-hint">ドラッグで移動・2本指のピンチで拡大できます。</p>
              <div className="ox-auth-iconphoto-actions">
                <label className="ox-auth-iconupload sm">
                  別の写真
                  <input type="file" accept="image/*" onChange={onFile} hidden />
                </label>
                <button
                  type="button"
                  className="ox-auth-iconremove"
                  onClick={() => {
                    crop.reset();
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
