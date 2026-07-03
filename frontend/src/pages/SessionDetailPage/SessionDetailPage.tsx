import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { StatCard } from "../../components/StatCard/StatCard";
import { CheckIcon } from "../../components/Icon/icons";
import { fetchSession } from "../../services/sessionService";
import {
  MUSCLE_GROUP_LABELS,
  VARIATION_LABELS,
  formatDateTime,
  formatDuration,
  formatNumber,
  repsTarget,
} from "../../utils/format";
import type { WorkoutSession } from "../../types/session";
import styles from "./SessionDetailPage.module.css";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchSession(id)
      .then((data) => {
        if (active) setSession(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a sessão.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const completedSets = session
    ? session.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter((set) => set.completedAt !== null).length,
        0
      )
    : 0;
  const totalSets = session
    ? session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
    : 0;

  return (
    <div className={styles.page}>
      <PageHeader
        title={session?.splitName ?? "Treino"}
        subtitle={session ? formatDateTime(session.startedAt) : undefined}
        backTo="/treino/historico"
      />

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.loading}>Carregando…</p>
      ) : session ? (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Duração" value={formatDuration(session.durationSeconds)} />
            <StatCard
              label="Volume total"
              value={session.totalVolumeKg != null ? `${formatNumber(session.totalVolumeKg)} kg` : "—"}
            />
            <StatCard label="Séries" value={`${completedSets}/${totalSets}`} />
            <StatCard label="Exercícios" value={String(session.exercises.length)} />
          </div>

          {session.notes && <p className={styles.notes}>{session.notes}</p>}

          <div className={styles.exerciseList}>
            {session.exercises.map((exercise) => (
              <section key={exercise.id} className={styles.exerciseCard}>
                <div className={styles.exerciseHeader}>
                  <span className={styles.exerciseName}>{exercise.exerciseName}</span>
                  <span className={styles.exerciseMeta}>
                    {exercise.muscleGroup ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : ""}
                  </span>
                </div>
                <div className={styles.setList}>
                  {exercise.sets.map((set, index) => (
                    <div key={set.id} className={styles.setRow}>
                      <span className={styles.setNumber}>
                        {set.setType === "warmup" ? "Aq" : index + 1}
                      </span>
                      <span className={styles.setTarget}>
                        {repsTarget(set.targetRepsMin, set.targetRepsMax)} reps
                        {set.variation !== "normal" ? ` · ${VARIATION_LABELS[set.variation]}` : ""}
                      </span>
                      <span className={styles.setResult}>
                        {set.completedAt !== null
                          ? `${set.weightKg != null ? formatNumber(set.weightKg, 1) : "—"} kg × ${set.reps ?? "—"}${set.rpe != null ? ` @${set.rpe}` : ""}`
                          : "não feita"}
                      </span>
                      {set.completedAt !== null && <CheckIcon className={styles.setCheck} />}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
