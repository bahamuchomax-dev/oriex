# Oriex — dev rebuild docs

This folder documents what could be recovered from the **v6.9 dist** (a minified,
production build). The original source was not provided, so everything here is
derived by reading `legacy-dist/index.html` and `legacy-dist/script_0.mjs`.

Treat these notes as a **starting map, not a spec.** Items marked `TODO` /
"unconfirmed" need verification against the running app or the real Firestore.

Contents:

- `screens.md` — internal screen/route keys found in the bundle.
- `firestore.md` — Firestore collections/documents and paths.
- `localStorage.md` — localStorage keys.
- `features.md` — major features, behavior notes, and what still needs rebuilding.
- `rebuild-plan.md` — suggested order for re-implementing features in `src/`.

## How this was recovered

The app is a React + Vite + Firebase PWA. The dist is one large minified module
(all identifiers reduced to 1–2 letters), so **logic** is not readable, but
**string literals survive** — screen keys, Firestore path segments, localStorage
keys, and Japanese UI labels. Those literals are the basis for these docs.
