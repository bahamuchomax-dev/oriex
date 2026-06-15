import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Static checks over firestore.rules. We have no Firebase emulator yet, so
 * instead of executing the rules we assert that the hardened guards are
 * present in the rules source. These catch regressions like a block reverting
 * to `if isTeacher()` or `if signedIn()`. Emulator-based behavioural tests are
 * tracked as not-yet-done in docs/FIREBASE_READ_AUDIT.md. */

const RULES = readFileSync("firestore.rules", "utf8");

/* Return the text of `match <path> { ... }` with balanced braces. */
function block(path) {
  const header = "match " + path;
  const start = RULES.indexOf(header);
  if (start === -1) throw new Error("rule block not found: " + path);
  // the opening brace is the LAST `{` on the header line — the earlier `{`
  // tokens are path placeholders like {u} / {id}.
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

const ANSWER_FIELDS = ["answer", "correctAnswer", "explanation", "solution", "answerKey"];
const PRIVILEGED = ["role", "isTeacher", "teacherId", "admin"];

describe("firestore.rules — profiles whitelist", () => {
  const b = block("/profiles/{u}");
  it("uses hasOnly on both create and update (whitelist, not blocklist)", () => {
    expect(b).toMatch(/create:[\s\S]*hasOnly\(\[/);
    expect(b).toMatch(/update:[\s\S]*affectedKeys\(\)[\s\S]*hasOnly\(\[/);
  });
  it("does not allow self to write role / isTeacher / teacherId / admin", () => {
    // those fields must not appear inside any self hasOnly([...]) allow-list
    const allowLists = b.match(/hasOnly\(\[[^\]]*\]\)/g) || [];
    for (const list of allowLists) {
      for (const field of PRIVILEGED) {
        expect(list.includes("'" + field + "'")).toBe(false);
      }
    }
  });
  it("only admin (or self within whitelist) can update; admin alone for delete", () => {
    expect(b).toMatch(/update:\s*if isAdmin\(\)/);
    expect(b).toMatch(/delete:\s*if isAdmin\(\)/);
  });
});

describe("firestore.rules — records / bookLogs uid binding", () => {
  it("ownsRow() pins data.userId to the signed-in uid", () => {
    expect(RULES).toMatch(/function ownsRow\(\)\s*\{\s*return request\.resource\.data\.userId == request\.auth\.uid;/);
  });
  for (const path of ["/users/{u}/records/{id}", "/users/{u}/bookLogs/{id}"]) {
    it(`${path} requires ownsRow() and whitelists fields on write`, () => {
      const b = block(path);
      expect(b).toMatch(/create:[\s\S]*ownsRow\(\)/);
      expect(b).toMatch(/create:[\s\S]*hasOnly\(\[/);
      expect(b).toMatch(/update:[\s\S]*ownsRow\(\)/);
      // write is owner-only (no bare isTeacher / signedIn write)
      expect(b).not.toMatch(/allow write:/);
    });
  }
});

describe("firestore.rules — deliveredProblems are assignment-scoped & answer-free", () => {
  const b = block("/users/{u}/deliveredProblems/{id}");
  it("teacher writes are limited to the assigned teacher or admin (not any teacher)", () => {
    expect(b).toMatch(/create, update:\s*if \(isAdmin\(\) \|\| teaches\(u\)\)/);
    // must NOT be a bare isTeacher() write
    expect(b).not.toMatch(/create, update, delete:\s*if isTeacher\(\);/);
  });
  it("requires the row to be addressed to the path owner and forbids answers", () => {
    expect(b).toMatch(/request\.resource\.data\.userId == u/);
    expect(b).toMatch(/noAnswerFields\(\)/);
  });
  it("noAnswerFields() bans answer/correctAnswer/explanation/solution/answerKey", () => {
    const fn = RULES.match(/function noAnswerFields\(\)[\s\S]*?\}/)[0];
    for (const f of ANSWER_FIELDS) expect(fn.includes("'" + f + "'")).toBe(true);
  });
});

describe("firestore.rules — top-level deliveredProblems read tightened", () => {
  const b = block("/deliveredProblems/{id}");
  it("is no longer readable by every signed-in user", () => {
    expect(b).not.toMatch(/read:\s*if signedIn\(\)/);
    expect(b).toMatch(/read:\s*if isTeacher\(\)/);
  });
  it("still forbids answer fields on write", () => {
    expect(b).toMatch(/noAnswerFields\(\)/);
  });
});

describe("firestore.rules — teacherProblemAnswers not shared across all teachers", () => {
  const b = block("/teacherProblemAnswers/{id}");
  it("does not grant blanket read/write to any teacher", () => {
    expect(b).not.toMatch(/allow read, write:\s*if isTeacher\(\);/);
    expect(b).not.toMatch(/read:\s*if isTeacher\(\);/);
  });
  it("scopes reads to the owning teacher (teacherId) or admin only — READ POLICY A", () => {
    const r = clause(b, "read");
    expect(r).toContain("resource.data.teacherId == request.auth.uid");
    expect(r).toContain("isAdmin()");
    // Policy A: an assigned student's OTHER teachers must NOT read the doc,
    // so the read clause must NOT use a studentUid-based grant.
    expect(r).not.toContain("studentUid");
  });
  it("students are never granted read (no signedIn / isSelf read path here)", () => {
    expect(b).not.toMatch(/signedIn\(\)/);
    expect(b).not.toMatch(/isSelf/);
  });
});

describe("firestore.rules — global posture", () => {
  it("ends with an explicit default-deny", () => {
    expect(RULES).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);
  });
  it("derives roles from server-set custom claims, not client fields", () => {
    expect(RULES).toMatch(/request\.auth\.token\.teacher/);
    expect(RULES).toMatch(/request\.auth\.token\.admin/);
  });
});

/* Return the text of an `allow <action>` clause within a block. */
function clause(blockText, action) {
  const parts = blockText.split(/allow /).filter(Boolean);
  return parts.find((p) => p.startsWith(action)) || "";
}

describe("firestore.rules — teacherId anti-spoofing & studentUid recheck (stage 4.5)", () => {
  it("answer update re-checks teaches(studentUid)", () => {
    const u = clause(block("/teacherProblemAnswers/{id}"), "update");
    expect(u).toContain("teaches(request.resource.data.studentUid)");
    // teacherId must remain the writer's own uid
    expect(u).toContain("request.resource.data.teacherId == request.auth.uid");
  });

  for (const path of ["/public/data/teacherProblems/{id}", "/deliveredProblems/{id}"]) {
    it(`${path} binds teacherId to the writer with an admin exception`, () => {
      const c = clause(block(path), "create, update");
      expect(c).toContain("request.resource.data.teacherId == request.auth.uid");
      expect(c).toContain("isAdmin()");
      expect(c).toContain("noAnswerFields()");
    });
  }

  it("per-student deliveredProblems does NOT allow a teacherId field (policy B)", () => {
    const c = clause(block("/users/{u}/deliveredProblems/{id}"), "create, update");
    const allowList = (c.match(/hasOnly\(\[[^\]]*\]\)/) || [""])[0];
    expect(allowList).not.toContain("'teacherId'");
    // still pinned to the path owner
    expect(c).toContain("request.resource.data.userId == u");
  });
});

describe("firestore.rules — admin not exempt from answer ban & owner-limited delete (stage 4.6)", () => {
  for (const path of ["/public/data/teacherProblems/{id}", "/deliveredProblems/{id}"]) {
    it(`${path}: admin create/update still passes noAnswerFields + whitelist`, () => {
      const c = clause(block(path), "create, update");
      // the (admin || teacher==self) group is AND-ed with noAnswerFields()
      expect(c).toMatch(/\(isAdmin\(\) \|\| \(isTeacher\(\)[\s\S]*\)\)\s*&&[\s\S]*noAnswerFields\(\)/);
      expect(c).toMatch(/hasOnly\(\[/);
    });
    it(`${path}: delete is owner-limited (not isTeacher() alone)`, () => {
      const d = clause(block(path), "delete");
      expect(d).toContain("resource.data.teacherId == request.auth.uid");
      expect(d).toContain("isAdmin()");
      expect(d).not.toMatch(/^delete:\s*if isTeacher\(\);/);
    });
  }

  it("teacherProblemAnswers read policy matches docs (Policy A)", () => {
    const audit = readFileSync("docs/FIREBASE_READ_AUDIT.md", "utf8");
    expect(audit).toContain("READ POLICY = A");
    const r = clause(block("/teacherProblemAnswers/{id}"), "read");
    expect(r).not.toContain("studentUid"); // A: no assigned-student read
  });
});

/* ---- Phase 4.6: critical fix — no public wildcard + legacy least-privilege ---- */
// Rules source with comments stripped, so doc comments that quote the old
// `allow read, write: if true` wildcard do not cause false positives.
const RULES_CODE = RULES.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("firestore.rules — no public wildcard (critical fix)", () => {
  it("never grants a write or full read+write via `if true` (comments ignored)", () => {
    // No full read+write wildcard, and no mutation may be `if true`.
    expect(RULES_CODE).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/);
    expect(RULES_CODE).not.toMatch(/allow\s+(?:write|create|update|delete)\b[^\n]*:\s*if\s+true\b/);
  });
  it("public (unauthenticated) read is limited to the Friend ID login directories", () => {
    // exactly TWO `allow read: if true` — the customApp + teacherIndex login
    // directories used for unauthenticated Friend ID resolution. Nothing else.
    const reads = RULES_CODE.match(/allow read: if true;/g) || [];
    expect(reads.length).toBe(2);
    // both public reads belong to the Friend ID login directories (the artifacts
    // customApp/teacherIndex blocks; the modern top-level customApp stays signedIn)
    expect(RULES_CODE).toMatch(/customApp\/\{cardUid\}\s*\{\s*allow read: if true;/);
    expect(RULES_CODE).toMatch(/teacherIndex\/\{docId\}\s*\{\s*allow read: if true;/);
  });
  it("has no broadly-writable public/data wildcard (read-only artifacts wildcard is OK)", () => {
    // The only public/data {document=**} wildcard is the legacy artifacts tree,
    // and it must be READ-ONLY (signed-in read, write denied).
    const m = RULES_CODE.match(/match \/public\/data\/\{document=\*\*\}\s*\{([\s\S]*?)\}/);
    expect(m).toBeTruthy();
    expect(m[1]).toContain("allow read: if signedIn()");
    expect(m[1]).toContain("allow write: if false");
  });
  it("ends with an explicit default-deny", () => {
    expect(RULES).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);
  });
});

describe("firestore.rules — legacy artifacts live-app tree is least-privilege", () => {
  it("covers the artifacts/{appId} tree", () => {
    expect(RULES).toContain("match /artifacts/{appId}");
  });
  it("per-user subtree is owner-only (no cross-user, no signed-in-wide)", () => {
    expect(RULES_CODE).toMatch(
      /match \/users\/\{uid\}\/\{document=\*\*\}\s*\{\s*allow read, write: if isSelf\(uid\);/,
    );
  });
  it("shared public/data is signed-in read and not broadly writable", () => {
    expect(RULES_CODE).toMatch(
      /match \/public\/data\/\{document=\*\*\}\s*\{\s*allow read: if signedIn\(\);\s*allow write: if false;/,
    );
  });
  it("customApp is public-read (primary Friend ID directory) but self-write only", () => {
    expect(RULES_CODE).toMatch(
      /match \/public\/data\/customApp\/\{cardUid\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(cardUid\);/,
    );
  });
  it("teacherIndex is public-read (Friend ID login) but owner-write, answer/authority free", () => {
    expect(RULES_CODE).toMatch(
      /match \/public\/data\/teacherIndex\/\{docId\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(docId\) && noAuthorityFields\(\) && noAnswerFields\(\);/,
    );
  });
  it("other shared public/data stays signed-in read (not public)", () => {
    // the public/data wildcard read must require auth (only teacherIndex is public)
    expect(RULES_CODE).toMatch(
      /match \/public\/data\/\{document=\*\*\}\s*\{\s*allow read: if signedIn\(\);\s*allow write: if false;/,
    );
  });
});

describe("firestore.rules — legacy profile/main authority lockdown", () => {
  const b = block("/users/{u}/profile/main");
  it("self create cannot set isTeacher true and bans authority fields", () => {
    const c = clause(b, "create");
    expect(c).toContain("isSelf(u)");
    expect(c).toContain("request.resource.data.isTeacher == false");
    for (const f of ["role", "admin", "teacher", "teacherId", "claims", "permissions"]) {
      expect(c).toContain("'" + f + "'");
    }
  });
  it("self update cannot change authority fields", () => {
    expect(clause(b, "update")).toContain("authorityUnchanged()");
  });
  it("is not world-readable", () => {
    const r = clause(b, "read");
    expect(r).toContain("isSelf(u)");
    expect(r).not.toContain("if signedIn()");
  });
});

describe("firestore.rules — weeklyPlans scoping + student progress-only updates", () => {
  const b = block("/users/{u}/weeklyPlans/{planId}");
  it("read is not public; limited to self/admin/assigned teacher", () => {
    const r = clause(b, "read");
    expect(r).toContain("isSelf(u)");
    expect(r).toContain("teaches(u)");
    expect(r).not.toContain("if signedIn()");
  });
  it("create is teacher/admin only (no student create); teacher bound + answer-free", () => {
    const c = clause(b, "create").split(";")[0]; // condition only, excluding comments
    expect(c).toContain("request.resource.data.teacherUid == request.auth.uid");
    expect(c).toContain("request.resource.data.studentUid == u");
    expect(c).toContain("noAnswerFields()");
    expect(c).not.toContain("isSelf(u)"); // students cannot create a plan
  });
  it("student update is progress-only; teacher update stays bound + answer-free", () => {
    const u = clause(b, "update");
    expect(u).toContain("isSelf(u) && studentProgressOnly()");
    expect(u).toContain("resource.data.teacherUid == request.auth.uid");
    expect(u).toContain("noAnswerFields()");
  });
});

describe("firestore.rules — sentPlans student mirror is progress-only", () => {
  const b = block("/users/{u}/sentPlans/{planId}");
  it("student update only for own plan (studentUid==self) and progress-only", () => {
    const u = clause(b, "update");
    expect(u).toContain("resource.data.studentUid == request.auth.uid");
    expect(u).toContain("studentProgressOnly()");
  });
  it("create is teacher/admin only (no student create) and answer-free", () => {
    // condition only (up to the first ';'), excluding any following comment text
    const c = clause(b, "create").split(";")[0];
    expect(c).toContain("isSelf(u)");
    expect(c).toContain("noAnswerFields()");
    expect(c).not.toContain("studentUid"); // no student create path
  });
});

describe("firestore.rules — studentProgressOnly whitelists progress fields only", () => {
  const fn = RULES.match(/function studentProgressOnly\(\)[\s\S]*?\}/)[0];
  it("uses hasOnly with the progress field set", () => {
    expect(fn).toMatch(/affectedKeys\(\)[\s\S]*hasOnly\(\[/);
    for (const f of ["items", "overallProgress", "bookProgress", "updatedAt"]) {
      expect(fn).toContain("'" + f + "'");
    }
  });
  it("never allows teacher-content / ownership / authority / answer fields", () => {
    for (const f of [
      "title", "body", "tasks", "subject", "dueDate", "createdAt",
      "teacherUid", "studentUid", "teacherId", "userId",
      "role", "isTeacher", "admin", "claims", "permissions",
      "answer", "correctAnswer", "explanation", "solution", "answerKey",
    ]) {
      expect(fn).not.toContain("'" + f + "'");
    }
  });
});

describe("firestore.rules — legacy DM is participant-only", () => {
  const b = block("/chats/{pairId}/messages/{messageId}");
  it("read limited to participants", () => {
    expect(clause(b, "read")).toContain("dmParticipant(pairId)");
  });
  it("create requires participant and senderId == auth.uid", () => {
    const c = clause(b, "create");
    expect(c).toContain("dmParticipant(pairId)");
    expect(c).toContain("request.resource.data.senderId == request.auth.uid");
  });
  it("messages are immutable (no update/delete)", () => {
    expect(clause(b, "update, delete")).toContain("if false");
  });
  it("dmParticipant checks pairId participants", () => {
    const fn = RULES.match(/function dmParticipant\(pairId\)[\s\S]*?\}/)[0];
    expect(fn).toContain("request.auth.uid in pairId.split('__')");
  });
});

describe("firestore.rules — legacy public/data is not broadly writable", () => {
  it("customApp card is owner-write only", () => {
    expect(clause(block("/public/data/customApp/{cardUid}"), "create, update")).toContain(
      "isSelf(cardUid)",
    );
  });
  it("customVocabulary write is teacher/admin only and answer-free", () => {
    const c = clause(block("/public/data/customVocabulary/{wordId}"), "create, update, delete");
    expect(c).toContain("isTeacher() || isAdmin()");
    expect(c).toContain("noAnswerFields()");
  });
  it("bookShelf create is owner-bound (ownerUid == self), not world-write", () => {
    const c = clause(block("/public/data/bookShelf/{bookId}"), "create");
    expect(c).toContain("request.resource.data.ownerUid == request.auth.uid");
    expect(c).toContain("noAnswerFields()");
  });
  it("bookLogs create is owner-bound by uid", () => {
    const c = clause(block("/public/data/bookLogs/{logId}"), "create");
    expect(c).toContain("request.resource.data.uid == request.auth.uid");
  });
});
