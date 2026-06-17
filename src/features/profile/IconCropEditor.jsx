import { useEffect } from "react";
import { useIconCrop } from "../auth/useIconCrop.js";
import "../auth/authScreen.css"; // reuse the .ox-auth-cropstage / preview styles
import "./iconEditor.css";

/* ============================================================
 * IconCropEditor — profile-edit photo icon editor (finger crop, BAKES).
 * ------------------------------------------------------------
 * Opened in place of the legacy "写真" / "アイコンを調整" controls. ONE finger drags
 * to move, TWO fingers pinch (or wheel) to zoom — no slider, exactly like signup.
 * On 完了 it returns the BAKED cropped square (a JPEG data URL); the mount then
 * feeds it into the legacy avatar so 保存する persists the already-cropped image,
 * which therefore shows identically everywhere (header, name row, cards, other
 * viewers) — the legacy display-time [data-oxav] adjustment is no longer needed.
 *
 * @param {{ initialSrc?: string|null, onDone:(baked:string)=>void, onCancel:()=>void }} props
 * ============================================================ */
export default function IconCropEditor({ initialSrc = null, onDone, onCancel }) {
  const crop = useIconCrop();
  const { img, pan, photo, error, dims, stageHandlers } = crop;

  // Re-crop mode: load the current avatar photo so the user can re-frame it.
  // Intentionally keyed on `initialSrc` only (loading once when the editor opens).
  const loadSrc = crop.loadSrc;
  useEffect(() => {
    if (initialSrc) loadSrc(initialSrc);
  }, [initialSrc, loadSrc]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    await crop.loadFile(file);
  };

  return (
    <div className="ox-ice">
      <h3 className="ox-ice-h3">アイコンを調整</h3>
      <p className="ox-ice-sub">ドラッグで移動・2本指のピンチで拡大できます。</p>

      {img ? (
        <div
          className="ox-auth-cropstage ox-ice-stage"
          {...stageHandlers}
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
        <label className="ox-ice-pick">
          写真を選ぶ
          <input type="file" accept="image/*" onChange={onFile} hidden />
        </label>
      )}

      {img && (
        <label className="ox-ice-replace">
          別の写真を選ぶ
          <input type="file" accept="image/*" onChange={onFile} hidden />
        </label>
      )}

      {error && <p className="ox-ice-err" role="alert">{error}</p>}

      <div className="ox-ice-actions">
        <button type="button" className="ox-ice-cancel" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="ox-ice-done"
          disabled={!photo}
          onClick={() => photo && onDone(photo)}
        >
          完了
        </button>
      </div>
    </div>
  );
}
