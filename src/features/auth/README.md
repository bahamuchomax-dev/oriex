# Auth

Firebase Authentication wiring for the app.

- `AuthProvider.jsx` — context that watches `onAuthStateChanged`, exposes
  `{ user, uid, loading, error, signInAnon, signOutUser }`, and the `useAuth()` hook.
- `LoginScreen.jsx` — shown when no user is signed in.

**Status (stage 1):** anonymous sign-in implemented. Requires "Anonymous" to be
enabled in the Firebase console (Authentication → Sign-in method). Swap in
Google/email by adding buttons that call the matching `firebase/auth` API.
