import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Guards the signup icon picker: it appears on the signup screen with preview +
 * adjustment, offers emoji+color and photo modes, and the chosen icon flows
 * signup -> modern profile/public card -> legacy bridge so the live app shows it.
 * No Firestore Rules change; the photo is a small resized data URL. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const API = readFileSync("src/features/auth/modernAuthApi.js", "utf8");
const BRIDGE = readFileSync("src/features/auth/legacyBridgeProfile.js", "utf8");
const PICKER = readFileSync("src/features/auth/SignupIconPicker.jsx", "utf8");
const ART = readFileSync("src/features/auth/avatarArt.jsx", "utf8");

describe("signup icon picker — UI (same as profile edit)", () => {
  it("renders on the signup screen with a live preview and adjustment", () => {
    expect(SHELL).toContain("SignupIconPicker");
    expect(SHELL).toMatch(/mode === "signup"[\s\S]*?SignupIconPicker/);
    expect(PICKER).toContain("プレビュー"); // preview
    expect(PICKER).toMatch(/type="range"/); // zoom adjust (範囲指定)
    expect(PICKER).toContain("onPointerMove"); // drag to reposition
  });
  it("offers the SAME character illustrations as profile-edit, plus photo", () => {
    expect(PICKER).toContain("AvatarArt");
    expect(PICKER).toContain("AVATAR_CHARS");
    expect(PICKER).toContain("イラスト");
    expect(PICKER).toContain("写真");
    expect(PICKER).toContain('accept="image/*"');
  });
  it("photo can be moved horizontally AND vertically (crop stage + pan) with live preview", () => {
    expect(PICKER).toContain("ox-auth-cropstage");
    expect(PICKER).toMatch(/translate\(\$\{pan\.x\}px, \$\{pan\.y\}px\)/);
    expect(PICKER).toMatch(/renderCroppedIcon\(img, \{ stageSize: STAGE, zoom, panX: pan\.x, panY: pan\.y \}\)/);
    const IMG = readFileSync("src/features/auth/iconImage.js", "utf8");
    expect(IMG).toContain("export function renderCroppedIcon");
    expect(IMG).toMatch(/drawImage\(img, sx, sy/); // pan maps to the source crop rect
  });
  it("ports the 9 legacy character illustrations (same chars the app renders)", () => {
    for (const c of ["bear", "fox", "penguin", "owl", "cat2", "hamster", "gorilla", "rabbit", "teacher"]) {
      expect(ART).toContain('export const ' + c + ' =');
    }
    // rendered from the legacy SVG via the React jsx-runtime (verbatim port)
    expect(ART).toMatch(/from "react\/jsx-runtime"/);
    expect(ART).toContain('viewBox:"0 0 80 80"');
  });
  it("never exposes the uid/debug or handles passwords (UI only)", () => {
    expect(PICKER).not.toMatch(/password|console\s*\./i);
  });
});

describe("signup icon — persistence wiring", () => {
  it("a custom photo is stored in `avatar` (the field the legacy app renders)", () => {
    // legacy renders <img src={avatar}> — so the photo data URL goes in `avatar`,
    // not a separate `photo` field
    expect(PICKER).toMatch(/onChange\(\{ avatar: photo, color \}\)/);
    // onChange must NOT emit a separate `photo` field (legacy reads `avatar`)
    expect(PICKER).not.toMatch(/onChange\(\{[^}]*\bphoto:/);
  });
  it("signup passes the chosen avatar/color to the API", () => {
    expect(SHELL).toMatch(/signUpWithInviteCode\(\{[\s\S]*?avatar: icon\.avatar[\s\S]*?color: icon\.color/);
    expect(API).toMatch(/signUpWithInviteCode\(\{ inviteCode, password, name, avatar, color \}/);
  });
  it("writes the icon to the profile + public card via assertSafePayload", () => {
    expect(API).toContain("withIconFields");
    expect(API).toMatch(/out\.avatar = avatar/);
    expect(API).toContain("assertSafePayload(");
    expect(API).not.toContain("out.photo");
  });
  it("the bridge carries avatar (char OR photo data URL) to the legacy profile", () => {
    expect(BRIDGE).toMatch(/d\.avatar/);
    expect(BRIDGE).toMatch(/base\.avatar = avatar/);
    expect(BRIDGE).not.toContain("base.photo");
  });
});
