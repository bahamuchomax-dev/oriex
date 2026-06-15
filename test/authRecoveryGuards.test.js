import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/* Auth recovery guard tests (see AUTH_RECOVERY_PLAN.md).
 *
 * The legacy bundle did client-side plaintext "auth": resolve a Friend ID via
 * the public login directories, read `artifacts/{appId}/users/{uid}/profile/main`
 * and compare `data.password` on the client. During the `allow read,write: if
 * true` window that doc was world-readable, so every plaintext password is
 * compromised. These STATIC guards lock the invariants so the pattern cannot be
 * reintroduced via rules drift or new client code. (No emulator: Java not
 * installed; behavioural rules tests are `npm run test:rules`.) */

const RULES = readFileSync("firestore.rules", "utf8");
// rules with comments stripped, so doc comments that mention `if true` /
// `password` for explanatory purposes do not cause false positives.
const RULES_CODE = RULES.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CREDENTIAL_FIELDS = ["password", "passwordHash", "pass", "pin", "secret", "credential"];

/* text of `match <path> { ... }` with balanced braces */
function block(path) {
  const header = "match " + path;
  const start = RULES.indexOf(header);
  if (start === -1) throw new Error("rule block not found: " + path);
  const lineEnd = RULES.indexOf("\n", start);
  const open = RULES.lastIndexOf("{", lineEnd);
  let depth = 0;
  for (let i = open; i < RULES.length; i++) {
    if (RULES[i] === "{") depth++;
    else if (RULES[i] === "}") {
      depth--;
      if (depth === 0) return RULES.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces for: " + path);
}

describe("auth recovery — no plaintext credential may be stored", () => {
  it("defines noSecretFields() banning every credential field", () => {
    const m = RULES.match(/function noSecretFields\(\)\s*\{[\s\S]*?\}/);
    expect(m).toBeTruthy();
    for (const f of CREDENTIAL_FIELDS) expect(m[0].includes("'" + f + "'")).toBe(true);
  });

  it("the world-readable Friend ID login directories forbid credential writes", () => {
    // both artifacts public-read directories (the only `if true` reads) AND
    // noSecretFields() into their writes, so a password can never be written
    // where it could be read unauthenticated.
    expect(RULES_CODE).toMatch(
      /customApp\/\{cardUid\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(cardUid\) && noSecretFields\(\);/,
    );
    expect(RULES_CODE).toMatch(
      /teacherIndex\/\{docId\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(docId\) &&[^\n]*noSecretFields\(\);/,
    );
  });

  it("the legacy self profile (where the plaintext password lived) forbids credential writes", () => {
    const b = block("/users/{u}/profile/main");
    // create and the self-update branch both AND noSecretFields()
    expect(b).toMatch(/create:[\s\S]*noSecretFields\(\)/);
    expect(b).toMatch(/update:[\s\S]*isSelf\(u\) && authorityUnchanged\(\) && noSecretFields\(\)/);
  });

  it("the top-level public customApp card also forbids credential writes", () => {
    const b = block("/public/data/customApp/{cardUid}");
    expect(b).toMatch(/create, update:[\s\S]*noSecretFields\(\)/);
  });
});

describe("auth recovery — profile/main is never unauthenticated-readable", () => {
  it("legacy top-level profile/main read requires the owner (no `if true`, no bare signedIn)", () => {
    const r = block("/users/{u}/profile/main").match(/allow read:[^\n]*/)[0];
    expect(r).toContain("isSelf(u)");
    expect(r).not.toMatch(/if true/);
    expect(r).not.toMatch(/if signedIn\(\)/);
  });
  it("the artifacts live-app per-user subtree (holds profile/main) is owner-only", () => {
    expect(RULES_CODE).toMatch(
      /match \/users\/\{uid\}\/\{document=\*\*\}\s*\{\s*allow read, write: if isSelf\(uid\);/,
    );
  });
});

describe("auth recovery — public (unauthenticated) read surface is locked", () => {
  it("exactly two `allow read: if true` — only the Friend ID login directories", () => {
    const reads = RULES_CODE.match(/allow read: if true;/g) || [];
    expect(reads.length).toBe(2);
    expect(RULES_CODE).toMatch(/customApp\/\{cardUid\}\s*\{\s*allow read: if true;/);
    expect(RULES_CODE).toMatch(/teacherIndex\/\{docId\}\s*\{\s*allow read: if true;/);
  });
  it("no `allow read, write: if true` wildcard survives anywhere", () => {
    expect(RULES_CODE).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/);
  });
});

/* ---- source guard: modern code must not reintroduce client-side plaintext auth ---- */

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      // skip the frozen legacy bundle (reference-only, holds the old pattern)
      if (p.replace(/\\/g, "/").includes("src/legacy")) continue;
      walk(p, out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

describe("auth recovery — modern src has no client-side plaintext password compare", () => {
  const files = walk("src");
  it("no equality/inequality comparison against a `.password` field outside the legacy bundle", () => {
    const offenders = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // `x.password === y`, `x.password !== y`, `x.password == y` — plaintext compare
      if (/\.password\s*[!=]==?/.test(src)) offenders.push(f.replace(/\\/g, "/"));
    }
    expect(offenders).toEqual([]);
  });
  it("the auth feature is driven by Firebase Auth state, not a Firestore password read", () => {
    const provider = readFileSync("src/features/auth/AuthProvider.jsx", "utf8");
    expect(provider).toContain("onAuthStateChanged");
    expect(provider).not.toMatch(/\.password/);
  });
});

describe("auth recovery — the recovery plan records the incident", () => {
  it("AUTH_RECOVERY_PLAN.md exists and documents compromise + forced reset", () => {
    expect(existsSync("AUTH_RECOVERY_PLAN.md")).toBe(true);
    const plan = readFileSync("AUTH_RECOVERY_PLAN.md", "utf8");
    expect(plan).toMatch(/compromised/i);
    expect(plan).toMatch(/force[\s\S]{0,20}reset/i);
    expect(plan).toMatch(/profile\/main\.password|profile","main/);
  });
});
