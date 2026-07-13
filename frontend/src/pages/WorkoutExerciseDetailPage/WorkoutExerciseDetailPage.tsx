import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckIcon, PlayIcon } from "../../components/Icon/icons";
import { WorkoutHeader } from "../../components/WorkoutHeader/WorkoutHeader";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useSettings } from "../../hooks/useSettings";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useAudioCue } from "../../hooks/useAudioCue";
import { useWakeLock } from "../../hooks/useWakeLock";
import { completedSetsCount, totalSetsCount } from "../../utils/sessionMachine";
import { fetchSplit } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS, formatClock, formatKg, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split } from "../../types/split";
import type { SessionSet } from "../../types/session";
import styles from "./WorkoutExerciseDetailPage.module.css";

const DEFAULT_REST_WARMUP = 45;
const DEFAULT_REST_WORKING = 90;

export function WorkoutExerciseDetailPage() {
  const { id, sxId } = useParams();
  const { settings } = useSettings();
  const { state, start, playExercise, completeSet, skipRest, extendRest, restEnded, prepareCued } =
    useWorkoutSession();

  const session = state.session;
  const inProgress = session !== null && session.status === "in_progress" && session.splitId === id;

  const { unlock, cuePrepare, cueGo } = useAudioCue({
    soundEnabled: settings?.soundEnabled ?? true,
    vibrationEnabled: settings?.vibrationEnabled ?? true,
  });
  useWakeLock((settings?.wakeLockEnabled ?? true) && inProgress);

  const { remainingMs, preparing } = useRestTimer({
    endsAt: inProgress && state.phase === "resting" ? state.restEndsAt : null,
    totalMs: state.restTotalMs,
    onPrepare: () => {
      if (!state.prepareCued) {
        cuePrepare();
        prepareCued();
      }
    },
    onEnd: () => {
      cueGo();
      restEnded();
    },
  });

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);

  const backTo = `/treino/divisoes/${id}`;

  useEffect(() => {
    if (!id || !sxId) return;
    let active = true;
    fetchSplit(id)
      .then((data) => {
        if (active) setSplit(data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar o exercício."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, sxId]);

  const planned = split?.exercises.find((e) => e.id === sxId) ?? null;
  const exerciseIndex = split ? split.exercises.findIndex((e) => e.id === sxId) : -1;
  const sessionIndex =
    inProgress && session && planned
      ? session.exercises.findIndex((e) => e.exerciseId === planned.exerciseId)
      : -1;
  const sessionExercise = sessionIndex >= 0 ? session!.exercises[sessionIndex]! : null;

  const displaySets = useMemo(() => {
    if (sessionExercise) {
      return sessionExercise.sets.map((s) => ({
        id: s.id,
        repsLabel: repsTarget(s.targetRepsMin, s.targetRepsMax),
        weightKg: s.weightKg ?? planned?.workingWeightKg ?? null,
        completed: s.completedAt !== null,
        raw: s,
      }));
    }
    if (planned) {
      return planned.plannedSets.map((p) => ({
        id: p.id,
        repsLabel: repsTarget(p.targetRepsMin, p.targetRepsMax),
        weightKg: planned.workingWeightKg,
        completed: false,
        raw: null as SessionSet | null,
      }));
    }
    return [];
  }, [sessionExercise, planned]);

  const firstPendingId = sessionExercise
    ? sessionExercise.sets.find((s) => s.completedAt === null)?.id ?? null
    : null;
  const restingHere = inProgress && sessionIndex === state.currentExerciseIndex && state.phase === "resting";
  const canMark = inProgress && !restingHere;

  const percent =
    inProgress && session ? Math.round((completedSetsCount(session) / Math.max(1, totalSetsCount(session))) * 100) : 0;

  const restMsFor = (target: SessionSet): number => {
    const seconds =
      target.restSeconds ??
      (target.setType === "warmup"
        ? settings?.restWarmupSeconds ?? DEFAULT_REST_WARMUP
        : settings?.restWorkingSeconds ?? DEFAULT_REST_WORKING);
    return seconds * 1000;
  };

  const handleStart = async () => {
    if (!id || starting) return;
    unlock();
    setStarting(true);
    setError(null);
    try {
      await start(id);
      if (exerciseIndex >= 0) playExercise(exerciseIndex);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível iniciar o treino."));
    } finally {
      setStarting(false);
    }
  };

  const handleMarkSet = async (set: SessionSet) => {
    if (saving || !canMark) return;
    unlock();
    if (sessionIndex >= 0 && sessionIndex !== state.currentExerciseIndex) playExercise(sessionIndex);
    setSaving(true);
    setError(null);
    try {
      await completeSet({
        setId: set.id,
        weightKg: set.weightKg ?? planned?.workingWeightKg ?? null,
        reps: set.reps ?? set.targetRepsMin ?? 1,
        restMs: restMsFor(set),
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a série."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <WorkoutHeader
        title={split?.name ?? "Treino"}
        subtitle={split && exerciseIndex >= 0 ? `Exercício ${exerciseIndex + 1} de ${split.exercises.length}` : undefined}
        backTo={backTo}
        percent={percent}
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}
      {!loading && !planned && <p className={styles.loading}>Exercício não encontrado.</p>}

      {planned && (
        <>
          <div className={styles.hero}>
            <div className={styles.heroOverlay}>
              <h1 className={styles.heroName}>{planned.name}</h1>
              <span className={styles.heroMuscle}>{MUSCLE_GROUP_LABELS[planned.muscleGroup]}</span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{displaySets.length}</span>
              <span className={styles.statLabel}>séries</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {repsTarget(
                  planned.plannedSets[0]?.targetRepsMin ?? null,
                  planned.plannedSets[0]?.targetRepsMax ?? null
                )}
              </span>
              <span className={styles.statLabel}>reps</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statValue} ${styles.statValueAccent}`}>
                {formatKg(planned.workingWeightKg)}
              </span>
              <span className={styles.statLabel}>carga</span>
            </div>
          </div>

          <div>
            <span className={styles.sectionLabel}>Marque suas séries</span>
            <div className={styles.setList}>
              {displaySets.map((s, index) => {
                const isNext = inProgress && s.raw !== null && s.id === firstPendingId;
                const actionable = isNext && canMark;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`${styles.setRow} ${s.completed ? styles.setRowChecked : ""} ${
                      actionable ? styles.setRowActionable : ""
                    }`}
                    onClick={() => actionable && s.raw && handleMarkSet(s.raw)}
                    disabled={!actionable}
                  >
                    <span className={`${styles.checkCircle} ${s.completed ? styles.checkCircleChecked : ""}`}>
                      {s.completed && <CheckIcon className={styles.checkIcon} />}
                    </span>
                    <span className={styles.setName}>Série {index + 1}</span>
                    <span className={styles.setMeta}>
                      {s.repsLabel} reps · {formatKg(s.weightKg)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {restingHere && (
            <div className={styles.restBar}>
              <span className={styles.restTime}>{preparing ? "prepare!" : formatClock(remainingMs)}</span>
              <span className={styles.restLabel}>Descanso</span>
              <button type="button" className={styles.restChip} onClick={extendRest}>
                +15s
              </button>
              <button type="button" className={styles.restChipPrimary} onClick={skipRest}>
                Pular
              </button>
            </div>
          )}

          {!inProgress && (
            <div className={styles.bottomBar}>
              <button type="button" className={styles.primaryBtn} onClick={handleStart} disabled={starting}>
                Iniciar Treino
                <PlayIcon className={styles.primaryIcon} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
