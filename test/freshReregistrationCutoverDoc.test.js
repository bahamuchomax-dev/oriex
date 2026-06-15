import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/* Guards the fresh re-registration cutover UX plan so its safety-critical
 * content can't be quietly dropped. Docs-only. */

const DOC = "FRESH_REREGISTRATION_CUTOVER_UX.md";
const doc = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";

describe("fresh re-registration cutover UX plan", () => {
  it("exists and is docs-only (no deploy / no rules change here)", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(doc).toMatch(/docs only/i);
    expect(doc).toMatch(/no deploy/i);
  });
  it("explains old Friend ID + old password cannot be trusted (compromised)", () => {
    expect(doc).toMatch(/compromised/i);
    expect(doc).toMatch(/never read.*reuse|never reuse|never read/i);
  });
  it("states a public Friend ID is not proof of ownership (takeover/pre-empt)", () => {
    expect(doc).toMatch(/public/i);
    expect(doc).toMatch(/takeover|pre-empt/i);
    expect(doc).toMatch(/system-generated|generate/i);
  });
  it("describes fresh re-registration with no old-password read and no auto continuity", () => {
    expect(doc).toMatch(/fresh re-registration/i);
    expect(doc).toMatch(/profile\/main\.password|no .*old password/i);
    expect(doc).toMatch(/does \*\*not\*\* promise automatic continuity|no.*continuity/i);
  });
  it("defers continuity to teacher/admin + Admin SDK (no client-side admin)", () => {
    expect(doc).toMatch(/teacher\/admin|teacher/i);
    expect(doc).toMatch(/Admin SDK/);
    expect(doc).toMatch(/no client-side admin/i);
  });
  it("includes a cutover message draft that retires the old login", () => {
    expect(doc).toMatch(/Cutover message draft/i);
    expect(doc).toMatch(/新しいアカウントを作成|create a new account/i);
    expect(doc).toMatch(/先生・管理者|teacher\/admin/i);
  });
  it("keeps the rollback invariants and #21 blocked", () => {
    expect(doc).toMatch(/never re-open|never restore|allow read, write: if true/i);
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/draft\/blocked|remains.*blocked/i);
  });
});
