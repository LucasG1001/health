import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../PageHeader/PageHeader";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { DumbbellIcon, GearIcon, PlusIcon } from "../Icon/icons";
import styles from "./WorkoutHeader.module.css";

type WorkoutTab = "/treino" | "/treino/log";

const TABS: { value: WorkoutTab; label: string }[] = [
  { value: "/treino", label: "Treinos" },
  { value: "/treino/log", label: "Log" },
];

/**
 * Cabeçalho da área de Treino, igual nas duas abas para elas não pularem de posição.
 * Cada aba é uma rota, para o voltar do navegador funcionar.
 */
export function WorkoutHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tab: WorkoutTab = pathname.startsWith("/treino/log") ? "/treino/log" : "/treino";

  return (
    <>
      <PageHeader
        title=""
        actions={
          <>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => navigate("/treino/exercicios")}
              aria-label="Exercícios"
            >
              <DumbbellIcon className={styles.iconButtonIcon} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => navigate("/treino/divisoes/nova")}
              aria-label="Novo treino"
            >
              <PlusIcon className={styles.iconButtonIcon} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => navigate("/configuracoes")}
              aria-label="Configurações"
            >
              <GearIcon className={styles.iconButtonIcon} />
            </button>
          </>
        }
      />
      <div className={styles.tabs}>
        <SegmentedControl
          label="Área de treino"
          value={tab}
          options={TABS}
          onChange={(next) => navigate(next, { replace: true })}
        />
      </div>
    </>
  );
}
