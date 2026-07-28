import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import { SetStepper } from "../../components/SetStepper/SetStepper";
import { InterRestModal } from "../../components/InterRestModal/InterRestModal";
import { ExerciseThumb } from "../../components/ExerciseThumb/ExerciseThumb";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DumbbellIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
} from "../../components/Icon/icons";
import { useExercises } from "../../hooks/useExercises";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useNow } from "../../hooks/useNow";
import { completedSetsOf, firstPendingSetIndex, hasPendingSets } from "../../utils/sessionMachine";
import { createSplit, fetchSplit, replaceSplitExercises, updateSplit } from "../../services/splitService";
import { updateExercise } from "../../services/exerciseService";
import { numberToMask, parseMaskedNumber } from "../../utils/numberMask";
import {
  MUSCLE_GROUP_LABELS,
  formatClock,
  formatKg,
  formatStopwatch,
  muscleSummary,
  repsTarget,
} from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import type { SessionExercise, SessionSet } from "../../types/session";
import styles from "./SplitEditorPage.module.css";

const LONG_PRESS_MS = 500;
const DEFAULT_REST_WARMUP = 45;
const DEFAULT_REST_WORKING = 60;

function toInput(exercise: SplitExercise): SplitExerciseInput {
  return {
    exerciseId: exercise.exerciseId,
    notes: exercise.notes,
    workingWeightKg: exercise.workingWeightKg,
    restSeconds: exercise.restSeconds,
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
  const {
    state,
    hydrating,
    bootError,
    restRemainingMs,
    restProgress,
    unlock,
    start,
    playExercise,
    completeSet,
    skipRest,
    finish,
    editSet,
    extendRest,
    nextExercise,
  } = useWorkoutSession();

  const session = state.session;
  const inProgress = session !== null && session.status === "in_progress" && session.splitId === id;
  const now = useNow(inProgress);

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  // ---- reorder by long-press + drag (fora da sessão) ----
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

  const restMsFor = (set: SessionSet): number => {
    const seconds =
      set.restSeconds ?? (set.setType === "warmup" ? DEFAULT_REST_WARMUP : DEFAULT_REST_WORKING);
    return seconds * 1000;
  };

  const defaultRestSeconds = (exercise: SplitExercise): number =>
    exercise.restSeconds ?? DEFAULT_REST_WORKING;

  const sessionExerciseFor = (exercise: SplitExercise): { sx: SessionExercise; index: number } | null => {
    if (!inProgress || !session) return null;
    const index = session.exercises.findIndex((e) => e.exerciseId === exercise.exerciseId);
    return index >= 0 ? { sx: session.exercises[index]!, index } : null;
  };

  // `busy` é estado (render), então não protege dois toques no mesmo tick; o ref é a trava real.
  const runExclusive = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handlePlay = (exercise: SplitExercise) =>
    runExclusive(async () => {
      // Antes da hidratação terminar não sabemos se já existe sessão ativa: iniciar
      // outra aqui bateria no índice único de sessão em andamento.
      if (hydrating) return;
      unlock();
      setError(null);
      try {
        const current = inProgress && session ? session : await start(id);
        const sxIndex = current.exercises.findIndex((e) => e.exerciseId === exercise.exerciseId);
        const sx = sxIndex >= 0 ? current.exercises[sxIndex] : null;
        if (!sx) return;
        playExercise(sxIndex);
        if (!hasPendingSets(sx)) return;
        const pending = sx.sets[firstPendingSetIndex(sx)]!;
        await completeSet({
          setId: pending.id,
          weightKg: pending.weightKg ?? exercise.workingWeightKg ?? null,
          reps: pending.reps ?? pending.targetRepsMin ?? 1,
          restMs: restMsFor(pending),
          interRestMs: restMsFor(pending),
        });
      } catch (err) {
        setError(apiErrorMessage(err, "Não foi possível iniciar a série."));
      }
    });

  const handleConclude = (exercise: SplitExercise) =>
    runExclusive(async () => {
      const match = sessionExerciseFor(exercise);
      if (!match) return;
      const pending = match.sx.sets.filter((s) => s.completedAt === null);
      if (pending.length === 0) return;
      setError(null);
      try {
        for (const set of pending) {
          // Sem peso e reps a série conta como feita mas soma zero no volume do treino.
          await editSet(set.id, {
            completed: true,
            weightKg: set.weightKg ?? exercise.workingWeightKg ?? null,
            reps: set.reps ?? set.targetRepsMin ?? 1,
          });
        }
      } catch (err) {
        setError(apiErrorMessage(err, "Não foi possível concluir o exercício."));
      }
    });

  const handleUnconclude = (exercise: SplitExercise) =>
    runExclusive(async () => {
      const match = sessionExerciseFor(exercise);
      if (!match) return;
      const done = match.sx.sets.filter((s) => s.completedAt !== null);
      if (done.length === 0) return;
      setError(null);
      try {
        for (const set of done) {
          await editSet(set.id, { completed: false });
        }
      } catch (err) {
        setError(apiErrorMessage(err, "Não foi possível reabrir o exercício."));
      }
    });

  const handleInterRestDone = (weightMasked: string) =>
    runExclusive(async () => {
      const finishedSx = session?.exercises[state.currentExerciseIndex] ?? null;
      const finishedSplitEx = finishedSx
        ? split?.exercises.find((e) => e.exerciseId === finishedSx.exerciseId) ?? null
        : null;
      const parsed = parseMaskedNumber(weightMasked);
      const changed =
        finishedSx !== null &&
        finishedSplitEx !== null &&
        parsed !== null &&
        parsed !== finishedSplitEx.workingWeightKg;
      setError(null);
      if (changed) {
        try {
          await updateExercise(finishedSplitEx.exerciseId, { workingWeightKg: parsed });
          setSplit((prev) =>
            prev
              ? {
                  ...prev,
                  exercises: prev.exercises.map((e) =>
                    e.exerciseId === finishedSplitEx.exerciseId ? { ...e, workingWeightKg: parsed } : e
                  ),
                }
              : prev
          );
          for (const set of finishedSx.sets) {
            if (set.completedAt !== null) await editSet(set.id, { weightKg: parsed });
          }
        } catch (err) {
          setError(apiErrorMessage(err, "Não foi possível salvar a carga."));
          return;
        }
      }
      nextExercise();
    });

  const removeExercise = async (sxId: string) => {
    if (!split) return;
    setRemovingId(null);
    await persist(split.exercises.filter((e) => e.id !== sxId).map(toInput));
  };

  const handleFinish = async () => {
    const sessionId = session?.id;
    try {
      const { summary } = await finish();
      if (sessionId) navigate(`/treino/sessao/${sessionId}/resumo`, { replace: true, state: { summary } });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível finalizar o treino."));
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

  const baseList = dragOrder ?? split?.exercises ?? [];
  const isExerciseDone = (exercise: SplitExercise): boolean => {
    const match = sessionExerciseFor(exercise);
    return match ? !hasPendingSets(match.sx) : false;
  };
  const planList = inProgress
    ? [...baseList.filter((e) => !isExerciseDone(e)), ...baseList.filter(isExerciseDone)]
    : baseList;
  const muscles = split ? muscleSummary(split.exercises) : "";
  const elapsedMs = inProgress && session ? now - new Date(session.startedAt).getTime() : 0;

  const interRestActive = inProgress && session !== null && state.phase === "interRest";
  const finishedSx = interRestActive ? session!.exercises[state.currentExerciseIndex] ?? null : null;
  const finishedSplitEx = finishedSx
    ? split?.exercises.find((e) => e.exerciseId === finishedSx.exerciseId) ?? null
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.iconBtn} onClick={() => navigate("/treino")} aria-label="Voltar">
          <ChevronLeftIcon className={styles.navIcon} />
        </button>
        <span className={styles.clock}>{inProgress ? formatStopwatch(elapsedMs) : ""}</span>
        {!inProgress && split ? (
          <button type="button" className={styles.editButton} onClick={openEditInfo}>
            Editar
          </button>
        ) : (
          <span className={styles.topSlot} />
        )}
      </header>

      {split && (
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>{split.name}</h1>
          {muscles && <p className={styles.heroSubtitle}>{muscles}</p>}
        </div>
      )}

      {bootError && <div className={styles.error}>{bootError}</div>}
      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {split && (
        <>
          {planList.length > 0 ? (
            <div
              className={`${styles.exerciseList} ${dragIndex !== null ? styles.listDragging : ""}`}
              onPointerMove={onRowPointerMove}
              onPointerUp={onRowPointerUp}
            >
              {planList.map((exercise, index) => {
                const match = sessionExerciseFor(exercise);
                const sx = match?.sx ?? null;
                const total = sx ? sx.sets.length : exercise.plannedSets.length;
                const completed = sx ? completedSetsOf(sx) : 0;
                const done = sx ? !hasPendingSets(sx) : false;
                const isActive = match !== null && match.index === state.currentExerciseIndex;
                const restingHere = isActive && state.phase === "resting";
                const timeLabel = restingHere
                  ? formatClock(restRemainingMs)
                  : formatClock(defaultRestSeconds(exercise) * 1000);
                return (
                  <div
                    key={exercise.id}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    className={`${styles.exerciseRow} ${dragIndex === index ? styles.exerciseRowDragging : ""} ${
                      isActive ? styles.exerciseRowActive : ""
                    } ${done ? styles.exerciseRowDone : ""}`}
                    onPointerDown={inProgress ? undefined : (e) => onRowPointerDown(e, index, planList)}
                  >
                    <div className={styles.cardMain}>
                      <button
                        type="button"
                        className={`${styles.checkCircle} ${done ? styles.checkCircleDone : ""}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => (done ? handleUnconclude(exercise) : handleConclude(exercise))}
                        disabled={!sx || busy}
                        aria-label={done ? "Reabrir exercício" : "Concluir exercício"}
                      />
                      <button
                        type="button"
                        className={styles.cardBody}
                        onClick={() => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            return;
                          }
                          navigate(`/treino/divisoes/${id}/ex/${exercise.id}`);
                        }}
                      >
                        <ExerciseThumb exercise={exercise} />
                        <div className={styles.info}>
                          <span className={styles.name}>{exercise.name}</span>
                          <span className={styles.meta}>
                            {exercise.plannedSets.length}×{" "}
                            {repsTarget(
                              exercise.plannedSets[0]?.targetRepsMin ?? null,
                              exercise.plannedSets[0]?.targetRepsMax ?? null
                            )}{" "}
                            | {formatKg(exercise.workingWeightKg)}
                          </span>
                        </div>
                        <ChevronRightIcon className={styles.chevron} />
                      </button>
                      {!inProgress && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setRemovingId(exercise.id)}
                          aria-label="Remover exercício do treino"
                        >
                          <TrashIcon className={styles.removeIcon} />
                        </button>
                      )}
                    </div>

                    {done ? (
                      <div className={styles.doneLine}>
                        <span className={styles.doneLabel}>Concluído</span>
                      </div>
                    ) : (
                      <div className={styles.restLine}>
                        <span className={styles.restTime}>{timeLabel}</span>
                        <span className={styles.restLabel}>(Descanso entre séries)</span>
                        {restingHere ? (
                          <button
                            type="button"
                            className={styles.restControl}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={skipRest}
                            aria-label="Pular descanso"
                          >
                            <StopIcon className={styles.restControlIcon} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.restControl}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => handlePlay(exercise)}
                            disabled={busy}
                            aria-label="Concluir série"
                          >
                            <PlayIcon className={styles.restControlIcon} />
                          </button>
                        )}
                      </div>
                    )}

                    {isActive && total > 0 && (
                      <div className={styles.stepperWrap}>
                        <SetStepper
                          total={total}
                          completed={completed}
                          restProgress={restingHere ? restProgress : null}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<DumbbellIcon />}
              title="Nenhum exercício ainda"
              description="Adicione exercícios a este treino."
            />
          )}

          {!inProgress &&
            (pickerOpen ? (
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
                      <ExerciseThumb exercise={exercise} size="sm" />
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
            ))}

          {inProgress && (
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

      {interRestActive && finishedSx && (
        <InterRestModal
          remainingMs={restRemainingMs}
          progress={restProgress}
          finishedName={finishedSx.exerciseName}
          initialWeight={numberToMask(finishedSplitEx?.workingWeightKg)}
          onExtend={extendRest}
          onDone={handleInterRestDone}
          saving={busy}
        />
      )}

      {removingId && (
        <ConfirmDialog
          title="Remover exercício do treino?"
          message="O exercício sai desta divisão. O catálogo e os treinos já feitos são preservados."
          confirmLabel="Remover"
          danger
          onCancel={() => setRemovingId(null)}
          onConfirm={() => removeExercise(removingId)}
        />
      )}
    </div>
  );
}
