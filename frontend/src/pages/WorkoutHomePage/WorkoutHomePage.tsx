import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ChevronRightIcon, DumbbellIcon, GearIcon, PlusIcon } from "../../components/Icon/icons";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { useSplits } from "../../hooks/useSplits";
import { muscleSummary } from "../../utils/format";
import type { Split } from "../../types/split";
import styles from "./WorkoutHomePage.module.css";

function splitSubtitle(split: Split): string {
  const muscles = muscleSummary(split.exercises, ", ");
  if (muscles !== "") return muscles;
  return `${split.exercises.length} exercício${split.exercises.length === 1 ? "" : "s"}`;
}

export function WorkoutHomePage() {
  const navigate = useNavigate();
  const { splits, loading, error, reload } = useSplits();

  return (
    <div className={styles.page}>
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

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading ? (
        <Loading />
      ) : splits.length > 0 ? (
        <div className={styles.todayList}>
          {splits.map((split) => (
            <button
              key={split.id}
              type="button"
              className={styles.todayCard}
              onClick={() => navigate(`/treino/divisoes/${split.id}`)}
            >
              <div className={styles.todayInfo}>
                <span className={styles.todayName}>{split.name}</span>
                <span className={styles.todayMeta}>{splitSubtitle(split)}</span>
              </div>
              <ChevronRightIcon className={styles.chevron} />
            </button>
          ))}
        </div>
      ) : error ? null : (
        <EmptyState
          icon={<DumbbellIcon />}
          title="Comece montando seu treino"
          description="Crie seus treinos (A, B, C…) com exercícios, séries e carga."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/treino/divisoes/nova")}>
              Criar primeiro treino
            </button>
          }
        />
      )}
    </div>
  );
}
