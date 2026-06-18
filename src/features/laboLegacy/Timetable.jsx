import "./timetable.css";

/* ============================================================
 * Timetable — 時間割 (LABO / 塾の週間時間割, light "old home" theme)
 * ------------------------------------------------------------
 * Renders only its own body; the parent legacy screen already draws
 * the top bar + back button. Shows a 月〜土 schedule (日 is 休講) for
 * the current week:
 *   - a "今週の時間割" header with 校舎/期間 sub-note (live new Date()),
 *   - one section per day with its date, a "今日" chip + accent border
 *     on today's group, and 0-2 class cards (time range, colored 科目
 *     tag, "担当 ◯◯ / ◯教室" meta). Empty days show "授業なし".
 * Schedule is deterministic (no RNG, no localStorage).
 * Top-level element is <div className="oxll-tt">; EVERY selector in
 * timetable.css starts with .oxll-tt (zero global collisions) and the
 * only @keyframes is namespaced oxllTtFade. Colors are literal hex/rgba
 * (this mounts inside the legacy app, which has no design tokens).
 * ============================================================ */

// --- 科目 palette (shared across every LABO feature) -----------------------
const SUBJECT = {
  数学: "#3F8DFF",
  英語: "#E8273C",
  国語: "#9A6BFF",
  理科: "#2BA85B",
  社会: "#E8923A",
  その他: "#36B4C4",
};

// hex -> rgba (deterministic; lets a 科目 tint its own tag/stripe)
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// --- the week (deterministic, display order 月→日; 日 is 休講) ---------------
const DAYS = [
  {
    dow: 1,
    label: "月",
    classes: [
      { id: "mon-1", time: "17:00–18:30", subject: "数学", teacher: "田中", room: "A教室" },
      { id: "mon-2", time: "19:00–20:30", subject: "英語", teacher: "佐藤", room: "B教室" },
    ],
  },
  {
    dow: 2,
    label: "火",
    classes: [
      { id: "tue-1", time: "17:30–19:00", subject: "国語", teacher: "鈴木", room: "A教室" },
    ],
  },
  {
    dow: 3,
    label: "水",
    classes: [
      { id: "wed-1", time: "17:00–18:30", subject: "理科", teacher: "高橋", room: "C教室" },
      { id: "wed-2", time: "19:00–20:30", subject: "数学", teacher: "田中", room: "A教室" },
    ],
  },
  { dow: 4, label: "木", classes: [] },
  {
    dow: 5,
    label: "金",
    classes: [
      { id: "fri-1", time: "17:30–19:00", subject: "社会", teacher: "渡辺", room: "B教室" },
    ],
  },
  {
    dow: 6,
    label: "土",
    classes: [
      { id: "sat-1", time: "13:00–14:30", subject: "英語", teacher: "佐藤", room: "特進教室" },
    ],
  },
  { dow: 0, label: "日", closed: true, classes: [] },
];

// --- inline svg icons (no emoji) -------------------------------------------
const IcCalendar = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.6" fill="none" stroke="#E8923A" strokeWidth="1.8" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" fill="none" stroke="#E8923A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7.5 13h3v3h-3z" fill="#E8923A" />
  </svg>
);
const IcClock = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.4" fill="none" stroke="#9C8E7C" strokeWidth="1.8" />
    <path d="M12 7.6V12l3.1 1.9" fill="none" stroke="#9C8E7C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcUser = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.2" r="3.2" fill="none" stroke="#9C8E7C" strokeWidth="1.8" />
    <path d="M5.6 19c.8-3.2 3.3-4.9 6.4-4.9s5.6 1.7 6.4 4.9" fill="none" stroke="#9C8E7C" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcPin = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21c4.2-4 6.3-7.1 6.3-10.2A6.3 6.3 0 0 0 5.7 10.8C5.7 13.9 7.8 17 12 21z" fill="none" stroke="#9C8E7C" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="12" cy="10.6" r="2.3" fill="none" stroke="#9C8E7C" strokeWidth="1.8" />
  </svg>
);

const fmtMD = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}`;

export default function Timetable() {
  // this week's Monday → Sunday, anchored on the real 今日 (browser date)
  const today = new Date();
  const todayDow = today.getDay();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + (todayDow === 0 ? -6 : 1 - todayDow));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const total = DAYS.reduce((a, d) => a + d.classes.length, 0);

  return (
    <div className="oxll-tt">
      {/* header: 今週の時間割 + 校舎/期間 ---------------------------------- */}
      <div className="oxll-tt-head">
        <span className="oxll-tt-head-ic" aria-hidden="true">{IcCalendar}</span>
        <div className="oxll-tt-head-txt">
          <h2 className="oxll-tt-title">今週の時間割</h2>
          <p className="oxll-tt-sub">オリエクゼミナール 本校 ・ {fmtMD(monday)}〜{fmtMD(sunday)}</p>
        </div>
        <span className="oxll-tt-total"><b>{total}</b><small>コマ</small></span>
      </div>

      {/* day-by-day list -------------------------------------------------- */}
      <div className="oxll-tt-days">
        {DAYS.map((d, i) => {
          const isToday = d.dow === todayDow;
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          return (
            <section
              key={d.label}
              className={`oxll-tt-day${isToday ? " oxll-tt-on" : ""}${d.closed ? " oxll-tt-rest" : ""}`}
            >
              <header className="oxll-tt-dhead">
                <span className="oxll-tt-dbadge">{d.label}</span>
                <span className="oxll-tt-ddate">{fmtMD(date)}</span>
                {isToday && <span className="oxll-tt-chip">今日</span>}
                <span className="oxll-tt-dn">{d.closed ? "休講" : `${d.classes.length}コマ`}</span>
              </header>

              <div className="oxll-tt-classes">
                {d.closed ? (
                  <p className="oxll-tt-closed">本日は休講です</p>
                ) : d.classes.length ? (
                  d.classes.map((c) => {
                    const sc = SUBJECT[c.subject] || SUBJECT.その他;
                    return (
                      <div className="oxll-tt-class" key={c.id} style={{ "--sc": sc }}>
                        <span className="oxll-tt-stripe" aria-hidden="true" />
                        <div className="oxll-tt-cbody">
                          <div className="oxll-tt-ctop">
                            <span className="oxll-tt-time">{IcClock}<span>{c.time}</span></span>
                            <span
                              className="oxll-tt-tag"
                              style={{ color: sc, background: hexA(sc, 0.12), borderColor: hexA(sc, 0.4) }}
                            >
                              {c.subject}
                            </span>
                          </div>
                          <div className="oxll-tt-cmeta">
                            <span className="oxll-tt-mi">{IcUser}担当 {c.teacher}</span>
                            <i className="oxll-tt-sep" aria-hidden="true" />
                            <span className="oxll-tt-mi">{IcPin}{c.room}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="oxll-tt-none">授業なし</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
