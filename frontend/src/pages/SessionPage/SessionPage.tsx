import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RestTimerRing } from "../../components/RestTimerRing/RestTimerRing";
import { StepperInput } from "../../components/StepperInput/StepperInput";
import { RpeSelector } from "../../components/RpeSelector/RpeSelector";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import {
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  DumbbellIcon,
  PlayIcon,
  PlusIcon,
  SkipIcon,
} from "../../components/Icon/icons";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useSettings } from "../../hooks/useSettings";
import { useNow } from "../../hooks/useNow";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useAudioCue } from "../../hooks/useAudioCue";
import { useWakeLock } from "../../hooks/useWakeLock";
import {
  completedSetsCount,
  currentExercise,
  currentSet,
  hasPendingSets,
  nextExerciseIndex,
  sessionVolumeKg,
  totalSetsCount,
} from "../../utils/sessionMachine";
import { fetchLastPerformance } from "../../services/exerciseService";
import { apiErrorMessage } from "../../utils/apiError";
import {
  MUSCLE_GROUP_LABELS,
  VARIATION_LABELS,
  formatClock,
  formatNumber,
  repsTarget,
} from "../../utils/format";
import type { LastPerformance } from "../../types/exercise";
import type { SessionSet } from "../../types/session";
import styles from "./SessionPage.module.css";

const DEFAULT_REST_WARMUP = 45;
const DEFAULT_REST_WORKING = 90;

