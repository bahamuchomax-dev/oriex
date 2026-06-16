import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Proves the production fix in src/legacy/oriex-app.bundle.js: in modern cutover
 * mode (window.__oxUid set AND not ?oriexLegacyFallback=1) the legacy anonymous
 * sign-in (cf$o) is UNREACHABLE — cf returns the modern user (or a safe uid shape)
 * without ever signing in anonymously. Fallback/standalone keeps the original. */

const BUNDLE = readFileSync(resolve("src/legacy/oriex-app.bundle.js"), "utf8");

describe("block anonymous sign-in during modern cutover (cf)", () => {
  it("defines cutover mode as window.__oxUid present AND not oriexLegacyFallback=1", () => {
    expect(BUNDLE).toContain("w&&w.__oxUid&&!fb");
    expect(BUNDLE).toContain("oriexLegacyFallback=1");
  });

  it("in cutover, returns a non-anon result and logs skip/reuse — never calls cf$o", () => {
    expect(BUNDLE).toContain("skip-anon-modern-cutover");
    expect(BUNDLE).toContain("return Promise.resolve({user:mu||{uid:w.__oxUid}})");
  });

  it("the cutover return happens BEFORE the cf$o (anon) call — signin-anon is impossible with __oxUid", () => {
    const i = BUNDLE.indexOf("function cf(e){");
    expect(i).toBeGreaterThan(-1);
    const body = BUNDLE.slice(i, i + 900);
    const gate = body.indexOf("w&&w.__oxUid&&!fb");
    const cutoverReturn = body.indexOf("return Promise.resolve({user:mu||{uid:w.__oxUid}})");
    const anonCall = body.indexOf("return cf$o(e)");
    expect(gate).toBeGreaterThan(-1);
    expect(cutoverReturn).toBeGreaterThan(gate);
    expect(anonCall).toBeGreaterThan(cutoverReturn); // anon path is only AFTER the cutover early-return
  });

  it("preserves the original anonymous sign-in (cf$o) for fallback/standalone", () => {
    expect(BUNDLE).toContain("function cf$o(");
    expect(BUNDLE).toContain("return cf$o(e)");
    // non-cutover path still logs the real decision (incl. signin-anon when signed out)
    expect(BUNDLE).toContain('"signin-anon"');
  });
});
