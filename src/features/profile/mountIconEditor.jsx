import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import IconCropEditor from "./IconCropEditor.jsx";

/* ============================================================
 * mountIconEditor — route the profile-edit "写真" / "アイコンを調整" controls to the
 * React finger crop editor, and feed its BAKED result back into the legacy avatar.
 * ------------------------------------------------------------
 * The legacy "調整" only positions ONE [data-oxav] element at display time, so the
 * saved avatar stayed the RAW photo and the header / name-row icons (rendered from
 * the SAVED avatar) never reflected the adjustment. Signup avoids this by baking
 * the crop into the saved image. We give profile edit the SAME behaviour:
 *   1. intercept the icon card's 写真 (pick) + アイコンを調整 (re-crop) controls in the
 *      CAPTURE phase, so exactly ONE flow runs (no legacy/React photo-picker clash),
 *   2. crop with fingers + bake a square JPEG,
 *   3. inject that image into the legacy avatar <input type=file> so the legacy's
 *      own state + 保存する persist the already-cropped picture everywhere, and
 *   4. reset the legacy display-time adjustment (the crop is baked in now).
 * Frontend only; the frozen bundle is untouched.
 * ============================================================ */

const HOST_ID = "ox-icon-editor";
const CARD_LABEL = "アイコンを変更";
const PHOTO_LABEL = "写真";
const ADJUST_LABEL = "アイコンを調整";

let openEditor = () => {};

/** The profile-edit「アイコンを変更」card (or null when not on that screen). */
function iconCard() {
  const leaves = document.querySelectorAll("p,span,div");
  for (let i = 0; i < leaves.length; i++) {
    const el = leaves[i];
    if (el.childElementCount === 0 && (el.textContent || "").trim() === CARD_LABEL) {
      // label -> header row -> card
      return el.parentElement && el.parentElement.parentElement;
    }
  }
  return null;
}

/** The avatar photo <input type=file> inside the icon card. */
function avatarInput(card) {
  return card ? card.querySelector('input[type="file"]') : null;
}

/** Current avatar photo URL (the [data-oxav] preview's src), if it is a photo. */
function currentAvatarSrc(card) {
  const img = (card && card.querySelector("img[data-oxav]")) || document.querySelector("img[data-oxav]");
  const src = img ? img.getAttribute("src") || "" : "";
  return /^(data:|https?:)/.test(src) ? src : "";
}

/** data URL -> File (synchronous; the baked crop is small). */
function dataUrlToFile(dataUrl, name) {
  const comma = dataUrl.indexOf(",");
  const head = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

/** Push the baked image into the legacy avatar so its state + save use it. */
function applyBakedToLegacy(card, baked) {
  try {
    const input = avatarInput(card);
    if (input) {
      const file = dataUrlToFile(baked, "icon.jpg");
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      // The legacy onChange reads input.files[0] and sets the avatar state.
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch {
    /* ignore */
  }
  // The crop is baked in now → clear the legacy display-time zoom/position so it is
  // not re-applied on top of the already-cropped image.
  try {
    if (window.__oxAv && typeof window.__oxAv.resetDefault === "function") window.__oxAv.resetDefault();
  } catch {
    /* ignore */
  }
  // Instant visual feedback on every on-screen avatar (the legacy re-render then
  // keeps it, since its state is now the baked image too).
  try {
    document.querySelectorAll("img[data-oxav]").forEach((im) => {
      im.setAttribute("src", baked);
      im.style.transform = "";
      im.style.objectPosition = "";
      im.style.transformOrigin = "";
    });
  } catch {
    /* ignore */
  }
}

function Controller() {
  const [state, setState] = useState({ open: false, src: null, card: null });

  useEffect(() => {
    openEditor = (src, card) => setState({ open: true, src: src || null, card });
    return () => {
      openEditor = () => {};
    };
  }, []);

  if (!state.open) return null;
  const close = () => setState({ open: false, src: null, card: null });
  return (
    <div
      className="ox-ice-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="ox-ice-modal">
        <IconCropEditor
          initialSrc={state.src}
          onCancel={close}
          onDone={(baked) => {
            applyBakedToLegacy(state.card || iconCard(), baked);
            close();
          }}
        />
      </div>
    </div>
  );
}

/** Install the interceptor + editor host. Idempotent; browser-only. */
export function installIconEditor() {
  if (typeof document === "undefined" || document.getElementById(HOST_ID)) return;
  try {
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.body.appendChild(host);
    createRoot(host).render(
      <StrictMode>
        <Controller />
      </StrictMode>,
    );

    document.addEventListener(
      "click",
      (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          if (t.closest("#" + HOST_ID)) return; // our own UI
          const card = iconCard();
          if (!card || !card.contains(t)) return;

          const label = t.closest("label");
          const isPhoto = label && card.contains(label) && (label.textContent || "").indexOf(PHOTO_LABEL) >= 0;
          const btn = t.closest("button");
          const isAdjust = btn && (btn.textContent || "").indexOf(ADJUST_LABEL) >= 0;
          if (!isPhoto && !isAdjust) return;

          // Take over BOTH flows so the legacy photo picker / adjust modal never run.
          e.preventDefault();
          e.stopPropagation();
          // 写真 → pick a fresh photo (no initial); 調整 → re-crop the current one.
          openEditor(isAdjust ? currentAvatarSrc(card) : null, card);
        } catch {
          /* ignore */
        }
      },
      true, // capture: run before the legacy React root handlers
    );
  } catch {
    /* ignore */
  }
}
