import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { DumbbellIcon, PlusIcon } from "../../components/Icon/icons";
import { useExercises } from "../../hooks/useExercises";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import type { MuscleGroup } from "../../types/exercise";
import styles from "./ExercisesPage.module.css";

export function ExercisesPage() {
  const navigate = useNavigate();
  const { exercises, loading, error } = useExercises();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exercises.filter(
      (exercise) =>
        (group === "all" || exercise.muscleGroup === group) &&
        (normalized === "" || exercise.name.toLowerCase().includes(normalized))
    );
  }, [exercises, query, group]);

  const groups = useMemo(() => {
    const present = new Set(exercises.map((exercise) => exercise.muscleGroup));
    return (Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).filter((g) => present.has(g));
  }, [exercises]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Exercícios"
        backTo="/treino"
        actions={
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => navigate("/treino/exercicios/novo")}
          >
            <PlusIcon className={styles.primaryButtonIcon} />
            Novo
          </button>
        }
      />

      {error && <div className={styles.error}>{error}</div>}

      <input
        type="search"
        className={styles.search}
        placeholder="Buscar no meu catálogo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {groups.length > 1 && (
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${group === "all" ? styles.chipActive : ""}`}
            onClick={() => setGroup("all")}
          >
            Todos
          </button>
          {groups.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${group === option ? styles.chipActive : ""}`}
              onClick={() => setGroup(option)}
            >
              {MUSCLE_GROUP_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {!loading && exercises.length === 0 && !error && (
        <EmptyState
          icon={<DumbbellIcon />}
          title="Catálogo vazio"
          description="Cadastre seus exercícios com imagem, vídeo e instruções de execução."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/treino/exercicios/novo")}>
              Cadastrar exercício
            </button>
          }
        />
      )}

      <div className={styles.list}>
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            className={styles.card}
            onClick={() => navigate(`/treino/exercicios/${exercise.id}`)}
          >
            <div className={styles.thumb}>
              {exercise.imageUrl ? (
                <img src={exercise.imageUrl} alt="" loading="lazy" />
              ) : (
                <DumbbellIcon className={styles.thumbIcon} />
              )}
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.cardName}>{exercise.name}</span>
              <span className={styles.cardMeta}>
                {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
                {exercise.equipment ? ` · ${exercise.equipment}` : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
