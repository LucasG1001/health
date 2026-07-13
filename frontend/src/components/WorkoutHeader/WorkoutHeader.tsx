import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "../Icon/icons";
import styles from "./WorkoutHeader.module.css";

interface WorkoutHeaderProps {
  title: string;
  subtitle?: string;
  backTo: string;
  percent?: number | null;
  actions?: ReactNode;
}

export function WorkoutHeader({ title, subtitle, backTo, percent = null, actions }: WorkoutHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <header className={styles.topBar}>
        <button type="button" className={styles.iconBtn} onClick={() => navigate(backTo)} aria-label="Voltar">
          <ChevronLeftIcon className={styles.navIcon} />
        </button>
        <div className={styles.titles}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        <div className={styles.right}>
          {percent != null && <span className={styles.percentBadge}>{percent}%</span>}
          {actions}
        </div>
      </header>
      {percent != null && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
