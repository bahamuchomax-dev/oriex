# Granting teacher rights (admin only)

There is **no in-app way** to become a teacher — by design, a student must not be
able to self-promote. Teacher authority is a **server-set Firebase custom claim**
(`request.auth.token.teacher`, checked in `firestore.rules`). An admin grants it
with `scripts/grantTeacher.mjs`.

## What it does

1. Sets the custom claim `{ teacher: true }` on the user (the real authority).
2. Sets `isTeacher: true` on the user's profile docs (top-level + legacy path) so
   the legacy app shows the teacher UI.

Admin SDK writes bypass Firestore Rules, so no rules change/deploy is needed.

## Prerequisites

- An Admin SDK credentials JSON for the project (download from the Firebase
  console → Project settings → Service accounts → *Generate new private key*).
  **Never commit this file.** Keep it outside the repo or in a git-ignored path.
- Install the admin-only tool (not a runtime dependency):

  ```sh
  npm i firebase-admin
  ```

## Usage

```sh
# grant
ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
  node scripts/grantTeacher.mjs <uid>

# revoke
ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
  node scripts/grantTeacher.mjs <uid> --revoke
```

- Find a user's `uid`: have them open the app with `?oriexAuthDebug=1` (it shows
  the internal ID), or look it up in Firebase Auth.
- **The user must sign out and sign back in** for the new claim to take effect
  (custom claims refresh on token renewal).

## Notes

- The credentials JSON is read at runtime via `ORIEX_SA_KEY` and is **never**
  stored in this repo.
- No password is read, written, or logged.
- This is the only supported teacher-provisioning path; `teacherAllowlist` and the
  teacher-only collections remain admin/claim gated in `firestore.rules`.
