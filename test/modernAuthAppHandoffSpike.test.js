import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/* Spike guards (docs + tiny static probe). These do NOT implement a handoff —
 * they lock the safe baseline the spike must preserve and guard the spike doc. */

const MAIN = readFileSync("src/main.js", "utf8");
const CLIENT = readFileSync("src/services/firebase/client.js", "utf8");
const DOC = "MODERN_AUTH_APP_HANDOFF_SPIKE.md";

describe("spike baseline — modern cutover is now the default boot", () => {
  it("main.js mounts the modern cutover by default (final else → startModernCutover)", () => {
    expect(MAIN).toContain("legacy/oriex-app.bundle.js"); // still imported (fallback)
    expect(MAIN).toMatch(/} else \{[\s\S]*?startModernCutover\(\);/);
  });
  it("the modern shell only mounts behind the opt-in gate (not default)", () => {
    expect(MAIN).toMatch(/isModernAuthEnabled\(oriexLocation\)/);
    // main.js does NOT mount the React App.jsx as the post-login app yet
    expect(MAIN).not.toMatch(/from\s+["']\.\/App(\.jsx)?["']/);
  });
  it("the React data layer is still a localStorage stub (not real Firestore)", () => {
    // documents why Option B is large: App.jsx is not wired to real Firestore yet
    expect(CLIENT).toMatch(/firebaseEnabled\s*=\s*false/);
  });
});

describe("spike doc — analysis + recommendation present", () => {
  const doc = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";
  it("exists and is investigation-only (no broad impl / flip / rules / deploy)", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(doc).toMatch(/No broad implementation|investigation/i);
    expect(doc).toMatch(/default[\s-]+(?:login\s+)?flip/i);
    expect(doc).toMatch(/no rules change/i);
    expect(doc).toMatch(/no deploy/i);
  });
  it("analyses Option A (legacy bridge) and Option B (React migration)", () => {
    expect(doc).toMatch(/Option A/);
    expect(doc).toMatch(/Option B/);
    expect(doc).toMatch(/onAuthStateChanged/);
    expect(doc).toMatch(/firebaseEnabled|localStorage/i);
  });
  it("recommends short-term A + long-term B, with a first probe PR", () => {
    expect(doc).toMatch(/Short-term: Option A|short-term.*A/i);
    expect(doc).toMatch(/Long-term: Option B|long-term.*B/i);
    expect(doc).toMatch(/probe-modern-auth-legacy-bridge/);
  });
  it("keeps the security invariants and #21 blocked", () => {
    expect(doc).toMatch(/profile\/main\.password/);
    expect(doc).toMatch(/plaintext/i);
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/never.*broad legacy|No broad legacy/i);
  });
});
