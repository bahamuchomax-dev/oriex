/* Central app version for display. Single source of truth = package.json, so the
 * label updates automatically on every version bump. UI/diagnostic only — no
 * secrets. Imported by the modern auth screen to show a small version label. */
import pkg from "../package.json";

export const APP_VERSION = (pkg && pkg.version) || "0.0.0";
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
