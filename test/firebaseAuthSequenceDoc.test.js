import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/* Guards the Firebase Auth implementation-sequence plan so its safety-critical
 * invariants can't be quietly dropped. Docs-only; no runtime behaviour. */

const PATH = "FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md";

describe("Firebase Auth implementation sequence plan", () => {
  const doc = existsSync(PATH) ? readFileSync(PATH, "utf8") : "";

  it("exists", () => {
    expect(existsSync(PATH)).toBe(true);
  });
  it("keeps profile/main owner-only and forbids unauthenticated read", () => {
    expect(doc).toMatch(/profile\/main/);
    expect(doc).toMatch(/owner-only/i);
    expect(doc).toMatch(/never (?:publicly|re-open)|unauthenticated/i);
  });
  it("forbids storing a password in Firestore (Firebase Auth owns passwords)", () => {
    expect(doc).toMatch(/no document ever stores a password|stores no password/i);
    expect(doc).toMatch(/Firebase Auth owns passwords/i);
  });
  it("orders the #21 rules hardening AFTER the app migration (cutover safety)", () => {
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/only after|then.*deploy.*#21|after .* migration/i);
  });
  it("treats existing plaintext passwords as compromised (forced reset / re-register)", () => {
    expect(doc).toMatch(/compromised/i);
    expect(doc).toMatch(/re-registration|forced password reset|password reset/i);
  });
  it("forbids loosening rules on rollback and restoring allow-true", () => {
    expect(doc).toMatch(/Never.*loosening rules|do not.*loosen/i);
    expect(doc).toMatch(/allow read, write: if true/);
  });
});
