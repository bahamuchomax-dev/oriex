import "./more.css";
import { unreadNoticesCount } from "./NoticesView.jsx";
import { availableGiftsCount } from "./GiftView.jsx";

/* ------------------------------------------------------------------ *
 * その他 — overflow menu to other home destinations.
 * Grouped list of tappable rows; each row is a real <button> that calls
 * onOpen(<key>). All icons are inline <svg> (no emoji, no assets).
 * Notification badges (お知らせ/ギフト) are LIVE — same counts the home
 * dashboard shows — not hardcoded, so they clear when the user catches up.
 * ------------------------------------------------------------------ */

/* --- glyphs (crisp line icons, ~2 stroke) ------------------------- */
const Diary = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
    <path d="M5 18a2 2 0 0 1 2-2h11" />
    <path d="M9 8h6M9 11h4" />
  </svg>
);
const Plans = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 9h16M8 3v4M16 3v4" />
    <path d="M8 13h3M8 16.5h6" />
  </svg>
);
const Teacher = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="2.4" />
    <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
    <path d="M4.7 4.7a10.3 10.3 0 0 0 0 14.6M19.3 4.7a10.3 10.3 0 0 1 0 14.6" />
  </svg>
);
const Friends = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M16.5 14.2A5.5 5.5 0 0 1 20.5 19" />
  </svg>
);
const Hamster = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 7.5a3 3 0 0 1 4-1 6 6 0 0 1 3 0 3 3 0 0 1 4 1" />
    <path d="M4.5 13.5a7.5 6 0 0 0 15 0 7.5 6 0 0 0-15 0Z" />
    <path d="M9.5 13h.01M14.5 13h.01" />
    <path d="M11 16.4q1 .8 2 0" />
  </svg>
);
const Factory = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20V11l5 3V11l5 3V8l6 4v8z" />
    <path d="M4 20h16" />
    <path d="M8 20v-3M13 20v-3M17.5 20v-3" />
  </svg>
);
const Profile = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.4" />
    <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
  </svg>
);
const Settings = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.6 7.8l1.9 1.1M17.5 15.1l1.9 1.1M4.6 16.2l1.9-1.1M17.5 8.9l1.9-1.1" />
  </svg>
);
const Notices = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
);
const Gift = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.5" y="9.5" width="15" height="10.5" rx="1.5" />
    <path d="M3.5 9.5h17v3h-17zM12 9.5V20" />
    <path d="M12 9.5C9 9.5 8 4.5 12 6.2 16 4.5 15 9.5 12 9.5Z" />
  </svg>
);

const Chevron = (
  <svg className="oxv-mr-chev" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GROUPS = [
  {
    heading: "学習",
    rows: [
      { key: "diary", label: "学習日記", desc: "今日の記録をふり返る", tone: "red", icon: Diary },
      { key: "plans", label: "週計画", desc: "今週の目標とタスク", tone: "blue", icon: Plans },
      { key: "teacher", label: "配信", desc: "先生からの問題", tone: "gold", icon: Teacher },
    ],
  },
  {
    heading: "ソーシャル",
    rows: [
      { key: "friends", label: "ひろば", desc: "ランキング・フレンド・LABO", tone: "green", icon: Friends },
      { key: "hamster", label: "育成", desc: "ハムスターを育てる", tone: "purple", icon: Hamster },
      { key: "factory", label: "FACTORY", desc: "問題をつくる工房", tone: "crim", icon: Factory },
    ],
  },
  {
    heading: "アカウント",
    rows: [
      { key: "profile", label: "マイページ", desc: "プロフィールと実績", tone: "blue", icon: Profile },
      { key: "settings", label: "設定", desc: "アプリの設定", tone: "gray", icon: Settings },
      { key: "notices", label: "お知らせ", desc: "新着のお知らせ", tone: "gold", icon: Notices },
      { key: "gift", label: "ギフト", desc: "受け取れる特典", tone: "red", icon: Gift },
    ],
  },
];

export default function MoreView({ onBack, onOpen }) {
  const open = (key) => {
    if (typeof onOpen === "function") onOpen(key);
  };

  // live badge counts — read once per open of この画面 (cheap, not a hot path)
  const badges = { notices: unreadNoticesCount(), gift: availableGiftsCount() };
  const badgeFor = (key) => badges[key] || 0;

  return (
    <div className="oxh-sub oxv-mr">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">その他</span>
      </div>

      <div className="oxv-body">
        {GROUPS.map((g) => (
          <section className="oxv-mr-group" key={g.heading}>
            <h2 className="oxv-mr-gh">{g.heading}</h2>
            <div className="oxv-mr-card">
              {g.rows.map((r) => (
                <button
                  type="button"
                  className="oxv-mr-row"
                  key={r.key}
                  onClick={() => open(r.key)}
                >
                  <span className={"oxv-mr-ic oxv-mr-ic--" + r.tone} aria-hidden="true">
                    {r.icon}
                  </span>
                  <span className="oxv-mr-txt">
                    <span className="oxv-mr-label">{r.label}</span>
                    <span className="oxv-mr-desc">{r.desc}</span>
                  </span>
                  {badgeFor(r.key) > 0 ? <span className="oxv-mr-badge">{badgeFor(r.key)}</span> : null}
                  {Chevron}
                </button>
              ))}
            </div>
          </section>
        ))}

        <p className="oxv-mr-foot">Oriex はもっと便利に進化中</p>
      </div>
    </div>
  );
}
