# src/firebase

Firebase wiring for the project.

- `firebaseConfig.js` — config object, read from Vite env vars with the v6.9
  values as fallback.
- `firebase.js` — initializes the app once and exports `auth` and `db`.
- `firestorePaths.js` — every Firestore path as a function, plus `refs`
  factories. **Never hard-code path strings elsewhere — import from here.**

Some paths are confirmed from the dist; a few are marked `TODO` and need
verification against the real Firestore. See `docs/firestore.md`.
