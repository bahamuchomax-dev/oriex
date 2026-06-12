# Oriex — dev rebuild project

A **development-restart scaffold** for the Oriex app, created from the **v6.9
dist** (the minified GitHub Pages build).

> ⚠️ This is **not** a full restoration of the v6.9 app. The original source
> (`src/`, `package.json`, `vite.config`, etc.) was not available, so this project
> recreates a clean React + Vite + Firebase **foundation** to develop on, plus
> documentation of what could be recovered from the dist. Most features are
> scaffolds, not working implementations.

## What's here

```
package.json
vite.config.js
index.html              # dev entry (Vite)
.env.example            # Firebase config template (copy to .env)
src/
  main.jsx
  App.jsx               # screen switching + bottom nav scaffold
  firebase/             # firebase.js, firebaseConfig.js, firestorePaths.js
  features/             # auth, profile, friends, dm, studyDiary, plans, timer,
                        # books, vocabulary, customVocabulary, hamsterRoom,
                        # factory, records, settings  (each a scaffold)
  components/           # BottomNav.jsx, shared UI
  styles/               # tokens.css, global.css
docs/                   # what was recovered from the dist + rebuild plan
legacy-dist/            # the original v6.9 build — REFERENCE ONLY
```

## `legacy-dist/` is reference only

`legacy-dist/` holds the original v6.9 build (`index.html`, `script_0.mjs`,
icons, etc.). Keep it for:

- comparing UI / wording,
- recovering string literals (paths, keys, labels),
- checking behavior.

**Do not keep editing `legacy-dist/` as the way forward** — it is minified and
not maintainable. All new development happens in `src/`.

## Run / build

```bash
npm install        # install deps
cp .env.example .env   # (optional) Firebase config; defaults already work
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

`npm run dev` works without any setup: `.env.example` already contains the v6.9
Firebase config (the web apiKey is public by design), and the firebase module
falls back to it if no `.env` is present.

## Migration approach (how to move forward)

1. Read `docs/overview.md`, then `docs/rebuild-plan.md`.
2. Build features in `src/features/<name>/` one slice at a time, in the suggested
   order. Each scaffold's `README.md` says what that area is for.
3. Use `src/firebase/firestorePaths.js` for **all** Firestore paths — never
   hard-code path strings.
4. Keep the v6.x constraints intact (see below).
5. Lift UI cues (palette, labels, layout) from `legacy-dist/` so the rebuild can
   converge on the existing look.

### Constraints to preserve
- `review` / `userVocab` stay in **localStorage** (don't move back to Firestore).
- `public/data/customVocabulary` `seenBy` write-back stays **removed**.
- Friend-list cleanup must **not** break DM.
- Keep Firestore reads/writes lean.

## Status snapshot

- ✅ Project boots (`npm run dev`), bottom-nav navigation works.
- ✅ Firebase wiring + path helpers in place.
- ✅ Local vocab/review stores in place.
- ✅ Recovered docs (screens, Firestore, localStorage, features).
- ⛔ Feature screens are placeholders — see `docs/rebuild-plan.md`.
