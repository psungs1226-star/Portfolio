import type { Screen } from "../App";

type BottomNavProps = {
  active: Screen["name"];
  onNavigate: (screen: Screen) => void;
};

const items: Array<{ key: Screen["name"]; label: string; icon: string; screen: Screen }> = [
  { key: "home", label: "홈", icon: "/assets/icons/home.svg", screen: { name: "home" } },
  { key: "mood", label: "무드", icon: "/assets/icons/mood.svg", screen: { name: "mood" } },
  { key: "year", label: "연도", icon: "/assets/icons/year.svg", screen: { name: "year" } },
  {
    key: "favorites",
    label: "찜",
    icon: "/assets/icons/favorites.svg",
    screen: { name: "favorites" },
  },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="주요 화면">
      {items.map((item) => (
        <button
          key={item.key}
          className={active === item.key ? "bottom-nav-item active" : "bottom-nav-item"}
          type="button"
          onClick={() => onNavigate(item.screen)}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <img src={item.icon} alt="" />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
