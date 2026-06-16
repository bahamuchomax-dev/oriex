import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Guards for the surgical edits to the PRODUCTION legacy bundle
 * (src/legacy/oriex-app.bundle.js):
 *   1. FIX: the anonymous-sign-in helper `cf` reuses an existing session instead
 *      of minting a new anonymous user that replaces the modern cutover session.
 *   2. INSTRUMENT: `setDoc` (`qn`) calls a debug-only window.__oxWriteHook.
 * These are text assertions because the bundle is minified/frozen. We also assert
 * legacy-dist is NOT the production source and nothing logs a password. */

const BUNDLE = readFileSync(
  resolve("src/legacy/oriex-app.bundle.js"),
  "utf8",
);

describe("legacy anonymous-session guard (cf)", () => {
  it("keeps the existing authenticated session instead of replacing it with a new anon user", () => {
    // Wrapper reuses e.currentUser; the original impl is preserved as cf$o.
    expect(BUNDLE).toContain("return Promise.resolve({user:e.currentUser})");
    expect(BUNDLE).toContain("async function cf$o(e){");
    // The wrapper delegates to the original when there is no current user.
    expect(BUNDLE).toContain("return cf$o(e)");
  });
});

describe("legacy setDoc write instrumentation (qn)", () => {
  it("invokes window.__oxWriteHook around setDoc, preserving the original as qn$o", () => {
    expect(BUNDLE).toContain('window.__oxWriteHook("setDoc",e,__qr)');
    expect(BUNDLE).toContain("function qn$o(e,t,i){");
    // The wrapper returns the original promise unchanged.
    expect(BUNDLE).toContain("var __qr=qn$o(e,t,i)");
  });
});

describe("safety", () => {
  it("the edits introduce no password logging", () => {
    expect(BUNDLE).not.toContain("__oxWriteHook(\"setDoc\",e,__qr,password");
    // hook passes only (op, ref, promise) — never the write data `t`.
    expect(BUNDLE).not.toContain('window.__oxWriteHook("setDoc",e,t');
  });

  it("is the production bundle (double-quoted Firestore path segments, not legacy-dist backticks)", () => {
    // The cutover imports this build; it uses doc(...,"profile","main"). The
    // separate legacy-dist build uses backticked `profile`,`main` segments.
    expect(BUNDLE).toContain('"profile","main"');
    expect(BUNDLE).not.toContain("`profile`,`main`");
  });
});
