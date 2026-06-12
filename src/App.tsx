/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
// pressTimerRef はクレジット長押し用タイマー管理（クラッシュ防止・Reactベストプラクティス準拠）
import { initializeApp, getApps, getApp } from "firebase/app";

import {
  getAuth,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  query,
  limit,
  deleteDoc,
  updateDoc,
  where,
  getDocs,
  orderBy,
  writeBatch,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import HamsterRoom from "./components/hamster/HamsterRoom";

// ✅ 【重要】大量にある「fb.db」や「fb.auth」をそのまま動かすための魔法の1行
import { appId } from "./firebase"; // firebase.tsでappIdをexportしている場合
const fb = { db, auth, appId: "gen-ron-kai-app-v1", enabled: true };

// ── Imports from split files ──
import {
  calculateNewStreak,
  Ic,
  Trophy,
  Star,
  Play,
  RotateCcw,
  Zap,
  Settings,
  User,
  Plus,
  Trash2,
  Home,
  CheckCircle2,
  BookOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
  Send,
  Layers,
  Lock,
  Loader2,
  FileUp,
  Heart,
  BookCheck,
  Megaphone,
  Sparkles,
  Award,
  MapIcon,
  Flag,
  Volume2,
  Flame,
  UserPlus,
  Users,
  Search,
  Copy,
  Check,
  Clock,
  Target,
  IcBgNight,
  IcBgForest,
  IcBgOcean,
  IcBgSunset,
  IcBgCandy,
  IcBgSnow,
  IcSparkle,
  IcDiamond,
  IcCircle,
  IcMap,
  IcMegaphone,
  IcBook,
  IcShop,
  IcPet,
  IcGift,
  IcAdmin,
  IcFood,
  IcPaw,
  IcCoin,
  IcHat,
  IcCrown2,
  IcBow,
  IcGlasses,
  IcStar2,
  IcRainbow,
  IcCat,
  IcDog,
  IcRabbit,
  IcFox,
  IcPanda,
  IcDragon,
  IcUnicorn,
  IcBearcat,
  IcPenguin,
  IcHamster,
  PET_LV_NEEDS,
  getPetLvFromAffection,
  getPetLvProgress,
  HatOverlay,
  IcAvCatHat,
  IcAvDogHat,
  IcAvRabbitHat,
  IcAvFoxHat,
  IcAvPandaHat,
  IcAvDragonHat,
  IcAvUnicornHat,
  IcAvBearcatHat,
  IcAvPenguinHat,
  IcAvHamsterHat,
  PET_HAT_AVATARS,
  PET_ICONS,
  ACC_ICONS,
  IcAchFirst,
  IcAchBolt,
  IcAchWave,
  IcAchTrophy,
  IcAchGem,
  IcAchCrown,
  IcAchPerfect,
  IcAchFire,
  IcAchVolcano,
  IcAchStar,
  IcAchBook,
  IcAchBooks,
  IcAchGrad,
  IcAchBrain,
  IcAchFleur,
  IcAchSentence,
  IcAchScoreSilver,
  IcAchScoreGold,
  IcAchGame,
  IcAchJoystick,
  IcAchMuscle,
  IcAchMedal,
  IcAchBadge,
  IcAchPencil,
  IcAchChart,
  IcAchRocket,
  IcAchGalaxy,
  IcAchPaw,
  IcAchCat,
  IcAchUnicorn,
  IcAchCoin,
  IcAvRabbit,
  IcAvBear,
  IcAvFox,
  IcAvPenguin,
  IcAvOwl,
  IcAvCat,
  IcAvHamster,
  IcAvGorilla,
  IcAvSmile,
  IcAvRocket,
  IcAvStar,
  IcAvFire,
  IcAvCrown,
  IcAvGhost,
  IcAvRobot,
  IcAvTeacher,
  IcDefaultUser,
  IcCamera,
  IcKey,
  IcRefresh,
  IcSpeech,
  IcEye,
  IcTrashSm,
  IcCrownSm,
  IcArrowDown,
  IcAlert,
  IcCheckSm,
  IcMedalSm,
  ACHIEVEMENT_ICONS,
  AVATAR_ICONS,
  AVATARS,
  TEACHER_EXCLUSIVE_AVATARS,
  EmojiIcon,
} from "./icons";
import {
  getFirebaseInstance,
  calcExpForLevel,
  calcExpProgress,
  SHOP_PETS,
  SHOP_ACCESSORIES,
  SHOP_BACKGROUNDS,
  DEFAULT_INVITE_CODE,
  IcThemeTango,
  IcThemeDark,
  IcThemeLight,
  IcThemeCyber,
  IcThemePink,
  IcThemeIos,
  IcTheme3DS,
  IcNoteApp,
  IcSettings2,
  IcTyping,
  IcThumbsUp,
  IcMuscle,
  IcSkull,
  IcParty,
  IcFactory,
  IcTweetApp,
  IcHeart,
  IcRetweet,
  IcComment,
  IcShare,
  IcPlus,
  IcTrash2,
  THEMES,
  ADMIN_PASSCODE,
  ACHIEVEMENT_CATEGORIES,
  RANK_META,
  ACHIEVEMENTS,
  COLORS,
  STAGES,
  IcCatEigo,
  IcCatIdiom,
  IcCatKanji,
  IcCatChem,
  IcCatKobun,
  CATEGORY_ICONS,
  WORD_CATEGORIES,
} from "./constants";
import {
  DEFAULT_VOCAB,
  DEFAULT_VOCAB_IDIOM,
  DEFAULT_VOCAB_KANJI,
  DEFAULT_VOCAB_CHEM,
  DEFAULT_VOCAB_KOBUN,
  DEFAULT_VOCAB_JPHISTORY,
} from "./vocab";
import {
  ALL_VOCAB,
  calcLevel,
  AvatarDisplay,
  AnnouncementCard,
  compressImage,
  generateShortId,
  PetCareCard,
  DeepFocusScroller,
  SwipeEntryScreen,
  TypingGameScreen,
  PetChatScreen,
  StudyDiaryScreen,
} from "./components";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("loading");
  const [prevScreen, setPrevScreen] = useState("start");
  // 起動時の safe-area-inset 未確定によるレイアウトずれ防止: 1フレーム後にNavを表示
  const [navReady, setNavReady] = useState(true);
  const [clockTime, setClockTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  });
  useEffect(() => {
    if (["petRoom", "petShop", "achievements", "tweetApp", "typingGame"].includes(screen)) setScreen("start");
    if (screen === "leaderboard") setScreen("customApp");
  }, [screen]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`
      );
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  const navigateTo = (s) => {
    setPrevScreen(screen);
    setScreen(s);
  };
  const [history, setHistory] = useState([]);
  const [vocabList, setVocabList] = useState(DEFAULT_VOCAB);
  const [announcements, setAnnouncements] = useState([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("genron_readAnnouncements") || "[]"
        );
      } catch {
        return [];
      }
    }
  );
  const [friends, setFriends] = useState([]);
  const [readTimelineLogIds, setReadTimelineLogIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("oritan_readTimelineLogs") || "[]");
    } catch {
      return [];
    }
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [teacherList, setTeacherList] = useState([]);
  // 全ユーザー名前マップ（生徒+先生）- 称え場・ランキングの名前解決用
  const [allUsersMap, setAllUsersMap] = useState<
    Record<
      string,
      { name: string; avatar: string; color: string; isTeacher: boolean }
    >
  >({});
  const [reviewList, setReviewList] = useState([]);
  const [customVocabList, setCustomVocabList] = useState([]);
  const [userVocabList, setUserVocabList] = useState([]); // 生徒が自作した単語
  const [factoryInput, setFactoryInput] = useState({
    en: "",
    ja: "",
    sentence: "",
  });
  const [factoryError, setFactoryError] = useState("");
  const [factoryAdding, setFactoryAdding] = useState(false);
  // 設定
  const [notifVocabAdd, setNotifVocabAdd] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("genron_notifVocabAdd") ?? "true");
    } catch {
      return true;
    }
  });
  const [notifChatUnread, setNotifChatUnread] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("genron_notifChatUnread") ?? "true"
      );
    } catch {
      return true;
    }
  });
  // AIペットチャット履歴（画面間で保持）
  const [petChatMessages, setPetChatMessages] = useState(null);
  const [newCustomWord, setNewCustomWord] = useState({
    en: "",
    ja: "",
    sentence: "",
    category: "英単語",
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [activeFriend, setActiveFriend] = useState(null);
  const [viewingFriend, setViewingFriend] = useState(null);
  const [friendHist, setFriendHist] = useState([]);
  const [friendHistLoading, setFriendHistLoading] = useState(false);
  const openFriendProfile = async (f) => {
    if (!f) return;
    setViewingFriend(f);
    setFriendHist([]);
    setPrevScreen(screen);
    setScreen("friendProfile");
    if (f.uid && String(f.uid).startsWith("dbg")) {
      const now = Date.now();
      setFriendHist([
        { id: "dh1", subject: "英単語", stage: 5, isClear: true, duration: 30, timestamp: now - 3600000 },
        { id: "dh2", subject: "数学", stage: 3, isClear: true, duration: 45, timestamp: now - 7200000 },
        { id: "dh3", subject: "古文", stage: 2, isClear: false, duration: 20, timestamp: now - 90000000 },
        { id: "dh4", subject: "化学", stage: 4, isClear: true, duration: 35, timestamp: now - 180000000 },
      ]);
      return;
    }
    if (f.uid && fb.enabled) {
      setFriendHistLoading(true);
      try {
        const snap = await getDocs(
          collection(fb.db, "artifacts", fb.appId, "users", f.uid, "history")
        );
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setFriendHist(list);
      } catch (e: any) {
        setFriendHist([]);
      } finally {
        setFriendHistLoading(false);
      }
    }
  };
  const [friendsTimeline, setFriendsTimeline] = useState([]);
  const [friendsTimelineLoading, setFriendsTimelineLoading] = useState(false);
  const openRecordsTimeline = async () => {
    setPrevScreen(screen);
    setScreen("recordsTimeline");
    setFriendsTimeline([]);
    const studentFriends = (friends || []).filter((f) => !f.isTeacher);
    const hasDbg = studentFriends.some((f) => f.uid && String(f.uid).startsWith("dbg"));
    if (hasDbg || !fb.enabled || !user) {
      const now = Date.now();
      const subs = ["英単語", "数学1A", "古文", "化学", "熟語"];
      const merged = [];
      studentFriends.forEach((f, fi) => {
        for (let i = 0; i < 3; i++) {
          merged.push({
            id: `${f.uid || fi}_${i}`, uid: f.uid, name: f.name, avatar: f.avatar,
            subject: subs[(fi + i) % subs.length], stage: ((fi + i) % 6) + 1,
            isClear: (fi + i) % 3 !== 0, duration: 15 + ((fi * 7 + i * 11) % 40),
            timestamp: now - (fi * 5400000 + i * 16200000),
          });
        }
      });
      merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFriendsTimeline(merged);
      return;
    }
    setFriendsTimelineLoading(true);
    try {
      const all = [];
      for (const f of studentFriends) {
        if (!f.uid) continue;
        try {
          const snap = await getDocs(collection(fb.db, "artifacts", fb.appId, "users", f.uid, "history"));
          snap.docs.forEach((d) => {
            const data: any = d.data();
            all.push({ id: `${f.uid}_${d.id}`, uid: f.uid, name: f.name, avatar: f.avatar, ...data });
          });
        } catch (e) {}
      }
      all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFriendsTimeline(all.slice(0, 60));
    } catch (e) {} finally {
      setFriendsTimelineLoading(false);
    }
  };
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  // Use Vite's BASE_URL so the icon resolves correctly under a GitHub Pages
  // sub-path (avoids a root-absolute icon path that would 404 there).
  const APP_ICON_SRC = `${import.meta.env.BASE_URL}icon-192.png`;
  const SCHEDULE_EVENTS_KEY = "oritan_schedule_events";
  const ATTENDANCE_STAMPS_KEY = "oritan_attendance_stamps";
  const [scheduleEvents, setScheduleEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SCHEDULE_EVENTS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [attendanceStamps, setAttendanceStamps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ATTENDANCE_STAMPS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [taskProgress, setTaskProgress] = useState({});
  const [allTaskProgress, setAllTaskProgress] = useState([]);
  const [taskForm, setTaskForm] = useState({ subject: "", total: "", unit: "p", deadline: "" });
  const [scheduleForm, setScheduleForm] = useState({ title: "", date: "", time: "", message: "" });
  const [planTab, setPlanTab] = useState("now");
  const [teacherCheckTab, setTeacherCheckTab] = useState("study");
  const loadWeeklyTasks = async () => {
    if (!fb.enabled || !user) return;
    try {
      const tsnap = await getDocs(collection(fb.db, "artifacts", fb.appId, "public", "data", "weeklyTasks"));
      const tasks = tsnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setWeeklyTasks(tasks);
      if (profile?.isTeacher) {
        const psnap = await getDocs(collection(fb.db, "artifacts", fb.appId, "public", "data", "taskProgress"));
        const progs = psnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllTaskProgress(progs);
        const mine = {};
        progs.forEach((p) => { if (p.uid === user?.uid) mine[p.taskId] = p.done || 0; });
        setTaskProgress(mine);
      } else {
        // 生徒は自分の進捗のみ取得（読み取り回数を最小化）
        const psnap = await getDocs(query(collection(fb.db, "artifacts", fb.appId, "public", "data", "taskProgress"), where("uid", "==", user.uid)));
        const progs = psnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllTaskProgress([]);
        const mine = {};
        progs.forEach((p) => { mine[p.taskId] = p.done || 0; });
        setTaskProgress(mine);
      }
    } catch (e: any) {}
  };
  useEffect(() => { loadWeeklyTasks(); }, [user?.uid, profile?.isTeacher]);
  const saveTaskProgress = async (task, val) => {
    const total = Number(task.total) || 0;
    const d = Math.max(0, total > 0 ? Math.min(total, val) : val);
    setTaskProgress((p) => ({ ...p, [task.id]: d }));
    if (user && fb.enabled) {
      try {
        await setDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "taskProgress", `${task.id}__${user.uid}`), {
          taskId: task.id, uid: user.uid, name: profile?.name || "", subject: task.subject, total: task.total, unit: task.unit || "", done: d, updatedAt: Date.now(),
        });
      } catch (e: any) {}
    }
  };
  const addWeeklyTask = async () => {
    const subject = (taskForm.subject || "").trim();
    const total = Number(taskForm.total);
    if (!subject || !total) { showToast("教科と目標量を入力してください", "error"); return; }
    const deadline = taskForm.deadline ? new Date(taskForm.deadline + "T23:59:59").getTime() : null;
    const payload = { subject, total, unit: taskForm.unit || "p", assignedTo: "all", createdBy: profile?.name || "先生", createdAt: Date.now(), deadline };
    try {
      if (fb.enabled) {
        const ref = await addDoc(collection(fb.db, "artifacts", fb.appId, "public", "data", "weeklyTasks"), payload);
        setWeeklyTasks((t) => [{ id: ref.id, ...payload }, ...t]);
      } else {
        setWeeklyTasks((t) => [{ id: "local_" + Date.now(), ...payload }, ...t]);
      }
      setTaskForm({ subject: "", total: "", unit: "p", deadline: "" });
      showToast("今週の課題を送りました");
    } catch (e: any) { showToast("送信エラー", "error"); }
  };
  const deleteWeeklyTask = async (task) => {
    if (!window.confirm(`「${task.subject}」を削除しますか？`)) return;
    setWeeklyTasks((t) => t.filter((x) => x.id !== task.id));
    try { if (fb.enabled) await deleteDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "weeklyTasks", task.id)); } catch (e: any) {}
  };
  const formatScheduleDate = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const getNextScheduleEvent = (events = scheduleEvents) => {
    const now = Date.now();
    return [...(events || [])]
      .filter((e) => Number(e.startAt) >= now)
      .sort((a, b) => Number(a.startAt) - Number(b.startAt))[0] || null;
  };
  const scheduleCountdownText = (event) => {
    if (!event?.startAt) return "予定はまだありません";
    const diff = Number(event.startAt) - Date.now();
    if (diff <= 0) return "まもなく開始";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `あと${days}日${hours}時間`;
    if (hours > 0) return `あと${hours}時間${mins}分`;
    return `あと${Math.max(1, mins)}分`;
  };
  const scheduleSupportMessage = (event) => {
    if (!event) return "予定が入るとここにカウントダウンを表示します。";
    return event.message || "今日の一歩をここでそろえよう。大丈夫、ちゃんと進めます。";
  };
  const saveScheduleEvents = (next) => {
    const sorted = [...next].sort((a, b) => Number(a.startAt) - Number(b.startAt));
    setScheduleEvents(sorted);
    localStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(sorted));
  };
  const addScheduleEvent = () => {
    const title = scheduleForm.title.trim();
    if (!title || !scheduleForm.date) {
      showToast("予定名と日付を入力してください", "error");
      return;
    }
    const startAt = new Date(`${scheduleForm.date}T${scheduleForm.time || "00:00"}`).getTime();
    if (!Number.isFinite(startAt)) {
      showToast("日付の形式を確認してください", "error");
      return;
    }
    const payload = {
      title,
      startAt,
      message: scheduleForm.message.trim(),
      createdBy: profile?.name || "",
      createdAt: Date.now(),
    };
    saveScheduleEvents([...scheduleEvents, { id: "local_" + Date.now(), ...payload }]);
    setScheduleForm({ title: "", date: "", time: "", message: "" });
    showToast("予定を追加しました");
  };
  const deleteScheduleEvent = (event) => {
    if (!event || !window.confirm(`「${event.title}」を削除しますか？`)) return;
    saveScheduleEvents(scheduleEvents.filter((e) => e.id !== event.id));
  };
  const saveAttendanceStamps = (next) => {
    setAttendanceStamps(next);
    localStorage.setItem(ATTENDANCE_STAMPS_KEY, JSON.stringify(next));
  };
  const dateKeyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const toggleAttendanceStamp = (dateKey) => {
    const next = { ...attendanceStamps };
    if (next[dateKey]) delete next[dateKey];
    else next[dateKey] = Date.now();
    saveAttendanceStamps(next);
  };
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState("");

  const [currentStage, setCurrentStage] = useState(1);
  const [gameMode, setGameMode] = useState("meaning");
  const [quizDirection, setQuizDirection] = useState("en-ja"); // "en-ja": 英→日, "ja-en": 日→英
  const [gameCategory, setGameCategory] = useState("英単語"); // ゲーム中のカテゴリ
  const [stageWords, setStageWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [options, setOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [stageClearedOccurred, setStageClearedOccurred] = useState(false);
  const [levelUpOccurred, setLevelUpOccurred] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [resultEarnedPoints, setResultEarnedPoints] = useState(0);
  const [resultEarnedCoins, setResultEarnedCoins] = useState(0);
  const [resultCorrectCount, setResultCorrectCount] = useState(0);
  const chatEndRef = React.useRef(null);
  const dmEndRef = React.useRef(null);
  const mainRef = React.useRef<HTMLElement>(null);

  const [newName, setNewName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]); // bear
  const [avatarImage, setAvatarImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [profileBio, setProfileBio] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedFrameMin, setSelectedFrameMin] = useState(0);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetImporting, setSheetImporting] = useState(false);
  const [sheetPreview, setSheetPreview] = useState(null);
  const [sheetStage, setSheetStage] = useState(1);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState("");
  // ── メモアプリ ──
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("oritan_notes") || "[]");
    } catch {
      return [];
    }
  });
  const [noteInput, setNoteInput] = useState("");
  const [noteEditId, setNoteEditId] = useState(null);
  const [noteEditText, setNoteEditText] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  // ── つぶやきアプリ ──
  const [tweets, setTweets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("oritan_tweets") || "[]");
    } catch {
      return [];
    }
  });
  const [tweetCommentTarget, setTweetCommentTarget] = useState(null); // tweet id
  const [tweetCommentInput, setTweetCommentInput] = useState("");

  const [petFeedEffect, setPetFeedEffect] = useState(null); // { petId }
  const [shopTab, setShopTab] = useState("pets");
  const [petNameInput, setPetNameInput] = useState("");
  const [achvCat, setAchvCat] = useState("all");
  const [achvFilter, setAchvFilter] = useState("all");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeFetched, setInviteCodeFetched] = useState(false);
  const [editingInviteCode, setEditingInviteCode] = useState("");
  const [passwordList, setPasswordList] = useState([]);
  const [isLoadingPasswords, setIsLoadingPasswords] = useState(false);
  const [showPasswordList, setShowPasswordList] = useState(false);
  const [isSavingInviteCode, setIsSavingInviteCode] = useState(false);
  const [coinInputs, setCoinInputs] = useState({});
  const [chatSettings, setChatSettings] = useState({ allowedUids: [] }); // 発言権限があるUID一覧
  const [themeId, setThemeId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("genron_theme")) || "oriex";
    } catch {
      return "dark";
    }
  });
  const [debugUnlockAll, setDebugUnlockAll] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("genron_debugUnlock")) || false;
    } catch {
      return false;
    }
  });
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadDm, setUnreadDm] = useState({});
  const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("genron_announcementDismissed")) || null
      );
    } catch {
      return null;
    }
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teacherCodeInput, setTeacherCodeInput] = useState("");
  const [toast, setToast] = useState(null);
  const [reviewMode, setReviewMode] = useState("list"); // "list" | "quiz"
  // 単語帳
  const [wordbookTab, setWordbookTab] = useState("stage"); // "stage" | "custom"
  const [wordbookStage, setWordbookStage] = useState(null);
  const [wordbookCategory, setWordbookCategory] = useState("英単語"); // 英単語|熟語|漢字|化学
  // カスタム問題配布先
  const [customAssignTarget, setCustomAssignTarget] = useState("all");
  // 生徒側カスタムタブ
  const [customTab, setCustomTab] = useState("new");
  const [customSubMode, setCustomSubMode] = useState(null); // null | "questions" | "apps"
  const [sharedApps, setSharedApps] = useState([]);
  const [newSharedApp, setNewSharedApp] = useState({
    name: "",
    url: "",
    description: "",
  });
  // 学習日誌
  const [studyDiaryWeekOffset, setStudyDiaryWeekOffset] = useState(0);
  const [studyDiaryData, setStudyDiaryData] = useState({});
  const [studyDiaryViewUid, setStudyDiaryViewUid] = useState(null);
  const [studyDiaryStudents, setStudyDiaryStudents] = useState([]);
  const [bookLogs, setBookLogs] = useState([]);
  const [bookShelf, setBookShelf] = useState([]);
  const [selectedBookForLog, setSelectedBookForLog] = useState(null);
  const [bookLogTab, setBookLogTab] = useState("log");
  const [bookShelfCreating, setBookShelfCreating] = useState(false);
  const [bookShelfForm, setBookShelfForm] = useState({
    title: "",
    subject: "\u82f1\u8a9e",
    icon: "\ud83d\udcd8",
    totalPages: "",
  });
  const [bookLogForm, setBookLogForm] = useState({
    bookTitle: "",
    subject: "\u82f1\u8a9e",
    minutes: "60",
    hours: "1",
    mins: "0",
    currentPage: "",
    totalPages: "",
    memo: "",
  });
  const [reviewQuizIdx, setReviewQuizIdx] = useState(0);
  const [reviewQuizOptions, setReviewQuizOptions] = useState([]);
  const [reviewQuizFeedback, setReviewQuizFeedback] = useState(null); // null | "correct" | "wrong"
  const [reviewQuizLoading, setReviewQuizLoading] = useState(false);
  const [reviewSentenceRevealed, setReviewSentenceRevealed] = useState(false);
  const [reviewFolders, setReviewFolders] = useState(() => { try { return JSON.parse(localStorage.getItem("oriex_review_folders") || "[]"); } catch { return []; } });
  const [reviewAssign, setReviewAssign] = useState(() => { try { return JSON.parse(localStorage.getItem("oriex_review_assign") || "{}"); } catch { return {}; } });
  const [reviewFolderFilter, setReviewFolderFilter] = useState("all");
  const assignReviewFolder = (en, folderId) => {
    setReviewAssign((prev) => {
      const next = { ...prev };
      if (folderId) next[en] = folderId; else delete next[en];
      try { localStorage.setItem("oriex_review_assign", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const createReviewFolder = () => {
    const name = (window.prompt("フォルダ名を入力") || "").trim();
    if (!name) return;
    setReviewFolders((prev) => {
      const next = [...prev, { id: "f" + Date.now(), name }];
      try { localStorage.setItem("oriex_review_folders", JSON.stringify(next)); } catch {}
      return next;
    });
    showToast("フォルダを作成しました");
  };
  const addWordToReview = async (word, folderId) => {
    if (!reviewList.some((r) => r.en === word.en)) {
      const { id: _id, ...wordData } = word;
      if (user && fb.enabled) {
        try { await addDoc(collection(fb.db, "artifacts", fb.appId, "users", user.uid, "review"), wordData); } catch {}
      } else {
        setReviewList((prev) => [...prev, { ...wordData, id: Date.now().toString() }]);
      }
    }
    assignReviewFolder(word.en, folderId || null);
    showToast(folderId ? "フォルダに追加しました" : "復習リストに追加しました");
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // anthropicApiKey state removed — browser-direct Anthropic calls were deleted.
  // handleLogout still removes any legacy "genron_anthropicApiKey" from storage.
  const prevVocabCountRef = useRef(null);
  const deletingReviewIds = useRef(new Set());
  const pressTimerRef = useRef(null); // ✅ クレジット長押し用タイマー管理
  const revertTimerRef = useRef(null); // ✅ クレジット復元タイマー管理
  const [creditState, setCreditState] = useState({
    text: "✦ ORITAN",
    color: "rgba(201,168,76,0.18)",
  });
  // ✅ アンマウント時に両タイマーをクリア（メモリリーク防止・指摘2対応済み）
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    };
  }, []);

  const saveLocal = (key, val) => {
    // SECURITY (Phase 1): never persist the plaintext password in localStorage.
    // The profile object still carries `password` in memory / Firestore for the
    // legacy login flow, but the cached copy must not leak it on a shared device.
    const safe =
      key === "profile" && val && typeof val === "object"
        ? (() => {
            const { password, ...rest } = val as any;
            return rest;
          })()
        : val;
    localStorage.setItem(`genron_${key}`, JSON.stringify(safe));
  };
  const loadLocal = (key) => JSON.parse(localStorage.getItem(`genron_${key}`));

  useEffect(() => {
    const meta = (n, c) => {
      let el = document.querySelector(`meta[name="${n}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.name = n;
        document.head.appendChild(el);
      }
      el.content = c;
    };
    meta("apple-mobile-web-app-capable", "yes");
    meta("apple-mobile-web-app-status-bar-style", "black-translucent");
    meta(
      "viewport",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover"
    );
    document.body.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";

    // Safari PWA: safe-area-inset の確定は swipeEntry のスワイプ完了時に行う
    // onComplete={() => { setNavReady(true); setScreen("start"); }} で処理

    // Safe Areaは純粋なCSSのenv()のみで制御（JS計算不要・PWAでも確実動作）

    // 縦画面に固定（横画面防止・スマホのみ）
    try {
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );
      if (isMobileDevice && screen?.orientation?.lock) {
        screen.orientation.lock("portrait").catch(() => {});
      }
    } catch (_) {}

    // ✅ アンマウント後のsetState呼び出しを防ぐフラグ
    let isMounted = true;
    let fallbackTimer = null;

    const init = async () => {
      const localProfile = loadLocal("profile");
      const localHistory = loadLocal("history") || [];
      if (localProfile) {
        setProfile(localProfile);
        if (localProfile.isTeacher) setIsAdmin(true);
      }
      setHistory(localHistory);

      if (fb.enabled) {
        try {
          signInAnonymously(fb.auth).catch(() => null);
          const unsubAuth = onAuthStateChanged(
            fb.auth,
            async (firebaseUser) => {
              unsubAuth();
              if (firebaseUser) {
                // ローカルに保存したUIDがあればそちらを優先（handleLogin経由の再起動対応）
                const savedUid = loadLocal("uid");
                const effectiveUid = savedUid || firebaseUser.uid;
                // ✅ await前にマウント確認
                if (!isMounted) return;
                setUser({ uid: effectiveUid });
                try {
                  // キャッシュ戦略: 1時間以内の同期ならFirestore読み取りをスキップ
                  const lastSync = Number(loadLocal("lastSyncTime") || 0);
                  const cacheValid =
                    localProfile && Date.now() - lastSync < 3600000;
                  let fbProfile = null;
                  if (!cacheValid) {
                    const snap = await getDoc(
                      doc(
                        fb.db,
                        "artifacts",
                        fb.appId,
                        "users",
                        effectiveUid,
                        "profile",
                        "main"
                      )
                    );
                    if (snap.exists()) {
                      fbProfile = snap.data();
                      saveLocal("lastSyncTime", Date.now());
                    }
                  }
                  // ✅ await後に再度マウント確認
                  if (!isMounted) return;
                  if (fbProfile) {
                    setProfile(fbProfile);
                    saveLocal("profile", fbProfile);
                    if (fbProfile.isTeacher) setIsAdmin(true);

                    // Streak更新チェック
                    const streakData = calculateNewStreak(fbProfile);
                    if (
                      streakData.lastStreakUpdate !== fbProfile.lastStreakUpdate
                    ) {
                      const updated = { ...fbProfile, ...streakData };
                      setProfile(updated);
                      saveLocal("profile", updated);
                      // Firestoreも更新
                      setDoc(
                        doc(
                          fb.db,
                          "artifacts",
                          fb.appId,
                          "users",
                          effectiveUid,
                          "profile",
                          "main"
                        ),
                        {
                          streakCount: streakData.streakCount,
                          lastStreakUpdate: streakData.lastStreakUpdate,
                        },
                        { merge: true }
                      ).catch(() => null);
                      if (!updated.isTeacher) {
                        setDoc(
                          doc(
                            fb.db,
                            "artifacts",
                            fb.appId,
                            "public",
                            "data",
                            "customApp",
                            effectiveUid
                          ),
                          { streakCount: streakData.streakCount },
                          { merge: true }
                        ).catch(() => null);
                      }
                    }

                    // Firestoreから履歴も取得
                    try {
                      const histSnap = await getDocs(
                        query(
                          collection(
                            fb.db,
                            "artifacts",
                            fb.appId,
                            "users",
                            effectiveUid,
                            "history"
                          ),
                          limit(50)
                        )
                      );
                      if (!isMounted) return;
                      const fbHistory = histSnap.docs
                        .map((d) => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => b.timestamp - a.timestamp);
                      if (fbHistory.length > 0) {
                        setHistory(fbHistory);
                        saveLocal("history", fbHistory);
                      }
                    } catch (e: any) {}
                    if (isMounted) setScreen("start");
                    return;
                  }
                } catch (e: any) {}
              }
              if (isMounted) setScreen(localProfile ? "start" : "login");
            }
          );
          // ✅ fallbackTimerをrefに保持してクリーンアップ可能にする
          fallbackTimer = setTimeout(() => {
            setScreen((prev) => {
              if (prev === "loading")
                return localProfile ? "start" : "login";
              return prev;
            });
          }, 3000);
        } catch (e: any) {
          if (isMounted) setScreen(localProfile ? "start" : "login");
        }
      } else {
        setScreen(localProfile ? "start" : "login");
      }
    };
    init();

    // ✅ クリーンアップ: フォールバックタイマー破棄 & マウントフラグ無効化
    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const profileRef = React.useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!["settingsApp", "profileEdit"].includes(screen) || !profile) return;
    setNewName(profile.name || profile.displayName || "");
    setProfileBio(profile.bio || "");
    if (
      typeof profile.avatar === "string" &&
      (profile.avatar.startsWith("data:") || profile.avatar.startsWith("http"))
    ) {
      setAvatarImage(profile.avatar);
    } else {
      setAvatarImage(null);
      const nextAvatar = AVATARS.find((a) => a.char === profile.avatar);
      if (nextAvatar) setSelectedAvatar(nextAvatar);
    }
    const nextColor = COLORS.find((c) => c.bg === profile.color);
    if (nextColor) setSelectedColor(nextColor);
    setSelectedFrameMin(Number(profile.avatarFrameMin || 0));
    setCoverImage(profile.coverImage || null);
  }, [screen, profile?.name, profile?.displayName, profile?.bio, profile?.avatar, profile?.color, profile?.avatarFrameMin, profile?.coverImage]);

  const screenRef = React.useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  // 新規登録直後フラグ: syncProfile の誤検知防止
  const justRegisteredRef = React.useRef(false);

  const activeFriendRef = React.useRef(activeFriend);
  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

  // 複数端末対策: stageMap / startに戻るたびにFirestoreから最新プロフィールを同期
  useEffect(() => {
    if (!user?.uid || !fb.enabled || !["start", "stageMap"].includes(screen))
      return;
    if (profileRef.current?.shortId === "DEBUG") return;
    const syncProfile = async () => {
      try {
        const snap = await getDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "users",
            user.uid,
            "profile",
            "main"
          )
        );
        if (!snap.exists()) {
          // キャッシュ由来や起動直後は無視、サーバー確定値のみ処理
          // 登録直後はFirestoreへの書き込みが未反映の場合があるためスキップ
          if (!snap.metadata.fromCache && !justRegisteredRef.current)
            forceLogout(true);
          return;
        }
        const latest = snap.data();
        const current = profileRef.current;
        // 進行度・経験値・ペットポイントはFirestoreの方が高ければ更新
        // clearedStagesはカテゴリ別に統合（両方のデータをマージ）
        // latestのclearedStagesが正しいオブジェクト形式かバリデーション
        const rawLatestCleared = latest.clearedStages;
        const isValidCleared = (v) =>
          v &&
          typeof v === "object" &&
          !Array.isArray(v) &&
          Object.values(v).every((arr) => Array.isArray(arr));
        const latestCleared = isValidCleared(rawLatestCleared)
          ? rawLatestCleared
          : {};
        const mergedCleared = { ...latestCleared };
        const curCleared = current?.clearedStages || {};
        // curClearedも正しい形式のみ使用
        for (const cat of Object.keys(curCleared)) {
          if (!Array.isArray(curCleared[cat])) continue;
          if (!mergedCleared[cat]) mergedCleared[cat] = curCleared[cat];
          else {
            const combined = new Set([
              ...mergedCleared[cat],
              ...curCleared[cat],
            ]);
            mergedCleared[cat] = Array.from(combined);
          }
        }
        const merged = {
          ...current,
          totalExp: Math.max(current?.totalExp || 0, latest.totalExp || 0),
          unlockedStages: (() => {
            const cur = current?.unlockedStages || {};
            const lat = latest.unlockedStages || {};
            const merged2 = { ...cur };
            for (const k of Object.keys(lat)) {
              merged2[k] = Math.max(merged2[k] || 1, lat[k] || 1);
            }
            return merged2;
          })(),
          petPoints: Math.max(current?.petPoints || 0, latest.petPoints || 0),
          petAffection: Math.max(
            current?.petAffection || 0,
            latest.petAffection || 0
          ),
          streakCount: latest.streakCount || 0,
          lastStreakUpdate: latest.lastStreakUpdate || "",
          clearedStages: mergedCleared,
        };
        // 実際に差分がある場合のみ更新
        if (
          merged.totalExp !== current?.totalExp ||
          JSON.stringify(merged.unlockedStages) !==
            JSON.stringify(current?.unlockedStages) ||
          merged.petPoints !== current?.petPoints ||
          JSON.stringify(merged.clearedStages) !==
            JSON.stringify(current?.clearedStages)
        ) {
          setProfile(merged);
          saveLocal("profile", merged);
        }
      } catch (e: any) {}
    };
    syncProfile();
  }, [screen, user]);

  // 削除検知は syncProfile（画面遷移時）のみで行う（onSnapshotは誤検知が多いため廃止）

  // チャット発言権限設定の購読
  useEffect(() => {
    if (!fb.enabled) return;
    const unsubChat = onSnapshot(
      doc(fb.db, "artifacts", fb.appId, "public", "data", "settings", "chat"),
      (snap) => {
        if (snap.exists()) setChatSettings(snap.data());
        else setChatSettings({ allowedUids: [] });
      },
      () => {}
    );
    return () => unsubChat();
  }, []);

  useEffect(() => {
    if (!user || !fb.enabled) return;

    const unsubA = onSnapshot(
      query(
        collection(fb.db, "artifacts", fb.appId, "public", "data", "announcements"),
        orderBy("timestamp", "desc"),
        limit(50)
      ),
      (s) => {
        const sorted = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setAnnouncements(sorted);
        // 最新のお知らせが変わったら非表示フラグをリセット
        if (sorted.length > 0) {
          const latestId = sorted[0].id;
          setAnnouncementDismissed((prev) => {
            if (prev !== latestId) return null;
            return prev;
          });
        }
      }
    );

    const unsubV = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "public", "data", "vocabulary"),
      (s) => {
        if (!s.empty) {
          const newList = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          setVocabList(newList);
          // 初回以外で件数が増えたら通知
          if (
            prevVocabCountRef.current !== null &&
            newList.length > prevVocabCountRef.current
          ) {
            const diff = newList.length - prevVocabCountRef.current;
            if (notifVocabAdd)
              showToast(`先生から単語が${diff}問追加されました！`, "success");
          }
          prevVocabCountRef.current = newList.length;
        }
      }
    );

    const unsubL = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "public", "data", "leaderboard"),
      (s) => {
        // ★ 重複排除処理（同じshortIdを持つものを除外）
        const uniqueMap = new Map();
        s.docs.forEach((d) => {
          const data = d.data();
          if (!data.isTeacher) {
            const key = data.shortId || d.id;
            uniqueMap.set(key, { id: d.id, ...data });
          }
        });
        const sorted = Array.from(uniqueMap.values()).sort(
          (a, b) => b.score - a.score
        );
        setLeaderboard(sorted);
        // allUsersMapに生徒を反映
        setAllUsersMap((prev) => {
          const next = { ...prev };
          s.docs.forEach((d) => {
            const data = d.data();
            next[d.id] = {
              name: data.name || "",
              avatar: data.avatar || "",
              color: data.color || "",
              isTeacher: !!data.isTeacher,
            };
          });
          return next;
        });
      }
    );

    // 先生の名前変更も称え場・ランキングに反映するためteacherIndexを監視
    const unsubTI = onSnapshot(
      collection(
        fb.db,
        "artifacts",
        fb.appId,
        "public",
        "data",
        "teacherIndex"
      ),
      (s) => {
        // 先生リストをstateに保存（admin画面の先生管理用）
        setTeacherList(
          s.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }))
        );
        // teacherIndexにnameがない先生はprofileから名前を補完
        s.docs.forEach(async (d) => {
          if (!d.data().name && fb.db) {
            try {
              const pSnap = await getDoc(
                doc(
                  fb.db,
                  "artifacts",
                  fb.appId,
                  "users",
                  d.id,
                  "profile",
                  "main"
                )
              );
              if (pSnap.exists() && pSnap.data().name) {
                const pData = pSnap.data();
                await setDoc(
                  doc(
                    fb.db,
                    "artifacts",
                    fb.appId,
                    "public",
                    "data",
                    "teacherIndex",
                    d.id
                  ),
                  {
                    name: pData.name,
                    displayName: pData.displayName || pData.name,
                  },
                  { merge: true }
                ).catch(() => null);
              }
            } catch (e) {}
          }
        });
        setAllUsersMap((prev) => {
          const next = { ...prev };
          s.docs.forEach((d) => {
            const data = d.data();
            if (data.name) {
              next[d.id] = {
                name: data.name,
                avatar: data.avatar || "",
                color: data.color || "",
                isTeacher: true,
              };
            }
          });
          return next;
        });
      }
    );

    const unsubF = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "users", user.uid, "friends"),
      (s) => setFriends(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubR = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "users", user.uid, "review"),
      (s) => {
        const items = s.docs
          .map((d) => {
            const data = d.data();
            // dataのidフィールドは無視し、必ずFirestoreのdoc.idを使う
            const { id: _ignored, ...rest } = data;
            return { id: d.id, ...rest };
          })
          .filter((d) => !deletingReviewIds.current.has(d.id));
        setReviewList(items);
      }
    );
    const unsubC = onSnapshot(
      query(
        collection(fb.db, "artifacts", fb.appId, "public", "data", "chat"),
        orderBy("timestamp", "asc"),
        limit(100)
      ),
      (s) => setChatMessages(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubCV = onSnapshot(
      collection(
        fb.db,
        "artifacts",
        fb.appId,
        "public",
        "data",
        "customVocabulary"
      ),
      (s) => {
        if (!s.empty)
          setCustomVocabList(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        else setCustomVocabList([]);
      }
    );

    const unsubSA = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "public", "data", "sharedApps"),
      (s) => setSharedApps(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    const unsubUV = onSnapshot(
      collection(fb.db, "artifacts", fb.appId, "users", user.uid, "userVocab"),
      (s) => setUserVocabList(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );


    return () => {
      unsubA();
      unsubV();
      unsubL();
      unsubTI();
      unsubF();
      unsubR();
      unsubC();
      unsubCV();
      unsubSA();
      unsubUV();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (screen === "chat") {
      const ts =
        chatMessages.length > 0
          ? chatMessages[chatMessages.length - 1].timestamp
          : Date.now();
      localStorage.setItem("genron_lastReadChat", JSON.stringify(ts));
      setUnreadChat(0);
    } else {
      const lastRead = (() => {
        try {
          return Number(
            JSON.parse(localStorage.getItem("genron_lastReadChat")) || 0
          );
        } catch {
          return 0;
        }
      })();
      const myUid = user?.uid || "";
      const count = chatMessages.filter(
        (m) => (m.timestamp || 0) > lastRead && m.uid !== myUid
      ).length;
      setUnreadChat(notifChatUnread ? count : 0);
    }
  }, [screen, chatMessages, user]);

  // チャット画面: メッセージ更新時・画面表示時に最下部へスクロール
  useEffect(() => {
    if (screen === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [screen, chatMessages]);

  // DM画面: メッセージ更新時・画面表示時に最下部へスクロール
  useEffect(() => {
    if (screen === "dm") {
      dmEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [screen, dmMessages]);

  useEffect(() => {
    const t = THEMES.find((th) => th.id === themeId) || THEMES[0];
    document.body.style.backgroundColor = t.bgColor;
    let styleEl = document.getElementById("theme-override");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-override";
      document.head.appendChild(styleEl);
    }
    if (themeId === "light" || themeId === "simple") {
      const d = `[data-theme="${themeId}"]`;
      styleEl.textContent = `
        ${d} { color: ${t.text}; }
        ${d} .text-white,
        ${d} [class*="text-white"] { color: ${t.text} !important; }
        ${d} .text-white\/60,
        ${d} .text-white\/50,
        ${d} .text-white\/40,
        ${d} .text-white\/30,
        ${d} .text-white\/25,
        ${d} .text-white\/20 { color: ${t.textMuted} !important; }
        ${d} .text-slate-300,
        ${d} .text-slate-400 { color: ${t.textMuted} !important; }
        ${d} ::placeholder { color: ${t.textMuted} !important; }
        ${d} input,
        ${d} input[type="text"],
        ${d} input[type="password"],
        ${d} textarea { color: ${t.text} !important; }
        ${d} p, ${d} span, ${d} h1,
        ${d} h2, ${d} h3, ${d} h4,
        ${d} code, ${d} label { color: ${t.text}; }
        ${d} .bg-amber-500 { color: white !important; }
        ${d} .bg-amber-500 span,
        ${d} .bg-amber-500 p { color: white !important; }
        ${d} .text-amber-400 { color: #b45309 !important; }
        ${d} .text-amber-300 { color: #d97706 !important; }
        ${d} .text-amber-200 { color: #92620a !important; }
        ${d} .text-rose-400 { color: #be123c !important; }
        ${d} .text-emerald-400 { color: #047857 !important; }
        ${d} .text-indigo-400 { color: #4338ca !important; }
        ${d} .text-violet-400 { color: #6d28d9 !important; }
        ${d} .text-yellow-400 { color: #b45309 !important; }
        ${d} .text-emerald-500 { color: #059669 !important; }
        ${d} .text-slate-300 { color: #475569 !important; }
      `;
    } else {
      styleEl.textContent = "";
    }
  }, [themeId]);

  // iOSテーマのCSSをDOMに適用・解除するuseEffect
  useEffect(() => {
    const IOS_STYLE_ID = "ios-theme-override";
    let styleEl = document.getElementById(IOS_STYLE_ID);
    if (themeId === "ios") {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = IOS_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        :root {
          --ios-bg: #000000;
          --ios-card-bg: rgba(28, 28, 30, 0.7);
          --ios-card-border: rgba(255, 255, 255, 0.1);
          --ios-blue: #0A84FF;
          --ios-gray: #8E8E93;
          --ios-radius: 12px;
          --ios-radius-lg: 20px;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--ios-bg) !important;
          -webkit-font-smoothing: antialiased;
        }
        .ios-glass {
          background: var(--ios-card-bg) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 0.5px solid var(--ios-card-border) !important;
        }
        .ios-button {
          border-radius: var(--ios-radius) !important;
          font-weight: 600 !important;
          transition: opacity 0.2s ease !important;
        }
        .ios-button:active {
          opacity: 0.7 !important;
        }
        .ios-input {
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 10px !important;
          border: none !important;
          padding: 12px 16px !important;
          color: white !important;
        }
      `;
    } else {
      if (styleEl) {
        styleEl.remove();
      }
    }
  }, [themeId]);

  useEffect(() => {
    if (!user || !fb.enabled || friends.length === 0) return;
    // ログイン直後 lastReadDm が未設定のフレンドには「今」をセット（過去メッセージを未読扱いしない）
    friends.forEach((f) => {
      if (!loadLocal(`lastReadDm_${f.id}`)) {
        saveLocal(`lastReadDm_${f.id}`, Date.now().toString());
      }
    });
    const unsubs = friends.map((f) => {
      const roomId = [user.uid, f.id].sort().join("_");
      return onSnapshot(
        query(
          collection(fb.db, "artifacts", fb.appId, "chats", roomId, "messages"),
          orderBy("timestamp", "desc"),
          limit(1)
        ),
        (s) => {
          if (s.empty) return;
          const latest = s.docs[0].data();
          if (latest.uid === user.uid) return;
          const lastRead = Number(loadLocal(`lastReadDm_${f.id}`) || 0);
          if (latest.timestamp > lastRead) {
            setUnreadDm((prev) => {
              if (
                screenRef.current === "dm" &&
                activeFriendRef.current?.id === f.id
              )
                return { ...prev, [f.id]: 0 };
              return { ...prev, [f.id]: 1 };
            });
          }
        }
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [friends, user]); // screen/activeFriendはrefで参照するため依存配列から除外

  useEffect(() => {
    if (screen === "dm" && user && activeFriend && fb.enabled) {
      const roomId = [user.uid, activeFriend.id].sort().join("_");
      saveLocal(`lastReadDm_${activeFriend.id}`, Date.now().toString());
      setUnreadDm((prev) => ({ ...prev, [activeFriend.id]: 0 }));

      const unsubDM = onSnapshot(
        query(
          collection(fb.db, "artifacts", fb.appId, "chats", roomId, "messages"),
          limit(50)
        ),
        (s) => {
          const msgs = s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.timestamp - b.timestamp);
          setDmMessages(msgs);
          if (msgs.length > 0) {
            saveLocal(`lastReadDm_${activeFriend.id}`, Date.now().toString());
            setUnreadDm((prev) => ({ ...prev, [activeFriend.id]: 0 }));
          }
        }
      );
      return () => unsubDM();
    }
  }, [screen, activeFriend, user]);

  // PWA manifest & icons are now declared statically in index.html and served
  // from public/manifest.webmanifest (name "Oriex", icons icon-192/512).
  // The previous runtime Blob-manifest (named differently and pointing at a
  // non-existent icon) was removed: it conflicted with the static Oriex manifest.

  // お知らせ一覧を開いたら自動で既読にする
  useEffect(() => {
    if (screen === "announcementsList" && announcements.length > 0) {
      const ids = announcements.map((a) => a.id);
      setReadAnnouncementIds(ids);
      localStorage.setItem("genron_readAnnouncements", JSON.stringify(ids));
    }
  }, [screen, announcements]);

  // 先生ログイン時: 日本史（貴族政治の展開）問題をcustomVocabularyに自動追加
  useEffect(() => {
    if (!user || !fb.enabled || !profile?.isTeacher) return;
    const autoAddJpHistory = async () => {
      try {
        const colRef = collection(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "customVocabulary"
        );
        const existing = await getDocs(colRef);
        const existingKeys = new Set(
          existing.docs.map((d) => d.data()?._autoId).filter(Boolean)
        );
        const wordsToAdd = DEFAULT_VOCAB_JPHISTORY.filter(
          (w) => w.stage === 16
        );
        for (const word of wordsToAdd) {
          const autoId = `jphistory_s16_${word.en}`;
          if (existingKeys.has(autoId)) continue;
          await addDoc(colRef, {
            ...word,
            _autoId: autoId,
            timestamp: Date.now(),
            assignedTo: "all",
            seenBy: [],
          });
        }
      } catch (e) {
        console.error("日本史問題の自動追加に失敗:", e);
      }
    };
    autoAddJpHistory();
  }, [user?.uid, profile?.isTeacher]);

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const formatSentence = (sentence, word) => {
    if (!sentence || !word) return sentence || "";
    // 日本語・古文・化学用語:  が効かないので直接置換
    const isJapanese = /[ぁ-ん々ー]|[一-鿿]|[ァ-ヶ]/.test(word);
    if (isJapanese) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const result = sentence.replace(new RegExp(escaped, "g"), "______");
      return result.includes("______") ? result : sentence;
    }
    // 英語: 語幹末尾削りでマッチ
    for (let cut = 0; cut <= 3; cut++) {
      if (word.length - cut < 3) break;
      const stem = cut === 0 ? word : word.slice(0, word.length - cut);
      const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\w*\\b`, "gi");
      const result = sentence.replace(regex, "______");
      if (result.includes("______")) return result;
    }
    return sentence;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const canPost =
      profile?.isTeacher ||
      (chatSettings.allowedUids || []).includes(user?.uid || "");
    if (!canPost) {
      showToast("発言権限がありません", "error");
      return;
    }
    const newMessage = {
      text: chatInput,
      uid: user?.uid || "local-user",
      name: profile?.name || "User",
      avatar: profile?.avatar || "bear",
      color: profile?.color || "bg-amber-500",
      isTeacher: profile?.isTeacher || false,
      timestamp: Date.now(),
    };
    if (user && fb.enabled)
      await addDoc(
        collection(fb.db, "artifacts", fb.appId, "public", "data", "chat"),
        newMessage
      );
    else
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), ...newMessage },
      ]);
    setChatInput("");
    setTimeout(
      () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSendDM = async () => {
    if (!dmInput.trim() || !activeFriend) return;
    const newMessage = {
      text: dmInput,
      uid: user?.uid || "local-user",
      timestamp: Date.now(),
    };
    if (user && fb.enabled) {
      const roomId = [user.uid, activeFriend.id].sort().join("_");
      await addDoc(
        collection(fb.db, "artifacts", fb.appId, "chats", roomId, "messages"),
        newMessage
      );
    } else
      setDmMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), ...newMessage },
      ]);
    setDmInput("");
    setTimeout(
      () => dmEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSearchById = async () => {
    if (!searchId.trim()) return;
    const queryId = searchId.trim().toUpperCase();
    if (queryId === profile?.shortId) {
      alert("自分のIDです！");
      return;
    }
    let targetUser = leaderboard.find((u) => u.shortId === queryId);
    if (!targetUser && fb.enabled) {
      try {
        // leaderboard（生徒）を検索
        const snap = await getDocs(
          collection(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "leaderboard"
          )
        );
        const allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        targetUser = allUsers.find((u) => u.shortId === queryId);
      } catch (error) {
        console.warn("leaderboard検索中にエラー:", error);
      }
    }
    if (!targetUser && fb.enabled) {
      try {
        // teacherIndex（先生）を検索
        const tSnap = await getDocs(
          collection(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "teacherIndex"
          )
        );
        const allTeachers = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        targetUser = allTeachers.find((u) => u.shortId === queryId);
      } catch (error) {
        console.warn("teacherIndex検索中にエラー:", error);
      }
    }
    if (targetUser) setSearchResult(targetUser);
    else alert("ユーザーが見つかりませんでした。");
  };

  const handleAddFriend = async (targetUser) => {
    if (!fb.db || !user?.uid) {
      alert("ログインが完了していません。");
      return;
    }
    const myUid = user?.uid;
    const targetUid = targetUser.uid || targetUser.id;
    if (!targetUid || myUid === targetUid) return;

    try {
      await setDoc(
        doc(fb.db, "artifacts", fb.appId, "users", myUid, "friends", targetUid),
        {
          id: targetUid,
          uid: targetUid,
          name: targetUser.name,
          avatar: targetUser.avatar,
          color: targetUser.color,
          isTeacher: targetUser.isTeacher || false,
          addedAt: Date.now(),
        }
      );
      try {
        await setDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "users",
            targetUid,
            "friends",
            myUid
          ),
          {
            id: myUid,
            uid: myUid,
            name: profile.name,
            avatar: profile.avatar,
            color: profile.color,
            isTeacher: profile.isTeacher || false,
            addedAt: Date.now(),
          }
        );
      } catch (e: any) {}
      alert(`${targetUser.name}さんをフレンドに追加しました！`);
      setSearchResult(null);
      setSearchId("");
      setScreen("friendsList");
    } catch (e: any) {
      alert("フレンド追加に失敗しました。");
    }
  };

  // ── アバターフレーム（クリアしたステージ数に応じて変化） ──
  const STAGE_FRAMES = [
    { min: 0, ring: "#cbb8a4", label: "ノーマル" },
    { min: 3, ring: "#c98a4b", label: "ブロンズ" },
    { min: 8, ring: "#9aa6b2", label: "シルバー" },
    { min: 15, ring: "#e8b53c", label: "ゴールド" },
    { min: 24, ring: "#22c55e", label: "エメラルド" },
    { min: 36, ring: "#38bdf8", label: "クリスタル" },
    { min: 50, ring: "#9b5de5", label: "レジェンド" },
    { min: 70, ring: "#f472b6", label: "マスター" },
  ];
  const stageCountOf = (p) => {
    if (!p) return 0;
    if (typeof p.stagesCleared === "number") return p.stagesCleared;
    const cs = p.clearedStages || {};
    try {
      return Object.values(cs).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0);
    } catch { return 0; }
  };
  const frameOf = (count, frameMin = null) => {
    const chosen = STAGE_FRAMES.find((f) => f.min === Number(frameMin));
    if (chosen && count >= chosen.min) return chosen;
    let current = STAGE_FRAMES[0];
    for (const f of STAGE_FRAMES) if (count >= f.min) current = f;
    return current;
  };
  const frameRingOf = (count, frameMin = null) => frameOf(count, frameMin).ring;
  const frameLabelOf = (count, frameMin = null) => frameOf(count, frameMin).label;
  const frameShadow = (count, w = 4, frameMin = null) => {
    const ring = frameRingOf(count, frameMin);
    return ring ? `0 0 0 2px #fff, 0 0 0 ${w}px ${ring}, 0 0 ${w * 3}px ${ring}cc` : null;
  };

  const handleRemoveFriend = async (friend, onDone) => {
    if (!friend) return;
    if (!window.confirm(`${friend.name || "この友だち"}さんをフレンドから削除しますか？`))
      return;
    const friendId = friend.uid || friend.id;
    if (fb.db && user?.uid) {
      try {
        await deleteDoc(
          doc(fb.db, "artifacts", fb.appId, "users", user.uid, "friends", friendId)
        );
        try {
          await deleteDoc(
            doc(fb.db, "artifacts", fb.appId, "users", friendId, "friends", user.uid)
          );
        } catch (e: any) {}
      } catch (error) {
        showToast("削除に失敗しました", "error");
        return;
      }
    }
    setUnreadDm((prev) => {
      const next = { ...prev };
      delete next[friendId];
      return next;
    });
    localStorage.removeItem(`genron_lastReadDm_${friendId}`);
    setFriends((prev) => prev.filter((f) => (f.uid || f.id) !== friendId));
    showToast("フレンドを削除しました");
    if (typeof onDone === "function") onDone();
  };

  const showToast = (msg, type = "success") => {
    // 確認系（追加/削除/保存など）のトーストは表示しない。エラー・警告のみ表示。
    if (type !== "error" && type !== "warning") return;
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Googleスプレッドシートからの単語インポート
  const importFromSheet = async (url, stageNum) => {
    setSheetImporting(true);
    setSheetPreview(null);
    try {
      // 公開スプレッドシートのURLをCSVエクスポートURLに変換
      let csvUrl = url.trim();
      // https://docs.google.com/spreadsheets/d/SHEET_ID/edit... 形式を変換
      const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match)
        throw new Error(
          "URLが正しくありません。GoogleスプレッドシートのURLを入力してください。"
        );
      const sheetId = match[1];
      // gidパラメータがあれば取得
      const gidMatch = csvUrl.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const res = await fetch(csvUrl);
      if (!res.ok)
        throw new Error(
          "スプレッドシートを取得できません。「ウェブに公開」されているか確認してください。"
        );
      const text = await res.text();

      // CSV解析（1行目=ヘッダー: en, ja, sentence）
      const lines = text.trim().split(/\r?\n/);
      const errors = [];
      const words = [];

      // ヘッダー行をスキップして解析
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        // CSV正しく分割（クォート対応）
        const cols =
          line
            .match(/(".*?"|[^,]+)(?=,|$)/g)
            ?.map((c) => c.replace(/^"|"$/g, "").trim()) || [];
        const en = cols[0] || "";
        const ja = cols[1] || "";
        const sentence = cols[2] || "";
        if (!en || !ja) {
          errors.push(`行${i + 1}: 単語または意味が空です`);
          continue;
        }
        words.push({ en, ja, sentence, stage: stageNum || 1 });
      }
      setSheetPreview({ words, errors, total: lines.length - 1 });
    } catch (e: any) {
      showToast(e.message || "読み込みエラー", "error");
    }
    setSheetImporting(false);
  };

  const commitSheetImport = async (words, replaceAll) => {
    if (!fb.enabled || !fb.db) return showToast("Firebase未接続", "error");
    setSheetImporting(true);
    try {
      const vocabRef = collection(
        fb.db,
        "artifacts",
        fb.appId,
        "public",
        "data",
        "vocabulary"
      );
      if (replaceAll) {
        // 既存を全削除してから追加
        const existing = await getDocs(vocabRef);
        const batch = writeBatch(fb.db);
        existing.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      // バッチで追加（500件制限に対応）
      for (let i = 0; i < words.length; i += 400) {
        const batch = writeBatch(fb.db);
        words.slice(i, i + 400).forEach((w) => {
          batch.set(
            doc(
              fb.db,
              "artifacts",
              fb.appId,
              "public",
              "data",
              "vocabulary",
              `${w.en}_${w.stage}`
            ),
            w
          );
        });
        await batch.commit();
      }
      showToast(`${words.length}語を登録しました！`, "success");
      setSheetPreview(null);
      setSheetUrl("");
    } catch (e: any) {
      showToast("登録エラー: " + e.message, "error");
    }
    setSheetImporting(false);
  };

  // AI で紛らわしい誤答3択を生成
  const generateAIDistractors = async (word, allWords) => {
    // Local-only distractor generation. The previous Anthropic browser-direct
    // fetch was removed entirely for security/review reasons (no API key in the
    // browser). TODO(Phase 2): optionally regenerate distractors via a server
    // proxy (Cloud Function) — see SECURITY_NOTES.md.
    return allWords
      .filter((w) => w.en !== word.en)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  };

  // 復習クイズの問題をセット
  const startReviewQuiz = async (idx, list) => {
    const word = list[idx];
    if (!word) return;
    setReviewQuizLoading(true);
    setReviewQuizFeedback(null);
    const pool = vocabList.length >= 4 ? vocabList : DEFAULT_VOCAB;
    const distractors = await generateAIDistractors(word, pool);
    const opts = [word, ...distractors].sort(() => 0.5 - Math.random());
    setReviewQuizOptions(opts);
    setReviewQuizLoading(false);
  };

  const markAnnouncementsRead = useCallback(() => {
    const ids = announcements.map((a) => a.id);
    setReadAnnouncementIds(ids);
    localStorage.setItem("genron_readAnnouncements", JSON.stringify(ids));
  }, [announcements]);

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    if (!fb.db || !fb.auth) return showToast("Firebase未接続です", "error");
    try {
      await addDoc(
        collection(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "announcements"
        ),
        {
          text: newAnnouncement,
          timestamp: Date.now(),
          uid: user?.uid || "admin",
        }
      );
      setNewAnnouncement("");
      showToast("お知らせを送信しました！");
    } catch (e: any) {
      showToast("送信エラー: " + e.message, "error");
    }
  };

  const handleDeleteChatMessage = async (messageId) => {
    if (!fb.db) return;
    try {
      await deleteDoc(
        doc(fb.db, "artifacts", fb.appId, "public", "data", "chat", messageId)
      );
    } catch (e: any) {
      showToast("削除エラー", "error");
    }
  };

  const handleDeleteUser = async (targetUid, targetShortId) => {
    if (!fb.db) return;
    if (
      !window.confirm(`UID: ${targetShortId} のユーザーを完全に削除しますか？`)
    )
      return;
    try {
      await deleteDoc(
        doc(fb.db, "artifacts", fb.appId, "users", targetUid, "profile", "main")
      );
      // leaderboard削除（先生は存在しない場合があるのでエラー無視）
      await deleteDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "customApp",
          targetUid
        )
      ).catch(() => null);
      // teacherIndexからも削除（先生の場合）
      await deleteDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "teacherIndex",
          targetUid
        )
      ).catch(() => null);
      // チャットメッセージを削除
      try {
        const chatSnap = await getDocs(
          query(
            collection(fb.db, "artifacts", fb.appId, "public", "data", "chat"),
            where("uid", "==", targetUid)
          )
        );
        await Promise.allSettled(chatSnap.docs.map((d) => deleteDoc(d.ref)));
      } catch (e: any) {}
      // パスワード一覧のstateからも即時削除
      setPasswordList((prev) =>
        prev.filter((u) => (u.uid || u.id) !== targetUid)
      );
      showToast("ユーザーを削除しました");
    } catch (e: any) {
      showToast("削除エラー", "error");
    }
  };

  // リアクション送信（絵文字スタンプをチャットに流す）
  const handleSendReaction = async (emoji) => {
    if (!user?.uid) return;
    const msg = {
      uid: user.uid,
      name: profile?.name || "匿名",
      avatar: profile?.avatar || "",
      color: profile?.color || "bg-amber-500",
      isTeacher: false,
      text: emoji,
      isReaction: true,
      timestamp: Date.now(),
    };
    if (fb.enabled && fb.db) {
      try {
        await addDoc(
          collection(fb.db, "artifacts", fb.appId, "public", "data", "chat"),
          msg
        );
      } catch (e: any) {}
    }
  };

  // チャット発言権限の付与/剥奪
  const handleToggleChatPermission = async (targetUid) => {
    if (!fb.db) return;
    const current = chatSettings.allowedUids || [];
    const next = current.includes(targetUid)
      ? current.filter((id) => id !== targetUid)
      : [...current, targetUid];
    const newSettings = { ...chatSettings, allowedUids: next };
    try {
      await setDoc(
        doc(fb.db, "artifacts", fb.appId, "public", "data", "settings", "chat"),
        newSettings,
        { merge: true }
      );
      setChatSettings(newSettings);
      const target = leaderboard.find((u) => (u.uid || u.id) === targetUid);
      showToast(
        next.includes(targetUid)
          ? `${target?.name || "ユーザー"}に発言権限を付与しました`
          : `${target?.name || "ユーザー"}の発言権限を剥奪しました`
      );
    } catch (e: any) {
      showToast("権限の更新に失敗しました", "error");
    }
  };

  // コイン配布
  const handleGiveCoins = async (targetUid, targetName, amount) => {
    if (!fb.db || !amount || amount <= 0) return;
    try {
      const profileSnap = await getDoc(
        doc(fb.db, "artifacts", fb.appId, "users", targetUid, "profile", "main")
      );
      if (!profileSnap.exists()) {
        showToast("ユーザーが見つかりません", "error");
        return;
      }
      const current = profileSnap.data();
      const newPoints = (current.petPoints || 0) + amount;
      const updated = { ...current, petPoints: newPoints };
      await setDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "users",
          targetUid,
          "profile",
          "main"
        ),
        updated,
        { merge: true }
      );
      // leaderboard も更新
      await setDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "customApp",
          targetUid
        ),
        { petPoints: newPoints },
        { merge: true }
      ).catch(() => null);
      showToast(`${targetName}さんに${amount}コイン配布しました！`);
    } catch (e: any) {
      showToast("配布エラー: " + e.message, "error");
    }
  };

  const handleLogin = async () => {
    if (!loginId.trim() || !loginPassword.trim()) {
      setLoginError("IDとパスワードを入力してください");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      let targetUid = null;
      let targetProfile = null;
      const lbSnap = await getDocs(
        collection(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "leaderboard"
        )
      );
      const lbUser = lbSnap.docs.find(
        (d) => d.data().shortId === loginId.trim().toUpperCase()
      );
      if (lbUser) targetUid = lbUser.id;
      if (!targetUid) {
        const teacherSnap = await getDocs(
          collection(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "teacherIndex"
          )
        );
        const teacherDoc = teacherSnap.docs.find(
          (d) => d.data().shortId === loginId.trim().toUpperCase()
        );
        if (teacherDoc) targetUid = teacherDoc.id;
      }
      if (!targetUid) {
        setLoginError("IDが見つかりません");
        setIsLoggingIn(false);
        return;
      }
      const profileSnap = await getDoc(
        doc(fb.db, "artifacts", fb.appId, "users", targetUid, "profile", "main")
      );
      if (!profileSnap.exists()) {
        setLoginError("アカウントが見つかりません");
        setIsLoggingIn(false);
        return;
      }
      targetProfile = profileSnap.data();
      if (targetProfile.password !== loginPassword) {
        setLoginError("パスワードが違います");
        setIsLoggingIn(false);
        return;
      }

      setProfile(targetProfile);
      saveLocal("profile", targetProfile);
      saveLocal("uid", targetUid);
      if (targetProfile.isTeacher) setIsAdmin(true);

      // Streak更新チェック
      const streakData = calculateNewStreak(targetProfile);
      if (streakData.lastStreakUpdate !== targetProfile.lastStreakUpdate) {
        targetProfile = { ...targetProfile, ...streakData };
        setProfile(targetProfile);
        saveLocal("profile", targetProfile);
        // Firestoreも更新
        setDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "users",
            targetUid,
            "profile",
            "main"
          ),
          {
            streakCount: streakData.streakCount,
            lastStreakUpdate: streakData.lastStreakUpdate,
          },
          { merge: true }
        ).catch(() => null);
        if (!targetProfile.isTeacher) {
          setDoc(
            doc(
              fb.db,
              "artifacts",
              fb.appId,
              "public",
              "data",
              "customApp",
              targetUid
            ),
            { streakCount: streakData.streakCount },
            { merge: true }
          ).catch(() => null);
        }
      }

      // Firestoreから履歴を取得してlocalStorageに保存
      try {
        const histSnap = await getDocs(
          query(
            collection(
              fb.db,
              "artifacts",
              fb.appId,
              "users",
              targetUid,
              "history"
            ),
            limit(50)
          )
        );
        const fbHistory = histSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setHistory(fbHistory);
        saveLocal("history", fbHistory);
      } catch (e: any) {
        // 取得失敗時はlocalのものをそのまま使う
      }

      await signInAnonymously(fb.auth);
      setUser({ uid: targetUid });
      setScreen("start");
      setLoginId("");
      setLoginPassword("");
    } catch (e: any) {
      setLoginError("ログインエラー: " + e.message);
    }
    setIsLoggingIn(false);
  };

  // 強制ログアウト（確認ダイアログなし・アカウント削除検知時に使用）
  const forceLogout = (showDeletedToast = true) => {
    // ログイン画面・loading画面では誤発動を防ぐためスキップ
    const currentScreen = screenRef.current;
    if (
      currentScreen === "login" ||
      currentScreen === "loading" ||
      currentScreen === "register" ||
      currentScreen === "swipeEntry"
    )
      return;
    ["profile", "history", "uid", "lastReadChat"].forEach((k) =>
      localStorage.removeItem(`genron_${k}`)
    );
    Object.keys(localStorage)
      .filter((k) => k.startsWith("genron_lastReadDm_"))
      .forEach((k) => localStorage.removeItem(k));
    setProfile(null);
    setUser(null);
    setHistory([]);
    setFriends([]);
    setReviewList([]);
    setLeaderboard([]);
    setChatMessages([]);
    setAnnouncements([]);
    setDmMessages([]);
    setActiveFriend(null);
    setIsAdmin(false);
    setUnreadChat(0);
    setUnreadDm({});
    setScreen("login");
    // ✅ Firebaseの認証セッションを破棄
    if (fb.enabled) signOut(fb.auth).catch(() => null);
    if (showDeletedToast) {
      setTimeout(
        () => setToast({ msg: "アカウントが削除されました", type: "error" }),
        200
      );
    }
  };

  const handleLogout = () => {
    if (!window.confirm("ログアウトしますか？")) return;
    ["profile", "history", "uid", "lastReadChat"].forEach((k) =>
      localStorage.removeItem(`genron_${k}`)
    );
    Object.keys(localStorage)
      .filter((k) => k.startsWith("genron_lastReadDm_"))
      .forEach((k) => localStorage.removeItem(k));
    // SECURITY (Phase 1): on a shared device, clear personal data and the
    // Anthropic key so the next user can't read the previous user's notes /
    // diary / vocab / book logs or reuse the API key.
    localStorage.removeItem("genron_anthropicApiKey");
    Object.keys(localStorage)
      .filter((k) =>
        /^(oritan_|oriex_review_|oriex_userVocab_|oriex_goal$)/.test(k)
      )
      .forEach((k) => localStorage.removeItem(k));
    setProfile(null);
    setUser(null);
    setHistory([]);
    setFriends([]);
    setReviewList([]);
    setLeaderboard([]);
    setChatMessages([]);
    setAnnouncements([]);
    setDmMessages([]);
    setActiveFriend(null);
    setIsAdmin(false);
    setUnreadChat(0);
    setUnreadDm({});
    // ✅ Firebaseの認証セッションを破棄（これがないとonAuthStateChangedで自動再ログインされる）
    if (fb.enabled) signOut(fb.auth).catch(() => null);
    setScreen("login");
  };

  const handleResetProgress = async () => {
    if (
      !window.confirm(
        "経験値・ステージ進捗・ペット・履歴をすべてリセットしますか？\nアカウント（名前・ID・パスワード）は残ります。"
      )
    )
      return;
    if (!window.confirm("本当にリセットしますか？この操作は取り消せません。"))
      return;
    const resetProfile = {
      ...profile,
      totalExp: 0,
      unlockedStages: {},
      petPoints: 0,
      ownedPets: [],
      ownedAccessories: [],
      petNames: {},
      petAccessories: {},
      activePet: null,
    };
    setProfile(resetProfile);
    setHistory([]);
    saveLocal("profile", resetProfile);
    saveLocal("history", []);
    const uid = user?.uid;
    if (fb.db && uid) {
      try {
        await setDoc(
          doc(fb.db, "artifacts", fb.appId, "users", uid, "profile", "main"),
          resetProfile,
          { merge: true }
        );
        await setDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "customApp",
            uid
          ),
          { ...resetProfile, score: 0 },
          { merge: true }
        );
        // 履歴コレクションを削除
        const histSnap = await getDocs(
          collection(fb.db, "artifacts", fb.appId, "users", uid, "history")
        ).catch(() => ({ docs: [] }));
        await Promise.allSettled(histSnap.docs.map((d) => deleteDoc(d.ref)));
      } catch (e: any) {
        console.error("リセットエラー:", e);
      }
    }
    showToast("進捗をリセットしました");
  };

  const handleSelfDeleteAccount = async () => {
    if (
      !window.confirm(
        "アカウントを完全に削除しますか？\nこの操作は取り消せません。"
      )
    )
      return;
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      const uid = user?.uid;
      if (fb.db && uid) {
        // leaderboard と teacherIndex を確実に削除（エラーがあれば即中断）
        await deleteDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "customApp",
            uid
          )
        ).catch((e) => {
          throw new Error("leaderboard削除失敗: " + e.message);
        });
        await deleteDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "teacherIndex",
            uid
          )
        ).catch((e) => {
          throw new Error("teacherIndex削除失敗: " + e.message);
        });
        await deleteDoc(
          doc(fb.db, "artifacts", fb.appId, "users", uid, "profile", "main")
        ).catch((e) => {
          throw new Error("profile削除失敗: " + e.message);
        });
        const myFriendsSnap = await getDocs(
          collection(fb.db, "artifacts", fb.appId, "users", uid, "friends")
        ).catch(() => ({ docs: [] }));
        await Promise.allSettled(
          myFriendsSnap.docs.map((fd) =>
            deleteDoc(
              doc(fb.db, "artifacts", fb.appId, "users", fd.id, "friends", uid)
            ).catch(() => null)
          )
        );
      }
      ["profile", "history", "uid", "lastReadChat"].forEach((k) =>
        localStorage.removeItem(`genron_${k}`)
      );
      Object.keys(localStorage)
        .filter((k) => k.startsWith("genron_lastReadDm_"))
        .forEach((k) => localStorage.removeItem(k));
      setProfile(null);
      setUser(null);
      setHistory([]);
      setFriends([]);
      setLeaderboard([]);
      setChatMessages([]);
      setIsAdmin(false);
      if (fb.enabled) signOut(fb.auth).catch(() => null);
      showToast("アカウントを削除しました");
      setScreen("login");
    } catch (e: any) {
      console.error("アカウント削除エラー:", e);
      showToast("削除エラー: " + (e.message || "再度お試しください"), "error");
    }
  };

  const saveInviteCode = async () => {
    if (!editingInviteCode.trim() || !fb.db) return;
    setIsSavingInviteCode(true);
    try {
      const code = editingInviteCode.trim().toUpperCase();
      await setDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "settings",
          "inviteCode"
        ),
        { code, updatedAt: Date.now() }
      );
      setInviteCode(code);
      setEditingInviteCode("");
      showToast("招待コードを更新しました");
    } catch (e: any) {
      showToast("保存エラー", "error");
    }
    setIsSavingInviteCode(false);
  };

  const fetchInviteCode = async () => {
    if (!fb.db || inviteCodeFetched) return;
    setInviteCodeFetched(true);
    try {
      const snap = await getDoc(
        doc(
          fb.db,
          "artifacts",
          fb.appId,
          "public",
          "data",
          "settings",
          "inviteCode"
        )
      );
      setInviteCode(
        snap.exists()
          ? snap.data().code || DEFAULT_INVITE_CODE
          : DEFAULT_INVITE_CODE
      );
    } catch (e: any) {
      setInviteCode(DEFAULT_INVITE_CODE);
    }
  };

  // ── 汎用実績チェック＆交流自動投稿 ──────────────────────────────


  // ペットごとのアクセサリー取得
  const getPetAccessories = (petId) => {
    return (profile?.petAccessories || {})[petId] || [];
  };

  // ペットにアクセサリーを装着/外す
  const handleEquipAccForPet = (petId, accId) => {
    const current = getPetAccessories(petId);
    const acc = SHOP_ACCESSORIES.find((a) => a.id === accId);
    // 同じスロットの既存アクセサリーを外してから付ける
    let next;
    if (current.includes(accId)) {
      next = current.filter((id) => id !== accId);
    } else {
      const sameSlot = acc
        ? current.filter((id) => {
            const a = SHOP_ACCESSORIES.find((x) => x.id === id);
            return a?.slot === acc.slot;
          })
        : [];
      next = [...current.filter((id) => !sameSlot.includes(id)), accId];
    }
    const newProfile = {
      ...profile,
      petAccessories: { ...(profile?.petAccessories || {}), [petId]: next },
    };
    setProfile(newProfile);
    saveLocal("profile", newProfile);
    if (user && fb.db)
      setDoc(
        doc(fb.db, "artifacts", fb.appId, "users", user.uid, "profile", "main"),
        newProfile,
        { merge: true }
      ).catch(() => null);
  };

  const handleEquip = (item, type) => {
    if (type !== "pet") return; // アクセサリーは handleEquipAccForPet を使用
    const newProfile = { ...profile, activePet: item.id };
    setProfile(newProfile);
    saveLocal("profile", newProfile);
    if (user && fb.db)
      setDoc(
        doc(fb.db, "artifacts", fb.appId, "users", user.uid, "profile", "main"),
        newProfile,
        { merge: true }
      ).catch(() => null);
  };

  const toggleArr = (arr, id) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  // ★ ペット育成のお世話処理（petIdごとに個別管理）
  const getPetData = (petId) => {
    const pd = profile?.petData || {};
    return pd[petId] || { affection: 0, lastNadeDate: "", nadeCountToday: 0 };
  };



  const fetchPasswordList = async () => {
    if (!fb.db) return;
    setIsLoadingPasswords(true);
    try {
      // 生徒（leaderboard）と先生（teacherIndex）の両方を取得
      const [lbSnap, tiSnap] = await Promise.all([
        getDocs(
          collection(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "leaderboard"
          )
        ),
        getDocs(
          collection(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "teacherIndex"
          )
        ),
      ]);
      // 重複を防ぐためuidをキーにしてマージ
      const allUids = [
        ...lbSnap.docs.map((d) => d.id),
        ...tiSnap.docs
          .map((d) => d.id)
          .filter((id) => !lbSnap.docs.find((d) => d.id === id)),
      ];
      const results = await Promise.all(
        allUids.map(async (uid) => {
          try {
            const pSnap = await getDoc(
              doc(fb.db, "artifacts", fb.appId, "users", uid, "profile", "main")
            );
            if (pSnap.exists()) {
              const p = pSnap.data();
              return {
                uid,
                name: p.name,
                shortId: p.shortId,
                password: p.password || "（未設定）",
                avatar: p.avatar,
                color: p.color,
                isTeacher: p.isTeacher || false,
              };
            }
          } catch (e: any) {
            return null;
          }
          return null;
        })
      );
      setPasswordList(
        results
          .filter(Boolean)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      );
    } catch (e: any) {
      showToast("取得エラー", "error");
    }
    setIsLoadingPasswords(false);
  };

  const handleRegister = async () => {
    if (!newName.trim()) return;
    if (newPassword && newPassword !== confirmPassword) {
      showToast("パスワードが一致しません", "error");
      return;
    }
    if (screen === "register" && !newPassword.trim()) {
      showToast("パスワードを設定してください", "error");
      return;
    }
    // SECURITY (Phase 1): the invite-code bypass via the teacher passcode has
    // been removed. Registration now always requires a valid invite code.
    if (screen === "register") {
      if (!inviteCodeInput.trim()) {
        setInviteCodeError("招待コードを入力してください");
        return;
      }
      let currentCode = DEFAULT_INVITE_CODE;
      if (fb.db) {
        const codeSnap = await getDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "settings",
            "inviteCode"
          )
        ).catch(() => null);
        if (codeSnap?.exists())
          currentCode = codeSnap.data().code || DEFAULT_INVITE_CODE;
      }
      if (inviteCodeInput.trim().toUpperCase() !== currentCode.toUpperCase()) {
        setInviteCodeError("招待コードが違います");
        return;
      }
    } // end else-if (not teacher code)

    setIsSavingProfile(true);
    const currentShortId = profile?.shortId || generateShortId();
    // SECURITY (Phase 1): client-side passcode escalation removed.
    // Previously: teacherCodeInput === ADMIN_PASSCODE ? true : ...
    // A teacher could be created purely from client input. Now teacher status is
    // only carried over from the existing (server-stored) profile; the client can
    // no longer self-promote. TODO(Phase 2): verify via Custom Claims / admin field.
    const teacherFlag = profile?.isTeacher || false;
    const passwordToSave = newPassword.trim()
      ? newPassword.trim()
      : profile?.password || "";

    const data = {
      // 既存プロフィールを全て引き継ぎ、変更箇所だけ上書き
      ...(profile || {}),
      name: newName,
      displayName: newName,
      bio: profileBio.trim() || profile?.bio || "",
      avatar: avatarImage || selectedAvatar.char,
      coverImage: coverImage || null,
      color: selectedColor.bg,
      avatarFrameMin: Number(selectedFrameMin || 0),
      totalExp: profile?.totalExp || 0,
      unlockedStages: profile?.unlockedStages || {},
      streakCount: profile?.streakCount || 1,
      lastStreakUpdate:
        profile?.lastStreakUpdate || new Date().toISOString().split("T")[0],
      shortId: currentShortId,
      petPoints: profile?.petPoints || 0,
      petAffection: profile?.petAffection || 0,
      ownedPets: profile?.ownedPets || [],
      ownedAccessories: profile?.ownedAccessories || [],
      ownedRoomBgs: profile?.ownedRoomBgs || ["night"],
      activeRoomBg: profile?.activeRoomBg || "night",
      petNames: profile?.petNames || {},
      petAccessories: profile?.petAccessories || {},
      activePet: profile?.activePet || null,
      activeAccessories: profile?.activeAccessories || [],
      registeredAt: profile?.registeredAt || Date.now(),
      isTeacher: teacherFlag,
      password: passwordToSave,
    };
    // SECURITY (Phase 1): if the user did not enter a new password, do NOT write
    // an (possibly empty) password field. With { merge: true } this preserves the
    // existing server value and avoids clobbering it now that the cached profile
    // no longer carries the password. New registrations always set a password.
    if (!newPassword.trim()) {
      delete (data as any).password;
    }
    if (teacherFlag) setIsAdmin(true);

    setProfile(data);
    saveLocal("profile", data);

    if (fb.db && fb.auth) {
      try {
        // 新規登録時は古いUIDの再利用を防ぐため、必ず新しい匿名セッションを取得する
        // profileEdit時は既存UIDをそのまま使う
        let uid: string | undefined;
        if (screen === "register") {
          // ログアウト後に古いUIDがstateやlocalStorageに残っている場合があるため
          // signInAnonymously で必ず新規UIDを発行する
          const cred = await signInAnonymously(fb.auth);
          uid = cred.user.uid;
          setUser({ uid });
          saveLocal("uid", uid);
        } else {
          uid = user?.uid;
          if (!uid) {
            const cred = await signInAnonymously(fb.auth);
            uid = cred.user.uid;
            setUser({ uid });
            saveLocal("uid", uid);
          }
        }
        await setDoc(
          doc(fb.db, "artifacts", fb.appId, "users", uid, "profile", "main"),
          data,
          { merge: true }
        );
        if (!data.isTeacher) {
          await setDoc(
            doc(
              fb.db,
              "artifacts",
              fb.appId,
              "public",
              "data",
              "customApp",
              uid
            ),
            { ...data, score: data.totalExp },
            { merge: true }
          );
        } else {
          // 先生登録時: leaderboard に残っている古いエントリーを削除してからteacherIndexに登録
          await deleteDoc(
            doc(
              fb.db,
              "artifacts",
              fb.appId,
              "public",
              "data",
              "customApp",
              uid
            )
          ).catch(() => null); // 存在しない場合はスキップ
          await setDoc(
            doc(
              fb.db,
              "artifacts",
              fb.appId,
              "public",
              "data",
              "teacherIndex",
              uid
            ),
            {
              shortId: data.shortId,
              uid,
              name: data.name,
              avatar: data.avatar || "",
              color: data.color || "",
            }
          );
        }

        const myFriendsSnap = await getDocs(
          collection(fb.db, "artifacts", fb.appId, "users", uid, "friends")
        );
        const friendUpdateData = {
          name: data.name,
          avatar: data.avatar,
          color: data.color,
          isTeacher: data.isTeacher || false,
        };
        await Promise.allSettled(
          myFriendsSnap.docs.map((fd) =>
            setDoc(
              doc(fb.db, "artifacts", fb.appId, "users", fd.id, "friends", uid),
              {
                ...friendUpdateData,
                id: uid,
                uid: uid,
                addedAt: fd.data().addedAt || Date.now(),
              },
              { merge: true }
            ).catch(() => null)
          )
        );
        showToast("保存しました！");
        // 登録直後はsyncProfileの誤検知を防ぐ（Firestoreへの書き込み反映待ち）
        justRegisteredRef.current = true;
        setTimeout(() => {
          justRegisteredRef.current = false;
        }, 10000);
      } catch (error) {
        showToast("保存エラー", "error");
      }
    }

    setIsSavingProfile(false);
    setNewPassword("");
    setConfirmPassword("");
    setScreen("start");
  };

  const addCustomWordToDB = async () => {
    if (!newCustomWord.en || !newCustomWord.ja) return;
    setIsAdding(true);
    await addDoc(
      collection(
        fb.db,
        "artifacts",
        fb.appId,
        "public",
        "data",
        "customVocabulary"
      ),
      {
        ...newCustomWord,
        timestamp: Date.now(),
        assignedTo: customAssignTarget, // "all" or [uid1, uid2, ...]
        seenBy: [],
      }
    );
    setNewCustomWord({
      en: "",
      ja: "",
      sentence: "",
      category: newCustomWord.category,
    });
    setIsAdding(false);
    showToast(
      customAssignTarget === "all"
        ? "カスタム問題を全員に配布しました！"
        : `${
            Array.isArray(customAssignTarget) ? customAssignTarget.length : 0
          }人の生徒に配布しました！`
    );
  };

  const deleteCustomWord = async (id) => {
    if (!window.confirm("この問題を削除しますか？")) return;
    await deleteDoc(
      doc(
        fb.db,
        "artifacts",
        fb.appId,
        "public",
        "data",
        "customVocabulary",
        id
      )
    );
    showToast("削除しました");
  };

  const startGame = (mode, stage, category = "英単語") => {
    const catVocab = ALL_VOCAB.filter(
      (v) => (v.category || "英単語") === category
    );
    let source = catVocab.filter((v) => v.stage === stage);
    if (source.length === 0) source = catVocab.slice(0, 8);
    if (source.length === 0) source = DEFAULT_VOCAB.slice(0, 8);
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    setGameMode(mode);
    setGameCategory(category);
    setCurrentStage(stage);
    setStageWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setCorrectCount(0);
    setGameStartTime(Date.now());
    setStageClearedOccurred(false);
    setLevelUpOccurred(false);
    setShowQuitConfirm(false);
    setResultEarnedPoints(0);
    setResultEarnedCoins(0);
    setResultCorrectCount(0);
    generateQuestion(shuffled[0], false, category);
    setScreen("play");
  };

  const startCustomGame = (mode, tab = "new") => {
    const myUid = user?.uid || "";
    const myWords = customVocabList.filter((w) => {
      const at = w.assignedTo;
      const isAssigned =
        at === "all" ||
        at === undefined ||
        (Array.isArray(at) && at.includes(myUid));
      if (!isAssigned) return false;
      const seen = Array.isArray(w.seenBy) ? w.seenBy.includes(myUid) : false;
      return tab === "new" ? !seen : seen;
    });
    if (myWords.length === 0) return;
    const shuffled = [...myWords].sort(() => 0.5 - Math.random());
    setGameMode(mode);
    setCurrentStage(tab === "new" ? "Custom" : "CustomPast");
    setStageWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setCorrectCount(0);
    setGameStartTime(Date.now());
    setStageClearedOccurred(false);
    setLevelUpOccurred(false);
    setShowQuitConfirm(false);
    setResultEarnedPoints(0);
    setResultEarnedCoins(0);
    setResultCorrectCount(0);
    generateQuestion(shuffled[0], true);
    setScreen("play");
  };

  // 品詞判定（語尾・日本語意味から推定）
  // 品詞判定: vt=他動詞, vi=自動詞, adj=形容詞, noun=名詞
  const getPOS = (word) => {
    const en = (word.en || "").toLowerCase();
    const ja = word.ja || "";
    const ja0 = ja.split("、")[0];
    // 他動詞: "A" + 助詞 が含まれる
    if (/A[をにがとへ]/.test(ja0)) return "vt";
    // 自動詞: Aなしで動詞語尾
    if (/する$|くる$|える$|る$|く$|ぐ$|む$|ぶ$|う$/.test(ja0)) return "vi";
    if (/ate$|ify$|ize$|ise$/.test(en) && !/ment$/.test(en)) return "vi";
    // 形容詞
    if (/な$|い$|的$/.test(ja0)) return "adj";
    if (/ful$|ous$|ive$|al$|ic$|ent$|ant$|able$|ible$/.test(en)) return "adj";
    // 名詞
    return "noun";
  };
  // 他動詞かどうか
  const isVT = (word) => getPOS(word) === "vt";
  // 選択肢ラベル: en-ja方向は常に日本語訳のみ表示
  // （他動詞の場合は「Aを読む」など、jaフィールドをそのまま表示）
  const getOptionLabel = (opt, direction, catOverride = null) => {
    if (direction !== "en-ja") return opt.en;
    const ja = opt.ja || "";
    // 化学・漢字・古文は「英訳：説明」形式なので「：」以降の日本語説明のみ表示
    const nonEnglishCats = ["化学", "漢字", "古文"];
    const cat = catOverride || opt.category || gameCategory;
    if (nonEnglishCats.includes(cat)) {
      // ja が存在するか確認してから indexOf を実行する（なければ -1 を返す）
      const colonIdx = ja ? ja.indexOf(": ") : -1;
      return colonIdx !== -1 ? ja.slice(colonIdx + 1).trim() : ja;
    }
    return ja; // 英単語は問題文のみ、選択肢は日本語訳のみ
  };

  const generateQuestion = (word, isCustom = false, category = null) => {
    if (!word) return;
    const cat = category || gameCategory || "英単語";
    let pool = isCustom
      ? customVocabList
      : ALL_VOCAB.filter((v) => (v.category || "英単語") === cat);
    if (pool.length < 4)
      pool = ALL_VOCAB.filter((v) => (v.category || "英単語") === cat);
    if (pool.length < 4 && isCustom) pool = [...pool, ...customVocabList];

    const otherPool = [...pool].filter((v) => v.en !== word.en);
    const wordPOS = getPOS(word);
    const wordStage = word.stage || 1;
    // 同品詞 + 同ステージ±3 を最優先（vt/viは厳密に区別）
    const samePOSSameStage = otherPool.filter(
      (v) => getPOS(v) === wordPOS && Math.abs((v.stage || 1) - wordStage) <= 3
    );
    const samePOS = otherPool.filter((v) => getPOS(v) === wordPOS);
    // 他動詞が足りない場合は自動詞で補完（逆も同様）、形容詞・名詞は混ぜない
    const verbFallback =
      wordPOS === "vt" || wordPOS === "vi"
        ? otherPool.filter((v) => getPOS(v) === "vt" || getPOS(v) === "vi")
        : [];
    const sameStage = otherPool.filter(
      (v) => Math.abs((v.stage || 1) - wordStage) <= 2
    );
    const getSuffix = (w) => {
      const sx = [
        "tion",
        "ment",
        "ity",
        "ness",
        "ance",
        "ence",
        "ing",
        "er",
        "or",
        "al",
        "ic",
        "ive",
        "ous",
        "ful",
        "less",
        "ly",
      ];
      for (const s of sx) if (w.endsWith(s)) return s;
      return "";
    };
    const wordSuffix = getSuffix(word.en);
    const sameSuffix = otherPool.filter(
      (v) => wordSuffix && getSuffix(v.en) === wordSuffix
    );

    const seen = new Set([word.en]);
    const pick = [];
    const tryAdd = (arr) => {
      for (const v of arr.sort(() => 0.5 - Math.random())) {
        if (!seen.has(v.en)) {
          seen.add(v.en);
          pick.push(v);
        }
        if (pick.length >= 3) return;
      }
    };
    tryAdd(samePOSSameStage);
    tryAdd([...samePOS, ...sameSuffix]);
    tryAdd(verbFallback); // vt/viの場合、同動詞グループで補完
    tryAdd(sameStage);
    tryAdd(otherPool);
    const distractors = pick.slice(0, 3);
    setOptions([word, ...distractors].sort(() => 0.5 - Math.random()));
    setFeedback(null);
  };

  const finishGame = async (isClear, finalCorrect, finalScore) => {
    if (screen !== "play") return;
    setScreen("result");
    const duration = Math.max(
      1,
      Math.round((Date.now() - (gameStartTime || Date.now())) / 60000)
    );

    // ローカルの最新profileを使用（getDocによる読み取りを削減）
    let currentProfile = profileRef.current;

    const totalGained = finalScore + (isClear ? 30 : 0);
    const oldLevel = calcLevel(currentProfile?.totalExp);
    const newExp = (currentProfile?.totalExp || 0) + totalGained;
    if (calcLevel(newExp) > oldLevel) setLevelUpOccurred(true);

    const earnedPetPts =
      finalCorrect * 1 +
      (isClear && currentStage !== "Custom" && currentStage !== "CustomPast"
        ? 3
        : 0);
    const newPetPoints = (currentProfile?.petPoints || 0) + earnedPetPts;
    const catKey = gameCategory || "英単語";
    const catUnlocked = (currentProfile?.unlockedStages || {})[catKey] || 1;
    const newUnlocked =
      isClear &&
      currentStage === catUnlocked &&
      currentStage !== "Custom" &&
      currentStage !== "CustomPast"
        ? currentStage + 1
        : catUnlocked;
    if (isClear) setStageClearedOccurred(true);
    setResultEarnedPoints(totalGained);
    setResultEarnedCoins(earnedPetPts);
    setResultCorrectCount(finalCorrect);

    // カテゴリ別クリア済みステージを更新
    const prevCleared = currentProfile?.clearedStages || {};
    const prevCatCleared = prevCleared[catKey] || [];
    const newCatCleared =
      isClear &&
      currentStage !== "Custom" &&
      currentStage !== "CustomPast" &&
      !prevCatCleared.includes(currentStage)
        ? [...prevCatCleared, currentStage]
        : prevCatCleared;
    const newClearedStages = { ...prevCleared, [catKey]: newCatCleared };

    const updatedProfile = {
      ...currentProfile,
      totalExp: newExp,
      unlockedStages: {
        ...(currentProfile?.unlockedStages || {}),
        [catKey]: Math.min(20, newUnlocked),
      },
      petPoints: newPetPoints,
      clearedStages: newClearedStages,
    };
    const newRecord = {
      score: totalGained,
      correctCount: finalCorrect,
      stage: currentStage,
      isClear,
      lives,
      mode: gameMode,
      duration,
      timestamp: Date.now(),
      id: Date.now().toString(),
    };
    const updatedHistory = [newRecord, ...history].slice(0, 50);

    setProfile(updatedProfile);
    setHistory(updatedHistory);
    saveLocal("profile", updatedProfile);
    saveLocal("history", updatedHistory);

    // 実績チェック＆交流自動投稿

    if (user && fb.enabled) {
      await setDoc(
        doc(fb.db, "artifacts", fb.appId, "users", user.uid, "profile", "main"),
        updatedProfile,
        { merge: true }
      );
      if (!updatedProfile.isTeacher) {
        await setDoc(
          doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "customApp",
            user.uid
          ),
          { ...updatedProfile, score: newExp },
          { merge: true }
        );
      }
      await addDoc(
        collection(fb.db, "artifacts", fb.appId, "users", user.uid, "history"),
        newRecord
      );
      // 新しいカスタム問題タブのゲーム終了時: seenByに自分を追加
      if (currentStage === "Custom" && stageWords.length > 0) {
        const myUid = user.uid;
        for (const word of stageWords) {
          if (!word.id) continue;
          const wordRef = doc(
            fb.db,
            "artifacts",
            fb.appId,
            "public",
            "data",
            "customVocabulary",
            word.id
          );
          try {
            await updateDoc(wordRef, { seenBy: arrayUnion(myUid) });
          } catch (e: any) {}
        }
      }
    }
  };

  const handleAnswer = (choice) => {
    if (feedback) return;
    const isCorrect = choice.en === stageWords[currentIndex].en;
    let nextCorrect = correctCount;
    let nextScore = score;
    const isCustom = currentStage === "Custom" || currentStage === "CustomPast";

    if (isCorrect) {
      setFeedback("correct");
      nextCorrect++;
      setCorrectCount(nextCorrect);
      nextScore += 1;
      setScore(nextScore);
      if (
        ["英単語", "英熟語", "英会話", "熟語"].includes(
          gameCategory || "英単語"
        )
      )
        speak(choice.en);
      setTimeout(() => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < stageWords.length) {
          setCurrentIndex(nextIdx);
          generateQuestion(
            stageWords[nextIdx],
            isCustom,
            isCustom ? null : gameCategory
          );
        } else finishGame(true, nextCorrect, nextScore);
      }, 700);
    } else {
      setFeedback("incorrect");
      let newLives = 0;
      setLives((l) => {
        newLives = l - 1;
        return l - 1;
      });
      {
        const w = stageWords[currentIndex];
        if (w && !reviewList.some((r) => r.en === w.en)) {
          const { id: _id, ...wordData } = w;
          if (user && fb.enabled) {
            addDoc(
              collection(fb.db, "artifacts", fb.appId, "users", user.uid, "review"),
              wordData
            ).catch(() => null);
          } else {
            setReviewList((prev) => [...prev, { ...wordData, id: Date.now().toString() }]);
          }
        }
      }
      setTimeout(() => {
        // newLives は setLives コールバック内で確定した最新値
        const nextIdx = currentIndex + 1;
        if (newLives <= 0) finishGame(false, nextCorrect, nextScore);
        else if (nextIdx < stageWords.length) {
          setCurrentIndex(nextIdx);
          generateQuestion(
            stageWords[nextIdx],
            isCustom,
            isCustom ? null : gameCategory
          );
        } else finishGame(true, nextCorrect, nextScore);
      }, 700);
    }
  };

  const BarChart = ({ type }) => {
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
      });
    });
    const stats = labels.map((label) => {
      const dayRecords = history.filter(
        (h) =>
          new Date(h.timestamp).toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
          }) === label
      );
      return {
        words: dayRecords.reduce((sum, h) => sum + (h.correctCount || 0), 0),
        minutes: dayRecords.reduce((sum, h) => sum + (h.duration || 0), 0),
      };
    });
    const values = stats.map((s) => s[type]);
    const maxVal =
      Math.ceil(Math.max(...values, type === "words" ? 20 : 10) / 10) * 10;

    return (
      <div className="w-full pt-10 pb-4">
        <div className="relative h-44 flex ml-10">
          <div className="absolute -left-10 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] font-black text-slate-300 pr-2 text-right">
            <span>{maxVal}</span>
            <span>{maxVal / 2}</span>
            <span>0</span>
          </div>
          <div className="flex-1 relative border-l border-slate-100">
            <div className="absolute top-0 left-0 w-full border-t border-slate-50" />
            <div className="absolute top-1/2 left-0 w-full border-t border-slate-50" />
            <div className="absolute bottom-0 left-0 w-full border-t border-slate-300" />
            {type === "words" && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-rose-200 z-10"
                style={{ bottom: `${(20 / maxVal) * 100}%` }}
              >
                <span
                  className="absolute -left-10 -top-2 text-[8px] font-black text-rose-400 px-1"
                  style={{ background: theme.bgColor }}
                >
                  GOAL
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-end justify-around px-2 gap-2">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="flex-1 h-full flex items-end group relative z-20"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-30">
                    {s[type]}
                    {type === "words" ? "語" : "分"}
                  </div>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-700 ${
                      type === "minutes" ? "bg-amber-400" : "bg-amber-400"
                    }`}
                    style={{
                      height: `${(s[type] / maxVal) * 100}%`,
                      minHeight: s[type] > 0 ? "4px" : "0",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ml-10 flex justify-around mt-6 px-2">
          {labels.map((l, i) => (
            <span
              key={i}
              className="flex-1 text-[9px] font-black text-slate-400 block -rotate-45 text-center"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const isLight = themeId === "light" || themeId === "simple" || themeId === "oriex";

  const NAV_ICONS = {
    stageMap: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 6c-1.6-1-4-1.4-7-1v13c3-0.4 5.4 0 7 1c1.6-1 4-1.4 7-1V5c-3-0.4-5.4 0-7 1z" fill={active ? color : "none"} stroke={active ? color : "currentColor"} strokeWidth={active ? 0 : 1.8} strokeLinejoin="round" opacity={active ? 1 : 0.7} />
        <path d="M12 6v13" stroke={active ? "rgba(0,0,0,0.2)" : "currentColor"} strokeWidth="1.6" opacity={active ? 1 : 0.7} />
      </svg>
    ),
    recordHub: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M6 3h9l4 4v14H6z" fill={active ? color : "none"} stroke={active ? color : "currentColor"} strokeWidth={active ? 0 : 1.8} strokeLinejoin="round" opacity={active ? 1 : 0.7} />
        <path d="M9 11h6M9 15h4" stroke={active ? "rgba(0,0,0,0.28)" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" opacity={active ? 1 : 0.7} />
      </svg>
    ),
    myPage: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={active ? color : "none"} stroke={active ? color : "currentColor"} strokeWidth={active ? 0 : 1.8} opacity={active ? 0.95 : 0.7} />
        <path d="M5 20a7 7 0 0 1 14 0" fill={active ? color : "none"} stroke={active ? color : "currentColor"} strokeWidth={active ? 0 : 1.8} strokeLinecap="round" opacity={active ? 0.95 : 0.7} />
      </svg>
    ),
    start: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          strokeLinejoin="round"
          opacity={active ? 1 : 0.7}
        />
        {active && (
          <path
            d="M9 21V16C9 15.45 9.45 15 10 15H14C14.55 15 15 15.45 15 16V21"
            fill="rgba(0,0,0,0.2)"
          />
        )}
      </svg>
    ),
    friendsList: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="9"
          cy="8"
          r="3.5"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          opacity={active ? 0.9 : 0.7}
        />
        <path
          d="M2 20C2 17.2 5.13 15 9 15C12.87 15 16 17.2 16 20"
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          fill="none"
          opacity={active ? 1 : 0.7}
        />
        <circle
          cx="17.5"
          cy="8"
          r="2.5"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          opacity={active ? 0.7 : 0.5}
        />
        <path
          d="M16 14.5C17 14.2 18.2 14 19.5 14C21.5 14 23 15.1 23 16.5"
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
          fill="none"
          opacity={active ? 0.8 : 0.5}
        />
      </svg>
    ),
    plaza: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 21h18M5 21V10l7-7 7 7v11"
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 1 : 0.7}
        />
        <rect
          x="9"
          y="14"
          width="6"
          height="7"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.6}
          opacity={active ? 0.7 : 0.6}
        />
        <rect
          x="5"
          y="12"
          width="4"
          height="4"
          rx="0.5"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.4}
          opacity={active ? 0.5 : 0.5}
        />
        <rect
          x="15"
          y="12"
          width="4"
          height="4"
          rx="0.5"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.4}
          opacity={active ? 0.5 : 0.5}
        />
      </svg>
    ),
    chat: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15C21 15.55 20.55 16 20 16H7L3 20V4C3 3.45 3.45 3 4 3H20C20.55 3 21 3.45 21 4V15Z"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          strokeLinejoin="round"
          opacity={active ? 1 : 0.7}
        />
        {active && (
          <>
            <line
              x1="8"
              y1="8"
              x2="16"
              y2="8"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="11.5"
              x2="13"
              y2="11.5"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    ),
    customApp: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7.5H20V19C20 19.55 19.55 20 19 20H5C4.45 20 4 19.55 4 19V7.5Z"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          strokeLinejoin="round"
          opacity={active ? 1 : 0.72}
        />
        <path
          d="M4 7.5L6.5 4H18.5L20 7.5M9 4L8 7.5M15 4L16 7.5"
          stroke={active ? (isLight ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.45)") : "currentColor"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 0.9 : 0.55}
        />
        <path
          d="M9 13H15M9 16H13"
          stroke={active ? (isLight ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.45)") : "currentColor"}
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity={active ? 0.95 : 0.55}
        />
      </svg>
    ),
    leaderboard: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3L13.8 8.2H19.2L14.7 11.4L16.5 16.6L12 13.4L7.5 16.6L9.3 11.4L4.8 8.2H10.2L12 3Z"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.6}
          strokeLinejoin="round"
          opacity={active ? 1 : 0.7}
        />
        {active && (
          <path
            d="M8 21V19M12 21V17M16 21V19"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        )}
      </svg>
    ),
    stats: ({ active, color }) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="14"
          width="4"
          height="7"
          rx="1"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          opacity={active ? 0.6 : 0.7}
        />
        <rect
          x="10"
          y="9"
          width="4"
          height="12"
          rx="1"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          opacity={active ? 0.8 : 0.7}
        />
        <rect
          x="17"
          y="4"
          width="4"
          height="17"
          rx="1"
          fill={active ? color : "none"}
          stroke={active ? color : "currentColor"}
          strokeWidth={active ? 0 : 1.8}
          opacity={active ? 1 : 0.7}
        />
      </svg>
    ),
  };

  useEffect(() => {
    if (screen !== "chat") return;
    const friendIds = new Set((friends || []).map((f) => f.uid || f.id).filter(Boolean));
    const ids = (bookLogs || [])
      .filter((log) => log.uid === (user?.uid || "local") || friendIds.has(log.uid))
      .map((log) => log.id || log.createdAt)
      .filter(Boolean);
    setReadTimelineLogIds(ids);
    localStorage.setItem("oritan_readTimelineLogs", JSON.stringify(ids));
  }, [screen, bookLogs, friends, user?.uid]);

  useEffect(() => {
    if (!user) return;
    if (!fb.enabled) {
      try {
        const saved = JSON.parse(localStorage.getItem("oritan_book_logs") || "[]");
        setBookLogs(Array.isArray(saved) ? saved : []);
      } catch {
        setBookLogs([]);
      }
      return;
    }
    const logsRef = collection(fb.db, "artifacts", fb.appId, "public", "data", "bookLogs");
    const q = query(logsRef, orderBy("createdAt", "desc"), limit(80));
    return onSnapshot(q, (snap) => setBookLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid, fb.enabled]);

  useEffect(() => {
    if (!user) return;
    if (!fb.enabled) {
      try {
        const saved = JSON.parse(localStorage.getItem("oritan_book_shelf") || "[]");
        setBookShelf(Array.isArray(saved) ? saved : []);
      } catch {
        setBookShelf([]);
      }
      return;
    }
    const shelfRef = collection(fb.db, "artifacts", fb.appId, "public", "data", "bookShelf");
    const q = query(shelfRef, orderBy("createdAt", "desc"), limit(120));
    return onSnapshot(q, (snap) => setBookShelf(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid, fb.enabled]);

  const saveBookShelfItem = async () => {
    const title = bookShelfForm.title.trim();
    if (!title) return showToast("\u53c2\u8003\u66f8\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", "error");
    const selectedShelfBook = (bookShelf || []).find((b) => b.uid === (user?.uid || "local") && b.title === title);
    const payload = {
      uid: user?.uid || "local",
      userName: profile?.name || "User",
      title,
      subject: bookShelfForm.subject || "\u672a\u5206\u985e",
      icon: bookShelfForm.icon || "\ud83d\udcd8",
      totalPages: Math.max(0, Number(bookShelfForm.totalPages) || 0),
      createdAt: new Date().toISOString(),
    };
    if (user && fb.enabled) await addDoc(collection(fb.db, "artifacts", fb.appId, "public", "data", "bookShelf"), payload);
    else {
      const next = [{ id: Date.now().toString(), ...payload }, ...bookShelf].slice(0, 120);
      setBookShelf(next);
      localStorage.setItem("oritan_book_shelf", JSON.stringify(next));
    }
    setBookShelfForm((f) => ({ ...f, title: "", totalPages: "" }));
    setBookShelfCreating(false);
    showToast("\u672c\u68da\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f");
  };

  const deleteBookShelfItem = async (book) => {
    if (!book) return;
    if (!window.confirm(`「${book.title}」を本棚から削除しますか？`)) return;
    const id = book.id;
    if (user && fb.enabled && id) {
      try { await deleteDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "bookShelf", id)); } catch (e: any) {}
    } else {
      const next = (bookShelf || []).filter((b) => (b.id || b.title) !== (book.id || book.title));
      setBookShelf(next);
      localStorage.setItem("oritan_book_shelf", JSON.stringify(next));
    }
    if (selectedBookForLog && (selectedBookForLog.id || selectedBookForLog.title) === (book.id || book.title)) setSelectedBookForLog(null);
    showToast("参考書を削除しました");
  };

  const selectShelfBookForLog = (book) => {
    setBookShelfCreating(false);
    setSelectedBookForLog(book);
    setBookLogForm((f) => ({
      ...f,
      bookTitle: book.title,
      subject: book.subject || f.subject,
      totalPages: String(book.totalPages || ""),
    }));
  };

  const saveBookLog = async () => {
    const title = bookLogForm.bookTitle.trim();
    if (!title) return showToast("\u53c2\u8003\u66f8\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", "error");
    const selectedShelfBook = (bookShelf || []).find((b) => b.uid === (user?.uid || "local") && b.title === title);
    const payload = {
      uid: user?.uid || "local",
      userName: profile?.name || "User",
      userAvatar: profile?.avatar || "",
      userColor: profile?.color || "bg-amber-500",
      isTeacher: !!profile?.isTeacher,
      bookTitle: title,
      bookIcon: selectedShelfBook?.icon || "\ud83d\udcd8",
      subject: bookLogForm.subject || "\u672a\u5206\u985e",
      minutes: Math.max(0, (Number(bookLogForm.hours) || 0) * 60 + (Number(bookLogForm.mins) || 0)),
      currentPage: Math.max(0, Number(bookLogForm.currentPage) || 0),
      totalPages: Math.max(0, Number(bookLogForm.totalPages) || 0),
      memo: bookLogForm.memo.trim(),
      teacherComment: "",
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    if (user && fb.enabled) await addDoc(collection(fb.db, "artifacts", fb.appId, "public", "data", "bookLogs"), payload);
    else {
      const next = [{ id: Date.now().toString(), ...payload }, ...bookLogs].slice(0, 80);
      setBookLogs(next);
      localStorage.setItem("oritan_book_logs", JSON.stringify(next));
    }
    setBookLogForm((f) => ({ ...f, hours: "1", mins: "0", currentPage: "", memo: "" }));
    showToast("\u53c2\u8003\u66f8\u30ed\u30b0\u3092\u8a18\u9332\u3057\u307e\u3057\u305f");
  };

  const likeBookLog = async (log) => {
    const uid = user?.uid || "local";
    if ((log.likedBy || []).includes(uid)) return;
    if (fb.enabled && log.id) await updateDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "bookLogs", log.id), { likedBy: arrayUnion(uid) });
    else {
      const next = bookLogs.map((x) => x.id === log.id ? { ...x, likedBy: [...(x.likedBy || []), uid] } : x);
      setBookLogs(next);
      localStorage.setItem("oritan_book_logs", JSON.stringify(next));
    }
  };

  const addBookLogComment = async (log) => {
    const text = window.prompt("\u30b3\u30e1\u30f3\u30c8\u3092\u5165\u529b");
    if (!text || !text.trim()) return;
    const comment = { uid: user?.uid || "local", name: profile?.name || "User", text: text.trim(), createdAt: new Date().toISOString() };
    if (fb.enabled && log.id) await updateDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "bookLogs", log.id), { comments: arrayUnion(comment) });
    else {
      const next = bookLogs.map((x) => x.id === log.id ? { ...x, comments: [...(x.comments || []), comment] } : x);
      setBookLogs(next);
      localStorage.setItem("oritan_book_logs", JSON.stringify(next));
    }
  };

  const saveTeacherComment = async (log, comment) => {
    if (!profile?.isTeacher || !log.id) return;
    if (fb.enabled) await updateDoc(doc(fb.db, "artifacts", fb.appId, "public", "data", "bookLogs", log.id), { teacherComment: comment, teacherName: profile?.name || "\u5148\u751f", checkedAt: new Date().toISOString() });
    else {
      const next = bookLogs.map((x) => x.id === log.id ? { ...x, teacherComment: comment, teacherName: profile?.name || "\u5148\u751f" } : x);
      setBookLogs(next);
      localStorage.setItem("oritan_book_logs", JSON.stringify(next));
    }
  };

  const BookLogScreen = () => {
    const isTimeline = screen === "chat";
    const myUid = user?.uid || "local";
    const logs = bookLogs || [];
    const myLogs = logs.filter((log) => log.uid === myUid);
    const myShelf = (bookShelf || []).filter((book) => book.uid === myUid);
    const friendIds = new Set((friends || []).map((f) => f.uid || f.id).filter(Boolean));
    const timelineLogs = logs.filter((log) => log.uid === myUid || friendIds.has(log.uid));
    const unreadTimelineCount = timelineLogs.filter((log) => !(readTimelineLogIds || []).includes(log.id || log.createdAt)).length;
    const selectedBook =
      !isTimeline &&
      (selectedBookForLog &&
        myShelf.find(
          (book) =>
            (book.id || book.title) ===
            (selectedBookForLog.id || selectedBookForLog.title)
        )) ||
      (!isTimeline ? selectedBookForLog : null);

    const L = {
      title: isTimeline ? "\u30bf\u30a4\u30e0\u30e9\u30a4\u30f3" : "\u53c2\u8003\u66f8\u30ed\u30b0",
      shelf: "\u672c\u68da",
      choose: "\u8a18\u9332\u3059\u308b\u53c2\u8003\u66f8\u3092\u9078\u3076",
      addBook: "\u53c2\u8003\u66f8\u3092\u8ffd\u52a0",
      createBook: "\u65b0\u3057\u3044\u53c2\u8003\u66f8",
      chat: "\u30c1\u30e3\u30c3\u30c8",
      friendTimeline: "\u30d5\u30ec\u30f3\u30c9\u306e\u8a18\u9332",
      unread: "\u672a\u78ba\u8a8d",
      bookName: "\u53c2\u8003\u66f8\u540d",
      subject: "\u79d1\u76ee",
      totalPage: "\u30da\u30fc\u30b8\u6570",
      photo: "\u5199\u771f",
      today: "\u4eca\u65e5",
      total: "\u7d2f\u8a08",
      minutes: "\u52c9\u5f37\u6642\u9593",
      currentPage: "\u4eca\u306e\u30da\u30fc\u30b8",
      memo: "\u30e1\u30e2",
      memoPlaceholder: "\u4eca\u65e5\u3084\u3063\u305f\u5185\u5bb9\u30fb\u56f0\u3063\u305f\u3053\u3068",
      save: "\u8a18\u9332\u3059\u308b",
      record: "\u8a18\u9332\u3092\u8ffd\u52a0",
      backShelf: "\u672c\u68da\u306b\u623b\u308b",
      everyoneRecords: "\u307f\u3093\u306a\u306e\u8a18\u9332",
      recentRecords: "\u6700\u8fd1\u306e\u8a18\u9332",
      studentRecords: "\u751f\u5f92\u306e\u8a18\u9332",
      empty: "\u307e\u3060\u8a18\u9332\u304c\u3042\u308a\u307e\u305b\u3093",
      emptyShelf: "\u307e\u3060\u672c\u68da\u306b\u53c2\u8003\u66f8\u304c\u3042\u308a\u307e\u305b\u3093",
      teacherComment: "\u5148\u751f\u30b3\u30e1\u30f3\u30c8",
      comment: "\u30b3\u30e1\u30f3\u30c8",
      noCategory: "\u672a\u5206\u985e",
      subjects: ["\u82f1\u8a9e", "\u6570\u5b66", "\u56fd\u8a9e", "\u7406\u79d1", "\u793e\u4f1a", "\u5c0f\u8ad6\u6587", "\u305d\u306e\u4ed6"],
      icons: ["\ud83d\udcd8", "\ud83d\udcd5", "\ud83d\udcd7", "\ud83d\udcd9", "\ud83d\udcd3", "\ud83d\udcd4", "\ud83d\udcda", "\u270f\ufe0f"],
    };

    const cardBg = isLight ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.07)";
    const line = isLight ? "rgba(20,20,35,0.14)" : "rgba(255,255,255,0.12)";
    const muted = isLight ? "rgba(20,20,35,0.58)" : "rgba(255,255,255,0.58)";
    const fieldStyle = {
      width: "100%",
      borderRadius: 28,
      border: "1.5px solid " + line,
      background: isLight ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.08)",
      color: theme.text,
      padding: "15px 14px",
      outline: "none",
      fontWeight: 850,
      fontSize: 16,
    };
    const labelStyle = { fontSize: 11, color: muted, fontWeight: 950 };
    const primaryButton = {
      borderRadius: 18,
      padding: "16px 18px",
      background: "linear-gradient(135deg,#14b8a6,#0f766e)",
      color: "white",
      fontWeight: 950,
      fontSize: 16,
      boxShadow: "0 10px 24px rgba(20,184,166,0.22)",
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayMinutes = myLogs
      .filter((log) => String(log.createdAt || "").slice(0, 10) === todayKey)
      .reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);
    const totalMinutes = myLogs.reduce(
      (sum, log) => sum + (Number(log.minutes) || 0),
      0
    );

    const getBookProgress = (book) => {
      const related = logs.filter(
        (log) => log.uid === book.uid && log.bookTitle === book.title
      );
      const latestPage = related.reduce(
        (max, log) => Math.max(max, Number(log.currentPage) || 0),
        0
      );
      const totalPages =
        Number(book.totalPages) ||
        related.reduce(
          (max, log) => Math.max(max, Number(log.totalPages) || 0),
          0
        );
      const minutes = related.reduce(
        (sum, log) => sum + (Number(log.minutes) || 0),
        0
      );
      const pct = totalPages
        ? Math.min(100, Math.round((latestPage / totalPages) * 100))
        : 0;
      return { latestPage, totalPages, minutes, pct };
    };

    const renderBookIcon = (icon, size = 26) =>
      String(icon || "").startsWith("data:") ||
      String(icon || "").startsWith("http") ? (
        <img
          src={icon}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: size }}>{icon || "\ud83d\udcd8"}</span>
      );

    const renderUserAvatar = (log) => {
      const info = allUsersMap?.[log.uid] || {};
      const avatar = log.userAvatar || info.avatar || "";
      const color = log.userColor || info.color || "bg-amber-500";
      if (String(avatar).startsWith("data:") || String(avatar).startsWith("http")) {
        return <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
      }
      const Av = AVATAR_ICONS[avatar];
      return Av ? <Av size={22} color="currentColor" /> : <span style={{ fontSize: 20 }}>{avatar || "\ud83d\udc64"}</span>;
    };

    const userAvatarFrame = (log) => {
      const info = allUsersMap?.[log.uid] || {};
      const color = log.userColor || info.color || "bg-amber-500";
      return color;
    };

    const renderProgress = (p) => (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            fontWeight: 900,
            color: muted,
          }}
        >
          <span>{p.latestPage}/{p.totalPages || "?"}p</span>
          <span>{p.pct}%</span>
        </div>
        <div
          style={{
            height: 9,
            borderRadius: 99,
            background: isLight ? "rgba(20,20,35,0.08)" : "rgba(255,255,255,0.10)",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <div
            style={{
              height: "100%",
              width: p.pct + "%",
              background: "linear-gradient(90deg,#14b8a6,#5eead4)",
              borderRadius: 99,
            }}
          />
        </div>
      </div>
    );

    const renderLogList = (recordList, heading) => (
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 950, color: theme.text }}>
          {heading}
        </h3>
        {recordList.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              padding: 22,
              background: cardBg,
              border: "1px solid " + line,
              color: muted,
              fontWeight: 850,
            }}
          >
            {L.empty}
          </div>
        ) : (
          recordList.map((log) => {
            const liked = (log.likedBy || []).includes(myUid);
            const pct = Number(log.totalPages)
              ? Math.min(
                  100,
                  Math.round(
                    ((Number(log.currentPage) || 0) / Number(log.totalPages)) * 100
                  )
                )
              : 0;
            return (
              <article
                key={log.id || log.createdAt}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  background: cardBg,
                  border: "1px solid " + line,
                  boxShadow: !(readTimelineLogIds || []).includes(log.id || log.createdAt) ? "inset 4px 0 0 #14b8a6" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span
                    className={userAvatarFrame(log)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                    }}
                  >
                    {renderUserAvatar(log)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: muted, fontWeight: 900 }}>
                      {log.userName || "User"} / {String(log.createdAt || "").slice(5, 16).replace("T", " ")}
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      <span style={{ width: 26, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#67e8f9,#14b8a6)", overflow: "hidden", flexShrink: 0 }}>
                        {renderBookIcon(log.bookIcon, 17)}
                      </span>
                      <p
                        style={{
                          fontSize: 17,
                          fontWeight: 950,
                          color: theme.text,
                          lineHeight: 1.25,
                          wordBreak: "break-word",
                        }}
                      >
                        {log.bookTitle}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: muted,
                    fontWeight: 900,
                    gap: 10,
                  }}
                >
                  <span>{log.minutes || 0}{"\u5206"}</span>
                  <span>{log.currentPage || 0}/{log.totalPages || "?"}p / {pct}%</span>
                </div>
                {log.memo && (
                  <p
                    style={{
                      fontSize: 14,
                      color: theme.text,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {log.memo}
                  </p>
                )}
                {log.teacherComment && (
                  <div
                    style={{
                      borderRadius: 14,
                      padding: 11,
                      background: isLight
                        ? "rgba(20,184,166,0.08)"
                        : "rgba(20,184,166,0.14)",
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {L.teacherComment}: {log.teacherComment}
                  </div>
                )}
                {profile?.isTeacher && (
                  <textarea
                    defaultValue={log.teacherComment || ""}
                    placeholder={L.teacherComment}
                    onBlur={(e) => saveTeacherComment(log, e.target.value.trim())}
                    style={{ ...fieldStyle, minHeight: 72, fontSize: 14 }}
                  />
                )}
                {(log.comments || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(log.comments || []).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: theme.text,
                          background: isLight
                            ? "rgba(20,20,35,0.05)"
                            : "rgba(255,255,255,0.07)",
                          borderRadius: 11,
                          padding: "8px 10px",
                        }}
                      >
                        <b>{c.name || "User"}</b> {c.text}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => addBookLogComment(log)}
                    style={{
                      borderRadius: 999,
                      padding: "8px 13px",
                      background: "transparent",
                      border: "1px solid " + line,
                      color: muted,
                      fontWeight: 900,
                    }}
                  >
                    {L.comment}
                  </button>
                  <button
                    onClick={() => likeBookLog(log)}
                    disabled={liked}
                    style={{
                      borderRadius: 999,
                      padding: "8px 13px",
                      background: liked ? "rgba(20,184,166,0.16)" : "transparent",
                      border: "1px solid " + line,
                      color: liked ? "#0f766e" : muted,
                      fontWeight: 900,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <IcThumbsUp size={14} color="currentColor" />
                    {(log.likedBy || []).length}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    );

    if (isTimeline) {
      return (
        <div
          className="animate-in fade-in"
          style={{
            paddingBottom: "calc(var(--nav-height, 100px) + 18px)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div className="flex items-center gap-3">
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 900, color: "#14b8a6", textTransform: "uppercase" }}>
                Timeline
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 950, lineHeight: 1, color: theme.text }}>
                {L.title}
              </h2>
              {unreadTimelineCount > 0 && <p style={{ marginTop: 8, display: "inline-flex", borderRadius: 999, padding: "6px 10px", background: "rgba(20,184,166,0.12)", color: "#0f766e", fontSize: 12, fontWeight: 950 }}>{L.unread} {unreadTimelineCount}</p>}
            </div>
          </div>
          {renderLogList(timelineLogs, L.friendTimeline)}
        </div>
      );
    }

    return (
      <div
        className="animate-in fade-in"
        style={{
          paddingBottom: "calc(var(--nav-height, 100px) + 18px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => bookShelfCreating ? setBookShelfCreating(false) : selectedBook ? setSelectedBookForLog(null) : setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}
            className="p-2 rounded-[12px] active:opacity-70 transition-all"
            style={{
              background: isLight ? "rgba(20,20,35,0.06)" : "rgba(255,255,255,0.08)",
              border: "1px solid " + line,
            }}
          >
            <ChevronLeft size={20} style={{ color: theme.text }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 900, color: "#14b8a6", textTransform: "uppercase" }}>
              Study Log
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.1, color: theme.text, wordBreak: "break-word" }}>
              {selectedBook ? selectedBook.title : L.title}
            </h2>
          </div>
        </div>

        {!selectedBook && !profile?.isTeacher && (
          <div style={{ display: "flex", gap: 8 }}>
            {[{ k: "log", t: "勉強時間記録" }, { k: "shelf", t: "参考書" }].map((tb) => (
              <button key={tb.k} onClick={() => { setBookLogTab(tb.k); setBookShelfCreating(false); setSelectedBookForLog(null); }} style={{ flex: 1, padding: "11px 8px", borderRadius: 14, fontWeight: 950, fontSize: 13, cursor: "pointer", border: bookLogTab === tb.k ? "none" : "1px solid " + line, background: bookLogTab === tb.k ? "linear-gradient(135deg,#14b8a6,#0f766e)" : cardBg, color: bookLogTab === tb.k ? "#fff" : theme.text }}>{tb.t}</button>
            ))}
          </div>
        )}

        {!selectedBook && !bookShelfCreating && bookLogTab === "log" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: L.today, value: todayMinutes },
              { label: L.total, value: totalMinutes },
            ].map((x) => (
              <div
                key={x.label}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  background: cardBg,
                  border: "1px solid " + line,
                }}
              >
                <p style={{ fontSize: 11, color: muted, fontWeight: 900 }}>{x.label}</p>
                <p style={{ fontSize: 27, fontWeight: 950, color: theme.text }}>
                  {Math.floor(x.value / 60)}h {x.value % 60}m
                </p>
              </div>
            ))}
          </div>
        )}

        {!selectedBook && !profile?.isTeacher && !bookShelfCreating && bookLogTab === "shelf" && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setBookShelfCreating(true)}
              style={{
                borderRadius: 999,
                padding: "13px 18px",
                background: isLight ? "linear-gradient(135deg,#101827,#0f766e)" : "rgba(255,255,255,0.92)",
                color: isLight ? "white" : "#101827",
                fontWeight: 950,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: isLight ? "0 12px 28px rgba(15,118,110,0.22)" : "none",
              }}
            >
              <Plus size={18} />{L.createBook}
            </button>
          </div>
        )}

        {!selectedBook && !profile?.isTeacher && bookShelfCreating && (
          <section
            style={{
              borderRadius: 30,
              padding: 16,
              background: cardBg,
              border: "1px solid " + line,
              display: "flex",
              flexDirection: "column",
              gap: 13,
            }}
          >
            <div>
              <p style={{ fontSize: 11, color: muted, fontWeight: 900 }}>Create</p>
              <h3 style={{ fontSize: 22, fontWeight: 950, color: theme.text }}>{L.createBook}</h3>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>{L.bookName}</span>
              <input
                placeholder={L.bookName}
                value={bookShelfForm.title}
                onChange={(e) => setBookShelfForm((f) => ({ ...f, title: e.target.value }))}
                style={{ ...fieldStyle, minHeight: 56, fontSize: 18 }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 9 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>{L.subject}</span>
                <select
                  value={bookShelfForm.subject}
                  onChange={(e) => setBookShelfForm((f) => ({ ...f, subject: e.target.value }))}
                  style={fieldStyle}
                >
                  {L.subjects.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>{L.totalPage}</span>
                <input
                  inputMode="numeric"
                  placeholder="300"
                  value={bookShelfForm.totalPages}
                  onChange={(e) => setBookShelfForm((f) => ({ ...f, totalPages: e.target.value }))}
                  style={fieldStyle}
                />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {L.icons.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setBookShelfForm((f) => ({ ...f, icon: ic }))}
                  style={{
                    height: 44,
                    borderRadius: 13,
                    border: "1px solid " + (bookShelfForm.icon === ic ? "#14b8a6" : line),
                    background: bookShelfForm.icon === ic ? "rgba(20,184,166,0.14)" : "transparent",
                    fontSize: 20,
                  }}
                >
                  {ic}
                </button>
              ))}
              <label
                style={{
                  height: 44,
                  borderRadius: 13,
                  border: "1px solid " + line,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 950,
                  color: muted,
                  overflow: "hidden",
                }}
              >
                {L.photo}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const data = await compressImage(file, 360, 0.72);
                    setBookShelfForm((f) => ({ ...f, icon: data }));
                  }}
                />
              </label>
            </div>
            <button
              onClick={saveBookShelfItem}
              className="active:scale-[0.98] transition-transform"
              style={{ ...primaryButton, background: isLight ? "#101827" : "rgba(255,255,255,0.92)", color: isLight ? "white" : "#101827" }}
            >
              {L.addBook}
            </button>
          </section>
        )}

        {!selectedBook && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: muted, fontWeight: 900 }}>{L.shelf}</p>
              <h3 style={{ fontSize: 18, fontWeight: 950, color: theme.text }}>{bookLogTab === "shelf" ? "参考書の管理" : L.choose}</h3>
            </div>
            {myShelf.length === 0 ? (
              <div style={{ borderRadius: 20, padding: 22, background: cardBg, border: "1px solid " + line, color: muted, fontWeight: 850 }}>
                {L.emptyShelf}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myShelf.map((book) => {
                  const p = getBookProgress(book);
                  return (
                    <div
                      key={book.id || book.title}
                      onClick={bookLogTab === "shelf" ? undefined : () => selectShelfBookForLog(book)}
                      className="active:scale-[0.99] transition-transform"
                      style={{
                        borderRadius: 20,
                        padding: 14,
                        background: cardBg,
                        border: "1px solid " + line,
                        textAlign: "left",
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        cursor: bookLogTab === "shelf" ? "default" : "pointer",
                      }}
                    >
                      <span style={{ width: 48, height: 62, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#14b8a6,#0f766e)", overflow: "hidden", flexShrink: 0 }}>
                        {renderBookIcon(book.icon, 27)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: "#14b8a6", fontWeight: 950 }}>{book.subject || L.noCategory}</p>
                        <p style={{ fontSize: 17, fontWeight: 950, color: theme.text, lineHeight: 1.25, wordBreak: "break-word" }}>{book.title}</p>
                        <div style={{ marginTop: 9 }}>{renderProgress(p)}</div>
                      </div>
                      {bookLogTab === "shelf" ? (
                        <button onClick={(e) => { e.stopPropagation(); deleteBookShelfItem(book); }} style={{ flexShrink: 0, padding: 9, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#e3574e", cursor: "pointer" }}><Trash2 size={18} /></button>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" /></svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedBook && !profile?.isTeacher && (() => {
          const p = getBookProgress(selectedBook);
          const relatedLogs = logs.filter(
            (log) => log.uid === myUid && log.bookTitle === selectedBook.title
          );
          return (
            <>
              <section style={{ borderRadius: 30, padding: 16, background: cardBg, border: "1px solid " + line, display: "flex", gap: 13, alignItems: "center" }}>
                <span style={{ width: 58, height: 74, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#14b8a6,#0f766e)", overflow: "hidden", flexShrink: 0 }}>
                  {renderBookIcon(selectedBook.icon, 32)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: "#14b8a6", fontWeight: 950 }}>{selectedBook.subject || L.noCategory}</p>
                  <p style={{ fontSize: 19, fontWeight: 950, color: theme.text, lineHeight: 1.25, wordBreak: "break-word" }}>{selectedBook.title}</p>
                  <div style={{ marginTop: 10 }}>{renderProgress(p)}</div>
                  <p style={{ marginTop: 7, fontSize: 11, color: muted, fontWeight: 850 }}>
                    {Math.floor(p.minutes / 60)}h {p.minutes % 60}m
                  </p>
                </div>
              </section>

              <section style={{ borderRadius: 30, padding: 16, background: cardBg, border: "1px solid " + line, display: "flex", flexDirection: "column", gap: 13 }}>
                <h3 style={{ fontSize: 18, fontWeight: 950, color: theme.text }}>{L.record}</h3>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>勉強時間</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      inputMode="numeric"
                      placeholder="1"
                      value={bookLogForm.hours}
                      onChange={(e) => setBookLogForm((f) => ({ ...f, hours: e.target.value }))}
                      style={{ ...fieldStyle, minHeight: 56, fontSize: 19, flex: 1, textAlign: "center" }}
                    />
                    <span style={{ fontWeight: 950, color: theme.text, fontSize: 15 }}>時間</span>
                    <input
                      inputMode="numeric"
                      placeholder="30"
                      value={bookLogForm.mins}
                      onChange={(e) => setBookLogForm((f) => ({ ...f, mins: e.target.value }))}
                      style={{ ...fieldStyle, minHeight: 56, fontSize: 19, flex: 1, textAlign: "center" }}
                    />
                    <span style={{ fontWeight: 950, color: theme.text, fontSize: 15 }}>分</span>
                  </div>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>{L.currentPage}</span>
                  <input
                    inputMode="numeric"
                    placeholder="120"
                    value={bookLogForm.currentPage}
                    onChange={(e) => setBookLogForm((f) => ({ ...f, currentPage: e.target.value }))}
                    style={{ ...fieldStyle, minHeight: 56, fontSize: 19 }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>{L.memo}</span>
                  <textarea
                    placeholder={L.memoPlaceholder}
                    value={bookLogForm.memo}
                    onChange={(e) => setBookLogForm((f) => ({ ...f, memo: e.target.value }))}
                    style={{ ...fieldStyle, minHeight: 128, resize: "vertical", lineHeight: 1.65, fontSize: 15 }}
                  />
                </label>
                <button
                  onClick={saveBookLog}
                  className="active:scale-[0.98] transition-transform"
                  style={primaryButton}
                >
                  {L.save}
                </button>
              </section>
              {renderLogList(relatedLogs, L.recentRecords)}
            </>
          );
        })()}

        {!selectedBook && !bookShelfCreating && bookLogTab === "log" && renderLogList(profile?.isTeacher ? logs : myLogs, profile?.isTeacher ? L.studentRecords : L.recentRecords)}
      </div>
    );
  };

  const Nav = () => {
    const activePetId = (profile?.ownedPets || [])[0] || "bearcat";
    const petName =
      profile?.petNames?.[activePetId] ||
      SHOP_PETS.find((p) => p.id === activePetId)?.name ||
      "ペット";
    const PetIcon = PET_ICONS[activePetId] || IcPet;
    const catKey = gameCategory || "英単語";
    const currentUnlocked = (profile?.unlockedStages || {})[catKey] || 1;
    const totalExp = profile?.totalExp || 0;

    const menuItems = [
      {
        id: "stageMap",
        label: "ステージ",
        SvgIcon: IcMap,
        grad: ["#ff8a6a", "#f2603f"],
        shadow: "#ff7a59",
      },
      {
        id: "wordbook",
        label: "単語帳",
        SvgIcon: IcBook,
        grad: ["#f7b955", "#e69521"],
        shadow: "#eba230",
      },
      {
        id: "review",
        label: "復習",
        SvgIcon: IcBook,
        grad: ["#86c193", "#5e9e72"],
        shadow: "#6fae82",
      },
      {
        id: "customApp",
        label: "配信",
        SvgIcon: IcGift,
        grad: ["#f08d80", "#dd6a5c"],
        shadow: "#e57b6d",
      },
      {
        id: "petRoom",
        label: "育成",
        SvgIcon: IcPet,
        grad: ["#f472b6", "#db2777"],
        shadow: "#ec4899",
      },
      {
        id: "petShop",
        label: "ショップ",
        SvgIcon: IcShop,
        grad: ["#fbbf24", "#d97706"],
        shadow: "#f59e0b",
      },
      {
        id: "tweetApp",
        label: "つぶやき",
        SvgIcon: IcTweetApp,
        grad: ["#60a5fa", "#2563eb"],
        shadow: "#3b82f6",
      },
      {
        id: "achievements",
        label: "実績",
        SvgIcon: IcStar2,
        grad: ["#c084fc", "#7c3aed"],
        shadow: "#9333ea",
      },
      {
        id: "announcementsList",
        label: "お知らせ",
        SvgIcon: IcMegaphone,
        grad: ["#b99bd8", "#9a78c4"],
        shadow: "#a988cf",
      },
      {
        id: "factoryApp",
        label: "FACTORY",
        SvgIcon: IcFactory,
        grad: ["#eba36a", "#d4823f"],
        shadow: "#df9255",
      },
      {
        id: "friendsList",
        label: "フレンド",
        SvgIcon: Users,
        grad: ["#e8989b", "#d4757a"],
        shadow: "#de868a",
      },
      {
        id: "settingsApp",
        label: "設定",
        SvgIcon: IcSettings2,
        grad: ["#b8a99a", "#8f7d6c"],
        shadow: "#a3917f",
      },
    ];

    const navTabs = [
      { id: "start", label: "ホーム", match: ["start","weeklyPlan","teacherCheck"] },
      { id: "stageMap", label: "学習", match: ["stageMap","review","wordbook","customApp","play","result","modeSelect"] },
      { id: "recordHub", label: "記録", match: ["recordHub","attendanceStamp","scheduleCalendar","bookLogApp","studyDiaryApp","noteApp"] },
      { id: "plaza", label: "ひろば", match: ["plaza","chat","dm","friendsList","announcementsList","stats","factoryApp","friendProfile","recordsTimeline"] },
      { id: "myPage", label: "マイ", match: ["myPage","profileEdit","settingsApp","weeklyTaskAdmin"] },
    ];

    return (
      <>
        {/* ドロワーオーバーレイ */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
        )}

        {/* ドロワーパネル */}
        <div
          style={{
            position: "fixed",
            left: 12,
            top: menuOpen ? "calc(env(safe-area-inset-top, 0px) + 90px)" : -420,
            width: 234,
            zIndex: 210,
            transition: "top 0.38s cubic-bezier(0.34,1.1,0.64,1)",
            background: isLight
              ? "rgba(251,248,243,0.99)"
              : "rgba(10,12,22,0.98)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: "0 0 24px 24px",
            border: isLight
              ? "1px solid rgba(0,0,0,0.10)"
              : `1px solid ${theme.accent}30`,
            borderTop: "none",
            boxShadow: isLight
              ? "0 8px 40px rgba(0,0,0,0.12)"
              : `0 8px 40px rgba(0,0,0,0.7), 0 0 0 0.5px ${theme.accent}20`,
            padding: "12px 12px 16px",
          }}
        >
          {/* ドロワーハンドル非表示 */}
          {/* タイトル */}
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: `${theme.accent}99`,
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            MENU
          </p>
          {/* アプリグリッド */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {menuItems.filter((app) => !["petRoom", "petShop", "achievements", "tweetApp"].includes(app.id)).map((app) => {
              const [c1, c2] = app.grad;
              const Ic = app.SvgIcon || IcPet;
              return (
                <button
                  key={app.id}
                  onClick={() => {
                    if (app.id === "wordbook") {
                      setWordbookStage(null);
                      setWordbookTab("stage");
                    }
                    setPrevScreen(screen);
                    setScreen(app.id);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: `linear-gradient(145deg,${c1},${c2})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 4px 16px ${app.shadow}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "45%",
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,0.22) 0%,transparent 100%)",
                        borderRadius: "14px 14px 0 0",
                      }}
                    />
                    <Ic size={24} color="rgba(255,255,255,0.97)" />
                  </div>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: isLight
                        ? "rgba(20,10,60,0.80)"
                        : "rgba(220,235,255,0.82)",
                      textAlign: "center",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {app.label}
                  </p>
                </button>
              );
            })}
          </div>
          <div style={{ height: 16 }} />
        </div>

        {/* リルナビバー（ハンバーガー使用画面のみ） */}
        {["start", "stageMap", "review", "wordbook", "customApp", "recordHub", "attendanceStamp", "scheduleCalendar", "bookLogApp", "studyDiaryApp", "noteApp", "plaza", "chat", "friendsList", "announcementsList", "stats", "factoryApp", "friendProfile", "myPage", "settingsApp", "weeklyTaskAdmin", "weeklyPlan", "recordsTimeline", "teacherCheck"].includes(
          screen
        ) && (
          <div
            className="shrink-0"
            style={{
              paddingBottom: 8,
              position: "fixed",
              bottom: "calc(env(safe-area-inset-bottom, 0px) * 0.3 + 8px)",
              left: 12,
              right: 12,
              width: "calc(100% - 24px)",
              maxWidth: "552px",
              margin: "0 auto",
              zIndex: 300,
              borderRadius: 999,
              background: isLight
                ? "rgba(255,255,255,0.88)"
                : "rgba(8,10,18,0.84)",
              backdropFilter: "blur(30px) saturate(1.35)",
              WebkitBackdropFilter: "blur(30px) saturate(1.35)",
              border: isLight
                ? "1px solid rgba(15,23,42,0.10)"
                : "1px solid rgba(255,255,255,0.10)",
              boxShadow: isLight
                ? "0 18px 44px rgba(15,23,42,0.16)"
                : "0 18px 44px rgba(0,0,0,0.48)",
              opacity: navReady ? 1 : 0,
              pointerEvents: navReady ? "auto" : "none",
              transition: "opacity 0.15s ease",
            }}
          >
            {/* アクセントライン */}
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                paddingInline: 8,
                paddingTop: 8,
                paddingBottom: 0,
              }}
            >
              {/* 左: タブリスト */}
              <div style={{ display: "flex", flex: 1 }}>
                {navTabs.map((item) => {
                  const isActive = (item.match || [item.id]).includes(screen);
                  const unreadAnnouncementsCount = announcements.filter(
                    (a) => !readAnnouncementIds.includes(a.id)
                  ).length;
                  const badge =
                    item.id === "chat"
                      ? unreadChat
                      : item.id === "start"
                      ? Object.values(unreadDm).reduce((a, b) => a + b, 0) +
                        unreadAnnouncementsCount
                      : 0;
                  const IconComp = NAV_ICONS[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setScreen(item.id);
                        setMenuOpen(false);
                        if (mainRef.current) mainRef.current.scrollTop = 0;
                        if (item.id === "chat")
                          setTimeout(
                            () =>
                              chatEndRef.current?.scrollIntoView({
                                behavior: "instant",
                              }),
                            50
                          );
                      }}
                      className="relative flex flex-col items-center justify-center transition-all"
                      style={{
                        flex: 1,
                        minHeight: 48,
                        gap: 2,
                        paddingTop: 7,
                        paddingBottom: 6,
                        borderRadius: 999,
                        color: isActive
                          ? theme.accent
                          : isLight
                          ? "rgba(20,10,60,0.35)"
                          : "rgba(255,255,255,0.30)",
                        background: isActive
                          ? isLight
                            ? "rgba(15,23,42,0.08)"
                            : "rgba(255,255,255,0.10)"
                          : "transparent",
                        border: "none",
                        cursor: "pointer",
                        transform: isActive
                          ? "translateY(-1px)"
                          : "translateY(0)",
                        transition: "all 0.18s cubic-bezier(0.25,0.8,0.25,1)",
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 3,
                            borderRadius: 999,
                            background: isLight
                              ? `linear-gradient(135deg, ${theme.accent}18, rgba(255,255,255,0.55))`
                              : `linear-gradient(135deg, ${theme.accent}28, rgba(255,255,255,0.08))`,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <IconComp
                          active={isActive}
                          color={isActive ? (isLight ? "#050505" : "#ffffff") : theme.accent}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: isActive ? 700 : 500,
                          letterSpacing: isActive ? "0.06em" : "0.02em",
                          color: isActive
                            ? isLight
                              ? "#050505"
                              : "#ffffff"
                            : "inherit",
                          opacity: isActive ? 1 : 0.62,
                          position: "relative",
                          zIndex: 1,
                          marginBottom: 2,
                          textTransform: isActive ? "uppercase" : "none",
                        }}
                      >
                        {item.label}
                      </span>
                      {badge > 0 && (
                        <span
                          className="absolute"
                          style={{
                            top: 6,
                            right: 8,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #ff4d6d, #c9184a)",
                            border:
                              "1.5px solid " +
                              (isLight ? "#f0f4ff" : "#0f0c29"),
                            boxShadow: "0 1px 6px rgba(255,77,109,0.6)",
                            zIndex: 2,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ハンバーガーはヘッダーに移動済み */}
            </div>
          </div>
        )}
      </>
    );
  };

  if (screen === "loading")
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.bg,
          zIndex: 9999,
        }}
      >
        <span
          className="animate-pulse font-black text-xl"
          style={{
            color: theme.accent,
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            right: 24,
            whiteSpace: "nowrap",
          }}
        >
          Loading...
        </span>
      </div>
    );

  // ─── スワイプエントリー画面 ───────────────────────────────────────
  if (screen === "swipeEntry")
    return (
      <SwipeEntryScreen
        theme={theme}
        isLight={isLight}
        onComplete={() => setScreen("start")}
      />
    );

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          display: "flex",
          justifyContent: "center",
          background: theme.bg,
          pointerEvents: "auto",
        }}
      >
        {/* 実績解除通知 */}

        {/* ペット名前入力モーダル */}

        {toast && (
          <div
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 16px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              pointerEvents: "none",
              background:
                toast.type === "error"
                  ? "rgba(239,68,68,0.95)"
                  : "rgba(16,185,129,0.95)",
              backdropFilter: "blur(12px)",
              padding: "12px 20px",
              borderRadius: "999px",
              color: "white",
              fontWeight: "800",
              fontSize: "13px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {toast.type === "error" ? (
              <IcAlert size={14} color="currentColor" />
            ) : (
              <IcCheckSm size={14} color="currentColor" />
            )}{" "}
            {toast.msg}
          </div>
        )}
        {/* ── 背景装飾: ボケた光の重なり ── */}
        <style>{`
        @keyframes ui-orb-a {
          0%,100%{transform:translate(0,0) scale(1);}
          40%{transform:translate(12px,-18px) scale(1.04);}
          70%{transform:translate(-8px,12px) scale(1.03);}
        }
        @keyframes ui-orb-b {
          0%,100%{transform:translate(0,0) scale(1);}
          50%{transform:translate(-15px,20px) scale(1.06);}
        }
        @keyframes ui-orb-c {
          0%,100%{transform:translate(0,0) scale(1);}
          45%{transform:translate(10px,-8px) scale(1.04);}
        }
      `}</style>
        <div
          style={{
            position: "absolute",
            top: "-15%",
            right: "-10%",
            width: "80vw",
            height: "80vw",
            maxWidth: "400px",
            maxHeight: "400px",
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${theme.orb1} 0%, transparent 70%)`,
            filter: "blur(40px)",
            pointerEvents: "none",
            animation: "ui-orb-a 12s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "-15%",
            width: "70vw",
            height: "70vw",
            maxWidth: "340px",
            maxHeight: "340px",
            borderRadius: "50%",
            background: `radial-gradient(circle at 60% 60%, ${theme.orb2} 0%, transparent 70%)`,
            filter: "blur(50px)",
            pointerEvents: "none",
            animation: "ui-orb-b 15s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "20%",
            width: "55vw",
            height: "55vw",
            maxWidth: "260px",
            maxHeight: "260px",
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, ${
              theme.orb3 || theme.orb1
            } 0%, transparent 70%)`,
            filter: "blur(60px)",
            pointerEvents: "none",
            opacity: 0.65,
            animation: "ui-orb-c 18s ease-in-out infinite",
          }}
        />
        {/* ドットグリッド */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(${
              theme.dotColor || "rgba(255,255,255,0.03)"
            } 1.2px, transparent 1.2px)`,
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          }}
        />

        <div
          className="font-sans text-left"
          style={{
            width: "100%",
            maxWidth: "576px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            background: "transparent",
            position: "relative",
            zIndex: 1,
            color: theme.text,
          }}
          data-theme={themeId}
        >
          {screen === "login" && (
            <div
              className="animate-in fade-in"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
                paddingLeft: 28,
                paddingRight: 28,
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
              }}
            >
              <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
              @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap');
              .oritan-letter {
                display: inline-block;
                font-family: 'Cinzel', 'Times New Roman', serif;
                font-weight: 700;
                font-size: 3.2rem;
                line-height: 1;
              }
              /* Safe Area: CSSのenv()のみで制御。JSによる上書きなし */
              :root {
                --sab: env(safe-area-inset-bottom, 0px);
                --sat: env(safe-area-inset-top, 0px);
                --nav-height: calc(64px + env(safe-area-inset-bottom, 0px));
              }
              @supports (padding: env(safe-area-inset-bottom)) {
                :root {
                  --sab: env(safe-area-inset-bottom);
                  --sat: env(safe-area-inset-top);
                  --nav-height: calc(64px + env(safe-area-inset-bottom));
                }
              }
            `}</style>
              {(() => {
                const lC = isLight ? "rgba(20,15,60,0.88)" : "#ffffff";
                const lM = isLight
                  ? "rgba(20,15,60,0.42)"
                  : "rgba(255,255,255,0.45)";
                const lB = isLight
                  ? "rgba(255,255,255,0.82)"
                  : "rgba(255,255,255,0.07)";
                const lBd = isLight
                  ? "1.5px solid rgba(20,15,60,0.14)"
                  : "1px solid rgba(255,255,255,0.14)";
                const lCard = isLight
                  ? "rgba(255,255,255,0.72)"
                  : "rgba(255,255,255,0.055)";
                const lCardBd = isLight
                  ? "1.5px solid rgba(20,15,60,0.12)"
                  : "1px solid rgba(255,255,255,0.11)";
                const lCardShadow = isLight
                  ? "0 4px 32px rgba(20,15,60,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"
                  : "0 4px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)";
                return (
                  <div
                    className="max-w-sm mx-auto w-full"
                    style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {/* ━━ ロゴエリア ━━ */}
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                      {/* アイコン */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: 20,
                        }}
                      >
                        <img
                          src={APP_ICON_SRC}
                          alt="ORITAN"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 20,
                            boxShadow:
                              "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(201,168,76,0.18)",
                            display: "block",
                          }}
                        />
                      </div>

                      {/* ORITAN テキスト */}
                      <h1 style={{ margin: 0, lineHeight: 1 }}>
                        <span
                          className="oritan-letter"
                          style={{
                            color: isLight
                              ? "#1a1240"
                              : "rgba(255,255,255,0.96)",
                            letterSpacing: "0.18em",
                            paddingLeft: "0.18em",
                            textShadow: isLight
                              ? "none"
                              : "0 2px 20px rgba(201,168,76,0.18)",
                          }}
                        >
                          ORITAN
                        </span>
                      </h1>
                      {/* アクセントライン */}
                      <div
                        style={{
                          height: "1px",
                          marginTop: 10,
                          marginLeft: "auto",
                          marginRight: "auto",
                          width: "55%",
                          background: isLight
                            ? "linear-gradient(90deg, transparent, #c9a84c 30%, #e8cc78 50%, #c9a84c 70%, transparent)"
                            : "linear-gradient(90deg, transparent, rgba(201,168,76,0.6) 30%, rgba(232,204,120,0.9) 50%, rgba(201,168,76,0.6) 70%, transparent)",
                        }}
                      />
                      <p
                        style={{
                          margin: "7px 0 0",
                          fontSize: 8,
                          letterSpacing: "0.30em",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: isLight
                            ? "rgba(201,168,76,0.65)"
                            : "rgba(201,168,76,0.55)",
                          paddingLeft: "0.30em",
                        }}
                      >
                        vocabulary learning
                      </p>
                    </div>

                    {/* ━━ フォームカード ━━ */}
                    <div
                      style={{
                        background: lCard,
                        border: lCardBd,
                        borderRadius: 30,
                        padding: "22px 20px 20px",
                        backdropFilter: "blur(20px)",
                        boxShadow: lCardShadow,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: lM,
                            marginBottom: 7,
                          }}
                        >
                          Friend ID
                        </p>
                        <input
                          type="text"
                          value={loginId}
                          onChange={(e) => {
                            setLoginId(e.target.value.toUpperCase());
                            setLoginError("");
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          placeholder="6桁のID"
                          maxLength={6}
                          className="w-full outline-none font-mono font-black text-xl tracking-[0.22em]"
                          style={{
                            background: lB,
                            border: lBd,
                            borderRadius: 12,
                            padding: "12px 16px",
                            color: lC,
                            caretColor: isLight ? "#3d35a0" : "#e0c97f",
                          }}
                        />
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: lM,
                            marginBottom: 7,
                          }}
                        >
                          Password
                        </p>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            setLoginError("");
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          placeholder="パスワードを入力"
                          className="w-full outline-none font-bold text-base"
                          style={{
                            background: lB,
                            border: lBd,
                            borderRadius: 12,
                            padding: "12px 16px",
                            color: lC,
                            caretColor: isLight ? "#3d35a0" : "#e0c97f",
                          }}
                        />
                      </div>
                      {loginError && (
                        <p
                          style={{
                            color: "#f43f5e",
                            fontSize: 12,
                            fontWeight: 700,
                            marginTop: -4,
                          }}
                        >
                          {loginError}
                        </p>
                      )}
                      <button
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full font-black text-sm active:opacity-80 transition-all"
                        style={{
                          marginTop: 2,
                          padding: "14px 0",
                          borderRadius: 12,
                          background: isLoggingIn
                            ? isLight
                              ? "rgba(20,15,60,0.06)"
                              : "rgba(255,255,255,0.08)"
                            : "linear-gradient(135deg, #2a2060 0%, #1a1040 100%)",
                          border: isLoggingIn
                            ? isLight
                              ? "1.5px solid rgba(20,15,60,0.10)"
                              : "1px solid rgba(255,255,255,0.1)"
                            : isLight
                            ? "1.5px solid rgba(20,15,60,0.25)"
                            : "1px solid rgba(255,255,255,0.18)",
                          color: isLoggingIn
                            ? isLight
                              ? "rgba(20,15,60,0.3)"
                              : "rgba(255,255,255,0.35)"
                            : "#fff",
                          letterSpacing: "0.1em",
                          boxShadow: isLoggingIn
                            ? "none"
                            : isLight
                            ? "0 4px 16px rgba(20,15,60,0.22)"
                            : "0 4px 20px rgba(0,0,0,0.4)",
                          cursor: isLoggingIn ? "not-allowed" : "pointer",
                        }}
                      >
                        {isLoggingIn ? "Signing in..." : "ログイン"}
                      </button>
                    </div>

                    {/* 新規登録 */}
                    <button
                      onClick={() => {
                        setNewName("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setProfileBio("");
                        setScreen("register");
                      }}
                      className="w-full font-bold text-sm active:opacity-70 transition-all"
                      style={{
                        marginTop: 10,
                        padding: "13px 0",
                        borderRadius: 12,
                        background: "transparent",
                        border: isLight
                          ? "1.5px solid rgba(20,15,60,0.15)"
                          : "1px solid rgba(255,255,255,0.12)",
                        color: isLight
                          ? "rgba(20,15,60,0.45)"
                          : "rgba(255,255,255,0.45)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      新規登録
                    </button>

                    <p
                      style={{
                        textAlign: "center",
                        color: isLight
                          ? "rgba(20,15,60,0.18)"
                          : "rgba(255,255,255,0.1)",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        paddingTop: 16,
                      }}
                    >
                      Designed &amp; Developed by miwa
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {(screen === "register" || screen === "profileEdit") && (
            <div
              className="animate-in fade-in"
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
                paddingLeft: 24,
                paddingRight: 24,
                paddingBottom: 48,
                width: "100%",
                maxWidth: 430,
                margin: "0 auto",
              }}
            >
              {screen === "profileEdit" && (
                <button
                  onClick={() => setScreen("start")}
                  className="flex items-center gap-1.5 mb-5 active:opacity-70 transition-all"
                  style={{
                    color: theme.text,
                    background: isLight
                      ? "rgba(30,20,80,0.07)"
                      : "rgba(255,255,255,0.08)",
                    border: isLight
                      ? "1px solid rgba(30,20,80,0.12)"
                      : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "8px 14px",
                    display: "inline-flex",
                  }}
                >
                  <ChevronLeft size={18} />
                  <span className="text-sm font-black">戻る</span>
                </button>
              )}
              <p
                className="text-[11px] font-black tracking-[0.2em] uppercase mb-6"
                style={{ color: isLight ? "#92400e" : "#fbbf24" }}
              >
                {screen === "register" ? "新規登録" : "プロフィール編集"}
              </p>
              <div className="flex items-end gap-4 mb-7 min-w-0">
                <div
                  className={`w-20 h-20 ${
                    avatarImage ? "" : selectedColor.bg
                  } rounded-[1.6rem] flex items-center justify-center text-4xl shadow-2xl overflow-hidden shrink-0`}
                  style={{
                    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                    border: isLight
                      ? "3px solid rgba(180,100,0,0.3)"
                      : "3px solid rgba(255,255,255,0.6)",
                  }}
                >
                  {avatarImage ? (
                    <img
                      src={avatarImage}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (() => {
                      const AvatarIc = AVATAR_ICONS[selectedAvatar.char];
                      if (AvatarIc)
                        return <AvatarIc size={46} color="currentColor" />;
                      return selectedAvatar.char;
                    })()
                  )}
                </div>
                <div className="pb-1 min-w-0">
                  <p
                    className="text-2xl font-black leading-tight break-words"
                    style={{ color: theme.text }}
                  >
                    {newName ||
                      (screen === "register"
                        ? "あなたの名前"
                        : profile?.name || "名前")}
                  </p>
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: theme.textMuted }}
                  >
                    {screen === "profileEdit"
                      ? `ID: ${profile?.shortId || "------"}`
                      : " Oritanへようこそ"}
                  </p>
                </div>
              </div>

              {screen === "profileEdit" && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(profile?.shortId || "");
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="w-full mb-6 p-4 bg-amber-50 rounded-[20px] flex items-center justify-between border border-amber-100"
                >
                  <div className="text-left">
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                      Friend ID
                    </span>
                    <code className="text-lg font-mono font-black text-amber-500 tracking-widest">
                      {profile?.shortId || "------"}
                    </code>
                  </div>
                  {isCopied ? (
                    <Check size={18} className="text-emerald-500" />
                  ) : (
                    <Copy size={18} className="text-amber-300" />
                  )}
                </button>
              )}

              <div
                className="rounded-[1.6rem] p-4 mb-5"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: isLight ? "#78350f" : "#94a3b8" }}>プロフィール背景</p>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] cursor-pointer active:opacity-70 transition-all" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest"><IcCamera size={13} color="currentColor" /> 写真</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (ev) => { const compressed = await compressImage(ev.target.result); setCoverImage(compressed); }; reader.readAsDataURL(file); }} />
                  </label>
                </div>
                <div className="rounded-[16px] overflow-hidden" style={{ height: 96, background: coverImage ? `url(${coverImage}) center/cover` : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}88)` }} />
                {coverImage && (
                  <button onClick={() => setCoverImage(null)} className="w-full mt-3 py-2 rounded-[12px] text-[11px] font-bold text-rose-400 active:opacity-70" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>背景写真を削除</button>
                )}
              </div>

              <div
                className="rounded-[1.6rem] p-4 mb-5"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: isLight ? "#78350f" : "#94a3b8" }}
                  >
                    アイコンを変更
                  </p>
                  <label
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] cursor-pointer active:opacity-70 transition-all"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      border: "1px solid rgba(99,102,241,0.3)",
                    }}
                  >
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      <IcCamera size={13} color="currentColor" /> 写真
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const compressed = await compressImage(
                            ev.target.result
                          );
                          setAvatarImage(compressed);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                {avatarImage && (
                  <button
                    onClick={() => setAvatarImage(null)}
                    className="w-full mb-3 py-2 rounded-[12px] text-[11px] font-bold text-rose-400 active:opacity-70"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    写真を削除してアイコンを使う
                  </button>
                )}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {AVATARS.map((a) => {
                    const AvatarIc = AVATAR_ICONS[a.char];
                    const isSelected =
                      !avatarImage && selectedAvatar.char === a.char;
                    return (
                      <button
                        key={a.char}
                        onClick={() => {
                          setSelectedAvatar(a);
                          setAvatarImage(null);
                        }}
                        className="flex flex-col items-center justify-center gap-1 py-2 rounded-[18px] transition-all active:scale-95 min-h-[74px]"
                        style={{
                          background: isSelected
                            ? "rgba(201,168,76,0.18)"
                            : "rgba(100,116,139,0.07)",
                          border: isSelected
                            ? "2px solid #f59e0b"
                            : "2px solid transparent",
                        }}
                      >
                        {AvatarIc ? (
                          <AvatarIc size={32} color="currentColor" />
                        ) : (
                          <span className="text-3xl">{a.char}</span>
                        )}
                        <span
                          className="text-[9px] font-black"
                          style={{ color: isSelected ? "#b45309" : "#94a3b8" }}
                        >
                          {a.label || a.char}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Lv10解放帽子アバター */}
                {(() => {
                  const unlockedHatAvatars = Object.values(
                    PET_HAT_AVATARS
                  ).filter((ha) => {
                    const petId = ha.char.replace("_hat", "");
                    const pd = getPetData(petId);
                    return getPetLvFromAffection(pd.affection || 0) >= 10;
                  });
                  if (unlockedHatAvatars.length === 0) return null;
                  return (
                    <>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <IcHat size={12} /> Lv10解放アバター
                      </p>
                       <div className="grid grid-cols-3 gap-2 mb-5">
                        {unlockedHatAvatars.map((ha) => {
                          const HatIc = ha.component;
                          const isSelected =
                            !avatarImage && selectedAvatar.char === ha.char;
                          return (
                            <button
                              key={ha.char}
                              onClick={() => {
                                setSelectedAvatar(ha);
                                setAvatarImage(null);
                              }}
                              className="flex flex-col items-center justify-center gap-1 py-2 rounded-[18px] transition-all active:scale-95 min-h-[74px]"
                              style={{
                                background: isSelected
                                  ? "rgba(201,168,76,0.18)"
                                  : "rgba(245,158,11,0.07)",
                                border: isSelected
                                  ? "2px solid #f59e0b"
                                  : "2px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              <HatIc size={32} />
                              <span
                                className="text-[9px] font-black"
                                style={{
                                  color: isSelected ? "#b45309" : "#f59e0b",
                                }}
                              >
                                {ha.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-3"
                  style={{ color: isLight ? "#78350f" : "#94a3b8" }}
                >
                  カラー
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c)}
                      className={`h-8 rounded-[10px] ${c.bg} transition-all`}
                      style={{
                        boxShadow:
                          selectedColor.name === c.name
                            ? `0 0 0 3px ${c.hex || "#f59e0b"}, 0 0 0 5px ${
                                isLight ? "#eef2ff" : "#0e0618"
                              }`
                            : "none",
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {screen === "profileEdit" && (
                <div
                  className="rounded-[1.6rem] p-4 mb-5"
                  style={{
                    background: theme.card,
                    border: `1px solid ${theme.cardBorder}`,
                    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
                  }}
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-widest mb-3"
                    style={{ color: isLight ? "#78350f" : "#94a3b8" }}
                  >
                    フレーム
                  </p>
                  <div className="rx-frame-grid">
                    {(() => {
                      const cleared = stageCountOf(profile);
                      return STAGE_FRAMES.map((f) => {
                        const unlocked = cleared >= f.min;
                        const selected = Number(selectedFrameMin || 0) === f.min;
                        return (
                          <button
                            key={f.label}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => unlocked && setSelectedFrameMin(f.min)}
                            className="rx-frame-chip"
                            style={{
                              opacity: unlocked ? 1 : 0.42,
                              borderColor: selected ? f.ring : unlocked ? `${f.ring}66` : "var(--line)",
                              background: selected ? `${f.ring}24` : unlocked ? `${f.ring}12` : "var(--card)",
                              cursor: unlocked ? "pointer" : "default",
                            }}
                          >
                            <span style={{ background: f.ring }} />
                            <b>{f.label}</b>
                            <small>+{f.min}</small>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <p
                className="text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ color: isLight ? "#78350f" : "rgba(255,255,255,0.4)" }}
              >
                ニックネーム
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-5 py-4 rounded-[20px] font-black text-lg outline-none focus:border-amber-400 transition-colors mb-3"
                style={{
                  background: theme.card,
                  border: `2px solid ${theme.cardBorder}`,
                  color: theme.text,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
                placeholder="ニックネームを入力"
              />

              {screen === "register" && teacherCodeInput !== ADMIN_PASSCODE && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "rgba(16,185,129,0.8)" }}
                    >
                      <IcKey size={12} color="rgba(16,185,129,0.8)" />{" "}
                      招待コード
                    </p>
                    <p
                      className="text-[10px] font-bold"
                      style={{ color: theme.textMuted }}
                    >
                      先生から受け取ったコードを入力
                    </p>
                  </div>
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => {
                      setInviteCodeInput(e.target.value.toUpperCase());
                      setInviteCodeError("");
                    }}
                    className="w-full px-5 py-3.5 rounded-[20px] font-mono font-black text-base outline-none transition-all tracking-widest"
                    style={{
                      background: "rgba(16,185,129,0.08)",
                      border: inviteCodeError
                        ? "1.5px solid rgba(239,68,68,0.6)"
                        : "1.5px solid rgba(16,185,129,0.3)",
                      color: theme.text,
                    }}
                    placeholder="招待コードを入力"
                    maxLength={20}
                  />
                  {inviteCodeError && (
                    <p className="text-rose-400 text-[11px] font-black mt-1.5 px-1">
                      {inviteCodeError}
                    </p>
                  )}
                </div>
              )}

              {/* SECURITY (Phase 1): the "teacher code" field is hidden because
                  client-side passcode escalation has been removed — it no longer
                  grants teacher status, so showing it would mislead users.
                  Kept in source (behind `false`) for easy reference/restoration.
                  Teacher status must be granted server-side. See SECURITY_NOTES.md. */}
              {false && screen === "register" && (
                <div className="mb-4">
                  <div
                    style={{ fontSize: 14, color: "#AAAAAA", marginBottom: 8 }}
                  >
                    先生用コード（任意）
                  </div>
                  <input
                    type="password"
                    value={teacherCodeInput}
                    onChange={(e) => setTeacherCodeInput(e.target.value.trim())}
                    className="w-full px-5 py-3.5 rounded-[20px] font-bold text-sm outline-none transition-all"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.05)"
                        : "rgba(255,255,255,0.06)",
                      border:
                        teacherCodeInput &&
                        teacherCodeInput.trim() === ADMIN_PASSCODE
                          ? "1.5px solid rgba(99,102,241,0.6)"
                          : isLight
                          ? "1.5px solid rgba(0,0,0,0.15)"
                          : "1.5px solid rgba(255,255,255,0.1)",
                      color: theme.text,
                    }}
                    placeholder="先生用コードを入力"
                  />
                  {teacherCodeInput &&
                    teacherCodeInput.trim() === ADMIN_PASSCODE && (
                      <p className="text-amber-400 text-[11px] font-black mt-1.5 px-1">
                        ✓ 先生アカウントとして登録されます
                      </p>
                    )}
                </div>
              )}

              <div className="mb-4 space-y-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-[20px] font-bold text-sm outline-none transition-all"
                  style={{
                    background: isLight
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.06)",
                    border: isLight
                      ? "1.5px solid rgba(0,0,0,0.15)"
                      : "1.5px solid rgba(255,255,255,0.1)",
                    color: theme.text,
                  }}
                  placeholder={
                    screen === "register"
                      ? "パスワードを設定"
                      : "新しいパスワード（変更する場合）"
                  }
                />
                {newPassword.length > 0 && (
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[20px] font-bold text-sm outline-none transition-all"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.05)"
                        : "rgba(255,255,255,0.06)",
                      border:
                        confirmPassword && confirmPassword !== newPassword
                          ? "1.5px solid rgba(239,68,68,0.6)"
                          : isLight
                          ? "1.5px solid rgba(0,0,0,0.15)"
                          : "1.5px solid rgba(255,255,255,0.1)",
                      color: theme.text,
                    }}
                    placeholder="パスワードを再入力"
                  />
                )}
                {newPassword.length > 0 &&
                  confirmPassword.length > 0 &&
                  confirmPassword !== newPassword && (
                    <p className="text-rose-400 text-[11px] font-black px-1">
                      パスワードが一致しません
                    </p>
                  )}
                {newPassword.length > 0 && confirmPassword === newPassword && (
                  <p className="text-emerald-400 text-[11px] font-black px-1">
                    ✓ パスワードが一致しました
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setScreen(screen === "profileEdit" ? "start" : "login")
                  }
                  className="flex-1 py-4 rounded-[20px] font-black transition-all active:opacity-70"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: theme.text,
                    border: `1px solid ${theme.cardBorder}`,
                  }}
                >
                  戻る
                </button>
                <button
                  onClick={handleRegister}
                  disabled={isSavingProfile}
                  className="flex-[2] py-4 rounded-[20px] font-black text-white text-lg transition-all active:scale-[0.98]"
                  style={
                    isSavingProfile
                      ? {
                          background: "rgba(201,168,76,0.25)",
                          cursor: "not-allowed",
                        }
                      : {
                          background: "linear-gradient(135deg,#b8860b,#e0c97f)",
                          boxShadow: "0 4px 20px rgba(201,168,76,0.4)",
                          border: "none",
                        }
                  }
                >
                  {isSavingProfile ? "保存中..." : "決定"}
                </button>
              </div>

              {screen === "profileEdit" && <div className="mt-4"></div>}
            </div>
          )}

          {![
            "play",
            "result",
            "register",
            "profileEdit",
            "dm",
            "login",
            "settingsApp",
          ].includes(screen) && (
            <header
              className="px-4 flex justify-between items-center shrink-0"
              style={{
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)",
                paddingBottom: "12px",
                background: "transparent",
                borderBottom: "none",
                position: "relative",
              }}
            >
              {/* PS5風 ヘッダー下ライン */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 16,
                  right: 16,
                  height: 1,
                  background: `linear-gradient(to right, transparent, ${theme.accent}30 30%, ${theme.accent}50 50%, ${theme.accent}30 70%, transparent)`,
                }}
              />
              {/* 左: ハンバーガー + アバター小 + 名前 + Lv（コンパクト） */}
              <div className="flex items-center gap-2.5 text-left">
                {/* ハンバーガーボタン（アバターの左隣） */}
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    flexShrink: 0,
                    background: menuOpen
                      ? `linear-gradient(135deg, ${theme.accent}cc, ${theme.accent}88)`
                      : isLight
                      ? "rgba(0,0,0,0.07)"
                      : "rgba(255,255,255,0.08)",
                    border: menuOpen
                      ? `1.5px solid ${theme.accent}88`
                      : isLight
                      ? "1.5px solid rgba(0,0,0,0.10)"
                      : "1.5px solid rgba(255,255,255,0.12)",
                    boxShadow: menuOpen
                      ? `0 4px 20px ${theme.accent}55`
                      : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: menuOpen ? 0 : 4,
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        borderRadius: 2,
                        background: menuOpen
                          ? "white"
                          : isLight
                          ? "rgba(20,10,60,0.7)"
                          : "rgba(255,255,255,0.8)",
                        transform: menuOpen
                          ? "translateY(2px) rotate(45deg)"
                          : "none",
                        transformOrigin: "center",
                        transition: "all 0.22s ease",
                      }}
                    />
                    {!menuOpen && (
                      <div
                        style={{
                          width: 16,
                          height: 2,
                          borderRadius: 2,
                          background: isLight
                            ? "rgba(20,10,60,0.7)"
                            : "rgba(255,255,255,0.8)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        borderRadius: 2,
                        background: menuOpen
                          ? "white"
                          : isLight
                          ? "rgba(20,10,60,0.7)"
                          : "rgba(255,255,255,0.8)",
                        transform: menuOpen
                          ? "translateY(-2px) rotate(-45deg)"
                          : "none",
                        transformOrigin: "center",
                        transition: "all 0.22s ease",
                      }}
                    />
                  </div>
                </button>
                {/* アバター（小） */}
                <div
                  style={{
                    position: "relative",
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                  }}
                >
                  <div
                    className={`w-full h-full ${
                      profile?.avatar?.startsWith("data:") ||
                      profile?.avatar?.startsWith("http")
                        ? ""
                        : profile?.color || "bg-amber-500"
                    } rounded-[20px] flex items-center justify-center overflow-hidden`}
                    style={{
                      boxShadow: frameShadow(stageCountOf(profile), 4, profile?.avatarFrameMin) || `0 0 0 1.5px ${theme.accent}60, 0 0 12px ${theme.accent}25`,
                    }}
                  >
                    {profile?.avatar?.startsWith("data:") ||
                    profile?.avatar?.startsWith("http") ? (
                      <img
                        src={profile.avatar}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (() => {
                        const AvatarIc = AVATAR_ICONS[profile?.avatar];
                        if (AvatarIc)
                          return <AvatarIc size={28} color="currentColor" />;
                        return profile?.avatar || "👤";
                      })()
                    )}
                  </div>
                  {profile?.isTeacher && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
                        border: `1.5px solid ${theme.bgColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IcCrownSm size={9} />
                    </div>
                  )}
                </div>
                {/* 名前 + Lv */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: theme.text,
                        lineHeight: 1,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {profile?.name || "User"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: theme.accent,
                        background: `${theme.accent}14`,
                        border: `1px solid ${theme.accent}40`,
                        borderRadius: 4,
                        padding: "2px 7px",
                        lineHeight: 1.5,
                        boxShadow: `0 0 8px ${theme.accent}20`,
                      }}
                    >
                      Lv.{calcLevel(profile?.totalExp)}
                    </span>
                  </div>
                  {/* 学校名 */}
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: isLight
                          ? "rgba(60,40,120,0.5)"
                          : "rgba(255,255,255,0.35)",
                      }}
                    >
                      現論会 一宮駅前校
                    </span>
                    {/* ストリーク */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: "#f97316",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Flame
                        size={11}
                        style={{ color: "#f97316", display: "inline" }}
                      />
                      {profile?.streakCount || 1}d
                    </span>
                  </div>
                  {/* EXPバー */}
                  <div
                    className="mt-2 w-28 rounded-full overflow-hidden"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.07)"
                        : "rgba(255,255,255,0.08)",
                      height: 3,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        background: `linear-gradient(90deg, ${theme.accent}70, ${theme.accent})`,
                        width: `${calcExpProgress(profile?.totalExp).pct}%`,
                        boxShadow: `0 0 8px ${theme.accent}90`,
                        transition: "width 0.8s cubic-bezier(0.34,1.1,0.64,1)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 右: 管理/ログアウト（超小さく） */}
              <div className="flex items-center gap-0.5">
                {profile?.isTeacher && (
                  <button
                    onClick={() => setScreen("admin")}
                    className="p-2"
                    style={{ color: `${theme.accent}88` }}
                  >
                    <Lock size={15} />
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2"
                  style={{
                    color: isLight
                      ? "rgba(0,0,0,0.3)"
                      : "rgba(255,255,255,0.18)",
                  }}
                  title="ログアウト"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </header>
          )}

          {/* ━━━ 学習日誌スクリーン ━━━ */}
          {screen === "studyDiaryApp" && (
            <StudyDiaryScreen
              fb={fb}
              user={user}
              studyDiaryWeekOffset={studyDiaryWeekOffset}
              setStudyDiaryWeekOffset={setStudyDiaryWeekOffset}
              studyDiaryData={studyDiaryData}
              setStudyDiaryData={setStudyDiaryData}
              studyDiaryViewUid={studyDiaryViewUid}
              isLight={isLight}
              profile={profile}
              prevScreen={prevScreen}
              setScreen={setScreen}
            />
          )}

          {screen !== "studyDiaryApp" && (
            <main
              ref={mainRef}
              className="px-4 no-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY:
                  screen === "play" ||
                  screen === "start" ||
                  screen === "plaza" ||
                  screen === "petRoom"
                    ? "hidden"
                    : "scroll",
                overflowX: "hidden",
                paddingTop: screen === "play" ? "8px" : "12px",
                paddingBottom:
                  screen === "play" ||
                  screen === "start" ||
                  screen === "plaza" ||
                  screen === "petRoom"
                    ? "0px"
                    : screen === "chat"
                    ? "calc(var(--nav-height, 100px) + 80px)"
                    : "calc(var(--nav-height, 100px) + 40px)",
                // ナビバー(fixed)の高さ分だけ縮める
                maxHeight:
                  screen === "start" || screen === "plaza"
                    ? "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 200px)"
                    : screen === "petRoom"
                    ? "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 90px)"
                    : undefined,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                display: ["register", "profileEdit", "login"].includes(screen)
                  ? "none"
                  : screen === "play" ||
                    screen === "start" ||
                    screen === "plaza" ||
                    screen === "petRoom"
                  ? "flex"
                  : "block",
                flexDirection: "column",
                position: "relative",
                zIndex: 1,
                color: theme.text,
              }}
            >
              {false && screen === "chat" && (
                <div
                  className="flex flex-col animate-in fade-in text-left"
                  style={{
                    minHeight: "calc(100dvh - 200px)",
                    paddingTop: 4,
                  }}
                >
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 20,
                            borderRadius: 99,
                            background: `linear-gradient(to bottom, ${theme.accent}, ${theme.accent}40)`,
                            boxShadow: `0 0 10px ${theme.accent}`,
                          }}
                        />
                        <h2
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            color: isLight
                              ? "rgba(10,5,40,0.92)"
                              : "rgba(255,255,255,0.95)",
                            lineHeight: 1,
                          }}
                        >
                          称え場
                        </h2>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 600,
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            color: `${theme.accent}80`,
                            paddingTop: 3,
                          }}
                        >
                          Chat
                        </span>
                      </div>
                      <div
                        style={{
                          height: 1,
                          background: `linear-gradient(to right, ${theme.accent}50, ${theme.accent}10, transparent)`,
                          marginLeft: 11,
                        }}
                      />
                    </div>
                    {!profile?.isTeacher && (
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                        style={
                          (chatSettings.allowedUids || []).includes(
                            user?.uid || ""
                          )
                            ? {
                                background: "rgba(201,168,76,0.15)",
                                color: "#c9a84c",
                                border: "1px solid rgba(201,168,76,0.3)",
                              }
                            : {
                                background: "rgba(255,255,255,0.05)",
                                color: isLight
                                  ? theme.textMuted
                                  : "rgba(255,255,255,0.25)",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }
                        }
                      >
                        {(chatSettings.allowedUids || []).includes(
                          user?.uid || ""
                        ) ? (
                          <>
                            <IcSpeech size={12} color="currentColor" /> 発言OK
                          </>
                        ) : (
                          <>
                            <IcEye size={12} color="currentColor" /> 閲覧のみ
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div
                    className="space-y-4 pr-2 no-scrollbar"
                    style={{
                      paddingBottom: "12px",
                    }}
                  >
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-slate-400 font-bold mt-10">
                        まだメッセージがありません
                      </p>
                    ) : (
                      chatMessages.map((m) => {
                        const isMe = m.uid === user?.uid;
                        const canDelete = isAdmin || isMe;
                        // leaderboardは同一UIDのユーザーのみ参照。マッチしない場合はメッセージ自体のデータを使う
                        const lp = leaderboard.find((u) => u.id === m.uid);
                        // allUsersMapから最新名を取得（生徒+先生対応）
                        const userInfo = allUsersMap[m.uid];
                        const displayAvatar = isMe
                          ? profile?.avatar || m.avatar
                          : userInfo?.avatar || lp?.avatar || m.avatar;
                        const displayColor = isMe
                          ? profile?.color || m.color
                          : userInfo?.color || lp?.color || m.color;
                        const displayName = isMe
                          ? profile?.name || m.name
                          : userInfo?.name || lp?.name || m.name;
                        const displayIsTeacher = isMe
                          ? !!profile?.isTeacher
                          : !!(
                              userInfo?.isTeacher ||
                              lp?.isTeacher ||
                              m.isTeacher
                            );
                        return (
                          <div
                            key={m.id}
                            className={`flex gap-2 ${
                              isMe ? "flex-row-reverse" : ""
                            }`}
                            style={{ alignItems: "flex-end" }}
                          >
                            {/* アバター：リアクション時も含め常に isMe で左右が決まる */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              {m.isReaction && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                    color: isLight
                                      ? "rgba(30,20,80,0.6)"
                                      : "rgba(255,255,255,0.55)",
                                    pointerEvents: "none",
                                  }}
                                >
                                  {isMe ? "自分" : displayName}
                                </span>
                              )}
                              <AvatarDisplay
                                avatar={displayAvatar}
                                color={displayColor}
                                isTeacher={displayIsTeacher}
                                isMe={isMe && !m.isReaction}
                                isLight={isLight}
                              />
                            </div>
                            <div
                              className={`flex flex-col gap-1 max-w-[70%] ${
                                isMe ? "items-end" : "items-start"
                              }`}
                            >
                              {m.isAchievement ? (
                                /* 実績解除バナー */
                                <div
                                  className="rounded-[20px] px-4 py-3 shadow-md w-full"
                                  style={{
                                    background: isLight
                                      ? `linear-gradient(135deg, ${
                                          m.achColor || "#c9a84c"
                                        }20, ${
                                          m.achColor || "#c9a84c"
                                        }10), rgba(255,255,255,0.85)`
                                      : `linear-gradient(135deg, ${
                                          m.achColor || "#c9a84c"
                                        }18, ${m.achColor || "#c9a84c"}32)`,
                                    border: `1.5px solid ${
                                      m.achColor || "#c9a84c"
                                    }55`,
                                  }}
                                >
                                  <p
                                    className="text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1"
                                    style={{ color: m.achColor || "#c9a84c" }}
                                  >
                                    <IcAchMedal
                                      size={11}
                                      color={m.achColor || "#c9a84c"}
                                    />{" "}
                                    実績解除 · {displayName}
                                  </p>
                                  <p
                                    className="font-black text-sm leading-snug"
                                    style={{
                                      color: isLight ? "#1a1040" : "#fff",
                                    }}
                                  >
                                    {m.text}
                                  </p>
                                  <p
                                    className="text-[9px] mt-1 font-bold uppercase tracking-wider"
                                    style={{
                                      color:
                                        RANK_META[m.achRank]?.color ||
                                        "#c9a84c",
                                    }}
                                  >
                                    {RANK_META[m.achRank]?.label || ""}
                                  </p>
                                </div>
                              ) : m.isReaction ? (
                                /* リアクション → コンパクトな絵文字バブル */
                                <div className="flex flex-col items-end gap-0.5">
                                  <div
                                    className="rounded-[20px] px-3 py-1.5 shadow-sm"
                                    style={{
                                      background: isLight
                                        ? "rgba(255,255,255,0.85)"
                                        : "rgba(255,255,255,0.07)",
                                      border: isLight
                                        ? "1px solid rgba(30,20,80,0.1)"
                                        : "1px solid rgba(255,255,255,0.1)",
                                      fontSize: 22,
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {m.text}
                                  </div>
                                </div>
                              ) : (
                                /* 通常メッセージ */
                                <div
                                  className={`p-3.5 rounded-[20px] shadow-sm ${
                                    isMe
                                      ? "text-white rounded-tr-none"
                                      : "rounded-tl-none"
                                  }`}
                                  style={
                                    isMe
                                      ? {
                                          background:
                                            "linear-gradient(135deg,#b8860b,#d4a020)",
                                          color: "#fff",
                                        }
                                      : isLight
                                      ? {
                                          background: "rgba(255,255,255,0.9)",
                                          border:
                                            "1px solid rgba(30,20,80,0.1)",
                                          color: "#1a1040",
                                          boxShadow:
                                            "0 2px 8px rgba(0,0,0,0.06)",
                                        }
                                      : {
                                          background: "rgba(255,255,255,0.1)",
                                          border:
                                            "1px solid rgba(255,255,255,0.15)",
                                          color: "#fff",
                                        }
                                  }
                                >
                                  {!isMe && (
                                    <p className="text-[10px] font-black opacity-70 mb-1 tracking-wider">
                                      {displayName}
                                    </p>
                                  )}
                                  <p className="font-bold leading-relaxed text-sm">
                                    {m.text}
                                  </p>
                                </div>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteChatMessage(m.id)}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all active:opacity-60"
                                  style={{
                                    color:
                                      isAdmin && !isMe
                                        ? "rgba(239,68,68,0.7)"
                                        : isLight
                                        ? "rgba(30,20,80,0.35)"
                                        : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  {isAdmin && !isMe ? (
                                    <>
                                      <IcTrashSm
                                        size={12}
                                        color="currentColor"
                                      />{" "}
                                      削除
                                    </>
                                  ) : (
                                    "取り消し"
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* 入力バー: 権限によって切り替え */}
                  {(() => {
                    const canPost =
                      profile?.isTeacher ||
                      (chatSettings.allowedUids || []).includes(
                        user?.uid || ""
                      );
                    const REACTIONS = [
                      "👍",
                      "❤️",
                      "🔥",
                      "😂",
                      "🎉",
                      "💪",
                      "✨",
                      "😮",
                    ];
                    return (
                      <div
                        style={{
                          padding: "8px 16px",
                          paddingBottom: "8px",
                          position: "fixed",
                          bottom:
                            "calc(env(safe-area-inset-bottom, 20px) + 68px)",
                          left: 0,
                          right: 0,
                          maxWidth: "576px",
                          margin: "0 auto",
                          zIndex: 50,
                        }}
                      >
                        {canPost ? (
                          /* 発言権限あり → 通常入力 */
                          <div
                            className="flex gap-2 p-2 rounded-[20px]"
                            style={{
                              background: theme.navBg,
                              backdropFilter: "blur(24px)",
                              border: "1px solid rgba(201,168,76,0.25)",
                              boxShadow: "0 -2px 20px rgba(0,0,0,0.3)",
                            }}
                          >
                            <input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSendMessage()
                              }
                              className="flex-1 p-4 bg-transparent outline-none font-bold"
                              style={{ color: theme.text, opacity: 1 }}
                              placeholder="メッセージを入力..."
                            />
                            <button
                              onClick={handleSendMessage}
                              className="p-3.5 rounded-[12px] active:opacity-80 transition-all"
                              style={{
                                background:
                                  "linear-gradient(135deg,#b8860b,#e0c97f)",
                                color: "#1a0e00",
                              }}
                            >
                              <Send size={20} />
                            </button>
                          </div>
                        ) : (
                          /* 発言権限なし → リアクションバー */
                          <div
                            className="rounded-[20px] px-3 py-2"
                            style={{
                              background: theme.navBg,
                              backdropFilter: "blur(24px)",
                              border: isLight
                                ? "1px solid rgba(0,0,0,0.1)"
                                : "1px solid rgba(255,255,255,0.08)",
                              boxShadow: "0 -2px 20px rgba(0,0,0,0.3)",
                            }}
                          >
                            <p
                              className="text-[10px] font-black text-center mb-2"
                              style={{
                                color: "rgba(201,168,76,0.5)",
                                letterSpacing: "0.15em",
                              }}
                            >
                              REACTION
                            </p>
                            <div className="flex justify-around">
                              {REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleSendReaction(emoji)}
                                  className="text-xl active:scale-125 transition-transform"
                                  style={{ lineHeight: 1 }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {screen === "dm" && activeFriend && (
                <div className="flex flex-col animate-in fade-in text-left pt-6">
                  <div className="flex items-center gap-4 mb-4 border-b pb-4">
                    <button
                      onClick={() => {
                        setScreen("friendsList");
                        setDmMessages([]);
                      }}
                      className="p-2 rounded-[12px] active:opacity-70 transition-all"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.08)",
                        border: isLight
                          ? "1px solid rgba(0,0,0,0.12)"
                          : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <ChevronLeft />
                    </button>
                    <h2
                      className="text-2xl font-black"
                      style={{
                        color: isLight ? "rgba(20,10,60,0.9)" : "white",
                      }}
                    >
                      {activeFriend.name} とのトーク
                    </h2>
                  </div>
                  <div
                    className="overflow-y-auto space-y-4 mb-4 pr-2 no-scrollbar"
                    style={{
                      maxHeight: "55vh",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {dmMessages.length === 0 ? (
                      <p className="text-center text-slate-400 font-bold mt-10">
                        メッセージを送ってみましょう！
                      </p>
                    ) : (
                      dmMessages.map((m) => {
                        const isMe = m.uid === (user?.uid || "local-user");
                        return (
                          <div
                            key={m.id}
                            className={`flex gap-3 ${
                              isMe ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div
                              className={`p-4 rounded-[20px] max-w-[75%] shadow-sm ${
                                isMe
                                  ? "text-white rounded-tr-none"
                                  : "rounded-tl-none text-white"
                              }`}
                              style={
                                isMe
                                  ? {
                                      background:
                                        "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                    }
                                  : {
                                      background: isLight
                                        ? "rgba(0,0,0,0.05)"
                                        : "rgba(255,255,255,0.1)",
                                      border: isLight
                                        ? "1px solid rgba(0,0,0,0.15)"
                                        : "1px solid rgba(255,255,255,0.15)",
                                    }
                              }
                            >
                              <p className="font-bold leading-relaxed">
                                {m.text}
                              </p>
                              <p
                                className={`text-[9px] mt-1 ${
                                  isMe
                                    ? "text-amber-200 text-right"
                                    : "text-slate-400 text-left"
                                }`}
                              >
                                {new Date(m.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={dmEndRef} />
                  </div>
                  <div
                    className="flex gap-2 p-2 rounded-[20px]"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.03)"
                        : "rgba(255,255,255,0.06)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.15)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <input
                      value={dmInput}
                      onChange={(e) => setDmInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendDM()}
                      className="flex-1 p-4 bg-transparent outline-none font-bold text-white placeholder-white/30"
                      placeholder="メッセージを入力..."
                    />
                    <button
                      onClick={handleSendDM}
                      className="p-3.5 text-white rounded-[12px] active:opacity-80 transition-all"
                      style={{
                        background: "linear-gradient(135deg,#b8860b,#e0c97f)",
                      }}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* 育成（petRoom）: 3Dハムスター表示。3D不可時は2Dフォールバック */}
              {screen === "petRoom" && (
                <HamsterRoom
                  isLight={isLight}
                  mood={profile?.petAffection}
                  accent={theme.accent}
                  inkMuted={theme.textMuted}
                />
              )}

              {screen === "start" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  {(() => {
                    const cat = gameCategory || "英単語";
                    const catVocab = ALL_VOCAB.filter((v) => (v.category || "英単語") === cat);
                    const total = new Set(catVocab.map((v) => v.stage)).size || 1;
                    const rawCleared = profile?.clearedStages?.[cat];
                    const clearedCount = Array.isArray(rawCleared) ? rawCleared.length : 0;
                    const unlockedMax = (profile?.unlockedStages || {})[cat] || 1;
                    const pct = Math.min(100, Math.round((clearedCount / total) * 100));
                    const off = Math.round(207 * (1 - pct / 100));
                    const goStage = () => { setPrevScreen("start"); setScreen("stageMap"); };
                    const goto = (id) => { setPrevScreen("start"); setScreen(id); };
                    const renderAvatar = (a, size) => {
                      if (typeof a === "string" && (a.startsWith("data:") || a.startsWith("http"))) return <img src={a} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 9 }} />;
                      const Av = AVATAR_ICONS[a];
                      return Av ? <Av size={size} color="currentColor" /> : <Users size={size} color="currentColor" />;
                    };
                    return (
                      <>
                        <div className="rx-hero">
                          <div className="rx-ringwrap">
                            <svg className="rx-ring" viewBox="0 0 80 80">
                              <circle cx="40" cy="40" r="33" fill="none" stroke={`${theme.accent}22`} strokeWidth="9" />
                              <circle cx="40" cy="40" r="33" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray="207" strokeDashoffset={off} transform="rotate(-90 40 40)" />
                              <text x="40" y="46" textAnchor="middle" fontSize="18" fill={theme.text}>{pct}%</text>
                            </svg>
                            <div>
                              <div className="rx-goal-l">{cat} の進行度</div>
                              <div className="rx-goal-n">ステージ {unlockedMax}</div>
                              <div className="rx-goal-s">クリア {clearedCount} / {total}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rx-cta" onClick={goStage}>
                          <span className="l">
                            <span className="pl"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg></span>
                            <span>つづきから<small>{cat} ・ ステージ {unlockedMax}</small></span>
                          </span>
                          <svg width="22" height="22" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>

                        <button className="rx-planbtn" onClick={() => { setPrevScreen("start"); setPlanTab("now"); setScreen("weeklyPlan"); }}>
                          <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 9h18M8 3v4M16 3v4" /></svg></span>
                          <span className="t"><b>今週の計画</b><small>やることと記録を確認する</small></span>
                          <span className="rx-tm">›</span>
                        </button>
                        {profile?.isTeacher && (
                          <button className="rx-planbtn ghost" onClick={() => { setPrevScreen("start"); setScreen("weeklyTaskAdmin"); }}>
                            <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg></span>
                            <span className="t"><b>課題を送る</b><small>生徒に今週の課題を配布する</small></span>
                            <span className="rx-tm">›</span>
                          </button>
                        )}
                        {profile?.isTeacher && (
                          <button className="rx-planbtn ghost" onClick={() => { setPrevScreen("start"); setScreen("teacherCheck"); }}>
                            <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M7 16v-5M12 16V8M17 16v-3" /></svg></span>
                            <span className="t"><b>生徒の確認</b><small>学習状況と計画の進捗をチェック</small></span>
                            <span className="rx-tm">›</span>
                          </button>
                        )}

                        <div className="rx-sec"><h3>パレット</h3><a onClick={() => setMenuOpen(true)}>すべて ›</a></div>
                        <div className="rx-quick">
                          <div className="rx-q" onClick={() => { setSelectedBookForLog(null); setBookLogTab("log"); setBookShelfCreating(false); goto("bookLogApp"); }}><div className="ic" style={{ background: "#E3F6EC", color: "#1AA06A" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg></div><span>時間記録</span></div>
                          <div className="rx-q" onClick={() => goto("review")}><div className="ic" style={{ background: "#E3F6EC", color: "#1AA06A" }}><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span>復習</span></div>
                          <div className="rx-q" onClick={() => goto("wordbook")}><div className="ic" style={{ background: "#FFF1E0", color: "#E08A1E" }}><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg></div><span>単語帳</span></div>
                          <div className="rx-q" onClick={() => goto("customApp")}><div className="ic" style={{ background: "#F3EAFE", color: "#7C5CD0" }}><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 4l14 8-14 8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg></div><span>先生から</span></div>
                        </div>

                        <div className="rx-sec"><h3>セッション</h3><a onClick={() => goto("plaza")}>ひろば ›</a></div>
                        <div className="rx-peek">
                          <div className="rx-prow" onClick={() => goto("plaza")}><div className="rx-av"><Users size={20} color="currentColor" /></div><div className="rx-tx"><b>ひろば</b> で友だち・先生とつながる</div><div className="rx-tm">›</div></div>
                          <div className="rx-prow" onClick={() => goto("customApp")}><div className="rx-av"><IcGift size={20} color="currentColor" /></div><div className="rx-tx"><b>先生からの配布</b> を確認する</div><div className="rx-tm">›</div></div>
                        </div>

                        <button className="rx-menu" onClick={() => setMenuOpen(true)}>
                          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                          すべての機能
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {screen === "weeklyPlan" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "recordHub")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                    戻る
                  </button>
                  <div className="rx-topbar"><div><div className="rx-greet">今週の計画</div><div className="rx-title">{planTab === "now" ? "やること" : "これまでの記録"}</div></div></div>
                  <div className="rx-cats" style={{ marginBottom: 14 }}>
                    <button className={"rx-cat" + (planTab === "now" ? " on" : "")} onClick={() => setPlanTab("now")}>今週</button>
                    <button className={"rx-cat" + (planTab === "hist" ? " on" : "")} onClick={() => setPlanTab("hist")}>履歴</button>
                  </div>
                  {(() => {
                    const now = Date.now();
                    const mineAll = weeklyTasks.filter((t) => t.assignedTo === "all" || (Array.isArray(t.assignedTo) && t.assignedTo.includes(user?.uid)));
                    const list = planTab === "now" ? mineAll.filter((t) => !(t.deadline && now > t.deadline)) : mineAll.filter((t) => t.deadline && now > t.deadline);
                    if (list.length === 0) return <p className="rx-goal-s" style={{ padding: "8px 2px" }}>{planTab === "now" ? "今週の課題はありません。" : "期限切れの課題はまだありません。"}</p>;
                    return (
                      <div className="rx-tasks">
                        {list.map((t) => {
                          const done = taskProgress[t.id] || 0;
                          const total = Number(t.total) || 0;
                          const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                          const u = t.unit || "";
                          const expired = planTab === "hist";
                          const dl = t.deadline ? new Date(t.deadline) : null;
                          return (
                            <div className="rx-task" key={t.id} style={expired ? { opacity: 0.85 } : {}}>
                              <div className="rx-task-top"><span className="rx-task-sub">{t.subject}</span><span className="rx-task-num">{done}{u}/{total}{u}（{pct}%）</span></div>
                              <div className="rx-task-bar"><div style={{ width: `${pct}%` }} /></div>
                              {dl && <div className="rx-task-num" style={{ marginTop: 6 }}>{expired ? "期限切れ" : "入力期限"}：{dl.getMonth() + 1}/{dl.getDate()}</div>}
                              {!expired ? (
                                <div className="rx-task-ctl">
                                  <button onClick={() => saveTaskProgress(t, done - 1)}>−</button>
                                  <input type="number" value={done} onChange={(e) => saveTaskProgress(t, Number(e.target.value) || 0)} />
                                  <button onClick={() => saveTaskProgress(t, done + 1)}>＋</button>
                                </div>
                              ) : (
                                <div className="rx-task-num" style={{ marginTop: 4, textAlign: "right" }}>記録は締め切られました</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {screen === "scheduleCalendar" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <ChevronLeft size={20} />
                    戻る
                  </button>
                  <div className="rx-topbar">
                    <div>
                      <div className="rx-greet">みんなの予定</div>
                      <div className="rx-title">予定カレンダー</div>
                    </div>
                  </div>
                  {(() => {
                    const nextSchedule = getNextScheduleEvent();
                    return (
                      <div className="rx-schedule-hero">
                        <div className="rx-av"><Calendar size={22} color="currentColor" /></div>
                        <div>
                          <div className="rx-goal-l">次の予定</div>
                          <div className="rx-goal-n">{nextSchedule ? nextSchedule.title : "予定はまだありません"}</div>
                          <div className="rx-goal-s">{nextSchedule ? `${formatScheduleDate(nextSchedule.startAt)} ・ ${scheduleCountdownText(nextSchedule)}` : "自分の予定を追加するとここに表示されます。"}</div>
                          <div className="rx-support-msg">{scheduleSupportMessage(nextSchedule)}</div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rx-task" style={{ marginBottom: 14 }}>
                    <div className="rx-task-sub" style={{ marginBottom: 10 }}>予定を追加</div>
                    <input className="rx-tf" placeholder="予定名（例：英単語テスト）" value={scheduleForm.title} onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input className="rx-tf" type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))} style={{ flex: 1 }} />
                      <input className="rx-tf" type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))} style={{ width: 120 }} />
                    </div>
                    <input className="rx-tf" placeholder="応援メッセージ（任意）" value={scheduleForm.message} onChange={(e) => setScheduleForm((f) => ({ ...f, message: e.target.value }))} style={{ marginTop: 8 }} />
                    <button className="rx-bigedit" style={{ marginTop: 10 }} onClick={addScheduleEvent}>予定を保存する</button>
                  </div>

                  <div className="rx-sec"><h3>予定一覧</h3><span className="rx-goal-s">{scheduleEvents.length}件</span></div>
                  {scheduleEvents.length === 0 ? (
                    <div className="rx-peek">
                      <div className="rx-prow" style={{ cursor: "default" }}>
                        <div className="rx-av"><Calendar size={20} color="currentColor" /></div>
                        <div className="rx-tx"><b>予定はまだありません</b> 自分の予定をここに追加できます。</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rx-tasks">
                      {[...scheduleEvents].sort((a, b) => Number(a.startAt) - Number(b.startAt)).map((event) => {
                        const past = Number(event.startAt) < Date.now();
                        return (
                          <div className="rx-task rx-schedule-row" key={event.id} style={{ opacity: past ? 0.58 : 1 }}>
                            <div className="rx-task-top">
                              <span className="rx-task-sub">{event.title}</span>
                              <span className="rx-task-num">{formatScheduleDate(event.startAt)}</span>
                            </div>
                            <div className="rx-goal-s" style={{ marginTop: 8 }}>{past ? "終了済み" : scheduleCountdownText(event)}</div>
                            {event.message && <div className="rx-support-msg">{event.message}</div>}
                            <button className="rx-mini-danger" onClick={() => deleteScheduleEvent(event)}>
                              <Trash2 size={14} /> 削除
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {screen === "attendanceStamp" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "recordHub")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <ChevronLeft size={20} />
                    戻る
                  </button>
                  <div className="rx-topbar">
                    <div>
                      <div className="rx-greet">現論会</div>
                      <div className="rx-title">登校スタンプ</div>
                    </div>
                  </div>
                  {(() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = now.getMonth();
                    const first = new Date(y, m, 1);
                    const days = new Date(y, m + 1, 0).getDate();
                    const cells = [
                      ...Array(first.getDay()).fill(null),
                      ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1)),
                    ];
                    const stampedCount = Object.keys(attendanceStamps).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).length;
                    return (
                      <>
                        <div className="rx-schedule-hero">
                          <div className="rx-av"><Calendar size={22} color="currentColor" /></div>
                          <div>
                            <div className="rx-goal-l">{y}年 {m + 1}月</div>
                            <div className="rx-goal-n">今月 {stampedCount} 回</div>
                            <div className="rx-support-msg">登校した日をタップして記録できます。</div>
                          </div>
                        </div>
                        <div className="rx-calendar-grid">
                          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                            <div key={d} className="rx-cal-head">{d}</div>
                          ))}
                          {cells.map((d, i) => {
                            if (!d) return <div key={`b${i}`} />;
                            const key = dateKeyOf(d);
                            const stamped = !!attendanceStamps[key];
                            const isToday = key === dateKeyOf(now);
                            return (
                              <button
                                key={key}
                                className={"rx-cal-day" + (stamped ? " on" : "") + (isToday ? " today" : "")}
                                onClick={() => toggleAttendanceStamp(key)}
                              >
                                <span>{d.getDate()}</span>
                                {stamped && <Check size={15} />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {screen === "teacherCheck" && profile?.isTeacher && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                    戻る
                  </button>
                  <div className="rx-topbar"><div><div className="rx-greet">先生メニュー</div><div className="rx-title">生徒の確認</div></div></div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {[{ k: "study", t: "学習状況" }, { k: "plan", t: "計画の進捗" }].map((tb) => (
                      <button key={tb.k} className={"rx-cat" + (teacherCheckTab === tb.k ? " on" : "")} style={{ flex: 1 }} onClick={() => setTeacherCheckTab(tb.k)}>{tb.t}</button>
                    ))}
                  </div>
                  {(() => {
                    const students = (leaderboard || []).filter((u) => !(allUsersMap?.[u.id]?.isTeacher) && !u.isTeacher);
                    if (teacherCheckTab === "study") {
                      const sorted = [...students].sort((a, b) => (b.totalExp || 0) - (a.totalExp || 0));
                      if (sorted.length === 0) return <p className="rx-goal-s" style={{ padding: "12px 2px" }}>生徒がまだいません。</p>;
                      return (
                        <div className="rx-talk">
                          {sorted.map((u, i) => {
                            const Av = AVATAR_ICONS[u.avatar];
                            const isImg = typeof u.avatar === "string" && (u.avatar.startsWith("data:") || u.avatar.startsWith("http"));
                            return (
                              <div className="rx-trow" key={u.id || i} style={{ cursor: "default" }}>
                                <div className="rx-av">{isImg ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : Av ? <Av size={20} color="currentColor" /> : <Users size={18} color="currentColor" />}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="rx-trow-nm">{u.name || "生徒"}</div>
                                  <div className="rx-trow-ls">EXP {Number(u.totalExp || 0).toLocaleString()} ・ クリア{u.stagesCleared ?? 0} ・ {u.streakCount || 0}日連続</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    const tasks = weeklyTasks || [];
                    if (tasks.length === 0) return <p className="rx-goal-s" style={{ padding: "12px 2px" }}>配布した課題がありません。</p>;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {tasks.map((t) => {
                          const total = Number(t.total) || 0;
                          const un = t.unit || "";
                          return (
                            <div key={t.id} style={{ background: isLight ? "#fff" : theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 18, padding: 14, boxShadow: "0 8px 24px rgba(43,39,36,.06)" }}>
                              <div style={{ fontWeight: 800, fontSize: 15, color: theme.text, marginBottom: 10 }}>{t.subject} <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 700 }}>目標 {total}{un}</span></div>
                              {students.length === 0 ? <p className="rx-goal-s">生徒がいません。</p> : students.map((su, si) => {
                                const prog = (allTaskProgress || []).find((p) => p.taskId === t.id && p.uid === su.id);
                                const done = prog?.done || 0;
                                const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                                return (
                                  <div key={su.id || si} style={{ marginBottom: 9 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.text, fontWeight: 700, marginBottom: 3 }}><span>{su.name || "生徒"}</span><span style={{ color: theme.textMuted }}>{done}{un}/{total}{un}（{pct}%）</span></div>
                                    <div className="rx-task-bar"><div style={{ width: `${pct}%` }} /></div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {screen === "weeklyTaskAdmin" && (
                <div
                  className="rx-mp"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                    戻る
                  </button>
                  <div className="rx-sec"><h3>今週の課題を送る</h3></div>
                  <div className="rx-task" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input className="rx-tf" placeholder="教科（例：数学1A）" value={taskForm.subject} onChange={(e) => setTaskForm((f) => ({ ...f, subject: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="rx-tf" type="number" placeholder="目標量（例：50）" value={taskForm.total} onChange={(e) => setTaskForm((f) => ({ ...f, total: e.target.value }))} style={{ flex: 1 }} />
                      <select className="rx-tf" value={taskForm.unit} onChange={(e) => setTaskForm((f) => ({ ...f, unit: e.target.value }))} style={{ width: 96 }}>
                        <option value="p">ページ</option>
                        <option value="問">問</option>
                        <option value="章">章</option>
                        <option value="h">時間</option>
                      </select>
                    </div>
                    <label className="rx-task-num" style={{ marginTop: 2 }}>入力期限（この日まで記録できます）
                      <input className="rx-tf" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))} style={{ marginTop: 6 }} />
                    </label>
                    <button className="rx-bigedit" style={{ marginTop: 2 }} onClick={addWeeklyTask}>課題を送る</button>
                  </div>
                  <div className="rx-sec" style={{ marginTop: 18 }}><h3>送った課題と進捗</h3><a onClick={loadWeeklyTasks}>更新 ›</a></div>
                  {weeklyTasks.length === 0 ? (
                    <p className="rx-goal-s" style={{ padding: "2px" }}>まだ課題はありません。</p>
                  ) : (
                    <div className="rx-tasks">
                      {weeklyTasks.map((t) => {
                        const progs = allTaskProgress.filter((p) => p.taskId === t.id).sort((a, b) => (b.done || 0) - (a.done || 0));
                        return (
                          <div className="rx-task" key={t.id}>
                            <div className="rx-task-top">
                              <span className="rx-task-sub">{t.subject}（目標 {t.total}{t.unit}）{t.deadline ? `　期限 ${new Date(t.deadline).getMonth() + 1}/${new Date(t.deadline).getDate()}${Date.now() > t.deadline ? "・終了" : ""}` : ""}</span>
                              <button onClick={() => deleteWeeklyTask(t)} style={{ border: "none", background: "transparent", color: "#c0492f", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>削除</button>
                            </div>
                            {progs.length === 0 ? (
                              <p className="rx-task-num" style={{ marginTop: 6 }}>まだ誰も記録していません</p>
                            ) : (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                                {progs.map((p) => {
                                  const pct = Number(t.total) > 0 ? Math.round((p.done / Number(t.total)) * 100) : 0;
                                  return (
                                    <div key={p.id} className="rx-task-num" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || "生徒"}</span>
                                      <span style={{ flex: "none" }}>{p.done}{t.unit}/{t.total}{t.unit}（{pct}%）</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {screen === "recordHub" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <div className="rx-topbar"><div><div className="rx-greet">きろく</div><div className="rx-title">記録する</div></div></div>
                  <div className="rx-recs">
                    <button className="rx-rec" onClick={() => { setPrevScreen("recordHub"); setScreen("attendanceStamp"); }}>
                      <span className="ic" style={{ background: "#FFECE8", color: theme.accent }}>
                        <Calendar size={24} />
                      </span>
                      <span className="tx"><b>登校スタンプ</b><small>カレンダーをタップして記録</small></span>
                      <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                    </button>
                    <button className="rx-rec" onClick={() => { setPrevScreen("recordHub"); setScreen("scheduleCalendar"); }}>
                      <span className="ic" style={{ background: `${theme.accent}18`, color: theme.accent }}>
                        <Calendar size={24} />
                      </span>
                      <span className="tx"><b>予定カレンダー</b><small>自分の予定と応援メッセージを保存</small></span>
                      <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                    </button>
                    <button className="rx-rec" onClick={() => { setSelectedBookForLog(null); setBookLogTab("log"); setBookShelfCreating(false); setPrevScreen("recordHub"); setScreen("bookLogApp"); }}>
                      <span className="ic" style={{ background: "#FFF1E0", color: "#E08A1E" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 4h11l3 3v13H5z" /><path d="M8 9h8M8 13h6" /></svg>
                      </span>
                      <span className="tx"><b>勉強時間記録</b><small>参考書ごとに勉強時間を記録</small></span>
                      <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                    </button>
                    <button className="rx-rec" onClick={() => { setPrevScreen("recordHub"); setScreen("noteApp"); }}>
                      <span className="ic" style={{ background: "#E8F0FF", color: "#3B6FE0" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 4h11l3 3v13H5z" /><path d="M9 11h6M9 15h4" /></svg>
                      </span>
                      <span className="tx"><b>メモ</b><small>自分用のメモを書く</small></span>
                      <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                    </button>
                  </div>
                </div>
              )}

              {screen === "myPage" && (
                <div
                  className="rx-mp"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  {(() => {
                    const av = profile?.avatar;
                    const isImg = typeof av === "string" && (av.startsWith("data:") || av.startsWith("http"));
                    const exp = profile?.totalExp || 0;
                    const streak = profile?.streakCount || 0;
                    const cleared = (() => {
                      const cs = profile?.clearedStages || {};
                      try {
                        return Object.values(cs).reduce((a, v) => a + (Array.isArray(v) ? v.length : (typeof v === "number" ? v : 0)), 0);
                      } catch { return 0; }
                    })();
                    const rank = exp >= 5000 ? "プラチナ" : exp >= 2000 ? "ゴールド" : exp >= 500 ? "シルバー" : "ブロンズ";
                    return (
                      <>
                        <div className="rx-cover" style={profile?.coverImage ? { background: `url(${profile.coverImage}) center/cover` } : undefined}>
                          <div className="pat" />
                          <button className="rx-edit" onClick={() => { setPrevScreen("myPage"); setScreen("profileEdit"); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M14 6l4 4" /></svg>
                            編集
                          </button>
                        </div>
                        <div className="rx-avatar" style={{ boxShadow: frameShadow(cleared, 6, profile?.avatarFrameMin) || undefined }}>
                          {(() => {
                          if (isImg) return <img src={av} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
                          const Av = AVATAR_ICONS[av];
                          return Av ? <Av size={52} color={theme.accent} /> : <Users size={48} color={theme.accent} />;
                        })()}
                        </div>
                        <div style={{ textAlign: "center", marginTop: 10 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: `${frameRingOf(cleared, profile?.avatarFrameMin)}22`, color: theme.text, fontSize: 11.5, fontWeight: 800 }}><span style={{ width: 9, height: 9, borderRadius: 999, background: frameRingOf(cleared, profile?.avatarFrameMin) }} />{frameLabelOf(cleared, profile?.avatarFrameMin)}フレーム</span></div>
                        <div className="rx-pname">{profile?.name || profile?.displayName || "ユウキ"}</div>
                        <div className="rx-pid">{profile?.shortId ? `ID ${profile.shortId}` : "ID ーーーー"}</div>
                        <div className="rx-rank"><span>
                          <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 18.2l.9-5.5-4-3.9L9.5 8z" fill="currentColor" /></svg>
                          {rank} ランク
                        </span></div>
                        <div className="rx-bio">{profile?.bio || "自己紹介はまだありません。「編集」から書いてみよう！"}</div>
                        <div className="rx-stats">
                          <div className="rx-stat"><div className="v">{streak}</div><div className="l">ストリーク</div></div>
                          <div className="rx-stat"><div className="v">{exp.toLocaleString()}</div><div className="l">XP</div></div>
                          <div className="rx-stat"><div className="v">{cleared}</div><div className="l">クリア数</div></div>
                        </div>
                        <button className="rx-bigedit" onClick={() => { setPrevScreen("myPage"); setScreen("profileEdit"); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M14 6l4 4" /></svg>
                          プロフィールを編集
                        </button>

                        <div className="rx-sec" style={{ marginTop: 20 }}><h3>アカウント</h3></div>
                        <button className="rx-menu" onClick={() => { setPrevScreen("myPage"); setScreen("stats"); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M7 16v-5M12 16V8M17 16v-3" /></svg>
                          成績を見る
                        </button>
                        <button className="rx-menu" style={{ marginTop: 10 }} onClick={() => { setPrevScreen("myPage"); setScreen("settingsApp"); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4 12H2M22 12h-2M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
                          設定
                        </button>
                        <button className="rx-menu" style={{ marginTop: 10 }} onClick={() => setMenuOpen(true)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                          すべての機能
                        </button>
                        {profile?.isTeacher && (
                          <button className="rx-menu" style={{ marginTop: 10 }} onClick={() => { setPrevScreen("myPage"); setScreen("admin"); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>
                            管理画面
                          </button>
                        )}
                        <button className="rx-menu" style={{ marginTop: 10, color: "#c0492f" }} onClick={handleLogout}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H3M9 8l-4 4 4 4M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" /></svg>
                          ログアウト
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {screen === "recordsTimeline" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  <div className="rx-topbar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "plaza")} aria-label="戻る"><ChevronLeft /></button>
                    <div><div className="rx-greet">みんなの</div><div className="rx-title">記録タイムライン</div></div>
                  </div>
                  {friendsTimelineLoading ? (
                    <div className="rx-tx" style={{ padding: "24px 4px", color: "var(--ink-soft)" }}>読み込み中…</div>
                  ) : friendsTimeline.length === 0 ? (
                    <div className="rx-peek">
                      <div className="rx-prow" style={{ cursor: "default" }}>
                        <div className="rx-av"><Clock size={20} color="currentColor" /></div>
                        <div className="rx-tx"><b>まだ記録がありません</b> フレンドが学習すると表示されます</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rx-talk">
                      {friendsTimeline.map((r) => (
                        <div className="rx-trow" key={r.id} style={{ cursor: "default" }}>
                          <div className="rx-av">{av(r.avatar)}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="rx-trow-nm">{r.name || "フレンド"}</div>
                            <div className="rx-trow-ls">{(r.subject || r.category || "学習")} ステージ{r.stage ?? "-"}{r.isClear ? " クリア" : " 学習"}{r.duration ? ` ・ ${r.duration}分` : ""}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)", flex: "none", whiteSpace: "nowrap" }}>{fmtDate(r.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {screen === "friendProfile" && (
                <div
                  className="rx-mp"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  {(() => {
                    const f = viewingFriend || {};
                    const lb = (leaderboard || []).find((u) => u.id === f.uid || (f.shortId && u.shortId === f.shortId)) || {};
                    const name = f.name || lb.name || "フレンド";
                    const avatar = f.avatar || lb.avatar;
                    const bio = lb.bio || "";
                    const streak = lb.streakCount || 0;
                    const isImg = typeof avatar === "string" && (avatar.startsWith("data:") || avatar.startsWith("http"));
                    const Av = AVATAR_ICONS[avatar];
                    const fmt = (m) => { const hh = Math.floor(m / 60); const mm = m % 60; return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`; };
                    const totalMin = friendHist.reduce((acc, h) => acc + (h.duration || 0), 0);
                    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
                    const todayMin = friendHist.filter((h) => (h.timestamp || 0) >= t0.getTime()).reduce((acc, h) => acc + (h.duration || 0), 0);
                    const fmtDate = (ts) => { if (!ts) return ""; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
                    return (
                      <>
                        <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "plaza")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                          戻る
                        </button>
                        <div className="rx-cover"><div className="pat" /></div>
                        <div className="rx-avatar" style={{ boxShadow: frameShadow(stageCountOf(lb), 6) || undefined }}>
                          {isImg ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : Av ? <Av size={52} color={theme.accent} /> : <Users size={48} color={theme.accent} />}
                        </div>
                        <div className="rx-pname">{name}{f.isTeacher ? " 先生" : ""}</div>
                        <div className="rx-pid">{f.shortId ? `ID ${f.shortId}` : ""}</div>
                        <div className="rx-bio">{bio || "自己紹介はまだありません。"}</div>
                        <div className="rx-stats">
                          <div className="rx-stat"><div className="v">{fmt(totalMin)}</div><div className="l">総勉強時間</div></div>
                          <div className="rx-stat"><div className="v">{fmt(todayMin)}</div><div className="l">今日</div></div>
                          <div className="rx-stat"><div className="v">{streak}</div><div className="l">ストリーク</div></div>
                        </div>
                        <button className="rx-bigedit" onClick={() => { setActiveFriend(viewingFriend); setPrevScreen("friendProfile"); setScreen("dm"); }}>
                          <MessageSquare size={16} color="#fff" /> トークする
                        </button>
                        <div className="rx-sec" style={{ marginTop: 18 }}><h3>{name} の記録</h3></div>
                        {friendHistLoading ? (
                          <p className="rx-goal-s" style={{ textAlign: "center", padding: "12px" }}>読み込み中…</p>
                        ) : friendHist.length > 0 ? (
                          <div className="rx-talk">
                            {friendHist.slice(0, 30).map((h) => (
                              <div className="rx-trow" key={h.id} style={{ cursor: "default" }}>
                                <div className="rx-av">{h.isClear ? <CheckCircle2 size={20} /> : <IcBook size={20} color="currentColor" />}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="rx-trow-nm">{h.category ? h.category + " " : ""}ステージ{h.stage ?? "-"} {h.isClear ? "クリア" : "学習"}</div>
                                  <div className="rx-trow-ls">{fmtDate(h.timestamp)}{h.duration ? ` ・ ${h.duration}分` : ""}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rx-goal-s" style={{ textAlign: "center", padding: "16px" }}>記録がありません（または取得できませんでした）</p>
                        )}
                        <button className="rx-talkbtn" onClick={() => handleRemoveFriend(viewingFriend, () => setScreen("plaza"))} style={{ background: "transparent", color: "#d4574e", boxShadow: "none", border: "1px solid #e8bdb8", marginTop: 16, alignSelf: "center" }}>
                          <Trash2 size={15} color="#d4574e" /> フレンドを削除
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {screen === "stats" && (
                <div className="space-y-6 animate-in fade-in text-left">
                  <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "myPage")} style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                    戻る
                  </button>
                  <div className="flex items-center justify-between mb-0 shrink-0">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 20,
                            borderRadius: 99,
                            background: `linear-gradient(to bottom, ${theme.accent}, ${theme.accent}40)`,
                            boxShadow: `0 0 10px ${theme.accent}`,
                          }}
                        />
                        <h2
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            color: isLight
                              ? "rgba(10,5,40,0.92)"
                              : "rgba(255,255,255,0.95)",
                            lineHeight: 1,
                          }}
                        >
                          成績
                        </h2>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 600,
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            color: `${theme.accent}80`,
                            paddingTop: 3,
                          }}
                        >
                          Stats
                        </span>
                      </div>
                      <div
                        style={{
                          height: 1,
                          background: `linear-gradient(to right, ${theme.accent}50, ${theme.accent}10, transparent)`,
                          marginLeft: 11,
                        }}
                      />
                    </div>
                  </div>

                  {/* ── 総学習時間カード ── */}
                  {(() => {
                    const totalMin = history.reduce(
                      (s, h) => s + (h.duration || 0),
                      0
                    );
                    const hours = Math.floor(totalMin / 60);
                    const mins = totalMin % 60;
                    const sessions = history.length;
                    const avgMin =
                      sessions > 0 ? Math.round(totalMin / sessions) : 0;
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            label: "総学習時間",
                            value:
                              hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
                            sub: `${sessions}セッション`,
                            color: "#f59e0b",
                            icon: <IcAchBolt size={26} color="#f59e0b" />,
                          },
                          {
                            label: "平均時間/回",
                            value: `${avgMin}分`,
                            sub: "セッション平均",
                            color: "#10b981",
                            icon: <IcAchChart size={26} color="#10b981" />,
                          },
                          {
                            label: "総セッション",
                            value: `${sessions}回`,
                            sub:
                              history.filter((h) => h.isClear).length +
                              "回クリア",
                            color: "#8b5cf6",
                            icon: <IcAchPerfect size={26} color="#8b5cf6" />,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-[20px] p-4 text-center"
                            style={{
                              background: isLight
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(255,255,255,0.05)",
                              border: `1px solid ${
                                isLight
                                  ? "rgba(0,0,0,0.08)"
                                  : "rgba(255,255,255,0.1)"
                              }`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                height: 28,
                              }}
                            >
                              {stat.icon}
                            </div>
                            <div
                              className="font-black text-lg mt-1"
                              style={{ color: stat.color }}
                            >
                              {stat.value}
                            </div>
                            <div
                              className="text-[9px] font-bold mt-0.5"
                              style={{ color: theme.textMuted }}
                            >
                              {stat.label}
                            </div>
                            <div
                              className="text-[8px] mt-0.5"
                              style={{ color: theme.textMuted }}
                            >
                              {stat.sub}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── カテゴリ別習得単語数 ── */}
                  <div
                    className="rounded-[20px] p-5"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.04)"
                        : "rgba(255,255,255,0.05)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.08)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <h3
                      className="font-black text-[11px] mb-4 flex items-center gap-2 uppercase tracking-widest"
                      style={{ color: theme.textMuted }}
                    >
                      <BookCheck size={15} className="text-emerald-400" />{" "}
                      カテゴリ別 習得単語数
                    </h3>
                    {(() => {
                      const clearedStages = profile?.clearedStages || {};
                      const totalByCategory = WORD_CATEGORIES.map((cat) => {
                        const cleared = clearedStages[cat.key] || [];
                        // クリア済みステージのALL_VOCAB語数を正確にカウント
                        const learnedCount = ALL_VOCAB.filter(
                          (v) =>
                            (v.category || "英単語") === cat.key &&
                            cleared.includes(v.stage)
                        ).length;
                        const totalCount = ALL_VOCAB.filter(
                          (v) => (v.category || "英単語") === cat.key
                        ).length;
                        return {
                          ...cat,
                          learnedCount,
                          totalCount,
                          clearedCount: cleared.length,
                        };
                      });
                      const grandTotal = totalByCategory.reduce(
                        (s, c) => s + c.learnedCount,
                        0
                      );
                      const grandMax = totalByCategory.reduce(
                        (s, c) => s + c.totalCount,
                        0
                      );
                      return (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                          }}
                        >
                          {/* 合計 */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 14,
                              background: isLight
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(255,255,255,0.08)",
                              border: isLight
                                ? "1px solid rgba(0,0,0,0.07)"
                                : "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  color: theme.textMuted,
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                合計
                              </p>
                              <p
                                style={{
                                  fontSize: 22,
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  color: theme.accent,
                                }}
                              >
                                {grandTotal}{" "}
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.textMuted,
                                  }}
                                >
                                  / {grandMax} 語
                                </span>
                              </p>
                            </div>
                            <div
                              style={{
                                width: 56,
                                height: 56,
                                position: "relative",
                              }}
                            >
                              <svg
                                viewBox="0 0 56 56"
                                style={{
                                  transform: "rotate(-90deg)",
                                  width: 56,
                                  height: 56,
                                }}
                              >
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="22"
                                  fill="none"
                                  stroke={
                                    isLight
                                      ? "rgba(0,0,0,0.08)"
                                      : "rgba(255,255,255,0.1)"
                                  }
                                  strokeWidth="5"
                                />
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="22"
                                  fill="none"
                                  stroke={theme.accent}
                                  strokeWidth="5"
                                  strokeDasharray={`${2 * Math.PI * 22}`}
                                  strokeDashoffset={`${
                                    2 *
                                    Math.PI *
                                    22 *
                                    (1 - grandTotal / Math.max(grandMax, 1))
                                  }`}
                                  strokeLinecap="round"
                                  style={{
                                    transition: "stroke-dashoffset 0.8s ease",
                                  }}
                                />
                              </svg>
                              <span
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: theme.accent,
                                }}
                              >
                                {grandMax > 0
                                  ? Math.round((grandTotal / grandMax) * 100)
                                  : 0}
                                %
                              </span>
                            </div>
                          </div>
                          {/* カテゴリ別 */}
                          {totalByCategory.map((cat) => {
                            const pct =
                              cat.totalCount > 0
                                ? Math.round(
                                    (cat.learnedCount / cat.totalCount) * 100
                                  )
                                : 0;
                            const CatIc = CATEGORY_ICONS[cat.key];
                            return (
                              <div key={cat.key}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 7,
                                    }}
                                  >
                                    {CatIc && (
                                      <CatIc size={15} color={cat.color} />
                                    )}
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: isLight
                                          ? "rgba(20,10,60,0.75)"
                                          : "rgba(255,255,255,0.75)",
                                      }}
                                    >
                                      {cat.label}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: theme.textMuted,
                                      }}
                                    >
                                      ({cat.clearedCount}ステージ)
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: 3,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 16,
                                        fontWeight: 900,
                                        color: cat.color,
                                      }}
                                    >
                                      {cat.learnedCount}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: theme.textMuted,
                                      }}
                                    >
                                      / {cat.totalCount}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    height: 6,
                                    borderRadius: 3,
                                    background: isLight
                                      ? "rgba(0,0,0,0.08)"
                                      : "rgba(255,255,255,0.1)",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 3,
                                      background: `linear-gradient(90deg, ${cat.color}cc, ${cat.color})`,
                                      width: `${pct}%`,
                                      boxShadow: `0 0 6px ${cat.color}88`,
                                      transition: "width 0.7s ease",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div
                    className="p-6 rounded-[20px] relative"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.05)"
                        : "rgba(255,255,255,0.05)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.08)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <h3
                      className="font-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-widest"
                      style={{ color: theme.textMuted }}
                    >
                      <Target size={16} className="text-amber-400" /> 正解数
                    </h3>
                    <BarChart type="words" />
                  </div>
                  <div
                    className="p-6 rounded-[20px] relative"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.05)"
                        : "rgba(255,255,255,0.05)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.08)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <h3
                      className="font-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-widest"
                      style={{ color: theme.textMuted }}
                    >
                      <Clock size={16} className="text-amber-500" /> 学習時間
                      (分)
                    </h3>
                    <BarChart type="minutes" />
                  </div>
                  <h3
                    className="text-xl font-black mt-6 mb-3 px-1"
                    style={{ color: theme.text }}
                  >
                    最近の履歴
                  </h3>
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <p
                        className="p-10 text-center font-bold"
                        style={{ color: theme.textMuted }}
                      >
                        まだ記録がありません
                      </p>
                    ) : (
                      history.slice(0, 5).map((h) => (
                        <div
                          key={h.id}
                          className="p-4 rounded-[20px] flex justify-between items-center"
                          style={{
                            background: isLight
                              ? "rgba(0,0,0,0.04)"
                              : "rgba(255,255,255,0.05)",
                            border: isLight
                              ? "1px solid rgba(0,0,0,0.07)"
                              : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div
                              className={`w-10 h-10 rounded-[12px] flex items-center justify-center`}
                              style={
                                h.isClear
                                  ? {
                                      background: "rgba(16,185,129,0.15)",
                                      color: "#34d399",
                                    }
                                  : {
                                      background: "rgba(239,68,68,0.15)",
                                      color: "#f87171",
                                    }
                              }
                            >
                              <CheckCircle2 size={24} />
                            </div>
                            <div>
                              <p
                                className="font-black text-base leading-none mb-1"
                                style={{ color: theme.text }}
                              >
                                {h.correctCount}語 / {h.duration}分
                              </p>
                              <p
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: theme.textMuted }}
                              >
                                Stage {h.stage} •{" "}
                                {new Date(h.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


              {screen === "announcementsList" && (
                <div className="space-y-6 animate-in fade-in text-left">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "plaza")}
                      className="p-2 rounded-[12px] active:opacity-70 transition-all"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.06)"
                          : "rgba(255,255,255,0.08)",
                        border: isLight
                          ? "1.5px solid rgba(0,0,0,0.18)"
                          : "1px solid rgba(255,255,255,0.1)",
                        color: isLight ? "rgba(20,10,60,0.8)" : "white",
                      }}
                    >
                      <ChevronLeft />
                    </button>
                    <h2
                      className="text-2xl font-black flex-1"
                      style={{
                        color: isLight ? "rgba(20,10,60,0.9)" : "white",
                      }}
                    >
                      お知らせ
                      {(() => {
                        const unread = announcements.filter(
                          (a) => !readAnnouncementIds.includes(a.id)
                        ).length;
                        return unread > 0 ? (
                          <span
                            className="ml-2 inline-flex items-center justify-center text-white font-black rounded-full"
                            style={{
                              fontSize: 10,
                              minWidth: 18,
                              height: 18,
                              padding: "0 5px",
                              background:
                                "linear-gradient(135deg,#f43f5e,#c9184a)",
                              boxShadow: "0 2px 8px rgba(244,63,94,0.5)",
                              verticalAlign: "middle",
                            }}
                          >
                            {unread}
                          </span>
                        ) : null;
                      })()}
                    </h2>
                    {announcements.some(
                      (a) => !readAnnouncementIds.includes(a.id)
                    ) && (
                      <button
                        onClick={markAnnouncementsRead}
                        className="px-3 py-1.5 rounded-[12px] font-black text-xs active:scale-95 transition-all"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.06)"
                            : "rgba(255,255,255,0.09)",
                          border: isLight
                            ? "1.5px solid rgba(0,0,0,0.18)"
                            : "1px solid rgba(255,255,255,0.12)",
                          color: isLight
                            ? "rgba(30,20,80,0.6)"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        全既読
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {announcements.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        a={a}
                        isAdmin={isAdmin}
                        db={fb.db}
                        appId={fb.appId}
                        showToast={showToast}
                        setAnnouncements={setAnnouncements}
                        isLight={isLight}
                        isUnread={!readAnnouncementIds.includes(a.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {screen === "stageMap" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: (WORD_CATEGORIES.find((c) => c.key === gameCategory) || {}).color || theme.accent,
                    ["--accent-soft" as any]: `${(WORD_CATEGORIES.find((c) => c.key === gameCategory) || {}).color || theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  {(() => {
                    const catVocab = ALL_VOCAB.filter((v) => (v.category || "英単語") === gameCategory);
                    const catStages = [...new Set(catVocab.map((v) => v.stage))].sort((a, b) => a - b);
                    const unlockedMax = (profile?.unlockedStages || {})[gameCategory] || 1;
                    const rawCleared = profile?.clearedStages?.[gameCategory];
                    const cleared = Array.isArray(rawCleared) ? rawCleared : [];
                    const firstCurrent = catStages.find((sid) => (debugUnlockAll || sid <= unlockedMax) && !cleared.includes(sid));
                    return (
                      <>
                        <button className="rx-back" onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                          ホーム
                        </button>
                        <div className="rx-title" style={{ margin: "0 2px 12px" }}>{gameCategory} ステージ</div>
                        <div className="rx-cats">
                          {WORD_CATEGORIES.map((cat) => (
                            <button key={cat.key} className={"rx-cat" + (gameCategory === cat.key ? " on" : "")} onClick={() => setGameCategory(cat.key)}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: cat.color, marginRight: 6, verticalAlign: "middle" }} />{cat.label}</button>
                          ))}
                        </div>
                        <div className="rx-path">
                          {catStages.map((sid) => {
                            const isUnlocked = debugUnlockAll || sid <= unlockedMax;
                            const isCleared = cleared.includes(sid);
                            const isBoss = sid % 5 === 0;
                            const cls = !isUnlocked ? "rx-locked" : isCleared ? "rx-cleared" : sid === firstCurrent ? "rx-current" : "rx-avail";
                            return (
                              <button
                                key={sid}
                                disabled={!isUnlocked}
                                className={"rx-node " + cls + (isBoss ? " rx-boss" : "")}
                                onClick={() => { if (!isUnlocked) return; setCurrentStage(sid); setScreen("modeSelect"); }}
                              >
                                <div className="rx-circle">{isCleared ? <CheckCircle2 size={22} /> : !isUnlocked ? <Lock size={18} /> : sid}</div>
                                <div>
                                  <div className="rx-nlab">ステージ{sid}{isBoss ? " ・ BOSS" : ""}</div>
                                  <div className="rx-nsub">{!isUnlocked ? "ロック中" : isCleared ? "クリア" : sid === firstCurrent ? "いまここ ・ タップで開始" : "挑戦できる"}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {screen === "modeSelect" && (() => {
                const cat = WORD_CATEGORIES.find((c) => c.key === gameCategory);
                const CatIc = cat ? CATEGORY_ICONS[cat.key] : null;
                const acc = cat?.color || theme.accent;
                const dirs = ["英単語", "熟語"].includes(gameCategory)
                  ? [ { key: "en-ja", label: "英 → 日", sub: "英単語を見て意味を選ぶ" }, { key: "ja-en", label: "日 → 英", sub: "意味を見て英単語を選ぶ" } ]
                  : [ { key: "en-ja", label: "単語 → 意味", sub: "単語を見て意味を選ぶ" }, { key: "ja-en", label: "意味 → 単語", sub: "意味を見て単語を選ぶ" } ];
                return (
                  <div
                    className="rx-home"
                    style={{
                      ["--accent" as any]: acc,
                      ["--accent-soft" as any]: `${acc}22`,
                      ["--ink" as any]: theme.text,
                      ["--ink-soft" as any]: theme.textMuted,
                      ["--card" as any]: isLight ? "#ffffff" : theme.card,
                      ["--line" as any]: theme.cardBorder,
                    }}
                  >
                    <button className="rx-back" onClick={() => setScreen("stageMap")} style={{ ["--accent" as any]: acc, ["--ink" as any]: theme.text }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                      戻る
                    </button>
                    <div className="rx-topbar"><div><div className="rx-greet">ステージ {currentStage}</div><div className="rx-title">挑戦するモード</div></div></div>
                    {cat && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, background: acc, color: "#fff", fontFamily: '"Zen Maru Gothic",sans-serif', fontWeight: 800, fontSize: 13 }}>
                          {CatIc && <CatIc size={14} color="#fff" />} {cat.label}
                        </span>
                        <span style={{ fontSize: 11, color: theme.textMuted }}>カテゴリは変更できません</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 9, marginBottom: 18 }}>
                      {dirs.map((d) => (
                        <button key={d.key} onClick={() => setQuizDirection(d.key)} className={"rx-dirbtn" + (quizDirection === d.key ? " on" : "")}>
                          <b>{d.label}</b><small>{d.sub}</small>
                        </button>
                      ))}
                    </div>
                    <div className="rx-recs">
                      <button className="rx-rec" onClick={() => startGame("meaning", currentStage, gameCategory)}>
                        <span className="ic" style={{ background: `${acc}1f`, color: acc }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg>
                        </span>
                        <span className="tx"><b>単語モード</b><small>単語と意味をマッチングして覚える</small></span>
                        <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                      </button>
                      <button className="rx-rec" onClick={() => startGame("sentence", currentStage, gameCategory)}>
                        <span className="ic" style={{ background: "#E3F6EC", color: "#1AA06A" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6c-1.5-1-4-1.5-6-1v12c2-.5 4.5 0 6 1m0-13c1.5-1 4-1.5 6-1v12c-2-.5-4.5 0-6 1m0-13v13" /></svg>
                        </span>
                        <span className="tx"><b>例文モード</b><small>例文の中で単語の使い方を学ぶ</small></span>
                        <span className="ch"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {screen === "play" && stageWords[currentIndex] && (
                <div
                  className="animate-in fade-in flex flex-col w-full"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    gap: 10,
                    paddingBottom: "76px",
                    paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
                  }}
                >
                  {/* ── ヘッダー：ライフ・スコア・プログレス ── */}
                  <div
                    className="shrink-0 px-4 py-3 rounded-[20px] flex flex-col gap-2"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.04)"
                        : "rgba(255,255,255,0.07)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.12)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <Heart
                            key={i}
                            size={22}
                            fill={i < lives ? "#f43f5e" : "none"}
                            className={
                              i < lives ? "text-rose-500" : "text-slate-300"
                            }
                          />
                        ))}
                      </div>
                      <div className="font-black text-amber-400 text-xl">
                        {score}
                      </div>
                      {/* やめるボタン */}
                      <button
                        onClick={() => setShowQuitConfirm(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[12px] font-black text-xs active:scale-95 transition-all"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.06)"
                            : "rgba(255,255,255,0.08)",
                          border: isLight
                            ? "1.5px solid rgba(0,0,0,0.25)"
                            : "1px solid rgba(255,255,255,0.14)",
                          color: isLight
                            ? "rgba(30,20,80,0.65)"
                            : "rgba(255,255,255,0.55)",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        やめる
                      </button>
                    </div>
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.10)"
                          : "rgba(255,255,255,0.15)",
                        height: 8,
                        border: isLight
                          ? "1.5px solid rgba(0,0,0,0.18)"
                          : "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          background: "linear-gradient(90deg,#b8860b,#e0c97f)",
                          width: `${Math.max(
                            4,
                            ((currentIndex + 1) / stageWords.length) * 100
                          )}%`,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* ── 問題カード ── */}
                  <div
                    className="shrink-0 rounded-[2rem] flex flex-col items-center justify-center text-center relative"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.03)"
                        : "rgba(255,255,255,0.07)",
                      border: isLight
                        ? "1.5px solid rgba(0,0,0,0.15)"
                        : "1px solid rgba(255,255,255,0.12)",
                      flex: "0 0 auto",
                      minHeight: 0,
                      padding: "24px 20px",
                    }}
                  >
                    {/* 読み上げボタン: 日本語を表示するja-enモードでは非表示 */}
                    {quizDirection === "en-ja" &&
                      ["英単語", "英熟語", "英会話", "熟語"].includes(
                        gameCategory || "英単語"
                      ) && (
                        <button
                          onClick={() => speak(stageWords[currentIndex].en)}
                          className="absolute bottom-4 right-4 p-2.5 rounded-[12px] transition-colors"
                          style={{
                            background: isLight
                              ? "rgba(0,0,0,0.06)"
                              : "rgba(255,255,255,0.08)",
                            color: isLight
                              ? "rgba(0,0,0,0.4)"
                              : "rgba(255,255,255,0.4)",
                          }}
                        >
                          <Volume2 size={18} />
                        </button>
                      )}
                    {gameMode === "meaning" ? (
                      <div className="flex flex-col items-center gap-3">
                        {quizDirection === "en-ja" ? (
                          <>
                            <h2
                              className="text-5xl font-black tracking-tighter text-center"
                              style={{
                                color: isLight ? "rgba(20,10,60,0.9)" : "white",
                              }}
                            >
                              {stageWords[currentIndex].en}
                              {isVT(stageWords[currentIndex]) && (
                                <span
                                  style={{
                                    fontSize: "0.55em",
                                    opacity: 0.55,
                                    marginLeft: "0.25em",
                                    fontWeight: 800,
                                  }}
                                >
                                  {" "}
                                  A
                                </span>
                              )}
                            </h2>
                            {["英単語", "英熟語", "英会話", "熟語"].includes(
                              gameCategory || "英単語"
                            ) && (
                              <button
                                onClick={() =>
                                  speak(stageWords[currentIndex].en)
                                }
                                className="px-3 py-1.5 rounded-[12px] flex items-center gap-1.5 active:scale-90 transition-all"
                                style={{
                                  background: isLight
                                    ? "rgba(0,0,0,0.06)"
                                    : "rgba(255,255,255,0.1)",
                                  color: isLight
                                    ? "rgba(30,20,80,0.55)"
                                    : "rgba(255,255,255,0.6)",
                                  border: isLight
                                    ? "1px solid rgba(0,0,0,0.12)"
                                    : "none",
                                }}
                              >
                                <Volume2 size={14} />
                                <span className="text-xs font-bold">
                                  読み上げ
                                </span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <h2
                              className="text-4xl font-black tracking-tight text-center"
                              style={{
                                color: isLight ? "rgba(20,10,60,0.9)" : "white",
                                lineHeight: 1.3,
                              }}
                            >
                              {getOptionLabel(
                                stageWords[currentIndex],
                                "en-ja"
                              )}
                            </h2>
                            <p
                              style={{
                                fontSize: 10,
                                opacity: 0.45,
                                letterSpacing: "0.1em",
                              }}
                            >
                              {["化学", "漢字", "古文"].includes(gameCategory)
                                ? "単語を選ぼう"
                                : "英単語を選ぼう"}
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 px-2">
                        <h2
                          className="text-base font-bold leading-relaxed text-center"
                          style={{
                            color: isLight
                              ? "rgba(20,10,60,0.85)"
                              : "rgba(255,255,255,0.9)",
                          }}
                        >
                          {(() => {
                            const sentence = stageWords[currentIndex].sentence;
                            const word = stageWords[currentIndex].en;
                            const blanked = formatSentence(sentence, word);
                            const parts = blanked.split("______");
                            return parts.map((part, i) =>
                              i < parts.length - 1 ? (
                                <span key={i}>
                                  {part}
                                  <span
                                    style={{
                                      display: "inline-block",
                                      minWidth: 72,
                                      borderBottom: `2.5px solid ${theme.accent}`,
                                      marginInline: 2,
                                      verticalAlign: "bottom",
                                    }}
                                  >
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                  </span>
                                </span>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            );
                          })()}
                        </h2>
                        <p
                          style={{
                            fontSize: 10,
                            color: isLight
                              ? "rgba(0,0,0,0.35)"
                              : "rgba(255,255,255,0.35)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {["化学", "漢字", "古文"].includes(gameCategory)
                            ? "▲ 空欄に入る単語を選ぼう"
                            : "▲ 空欄に入る英単語を選ぼう"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── 選択肢 ── */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "grid",
                      gridTemplateRows: `repeat(${options.length || 4}, 1fr)`,
                      gap: 10,
                    }}
                  >
                    {options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={!!feedback}
                        className={`rounded-[20px] text-lg font-black transition-all text-center flex items-center justify-center ${
                          !feedback
                            ? ""
                            : feedback === "correct" &&
                              opt.en === stageWords[currentIndex].en
                            ? "bg-green-500 text-white"
                            : feedback === "incorrect" &&
                              opt.en === stageWords[currentIndex].en
                            ? isLight
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-emerald-900 text-emerald-300"
                            : "opacity-20"
                        }`}
                        style={{
                          minHeight: 0,
                          ...(!feedback
                            ? {
                                background: isLight
                                  ? "rgba(255,255,255,0.85)"
                                  : "rgba(255,255,255,0.09)",
                                border: isLight
                                  ? "2px solid rgba(0,0,0,0.20)"
                                  : "1px solid rgba(255,255,255,0.15)",
                                color: isLight
                                  ? "rgba(30,20,80,0.85)"
                                  : "white",
                                boxShadow: isLight
                                  ? "0 2px 8px rgba(0,0,0,0.08)"
                                  : "none",
                              }
                            : {}),
                        }}
                      >
                        {gameMode === "meaning"
                          ? quizDirection === "en-ja"
                            ? getOptionLabel(opt, "en-ja")
                            : opt.en
                          : opt.en}
                      </button>
                    ))}
                  </div>

                  <div
                    aria-hidden="true"
                    style={{
                      position: "fixed",
                      left: "50%",
                      bottom: 0,
                      transform: "translateX(-50%)",
                      width: "100%",
                      maxWidth: 576,
                      height: "calc(var(--nav-height, 72px) + 18px)",
                      pointerEvents: "none",
                      zIndex: 0,
                      background: isLight
                        ? "linear-gradient(to top, rgba(255,255,255,0.92), rgba(255,255,255,0.52) 54%, transparent)"
                        : "linear-gradient(to top, rgba(8,10,18,0.96), rgba(8,10,18,0.58) 54%, transparent)",
                    }}
                  />

                  {/* ── やめる確認モーダル ── */}
                  {showQuitConfirm && (
                    <div
                      className="fixed inset-0 flex items-center justify-center z-50"
                      style={{
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div
                        className="mx-6 rounded-3xl p-7 flex flex-col items-center gap-5 text-center"
                        style={{
                          background: isLight
                            ? "rgba(255,255,255,0.98)"
                            : "rgba(20,14,40,0.96)",
                          border: isLight
                            ? "1.5px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: isLight
                            ? "0 20px 60px rgba(0,0,0,0.18)"
                            : "0 20px 60px rgba(0,0,0,0.6)",
                          maxWidth: 320,
                          width: "100%",
                        }}
                      >
                        {/* アイコン */}
                        <div
                          className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                          style={{
                            background: "rgba(244,63,94,0.15)",
                            border: "1px solid rgba(244,63,94,0.3)",
                          }}
                        >
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>

                        <div>
                          <p
                            className="font-black text-lg mb-1"
                            style={{
                              color: isLight ? "rgba(30,20,80,0.85)" : "white",
                            }}
                          >
                            本当にやめる？
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{
                              color: isLight
                                ? "rgba(30,20,80,0.50)"
                                : "rgba(255,255,255,0.45)",
                            }}
                          >
                            {currentIndex}問 正解 {correctCount} / スコア{" "}
                            {score}
                          </p>
                          <p
                            className="text-xs mt-1 font-bold"
                            style={{
                              color: isLight
                                ? "rgba(30,20,80,0.35)"
                                : "rgba(255,255,255,0.3)",
                            }}
                          >
                            ここまでの結果は記録されません
                          </p>
                        </div>

                        {/* ボタン2つ */}
                        <div className="flex flex-col gap-3 w-full">
                          <button
                            onClick={() => {
                              setShowQuitConfirm(false);
                              setScreen(
                                currentStage === "Custom" ||
                                  currentStage === "CustomPast"
                                  ? "customApp"
                                  : "stageMap"
                              );
                            }}
                            className="w-full py-3.5 rounded-[20px] font-black text-base active:scale-95 transition-all"
                            style={{
                              background: theme.accentGrad || theme.accent,
                              color: "white",
                              boxShadow: "0 4px 16px rgba(244,63,94,0.4)",
                            }}
                          >
                            やめる
                          </button>
                          <button
                            onClick={() => setShowQuitConfirm(false)}
                            className="w-full py-3.5 rounded-[20px] font-black text-base active:scale-95 transition-all"
                            style={{
                              background: isLight
                                ? "rgba(0,0,0,0.05)"
                                : "rgba(255,255,255,0.07)",
                              border: isLight
                                ? "1.5px solid rgba(0,0,0,0.18)"
                                : "1px solid rgba(255,255,255,0.12)",
                              color: isLight
                                ? "rgba(30,20,80,0.75)"
                                : "rgba(255,255,255,0.8)",
                            }}
                          >
                            続ける
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {screen === "result" && (
                <div
                  className="flex flex-col items-center justify-center animate-in fade-in text-center"
                  style={{
                    minHeight: "calc(100dvh - 120px)",
                    padding: "16px 0",
                  }}
                >
                  <div
                    className="rounded-[3rem] w-full text-center flex flex-col items-center justify-center gap-5"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.03)"
                        : "rgba(255,255,255,0.07)",
                      border: isLight
                        ? "1.5px solid rgba(0,0,0,0.15)"
                        : "1px solid rgba(255,255,255,0.12)",
                      padding: "32px 24px",
                    }}
                  >
                    <Trophy
                      size={56}
                      className="text-yellow-400 animate-bounce"
                    />
                    {stageClearedOccurred ? (
                      <div className="w-full text-center">
                        <span className="bg-emerald-600 text-white px-4 py-2.5 rounded-[20px] font-black shadow-xl uppercase tracking-wider text-base flex items-center justify-center gap-2 w-full">
                          <IcParty size={18} color="white" /> Mission Complete!
                        </span>
                      </div>
                    ) : (
                      lives <= 0 && (
                        <div className="w-full text-center">
                          <span className="bg-rose-600 text-white px-4 py-2.5 rounded-[20px] font-black shadow-xl uppercase tracking-wider text-base flex items-center justify-center gap-2 w-full">
                            <IcSkull size={18} color="white" /> Mission Failed
                          </span>
                        </div>
                      )
                    )}
                    <div
                      className="font-black leading-none text-center"
                      style={{
                        color: theme.accent,
                        fontSize: "clamp(5rem, 22vw, 8rem)",
                      }}
                    >
                      {score}
                    </div>
                    <div
                      className="w-full flex flex-col gap-2"
                      style={{ fontSize: "1rem", fontWeight: "700" }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2.5 rounded-[16px]"
                        style={{
                          background: `${theme.accent}18`,
                          border: `1px solid ${theme.accent}38`,
                        }}
                      >
                        <span
                          style={{
                            color: isLight
                              ? "rgba(88,28,135,0.8)"
                              : "rgba(255,255,255,0.7)",
                          }}
                        >
                          正解数
                        </span>
                        <span
                          style={{
                            color: theme.accent,
                            fontWeight: "900",
                          }}
                        >
                          {resultCorrectCount} 問
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between px-4 py-2.5 rounded-[16px]"
                        style={{
                          background: `${theme.accent}14`,
                          border: `1px solid ${theme.accent}33`,
                        }}
                      >
                        <span
                          style={{
                            color: isLight
                              ? "rgba(120,53,15,0.8)"
                              : "rgba(255,255,255,0.7)",
                          }}
                        >
                          獲得ポイント
                        </span>
                        <span
                          style={{
                            color: theme.accent,
                            fontWeight: "900",
                          }}
                        >
                          {resultEarnedPoints} pt
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between px-4 py-2.5 rounded-[16px]"
                        style={{
                          background: `${theme.accent}14`,
                          border: `1px solid ${theme.accent}33`,
                        }}
                      >
                        <span
                          style={{
                            color: isLight
                              ? "rgba(120,53,15,0.8)"
                              : "rgba(255,255,255,0.7)",
                          }}
                        >
                          獲得コイン
                        </span>
                        <span
                          style={{
                            color: theme.accent,
                            fontWeight: "900",
                          }}
                        >
                          {resultEarnedCoins} コイン
                        </span>
                      </div>
                    </div>
                    {levelUpOccurred && (
                      <div className="w-full p-4 bg-yellow-100 rounded-[2rem] flex items-center justify-center gap-3 border-4 border-yellow-200 text-yellow-800 font-black text-lg uppercase tracking-widest shadow-lg text-center">
                        <Award size={28} /> Level Up!
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setScreen(
                          currentStage === "Custom" ||
                            currentStage === "CustomPast"
                            ? "customApp"
                            : "stageMap"
                        )
                      }
                      className="w-full py-5 text-white rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all text-center"
                      style={{
                        background: theme.accentGrad || theme.accent,
                        color: "white",
                        boxShadow: `0 4px 20px ${theme.accent}55`,
                      }}
                    >
                      {currentStage === "Custom" ||
                      currentStage === "CustomPast"
                        ? "カスタム問題へ戻る"
                        : "ステージへ戻る"}
                    </button>
                  </div>
                </div>
              )}

              {/* --- フレンドリスト画面 --- */}
              {screen === "friendsList" && (
                <div className="space-y-8 animate-in fade-in text-left">
                  <div className="flex justify-between items-center px-2 text-left">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}
                        className="p-2 rounded-[12px] active:opacity-70 transition-all"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.07)"
                            : "rgba(255,255,255,0.08)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.1)"
                            : "1px solid rgba(255,255,255,0.1)",
                          color: isLight ? "rgba(20,10,60,0.7)" : "white",
                        }}
                      >
                        <ChevronLeft />
                      </button>
                      <h2
                        className="text-2xl font-black flex items-center gap-2 leading-none tracking-tight"
                        style={{
                          color: isLight ? "rgba(20,10,60,0.9)" : "white",
                        }}
                      >
                        <Users className="text-amber-400" size={28} /> フレンド
                      </h2>
                      <div className="text-xs font-black" style={{ color: theme.textMuted }}>
                        {friends.filter((f) => f.id !== user?.uid).length}人
                      </div>
                    </div>
                    <button
                      onClick={() => setScreen("addFriend")}
                      className="p-2.5 rounded-[12px] text-amber-300 active:opacity-70 transition-all"
                      style={{
                        background: "rgba(201,168,76,0.12)",
                        border: "1px solid rgba(99,102,241,0.25)",
                      }}
                    >
                      <UserPlus size={22} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {friends.length === 0 ? (
                      <p
                        className="p-16 text-center font-bold rounded-[20px] text-center"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.04)"
                            : "rgba(255,255,255,0.04)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.1)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: isLight
                            ? "rgba(0,0,0,0.3)"
                            : "rgba(255,255,255,0.3)",
                        }}
                      >
                        友達がまだいません
                      </p>
                    ) : (
                      friends
                        .filter((f) => f.id !== user?.uid)
                        .map((f) => {
                          const fp = leaderboard.find((l) => l.id === f.id);
                          const fAvatar = fp?.avatar || f.avatar || "👤";
                          const fColor = fp?.color || f.color || "bg-amber-500";
                          const fName = fp?.name || f.name;
                          const fIsTeacher = !!(fp?.isTeacher || f.isTeacher);
                          const fScore = fp?.score || 0;
                          const fStage = Math.max(
                            1,
                            ...Object.values(fp?.unlockedStages || {})
                              .map(Number)
                              .filter(Boolean)
                          );
                          return (
                            <div
                              key={f.id}
                              className="p-5 rounded-[20px] flex justify-between items-center group text-left"
                              style={{
                                background: isLight
                                  ? "rgba(0,0,0,0.03)"
                                  : "rgba(255,255,255,0.06)",
                                border: isLight
                                  ? "1px solid rgba(0,0,0,0.1)"
                                  : "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              <div className="flex items-center gap-6 text-left" style={{ cursor: "pointer" }} onClick={() => openFriendProfile(f)}>
                                <div
                                  style={{
                                    position: "relative",
                                    width: "64px",
                                    height: "64px",
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    className={`w-16 h-16 ${fColor} rounded-[1.5rem] flex items-center justify-center text-4xl shadow-lg border-4 border-white overflow-hidden`}
                                  >
                                    {fAvatar.startsWith("data:") ||
                                    fAvatar.startsWith("http") ? (
                                      <img
                                        src={fAvatar}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      fAvatar
                                    )}
                                  </div>
                                  {fIsTeacher && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        bottom: "-4px",
                                        right: "-4px",
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "50%",
                                        background:
                                          "linear-gradient(135deg,#f59e0b,#fbbf24)",
                                        border: "2px solid #1a1040",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        zIndex: 20,
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                                      }}
                                    >
                                      <IcCrownSm size={12} />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-black text-xl tracking-tight mb-1 text-left" style={{ color: theme.text }}>
                                    {fName}
                                  </p>
                                  <div className="flex items-center gap-3 text-left">
                                    <span
                                      className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase text-left"
                                      style={{
                                        background:
                                          "linear-gradient(135deg,#b8860b,#d4a020)",
                                        color: "#fff8e0",
                                      }}
                                    >
                                      Lv.{calcLevel(fScore)}
                                    </span>
                                    <span className="text-[11px] font-black text-slate-400 uppercase text-left">
                                      Stage {fStage}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setActiveFriend(f);
                                    setScreen("dm");
                                  }}
                                  className="p-2.5 text-amber-400 rounded-[12px] active:opacity-70 transition-all relative"
                                  style={{
                                    background: "rgba(201,168,76,0.18)",
                                  }}
                                >
                                  <MessageSquare size={20} />
                                  {(unreadDm[f.id] || 0) > 0 && (
                                    <span
                                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                                      style={{
                                        background: "#ef4444",
                                        border: "1.5px solid #1a1040",
                                      }}
                                    >
                                      {unreadDm[f.id] > 9
                                        ? "9+"
                                        : unreadDm[f.id]}
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRemoveFriend(f)}
                                  className="p-2.5 transition-all text-slate-300 hover:text-rose-400"
                                >
                                  <Trash2 size={24} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* --- IDで追加画面 --- */}
              {screen === "addFriend" && (
                <div className="space-y-8 animate-in fade-in text-left">
                  <div className="flex items-center gap-4 text-left">
                    <button
                      onClick={() => setScreen("plaza")}
                      className="p-2 rounded-[12px] active:opacity-70 transition-all"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.08)",
                        border: isLight
                          ? "1px solid rgba(0,0,0,0.15)"
                          : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <ChevronLeft />
                    </button>
                    <h2 className="text-4xl font-black leading-none text-left">
                      IDで追加
                    </h2>
                  </div>
                  <div
                    className="p-8 rounded-3xl space-y-6 text-left"
                    style={{
                      background: isLight
                        ? "rgba(0,0,0,0.03)"
                        : "rgba(255,255,255,0.06)",
                      border: isLight
                        ? "1px solid rgba(0,0,0,0.1)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="relative group text-left">
                      <Search
                        style={{
                          position: "absolute",
                          left: 24,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full p-5 pl-14 rounded-[20px] font-black text-sm outline-none font-mono text-left"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.05)"
                            : "rgba(255,255,255,0.08)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(255,255,255,0.12)",
                          color: theme.text,
                        }}
                        placeholder="6桁のFriend IDを入力"
                      />
                    </div>
                    <button
                      onClick={handleSearchById}
                      className="w-full py-6 text-white rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 transition-all text-center"
                      style={{
                        background: "linear-gradient(135deg,#b8860b,#e0c97f)",
                        color: "#1a0e00",
                        boxShadow: "0 6px 28px rgba(200,160,60,0.45)",
                      }}
                    >
                      ユーザー検索
                    </button>
                  </div>
                  {searchResult && (
                    <div
                      className="p-8 rounded-3xl flex flex-col items-center animate-in fade-in text-center mt-6"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.04)"
                          : "rgba(255,255,255,0.06)",
                        border: isLight
                          ? "1px solid rgba(0,0,0,0.1)"
                          : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <div
                        className={`w-28 h-28 ${searchResult.color} rounded-[2rem] flex items-center justify-center text-6xl mb-6 border-[6px] border-white shadow-2xl transform rotate-6 text-center`}
                      >
                        {searchResult.avatar}
                      </div>
                      <h3
                        className="text-3xl font-black mb-6 text-center"
                        style={{
                          color: isLight ? "rgba(20,10,60,0.9)" : "white",
                        }}
                      >
                        {searchResult.name}
                      </h3>
                      <button
                        onClick={() => handleAddFriend(searchResult)}
                        className="w-full py-6 text-white rounded-[2rem] font-black text-2xl shadow-xl text-center"
                        style={{
                          background: "linear-gradient(135deg,#b8860b,#e0c97f)",
                          color: "#1a0e00",
                          boxShadow: "0 6px 28px rgba(200,160,60,0.45)",
                        }}
                      >
                        追加する
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ━━━ 広場スクリーン ━━━ */}
              {screen === "plaza" && (
                <div
                  className="rx-home"
                  style={{
                    ["--accent" as any]: theme.accent,
                    ["--accent-soft" as any]: `${theme.accent}22`,
                    ["--ink" as any]: theme.text,
                    ["--ink-soft" as any]: theme.textMuted,
                    ["--card" as any]: isLight ? "#ffffff" : theme.card,
                    ["--line" as any]: theme.cardBorder,
                  }}
                >
                  {(() => {
                    const goto = (id) => { setPrevScreen("plaza"); setScreen(id); };
                    const openDm = (f) => { setActiveFriend(f); setPrevScreen("plaza"); setScreen("dm"); };
                    const av = (a) => {
                      if (typeof a === "string" && (a.startsWith("data:") || a.startsWith("http"))) return <img src={a} alt="" />;
                      const Av = AVATAR_ICONS[a];
                      return Av ? <Av size={22} color="currentColor" /> : <Users size={22} color="currentColor" />;
                    };
                    return (
                      <>
                        <div className="rx-topbar">
                          <div><div className="rx-greet">みんなと</div><div className="rx-title">ひろば</div><div className="rx-goal-s">フレンド {friends.length}人</div></div>
                          <button className="rx-streak" onClick={() => goto("addFriend")}>＋ フレンド追加</button>
                        </div>

                        <div className="rx-sec"><h3>トーク</h3></div>
                        {friends.length > 0 ? (
                          <div className="rx-talk">
                            {friends.map((f, idx) => (
                              <div className="rx-trow" key={f.uid || f.shortId || idx} onClick={() => openFriendProfile(f)}>
                                <div className="rx-av" style={{ boxShadow: frameShadow(stageCountOf((leaderboard || []).find((u) => u.id === f.uid || (f.shortId && u.shortId === f.shortId)) || f), 3) || undefined }}>{av(f.avatar)}</div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div className="rx-trow-nm">{f.name || "フレンド"}{f.isTeacher && <span className="rx-tbadge">先生</span>}</div>
                                  <div className="rx-trow-ls">タップでプロフィール</div>
                                </div>
                                <button className="rx-talkbtn" onClick={(e) => { e.stopPropagation(); openDm(f); }}>
                                  <MessageSquare size={15} color="#fff" /> トーク
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rx-peek">
                            <div className="rx-prow" onClick={() => goto("addFriend")}>
                              <div className="rx-av"><UserPlus size={20} color="currentColor" /></div>
                              <div className="rx-tx"><b>友だち・先生を追加</b> してトークを始めよう</div>
                              <div className="rx-tm">›</div>
                            </div>
                          </div>
                        )}

                        <div className="rx-sec" style={{ marginTop: 18 }}><h3>確認</h3></div>
                        <div className="rx-quick">
                          <div className="rx-q" onClick={() => goto("stats")}><div className="ic" style={{ background: "#FFF6E0", color: "#D69A12" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 19h16M7 16v-5M12 16V8M17 16v-3" /></svg></div><span>成績</span></div>
                          <div className="rx-q" onClick={() => { setPrevScreen("plaza"); setScreen("settingsApp"); }}><div className="ic" style={{ background: "#EFE9E1", color: "#8A7A66" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" /></svg></div><span>設定</span></div>
                          <div className="rx-q" onClick={() => goto("announcementsList")}><div className="ic" style={{ background: "#EDE9FF", color: "#6C5CE0", position: "relative" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 10v4h4l5 4V6L8 10z M16 9a3 3 0 0 1 0 6" /></svg>{(announcements || []).some((a) => !readAnnouncementIds.includes(a.id)) && <span style={{ position: "absolute", top: -3, right: -3, width: 12, height: 12, borderRadius: 999, background: "#ef4444", border: "2px solid #fff" }} />}</div><span>お知らせ</span></div>
                          <div className="rx-q" onClick={() => goto("factoryApp")}><div className="ic" style={{ background: "#FFF1E0", color: "#E08A1E" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 8h14v11H5z M9 8V5h6v3" /></svg></div><span>FACTORY</span></div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ランキング画面 */}
              {false && screen === "leaderboard" && (
                <div className="animate-in fade-in space-y-4 text-left pb-4">
                  <div className="flex items-center justify-between mb-0 shrink-0">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 20,
                            borderRadius: 99,
                            background: `linear-gradient(to bottom, ${theme.accent}, ${theme.accent}40)`,
                            boxShadow: `0 0 10px ${theme.accent}`,
                          }}
                        />
                        <h2
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            color: isLight
                              ? "rgba(10,5,40,0.92)"
                              : "rgba(255,255,255,0.95)",
                            lineHeight: 1,
                          }}
                        >
                          順位
                        </h2>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 600,
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            color: `${theme.accent}80`,
                            paddingTop: 3,
                          }}
                        >
                          Ranking
                        </span>
                      </div>
                      <div
                        style={{
                          height: 1,
                          background: `linear-gradient(to right, ${theme.accent}50, ${theme.accent}10, transparent)`,
                          marginLeft: 11,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="rounded-[20px] overflow-hidden text-left"
                    style={{
                      background: isLight
                        ? "#ffffff"
                        : "rgba(255,255,255,0.05)",
                      border: isLight
                        ? "1.5px solid rgba(0,0,0,0.12)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {leaderboard.length === 0 ? (
                      <p className="p-10 text-center text-white/30 font-bold">
                        データがありません
                      </p>
                    ) : (
                      leaderboard.map((e, i) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between px-4 py-3 transition-all text-left"
                          style={{
                            borderBottom: isLight
                              ? "1px solid rgba(0,0,0,0.07)"
                              : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center gap-3 text-left min-w-0">
                            <div className="w-8 shrink-0 flex items-center justify-center">
                              {i === 0 ? (
                                <svg
                                  width="28"
                                  height="28"
                                  viewBox="0 0 28 28"
                                  fill="none"
                                >
                                  <polygon
                                    points="14,2 17,10 26,10 19,15.5 21.5,24 14,19 6.5,24 9,15.5 2,10 11,10"
                                    fill="#f59e0b"
                                    stroke="#d97706"
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                  />
                                  <circle
                                    cx="14"
                                    cy="12"
                                    r="2.5"
                                    fill="#fef3c7"
                                    opacity="0.7"
                                  />
                                </svg>
                              ) : i === 1 ? (
                                <svg
                                  width="26"
                                  height="26"
                                  viewBox="0 0 26 26"
                                  fill="none"
                                >
                                  <circle
                                    cx="13"
                                    cy="13"
                                    r="11"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                  />
                                  <circle
                                    cx="13"
                                    cy="13"
                                    r="7"
                                    fill="#cbd5e1"
                                    opacity="0.3"
                                  />
                                  <text
                                    x="13"
                                    y="17.5"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="900"
                                    fill="#94a3b8"
                                  >
                                    2
                                  </text>
                                </svg>
                              ) : i === 2 ? (
                                <svg
                                  width="26"
                                  height="26"
                                  viewBox="0 0 26 26"
                                  fill="none"
                                >
                                  <circle
                                    cx="13"
                                    cy="13"
                                    r="11"
                                    fill="none"
                                    stroke="#cd7f32"
                                    strokeWidth="2"
                                  />
                                  <circle
                                    cx="13"
                                    cy="13"
                                    r="7"
                                    fill="#cd7f32"
                                    opacity="0.2"
                                  />
                                  <text
                                    x="13"
                                    y="17.5"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="900"
                                    fill="#cd7f32"
                                  >
                                    3
                                  </text>
                                </svg>
                              ) : (
                                <span
                                  className="text-sm font-black w-6 text-center"
                                  style={{
                                    color: isLight
                                      ? "rgba(0,0,0,0.45)"
                                      : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  {i + 1}
                                </span>
                              )}
                            </div>
                            <div className="relative w-12 h-12 shrink-0">
                              <div
                                className={`w-12 h-12 ${e.color} rounded-[20px] flex items-center justify-center shadow-md border-2 border-white overflow-hidden`}
                              >
                                {e.avatar?.startsWith("data:") ||
                                e.avatar?.startsWith("http") ? (
                                  <img
                                    src={e.avatar}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (() => {
                                    const AvIc = AVATAR_ICONS[e.avatar];
                                    return AvIc ? (
                                      <AvIc size={36} color="currentColor" />
                                    ) : (
                                      <IcDefaultUser
                                        size={32}
                                        color="rgba(255,255,255,0.8)"
                                      />
                                    );
                                  })()
                                )}
                              </div>
                              {e.isTeacher && (
                                <div
                                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#f59e0b,#fbbf24)",
                                    border: "2px solid #0f0c29",
                                    zIndex: 10,
                                  }}
                                >
                                  <IcCrownSm size={12} />
                                </div>
                              )}
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p
                                  className="font-black text-base tracking-tight leading-none text-left truncate max-w-[120px]"
                                  style={{
                                    color: isLight ? "#1a1035" : "white",
                                  }}
                                >
                                  {e.id === user?.uid
                                    ? "自分"
                                    : allUsersMap[e.id]?.name || e.name}
                                </p>
                                <span
                                  className="text-[10px] font-black px-2 py-0.5 rounded-lg uppercase shrink-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#b8860b,#d4a020)",
                                    color: "#fff8e0",
                                  }}
                                >
                                  Lv.{calcLevel(e.score)}
                                </span>
                              </div>
                              <p
                                className="text-[11px] font-bold uppercase tracking-wide text-left"
                                style={{
                                  color: isLight
                                    ? "rgba(0,0,0,0.45)"
                                    : "rgba(255,255,255,0.4)",
                                }}
                              >
                                {e.score?.toLocaleString()} pts
                              </p>
                            </div>
                          </div>
                          <p
                            className="font-black text-lg tracking-tight text-right shrink-0 ml-2"
                            style={{ color: isLight ? "#b45309" : "#fbbf24" }}
                          >
                            {e.score?.toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 先生用管理画面 */}
              {screen === "admin" &&
                (() => {
                  if (!inviteCodeFetched) fetchInviteCode();
                  return null;
                })()}
              {screen === "admin" && (
                <div className="space-y-5 animate-in fade-in text-left" style={{ background: "linear-gradient(180deg,#2a2152,#1c123f)", borderRadius: 24, padding: "20px 16px", color: "#fff", boxShadow: "0 14px 40px rgba(28,18,63,.22)" }}>
                  <div className="flex justify-between items-end px-2 text-left">
                    <h2
                      className="text-2xl font-black leading-none"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      先生用管理
                    </h2>
                    <button
                      onClick={() => setScreen("start")}
                      className="p-3 rounded-[12px] font-black uppercase text-[10px] flex items-center gap-2 text-center active:opacity-70"
                      style={{
                        background: "rgba(255,255,255,0.14)",
                        color: "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(255,255,255,0.22)",
                      }}
                    >
                      <Home size={18} /> 終了
                    </button>
                  </div>
                  <div
                    className="rounded-[20px] p-6 text-white space-y-4 relative overflow-hidden text-left"
                    style={{
                      background: "linear-gradient(135deg,#b8860b,#e0c97f)",
                      boxShadow: "0 4px 24px rgba(201,168,76,0.4)",
                    }}
                  >
                    <Megaphone
                      size={192}
                      style={{
                        position: "absolute",
                        right: -48,
                        bottom: -48,
                        opacity: 0.1,
                        transform: "rotate(12deg)",
                        pointerEvents: "none",
                      }}
                    />
                    <h3 className="font-black text-xl flex items-center gap-3 leading-none text-left">
                      <Megaphone size={32} /> お知らせの投稿
                    </h3>
                    <textarea
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="w-full p-4 rounded-[20px] text-base outline-none transition-all min-h-[100px] text-left"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.1)",
                        border: isLight
                          ? "1px solid rgba(0,0,0,0.15)"
                          : "1px solid rgba(255,255,255,0.2)",
                        color: theme.text,
                      }}
                    />
                    <button
                      onClick={handleAddAnnouncement}
                      className="w-full py-3.5 rounded-[12px] font-black text-base active:opacity-80 transition-all text-center"
                      style={{
                        background: theme.card,
                        border: `1px solid ${theme.cardBorder}`,
                        color: theme.accent,
                      }}
                    >
                      送信
                    </button>
                  </div>
                  <div
                    className="rounded-[20px] p-6 space-y-4 text-left"
                    style={{
                      background: "rgba(16,185,129,0.07)",
                      border: "1px solid rgba(16,185,129,0.25)",
                    }}
                  >
                    <h3 className="font-black text-xl flex items-center gap-3 text-emerald-300">
                      <IcKey size={14} color="currentColor" /> 招待コード管理
                    </h3>
                    <p className="text-white/30 text-xs font-bold">
                      生徒はこのコードがないと登録できません。変更すると以前のコードは使えなくなります。
                    </p>
                    <div
                      className="rounded-[12px] p-4 text-center"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-2">
                        <IcArrowDown size={13} color="currentColor" />{" "}
                        生徒に伝えるコード
                      </p>
                      <code
                        className="font-mono font-black text-3xl text-emerald-300"
                        style={{ letterSpacing: "0.25em" }}
                      >
                        {inviteCode || "読み込み中..."}
                      </code>
                      <p className="text-[11px] text-emerald-400/50 font-bold mt-2">
                        登録画面で入力してもらう
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingInviteCode}
                        onChange={(e) =>
                          setEditingInviteCode(e.target.value.toUpperCase())
                        }
                        placeholder="新しいコードを入力"
                        maxLength={20}
                        className="flex-1 px-4 py-3 rounded-[12px] font-mono font-black text-sm outline-none tracking-widest"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.05)"
                            : "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          color: theme.text,
                        }}
                      />
                      <button
                        onClick={saveInviteCode}
                        disabled={
                          isSavingInviteCode || !editingInviteCode.trim()
                        }
                        className="px-5 py-3 rounded-[12px] font-black text-sm active:opacity-80 transition-all"
                        style={{
                          background: "linear-gradient(135deg,#059669,#10b981)",
                          color: "white",
                        }}
                      >
                        {isSavingInviteCode ? "..." : "更新"}
                      </button>
                    </div>
                  </div>

                  {/* ━━ Googleスプレッドシートから単語インポート ━━ */}
                  <div
                    className="rounded-[20px] p-6 space-y-4 text-left"
                    style={{
                      background: "rgba(16,185,129,0.06)",
                      border: "1px solid rgba(16,185,129,0.22)",
                    }}
                  >
                    <h3 className="font-black text-xl flex items-center gap-3 text-emerald-300">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      スプレッドシートから単語を追加
                    </h3>

                    {/* 機能説明 */}
                    <div
                      className="rounded-[12px] p-4 space-y-2"
                      style={{
                        background: "rgba(240,165,0,0.08)",
                        border: "1px solid rgba(240,165,0,0.20)",
                      }}
                    >
                      <p className="text-xs font-black text-amber-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BookOpen size={13} /> この機能でできること
                      </p>
                      {[
                        [
                          "一括インポート",
                          "GoogleスプレッドシートのURLを貼るだけで単語を一括登録できます",
                          <FileUp size={14} />,
                        ],
                        [
                          "プレビュー確認",
                          "登録前に内容を確認。エラー行も表示されます",
                          <BookOpen size={14} />,
                        ],
                        [
                          "追加登録",
                          "既存の単語はそのままに、新しい単語を追記します",
                          <Plus size={14} />,
                        ],
                        [
                          "全置換",
                          "既存の単語をすべて削除してから新しい単語を登録します",
                          <RotateCcw size={14} />,
                        ],
                      ].map(([title, desc, icon], i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-amber-400/70 shrink-0 mt-0.5">
                            {icon}
                          </span>
                          <div>
                            <span className="text-xs font-black text-white/70">
                              {title}
                            </span>
                            <p className="text-[10px] text-white/40 font-bold mt-0.5">
                              {desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 公開手順 */}
                    <div
                      className="rounded-[12px] p-4 space-y-2"
                      style={{
                        background: "rgba(99,102,241,0.08)",
                        border: "1px solid rgba(99,102,241,0.20)",
                      }}
                    >
                      <p className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Settings size={13} /> スプレッドシートの公開手順
                      </p>
                      {[
                        "① Googleスプレッドシートを開く",
                        "② メニュー「ファイル」→「共有」→「ウェブに公開」",
                        "③「リンクを取得」で表示されたURLをコピー",
                        "④ 下のURL入力欄に貼り付けて「プレビュー」を押す",
                      ].map((step, i) => (
                        <p key={i} className="text-xs text-white/60 font-bold">
                          {step}
                        </p>
                      ))}
                      <p className="text-[10px] text-red-400/70 font-bold mt-2">
                        ⚠
                        「ウェブに公開」しないと読み込めません（「共有」の「リンクをコピー」とは別です）
                      </p>
                    </div>

                    {/* 使い方説明 */}
                    <div
                      className="rounded-[12px] p-4 space-y-2"
                      style={{
                        background: "rgba(16,185,129,0.10)",
                        border: "1px solid rgba(16,185,129,0.20)",
                      }}
                    >
                      <p className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Layers size={13} /> スプレッドシートの列の形式
                      </p>
                      <div
                        className="rounded-lg overflow-hidden text-xs font-mono"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="grid grid-cols-3 gap-0">
                          {[
                            "A列: 英単語",
                            "B列: 日本語訳",
                            "C列: 例文（任意）",
                          ].map((h, i) => (
                            <div
                              key={i}
                              className="px-3 py-2 text-emerald-400 font-black border-b"
                              style={{
                                borderColor: "rgba(16,185,129,0.2)",
                                background: "rgba(16,185,129,0.12)",
                              }}
                            >
                              {h}
                            </div>
                          ))}
                          {["achieve", "達成する", "He achieved his goal."].map(
                            (v, i) => (
                              <div
                                key={i}
                                className="px-3 py-2 text-white/60"
                                style={{
                                  borderColor: "rgba(255,255,255,0.05)",
                                }}
                              >
                                {v}
                              </div>
                            )
                          )}
                          {[
                            "benefit",
                            "利益・恩恵",
                            "Fresh air is a benefit.",
                          ].map((v, i) => (
                            <div
                              key={i}
                              className="px-3 py-2 text-white/40 text-[10px]"
                            >
                              {v}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-white/40 font-bold">
                        ※
                        1行目はヘッダー行（見出し）として無視されます。2行目から単語データを入力してください。
                      </p>
                    </div>

                    {/* URLとステージ入力 */}
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={sheetUrl}
                        onChange={(e) => {
                          setSheetUrl(e.target.value);
                          setSheetPreview(null);
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full px-4 py-3 rounded-[12px] text-sm font-mono outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(16,185,129,0.30)",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      />
                      <div className="flex gap-3 items-center">
                        <label className="text-xs font-black text-white/50 whitespace-nowrap">
                          ステージ番号
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={sheetStage}
                          onChange={(e) =>
                            setSheetStage(Number(e.target.value))
                          }
                          className="w-20 px-3 py-2 rounded-[12px] text-sm font-black outline-none text-center"
                          style={{
                            background: isLight
                              ? "rgba(0,0,0,0.05)"
                              : "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(16,185,129,0.25)",
                            color: theme.text,
                          }}
                        />
                        <button
                          onClick={() => importFromSheet(sheetUrl, sheetStage)}
                          disabled={!sheetUrl.trim() || sheetImporting}
                          className="flex-1 py-2.5 rounded-[12px] font-black text-sm active:opacity-80 transition-all"
                          style={{
                            background: sheetUrl.trim()
                              ? "linear-gradient(135deg,#059669,#10b981)"
                              : isLight
                              ? "rgba(0,0,0,0.06)"
                              : "rgba(255,255,255,0.08)",
                            color: sheetUrl.trim() ? "white" : theme.text,
                          }}
                        >
                          {sheetImporting ? "読み込み中..." : "プレビュー"}
                        </button>
                      </div>
                    </div>

                    {/* プレビュー */}
                    {sheetPreview && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-emerald-300">
                            {sheetPreview.words.length}語を検出
                            {sheetPreview.errors.length > 0 && (
                              <span className="text-red-400 ml-2">
                                ({sheetPreview.errors.length}行エラー)
                              </span>
                            )}
                          </p>
                        </div>
                        {/* エラー表示 */}
                        {sheetPreview.errors.length > 0 && (
                          <div
                            className="rounded-[12px] p-3 space-y-1"
                            style={{
                              background: "rgba(239,68,68,0.10)",
                              border: "1px solid rgba(239,68,68,0.25)",
                            }}
                          >
                            {sheetPreview.errors.map((e, i) => (
                              <p
                                key={i}
                                className="text-xs text-red-400 font-bold"
                              >
                                {e}
                              </p>
                            ))}
                          </div>
                        )}
                        {/* 単語プレビュー（最大5件） */}
                        <div
                          className="rounded-[12px] overflow-hidden"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          {sheetPreview.words.slice(0, 5).map((w, i) => (
                            <div
                              key={i}
                              className="flex gap-4 px-4 py-2.5 text-sm"
                              style={{
                                background:
                                  i % 2 === 0
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(255,255,255,0.02)",
                                borderBottom:
                                  i < 4
                                    ? "1px solid rgba(255,255,255,0.06)"
                                    : "none",
                              }}
                            >
                              <span className="font-black text-white w-28 shrink-0">
                                {w.en}
                              </span>
                              <span className="text-white/60 w-24 shrink-0">
                                {w.ja}
                              </span>
                              <span className="text-white/35 text-xs truncate">
                                {w.sentence}
                              </span>
                            </div>
                          ))}
                          {sheetPreview.words.length > 5 && (
                            <div
                              className="px-4 py-2 text-xs text-white/30 font-bold"
                              style={{ background: "rgba(255,255,255,0.02)" }}
                            >
                              ...他 {sheetPreview.words.length - 5} 語
                            </div>
                          )}
                        </div>
                        {/* 登録ボタン */}
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              commitSheetImport(sheetPreview.words, false)
                            }
                            disabled={
                              sheetImporting || sheetPreview.words.length === 0
                            }
                            className="flex-1 py-3 rounded-[12px] font-black text-sm active:opacity-80 transition-all"
                            style={{
                              background:
                                "linear-gradient(135deg,#059669,#10b981)",
                              color: "white",
                            }}
                          >
                            {sheetImporting
                              ? "登録中..."
                              : `➕ 追加登録（${sheetPreview.words.length}語）`}
                          </button>
                          <button
                            onClick={() =>
                              commitSheetImport(sheetPreview.words, true)
                            }
                            disabled={
                              sheetImporting || sheetPreview.words.length === 0
                            }
                            className="flex-1 py-3 rounded-[12px] font-black text-sm active:opacity-80 transition-all"
                            style={{
                              background:
                                "linear-gradient(135deg,#dc2626,#ef4444)",
                              color: "white",
                            }}
                          >
                            {sheetImporting ? "..." : "全置換"}
                          </button>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold text-center">
                          「追加登録」は既存に追記、「全置換」は既存を全削除してから登録します
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-[20px] p-6 space-y-4 text-left"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-xl flex items-center gap-3 text-amber-300">
                        <Lock size={22} /> パスワード一覧
                      </h3>
                      <button
                        onClick={() => {
                          if (!showPasswordList) fetchPasswordList();
                          setShowPasswordList(!showPasswordList);
                        }}
                        className="px-4 py-2 rounded-[12px] font-black text-xs active:opacity-70 transition-all"
                        style={{
                          background: "rgba(201,168,76,0.25)",
                          color: "rgba(165,180,252,1)",
                          border: "1px solid rgba(99,102,241,0.4)",
                        }}
                      >
                        {showPasswordList ? "隠す" : "表示する"}
                      </button>
                    </div>
                    {showPasswordList && (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {isLoadingPasswords ? (
                          <p className="text-white/30 text-sm font-bold text-center py-4">
                            読み込み中...
                          </p>
                        ) : passwordList.length === 0 ? (
                          <p className="text-white/30 text-sm font-bold text-center py-4">
                            ユーザーなし
                          </p>
                        ) : (
                          passwordList.map((u) => (
                            <div
                              key={u.uid}
                              className="flex items-center justify-between p-3 rounded-[12px]"
                              style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-[12px] flex items-center justify-center text-sm overflow-hidden shrink-0 ${
                                    u.avatar?.startsWith("data:")
                                      ? ""
                                      : u.color || "bg-amber-500"
                                  }`}
                                >
                                  {u.avatar?.startsWith("data:") ? (
                                    <img
                                      src={u.avatar}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    u.avatar || "👤"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold text-sm leading-none truncate">
                                    {u.name}
                                  </p>
                                  <p className="text-white/30 text-[10px] font-bold font-mono">
                                    {u.shortId}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-amber-300 font-mono font-black text-sm">
                                  {u.password}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="rounded-[20px] p-6 space-y-4 text-left"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    <h3 className="font-black text-xl flex items-center gap-3 text-indigo-300">
                      <User size={22} /> 先生管理
                    </h3>
                    <p className="text-white/30 text-xs font-bold">
                      自分以外の先生アカウントを削除できます。
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teacherList.filter((t) => t.uid !== user?.uid).length ===
                      0 ? (
                        <p className="text-white/30 text-sm font-bold text-center py-4">
                          他の先生なし
                        </p>
                      ) : (
                        teacherList
                          .filter((t) => t.uid !== user?.uid)
                          .map((t) => (
                            <div
                              key={t.uid}
                              className="flex items-center justify-between p-3 rounded-[12px]"
                              style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-[12px] flex items-center justify-center text-sm overflow-hidden shrink-0 ${
                                    t.avatar?.startsWith("data:")
                                      ? ""
                                      : t.color || "bg-indigo-500"
                                  }`}
                                >
                                  {t.avatar?.startsWith("data:") ? (
                                    <img
                                      src={t.avatar}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    t.avatar || "👤"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold text-sm leading-none truncate">
                                    {t.name ||
                                      allUsersMap[t.uid]?.name ||
                                      "（名前なし）"}
                                  </p>
                                  <p className="text-indigo-300/50 text-[10px] font-bold font-mono">
                                    {t.shortId || t.uid?.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleDeleteUser(
                                    t.uid,
                                    t.shortId || t.uid?.slice(0, 8)
                                  )
                                }
                                className="p-2 rounded-[12px] text-rose-400 active:opacity-70 transition-all shrink-0 ml-2"
                                style={{
                                  background: "rgba(239,68,68,0.15)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div
                    className="rounded-[20px] p-6 space-y-4 text-left"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <h3 className="font-black text-xl flex items-center gap-3 text-rose-400">
                      <Trash2 size={22} /> ユーザー管理
                    </h3>
                    <div
                      className="flex items-center gap-2 text-[11px] font-bold"
                      style={{ color: "rgba(201,168,76,0.7)" }}
                    >
                      <MessageSquare size={12} />
                      <IcSpeech size={13} color="#c9a84c" />=
                      つぶやき・発言権限（タップでON/OFF）
                    </div>
                    {/* 一括コイン配布 */}
                    <div
                      className="rounded-[12px] p-3 flex items-center gap-2"
                      style={{
                        background: "rgba(250,204,21,0.08)",
                        border: "1px solid rgba(250,204,21,0.2)",
                      }}
                    >
                      <IcCoin size={20} color="#facc15" />
                      <span className="text-yellow-300 font-black text-xs flex-1">
                        全員に一括配布
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={coinInputs["__all__"] ?? ""}
                        onChange={(e) =>
                          setCoinInputs((prev) => ({
                            ...prev,
                            __all__: e.target.value,
                          }))
                        }
                        className="w-16 px-2 py-1.5 rounded-lg outline-none font-black text-yellow-300 text-xs"
                        style={{
                          background: "rgba(250,204,21,0.15)",
                          border: "1px solid rgba(250,204,21,0.3)",
                        }}
                        placeholder="pt"
                      />
                      <button
                        onClick={async () => {
                          const amt = parseInt(coinInputs["__all__"], 10);
                          if (!amt || amt <= 0) {
                            showToast(
                              "配布ポイントを入力してください",
                              "error"
                            );
                            return;
                          }
                          if (
                            !window.confirm(
                              `全ユーザー(${leaderboard.length}人)に${amt}ptを配布しますか？`
                            )
                          )
                            return;
                          for (const u of leaderboard) {
                            await handleGiveCoins(
                              u.uid || u.id,
                              u.name,
                              amt
                            ).catch(() => null);
                          }
                          setCoinInputs((prev) => ({ ...prev, __all__: "" }));
                        }}
                        className="px-3 py-1.5 rounded-[12px] font-black text-xs text-yellow-900 active:opacity-70 transition-all"
                        style={{
                          background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
                        }}
                      >
                        配布
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {leaderboard.length === 0 ? (
                        <p className="text-white/30 text-sm font-bold text-center py-4">
                          ユーザーなし
                        </p>
                      ) : (
                        leaderboard.map((u) => (
                          <div
                            key={u.uid || u.shortId}
                            className="flex items-center justify-between p-3 rounded-[12px]"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                style={{
                                  position: "relative",
                                  width: "32px",
                                  height: "32px",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  className={`w-8 h-8 rounded-[12px] flex items-center justify-center text-sm overflow-hidden ${
                                    u.avatar?.startsWith("data:")
                                      ? ""
                                      : u.color || "bg-amber-500"
                                  }`}
                                >
                                  {u.avatar?.startsWith("data:") ? (
                                    <img
                                      src={u.avatar}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    u.avatar || "👤"
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm leading-none">
                                  {(u.uid || u.id) === user?.uid
                                    ? "自分"
                                    : u.name}
                                </p>
                                <p className="text-white/30 text-[10px] font-bold">
                                  {u.shortId}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div
                                className="flex items-center gap-1 rounded-[12px] overflow-hidden"
                                style={{
                                  background: "rgba(250,204,21,0.12)",
                                  border: "1px solid rgba(250,204,21,0.25)",
                                }}
                              >
                                <input
                                  type="number"
                                  min="1"
                                  max="9999"
                                  value={coinInputs[u.uid || u.id] ?? ""}
                                  onChange={(e) =>
                                    setCoinInputs((prev) => ({
                                      ...prev,
                                      [u.uid || u.id]: e.target.value,
                                    }))
                                  }
                                  className="w-14 px-2 py-1.5 bg-transparent outline-none font-black text-yellow-300 text-xs"
                                  placeholder="pt"
                                />
                                <button
                                  onClick={() => {
                                    const amt = parseInt(
                                      coinInputs[u.uid || u.id],
                                      10
                                    );
                                    if (!amt || amt <= 0) {
                                      showToast(
                                        "配布ポイントを入力してください",
                                        "error"
                                      );
                                      return;
                                    }
                                    handleGiveCoins(u.uid || u.id, u.name, amt);
                                    setCoinInputs((prev) => ({
                                      ...prev,
                                      [u.uid || u.id]: "",
                                    }));
                                  }}
                                  className="px-2 py-1.5 font-black text-[11px] text-yellow-900 active:opacity-70 transition-all"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#f59e0b,#fbbf24)",
                                  }}
                                  title="コインを配布"
                                >
                                  <IcCoin size={14} color="#92400e" />
                                </button>
                              </div>
                              <button
                                onClick={() =>
                                  handleToggleChatPermission(u.uid || u.id)
                                }
                                className="p-2 rounded-[12px] active:opacity-70 transition-all shrink-0"
                                title={
                                  (chatSettings.allowedUids || []).includes(
                                    u.uid || u.id
                                  )
                                    ? "発言権限を剥奪"
                                    : "発言権限を付与"
                                }
                                style={
                                  (chatSettings.allowedUids || []).includes(
                                    u.uid || u.id
                                  )
                                    ? {
                                        background: "rgba(201,168,76,0.2)",
                                        border:
                                          "1px solid rgba(201,168,76,0.4)",
                                      }
                                    : {
                                        background: "rgba(255,255,255,0.06)",
                                        border:
                                          "1px solid rgba(255,255,255,0.12)",
                                      }
                                }
                              >
                                <MessageSquare
                                  size={16}
                                  style={{
                                    color: (
                                      chatSettings.allowedUids || []
                                    ).includes(u.uid || u.id)
                                      ? "#c9a84c"
                                      : "rgba(255,255,255,0.25)",
                                  }}
                                />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteUser(u.uid || u.id, u.shortId)
                                }
                                className="p-2 rounded-[12px] text-rose-400 active:opacity-70 transition-all"
                                style={{
                                  background: "rgba(239,68,68,0.15)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== 設定画面 ===== */}
              {screen === "settingsApp" && (
                <div
                  className="animate-in fade-in"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingBottom: 60,
                    background: theme.bg,
                  }}
                >
                  {/* ヘッダー */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}
                      className="p-2 rounded-[12px] active:opacity-70 transition-all"
                      style={{
                        background: isLight
                          ? "rgba(30,20,80,0.07)"
                          : "rgba(255,255,255,0.08)",
                        border: `1px solid ${
                          isLight
                            ? "rgba(30,20,80,0.12)"
                            : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      <ChevronLeft size={20} style={{ color: theme.text }} />
                    </button>
                    <h2
                      className="text-2xl font-black"
                      style={{ color: theme.text }}
                    >
                      設定
                    </h2>
                  </div>

                  {/* ── プロフィール ── */}
                  <div
                    className="rounded-[20px] p-5 mb-4"
                    style={{
                      background: isLight
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-4"
                      style={{ color: theme.textMuted }}
                    >
                      プロフィール再設定
                    </p>

                    {/* ── ニックネーム変更 ── */}
                    <div
                      className="mb-5 pb-5"
                      style={{ borderBottom: `1px solid ${theme.cardBorder}` }}
                    >
                      <p
                        className="text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ color: theme.textMuted }}
                      >
                        ニックネーム
                      </p>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-14 h-14 ${
                            avatarImage ? "" : selectedColor.bg
                          } rounded-[20px] flex items-center justify-center overflow-hidden shrink-0`}
                          style={{ border: `2px solid ${theme.accent}44` }}
                        >
                          {avatarImage ? (
                            <img
                              src={avatarImage}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (() => {
                              const AvatarIc =
                                AVATAR_ICONS[selectedAvatar.char];
                              return AvatarIc ? (
                                <AvatarIc size={34} color="currentColor" />
                              ) : (
                                <span style={{ fontSize: 28 }}>
                                  {selectedAvatar.char}
                                </span>
                              );
                            })()
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="ニックネーム"
                            className="w-full px-4 py-3 rounded-[12px] font-black text-base outline-none"
                            style={{
                              background: isLight
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(255,255,255,0.07)",
                              border: `1.5px solid ${theme.cardBorder}`,
                              color: theme.text,
                            }}
                          />
                          <p
                            className="text-xs mt-1.5 font-bold"
                            style={{ color: theme.textMuted }}
                          >
                            ID: {profile?.shortId || "------"}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p
                          className="text-[10px] font-black uppercase tracking-widest mb-2"
                          style={{ color: theme.textMuted }}
                        >
                          {"\u81ea\u5df1\u7d39\u4ecb"}
                        </p>
                        <textarea
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="\u81ea\u5df1\u7d39\u4ecb"
                          maxLength={160}
                          className="w-full px-4 py-3 rounded-[12px] font-bold text-sm outline-none"
                          style={{
                            minHeight: 86,
                            resize: "vertical",
                            background: isLight
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(255,255,255,0.07)",
                            border: `1.5px solid ${theme.cardBorder}`,
                            color: theme.text,
                          }}
                        />
                        <p className="text-[10px] font-bold mt-1" style={{ color: theme.textMuted }}>
                          {profileBio.length}/160
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!newName.trim()) return;
                          setIsSavingProfile(true);
                          const updated = {
                            ...profile,
                            name: newName.trim(),
                            displayName: newName.trim(),
                            bio: profileBio.trim(),
                          };
                          setProfile(updated);
                          saveLocal("profile", updated);
                          if (user && fb.enabled) {
                            try {
                              // プロフィール本体を更新
                              await setDoc(
                                doc(
                                  fb.db,
                                  "artifacts",
                                  fb.appId,
                                  "users",
                                  user.uid,
                                  "profile",
                                  "main"
                                ),
                                updated,
                                { merge: true }
                              );
                              // ランキング（leaderboard）に名前を反映
                              if (!updated.isTeacher) {
                                await setDoc(
                                  doc(
                                    fb.db,
                                    "artifacts",
                                    fb.appId,
                                    "public",
                                    "data",
                                    "customApp",
                                    user.uid
                                  ),
                                  {
                                    name: updated.name,
                                    displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                    color: updated.color,
                                  },
                                  { merge: true }
                                );
                              } else {
                                // 先生はteacherIndexに名前を反映（称え場の名前解決用）
                                await setDoc(
                                  doc(
                                    fb.db,
                                    "artifacts",
                                    fb.appId,
                                    "public",
                                    "data",
                                    "teacherIndex",
                                    user.uid
                                  ),
                                  {
                                    name: updated.name,
                                    displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                    color: updated.color,
                                  },
                                  { merge: true }
                                ).catch(() => null);
                              }
                              // 自分のフレンド全員の名簿にも名前を反映
                              const myFriendsSnap = await getDocs(
                                collection(
                                  fb.db,
                                  "artifacts",
                                  fb.appId,
                                  "users",
                                  user.uid,
                                  "friends"
                                )
                              );
                              await Promise.allSettled(
                                myFriendsSnap.docs.map((fd) =>
                                  setDoc(
                                    doc(
                                      fb.db,
                                      "artifacts",
                                      fb.appId,
                                      "users",
                                      fd.id,
                                      "friends",
                                      user.uid
                                    ),
                                    {
                                      name: updated.name,
                                      displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                      color: updated.color,
                                    },
                                    { merge: true }
                                  ).catch(() => null)
                                )
                              );
                            } catch {}
                          }
                          // ローカルのleaderboard stateも即時反映（FirestoreのonSnapshot遅延対策）
                          setLeaderboard((prev) =>
                            prev.map((entry) =>
                              entry.id === user?.uid || entry.uid === user?.uid
                                ? {
                                    ...entry,
                                    name: updated.name,
                                    displayName: updated.displayName,
                                  }
                                : entry
                            )
                          );
                          // allUsersMapも即時反映
                          setAllUsersMap((prev) => ({
                            ...prev,
                            [user.uid]: {
                              ...prev[user.uid],
                              name: updated.name,
                              bio: updated.bio || prev[user.uid]?.bio || "",
                              avatar:
                                updated.avatar || prev[user.uid]?.avatar || "",
                              color:
                                updated.color || prev[user.uid]?.color || "",
                              isTeacher: !!updated.isTeacher,
                            },
                          }));
                          setIsSavingProfile(false);
                          showToast("ニックネームを保存しました！");
                        }}
                        disabled={isSavingProfile || !newName.trim()}
                        className="w-full py-3 rounded-[12px] font-black text-white text-sm active:scale-95 transition-all disabled:opacity-40"
                        style={{
                          background: `linear-gradient(135deg,${theme.accent}cc,${theme.accent})`,
                          boxShadow: `0 4px 16px ${theme.accent}44`,
                        }}
                      >
                        {isSavingProfile ? "保存中..." : "ニックネームを保存"}
                      </button>
                    </div>

                    {/* ── アバター変更 ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: theme.textMuted }}
                        >
                          アバター
                        </p>
                        <label
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer active:opacity-70"
                          style={{
                            background: "rgba(201,168,76,0.12)",
                            border: "1px solid rgba(201,168,76,0.3)",
                          }}
                        >
                          <IcCamera size={11} color="#f59e0b" />
                          <span className="text-[10px] font-black text-amber-400">
                            写真
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                const compressed = await compressImage(
                                  ev.target.result
                                );
                                setAvatarImage(compressed);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      {avatarImage && (
                        <button
                          onClick={() => setAvatarImage(null)}
                          className="w-full mb-2 py-1.5 rounded-lg text-[11px] font-bold text-rose-400"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          写真を削除してアイコンを使う
                        </button>
                      )}
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {AVATARS.map((a) => {
                          const AvatarIc = AVATAR_ICONS[a.char];
                          const isSel =
                            !avatarImage && selectedAvatar.char === a.char;
                          return (
                            <button
                              key={a.char}
                              onClick={() => {
                                setSelectedAvatar(a);
                                setAvatarImage(null);
                              }}
                              className="flex flex-col items-center gap-1 py-2 rounded-[12px] transition-all active:scale-95"
                              style={{
                                background: isSel
                                  ? "rgba(201,168,76,0.18)"
                                  : "rgba(100,116,139,0.07)",
                                border: isSel
                                  ? "2px solid #f59e0b"
                                  : "2px solid transparent",
                              }}
                            >
                              {AvatarIc ? (
                                <AvatarIc size={28} color="currentColor" />
                              ) : (
                                <span style={{ fontSize: 22 }}>{a.char}</span>
                              )}
                              <span
                                className="text-[8px] font-black"
                                style={{ color: isSel ? "#b45309" : "#94a3b8" }}
                              >
                                {a.label || a.char}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Lv10解放帽子アバター */}
                      {(() => {
                        const unlockedHatAvatars = Object.values(
                          PET_HAT_AVATARS
                        ).filter((ha) => {
                          const petId = ha.char.replace("_hat", "");
                          const pd = getPetData(petId);
                          return getPetLvFromAffection(pd.affection || 0) >= 10;
                        });
                        if (unlockedHatAvatars.length === 0) return null;
                        return (
                          <>
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <IcHat size={11} /> Lv10解放アバター
                            </p>
                            <div className="grid grid-cols-5 gap-2 mb-4">
                              {unlockedHatAvatars.map((ha) => {
                                const HatIc = ha.component;
                                const isSel =
                                  !avatarImage &&
                                  selectedAvatar.char === ha.char;
                                return (
                                  <button
                                    key={ha.char}
                                    onClick={() => {
                                      setSelectedAvatar(ha);
                                      setAvatarImage(null);
                                    }}
                                    className="flex flex-col items-center gap-1 py-2 rounded-[12px] transition-all active:scale-95"
                                    style={{
                                      background: isSel
                                        ? "rgba(201,168,76,0.18)"
                                        : "rgba(245,158,11,0.07)",
                                      border: isSel
                                        ? "2px solid #f59e0b"
                                        : "2px solid rgba(245,158,11,0.3)",
                                    }}
                                  >
                                    <HatIc size={28} />
                                    <span
                                      className="text-[8px] font-black"
                                      style={{
                                        color: isSel ? "#b45309" : "#f59e0b",
                                      }}
                                    >
                                      {ha.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                      {/* カラー 12色 */}
                      <p
                        className="text-[10px] font-black uppercase tracking-widest mb-2"
                        style={{ color: theme.textMuted }}
                      >
                        カラー
                      </p>
                      <div className="grid grid-cols-6 gap-2 mb-4">
                        {COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColor(c)}
                            className={`h-9 rounded-[12px] ${c.bg} transition-all`}
                            style={{
                              boxShadow:
                                selectedColor.name === c.name
                                  ? `0 0 0 3px ${c.hex}, 0 0 0 5px ${theme.bgColor}`
                                  : "none",
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          setIsSavingProfile(true);
                          const updated = {
                            ...profile,
                            avatar: avatarImage || selectedAvatar.char,
                            color: selectedColor.bg,
                            avatarFrameMin: Number(selectedFrameMin || 0),
                          };
                          setProfile(updated);
                          saveLocal("profile", updated);
                          if (user && fb.enabled) {
                            try {
                              // プロフィール本体を更新
                              await setDoc(
                                doc(
                                  fb.db,
                                  "artifacts",
                                  fb.appId,
                                  "users",
                                  user.uid,
                                  "profile",
                                  "main"
                                ),
                                updated,
                                { merge: true }
                              );
                              // ランキング（leaderboard）にアバター・カラーを反映
                              if (!updated.isTeacher) {
                                await setDoc(
                                  doc(
                                    fb.db,
                                    "artifacts",
                                    fb.appId,
                                    "public",
                                    "data",
                                    "customApp",
                                    user.uid
                                  ),
                                  {
                                    name: updated.name,
                                    displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                    color: updated.color,
                                  },
                                  { merge: true }
                                );
                              } else {
                                // 先生はteacherIndexにアバター・カラーも反映
                                await setDoc(
                                  doc(
                                    fb.db,
                                    "artifacts",
                                    fb.appId,
                                    "public",
                                    "data",
                                    "teacherIndex",
                                    user.uid
                                  ),
                                  {
                                    name: updated.name,
                                    displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                    color: updated.color,
                                  },
                                  { merge: true }
                                ).catch(() => null);
                              }
                              // 自分のフレンド全員の名簿にもアバター・カラーを反映
                              const myFriendsSnap = await getDocs(
                                collection(
                                  fb.db,
                                  "artifacts",
                                  fb.appId,
                                  "users",
                                  user.uid,
                                  "friends"
                                )
                              );
                              await Promise.allSettled(
                                myFriendsSnap.docs.map((fd) =>
                                  setDoc(
                                    doc(
                                      fb.db,
                                      "artifacts",
                                      fb.appId,
                                      "users",
                                      fd.id,
                                      "friends",
                                      user.uid
                                    ),
                                    {
                                      name: updated.name,
                                      displayName: updated.displayName,
                                    bio: updated.bio || "",
                                    avatar: updated.avatar,
                                      color: updated.color,
                                    },
                                    { merge: true }
                                  ).catch(() => null)
                                )
                              );
                            } catch {}
                          }
                          // ローカルのleaderboard stateも即時反映（FirestoreのonSnapshot遅延対策）
                          setLeaderboard((prev) =>
                            prev.map((entry) =>
                              entry.id === user?.uid || entry.uid === user?.uid
                                ? {
                                    ...entry,
                                    avatar: updated.avatar,
                                    color: updated.color,
                                  }
                                : entry
                            )
                          );
                          // allUsersMapも即時反映
                          setAllUsersMap((prev) => ({
                            ...prev,
                            [user.uid]: {
                              ...prev[user.uid],
                              name: updated.name || prev[user.uid]?.name || "",
                              avatar: updated.avatar,
                              color: updated.color,
                              isTeacher: !!updated.isTeacher,
                            },
                          }));
                          setIsSavingProfile(false);
                          showToast("アバターを保存しました！");
                        }}
                        disabled={isSavingProfile}
                        className="w-full py-3 rounded-[12px] font-black text-white text-sm active:scale-95 transition-all disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg,#f59e0b,#d97706)",
                          boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
                        }}
                      >
                        {isSavingProfile ? "保存中..." : "アバターを保存"}
                      </button>
                    </div>
                  </div>

                  {/* ── テーマ ── */}
                  <div
                    className="rounded-[20px] p-5 mb-4"
                    style={{
                      background: isLight
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-3"
                      style={{ color: theme.textMuted }}
                    >
                      テーマ
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setThemeId(t.id);
                            saveLocal("theme", t.id);
                          }}
                          className="py-3 px-4 rounded-[12px] flex items-center gap-2 font-black text-sm active:opacity-70 transition-all"
                          style={{
                            background:
                              themeId === t.id
                                ? t.accentGrad
                                : isLight
                                ? "rgba(30,20,80,0.06)"
                                : "rgba(255,255,255,0.06)",
                            color:
                              themeId === t.id
                                ? "white"
                                : isLight
                                ? "rgba(30,20,80,0.7)"
                                : "rgba(255,255,255,0.5)",
                            border:
                              themeId === t.id
                                ? "none"
                                : `1px solid ${
                                    isLight
                                      ? "rgba(30,20,80,0.12)"
                                      : "rgba(255,255,255,0.1)"
                                  }`,
                          }}
                        >
                          {t.IconComp ? (
                            <t.IconComp
                              size={16}
                              color={
                                themeId === t.id
                                  ? "white"
                                  : isLight
                                  ? "rgba(30,20,80,0.7)"
                                  : "rgba(255,255,255,0.5)"
                              }
                            />
                          ) : (
                            <span>{t.emoji}</span>
                          )}
                          {t.name}
                          {themeId === t.id && (
                            <span className="ml-auto text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── 通知 ── */}
                  <div
                    className="rounded-[20px] p-5 mb-4"
                    style={{
                      background: isLight
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-3"
                      style={{ color: theme.textMuted }}
                    >
                      通知
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="font-bold text-sm"
                          style={{ color: theme.text }}
                        >
                          単語追加通知
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: theme.textMuted }}
                        >
                          先生が単語を追加したとき通知する
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !notifVocabAdd;
                          setNotifVocabAdd(next);
                          localStorage.setItem(
                            "genron_notifVocabAdd",
                            JSON.stringify(next)
                          );
                        }}
                        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                        style={{
                          background: notifVocabAdd
                            ? theme.accent
                            : "rgba(255,255,255,0.15)",
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                          style={{
                            left: notifVocabAdd ? "calc(100% - 22px)" : "2px",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* ── パスワード変更 ── */}
                  <div
                    className="rounded-[20px] p-5 mb-4"
                    style={{
                      background: isLight
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-3"
                      style={{ color: theme.textMuted }}
                    >
                      パスワード変更
                    </p>
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] font-bold text-sm outline-none"
                        style={{
                          background: isLight
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.07)",
                          border: `1px solid ${theme.cardBorder}`,
                          color: theme.text,
                        }}
                        placeholder="新しいパスワード"
                      />
                      {newPassword.length > 0 && (
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-[12px] font-bold text-sm outline-none"
                          style={{
                            background: isLight
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(255,255,255,0.07)",
                            border: `1.5px solid ${
                              confirmPassword && confirmPassword !== newPassword
                                ? "rgba(239,68,68,0.6)"
                                : theme.cardBorder
                            }`,
                            color: theme.text,
                          }}
                          placeholder="パスワードを再入力"
                        />
                      )}
                      {newPassword && newPassword === confirmPassword && (
                        <button
                          onClick={handleRegister}
                          className="w-full py-3 rounded-[12px] font-black text-white text-sm"
                          style={{
                            background:
                              "linear-gradient(135deg,#10b981,#059669)",
                          }}
                        >
                          パスワードを変更
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI設定（Anthropic APIキー入力）は削除しました。
                      ブラウザ直叩きを廃止したためキー入力は不要です。
                      将来サーバー経由で復活させる場合は SECURITY_NOTES.md 参照。 */}

                  {/* ── アカウント ── */}
                  <div
                    className="rounded-[20px] p-5 mb-4"
                    style={{
                      background: isLight
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-3"
                      style={{ color: theme.textMuted }}
                    >
                      アカウント
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleLogout}
                        className="w-full py-3 rounded-[12px] font-bold text-sm active:opacity-70 flex items-center justify-center gap-2"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: isLight
                            ? "rgba(30,20,80,0.7)"
                            : "rgba(255,255,255,0.6)",
                          border: `1px solid ${theme.cardBorder}`,
                        }}
                      >
                        ログアウト
                      </button>
                      <button
                        onClick={handleResetProgress}
                        className="w-full py-3 rounded-[12px] font-bold text-xs active:opacity-70"
                        style={{
                          background: "rgba(251,146,60,0.08)",
                          color: "rgba(251,146,60,0.8)",
                          border: "1px solid rgba(251,146,60,0.2)",
                        }}
                      >
                        進捗をリセット（アカウントは残す）
                      </button>
                      <button
                        onClick={handleSelfDeleteAccount}
                        className="w-full py-3 rounded-[12px] font-bold text-xs active:opacity-70"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          color: "rgba(239,68,68,0.5)",
                          border: "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        アカウントを削除する
                      </button>
                    </div>
                  </div>
                  {/* ── デバッグ（先生・管理者のみ） ── */}
                  {isAdmin && (
                    <div
                      className="rounded-[20px] p-5 mb-4"
                      style={{
                        background: isLight
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${theme.cardBorder}`,
                      }}
                    >
                      <p
                        className="text-[10px] font-black uppercase tracking-widest mb-4"
                        style={{ color: theme.textMuted }}
                      >
                        デバッグ
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className="text-sm font-bold"
                            style={{ color: theme.text }}
                          >
                            全ステージ開放
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: theme.textMuted }}
                          >
                            デバッグ用。全カテゴリの全ステージをプレイ可能にする
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const next = !debugUnlockAll;
                            setDebugUnlockAll(next);
                            localStorage.setItem(
                              "genron_debugUnlock",
                              JSON.stringify(next)
                            );
                          }}
                          className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                          style={{
                            background: debugUnlockAll
                              ? "#f59e0b"
                              : isLight
                              ? "rgba(0,0,0,0.15)"
                              : "rgba(255,255,255,0.15)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                            style={{
                              left: debugUnlockAll
                                ? "calc(100% - 22px)"
                                : "2px",
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ===== FACTORY（マイワード作成）画面 ===== */}
              {screen === "factoryApp" &&
                (() => {
                  const addUserVocab = async () => {
                    const en = factoryInput.en.trim();
                    const ja = factoryInput.ja.trim();
                    const sentence = factoryInput.sentence.trim();
                    if (!en || !ja) {
                      setFactoryError("英語と日本語は必須です");
                      return;
                    }
                    if (
                      userVocabList.some(
                        (w) => w.en.toLowerCase() === en.toLowerCase()
                      )
                    ) {
                      setFactoryError("その単語はすでに登録されています");
                      return;
                    }
                    setFactoryAdding(true);
                    setFactoryError("");
                    const wordData = {
                      en,
                      ja,
                      sentence,
                      createdAt: Date.now(),
                    };
                    if (user && fb.enabled) {
                      try {
                        await addDoc(
                          collection(
                            fb.db,
                            "artifacts",
                            fb.appId,
                            "users",
                            user.uid,
                            "userVocab"
                          ),
                          wordData
                        );
                      } catch (e: any) {
                        setFactoryError("保存に失敗しました");
                        setFactoryAdding(false);
                        return;
                      }
                    } else {
                      setUserVocabList((prev) => [
                        ...prev,
                        { ...wordData, id: Date.now().toString() },
                      ]);
                    }
                    setFactoryInput({ en: "", ja: "", sentence: "" });
                    setFactoryAdding(false);
                    showToast("マイワードに追加しました！", "success");
                  };

                  return (
                    <div
                      className="animate-in fade-in"
                      style={{ paddingBottom: "100px" }}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-center gap-3 mb-5">
                        <button
                          onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}
                          className="p-2 rounded-[12px] active:opacity-70 transition-all"
                          style={{
                            background: isLight
                              ? "rgba(30,20,80,0.07)"
                              : "rgba(255,255,255,0.08)",
                            border: `1px solid ${
                              isLight
                                ? "rgba(30,20,80,0.12)"
                                : "rgba(255,255,255,0.1)"
                            }`,
                          }}
                        >
                          <ChevronLeft
                            size={20}
                            style={{ color: theme.text }}
                          />
                        </button>
                        <div>
                          <p
                            style={{
                              fontSize: 9,
                              fontWeight: 300,
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              color: "rgba(249,115,22,0.7)",
                              marginBottom: 2,
                            }}
                          >
                            my word factory
                          </p>
                          <h2
                            className="text-2xl font-black"
                            style={{ color: theme.text, lineHeight: 1 }}
                          >
                            FACTORY
                          </h2>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <span
                            className="text-sm font-black px-3 py-1 rounded-full"
                            style={{
                              background: "rgba(249,115,22,0.15)",
                              color: "#f97316",
                              border: "1px solid rgba(249,115,22,0.3)",
                            }}
                          >
                            {userVocabList.length}語
                          </span>
                        </div>
                      </div>

                      {/* 入力フォーム */}
                      <div
                        className="rounded-[20px] p-5 mb-4"
                        style={{
                          background: isLight
                            ? "rgba(249,115,22,0.06)"
                            : "rgba(249,115,22,0.08)",
                          border: "1.5px solid rgba(249,115,22,0.25)",
                        }}
                      >
                        <p
                          className="text-xs font-black uppercase tracking-widest mb-4"
                          style={{ color: "rgba(249,115,22,0.8)" }}
                        >
                          ＋ 新しい単語を追加
                        </p>
                        <div className="space-y-3">
                          {[
                            {
                              key: "en",
                              label: "英語 *",
                              placeholder: "例: persevere",
                            },
                            {
                              key: "ja",
                              label: "日本語 *",
                              placeholder: "例: 頑張り続ける",
                            },
                            {
                              key: "sentence",
                              label: "例文（任意）",
                              placeholder:
                                "例: She persevered through all difficulties.",
                            },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                              <p
                                className="text-xs font-bold mb-1"
                                style={{
                                  color: isLight
                                    ? "rgba(80,40,20,0.6)"
                                    : "rgba(255,255,255,0.45)",
                                }}
                              >
                                {label}
                              </p>
                              <input
                                value={factoryInput[key]}
                                onChange={(e) => {
                                  setFactoryInput((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }));
                                  setFactoryError("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && key === "sentence")
                                    addUserVocab();
                                }}
                                placeholder={placeholder}
                                style={{
                                  width: "100%",
                                  padding: "10px 14px",
                                  borderRadius: 12,
                                  fontSize: 14,
                                  outline: "none",
                                  background: isLight
                                    ? "rgba(255,255,255,0.8)"
                                    : "rgba(255,255,255,0.07)",
                                  border: `1px solid ${
                                    isLight
                                      ? "rgba(0,0,0,0.12)"
                                      : "rgba(255,255,255,0.12)"
                                  }`,
                                  color: isLight ? "#1a0035" : "white",
                                }}
                              />
                            </div>
                          ))}
                          {factoryError && (
                            <p
                              className="text-xs font-bold"
                              style={{ color: "#fb7185" }}
                            >
                              {factoryError}
                            </p>
                          )}
                          <button
                            onClick={addUserVocab}
                            disabled={
                              factoryAdding ||
                              !factoryInput.en.trim() ||
                              !factoryInput.ja.trim()
                            }
                            className="w-full py-3 rounded-[12px] font-black text-white text-sm active:scale-95 transition-all disabled:opacity-40"
                            style={{
                              background:
                                "linear-gradient(135deg,#f97316,#ea580c)",
                              boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
                            }}
                          >
                            {factoryAdding
                              ? "追加中..."
                              : "＋ マイワードに追加"}
                          </button>
                        </div>
                      </div>

                      {/* 単語一覧 */}
                      {userVocabList.length > 0 && (
                        <div>
                          <p
                            className="text-xs font-black uppercase tracking-widest mb-3"
                            style={{
                              color: isLight
                                ? "#8a8995"
                                : "rgba(255,255,255,0.35)",
                            }}
                          >
                            登録済み単語
                          </p>
                          <div className="space-y-2">
                            {[...userVocabList].reverse().map((word) => {
                              const inReview = reviewList.some(
                                (r) => r.en === word.en
                              );
                              return (
                                <div
                                  key={word.id}
                                  className="flex items-center gap-3 p-3 rounded-[20px]"
                                  style={{
                                    background: inReview
                                      ? "rgba(249,115,22,0.08)"
                                      : isLight
                                      ? "rgba(0,0,0,0.04)"
                                      : "rgba(255,255,255,0.04)",
                                    border: inReview
                                      ? "1px solid rgba(249,115,22,0.3)"
                                      : `1px solid ${
                                          isLight
                                            ? "rgba(0,0,0,0.07)"
                                            : "rgba(255,255,255,0.07)"
                                        }`,
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <p
                                        className="font-black"
                                        style={{
                                          color: theme.text,
                                          fontSize: 15,
                                        }}
                                      >
                                        {word.en}
                                      </p>
                                      <p
                                        className="font-bold text-sm"
                                        style={{
                                          color: isLight
                                            ? "#555566"
                                            : "rgba(255,255,255,0.5)",
                                        }}
                                      >
                                        {word.ja}
                                      </p>
                                    </div>
                                    {word.sentence && (
                                      <p
                                        className="text-xs italic mt-0.5"
                                        style={{
                                          color: isLight
                                            ? "rgba(40,40,60,0.45)"
                                            : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        {word.sentence}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      onClick={async () => {
                                        if (inReview) {
                                          const target = reviewList.find(
                                            (r) => r.en === word.en
                                          );
                                          if (target && user && fb.enabled) {
                                            try {
                                              await deleteDoc(
                                                doc(
                                                  fb.db,
                                                  "artifacts",
                                                  fb.appId,
                                                  "users",
                                                  user.uid,
                                                  "review",
                                                  target.id
                                                )
                                              );
                                            } catch {}
                                          } else {
                                            setReviewList((prev) =>
                                              prev.filter(
                                                (r) => r.en !== word.en
                                              )
                                            );
                                          }
                                          showToast(
                                            "復習リストから削除しました"
                                          );
                                        } else {
                                          const { id: _id, ...wordData } = word;
                                          if (user && fb.enabled) {
                                            await addDoc(
                                              collection(
                                                fb.db,
                                                "artifacts",
                                                fb.appId,
                                                "users",
                                                user.uid,
                                                "review"
                                              ),
                                              wordData
                                            );
                                          } else {
                                            setReviewList((prev) => [
                                              ...prev,
                                              {
                                                ...wordData,
                                                id: Date.now().toString(),
                                              },
                                            ]);
                                          }
                                          showToast(
                                            "復習リストに追加しました！"
                                          );
                                        }
                                      }}
                                      className="w-8 h-8 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                      style={{
                                        background: inReview
                                          ? "rgba(74,222,128,0.18)"
                                          : isLight
                                          ? "rgba(79,70,229,0.08)"
                                          : "rgba(255,255,255,0.06)",
                                        border: inReview
                                          ? "1.5px solid #4ade80"
                                          : isLight
                                          ? "1.5px solid rgba(79,70,229,0.25)"
                                          : "1.5px solid rgba(255,255,255,0.12)",
                                        color: inReview
                                          ? "#4ade80"
                                          : isLight
                                          ? "#4f46e5"
                                          : "rgba(255,255,255,0.3)",
                                      }}
                                      title={
                                        inReview
                                          ? "復習リストから削除"
                                          : "復習リストに追加"
                                      }
                                    >
                                      {inReview ? (
                                        <CheckCircle2 size={15} />
                                      ) : (
                                        <BookOpen size={15} />
                                      )}
                                    </button>
                                    <select
                                      value={reviewAssign[word.en] || ""}
                                      onChange={(e) => addWordToReview(word, e.target.value || null)}
                                      title="フォルダに追加"
                                      style={{ height: 32, borderRadius: 12, fontSize: 11, fontWeight: 700, padding: "0 6px", maxWidth: 96, background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)", color: theme.text, border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"}` }}
                                    >
                                      <option value="">{inReview ? "未分類" : "フォルダへ"}</option>
                                      {reviewFolders.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={async () => {
                                        if (user && fb.enabled) {
                                          try {
                                            await deleteDoc(
                                              doc(
                                                fb.db,
                                                "artifacts",
                                                fb.appId,
                                                "users",
                                                user.uid,
                                                "userVocab",
                                                word.id
                                              )
                                            );
                                          } catch {}
                                        } else {
                                          setUserVocabList((prev) =>
                                            prev.filter((w) => w.id !== word.id)
                                          );
                                        }
                                        showToast("削除しました");
                                      }}
                                      className="w-8 h-8 rounded-[12px] flex items-center justify-center"
                                      style={{
                                        background: "rgba(244,63,94,0.10)",
                                        color: "#fb7185",
                                        border: "1px solid rgba(244,63,94,0.2)",
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* ===== メモアプリ画面 ===== */}
              {screen === "noteApp" &&
                (() => {
                  const saveNotes = (newNotesOrFn) => {
                    setNotes((prev) => {
                      const next =
                        typeof newNotesOrFn === "function"
                          ? newNotesOrFn(prev)
                          : newNotesOrFn;
                      try {
                        localStorage.setItem(
                          "oritan_notes",
                          JSON.stringify(next)
                        );
                      } catch {}
                      return next;
                    });
                  };
                  const addNote = () => {
                    if (!noteInput.trim()) return;
                    const newNote = {
                      id: Date.now().toString(),
                      text: noteInput.trim(),
                      createdAt: new Date().toISOString(),
                      pinned: false,
                    };
                    saveNotes((prev) => [newNote, ...prev]);
                    setNoteInput("");
                  };
                  const deleteNote = (id) =>
                    saveNotes((prev) => prev.filter((n) => n.id !== id));
                  const startEdit = (note) => {
                    setNoteEditId(note.id);
                    setNoteEditText(note.text);
                  };
                  const saveEdit = () => {
                    if (!noteEditText.trim()) return;
                    saveNotes((prev) =>
                      prev.map((n) =>
                        n.id === noteEditId
                          ? { ...n, text: noteEditText.trim() }
                          : n
                      )
                    );
                    setNoteEditId(null);
                    setNoteEditText("");
                  };
                  const togglePin = (id) =>
                    saveNotes((prev) =>
                      prev.map((n) =>
                        n.id === id ? { ...n, pinned: !n.pinned } : n
                      )
                    );
                  const filtered = notes.filter((n) =>
                    n.text.toLowerCase().includes(noteSearch.toLowerCase())
                  );
                  const sorted = [...filtered].sort(
                    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
                  );
                  return (
                    <div
                      className="animate-in fade-in"
                      style={{
                        paddingBottom: "calc(var(--nav-height, 100px) + 10px)",
                      }}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-center gap-3 mb-5">
                        <button
                          onClick={() => setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start")}
                          className="p-2 rounded-[12px] active:opacity-70 transition-all"
                          style={{
                            background: isLight
                              ? "rgba(30,20,80,0.07)"
                              : "rgba(255,255,255,0.08)",
                            border: `1px solid ${
                              isLight
                                ? "rgba(30,20,80,0.12)"
                                : "rgba(255,255,255,0.1)"
                            }`,
                          }}
                        >
                          <ChevronLeft
                            size={20}
                            style={{ color: theme.text }}
                          />
                        </button>
                        <h2
                          className="text-2xl font-black flex-1"
                          style={{ color: theme.text }}
                        >
                          メモ
                        </h2>
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full"
                          style={{
                            background: "rgba(14,165,233,0.15)",
                            color: "#0ea5e9",
                          }}
                        >
                          {notes.length}件
                        </span>
                      </div>

                      {/* 入力エリア */}
                      <div
                        className="rounded-[20px] p-4 mb-4"
                        style={{
                          background: isLight
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.06)",
                          border: `1px solid ${
                            isLight
                              ? "rgba(14,165,233,0.25)"
                              : "rgba(14,165,233,0.3)"
                          }`,
                          boxShadow: isLight
                            ? "0 2px 12px rgba(0,0,0,0.06)"
                            : "none",
                        }}
                      >
                        <textarea
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="メモを入力..."
                          rows={3}
                          className="w-full bg-transparent resize-none outline-none text-sm font-medium"
                          style={{ color: theme.text }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span
                            className="text-xs"
                            style={{ color: theme.textMuted }}
                          >
                            {noteInput.length}文字
                          </span>
                          <button
                            onClick={addNote}
                            disabled={!noteInput.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] font-black text-sm active:opacity-70 transition-all disabled:opacity-40"
                            style={{
                              background:
                                "linear-gradient(135deg,#0ea5e9,#38bdf8)",
                              color: "#fff",
                            }}
                          >
                            <IcPlus size={16} color="#fff" /> 保存
                          </button>
                        </div>
                      </div>

                      {/* 検索 */}
                      {notes.length > 2 && (
                        <div className="relative mb-4">
                          <input
                            value={noteSearch}
                            onChange={(e) => setNoteSearch(e.target.value)}
                            placeholder="メモを検索..."
                            className="w-full rounded-[20px] px-4 py-3 text-sm font-medium outline-none"
                            style={{
                              background: isLight
                                ? "rgba(255,255,255,0.8)"
                                : "rgba(255,255,255,0.06)",
                              border: `1px solid ${
                                isLight
                                  ? "rgba(0,0,0,0.1)"
                                  : "rgba(255,255,255,0.1)"
                              }`,
                              color: theme.text,
                            }}
                          />
                        </div>
                      )}

                      {/* メモリスト */}
                      {sorted.length === 0 ? (
                        <div
                          className="text-center py-16"
                          style={{ color: theme.textMuted }}
                        >
                          <div className="mb-4 flex justify-center">
                            <IcNoteApp size={48} color="currentColor" />
                          </div>
                          <p className="font-bold text-sm">
                            {noteSearch ? "見つかりません" : "メモがありません"}
                          </p>
                          <p className="text-xs mt-1">
                            上のフォームからメモを追加してください
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sorted.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-[20px] p-4"
                              style={{
                                background: note.pinned
                                  ? isLight
                                    ? "rgba(14,165,233,0.08)"
                                    : "rgba(14,165,233,0.12)"
                                  : isLight
                                  ? "rgba(255,255,255,0.8)"
                                  : "rgba(255,255,255,0.05)",
                                border: `1px solid ${
                                  note.pinned
                                    ? "rgba(14,165,233,0.35)"
                                    : isLight
                                    ? "rgba(0,0,0,0.08)"
                                    : "rgba(255,255,255,0.08)"
                                }`,
                                boxShadow: isLight
                                  ? "0 2px 8px rgba(0,0,0,0.05)"
                                  : "none",
                              }}
                            >
                              {noteEditId === note.id ? (
                                <div>
                                  <textarea
                                    value={noteEditText}
                                    onChange={(e) =>
                                      setNoteEditText(e.target.value)
                                    }
                                    rows={3}
                                    className="w-full bg-transparent resize-none outline-none text-sm font-medium mb-3"
                                    style={{ color: theme.text }}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={saveEdit}
                                      className="flex-1 py-2 rounded-[12px] font-black text-xs active:opacity-70"
                                      style={{
                                        background:
                                          "linear-gradient(135deg,#0ea5e9,#38bdf8)",
                                        color: "#fff",
                                      }}
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={() => {
                                        setNoteEditId(null);
                                        setNoteEditText("");
                                      }}
                                      className="px-4 py-2 rounded-[12px] font-black text-xs active:opacity-70"
                                      style={{
                                        background: isLight
                                          ? "rgba(0,0,0,0.07)"
                                          : "rgba(255,255,255,0.08)",
                                        color: theme.text,
                                      }}
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p
                                    className="text-sm font-medium whitespace-pre-wrap leading-relaxed mb-3"
                                    style={{ color: theme.text }}
                                  >
                                    {note.pinned && (
                                      <svg
                                        style={{
                                          display: "inline",
                                          verticalAlign: "middle",
                                          marginRight: 3,
                                        }}
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                      >
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                      </svg>
                                    )}
                                    {note.text}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-[10px] font-bold"
                                      style={{ color: theme.textMuted }}
                                    >
                                      {new Date(note.createdAt).toLocaleString(
                                        "ja-JP",
                                        {
                                          month: "numeric",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => togglePin(note.id)}
                                        className="p-2 rounded-[12px] active:opacity-70 transition-all"
                                        style={{
                                          background: note.pinned
                                            ? "rgba(14,165,233,0.15)"
                                            : isLight
                                            ? "rgba(0,0,0,0.05)"
                                            : "rgba(255,255,255,0.06)",
                                          color: note.pinned
                                            ? "#0ea5e9"
                                            : theme.textMuted,
                                        }}
                                        title={
                                          note.pinned ? "ピン解除" : "ピン留め"
                                        }
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill={
                                            note.pinned
                                              ? "currentColor"
                                              : "none"
                                          }
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        >
                                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                          <circle cx="12" cy="10" r="3" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => startEdit(note)}
                                        className="p-2 rounded-[12px] active:opacity-70 transition-all"
                                        style={{
                                          background: isLight
                                            ? "rgba(0,0,0,0.05)"
                                            : "rgba(255,255,255,0.06)",
                                          color: theme.textMuted,
                                        }}
                                        title="編集"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        >
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => deleteNote(note.id)}
                                        className="p-2 rounded-[12px] active:opacity-70 transition-all"
                                        style={{
                                          background: isLight
                                            ? "rgba(239,68,68,0.08)"
                                            : "rgba(239,68,68,0.1)",
                                          color: "#ef4444",
                                        }}
                                        title="削除"
                                      >
                                        <IcTrash2 size={14} color="#ef4444" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* ===== つぶやきアプリ画面 ===== */}

              {/* ===== AIペット対話画面 ===== */}
              {(screen === "bookLogApp" || screen === "chat") && BookLogScreen()}


              {/* ===== ペットショップ画面 ===== */}
              {/* ===== ペットショップ画面 ===== */}

              {/* ===== ペット育成（部屋）画面 ===== */}

              {screen === "review" &&
                (() => {
                  const removeReviewItem = async (item) => {
                    // 即座にローカルから消し、リスナーの再追加も防ぐ
                    deletingReviewIds.current.add(item.id);
                    setReviewList((prev) =>
                      prev.filter((r) => r.id !== item.id)
                    );
                    if (user && fb.enabled) {
                      try {
                        await deleteDoc(
                          doc(
                            fb.db,
                            "artifacts",
                            fb.appId,
                            "users",
                            user.uid,
                            "review",
                            item.id
                          )
                        );
                      } catch (e: any) {}
                    }
                    // Firestoreのリスナー通知が完了するまで待ってからセットを解放
                    setTimeout(() => {
                      deletingReviewIds.current.delete(item.id);
                    }, 3000);
                  };

                  return (
                    <div
                      className="animate-in fade-in text-left"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-center gap-4 mb-4 shrink-0">
                        <button
                          onClick={() => {
                            setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start");
                            setReviewMode("list");
                            setReviewQuizIdx(0);
                          }}
                          className="rx-back"
                          aria-label="戻る"
                          style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}
                        >
                          <ChevronLeft />
                        </button>
                        <h2
                          className="text-2xl font-black flex items-center gap-3"
                          style={{ color: theme.accent }}
                        >
                          <BookCheck size={28} /> 復習
                        </h2>
                        <span
                          className="ml-auto text-sm font-bold px-3 py-1 rounded-full"
                          style={{
                            background: `${theme.accent}22`,
                            color: theme.accent,
                            border: `1px solid ${theme.accent}44`,
                          }}
                        >
                          {reviewList.length}語
                        </span>
                      </div>

                      {/* タブ */}
                      {reviewList.length > 0 && (
                        <div className="flex gap-2 mb-4 shrink-0">
                          {[
                            {
                              id: "list",
                              label: "リスト",
                              icon: <Layers size={13} />,
                            },
                            {
                              id: "quiz",
                              label: "4択",
                              icon: <Zap size={13} />,
                            },
                            {
                              id: "sentence",
                              label: "例文",
                              icon: <BookOpen size={13} />,
                            },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setReviewMode(tab.id);
                                if (tab.id === "quiz") {
                                  setReviewQuizIdx(0);
                                  setReviewQuizFeedback(null);
                                  setReviewSentenceRevealed(false);
                                  startReviewQuiz(0, reviewList);
                                }
                                if (tab.id === "sentence") {
                                  setReviewQuizIdx(0);
                                  setReviewQuizFeedback(null);
                                  setReviewSentenceRevealed(false);
                                }
                              }}
                              className="flex-1 py-2 rounded-[12px] font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              style={{
                                background:
                                  reviewMode === tab.id
                                    ? theme.accent
                                    : isLight
                                    ? "rgba(0,0,0,0.05)"
                                    : "rgba(255,255,255,0.06)",
                                color:
                                  reviewMode === tab.id
                                    ? "#fff"
                                    : isLight
                                    ? "rgba(20,10,60,0.65)"
                                    : theme.textMuted,
                                border:
                                  reviewMode === tab.id
                                    ? "none"
                                    : isLight
                                    ? "1.5px solid rgba(0,0,0,0.18)"
                                    : "1px solid rgba(255,255,255,0.10)",
                              }}
                            >
                              {tab.icon}
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {reviewList.length === 0 ? (
                        <p
                          className="p-16 text-center font-bold rounded-[20px]"
                          style={{
                            color: theme.textMuted,
                            background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${theme.cardBorder}`,
                            boxShadow: isLight ? "0 10px 30px rgba(43,39,36,.06)" : "none",
                            fontFamily: '"Zen Maru Gothic", sans-serif',
                          }}
                        >
                          復習すべき単語はありません！
                        </p>
                      ) : reviewMode === "list" ? (
                        /* ━━ リストモード ━━ */
                        <div
                          className="space-y-4 overflow-y-auto"
                          style={{ flex: 1, minHeight: 0 }}
                        >
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            {[{ id: "all", name: "すべて" }, { id: "none", name: "未分類" }, ...reviewFolders].map((f) => (
                              <button key={f.id} onClick={() => setReviewFolderFilter(f.id)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: reviewFolderFilter === f.id ? "none" : `1px solid ${theme.cardBorder}`, background: reviewFolderFilter === f.id ? theme.accent : "transparent", color: reviewFolderFilter === f.id ? "#fff" : theme.text }}>{f.name}</button>
                            ))}
                            <button onClick={createReviewFolder} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: `1px dashed ${theme.accent}`, background: "transparent", color: theme.accent }}>＋ フォルダ</button>
                          </div>
                          {(reviewFolderFilter === "all" ? reviewList : reviewFolderFilter === "none" ? reviewList.filter((it) => !reviewAssign[it.en]) : reviewList.filter((it) => reviewAssign[it.en] === reviewFolderFilter)).map((item) => {
                            const isEn = !/[ぁ-ん々ー一-鿿ｦ-ﾟ]/.test(item.en);
                            return (
                              <div
                                key={item.id}
                                className="p-5 rounded-[18px] flex justify-between items-center"
                                style={{
                                  background: isLight ? "#ffffff" : "rgba(255,255,255,0.06)",
                                  border: `1px solid ${theme.cardBorder}`,
                                  boxShadow: "0 10px 30px rgba(43,39,36,.06)",
                                }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p
                                      className="text-3xl font-black tracking-tight"
                                      style={{ color: theme.text }}
                                    >
                                      {item.en}
                                    </p>
                                    {isEn && (
                                      <button
                                        onClick={() => speak(item.en)}
                                        className="p-1.5 rounded-lg active:scale-90 transition-all"
                                        style={{
                                          background: isLight
                                            ? "rgba(0,0,0,0.07)"
                                            : "rgba(255,255,255,0.08)",
                                          color: isLight
                                            ? "rgba(20,10,60,0.45)"
                                            : "rgba(255,255,255,0.4)",
                                        }}
                                      >
                                        <Volume2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                  <p
                                    className="text-lg font-bold"
                                    style={{
                                      color: isLight
                                        ? "rgba(99,102,241,0.85)"
                                        : "rgba(165,180,252,0.85)",
                                    }}
                                  >
                                    {getOptionLabel(item, "en-ja")}
                                  </p>
                                  {item.sentence && (
                                    <p
                                      className="text-xs mt-1 italic"
                                      style={{
                                        color: isLight
                                          ? "rgba(20,10,60,0.35)"
                                          : "rgba(255,255,255,0.28)",
                                      }}
                                    >
                                      {item.sentence}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    removeReviewItem(item);
                                    showToast("復習済み！");
                                  }}
                                  className="ml-4 p-4 transition-all active:scale-90 rounded-[12px]"
                                  style={{ color: "rgba(99,102,241,0.5)" }}
                                  title="復習済み"
                                >
                                  <CheckCircle2 size={32} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : reviewMode === "quiz" ? (
                        /* ━━ 4択クイズモード ━━ */
                        (() => {
                          const currentWord = reviewList[reviewQuizIdx];
                          if (!currentWord) return null;
                          const total = reviewList.length;
                          const pct = Math.round((reviewQuizIdx / total) * 100);

                          return (
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                                minHeight: 0,
                              }}
                            >
                              {/* 進捗バー */}
                              <div className="shrink-0">
                                <div
                                  className="flex justify-between text-xs font-bold mb-2"
                                  style={{ color: theme.textMuted }}
                                >
                                  <span>
                                    {reviewQuizIdx + 1} / {total}
                                  </span>
                                  <span>{pct}%</span>
                                </div>
                                <div
                                  className="w-full rounded-full overflow-hidden"
                                  style={{
                                    height: 4,
                                    background: isLight
                                      ? "rgba(0,0,0,0.10)"
                                      : "rgba(255,255,255,0.10)",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 99,
                                      width: `${pct}%`,
                                      background: `linear-gradient(90deg,${theme.accent}88,${theme.accent})`,
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>
                              </div>

                              {/* 問題カード */}
                              <div
                                className="rounded-[20px] p-6 text-center shrink-0"
                                style={{
                                  background: isLight
                                    ? "rgba(255,255,255,0.92)"
                                    : "rgba(255,255,255,0.06)",
                                  border: isLight
                                    ? "2px solid rgba(0,0,0,0.15)"
                                    : "1px solid rgba(255,255,255,0.12)",
                                  boxShadow: isLight
                                    ? "0 2px 12px rgba(0,0,0,0.08)"
                                    : "none",
                                }}
                              >
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <p
                                    className="text-xs font-black uppercase tracking-widest"
                                    style={{ color: theme.textMuted }}
                                  >
                                    次の意味は？
                                  </p>
                                  {!/[ぁ-ん々ー一-鿿ｦ-ﾟ]/.test(
                                    currentWord.en
                                  ) && (
                                    <button
                                      onClick={() => speak(currentWord.en)}
                                      className="p-1 rounded-lg active:scale-90"
                                      style={{
                                        background: isLight
                                          ? "rgba(0,0,0,0.07)"
                                          : "rgba(255,255,255,0.08)",
                                        color: isLight
                                          ? "rgba(20,10,60,0.45)"
                                          : "rgba(255,255,255,0.4)",
                                      }}
                                    >
                                      <Volume2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <p
                                  className="text-4xl font-black tracking-tight"
                                  style={{ color: theme.text }}
                                >
                                  {currentWord.en}
                                  {isVT(currentWord) && (
                                    <span
                                      style={{
                                        fontSize: "0.55em",
                                        opacity: 0.55,
                                        marginLeft: "0.25em",
                                        fontWeight: 800,
                                      }}
                                    >
                                      {" "}
                                      A
                                    </span>
                                  )}
                                </p>
                                {currentWord.sentence && (
                                  <p
                                    className="text-xs mt-3 italic px-2"
                                    style={{
                                      color: isLight
                                        ? "rgba(20,10,60,0.38)"
                                        : "rgba(255,255,255,0.30)",
                                    }}
                                  >
                                    {currentWord.sentence.replace(
                                      new RegExp(currentWord.en, "gi"),
                                      "___"
                                    )}
                                  </p>
                                )}
                              </div>

                              {/* 選択肢 */}
                              {reviewQuizLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="flex justify-center mb-2">
                                      <Loader2
                                        size={28}
                                        style={{
                                          color: theme.accent,
                                          animation: "spin 1s linear infinite",
                                        }}
                                      />
                                    </div>
                                    <p
                                      className="text-sm font-bold"
                                      style={{ color: theme.textMuted }}
                                    >
                                      AIが問題を生成中...
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="grid grid-cols-2 gap-3"
                                  style={{ flex: 1 }}
                                >
                                  {reviewQuizOptions.map((opt, i) => {
                                    const isCorrect = opt.en === currentWord.en;
                                    const isSelected =
                                      reviewQuizFeedback !== null;
                                    let bg = isLight
                                      ? "rgba(255,255,255,0.88)"
                                      : "rgba(255,255,255,0.07)";
                                    let border = isLight
                                      ? "2px solid rgba(0,0,0,0.15)"
                                      : "1px solid rgba(255,255,255,0.12)";
                                    let textColor = theme.text;
                                    if (isSelected && isCorrect) {
                                      bg = "rgba(52,211,153,0.18)";
                                      border = "1.5px solid #34d399";
                                      textColor = "#34d399";
                                    } else if (
                                      isSelected &&
                                      reviewQuizFeedback === opt.en &&
                                      !isCorrect
                                    ) {
                                      bg = "rgba(239,68,68,0.18)";
                                      border = "1.5px solid #ef4444";
                                      textColor = "#ef4444";
                                    }
                                    return (
                                      <button
                                        key={i}
                                        onClick={async () => {
                                          if (reviewQuizFeedback !== null)
                                            return;
                                          setReviewQuizFeedback(opt.en);
                                          const correct =
                                            opt.en === currentWord.en;
                                          if (correct) {
                                            showToast("⭕ 正解！ (+1コイン)");
                                            // コイン加算処理
                                            const newPts =
                                              (profile?.petPoints || 0) + 1;
                                            const updated = {
                                              ...profile,
                                              petPoints: newPts,
                                            };
                                            setProfile(updated);
                                            saveLocal("profile", updated);
                                            if (user && fb.enabled) {
                                              setDoc(
                                                doc(
                                                  fb.db,
                                                  "artifacts",
                                                  fb.appId,
                                                  "users",
                                                  user.uid,
                                                  "profile",
                                                  "main"
                                                ),
                                                { petPoints: newPts },
                                                { merge: true }
                                              ).catch(() => null);
                                            }

                                            setTimeout(async () => {
                                              // 正解したら復習リストから削除
                                              await removeReviewItem(
                                                currentWord
                                              );
                                              const nextList =
                                                reviewList.filter(
                                                  (r) => r.id !== currentWord.id
                                                );
                                              if (nextList.length === 0) {
                                                showToast("全問クリア！");
                                                setReviewMode("list");
                                                return;
                                              }
                                              const nextIdx = Math.min(
                                                reviewQuizIdx,
                                                nextList.length - 1
                                              );
                                              setReviewQuizIdx(nextIdx);
                                              setReviewQuizFeedback(null);
                                              startReviewQuiz(
                                                nextIdx,
                                                nextList
                                              );
                                            }, 900);
                                          } else {
                                            showToast(
                                              `✗ 不正解 → ${getOptionLabel(
                                                currentWord,
                                                "en-ja"
                                              )}`,
                                              "error"
                                            );
                                            setTimeout(() => {
                                              const nextIdx =
                                                reviewQuizIdx + 1 <
                                                reviewList.length
                                                  ? reviewQuizIdx + 1
                                                  : 0;
                                              setReviewQuizIdx(nextIdx);
                                              setReviewQuizFeedback(null);
                                              startReviewQuiz(
                                                nextIdx,
                                                reviewList
                                              );
                                            }, 1200);
                                          }
                                        }}
                                        className="rounded-[20px] p-4 text-left transition-all active:scale-95 font-bold"
                                        style={{
                                          background: bg,
                                          border,
                                          color: textColor,
                                          minHeight: 72,
                                        }}
                                      >
                                        <span
                                          className="text-xs font-black uppercase tracking-wider block mb-1"
                                          style={{
                                            color:
                                              isSelected && isCorrect
                                                ? "#34d399"
                                                : isSelected &&
                                                  reviewQuizFeedback === opt.en
                                                ? "#ef4444"
                                                : theme.textMuted,
                                          }}
                                        >
                                          {String.fromCharCode(65 + i)}
                                        </span>
                                        {getOptionLabel(opt, "en-ja")}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {/* スキップ */}
                              {!reviewQuizLoading &&
                                reviewQuizFeedback === null &&
                                reviewList.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const nextIdx =
                                        reviewQuizIdx + 1 < reviewList.length
                                          ? reviewQuizIdx + 1
                                          : 0;
                                      setReviewQuizIdx(nextIdx);
                                      setReviewQuizFeedback(null);
                                      startReviewQuiz(nextIdx, reviewList);
                                    }}
                                    className="shrink-0 text-center py-2 text-xs font-bold active:opacity-60"
                                    style={{ color: theme.textMuted }}
                                  >
                                    スキップ →
                                  </button>
                                )}
                            </div>
                          );
                        })()
                      ) : (
                        /* ━━ 例文穴埋めモード ━━ */
                        (() => {
                          const sentenceList = reviewList.filter(
                            (w) => w.sentence
                          );
                          if (sentenceList.length === 0)
                            return (
                              <div className="flex-1 flex items-center justify-center">
                                <p
                                  className="text-center font-bold p-8"
                                  style={{
                                    color: isLight
                                      ? "rgba(20,10,60,0.40)"
                                      : "rgba(255,255,255,0.3)",
                                    background: isLight
                                      ? "rgba(0,0,0,0.04)"
                                      : "rgba(255,255,255,0.04)",
                                    borderRadius: 28,
                                    border: isLight
                                      ? "1.5px solid rgba(0,0,0,0.12)"
                                      : "none",
                                  }}
                                >
                                  例文のある単語がありません
                                </p>
                              </div>
                            );
                          const idx = Math.min(
                            reviewQuizIdx,
                            sentenceList.length - 1
                          );
                          const word = sentenceList[idx];
                          const isEn = !/[ぁ-ん々ー一-鿿ｦ-ﾟ]/.test(word.en);
                          const total = sentenceList.length;
                          const pct = Math.round((idx / total) * 100);
                          const revealed = reviewSentenceRevealed;
                          const setRevealed = setReviewSentenceRevealed;
                          const goNext = () => {
                            setReviewSentenceRevealed(false);
                            const nextIdx = idx + 1 < total ? idx + 1 : 0;
                            setReviewQuizIdx(nextIdx);
                          };
                          return (
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                                minHeight: 0,
                              }}
                            >
                              {/* 進捗 */}
                              <div className="shrink-0">
                                <div
                                  className="flex justify-between text-xs font-bold mb-1"
                                  style={{ color: theme.textMuted }}
                                >
                                  <span>
                                    {idx + 1} / {total}
                                  </span>
                                  <span>{pct}%</span>
                                </div>
                                <div
                                  className="w-full rounded-full overflow-hidden"
                                  style={{
                                    height: 4,
                                    background: isLight
                                      ? "rgba(0,0,0,0.10)"
                                      : "rgba(255,255,255,0.10)",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 99,
                                      width: `${pct}%`,
                                      background: `linear-gradient(90deg,${theme.accent}88,${theme.accent})`,
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>
                              </div>
                              {/* 例文カード */}
                              <div
                                className="rounded-[20px] p-6 text-center shrink-0"
                                style={{
                                  background: isLight
                                    ? "rgba(255,255,255,0.92)"
                                    : "rgba(255,255,255,0.06)",
                                  border: isLight
                                    ? "2px solid rgba(0,0,0,0.15)"
                                    : "1px solid rgba(255,255,255,0.12)",
                                  boxShadow: isLight
                                    ? "0 2px 12px rgba(0,0,0,0.08)"
                                    : "none",
                                }}
                              >
                                <p
                                  className="text-xs font-black uppercase tracking-widest mb-4"
                                  style={{ color: theme.textMuted }}
                                >
                                  ___に入る単語は？
                                </p>
                                <p
                                  className="text-xl font-bold leading-relaxed"
                                  style={{ color: theme.text }}
                                >
                                  {formatSentence(word.sentence, word.en)}
                                </p>
                                {revealed && (
                                  <div
                                    className="mt-4 pt-4"
                                    style={{
                                      borderTop: isLight
                                        ? "1px solid rgba(0,0,0,0.10)"
                                        : "1px solid rgba(255,255,255,0.10)",
                                    }}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <p
                                        className="text-3xl font-black"
                                        style={{ color: theme.accent }}
                                      >
                                        {word.en}
                                      </p>
                                      {isEn && (
                                        <button
                                          onClick={() => speak(word.en)}
                                          className="p-1.5 rounded-lg active:scale-90"
                                          style={{
                                            background: isLight
                                              ? "rgba(0,0,0,0.07)"
                                              : "rgba(255,255,255,0.08)",
                                            color: isLight
                                              ? "rgba(20,10,60,0.45)"
                                              : "rgba(255,255,255,0.5)",
                                          }}
                                        >
                                          <Volume2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                    <p
                                      className="text-sm mt-1"
                                      style={{
                                        color: isLight
                                          ? "rgba(99,102,241,0.85)"
                                          : "rgba(165,180,252,0.85)",
                                      }}
                                    >
                                      {getOptionLabel(word, "en-ja")}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {/* ボタン */}
                              <div className="flex gap-3 shrink-0">
                                {!revealed ? (
                                  <button
                                    onClick={() => setRevealed(true)}
                                    className="flex-1 py-4 rounded-[20px] font-black text-white active:scale-95 transition-all"
                                    style={{
                                      background: `linear-gradient(135deg,${theme.accent}cc,${theme.accent})`,
                                      boxShadow: `0 4px 16px ${theme.accent}44`,
                                    }}
                                  >
                                    答えを見る
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        removeReviewItem(word);
                                        goNext();
                                        showToast("✓ 覚えた！ (+1コイン)");
                                        // コイン加算処理
                                        const newPts =
                                          (profile?.petPoints || 0) + 1;
                                        const updated = {
                                          ...profile,
                                          petPoints: newPts,
                                        };
                                        setProfile(updated);
                                        saveLocal("profile", updated);
                                        if (user && fb.enabled) {
                                          setDoc(
                                            doc(
                                              fb.db,
                                              "artifacts",
                                              fb.appId,
                                              "users",
                                              user.uid,
                                              "profile",
                                              "main"
                                            ),
                                            { petPoints: newPts },
                                            { merge: true }
                                          ).catch(() => null);
                                        }
                                      }}
                                      className="flex-1 py-4 rounded-[20px] font-black active:scale-95 transition-all"
                                      style={{
                                        background: "rgba(52,211,153,0.2)",
                                        color: "#34d399",
                                        border: "1.5px solid #34d399",
                                      }}
                                    >
                                      ✓ 覚えた
                                    </button>
                                    <button
                                      onClick={goNext}
                                      className="flex-1 py-4 rounded-[20px] font-black active:scale-95 transition-all"
                                      style={{
                                        background: isLight
                                          ? "rgba(0,0,0,0.05)"
                                          : "rgba(255,255,255,0.06)",
                                        color: isLight
                                          ? "rgba(20,10,60,0.65)"
                                          : theme.textMuted,
                                        border: isLight
                                          ? "1.5px solid rgba(0,0,0,0.15)"
                                          : "1px solid rgba(255,255,255,0.12)",
                                      }}
                                    >
                                      次へ →
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })()}

              {/* --- 単語帳画面 --- */}
              {screen === "wordbook" &&
                (() => {
                  const myUid = user?.uid || "";
                  const reviewEnSet = new Set(reviewList.map((r) => r.en));
                  const reviewEnToId = {};
                  reviewList.forEach((r) => {
                    reviewEnToId[r.en] = r.id;
                  });

                  const toggleReview = async (word) => {
                    const isInReview = reviewEnSet.has(word.en);
                    if (isInReview) {
                      const rid = reviewEnToId[word.en];
                      if (!rid) return;
                      deletingReviewIds.current.add(rid);
                      setReviewList((prev) => prev.filter((r) => r.id !== rid));
                      if (user && fb.enabled) {
                        try {
                          await deleteDoc(
                            doc(
                              fb.db,
                              "artifacts",
                              fb.appId,
                              "users",
                              user.uid,
                              "review",
                              rid
                            )
                          );
                        } catch (e: any) {}
                        setTimeout(() => {
                          deletingReviewIds.current.delete(rid);
                        }, 3000);
                      }
                      showToast("復習リストから削除しました");
                    } else {
                      const { id: _id, ...wordData } = word;
                      if (user && fb.enabled) {
                        await addDoc(
                          collection(
                            fb.db,
                            "artifacts",
                            fb.appId,
                            "users",
                            user.uid,
                            "review"
                          ),
                          wordData
                        );
                      } else {
                        setReviewList((prev) => [
                          ...prev,
                          { ...wordData, id: Date.now().toString() },
                        ]);
                      }
                      showToast("復習リストに追加しました！");
                    }
                  };

                  const stages = Array.from({ length: 20 }, (_, i) => i + 1);
                  const myCustomWords = customVocabList.filter((w) => {
                    const at = w.assignedTo;
                    return (
                      at === "all" ||
                      at === undefined ||
                      (Array.isArray(at) && at.includes(myUid))
                    );
                  });

                  return (
                    <div
                      className="animate-in fade-in text-left pb-10"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div className="flex items-center gap-4 mb-5 shrink-0">
                        <button
                          onClick={() => {
                            if (wordbookStage !== null) {
                              setWordbookStage(null);
                            } else {
                              setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start");
                            }
                          }}
                          className="rx-back"
                          aria-label="戻る"
                          style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}
                        >
                          <ChevronLeft />
                        </button>
                        <h2
                          className="text-3xl font-black"
                          style={{ color: theme.text }}
                        >
                          {wordbookStage !== null
                            ? `Stage ${wordbookStage}`
                            : wordbookTab === "custom"
                            ? "カスタム問題"
                            : wordbookTab === "myword"
                            ? "マイワード"
                            : "単語帳"}
                        </h2>
                        <span
                          className="ml-auto text-sm font-bold px-3 py-1 rounded-full"
                          style={{
                            background: isLight
                              ? "rgba(6,182,212,0.12)"
                              : "rgba(6,182,212,0.15)",
                            color: isLight ? "#0e7490" : "#67e8f9",
                            border: "1px solid rgba(6,182,212,0.3)",
                          }}
                        >
                          {wordbookStage !== null
                            ? `${
                                vocabList.filter(
                                  (v) => v.stage === wordbookStage
                                ).length
                              }語`
                            : wordbookTab === "custom"
                            ? `${myCustomWords.length}語`
                            : wordbookTab === "myword"
                            ? `${userVocabList.length}語`
                            : `${stages.length}ステージ`}
                        </span>
                      </div>

                      {wordbookStage === null && (
                        <>
                          <div className="flex gap-2 mb-3 shrink-0">
                            {[
                              {
                                key: "stage",
                                label: "マップ別",
                                iconFn: (c) => (
                                  <MapIcon size={13} style={{ color: c }} />
                                ),
                              },
                              {
                                key: "custom",
                                label: "配信",
                                iconFn: (c) => <IcGift size={13} color={c} />,
                              },
                              {
                                key: "myword",
                                label: "マイワード",
                                iconFn: (c) => (
                                  <IcFactory size={13} color={c} />
                                ),
                              },
                            ].map((t) => {
                              const iconColor =
                                wordbookTab === t.key
                                  ? "white"
                                  : isLight
                                  ? "rgba(20,10,60,0.75)"
                                  : "rgba(255,255,255,0.75)";
                              return (
                                <button
                                  key={t.key}
                                  onClick={() => setWordbookTab(t.key)}
                                  className="flex-1 py-2 rounded-[12px] font-black text-sm transition-all flex items-center justify-center gap-1.5"
                                  style={{
                                    background:
                                      wordbookTab === t.key
                                        ? "linear-gradient(135deg,#0891b2,#06b6d4)"
                                        : isLight
                                        ? "rgba(0,0,0,0.06)"
                                        : "rgba(255,255,255,0.06)",
                                    color:
                                      wordbookTab === t.key
                                        ? "white"
                                        : isLight
                                        ? "rgba(20,10,60,0.75)"
                                        : "rgba(255,255,255,0.75)",
                                    border:
                                      wordbookTab === t.key
                                        ? "none"
                                        : isLight
                                        ? "1px solid rgba(0,0,0,0.15)"
                                        : "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  {t.iconFn(iconColor)}
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                          {wordbookTab === "stage" && (
                            <div className="flex gap-1.5 mb-3 shrink-0 flex-wrap">
                              {WORD_CATEGORIES.map((cat) => {
                                const CatIc = CATEGORY_ICONS[cat.key];
                                return (
                                  <button
                                    key={cat.key}
                                    onClick={() => {
                                      setWordbookCategory(cat.key);
                                      setWordbookStage(null);
                                    }}
                                    className="px-3 py-1 rounded-full font-black text-xs transition-all flex items-center gap-1"
                                    style={{
                                      background:
                                        wordbookCategory === cat.key
                                          ? cat.color
                                          : isLight
                                          ? "rgba(0,0,0,0.06)"
                                          : "rgba(255,255,255,0.06)",
                                      color:
                                        wordbookCategory === cat.key
                                          ? "white"
                                          : isLight
                                          ? "rgba(20,10,60,0.75)"
                                          : "rgba(255,255,255,0.75)",
                                      border:
                                        wordbookCategory === cat.key
                                          ? "none"
                                          : isLight
                                          ? "1px solid rgba(0,0,0,0.15)"
                                          : "1px solid rgba(255,255,255,0.1)",
                                    }}
                                  >
                                    {CatIc && (
                                      <CatIc
                                        size={12}
                                        color={
                                          wordbookCategory === cat.key
                                            ? "white"
                                            : isLight
                                            ? "rgba(20,10,60,0.75)"
                                            : "rgba(255,255,255,0.75)"
                                        }
                                      />
                                    )}
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}

                      <div
                        style={{
                          paddingBottom: "8px",
                        }}
                      >
                        {wordbookTab === "stage" &&
                          wordbookStage === null &&
                          (() => {
                            const catVocab = ALL_VOCAB.filter(
                              (v) =>
                                (v.category || "英単語") === wordbookCategory
                            );
                            const catStages = [
                              ...new Set(catVocab.map((v) => v.stage)),
                            ].sort((a, b) => a - b);
                            return (
                              <div className="grid grid-cols-4 gap-3 pb-4">
                                {catStages.map((s) => {
                                  const words = catVocab.filter(
                                    (v) => v.stage === s
                                  );
                                  const reviewedCount = words.filter((w) =>
                                    reviewEnSet.has(w.en)
                                  ).length;
                                  const isUnlocked =
                                    s <=
                                    ((profile?.unlockedStages || {})[
                                      wordbookCategory
                                    ] || 1);
                                  const catColor =
                                    WORD_CATEGORIES.find(
                                      (c) => c.key === wordbookCategory
                                    )?.color || "#0891b2";
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setWordbookStage(s)}
                                      className="rounded-[20px] p-3 flex flex-col items-center gap-1 transition-all active:scale-95 rx-soft"
                                      style={{
                                        background: isUnlocked
                                          ? isLight
                                            ? "rgba(0,0,0,0.05)"
                                            : "rgba(255,255,255,0.08)"
                                          : isLight
                                          ? "rgba(0,0,0,0.02)"
                                          : "rgba(255,255,255,0.03)",
                                        border: isUnlocked
                                          ? `1px solid ${catColor}55`
                                          : isLight
                                          ? "1px solid rgba(0,0,0,0.1)"
                                          : "1px solid rgba(255,255,255,0.08)",
                                        opacity: isUnlocked ? 1 : 0.5,
                                      }}
                                    >
                                      <span
                                        className="text-xs font-black"
                                        style={{
                                          color: isUnlocked
                                            ? catColor
                                            : isLight
                                            ? "rgba(0,0,0,0.25)"
                                            : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        Stage
                                      </span>
                                      <span
                                        className="text-2xl font-black"
                                        style={{
                                          color: isUnlocked
                                            ? theme.text
                                            : isLight
                                            ? "rgba(0,0,0,0.25)"
                                            : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        {s}
                                      </span>
                                      <span
                                        className="text-[10px] font-bold"
                                        style={{
                                          color:
                                            reviewedCount > 0
                                              ? "#16a34a"
                                              : isLight
                                              ? "rgba(0,0,0,0.4)"
                                              : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        {reviewedCount > 0
                                          ? `✓ ${reviewedCount}`
                                          : `${words.length}語`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}

                        {wordbookTab === "stage" &&
                          wordbookStage !== null &&
                          (() => {
                            const catVocab = ALL_VOCAB.filter(
                              (v) =>
                                (v.category || "英単語") === wordbookCategory &&
                                v.stage === wordbookStage
                            );
                            return (
                              <div className="space-y-2 pb-4">
                                {catVocab.length === 0 ? (
                                  <p
                                    className="text-center font-bold py-10"
                                    style={{
                                      color: isLight
                                        ? "rgba(0,0,0,0.3)"
                                        : "rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    このステージに単語がありません
                                  </p>
                                ) : (
                                  catVocab.map((word, idx) => {
                                    const inReview = reviewEnSet.has(word.en);
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 rounded-[20px] transition-all rx-soft"
                                        style={{
                                          background: inReview
                                            ? "rgba(74,222,128,0.08)"
                                            : isLight
                                            ? "rgba(0,0,0,0.04)"
                                            : "rgba(255,255,255,0.05)",
                                          border: inReview
                                            ? "1px solid rgba(74,222,128,0.3)"
                                            : isLight
                                            ? "1px solid rgba(0,0,0,0.1)"
                                            : "1px solid rgba(255,255,255,0.08)",
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-lg font-black"
                                            style={{ color: theme.text }}
                                          >
                                            {word.en}
                                          </p>
                                          <p
                                            className="text-sm font-bold"
                                            style={{
                                              color: isLight
                                                ? "#6d28d9"
                                                : "rgba(165,180,252,0.85)",
                                            }}
                                          >
                                            {getOptionLabel(word, "en-ja")}
                                          </p>
                                          {word.sentence && (
                                            <p
                                              className="text-xs mt-0.5 italic"
                                              style={{
                                                color: isLight
                                                  ? "rgba(0,0,0,0.45)"
                                                  : "rgba(255,255,255,0.28)",
                                              }}
                                            >
                                              {word.sentence}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => toggleReview(word)}
                                          className="shrink-0 w-9 h-9 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                          style={{
                                            background: inReview
                                              ? "rgba(74,222,128,0.2)"
                                              : isLight
                                              ? "rgba(0,0,0,0.06)"
                                              : "rgba(255,255,255,0.06)",
                                            border: inReview
                                              ? "2px solid #4ade80"
                                              : isLight
                                              ? "2px solid rgba(0,0,0,0.2)"
                                              : "2px solid rgba(255,255,255,0.15)",
                                            color: inReview
                                              ? "#16a34a"
                                              : isLight
                                              ? "rgba(0,0,0,0.4)"
                                              : "rgba(255,255,255,0.3)",
                                          }}
                                        >
                                          {inReview ? (
                                            <CheckCircle2 size={18} />
                                          ) : (
                                            <Plus size={18} />
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })()}

                        {wordbookTab === "custom" && (
                          <div className="space-y-2 pb-4">
                            {myCustomWords.length === 0 ? (
                              <div
                                className="p-8 rounded-[20px] text-center"
                                style={{
                                  background: isLight
                                    ? "rgba(0,0,0,0.04)"
                                    : "rgba(255,255,255,0.04)",
                                  border: isLight
                                    ? "1px solid rgba(0,0,0,0.1)"
                                    : "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <p
                                  className="font-bold"
                                  style={{
                                    color: isLight
                                      ? "rgba(0,0,0,0.35)"
                                      : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  配布されたカスタム問題はありません
                                </p>
                              </div>
                            ) : (
                              myCustomWords.map((word) => {
                                const inReview = reviewEnSet.has(word.en);
                                const seen = Array.isArray(word.seenBy)
                                  ? word.seenBy.includes(myUid)
                                  : false;
                                const catColor =
                                  WORD_CATEGORIES.find(
                                    (c) => c.key === (word.category || "英単語")
                                  )?.color || "#0891b2";
                                return (
                                  <div
                                    key={word.id}
                                    className="flex items-center gap-3 p-3 rounded-[20px] transition-all rx-soft"
                                    style={{
                                      background: inReview
                                        ? "rgba(74,222,128,0.08)"
                                        : isLight
                                        ? "rgba(0,0,0,0.04)"
                                        : "rgba(255,255,255,0.05)",
                                      border: inReview
                                        ? "1px solid rgba(74,222,128,0.3)"
                                        : isLight
                                        ? "1px solid rgba(0,0,0,0.1)"
                                        : "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                        <p
                                          className="text-lg font-black"
                                          style={{ color: theme.text }}
                                        >
                                          {word.en}
                                        </p>
                                        {word.category && (
                                          <span
                                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{
                                              background: `${catColor}22`,
                                              color: catColor,
                                              border: `1px solid ${catColor}44`,
                                            }}
                                          >
                                            {word.category}
                                          </span>
                                        )}
                                        {seen && (
                                          <span
                                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{
                                              background: `${theme.accent}18`,
                                              color: theme.accent,
                                            }}
                                          >
                                            挑戦済
                                          </span>
                                        )}
                                      </div>
                                      <p
                                        className="text-sm font-bold"
                                        style={{
                                          color: isLight
                                            ? "#6d28d9"
                                            : "rgba(165,180,252,0.85)",
                                        }}
                                      >
                                        {getOptionLabel(word, "en-ja")}
                                      </p>
                                      {word.sentence && (
                                        <p
                                          className="text-xs mt-0.5 italic"
                                          style={{
                                            color: isLight
                                              ? "rgba(0,0,0,0.45)"
                                              : "rgba(255,255,255,0.28)",
                                          }}
                                        >
                                          {word.sentence}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleReview(word)}
                                      className="shrink-0 w-9 h-9 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                      style={{
                                        background: inReview
                                          ? "rgba(74,222,128,0.2)"
                                          : isLight
                                          ? "rgba(0,0,0,0.06)"
                                          : "rgba(255,255,255,0.06)",
                                        border: inReview
                                          ? "2px solid #4ade80"
                                          : isLight
                                          ? "2px solid rgba(0,0,0,0.2)"
                                          : "2px solid rgba(255,255,255,0.15)",
                                        color: inReview
                                          ? "#16a34a"
                                          : isLight
                                          ? "rgba(0,0,0,0.4)"
                                          : "rgba(255,255,255,0.3)",
                                      }}
                                    >
                                      {inReview ? (
                                        <CheckCircle2 size={18} />
                                      ) : (
                                        <Plus size={18} />
                                      )}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                        {wordbookTab === "myword" && (
                          <div className="space-y-2 pb-4">
                            {userVocabList.length === 0 ? (
                              <div
                                className="p-8 rounded-[20px] text-center"
                                style={{
                                  background: isLight
                                    ? "rgba(0,0,0,0.04)"
                                    : "rgba(255,255,255,0.04)",
                                  border: isLight
                                    ? "1px solid rgba(0,0,0,0.1)"
                                    : "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <p
                                  className="font-bold"
                                  style={{
                                    color: isLight
                                      ? "rgba(0,0,0,0.35)"
                                      : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  まだマイワードがありません
                                </p>
                                <p
                                  className="text-xs mt-1"
                                  style={{
                                    color: isLight
                                      ? "rgba(0,0,0,0.25)"
                                      : "rgba(255,255,255,0.2)",
                                  }}
                                >
                                  FACTORYで単語を作ってみよう！
                                </p>
                              </div>
                            ) : (
                              userVocabList.map((word) => {
                                const inReview = reviewList.some(
                                  (r) => r.en === word.en
                                );
                                return (
                                  <div
                                    key={word.id}
                                    className="flex items-center gap-3 p-3 rounded-[20px] transition-all rx-soft"
                                    style={{
                                      background: inReview
                                        ? "rgba(249,115,22,0.08)"
                                        : isLight
                                        ? "rgba(0,0,0,0.04)"
                                        : "rgba(255,255,255,0.05)",
                                      border: inReview
                                        ? "1px solid rgba(249,115,22,0.3)"
                                        : isLight
                                        ? "1px solid rgba(0,0,0,0.1)"
                                        : "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-lg font-black"
                                        style={{ color: theme.text }}
                                      >
                                        {word.en}
                                      </p>
                                      <p
                                        className="text-sm font-bold mt-0.5"
                                        style={{
                                          color: isLight
                                            ? "rgba(0,0,0,0.5)"
                                            : "rgba(255,255,255,0.5)",
                                        }}
                                      >
                                        {word.ja}
                                      </p>
                                      {word.sentence && (
                                        <p
                                          className="text-xs mt-1 italic"
                                          style={{
                                            color: isLight
                                              ? "rgba(0,0,0,0.4)"
                                              : "rgba(255,255,255,0.35)",
                                          }}
                                        >
                                          {word.sentence}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <button
                                        onClick={async () => {
                                          if (user && fb.enabled) {
                                            try {
                                              await deleteDoc(
                                                doc(
                                                  fb.db,
                                                  "artifacts",
                                                  fb.appId,
                                                  "users",
                                                  user.uid,
                                                  "userVocab",
                                                  word.id
                                                )
                                              );
                                            } catch {}
                                          } else {
                                            setUserVocabList((prev) =>
                                              prev.filter(
                                                (w) => w.id !== word.id
                                              )
                                            );
                                          }
                                          showToast("削除しました");
                                        }}
                                        className="w-8 h-8 rounded-[12px] flex items-center justify-center"
                                        style={{
                                          background: `${theme.accent}18`,
                                          color: theme.accent,
                                          border:
                                            `1px solid ${theme.accent}33`,
                                        }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (inReview) {
                                            const target = reviewList.find(
                                              (r) => r.en === word.en
                                            );
                                            if (target && user && fb.enabled) {
                                              try {
                                                await deleteDoc(
                                                  doc(
                                                    fb.db,
                                                    "artifacts",
                                                    fb.appId,
                                                    "users",
                                                    user.uid,
                                                    "review",
                                                    target.id
                                                  )
                                                );
                                              } catch {}
                                            } else {
                                              setReviewList((prev) =>
                                                prev.filter(
                                                  (r) => r.en !== word.en
                                                )
                                              );
                                            }
                                            showToast(
                                              "復習リストから削除しました"
                                            );
                                          } else {
                                            const { id: _id, ...wordData } =
                                              word;
                                            if (user && fb.enabled) {
                                              await addDoc(
                                                collection(
                                                  fb.db,
                                                  "artifacts",
                                                  fb.appId,
                                                  "users",
                                                  user.uid,
                                                  "review"
                                                ),
                                                wordData
                                              );
                                            } else {
                                              setReviewList((prev) => [
                                                ...prev,
                                                {
                                                  ...wordData,
                                                  id: Date.now().toString(),
                                                },
                                              ]);
                                            }
                                            showToast(
                                              "復習リストに追加しました！"
                                            );
                                          }
                                        }}
                                        className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                        style={{
                                          background: inReview
                                            ? "rgba(74,222,128,0.2)"
                                            : isLight
                                            ? "rgba(0,0,0,0.06)"
                                            : "rgba(255,255,255,0.06)",
                                          border: inReview
                                            ? "2px solid #4ade80"
                                            : isLight
                                            ? "2px solid rgba(0,0,0,0.2)"
                                            : "2px solid rgba(255,255,255,0.15)",
                                          color: inReview
                                            ? "#16a34a"
                                            : isLight
                                            ? "rgba(0,0,0,0.4)"
                                            : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        {inReview ? (
                                          <CheckCircle2 size={18} />
                                        ) : (
                                          <Plus size={18} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* --- 配信画面 --- */}
              {screen === "customApp" && (
                <div className="space-y-6 animate-in fade-in text-left pb-10">
                  <div className="flex items-center gap-4 text-left">
                    <button
                      onClick={() => {
                        if (!profile?.isTeacher && customSubMode !== null) {
                          setCustomSubMode(null);
                        } else {
                          setCustomSubMode(null);
                          setScreen(prevScreen && prevScreen !== screen ? prevScreen : "start");
                        }
                      }}
                      className="rx-back"
                      aria-label="戻る"
                      style={{ ["--accent" as any]: theme.accent, ["--ink" as any]: theme.text }}
                    >
                      <ChevronLeft />
                    </button>
                    <h2
                      className="text-3xl font-black"
                      style={{
                        color: isLight ? "rgba(20,10,60,0.9)" : "white",
                      }}
                    >
                      {!profile?.isTeacher && customSubMode === "questions"
                        ? "先生からの問題"
                        : !profile?.isTeacher && customSubMode === "apps"
                        ? "配布アプリ"
                        : "配信"}
                    </h2>
                  </div>

                  {profile?.isTeacher ? (
                    <div className="space-y-6">
                      <div
                        className="rounded-[20px] p-6 space-y-4 rx-soft"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.03)"
                            : "rgba(255,255,255,0.05)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <h3 className="font-black text-xl flex items-center gap-2 text-rose-400">
                          <Plus size={24} /> 問題を作成して配布
                        </h3>
                        <div className="space-y-3">
                          {/* カテゴリ選択 */}
                          <div className="flex gap-1.5 flex-wrap">
                            {WORD_CATEGORIES.map((cat) => {
                              const CatIc = CATEGORY_ICONS[cat.key];
                              return (
                                <button
                                  key={cat.key}
                                  type="button"
                                  onClick={() =>
                                    setNewCustomWord({
                                      ...newCustomWord,
                                      category: cat.key,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-full font-black text-xs transition-all flex items-center gap-1"
                                  style={{
                                    background:
                                      (newCustomWord.category || "英単語") ===
                                      cat.key
                                        ? cat.color
                                        : isLight
                                        ? "rgba(0,0,0,0.06)"
                                        : "rgba(255,255,255,0.07)",
                                    color:
                                      (newCustomWord.category || "英単語") ===
                                      cat.key
                                        ? "white"
                                        : theme.text,
                                    border:
                                      (newCustomWord.category || "英単語") ===
                                      cat.key
                                        ? "none"
                                        : "1px solid rgba(255,255,255,0.12)",
                                  }}
                                >
                                  {CatIc && <CatIc size={12} color="white" />}
                                  {cat.label}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            type="text"
                            placeholder="問題（単語・熟語・漢字・化学用語など）"
                            value={newCustomWord.en}
                            onChange={(e) =>
                              setNewCustomWord({
                                ...newCustomWord,
                                en: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm outline-none text-white"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          />
                          <input
                            type="text"
                            placeholder="答え・読み・意味"
                            value={newCustomWord.ja}
                            onChange={(e) =>
                              setNewCustomWord({
                                ...newCustomWord,
                                ja: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm outline-none text-white"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          />
                          <textarea
                            placeholder="例文・例題・補足説明..."
                            value={newCustomWord.sentence}
                            onChange={(e) =>
                              setNewCustomWord({
                                ...newCustomWord,
                                sentence: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm min-h-[70px] outline-none text-white"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              resize: "none",
                            }}
                          />
                          {/* 配布先選択 */}
                          <div
                            className="rounded-[12px] p-3 space-y-2"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <p className="text-xs font-black text-white/60 mb-2">
                              配布先
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="assignTarget"
                                checked={customAssignTarget === "all"}
                                onChange={() => setCustomAssignTarget("all")}
                                style={{ accentColor: theme.accent }}
                              />
                              <span className="text-white font-bold text-sm">
                                全員に配布
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="assignTarget"
                                checked={customAssignTarget !== "all"}
                                onChange={() => setCustomAssignTarget([])}
                                style={{ accentColor: theme.accent }}
                              />
                              <span className="text-white font-bold text-sm">
                                特定の生徒に配布
                              </span>
                            </label>
                            {customAssignTarget !== "all" && (
                              <div className="mt-2 space-y-1 max-h-[20vh] overflow-y-auto pl-2">
                                {leaderboard.length === 0 ? (
                                  <p className="text-white/40 text-xs font-bold">
                                    生徒がいません
                                  </p>
                                ) : (
                                  leaderboard.map((s) => {
                                    const isSelected =
                                      Array.isArray(customAssignTarget) &&
                                      customAssignTarget.includes(s.id);
                                    return (
                                      <label
                                        key={s.id}
                                        className="flex items-center gap-2 cursor-pointer py-1"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setCustomAssignTarget(
                                                customAssignTarget.filter(
                                                  (id) => id !== s.id
                                                )
                                              );
                                            } else {
                                              setCustomAssignTarget([
                                                ...(Array.isArray(
                                                  customAssignTarget
                                                )
                                                  ? customAssignTarget
                                                  : []),
                                                s.id,
                                              ]);
                                            }
                                          }}
                                          style={{ accentColor: theme.accent }}
                                        />
                                        <span className="text-white font-bold text-sm">
                                          {s.name}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={addCustomWordToDB}
                            disabled={
                              isAdding ||
                              (customAssignTarget !== "all" &&
                                Array.isArray(customAssignTarget) &&
                                customAssignTarget.length === 0)
                            }
                            className="w-full py-3.5 text-white rounded-[12px] font-black text-base active:opacity-80 transition-all disabled:opacity-40"
                            style={{
                              background: theme.accentGrad || theme.accent,
                            }}
                          >
                            {isAdding
                              ? "保存中..."
                              : customAssignTarget === "all"
                              ? "保存して全員に配布"
                              : `保存して${
                                  Array.isArray(customAssignTarget)
                                    ? customAssignTarget.length
                                    : 0
                                }人に配布`}
                          </button>
                        </div>
                      </div>

                      <div
                        className="rounded-[20px] p-6 space-y-4 rx-soft"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.03)"
                            : "rgba(255,255,255,0.05)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <h3
                          className="font-black text-xl flex items-center gap-2"
                          style={{
                            color: isLight ? "#25223f" : "#ffffff",
                          }}
                        >
                          <Layers size={24} color={theme.accent} />{" "}
                          配布中の問題 ({customVocabList.length}問)
                        </h3>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                          {customVocabList.length === 0 ? (
                            <p
                              className="text-sm font-bold text-center py-4"
                              style={{
                                color: isLight
                                  ? "#8a8995"
                                  : "rgba(255,255,255,0.4)",
                              }}
                            >
                              まだ問題がありません
                            </p>
                          ) : (
                            customVocabList.map((w) => (
                              <div
                                key={w.id}
                                className="flex items-center justify-between p-3 rounded-[12px]"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <p className="font-black text-white text-base leading-none">
                                      {w.en}
                                    </p>
                                    {w.category &&
                                      (() => {
                                        const cat = WORD_CATEGORIES.find(
                                          (c) => c.key === w.category
                                        );
                                        return cat ? (
                                          <span
                                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{
                                              background: `${cat.color}22`,
                                              color: cat.color,
                                              border: `1px solid ${cat.color}44`,
                                            }}
                                          >
                                            {cat.label}
                                          </span>
                                        ) : null;
                                      })()}
                                  </div>
                                  <p className="text-xs font-bold text-white/60">
                                    {getOptionLabel(w, "en-ja")}
                                  </p>
                                  <p
                                    className="text-xs font-bold mt-1"
                                    style={{ color: "rgba(255,255,255,0.35)" }}
                                  >
                                    {w.assignedTo === "all" ||
                                    w.assignedTo === undefined
                                      ? "全員"
                                      : Array.isArray(w.assignedTo)
                                      ? `${w.assignedTo.length}人`
                                      : "全員"}
                                    {" · "}挑戦済み{" "}
                                    {Array.isArray(w.seenBy)
                                      ? w.seenBy.length
                                      : 0}
                                    人
                                  </p>
                                </div>
                                <button
                                  onClick={() => deleteCustomWord(w.id)}
                                  className="p-3 text-rose-400 hover:bg-rose-400/20 rounded-lg transition-all"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* ── 配布アプリ登録 ── */}
                      <div
                        className="rounded-[20px] p-6 space-y-4 rx-soft"
                        style={{
                          background: isLight
                            ? "rgba(0,0,0,0.03)"
                            : "rgba(255,255,255,0.05)",
                          border: isLight
                            ? "1px solid rgba(0,0,0,0.15)"
                            : "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <h3
                          className="font-black text-xl flex items-center gap-2"
                          style={{ color: theme.accent }}
                        >
                          <Layers size={22} /> 配布アプリを登録
                        </h3>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="アプリ名"
                            value={newSharedApp.name}
                            onChange={(e) =>
                              setNewSharedApp({
                                ...newSharedApp,
                                name: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm outline-none text-white"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          />
                          <input
                            type="url"
                            placeholder="URL（https://...）"
                            value={newSharedApp.url}
                            onChange={(e) =>
                              setNewSharedApp({
                                ...newSharedApp,
                                url: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm outline-none text-white"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          />
                          <input
                            type="text"
                            placeholder="説明（任意）"
                            value={newSharedApp.description}
                            onChange={(e) =>
                              setNewSharedApp({
                                ...newSharedApp,
                                description: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-[12px] font-bold text-sm outline-none text-white"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          />
                          <button
                            onClick={async () => {
                              if (
                                !newSharedApp.name.trim() ||
                                !newSharedApp.url.trim()
                              ) {
                                showToast(
                                  "アプリ名とURLを入力してください",
                                  "error"
                                );
                                return;
                              }
                              try {
                                await addDoc(
                                  collection(
                                    fb.db,
                                    "artifacts",
                                    fb.appId,
                                    "public",
                                    "data",
                                    "sharedApps"
                                  ),
                                  {
                                    name: newSharedApp.name.trim(),
                                    url: newSharedApp.url.trim(),
                                    description:
                                      newSharedApp.description.trim(),
                                    createdAt: Date.now(),
                                  }
                                );
                                setNewSharedApp({
                                  name: "",
                                  url: "",
                                  description: "",
                                });
                                showToast("アプリを配布しました！");
                              } catch (e) {
                                showToast("エラー: " + e.message, "error");
                              }
                            }}
                            className="w-full py-3 rounded-[12px] font-black text-white text-sm active:scale-95 transition-all"
                            style={{
                              background: theme.accentGrad || theme.accent,
                              boxShadow: `0 4px 14px ${theme.accent}44`,
                            }}
                          >
                            <Layers
                              size={16}
                              style={{ display: "inline", marginRight: 6 }}
                            />{" "}
                            配布する
                          </button>
                        </div>
                        {sharedApps.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <p
                              className="text-xs font-black"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >
                              配布中のアプリ
                            </p>
                            {sharedApps.map((app) => (
                              <div
                                key={app.id}
                                className="flex items-center gap-3 p-3 rounded-[12px]"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p className="font-black text-sm text-white truncate">
                                    {app.name}
                                  </p>
                                  <p
                                    className="text-xs truncate"
                                    style={{ color: "rgba(255,255,255,0.35)" }}
                                  >
                                    {app.url}
                                  </p>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `「${app.name}」を削除しますか？`
                                      )
                                    ) {
                                      await deleteDoc(
                                        doc(
                                          fb.db,
                                          "artifacts",
                                          fb.appId,
                                          "public",
                                          "data",
                                          "sharedApps",
                                          app.id
                                        )
                                      );
                                      showToast("削除しました");
                                    }
                                  }}
                                  className="p-2 text-rose-400 hover:bg-rose-400/20 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* 生徒側 */
                    <div className="space-y-4">
                      {customSubMode === null ? (
                        /* ── 選択画面 ── */
                        (() => {
                          const _myUid = user?.uid || "";
                          const newCustomCount = customVocabList.filter((w) => {
                            const at = w.assignedTo;
                            const isAssigned =
                              at === "all" ||
                              at === undefined ||
                              (Array.isArray(at) && at.includes(_myUid));
                            if (!isAssigned) return false;
                            const seen = Array.isArray(w.seenBy)
                              ? w.seenBy.includes(_myUid)
                              : false;
                            return !seen;
                          }).length;
                          return (
                            <div className="space-y-4 pt-2">
                              {/* 先生からの問題 */}
                              <button
                                onClick={() => setCustomSubMode("questions")}
                                className="w-full active:scale-[0.97] transition-transform duration-150 relative overflow-hidden text-left"
                                style={{
                                  borderRadius: 32,
                                  minHeight: 112,
                                  background: isLight
                                    ? "rgba(255,255,255,0.78)"
                                    : "rgba(15,8,35,0.58)",
                                  backdropFilter: "blur(22px)",
                                  WebkitBackdropFilter: "blur(22px)",
                                  border: isLight
                                    ? "1.5px solid rgba(15,23,42,0.14)"
                                    : "1.5px solid rgba(255,255,255,0.32)",
                                  boxShadow: isLight
                                    ? "0 14px 36px rgba(15,23,42,0.08),inset 0 1px 0 rgba(255,255,255,0.98)"
                                    : "0 6px 28px rgba(0,0,0,0.62),inset 0 1px 0 rgba(255,255,255,0.10)",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    right: "-12%",
                                    bottom: "-18%",
                                    width: "65%",
                                    height: "75%",
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle,${theme.accent}22 0%,transparent 70%)`,
                                    pointerEvents: "none",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 16,
                                    bottom: 16,
                                  }}
                                >
                                  <IcGift
                                    size={44}
                                    color={theme.accent}
                                    style={
                                      isLight
                                        ? {}
                                        : {
                                            filter: `drop-shadow(0 0 6px ${theme.accent}cc)`,
                                          }
                                    }
                                  />
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 16,
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: "0.13em",
                                      textTransform: "uppercase",
                                      color: isLight
                                        ? "rgba(40,20,80,0.55)"
                                        : "rgba(255,255,255,0.50)",
                                    }}
                                  >
                                    配布された問題に挑戦
                                  </p>
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 16,
                                    left: 16,
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 22,
                                      fontWeight: 900,
                                      color: isLight
                                        ? "rgba(20,10,60,0.95)"
                                        : "rgba(255,255,255,0.98)",
                                    }}
                                  >
                                    先生からの問題
                                  </p>
                                </div>
                                {newCustomCount > 0 && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 12,
                                      right: 12,
                                      minWidth: 22,
                                      height: 22,
                                      borderRadius: 11,
                                      background:
                                        "linear-gradient(135deg,#ff4757,#c0392b)",
                                      boxShadow: "0 0 8px rgba(255,71,87,0.7)",
                                      color: "white",
                                      fontSize: 10,
                                      fontWeight: 800,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      paddingInline: 5,
                                    }}
                                  >
                                    {newCustomCount > 99
                                      ? "99+"
                                      : newCustomCount}
                                  </span>
                                )}
                              </button>

                              {/* 配布アプリ */}
                              <button
                                onClick={() => setCustomSubMode("apps")}
                                className="w-full active:scale-[0.97] transition-transform duration-150 relative overflow-hidden text-left"
                                style={{
                                  borderRadius: 32,
                                  minHeight: 112,
                                  background: isLight
                                    ? "rgba(255,255,255,0.78)"
                                    : "rgba(15,8,35,0.58)",
                                  backdropFilter: "blur(22px)",
                                  WebkitBackdropFilter: "blur(22px)",
                                  border: isLight
                                    ? "1.5px solid rgba(15,23,42,0.14)"
                                    : "1.5px solid rgba(255,255,255,0.32)",
                                  boxShadow: isLight
                                    ? "0 14px 36px rgba(15,23,42,0.08),inset 0 1px 0 rgba(255,255,255,0.98)"
                                    : "0 6px 28px rgba(0,0,0,0.62),inset 0 1px 0 rgba(255,255,255,0.10)",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    right: "-12%",
                                    bottom: "-18%",
                                    width: "65%",
                                    height: "75%",
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle,${theme.accent}22 0%,transparent 70%)`,
                                    pointerEvents: "none",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 16,
                                    bottom: 16,
                                  }}
                                >
                                  <Layers
                                    size={44}
                                    color={theme.accent}
                                    style={
                                      isLight
                                        ? {}
                                        : {
                                            filter: `drop-shadow(0 0 6px ${theme.accent}cc)`,
                                          }
                                    }
                                  />
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 16,
                                    left: 16,
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: "0.13em",
                                      textTransform: "uppercase",
                                      color: isLight
                                        ? "rgba(40,20,80,0.55)"
                                        : "rgba(255,255,255,0.50)",
                                    }}
                                  >
                                    先生から届いたアプリ
                                  </p>
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 16,
                                    left: 16,
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 22,
                                      fontWeight: 900,
                                      color: isLight
                                        ? "rgba(20,10,60,0.95)"
                                        : "rgba(255,255,255,0.98)",
                                    }}
                                  >
                                    配布アプリ
                                  </p>
                                </div>
                              </button>
                            </div>
                          );
                        })()
                      ) : customSubMode === "questions" ? (
                        /* ── 先生からの問題 ── */
                        <div className="space-y-4">
                          {/* タブ */}
                          <div className="flex gap-2">
                            {[
                              {
                                key: "new",
                                label: "新しい問題",
                                icon: <Sparkles size={13} />,
                              },
                              {
                                key: "past",
                                label: "過去の問題",
                                icon: <BookCheck size={13} />,
                              },
                            ].map((t) => {
                              const myUid = user?.uid || "";
                              const count = customVocabList.filter((w) => {
                                const at = w.assignedTo;
                                const isAssigned =
                                  at === "all" ||
                                  at === undefined ||
                                  (Array.isArray(at) && at.includes(myUid));
                                if (!isAssigned) return false;
                                const seen = Array.isArray(w.seenBy)
                                  ? w.seenBy.includes(myUid)
                                  : false;
                                return t.key === "new" ? !seen : seen;
                              }).length;
                              return (
                                <button
                                  key={t.key}
                                  onClick={() => setCustomTab(t.key)}
                                  className="flex-1 py-2.5 rounded-[12px] font-black text-sm transition-all flex items-center justify-center gap-1.5"
                                  style={{
                                    background:
                                      customTab === t.key
                                        ? theme.accentGrad || theme.accent
                                        : isLight
                                        ? "rgba(0,0,0,0.06)"
                                        : "rgba(255,255,255,0.06)",
                                    color:
                                      customTab === t.key
                                        ? "white"
                                        : isLight
                                        ? "rgba(20,10,60,0.75)"
                                        : "rgba(255,255,255,0.75)",
                                    border:
                                      customTab === t.key
                                        ? "none"
                                        : isLight
                                        ? "1px solid rgba(0,0,0,0.15)"
                                        : "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  {t.icon}
                                  {t.label}{" "}
                                  <span
                                    className="ml-1 text-xs"
                                    style={{ opacity: 0.75 }}
                                  >
                                    ({count})
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* タブ内容 */}
                          {(() => {
                            const myUid = user?.uid || "";
                            const tabWords = customVocabList.filter((w) => {
                              const at = w.assignedTo;
                              const isAssigned =
                                at === "all" ||
                                at === undefined ||
                                (Array.isArray(at) && at.includes(myUid));
                              if (!isAssigned) return false;
                              const seen = Array.isArray(w.seenBy)
                                ? w.seenBy.includes(myUid)
                                : false;
                              return customTab === "new" ? !seen : seen;
                            });

                            if (tabWords.length === 0) {
                              return (
                                <div
                                  className="rounded-[2.5rem] p-8 text-center"
                                  style={{
                                    background: isLight
                                      ? "rgba(0,0,0,0.03)"
                                      : "rgba(255,255,255,0.05)",
                                    border: isLight
                                      ? "1px solid rgba(0,0,0,0.15)"
                                      : "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <p
                                    className="font-black text-base"
                                    style={{
                                      color: isLight
                                        ? "#8a8995"
                                        : "rgba(255,255,255,0.4)",
                                    }}
                                  >
                                    {customTab === "new"
                                      ? "新しい問題はまだありません"
                                      : "過去に挑戦した問題はありません"}
                                  </p>
                                </div>
                              );
                            }
                            return (
                              <div
                                className="rounded-[2.5rem] p-8 text-center"
                                style={{
                                  background: isLight
                                    ? "rgba(0,0,0,0.03)"
                                    : "rgba(255,255,255,0.05)",
                                  border: isLight
                                    ? "1px solid rgba(0,0,0,0.15)"
                                    : "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                <div
                                  className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl"
                                  style={{
                                    background: theme.accentGrad || theme.accent,
                                    boxShadow: `0 8px 24px ${theme.accent}44`,
                                  }}
                                >
                                  {customTab === "new" ? (
                                    <IcGift
                                      size={48}
                                      color="rgba(255,255,255,0.95)"
                                    />
                                  ) : (
                                    <BookCheck
                                      size={48}
                                      style={{
                                        color: "rgba(255,255,255,0.95)",
                                      }}
                                    />
                                  )}
                                </div>
                                <h3
                                  className="text-2xl font-black mb-2"
                                  style={{
                                    color: isLight
                                      ? "#25223f"
                                      : "rgba(255,255,255,0.95)",
                                  }}
                                >
                                  {customTab === "new"
                                    ? "先生のオリジナル問題"
                                    : "復習モード"}
                                </h3>
                                <p
                                  className="font-bold text-sm mb-8"
                                  style={{
                                    color: isLight
                                      ? "#6b6b7a"
                                      : "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  {customTab === "new" ? (
                                    <>{tabWords.length}問が配布されています！</>
                                  ) : (
                                    <>
                                      過去に挑戦した
                                      <span className="text-amber-400 text-lg mx-1">
                                        {tabWords.length}
                                      </span>
                                      問を復習できます
                                    </>
                                  )}
                                </p>
                                <button
                                  onClick={() =>
                                    startCustomGame("meaning", customTab)
                                  }
                                  className="w-full py-4 text-white rounded-[20px] font-black text-lg active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                                  style={{
                                    background: theme.accentGrad || theme.accent,
                                  }}
                                >
                                  <Zap size={20} /> 単語モードで挑戦
                                </button>
                                <button
                                  onClick={() =>
                                    startCustomGame("sentence", customTab)
                                  }
                                  disabled={!tabWords.some((w) => w.sentence)}
                                  className="w-full py-4 text-white rounded-[20px] font-black text-lg active:scale-95 transition-all shadow-lg mt-4 flex items-center justify-center gap-2 disabled:opacity-40"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#10b981,#059669)",
                                  }}
                                >
                                  <BookOpen size={20} /> 例文モードで挑戦
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        /* ── 配布アプリ ── */
                        <div className="space-y-3">
                          {/* 学習日誌（常設） */}
                          <button
                            onClick={() => {
                              setPrevScreen("customApp");
                              setScreen("studyDiaryApp");
                            }}
                            className="w-full active:scale-[0.97] transition-transform duration-150 relative overflow-hidden text-left"
                            style={{
                              borderRadius: 20,
                              minHeight: 110,
                              background: isLight
                                ? "rgba(255,255,255,0.78)"
                                : "rgba(15,8,35,0.58)",
                              backdropFilter: "blur(22px)",
                              WebkitBackdropFilter: "blur(22px)",
                              border: isLight
                                ? "1.5px solid rgba(15,23,42,0.14)"
                                : "1.5px solid rgba(255,255,255,0.32)",
                              boxShadow: isLight
                                ? "0 14px 36px rgba(15,23,42,0.08),inset 0 1px 0 rgba(255,255,255,0.98)"
                                : "0 6px 28px rgba(0,0,0,0.62),inset 0 1px 0 rgba(255,255,255,0.10)",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                right: "-12%",
                                bottom: "-18%",
                                width: "65%",
                                height: "75%",
                                borderRadius: "50%",
                                background:
                                  "radial-gradient(circle,#06b6d422 0%,transparent 70%)",
                                pointerEvents: "none",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                right: 14,
                                bottom: 14,
                              }}
                            >
                              <Calendar
                                size={44}
                                color={isLight ? "#0891b2" : "#67e8f9"}
                                style={
                                  isLight
                                    ? {}
                                    : {
                                        filter:
                                          "drop-shadow(0 0 5px #67e8f9ee) drop-shadow(0 0 10px #06b6d466)",
                                      }
                                }
                              />
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                top: 14,
                                left: 14,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.13em",
                                  textTransform: "uppercase",
                                  color: isLight
                                    ? "rgba(40,20,80,0.60)"
                                    : "rgba(255,255,255,0.55)",
                                }}
                              >
                                毎日の学習を記録
                              </p>
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                bottom: 14,
                                left: 14,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 17,
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  color: isLight
                                    ? "rgba(20,10,60,0.95)"
                                    : "rgba(255,255,255,0.98)",
                                }}
                              >
                                学習日誌
                              </p>
                            </div>
                          </button>

                          {/* 先生から配布されたリンク */}
                          {sharedApps.length > 0 &&
                            sharedApps.map((app) => (
                              <a
                                key={app.id}
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="active:scale-[0.97] transition-transform duration-150"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 14,
                                  borderRadius: 28,
                                  padding: "14px 16px",
                                  background: isLight
                                    ? "rgba(255,255,255,0.78)"
                                    : "rgba(255,255,255,0.07)",
                                  backdropFilter: "blur(22px)",
                                  WebkitBackdropFilter: "blur(22px)",
                                  border: isLight
                                    ? "2px solid rgba(0,0,0,0.12)"
                                    : "1.5px solid rgba(255,255,255,0.15)",
                                  boxShadow: isLight
                                    ? "0 4px 20px rgba(0,0,0,0.08)"
                                    : "0 4px 20px rgba(0,0,0,0.3)",
                                  textDecoration: "none",
                                }}
                              >
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                      background: theme.accentGrad || theme.accent,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                      boxShadow: `0 4px 14px ${theme.accent}55`,
                                  }}
                                >
                                  <Layers
                                    size={24}
                                    color="rgba(255,255,255,0.95)"
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 800,
                                      color: isLight
                                        ? "rgba(20,10,60,0.9)"
                                        : "rgba(255,255,255,0.95)",
                                      marginBottom: 2,
                                    }}
                                  >
                                    {app.name}
                                  </p>
                                  {app.description && (
                                    <p
                                      style={{
                                        fontSize: 11,
                                        color: isLight
                                          ? "rgba(40,20,80,0.45)"
                                          : "rgba(255,255,255,0.4)",
                                        fontWeight: 500,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {app.description}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight
                                  size={16}
                                  style={{
                                    color: isLight
                                      ? "rgba(40,20,80,0.3)"
                                      : "rgba(255,255,255,0.25)",
                                    flexShrink: 0,
                                  }}
                                />
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </main>
          )}

          {!["login", "register", "loading"].includes(screen) && <Nav />}
          
          {/* クレジット: 目立たない場所に */}
          {!["login", "register", "loading"].includes(screen) && (
            <div
              style={{
                position: "fixed",
                bottom: "0px",
                left: 0,
                right: 0,
                textAlign: "center",
                padding: "2px 0 2px",
                pointerEvents: "auto",
                userSelect: "none",
                zIndex: 99,
              }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
              onTouchStart={() => {
                // ✅ Fix 1: 連打対策 - 既存タイマーを必ずクリアしてから新規セット
                clearTimeout(pressTimerRef.current);
                clearTimeout(revertTimerRef.current);
                pressTimerRef.current = setTimeout(() => {
                  setCreditState({
                    text: "designed & developed by miwa",
                    color: "rgba(255,255,255,0.55)",
                  });
                  revertTimerRef.current = setTimeout(() => {
                    setCreditState({
                      text: "✦ ORITAN",
                      color: "rgba(201,168,76,0.18)",
                    });
                  }, 3000);
                }, 800);
              }}
              onTouchMove={() => {
                // ✅ Fix 3: スワイプ中も長押しキャンセル
                clearTimeout(pressTimerRef.current);
              }}
              onTouchEnd={() => {
                clearTimeout(pressTimerRef.current);
              }}
              onTouchCancel={() => {
                clearTimeout(pressTimerRef.current);
              }}
              onMouseDown={() => {
                // ✅ Fix 4: PCマウス長押し対応
                clearTimeout(pressTimerRef.current);
                clearTimeout(revertTimerRef.current);
                pressTimerRef.current = setTimeout(() => {
                  setCreditState({
                    text: "designed & developed by miwa",
                    color: "rgba(255,255,255,0.55)",
                  });
                  revertTimerRef.current = setTimeout(() => {
                    setCreditState({
                      text: "✦ ORITAN",
                      color: "rgba(201,168,76,0.18)",
                    });
                  }, 3000);
                }, 800);
              }}
              onMouseUp={() => {
                clearTimeout(pressTimerRef.current);
              }}
              onMouseLeave={() => {
                clearTimeout(pressTimerRef.current);
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color:
                    creditState.color !== "rgba(201,168,76,0.18)"
                      ? creditState.color
                      : isLight
                      ? "rgba(0,0,0,0.12)"
                      : "rgba(255,255,255,0.10)",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  fontStyle:
                    creditState.color !== "rgba(201,168,76,0.18)"
                      ? "italic"
                      : "normal",
                  transition: "color 0.4s, font-style 0.4s",
                  textTransform: "lowercase" as const,
                }}
              >
                {creditState.text} {/* ✅ stateの値を表示 */}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
