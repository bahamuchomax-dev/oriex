export default function BottomNav({ screens, current, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="メインナビ">
      {screens.map((s) => {
        const active = s.key === current || (s.match ?? []).includes(current);
        return (
          <button
            key={s.key}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(s.key)}
          >
            <span className="nav-icon" aria-hidden="true">{s.icon}</span>
            <span className="nav-label">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
