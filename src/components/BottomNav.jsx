// Bottom navigation. The `screens` array defines the tabs; keep this in sync
// with the screen map in App.jsx. Labels are Japanese to match the legacy UI.
export default function BottomNav({ screens, current, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="メインナビ">
      {screens.map((s) => (
        <button
          key={s.key}
          className={s.key === current ? "active" : ""}
          aria-current={s.key === current ? "page" : undefined}
          onClick={() => onSelect(s.key)}
        >
          <span className="nav-icon" aria-hidden="true">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </nav>
  );
}
