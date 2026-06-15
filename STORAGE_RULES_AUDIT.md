# Storage Rules Audit (Phase 4.7)

- Date: 2026-06-15
- Firebase project: `genro-b74de`
- Status: **Storage is not enabled / Storage Rules not available in Console.**

## Console finding

Firebase Console → Storage shows: *"Storage を使用するには、プロジェクトの料金
プランをアップグレードしてください"* (upgrade required to use Storage). On the
current Spark (free) plan, **Firebase Storage is not enabled**, and **no Storage
Rules are available to read** in the Console.

## Audit result

- **Storage Rules `allow read, write: if true` was NOT confirmed** — but only
  because Storage is not enabled and no rules are exposed.
- **The Storage Rules audit was therefore NOT performed** (there is no deployed
  Storage ruleset to evaluate). This is distinct from "verified safe": it is
  "not applicable yet / unverifiable".

## Repository Storage usage

| Location | Type | Active? |
| --- | --- | --- |
| `src/legacy/oriex-app.bundle.js` | references `firebase/storage` | Frozen legacy bundle; would only work if Storage were enabled |
| `legacy-dist/*` | old build artifact | Not the live source |
| (non-legacy `src/**`) | — | **No active Firebase Storage usage found** |

- Modern/non-legacy source does **not** use Firebase Storage.
- Avatar / home-room images are stored **locally in IndexedDB**
  (`src/services/avatarStorage.js`, `src/features/home/homePhotoStorage.js`), not
  in Firebase Storage.
- Because Storage is not enabled on the project, any legacy Storage-backed feature
  in the frozen bundle **would not work in production** today.

## Required action if Storage is enabled later

When Firebase Storage is enabled, **immediately** publish least-privilege
`storage.rules` (before any client can upload) and **forbid public write**. Do not
leave the default/open ruleset. Suggested starting point (proposal only — NOT
created or deployed here):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // user-owned uploads: users/{uid}/...
    match /users/{uid}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 5 * 1024 * 1024            // <=5MB
                   && request.resource.contentType.matches('image/(jpeg|png|webp)'); // no svg/html/js
    }
    // everything else denied
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Guidance for that future ruleset:
- No `allow read, write: if true`; no broad `if request.auth != null` write to
  arbitrary paths.
- Bind writes to `request.auth.uid == {uid}` in the path (owner-only).
- Public read only for assets that genuinely must be public.
- Teacher/admin-only paths gated by **custom claims** (see
  TEACHER_CUSTOM_CLAIMS_PLAN.md), not client fields.
- Enforce `request.resource.size` limits and an allow-list `contentType`
  (`image/jpeg|png|webp`); **disallow `image/svg+xml`, `text/html`, JS** to avoid
  stored-XSS / script upload.
- No cross-user read/overwrite/delete.

## Constraints honored

- docs-only; no `storage.rules` created/changed; no rules deployed; no runtime
  changes; no real data/images added.
