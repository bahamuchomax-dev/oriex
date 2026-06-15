/* ============================================================
 * OriexMark — the Oriex app/PWA icon, reused on the modern auth screens.
 * ------------------------------------------------------------
 * UI ONLY. Shows the SAME icon the installed app/PWA uses (public/icon-192.png)
 * so the modern login + handoff brand mark matches the app — instead of a debug
 * square "O" placeholder. No new heavy assets are introduced. import.meta.env.
 * BASE_URL keeps the path correct under the GitHub Pages project subpath
 * (matches the "./"-relative manifest/sw convention).
 * ============================================================ */

const ICON_SRC = `${import.meta.env.BASE_URL}icon-192.png`;

export default function OriexMark({ size = 56 }) {
  return (
    <img
      className="ox-auth-logo-img"
      src={ICON_SRC}
      width={size}
      height={size}
      alt="Oriex"
      draggable="false"
    />
  );
}
