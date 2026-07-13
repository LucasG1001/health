import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { WorkoutHeader } from "../../components/WorkoutHeader/WorkoutHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import { DumbbellIcon } from "../../components/Icon/icons";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { completedSetsCount, hasPendingSets, totalSetsCount } from "../../utils/sessionMachine";
import { createSplit, fetchSplit, replaceSplitExercises, updateSplit } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS, formatKg, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import styles from "./SplitEditorPage.module.css";

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
  const { state, finish, discard } = useWorkoutSession();

  const session = state.session;
  const inProgress = session !== null && session.status === "in_progress" && session.splitId === id;

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [endMenuOpen, setEndMenuOpen] = useState(false);

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

  const handleFinish = async () => {
    setEndMenuOpen(false);
    const sessionId = session?.id;
    try {
      const { summary } = await finish();
      if (sessionId) navigate(`/treino/sessao/${sessionId}/resumo`, { replace: true, state: { summary } });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível finalizar o treino."));
    }
  };

  const handleDiscard = async () => {
    setEndMenuOpen(false);
    try {
      await discard();
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

  const allDone =
    inProgress && session
      ? session.exercises.length > 0 && session.exercises.every((ex) => !hasPendingSets(ex))
      : false;

  const headerActions = inProgress ? (
    <button type="button" className={styles.endButton} onClick={() => setEndMenuOpen(true)}>
      Encerrar
    </button>
  ) : split ? (
    <button type="button" className={styles.editButton} onClick={openEditInfo}>
      Editar
    </button>
  ) : undefined;

  const planList = dragOrder ?? split?.exercises ?? [];
  const totalSets = split ? split.exercises.reduce((sum, ex) => sum + ex.plannedSets.length, 0) : 0;
  const muscleSummary = split
    ? Array.from(new Set(split.exercises.map((ex) => ex.muscleGroup)))
        .map((group) => MUSCLE_GROUP_LABELS[group])
        .join(" · ")
    : "";
  const estimatedMinutes = Math.max(5, totalSets * 2);
  const percent =
    inProgress && session
      ? Math.round((completedSetsCount(session) / Math.max(1, totalSetsCount(session))) * 100)
      : null;

  return (
    <div className={styles.page}>
      <WorkoutHeader
        title={split?.name ?? "Treino"}
        subtitle={muscleSummary || undefined}
        percent={percent}
        backTo="/treino"
        actions={headerActions}
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {split && (
        <>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{split.exercises.length}</span>
              <span className={styles.statLabel}>exercícios</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalSets}</span>
              <span className={styles.statLabel}>séries</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statValue} ${styles.statValueAccent}`}>~{estimatedMinutes} min</span>
              <span className={styles.statLabel}>estimado</span>
            </div>
          </div>

          {planList.length > 0 ? (
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
                  onPointerDown={inProgress ? undefined : (e) => onRowPointerDown(e, index, planList)}
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
                    <div className={styles.numBadge}>
                      <span className={styles.numBadgeText}>{index + 1}</span>
                    </div>
                    <div className={styles.info}>
                      <span className={styles.name}>{exercise.name}</span>
                      <span className={styles.meta}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</span>
                    </div>
                    <div className={styles.setsInfo}>
                      <span className={styles.setsReps}>
                        {exercise.plannedSets.length}×
                        {repsTarget(
                          exercise.plannedSets[0]?.targetRepsMin ?? null,
                          exercise.plannedSets[0]?.targetRepsMax ?? null
                        )}
                      </span>
                      <span className={styles.weight}>{formatKg(exercise.workingWeightKg)}</span>
                    </div>
                  </button>
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
