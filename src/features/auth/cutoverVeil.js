/* ============================================================
 * cutoverVeil — imperative full-screen veil for the modern cutover.
 * ------------------------------------------------------------
 * A fixed, max-z-index branded cover that lives OUTSIDE #root (its own
 * #ox-cutover-veil node on <body>), so the legacy app under #root can NEVER
 * repaint over it. It is shown synchronously at the start of the cutover entry
 * (before legacy is imported) and on every controlled reload, then removed by
 * the bridge once the target UI is ready (modern login shown, or legacy home
 * painted). Inline styles so it covers even before any CSS chunk loads.
 *
 * UI ONLY. No password/token/credential is read, written, or logged. Never
 * throws. Only the cutover path uses this — the emergency ?oriexLegacyFallback=1
 * route never calls it, so legacy still shows there.
 * ============================================================ */

export const CUTOVER_VEIL_ID = "ox-cutover-veil";

const ICON_SRC = `${import.meta.env.BASE_URL}icon-192.png`;

/** Show the veil (idempotent). Best-effort visual cover; never throws. */
export function showCutoverVeil() {
  try {
    if (typeof document === "undefined" || !document.body) return;
    if (document.getElementById(CUTOVER_VEIL_ID)) return;

    const veil = document.createElement("div");
    veil.id = CUTOVER_VEIL_ID;
    veil.setAttribute("role", "status");
    veil.setAttribute("aria-label", "Oriex を読み込んでいます");
    veil.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "margin:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:#fbf8f3",
      "touch-action:none",
    ].join(";");

    const icon = document.createElement("img");
    icon.src = ICON_SRC;
    icon.width = 56;
    icon.height = 56;
    icon.alt = "Oriex";
    icon.setAttribute("draggable", "false");
    icon.style.cssText =
      "width:56px;height:56px;border-radius:16px;box-shadow:0 8px 20px rgba(43,39,36,0.16)";

    veil.appendChild(icon);
    document.body.appendChild(veil);
  } catch {
    /* ignore — the veil is best-effort visual only */
  }
}

/** Remove the veil if present. Never throws. */
export function hideCutoverVeil() {
  try {
    if (typeof document === "undefined") return;
    const veil = document.getElementById(CUTOVER_VEIL_ID);
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
  } catch {
    /* ignore */
  }
}
