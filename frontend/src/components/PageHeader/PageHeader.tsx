import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "../Icon/icons";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      {backTo && (
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate(backTo)}
          aria-label="Voltar"
        >
          <ChevronLeftIcon className={styles.backIcon} />
        </button>
      )}
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
