import { useEffect, useState } from "react";
import { useAuth } from "./features/auth/AuthProvider.jsx";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import { loadOrCreateProfile } from "./features/profile/profileApi.js";

import BottomNav from "./components/BottomNav.jsx";
import Home from "./features/home/index.jsx";
import Profile from "./features/profile/index.jsx";
import Records from "./features/records/index.jsx";
import Timer from "./features/timer/index.jsx";
import Books from "./features/books/index.jsx";
import Friends from "./features/friends/index.jsx";
import HamsterRoom from "./features/hamsterRoom/index.jsx";
import Factory from "./features/factory/index.jsx";
import Plans from "./features/plans/index.jsx";
import Vocabulary from "./features/vocabulary/index.jsx";

// Inline screen without its own folder yet.
function TeacherProblems() {
  return (
    <section className="feature-placeholder">
      <h2>先生からの問題</h2>
      <p>先生からの問題 / オリジナル問題（legacy: customApp / teacherCheck）。再実装予定。</p>
    </section>
  );
}

// Bottom-nav tabs (the request's 5). Other screens are reached from Home cards.
const NAV_TABS = [
  { key: "home", label: "ホーム", icon: "🏠" },
  { key: "records", label: "記録", icon: "📝" },
  { key: "timer", label: "タイマー", icon: "⏱" },
  { key: "friends", label: "フレンド", icon: "💬" },
  { key: "profile", label: "マイ", icon: "👤" },
];

export default function App() {
  const { user, uid, loading: authLoading, signOutUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [screen, setScreen] = useState("home");

  // Load (or create) the profile whenever a uid becomes available.
  useEffect(() => {
    let active = true;
    if (!uid) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    loadOrCreateProfile(uid)
      .then((p) => active && setProfile(p))
      .catch((e) => console.error("profile load failed", e))
      .finally(() => active && setProfileLoading(false));
    return () => {
      active = false;
    };
  }, [uid]);

  if (authLoading) return <CenteredMessage text="読み込み中…" />;
  if (!user) return <LoginScreen />;
  if (profileLoading && !profile) return <CenteredMessage text="プロフィールを読み込み中…" />;

  const isTeacher = !!profile?.isTeacher;
  const navigate = (key) => setScreen(key);

  let current;
  switch (screen) {
    case "home":
      current = <Home profile={profile} navigate={navigate} />;
      break;
    case "profile":
      current = (
        <Profile
          profile={profile}
          uid={uid}
          onProfileSaved={setProfile}
          onSignOut={signOutUser}
        />
      );
      break;
    case "records": current = <Records uid={uid} />; break;
    case "timer": current = <Timer uid={uid} profile={profile} navigate={navigate} />; break;
    case "books": current = <Books uid={uid} profile={profile} />; break;
    case "friends": current = <Friends uid={uid} profile={profile} />; break;
    case "teacher": current = <TeacherProblems />; break;
    case "hamster": current = <HamsterRoom />; break;
    case "factory": current = <Factory />; break;
    case "plans": current = <Plans uid={uid} profile={profile} isTeacher={isTeacher} />; break;
    case "vocab": current = <Vocabulary uid={uid} />; break;
    default: current = <Home profile={profile} navigate={navigate} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        Oriex（開発版）{isTeacher ? " · 先生" : ""}
      </header>
      <main className="app-main">{current}</main>
      <BottomNav screens={NAV_TABS} current={screen} onSelect={setScreen} />
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="app-shell">
      <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>{text}</p>
      </main>
    </div>
  );
}
