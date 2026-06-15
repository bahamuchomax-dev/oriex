import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/* Guards the post-cutover security audit/risk register so its safety-critical
 * items can't be quietly dropped. Docs-only. */

const DOC = "POST_CUTOVER_SECURITY_AUDIT.md";
const doc = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";

describe("post-cutover security audit", () => {
  it("exists and is docs-only (no code/rules/deploy)", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(doc).toMatch(/docs only/i);
    expect(doc).toMatch(/no deploy/i);
  });
  it("registers the legacy password roster and genronkai.miwa bypass risks", () => {
    expect(doc).toMatch(/password roster/i);
    expect(doc).toMatch(/genronkai\.miwa/);
  });
  it("registers old plaintext password fields in Firestore (Admin-SDK removal, gated)", () => {
    expect(doc).toMatch(/profile\/main\.password|plaintext `?password`? fields/i);
    expect(doc).toMatch(/Admin SDK/);
    expect(doc).toMatch(/compromised/i);
  });
  it("covers public directory hygiene, custom claims, legacy retirement, App Check", () => {
    expect(doc).toMatch(/public directory/i);
    expect(doc).toMatch(/custom claims/i);
    expect(doc).toMatch(/retire/i);
    expect(doc).toMatch(/App Check/i);
  });
  it("lists the #21 deployment prerequisites and keeps standing invariants", () => {
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/test:rules/);
    expect(doc).toMatch(/explicit deploy approval/i);
    expect(doc).toMatch(/never restore.*allow read, write: if true|allow read, write: if true/i);
    expect(doc).toMatch(/never read.*profile\/main\.password|profile\/main\.password/i);
  });
});
