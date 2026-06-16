import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Guards for the surgical production fixes in src/legacy/oriex-app.bundle.js:
 *   1. cf (signInAnonymously) reuses an existing session instead of replacing the
 *      modern cutover session with a new anonymous user.
 *   2. The student stage/task-progress write+read use the owner path
 *      users/{uid}/taskProgress (isSelf) instead of the Rules-blocked
 *      public/data/taskProgress (write:false).
 * Text assertions because the bundle is minified/frozen; we also assert the
 * Firestore Rules were NOT loosened. */

const BUNDLE = readFileSync(resolve("src/legacy/oriex-app.bundle.js"), "utf8");
const RULES = readFileSync(resolve("firestore.rules"), "utf8");

describe("legacy anonymous-session guard (cf)", () => {
  it("reuses an existing signed-in user; only signs in anon when there is no user", () => {
    // Wrapper returns the existing currentUser; original preserved as cf$o.
    expect(BUNDLE).toContain("if(e&&e.currentUser)return Promise.resolve({user:e.currentUser})");
    expect(BUNDLE).toContain("async function cf$o(e){");
    expect(BUNDLE).toContain("return cf$o(e)");
  });

  it("the guard adds no password/plaintext-login access", () => {
    expect(BUNDLE).not.toContain("currentUser.password");
    // we did not add a plaintext compare
    expect(BUNDLE).not.toContain("e.currentUser.password");
  });
});

describe("stage/task progress persists on an owner-only path", () => {
  it("student write + own read target users/{uid}/taskProgress (isSelf)", () => {
    expect(BUNDLE).toContain('"users",e.uid,"taskProgress"');
    // student write keeps its doc id under the owner path
    expect(BUNDLE).toContain('"users",e.uid,"taskProgress",`${u.id}__${e.uid}`');
    // student own-read (where uid==self) now reads from the owner path
    expect(BUNDLE).toContain('"users",e.uid,"taskProgress"),wc("uid","==",e.uid)');
  });

  it("no student write/own-read targets the Rules-blocked public/data/taskProgress path", () => {
    // the write site (doc-id template right after the path) is gone from public/data
    expect(BUNDLE).not.toContain('"public","data","taskProgress",`');
    // the student own-read is gone from public/data
    expect(BUNDLE).not.toContain('"public","data","taskProgress"),wc("uid","==",e.uid)');
  });
});

describe("profile save targets the owner uid path", () => {
  it("writes the profile to artifacts/{appId}/users/{uid}/profile/main", () => {
    expect(BUNDLE).toContain('"users",C,"profile","main"');
  });
});

describe("Firestore Rules unchanged (not loosened)", () => {
  it("public/data writes remain denied", () => {
    expect(RULES).toContain("allow write: if false");
    expect(RULES).toMatch(/match \/public\/data\/\{document=\*\*\}/);
  });
  it("owner subtree write stays gated by isSelf (the path we remapped to)", () => {
    expect(RULES).toMatch(/match \/users\/\{uid\}\/\{document=\*\*\}[\s\S]{0,80}allow read, write: if isSelf\(uid\)/);
  });
});
