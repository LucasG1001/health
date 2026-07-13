import { useState, type ComponentType } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import styles from "./Sidebar.module.css";
import { DumbbellIcon, GearIcon, PlusIcon, RulerIcon, StopIcon } from "../Icon/icons";

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
  const { state, finish, discard } = useWorkoutSession();
  const sessionActive = state.session !== null && state.session.status === "in_progress";

  const [endOpen, setEndOpen] = useState(false);

  const onWorkoutArea = location.pathname.startsWith("/treino");
  const endMode = onWorkoutArea && sessionActive;

  const handleAdd = () => {
    if (location.pathname.startsWith("/medidas")) {
      navigate("/medidas/nova");
    } else {
      navigate("/treino/divisoes/nova");
    }
  };

  const handleFab = () => {
    if (endMode) {
      setEndOpen(true);
    } else {
      handleAdd();
    }
  };

  const handleFinish = async () => {
    setEndOpen(false);
    const sessionId = state.session?.id;
    try {
      const { summary } = await finish();
      if (sessionId) navigate(`/treino/sessao/${sessionId}/resumo`, { replace: true, state: { summary } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscard = async () => {
    setEndOpen(false);
    try {
      await discard();
    } catch (err) {
      console.error(err);
    }
  };

  const FabIcon = endMode ? StopIcon : PlusIcon;

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
          className={`${styles.barAdd} ${endMode ? styles.barAddEnd : ""}`}
          onClick={handleFab}
          aria-label={endMode ? "Encerrar treino" : onWorkoutArea ? "Novo treino" : "Adicionar"}
        >
          <FabIcon className={styles.barAddIcon} />
        </button>
        {renderBarItem(NAV_ITEMS[1]!)}
      </nav>

      {endOpen && (
        <div className={styles.endBackdrop} onClick={(e) => e.target === e.currentTarget && setEndOpen(false)}>
          <div className={styles.endSheet}>
            <h2 className={styles.endTitle}>Encerrar treino?</h2>
            <button type="button" className={styles.finalizeButton} onClick={handleFinish}>
              Finalizar treino
            </button>
            <button type="button" className={styles.discardButton} onClick={handleDiscard}>
              Descartar treino
            </button>
            <button type="button" className={styles.cancelButton} onClick={() => setEndOpen(false)}>
              Continuar treinando
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
