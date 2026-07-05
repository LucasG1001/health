import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  DumbbellIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SkipIcon,
} from "../../components/Icon/icons";
import { useExercises } from "../../hooks/useExercises";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useSettings } from "../../hooks/useSettings";
import { useNow } from "../../hooks/useNow";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useAudioCue } from "../../hooks/useAudioCue";
import { useWakeLock } from "../../hooks/useWakeLock";
import { currentSet, firstPendingSetIndex, hasPendingSets } from "../../utils/sessionMachine";
import { createSplit, fetchSplit, replaceSplitExercises, updateSplit } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS, formatClock, formatKg, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import type { SessionSet } from "../../types/session";
import styles from "./SplitEditorPage.module.css";

const DEFAULT_REST_WARMUP = 45;
const DEFAULT_REST_WORKING = 90;
const LONG_PRESS_MS = 500;

function toInput(exercise: SplitExercise): SplitExerciseInput {
  return {
    exerciseId: exercise.exerciseId,
    notes: exercise.notes,
    workingWeightKg: exercise.workingWeightKg,
    plannedSets:
      exercise.plannedSets.length > 0
        ? exercise.plannedSets.map((set) => ({
            targetRepsMin: set.targetRepsMin,
            targetRepsMax: set.targetRepsMax,
          }))
        : [{ targetRepsMin: 12 }],
  };
}

