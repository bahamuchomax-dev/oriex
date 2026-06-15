# Deployed Firestore Rules — Note

Record of the production Firestore Rules deployment that resolved the critical
public-access exposure. See FIRESTORE_RULES_DRIFT_AUDIT.md for the original
finding and the rules design.

## Deployment record

- Date: 2026-06-15
- Firebase project: `genro-b74de`
- Deployed commit: `6fd833a` (main; "Correct legacy bookLogs/bookShelf rule field bindings")
- Deploy command: `firebase.cmd deploy --only firestore:rules --project genro-b74de`
- Result: **Deploy complete**
- Verified: the Firebase Console rules now show the long hardened ruleset
  (least-privilege + default-deny).

## Resolved

- 🟢 The previous deployed rules `match /{document=**} { allow read, write: if true; }`
  — full public read/write to every document — is **no longer in effect**.
  Production is no longer world-readable/writable.

## Remaining risks (open follow-ups)

1. **Storage Rules — not audited.** Firebase Storage may still be exposed
   (a similar `allow ... if true` there would be critical). Audit separately.
2. **Teacher/admin custom claims — not confirmed.** The rules authorize
   teacher/admin via `request.auth.token.teacher/admin`. If production teacher
   accounts lack these claims, teacher flows (plan send, vocab/bookShelf manage,
   assigned-student reads) will be denied. See TEACHER_CUSTOM_CLAIMS_PLAN.md.
3. **`npm run test:rules` — not run.** Emulator rules tests need Java 11+; only
   static tests (447 passing) were run. Run the emulator suite to validate live
   flows.
4. **`weeklyPlans` student update — not yet field-whitelisted.** A student can
   update their own plan doc broadly, not just progress fields.
5. **`sentPlans` student update — not yet field-whitelisted.** The student
   progress mirror is bound to `studentUid == self` but not restricted to
   progress/status-only fields.
6. **`chats/{pairId}` parent doc write — broad for participants.** Either
   participant can write the parent chat doc; consider tightening to the fields
   actually used (or deny parent writes if unused).
7. **`public/data/bookLogs` read — signed-in to all.** Confirm whether any
   signed-in user reading all book logs (incl. `uid`/`memo`) is intended.

## Constraints honored

- docs-only; no rules change; no re-deploy from this change.
