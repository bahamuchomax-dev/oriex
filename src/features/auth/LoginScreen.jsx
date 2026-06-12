import { useAuth } from "./AuthProvider.jsx";

// Minimal login screen. v6.9 used full accounts; for stage 1 we use anonymous
// sign-in because it's the easiest to enable and needs no extra UI. Swap in
// Google/email later by adding buttons that call the matching firebase/auth API.
export default function LoginScreen() {
  const { signInAnon, error } = useAuth();

  return (
    <div className="app-shell">
      <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
        <div className="feature-placeholder" style={{ textAlign: "center", maxWidth: 360 }}>
          <h2 style={{ color: "var(--accent)" }}>Oriex</h2>
          <p>はじめるにはログインしてください。</p>
          <button className="btn-primary" onClick={signInAnon}>
            ゲストとしてはじめる
          </button>
          {error && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>
              ログインに失敗しました（{error.code || "error"}）。
              <br />
              Firebase コンソールで「匿名ログイン」が有効か確認してください。
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
