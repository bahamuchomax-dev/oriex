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
import TeacherHub from "./features/teacher/TeacherHub.jsx";
import Settings from "./features/settings/index.jsx";

const NAV_TABS = [
  { key: "home", label: "ホーム", icon: "家", match: ["home", "plans", "teacher"] },
  { key: "vocab", label: "学習", icon: "学", match: ["vocab", "factory"] },
  { key: "records", label: "記録", icon: "記", match: ["records", "timer", "books"] },
  { key: "friends", label: "ひろば", icon: "広", match: ["friends", "hamster"] },
  { key: "profile", label: "マイ", icon: "私", match: ["profile", "settings"] },
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
          navigate={navigate}
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
      current = <TeacherHub profile={profile} isTeacher={isTeacher} navigate={navigate} />;
      break;
    case "hamster":
      current = (
        <HamsterRoom
          profile={profile}
          uid={uid}
          navigate={navigate}
          onProfileSaved={setProfile}
        />
      );
      break;
    case "settings":
      current = (
        <Settings profile={profile} navigate={navigate} onSignOut={signOutUser} />
      );
      break;
    case "factory":
      current = <Factory navigate={navigate} />;
      break;
    case "plans":
      current = <Plans uid={uid} profile={profile} isTeacher={isTeacher} navigate={navigate} />;
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
