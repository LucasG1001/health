import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import {
  ChartIcon,
  ChevronRightIcon,
  DumbbellIcon,
  GearIcon,
  PlayIcon,
  PlusIcon,
} from "../../components/Icon/icons";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useSplits } from "../../hooks/useSplits";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import type { Split } from "../../types/split";
import styles from "./WorkoutHomePage.module.css";

function muscleSummary(split: Split): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const exercise of split.exercises) {
    const label = MUSCLE_GROUP_LABELS[exercise.muscleGroup];
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  if (labels.length > 0) return labels.join(", ");
  return `${split.exercises.length} exercício${split.exercises.length === 1 ? "" : "s"}`;
}

export function WorkoutHomePage() {
  const navigate = useNavigate();
  const { state } = useWorkoutSession();
  const { splits, loading } = useSplits();

  const sessionActive = state.session !== null && state.session.status === "in_progress";

  return (
    <div className={styles.page}>
      <PageHeader
        title=""
        actions={
          <>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => navigate("/treino/historico")}
              aria-label="Histórico"
            >
              <ChartIcon className={styles.iconButtonIcon} />
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

      {sessionActive && (
        <button type="button" className={styles.resumeCard} onClick={() => navigate("/treino/sessao/ativa")}>
          <PlayIcon className={styles.resumeIcon} />
          <div className={styles.resumeInfo}>
            <span className={styles.resumeTitle}>Treino em andamento</span>
            <span className={styles.resumeMeta}>{state.session!.splitName} — toque para continuar</span>
          </div>
        </button>
      )}

      {loading ? (
        <p className={styles.loading}>Carregando…</p>
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
                <span className={styles.todayMeta}>{muscleSummary(split)}</span>
              </div>
              <ChevronRightIcon className={styles.chevron} />
            </button>
          ))}
        </div>
      ) : (
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
