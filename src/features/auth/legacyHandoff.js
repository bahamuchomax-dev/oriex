// Shared modern-auth → legacy handoff: set the (non-secret) uid global, ensure the
// signed-in user's OWN legacy-path profile exists, then start the legacy app. This
// is the verified probe flow, factored out so the opt-in cutover bridge reuses it.
//
// No password is read/compared/written; nothing sensitive is logged. The legacy
// bundle is IMPORTED (not edited). `importLegacy` is injectable for tests.

import { bridgeUid } from "./authBridgeController.js";
import { ensureLegacyBridgeProfile } from "./legacyBridgeProfile.js";
import { seedLegacyLocalSession } from "./legacyLocalSession.js";
// TEMPORARY save/auth tracing (?oriexAuthDebug=1); no-op when the flag is absent.
import { authDebugOn, installFsHook, logAuthIdentity, scheduleAuthIdentityProbes } from "./authDebug.js";
import { currentAuthUser } from "./modernAuthState.js";
import { installAttendanceSync } from "../../services/attendanceSync.js";
import { installPasswordChangeSync } from "../../services/passwordChangeSync.js";
import { installTeacherAdmin } from "../teacherAdmin/mountTeacherAdmin.jsx";
import { installAvatarBake } from "../../services/avatarBake.js";
import { installIconEditor } from "../profile/mountIconEditor.jsx";
import { installCoverSync } from "../../services/coverSync.js";
import { installFriendCover } from "../../services/friendCover.js";
import { installSwipeNav } from "../../services/swipeNav.js";
import { installReadCounter } from "../../services/readCounter.js";
import { installHamsterSync } from "../../services/hamsterSync.js";
import { installStudentApps } from "../teacherApps/mountStudentApps.jsx";

const defaultImportLegacy = () => import("../../legacy/oriex-app.bundle.js");

/**
 * Hand off a signed-in modern-auth user into the legacy app:
 *   1. set window.__oxUid = user.uid (non-secret id),
 *   2. ensure the user's OWN legacy-path profile exists (no password),
 *   3. start (import) the legacy bundle, which self-mounts into #root and adopts
 *      the Firebase Auth session, entering the real app without the old gate.
 * @param {{ uid?: unknown } | null} user
 * @param {() => Promise<unknown>} [importLegacy]  injectable for tests
 * @returns {Promise<{ uid: string|null, ensured: string }>}
 */
export async function handoffToLegacy(user, importLegacy) {
  const uid = bridgeUid(user);
  if (typeof window !== "undefined" && uid) window.__oxUid = uid;

  let ensured = "skipped";
  let shortId = "";
  let name = "";
  let avatar = "";
  let color = "";
  let isTeacher;
  try {
    const r = await ensureLegacyBridgeProfile(uid);
    ensured = r && r.ok ? (r.created ? "created" : "existed") : "failed";
    if (r) {
      shortId = r.shortId || "";
      name = r.name || "";
      avatar = r.avatar || "";
      color = r.color || "";
      if (typeof r.isTeacher === "boolean") isTeacher = r.isTeacher;
    }
  } catch {
    ensured = "error";
  }

  // Seed legacy's localStorage fast-start cache so it boots logged-in on RELOAD
  // too — independent of legacy's own Firebase-Auth restoration timing. Carries
  // the icon + teacher flag so a reload shows the right identity/role. No password;
  // mirrors legacy's key format.
  if (uid) seedLegacyLocalSession(uid, { shortId, name, avatar, color, isTeacher });

  // Debug-only: install the legacy setDoc/getDoc/getDocs hook and record the auth
  // identity BEFORE legacy boots, so we can see the uid/isAnonymous at every later
  // write/read. Safe metadata only; no document data. No-op unless ?oriexAuthDebug=1.
  if (authDebugOn()) {
    installFsHook(() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    });
    logAuthIdentity("before-legacy-import", (() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    })());
  }

  await (importLegacy || defaultImportLegacy)();

  // Server-persist the legacy 登校スタンプ (attendance stamps), which the bundle
  // otherwise keeps only in localStorage. Writes mirror to the user's OWN Firestore
  // subtree on change; reads happen on tab-open (+ a fresh-device restore). Frontend
  // only — the bundle is untouched and no Firestore rules change is required.
  try {
    installAttendanceSync();
  } catch {
    /* non-fatal: attendance still works locally */
  }

  // Make the legacy in-app "パスワード変更" actually update Firebase Auth (the
  // legacy screen only writes a dead Firestore plaintext field). Frontend only.
  try {
    installPasswordChangeSync();
  } catch {
    /* non-fatal */
  }

  // Replace the dark, unreadable legacy 先生用管理 screen with the clean React
  // TeacherAdminPanel (detected by title; teacher-only). Frontend only.
  try {
    installTeacherAdmin();
  } catch {
    /* non-fatal: the legacy admin still works */
  }

  // Give profile-edit the SAME finger crop + BAKE flow as signup: tapping 写真 /
  // アイコンを調整 opens a React editor that bakes the crop into the avatar, so the
  // header / name-row icons (rendered from the SAVED avatar) reflect it everywhere.
  try {
    installIconEditor();
  } catch {
    /* non-fatal: the legacy controls still work */
  }

  // Fallback: if the editor's inject path is ever bypassed, still bake the legacy
  // display-time adjustment into the saved image on 保存する. No-ops once the crop
  // is already baked (adjustment reset to default), so it never double-applies.
  try {
    installAvatarBake();
  } catch {
    /* non-fatal */
  }

  // Publish each user's profile background (cover image + crop) to their PUBLIC
  // card, and render OTHER users' backgrounds on their profile — the legacy app
  // only ever showed your OWN cover. publish runs on boot (existing covers
  // backfill automatically) + on save; render reads the friend's card by shortId.
  try {
    installCoverSync();
  } catch {
    /* non-fatal */
  }
  try {
    installFriendCover();
  } catch {
    /* non-fatal */
  }

  // Swipe left/right between the bottom-nav tabs (ホーム / 学習 / ひろば …) on phones.
  try {
    installSwipeNav();
  } catch {
    /* non-fatal */
  }

  // Developer-only: live Firestore read/write counter (gated by the `developer`
  // custom claim; non-developers see nothing).
  try {
    installReadCounter();
  } catch {
    /* non-fatal */
  }

  // Persist hamster furniture (purchases + placement) to the user's own subtree;
  // load it when the room is opened.
  try {
    installHamsterSync();
  } catch {
    /* non-fatal */
  }

  // Replace the legacy "先生からの問題 / 配布アプリ" student list with a React screen
  // that records opened items so they move to 過去 (bug 2-1).
  try {
    installStudentApps();
  } catch {
    /* non-fatal: the legacy list still works */
  }


  // Debug-only: re-check the identity after boot settles, to catch a delayed
  // anonymous-session replacement (uid/isAnonymous at 1s and 4s).
  if (authDebugOn()) {
    scheduleAuthIdentityProbes(() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    });
  }

  return { uid, ensured };
}