export function SplitEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exercises: catalog } = useExercises();
  const { settings } = useSettings();
  const {
    state,
    start,
    completeSet,
    playExercise,
    skipRest,
    extendRest,
    restEnded,
    prepareCued,
    finish,
    discard,
  } = useWorkoutSession();

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
  const now = useNow(inProgress);

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [armed, setArmed] = useState(() => (id ? sessionStorage.getItem(`health.armed.${id}`) === "1" : false));
  const [endMenuOpen, setEndMenuOpen] = useState(false);

  const setArmedPersist = (value: boolean) => {
    setArmed(value);
    if (!id) return;
    if (value) sessionStorage.setItem(`health.armed.${id}`, "1");
    else sessionStorage.removeItem(`health.armed.${id}`);
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchSplit(id)
      .then((data) => {
        if (active) setSplit(data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar o treino."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const pickerResults = useMemo(() => {
    const chosen = new Set(split?.exercises.map((exercise) => exercise.exerciseId));
    const normalized = pickerQuery.trim().toLowerCase();
    return catalog.filter(
      (exercise) =>
        !chosen.has(exercise.id) &&
        (normalized === "" || exercise.name.toLowerCase().includes(normalized))
    );
  }, [catalog, split, pickerQuery]);

  // ---- reorder by long-press + drag (idle only) ----
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pressTimer = useRef<number | null>(null);
  const pressStartY = useRef(0);
  const suppressClickRef = useRef(false);
  const [dragOrder, setDragOrder] = useState<SplitExercise[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const beginDrag = (index: number, list: SplitExercise[]) => {
    suppressClickRef.current = true;
    setDragOrder([...list]);
    setDragIndex(index);
  };

  const onRowPointerDown = (e: React.PointerEvent, index: number, list: SplitExercise[]) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pressStartY.current = e.clientY;
    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      el.setPointerCapture(pointerId);
      beginDrag(index, list);
    }, LONG_PRESS_MS);
  };

  const onRowPointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null || dragOrder === null) {
      if (pressTimer.current !== null && Math.abs(e.clientY - pressStartY.current) > 8) {
        clearPressTimer();
      }
      return;
    }
    const y = e.clientY;
    let target = dragOrder.length - 1;
    for (let i = 0; i < dragOrder.length; i++) {
      const rect = rowRefs.current[i]?.getBoundingClientRect();
      if (rect && y < rect.top + rect.height / 2) {
        target = i;
        break;
      }
    }
    if (target !== dragIndex) {
      setDragOrder((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(target, 0, moved!);
        return next;
      });
      setDragIndex(target);
    }
  };

  const onRowPointerUp = async () => {
    clearPressTimer();
    if (dragIndex === null || dragOrder === null) return;
    const order = dragOrder;
    setDragOrder(null);
    setDragIndex(null);
    setSplit((prev) => (prev ? { ...prev, exercises: order } : prev));
    await persist(order.map(toInput));
  };

  if (!id) {
    const handleCreate = async () => {
      if (!name.trim()) {
        setError("Informe o nome do treino.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const created = await createSplit({ name: name.trim(), weekdays });
        navigate(`/treino/divisoes/${created.id}`, { replace: true });
      } catch (err) {
        setError(apiErrorMessage(err, "Não foi possível criar o treino."));
        setSaving(false);
      }
    };

    return (
      <div className={styles.page}>
        <PageHeader title="Novo treino" backTo="/treino" />
        {error && <div className={styles.error}>{error}</div>}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: A - Peito e Tríceps"
          />
        </label>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Dias da semana</span>
          <DayOfWeekPicker value={weekdays} onChange={setWeekdays} />
        </div>
        <button type="button" className={styles.saveButton} onClick={handleCreate} disabled={saving}>
          {saving ? "Criando…" : "Criar treino"}
        </button>
      </div>
    );
  }

  const restMsFor = (target: SessionSet): number => {
    const seconds =
      target.restSeconds ??
      (target.setType === "warmup"
        ? settings?.restWarmupSeconds ?? DEFAULT_REST_WARMUP
        : settings?.restWorkingSeconds ?? DEFAULT_REST_WORKING);
    return seconds * 1000;
  };

  const defaultRestClock = formatClock((settings?.restWorkingSeconds ?? DEFAULT_REST_WORKING) * 1000);

  const persist = async (inputs: SplitExerciseInput[]): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await replaceSplitExercises(id, inputs);
      setSplit(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar os exercícios."));
    } finally {
      setSaving(false);
    }
  };

  const addExercise = async (exerciseId: string) => {
    if (!split) return;
    setPickerOpen(false);
    setPickerQuery("");
    await persist([
      ...split.exercises.map(toInput),
      { exerciseId, plannedSets: [{ targetRepsMin: 12 }, { targetRepsMin: 12 }, { targetRepsMin: 12 }] },
    ]);
  };

  const sxIdForExercise = (exerciseId: string | null): string | null => {
    if (!exerciseId || !split) return null;
    return split.exercises.find((e) => e.exerciseId === exerciseId)?.id ?? null;
  };

  const openDetailByExerciseId = (exerciseId: string | null) => {
    const sxId = sxIdForExercise(exerciseId);
    if (sxId) navigate(`/treino/divisoes/${id}/ex/${sxId}`);
    else if (exerciseId) navigate(`/treino/exercicios/${exerciseId}`);
  };

  const onFirstPlay = async (index: number) => {
    if (starting) return;
    unlock();
    setStarting(true);
    setError(null);
    try {
      await start(id);
      setArmedPersist(false);
      playExercise(index);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível iniciar o treino."));
    } finally {
      setStarting(false);
    }
  };

  const handlePlay = (index: number) => {
    unlock();
    setError(null);
    playExercise(index);
  };

  const handleDone = async () => {
    const set = currentSet(state);
    if (!set || saving) return;
    unlock();
    setSaving(true);
    setError(null);
    try {
      await completeSet({
        setId: set.id,
        weightKg: set.weightKg,
        reps: set.reps ?? set.targetRepsMin,
        restMs: restMsFor(set),
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a série."));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setEndMenuOpen(false);
    const sessionId = session?.id;
    try {
      const { summary } = await finish();
      setArmedPersist(false);
      if (sessionId) navigate(`/treino/sessao/${sessionId}/resumo`, { replace: true, state: { summary } });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível finalizar o treino."));
    }
  };

  const handleDiscard = async () => {
    setEndMenuOpen(false);
    try {
      await discard();
      setArmedPersist(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível descartar o treino."));
    }
  };

  const openEditInfo = () => {
    if (!split) return;
    setEditName(split.name);
    setEditWeekdays(split.weekdays);
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    if (!split) return;
    try {
      const updated = await updateSplit(id, { name: editName.trim() || split.name, weekdays: editWeekdays });
      setSplit(updated);
      setEditingInfo(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o treino."));
    }
  };

  const elapsedMs = inProgress && session ? now - new Date(session.startedAt).getTime() : 0;
  const allDone =
    inProgress && session
      ? session.exercises.length > 0 && session.exercises.every((ex) => !hasPendingSets(ex))
      : false;

  const headerActions = inProgress ? (
    <div className={styles.headerActions}>
      <span className={styles.headerClock}>{formatClock(elapsedMs)}</span>
      <button type="button" className={styles.endButton} onClick={() => setEndMenuOpen(true)}>
        Encerrar
      </button>
    </div>
  ) : split ? (
    <button type="button" className={styles.iconButton} onClick={openEditInfo} aria-label="Editar treino">
      <PencilIcon className={styles.iconButtonIcon} />
    </button>
  ) : undefined;

  const planList = dragOrder ?? split?.exercises ?? [];

  return (
    <div className={styles.page}>
      <PageHeader title={split?.name ?? "Treino"} backTo="/treino" actions={headerActions} />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {split && (
        <>
          {inProgress && session ? (
            <div className={styles.exerciseList}>
              {session.exercises.map((item, index) => {
                const done = !hasPendingSets(item);
                const completed = item.sets.filter((s) => s.completedAt !== null).length;
                const total = item.sets.length;
                const active = index === state.currentExerciseIndex;
                const resting = active && state.phase === "resting";
                const exercising = active && state.phase === "exercising";
                const currentNumber = firstPendingSetIndex(item) + 1;
                const restRef = item.sets.find((s) => s.setType === "working") ?? item.sets[0] ?? null;
                return (
                  <div key={item.id} className={`${styles.exerciseRow} ${active ? styles.exerciseRowActive : ""}`}>
                    <button
                      type="button"
                      className={styles.exerciseMain}
                      onClick={() => openDetailByExerciseId(item.exerciseId)}
                    >
                      <div className={styles.thumb}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <DumbbellIcon className={styles.thumbIcon} />
                        )}
                      </div>
                      <div className={styles.info}>
                        <span className={styles.name}>{item.exerciseName}</span>
                        <span className={styles.meta}>
                          {item.muscleGroup ? `${MUSCLE_GROUP_LABELS[item.muscleGroup]} · ` : ""}
                          {completed}/{total} séries
                        </span>
                      </div>
                    </button>
                    <div className={styles.restLine}>
                      {done ? (
                        <span className={styles.restNotice}>
                          <CheckIcon className={styles.restDoneIcon} />
                          concluído
                        </span>
                      ) : resting ? (
                        <>
                          <span className={styles.restCountdown}>
                            <ClockIcon className={styles.restNoticeIcon} />
                            {preparing ? "prepare!" : formatClock(remainingMs)} · próxima {currentNumber}/{total}
                          </span>
                          <div className={styles.restMiniActions}>
                            <button type="button" className={styles.restMiniButton} onClick={extendRest}>
                              <PlusIcon className={styles.restMiniIcon} />
                              15s
                            </button>
                            <button type="button" className={styles.restMiniButton} onClick={skipRest}>
                              <SkipIcon className={styles.restMiniIcon} />
                              Pular
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className={styles.restNotice}>
                            <ClockIcon className={styles.restNoticeIcon} />
                            {restRef ? formatClock(restMsFor(restRef)) : defaultRestClock} · descanso · {currentNumber}/{total}
                          </span>
                          {exercising ? (
                            <button type="button" className={styles.doneButton} onClick={handleDone} disabled={saving}>
                              Feito
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.playButton}
                              onClick={() => handlePlay(index)}
                              aria-label="Iniciar exercício"
                            >
                              <PlayIcon className={styles.playIcon} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : planList.length > 0 ? (
            <div
              className={`${styles.exerciseList} ${dragIndex !== null ? styles.listDragging : ""}`}
              onPointerMove={onRowPointerMove}
              onPointerUp={onRowPointerUp}
            >
              {planList.map((exercise, index) => (
                <div
                  key={exercise.id}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  className={`${styles.exerciseRow} ${dragIndex === index ? styles.exerciseRowDragging : ""}`}
                  onPointerDown={armed ? undefined : (e) => onRowPointerDown(e, index, planList)}
                >
                  <button
                    type="button"
                    className={styles.exerciseMain}
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      navigate(`/treino/divisoes/${id}/ex/${exercise.id}`);
                    }}
                  >
                    <div className={styles.thumb}>
                      {exercise.imageUrl ? (
                        <img src={exercise.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <DumbbellIcon className={styles.thumbIcon} />
                      )}
                    </div>
                    <div className={styles.info}>
                      <span className={styles.name}>{exercise.name}</span>
                      <span className={styles.meta}>
                        {exercise.plannedSets.length} x{" "}
                        {repsTarget(
                          exercise.plannedSets[0]?.targetRepsMin ?? null,
                          exercise.plannedSets[0]?.targetRepsMax ?? null
                        )}{" "}
                        | {formatKg(exercise.workingWeightKg)}
                      </span>
                    </div>
                    {!armed && <ChevronRightIcon className={styles.chevron} />}
                  </button>
                  {armed && (
                    <div className={styles.restLine}>
                      <span className={styles.restNotice}>
                        <ClockIcon className={styles.restNoticeIcon} />
                        {defaultRestClock} · descanso · 0/{exercise.plannedSets.length}
                      </span>
                      <button
                        type="button"
                        className={styles.playButton}
                        onClick={() => onFirstPlay(index)}
                        disabled={starting}
                        aria-label="Iniciar exercício"
                      >
                        <PlayIcon className={styles.playIcon} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<DumbbellIcon />}
              title="Nenhum exercício ainda"
              description="Adicione exercícios a este treino."
            />
          )}

          {!inProgress && !armed && (
            <>
              {pickerOpen ? (
                <div className={styles.picker}>
                  <div className={styles.pickerHeader}>
                    <input
                      type="search"
                      placeholder="Buscar no meu catálogo…"
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setPickerOpen(false)}
                      aria-label="Fechar"
                    >
                      <CloseIcon className={styles.iconButtonIcon} />
                    </button>
                  </div>
                  <div className={styles.pickerList}>
                    {pickerResults.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        className={styles.pickerItem}
                        onClick={() => addExercise(exercise.id)}
                      >
                        <div className={styles.thumb}>
                          {exercise.imageUrl ? (
                            <img src={exercise.imageUrl} alt="" loading="lazy" />
                          ) : (
                            <DumbbellIcon className={styles.thumbIcon} />
                          )}
                        </div>
                        <div className={styles.info}>
                          <span className={styles.name}>{exercise.name}</span>
                          <span className={styles.meta}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</span>
                        </div>
                      </button>
                    ))}
                    {pickerResults.length === 0 && (
                      <p className={styles.pickerEmpty}>
                        Nada encontrado.{" "}
                        <button
                          type="button"
                          className={styles.pickerLink}
                          onClick={() => navigate("/treino/exercicios/novo")}
                        >
                          Cadastrar exercício
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <button type="button" className={styles.addButton} onClick={() => setPickerOpen(true)}>
                  <PlusIcon className={styles.addIcon} />
                  Adicionar exercício
                </button>
              )}

              <button
                type="button"
                className={styles.startButton}
                onClick={() => setArmedPersist(true)}
                disabled={split.exercises.length === 0}
              >
                <PlayIcon className={styles.startIcon} />
                Começar treino
              </button>
            </>
          )}

          {armed && (
            <p className={styles.armedHint}>Toque no Play do primeiro exercício para começar.</p>
          )}

          {allDone && (
            <button type="button" className={styles.startButton} onClick={handleFinish}>
              Finalizar treino
            </button>
          )}
        </>
      )}

      {editingInfo && (
        <Modal title="Editar treino" onClose={() => setEditingInfo(false)} onSubmit={saveInfo}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nome</span>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </label>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Dias da semana</span>
            <DayOfWeekPicker value={editWeekdays} onChange={setEditWeekdays} />
          </div>
        </Modal>
      )}

      {endMenuOpen && (
        <div className={styles.endBackdrop} onClick={(e) => e.target === e.currentTarget && setEndMenuOpen(false)}>
          <div className={styles.endSheet}>
            <h2 className={styles.endTitle}>Encerrar treino?</h2>
            <button type="button" className={styles.startButton} onClick={handleFinish}>
              Finalizar treino
            </button>
            <button type="button" className={styles.discardButton} onClick={handleDiscard}>
              Descartar treino
            </button>
            <button type="button" className={styles.cancelEndButton} onClick={() => setEndMenuOpen(false)}>
              Continuar treinando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