export function SessionPage() {
  const navigate = useNavigate();
  const {
    state,
    hydrating,
    playExercise,
    completeSet,
    skipRest,
    extendRest,
    restEnded,
    prepareCued,
    nextExercise,
    backToOverview,
    addExtraSet,
    updateMachineSetting,
    finish,
    discard,
  } = useWorkoutSession();
  const { settings } = useSettings();

  const session = state.session;
  const sessionActive = session !== null && session.status === "in_progress";
  const exercise = currentExercise(state);
  const set = currentSet(state);

  const { unlock, cuePrepare, cueGo } = useAudioCue({
    soundEnabled: settings?.soundEnabled ?? true,
    vibrationEnabled: settings?.vibrationEnabled ?? true,
  });
  useWakeLock((settings?.wakeLockEnabled ?? true) && sessionActive);

  const { remainingMs, progress, preparing } = useRestTimer({
    endsAt: state.phase === "resting" ? state.restEndsAt : null,
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

  const now = useNow(sessionActive);

  const finishingRef = useRef(false);
  useEffect(() => {
    if (!hydrating && !sessionActive && !finishingRef.current) {
      navigate("/treino", { replace: true });
    }
  }, [hydrating, sessionActive, navigate]);

  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const setIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (set && set.id !== setIdRef.current) {
      setIdRef.current = set.id;
      setWeight(set.weightKg);
      setReps(set.reps ?? set.targetRepsMin);
      setRpe(set.rpe);
    }
  }, [set]);

  const [lastPerf, setLastPerf] = useState<Record<string, LastPerformance | null>>({});
  const requestedPerfRef = useRef(new Set<string>());
  const exerciseId = exercise?.exerciseId ?? null;
  useEffect(() => {
    if (!exerciseId || requestedPerfRef.current.has(exerciseId)) return;
    requestedPerfRef.current.add(exerciseId);
    fetchLastPerformance(exerciseId)
      .then((data) => setLastPerf((prev) => ({ ...prev, [exerciseId]: data })))
      .catch(() => undefined);
  }, [exerciseId]);

  const [machineDraft, setMachineDraft] = useState("");
  const machineExerciseRef = useRef<string | null>(null);
  useEffect(() => {
    if (exercise && exercise.id !== machineExerciseRef.current) {
      machineExerciseRef.current = exercise.id;
      setMachineDraft(exercise.machineSetting ?? "");
    }
  }, [exercise]);

  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endMenuOpen, setEndMenuOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (hydrating) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Carregando treino…</p>
      </div>
    );
  }

  if (!session || !sessionActive) return null;

  const restMsFor = (target: SessionSet): number => {
    const seconds =
      target.restSeconds ??
      (target.setType === "warmup"
        ? settings?.restWarmupSeconds ?? DEFAULT_REST_WARMUP
        : settings?.restWorkingSeconds ?? DEFAULT_REST_WORKING);
    return seconds * 1000;
  };

  const commitMachineSetting = async () => {
    if (!exercise?.exerciseId) return;
    const value = machineDraft.trim() === "" ? null : machineDraft.trim();
    if (value === (exercise.machineSetting ?? null)) return;
    try {
      await updateMachineSetting(exercise.exerciseId, value);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o ajuste do aparelho."));
    }
  };

  const handlePlay = (index: number) => {
    unlock();
    setError(null);
    playExercise(index);
  };

  const handleDone = async () => {
    if (!set || saving) return;
    unlock();
    setSaving(true);
    setError(null);
    try {
      await completeSet({ setId: set.id, weightKg: weight, reps, rpe, restMs: restMsFor(set) });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a série."));
    } finally {
      setSaving(false);
    }
  };

  const handleExtraSet = async () => {
    if (!exercise) return;
    setError(null);
    try {
      await addExtraSet(exercise.id);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível adicionar a série."));
    }
  };

  const handleFinish = async () => {
    if (finishing) return;
    setEndMenuOpen(false);
    setFinishing(true);
    finishingRef.current = true;
    const sessionId = session.id;
    try {
      const { summary } = await finish();
      navigate(`/treino/sessao/${sessionId}/resumo`, { replace: true, state: { summary } });
    } catch (err) {
      finishingRef.current = false;
      setFinishing(false);
      setError(apiErrorMessage(err, "Não foi possível finalizar o treino."));
    }
  };

  const handleDiscard = async () => {
    setConfirmDiscard(false);
    setEndMenuOpen(false);
    finishingRef.current = true;
    try {
      await discard();
      navigate("/treino", { replace: true });
    } catch (err) {
      finishingRef.current = false;
      setError(apiErrorMessage(err, "Não foi possível descartar o treino."));
    }
  };

  const elapsedMs = now - new Date(session.startedAt).getTime();
  const doneSets = completedSetsCount(session);
  const totalSets = totalSetsCount(session);
  const allDone = totalSets > 0 && doneSets === totalSets;
  const performance = exerciseId ? lastPerf[exerciseId] : null;
  const nextIndex = nextExerciseIndex(session, state.currentExerciseIndex);
  const inExercise = state.phase === "exercising" || state.phase === "resting" || state.phase === "exerciseDone";
  const nextPendingSet = exercise?.sets.find((item) => item.completedAt === null) ?? null;
  const highlightSetIndex =
    state.phase === "resting" && exercise && nextPendingSet
      ? exercise.sets.indexOf(nextPendingSet)
      : state.currentSetIndex;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {inExercise ? (
          <button type="button" className={styles.headerButton} onClick={backToOverview} aria-label="Voltar">
            <ChevronLeftIcon className={styles.headerIcon} />
          </button>
        ) : (
          <button type="button" className={styles.headerEnd} onClick={() => setEndMenuOpen(true)}>
            Encerrar
          </button>
        )}
        <div className={styles.headerCenter}>
          <span className={styles.headerClock}>{formatClock(elapsedMs)}</span>
          <span className={styles.headerSplit}>{session.splitName}</span>
        </div>
        {inExercise ? (
          <button type="button" className={styles.headerEnd} onClick={() => setEndMenuOpen(true)}>
            Encerrar
          </button>
        ) : (
          <span className={styles.headerSpacer} />
        )}
      </header>

      <div className={styles.dots} aria-hidden="true">
        {session.exercises.map((item, index) => {
          const done = !hasPendingSets(item);
          const current = inExercise && index === state.currentExerciseIndex;
          return (
            <span
              key={item.id}
              className={`${styles.dot} ${done ? styles.dotDone : ""} ${current ? styles.dotCurrent : ""}`}
            />
          );
        })}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {state.phase === "overview" && (
        <div className={styles.overview}>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{doneSets}/{totalSets}</span>
              <span className={styles.statLabel}>séries</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatNumber(sessionVolumeKg(session))}</span>
              <span className={styles.statLabel}>kg de volume</span>
            </div>
          </div>

          <div className={styles.exerciseList}>
            {session.exercises.map((item, index) => {
              const done = !hasPendingSets(item);
              const completed = item.sets.filter((s) => s.completedAt !== null).length;
              const restRef = item.sets.find((s) => s.setType === "working") ?? item.sets[0] ?? null;
              return (
                <div key={item.id} className={styles.exerciseRow}>
                  <div className={styles.exerciseTop}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className={styles.exerciseThumb} />
                    ) : (
                      <span className={styles.exerciseThumbFallback}>
                        <DumbbellIcon className={styles.exerciseThumbIcon} />
                      </span>
                    )}
                    <div className={styles.exerciseRowInfo}>
                      <span className={styles.exerciseRowName}>{item.exerciseName}</span>
                      <span className={styles.exerciseRowMeta}>
                        {item.muscleGroup ? `${MUSCLE_GROUP_LABELS[item.muscleGroup]} · ` : ""}
                        {completed}/{item.sets.length} séries
                      </span>
                    </div>
                  </div>
                  <div className={styles.exerciseRestLine}>
                    <span className={styles.restNotice}>
                      <ClockIcon className={styles.restNoticeIcon} />
                      {restRef ? `${formatClock(restMsFor(restRef))} · descanso entre séries` : "descanso entre séries"}
                    </span>
                    <button
                      type="button"
                      className={`${styles.exercisePlay} ${done ? styles.exercisePlayDone : ""}`}
                      onClick={() => handlePlay(index)}
                      aria-label={done ? "Exercício concluído — refazer" : "Iniciar exercício"}
                    >
                      {done ? (
                        <CheckIcon className={styles.exercisePlayIcon} />
                      ) : (
                        <PlayIcon className={styles.exercisePlayIcon} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {allDone && (
            <button type="button" className={styles.finishButton} onClick={handleFinish} disabled={finishing}>
              Finalizar treino
            </button>
          )}
        </div>
      )}

      {inExercise && exercise && (
        <div className={styles.exerciseArea}>
          <div className={styles.exerciseCard}>
            {exercise.imageUrl && <img src={exercise.imageUrl} alt="" className={styles.exerciseImage} />}
            <div className={styles.exerciseHeader}>
              <h1 className={styles.exerciseName}>{exercise.exerciseName}</h1>
              <span className={styles.exerciseMeta}>
                {exercise.muscleGroup ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : ""}
                {exercise.equipment ? ` · ${exercise.equipment}` : ""}
              </span>
            </div>
            {exercise.exerciseId && (
              <label className={styles.machineField}>
                <span className={styles.machineLabel}>Ajuste do aparelho</span>
                <input
                  type="text"
                  value={machineDraft}
                  onChange={(e) => setMachineDraft(e.target.value)}
                  onBlur={commitMachineSetting}
                  placeholder="Ex: banco 4, encosto 2"
                />
              </label>
            )}
            {performance && performance.sets.length > 0 && (
              <p className={styles.lastPerformance}>
                Último treino:{" "}
                {performance.sets
                  .map((s) => `${s.weightKg != null ? formatNumber(s.weightKg, 1) : "—"}×${s.reps ?? "—"}`)
                  .join(", ")}
              </p>
            )}
            {exercise.notes && <p className={styles.exerciseNotes}>{exercise.notes}</p>}
          </div>

          <div className={styles.setList}>
            {exercise.sets.map((item, index) => {
              const isCurrent = state.phase !== "exerciseDone" && index === highlightSetIndex;
              const isDone = item.completedAt !== null;
              return (
                <div
                  key={item.id}
                  className={`${styles.setRow} ${isCurrent ? styles.setRowCurrent : ""} ${isDone ? styles.setRowDone : ""}`}
                >
                  <span className={styles.setNumber}>
                    {item.setType === "warmup" ? "Aq" : index + 1}
                  </span>
                  <span className={styles.setTarget}>
                    {repsTarget(item.targetRepsMin, item.targetRepsMax)} reps
                    {item.variation !== "normal" ? ` · ${VARIATION_LABELS[item.variation]}` : ""}
                  </span>
                  <span className={styles.setResult}>
                    {isDone
                      ? `${item.weightKg != null ? formatNumber(item.weightKg, 1) : "—"} kg × ${item.reps ?? "—"}`
                      : item.weightKg != null
                        ? `${formatNumber(item.weightKg, 1)} kg`
                        : ""}
                  </span>
                  {isDone && <CheckIcon className={styles.setCheck} />}
                </div>
              );
            })}
          </div>

          {state.phase === "exercising" && set && (
            <div className={styles.currentSetPanel}>
              <span className={styles.currentSetTitle}>
                {set.setType === "warmup" ? "Aquecimento" : `Série ${state.currentSetIndex + 1} de ${exercise.sets.length}`}
              </span>
              <div className={styles.steppers}>
                <StepperInput label="Peso" unit="kg" value={weight} onChange={setWeight} step={2.5} decimals={1} />
                <StepperInput label="Reps" value={reps} onChange={setReps} step={1} max={200} />
              </div>
              <RpeSelector value={rpe} onChange={setRpe} />
              <button type="button" className={styles.doneButton} onClick={handleDone} disabled={saving}>
                FEITO
              </button>
            </div>
          )}

          {state.phase === "resting" && (
            <div className={styles.restPanel}>
              <RestTimerRing
                remainingMs={remainingMs}
                progress={progress}
                preparing={preparing}
                subtitle={
                  nextPendingSet
                    ? `próxima: ${repsTarget(nextPendingSet.targetRepsMin, nextPendingSet.targetRepsMax)} reps`
                    : "descanso"
                }
              />
              <div className={styles.restActions}>
                <button type="button" className={styles.restButton} onClick={extendRest}>
                  <PlusIcon className={styles.restButtonIcon} />
                  15s
                </button>
                <button type="button" className={styles.restButton} onClick={skipRest}>
                  <SkipIcon className={styles.restButtonIcon} />
                  Pular
                </button>
              </div>
            </div>
          )}

          {state.phase === "exerciseDone" && (
            <div className={styles.donePanel}>
              <p className={styles.doneTitle}>Exercício concluído!</p>
              <div className={styles.doneActions}>
                <button type="button" className={styles.extraSetButton} onClick={handleExtraSet}>
                  <PlusIcon className={styles.restButtonIcon} />
                  Série extra
                </button>
                <button type="button" className={styles.nextButton} onClick={nextExercise}>
                  {nextIndex !== null ? "Próximo exercício" : "Ver resumo"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {endMenuOpen && (
        <div className={styles.endBackdrop} onClick={(e) => e.target === e.currentTarget && setEndMenuOpen(false)}>
          <div className={styles.endSheet}>
            <h2 className={styles.endTitle}>Encerrar treino?</h2>
            <button type="button" className={styles.finishButton} onClick={handleFinish} disabled={finishing}>
              Finalizar treino
            </button>
            <button type="button" className={styles.discardButton} onClick={() => setConfirmDiscard(true)}>
              Descartar treino
            </button>
            <button type="button" className={styles.cancelEndButton} onClick={() => setEndMenuOpen(false)}>
              Continuar treinando
            </button>
          </div>
        </div>
      )}

      {confirmDiscard && (
        <ConfirmDialog
          title="Descartar treino"
          message="Todas as séries registradas nesta sessão serão perdidas. Tem certeza?"
          confirmLabel="Descartar"
          danger
          onConfirm={handleDiscard}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  );
}
