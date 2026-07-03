import type { ComponentType } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import styles from "./Sidebar.module.css";
import { DumbbellIcon, GearIcon, PlayIcon, PlusIcon, RulerIcon } from "../Icon/icons";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/medidas", label: "Medidas", icon: RulerIcon },
  { path: "/treino", label: "Treino", icon: DumbbellIcon },
];

const DESKTOP_ITEMS: NavItem[] = [...NAV_ITEMS, { path: "/configuracoes", label: "Configurações", icon: GearIcon }];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useWorkoutSession();
  const sessionActive = state.session !== null && state.session.status === "in_progress";

  const handleAdd = () => {
    if (location.pathname.startsWith("/medidas")) {
      navigate("/medidas/nova");
    } else if (sessionActive) {
      navigate("/treino/sessao/ativa");
    } else {
      navigate("/treino/iniciar");
    }
  };

  const onWorkoutArea = location.pathname.startsWith("/treino");
  const FabIcon = onWorkoutArea ? PlayIcon : PlusIcon;

  const renderBarItem = (item: NavItem) => {
    const ItemIcon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        aria-label={item.label}
        title={item.label}
        className={({ isActive }) => `${styles.barItem} ${isActive ? styles.barItemActive : ""}`}
      >
        <ItemIcon className={styles.barIcon} />
      </NavLink>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <DumbbellIcon className={styles.logoMark} />
        </div>
        <span className={styles.logoText}>Health</span>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <svg className={styles.toggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className={styles.nav}>
        {DESKTOP_ITEMS.map((item) => {
          const ItemIcon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <ItemIcon className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <nav className={styles.mobileNav}>
        {renderBarItem(NAV_ITEMS[0]!)}
        <button
          type="button"
          className={`${styles.barAdd} ${sessionActive ? styles.barAddActive : ""}`}
          onClick={handleAdd}
          aria-label={onWorkoutArea ? "Iniciar treino" : "Adicionar"}
        >
          <FabIcon className={styles.barAddIcon} />
        </button>
        {renderBarItem(NAV_ITEMS[1]!)}
      </nav>
    </aside>
  );
}
