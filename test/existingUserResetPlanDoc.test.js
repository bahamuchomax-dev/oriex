import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/* Guards the existing-user reset/re-registration plan + the manual-test record so
 * their safety-critical content can't be quietly dropped. Docs-only. */

const RESET = "EXISTING_USER_RESET_PLAN.md";
const SEQ = "FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md";

describe("existing-user reset/re-registration plan", () => {
  const doc = existsSync(RESET) ? readFileSync(RESET, "utf8") : "";

  it("exists and is docs-only (no code/Cloud Functions/migration/deploy here)", () => {
    expect(existsSync(RESET)).toBe(true);
    expect(doc).toMatch(/docs only/i);
    expect(doc).toMatch(/no deploy/i);
  });
  it("forbids reading/reusing the compromised legacy password", () => {
    expect(doc).toMatch(/compromised/i);
    expect(doc).toMatch(/[Nn]ever read .*profile\/main\.password|profile\/main\.password/);
    expect(doc).toMatch(/never reuse/i);
  });
  it("keeps profile/main owner-only and forbids re-opening reads", () => {
    expect(doc).toMatch(/owner-only/i);
    expect(doc).toMatch(/never re-open|never restore|allow read, write: if true/i);
  });
  it("names the public-Friend-ID account-takeover risk as the core decision", () => {
    expect(doc).toMatch(/takeover|pre-empt/i);
    expect(doc).toMatch(/public/i);
  });
  it("defers cross-user re-key to server-side Admin SDK (no client admin ops)", () => {
    expect(doc).toMatch(/Admin SDK/);
    expect(doc).toMatch(/no client-side admin/i);
  });
  it("keeps the #21 rules hardening blocked until after migration + approval", () => {
    expect(doc).toMatch(/#21/);
  });
});

describe("manual verification log (sequence doc)", () => {
  const seq = existsSync(SEQ) ? readFileSync(SEQ, "utf8") : "";
  it("records the opt-in shell PASS without a deploy or password field", () => {
    expect(seq).toMatch(/Manual verification log/i);
    expect(seq).toMatch(/KWFAQA/);
    expect(seq).toMatch(/no `password` field present|no password field/i);
    expect(seq).toMatch(/No deploy/i);
  });
});
