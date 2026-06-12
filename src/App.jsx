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

function TeacherProblems() {
  return (
    <section className="teacher-delivery-screen">
      <div className="teacher-delivery-hero">
        <span className="section-chip">Teacher Delivery</span>
        <h2>先生からの問題</h2>
        <p>先生のオリジナル問題と配信問題を受け取る場所です。</p>
      </div>

      <div className="delivery-grid">
        <article className="delivery-card">
          <span className="delivery-icon">問</span>
          <h3>先生のオリジナル問題</h3>
          <p>配信された問題は、今後ここにカード形式で表示します。</p>
        </article>
        <article className="delivery-card">
          <span className="delivery-icon">配</span>
          <h3>配信コンテンツ</h3>
          <p>v7.22 の配信導線に合わせるための安全なプレースホルダーです。</p>
        </article>
      </div>

      <div className="teacher-delivery-note">
        今回は見た目と導線のみ整理しています。Firestoreの先生機能データモデルは変更していません。
      </div>
    </section>
  );
}

const NAV_TABS = [
  { key: "home", label: "ホーム", icon: "家", match: ["home", "plans", "teacher"] },
  { key: "vocab", label: "学習", icon: "学", match: ["vocab", "factory"] },
  { key: "records", label: "記録", icon: "記", match: ["records", "timer", "books"] },
  { key: "friends", label: "ひろば", icon: "広", match: ["friends", "hamster"] },
  { key: "profile", label: "マイ", icon: "私", match: ["profile"] },
];

export default function App() {
  const { user, uid, loading: authLoading, signOutUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [screen, setScreen] = useState("home");

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

  if (authLoading) return <CenteredMessage text="読み込み中..." />;
  if (!user) return <LoginScreen />;
  if (profileLoading && !profile) return <CenteredMessage text="プロフィールを読み込み中..." />;

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
    case "records":
      current = <Records uid={uid} profile={profile} navigate={navigate} />;
      break;
    case "timer":
      current = <Timer uid={uid} profile={profile} navigate={navigate} />;
      break;
    case "books":
      current = <Books uid={uid} profile={profile} navigate={navigate} />;
      break;
    case "friends":
      current = <Friends uid={uid} profile={profile} />;
      break;
    case "teacher":
      current = <TeacherProblems />;
      break;
    case "hamster":
      current = <HamsterRoom />;
      break;
    case "factory":
      current = <Factory navigate={navigate} />;
      break;
    case "plans":
      current = <Plans uid={uid} profile={profile} isTeacher={isTeacher} />;
      break;
    case "vocab":
      current = <Vocabulary uid={uid} navigate={navigate} />;
      break;
    default:
      current = <Home profile={profile} navigate={navigate} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span>Oriex</span>
        {isTeacher && <span className="header-role">先生</span>}
      </header>
      <main className="app-main">{current}</main>
      <BottomNav screens={NAV_TABS} current={screen} onSelect={setScreen} />
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="app-shell">
      <main className="app-main centered-main">
        <p>{text}</p>
      </main>
    </div>
  );
}
