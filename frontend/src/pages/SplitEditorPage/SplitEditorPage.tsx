import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import { ExerciseThumb } from "../../components/ExerciseThumb/ExerciseThumb";
import { ChevronLeftIcon, CloseIcon, DumbbellIcon, PlusIcon } from "../../components/Icon/icons";
import { fetchExercises } from "../../services/exerciseService";
import {
  createSplit,
  fetchSplit,
  replaceSplitExercises,
  setExerciseCheck,
  updateSplit,
} from "../../services/splitService";
import { ExerciseCard } from "./ExerciseCard";
import { MUSCLE_GROUP_LABELS, muscleSummary } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Exercise } from "../../types/exercise";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import styles from "./SplitEditorPage.module.css";

const LONG_PRESS_MS = 500;

function toInput(exercise: SplitExercise): SplitExerciseInput {
  return {
    exerciseId: exercise.exerciseId,
    notes: exercise.notes,
    plannedSets:
      exercise.plannedSets.length > 0
        ? exercise.plannedSets.map((set) => ({
            targetRepsMin: set.targetRepsMin,
            targetRepsMax: set.targetRepsMax,
          }))
        : [{ targetRepsMin: 12 }],
  };
}

// A key inclui os valores do plano para o card ser remontado quando o servidor devolve a
// divisão salva — é assim que os campos de edição voltam a refletir o que está gravado.
function cardKey(exercise: SplitExercise): string {
  const first = exercise.plannedSets[0];
  return [
    exercise.id,
    exercise.plannedSets.length,
    first?.targetRepsMin ?? "",
    first?.targetRepsMax ?? "",
    exercise.workingWeightKg ?? "",
    exercise.additionalWeightKg ?? "",
  ].join(":");
}

export function SplitEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // O catálogo só alimenta o seletor de exercícios: carregá-lo na montagem trazia todas as
  // imagens do acervo junto com a tela do treino, que não usa nenhuma delas.
  const [catalog, setCatalog] = useState<Exercise[]>([]);

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;
    fetchExercises()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar os exercícios."));
      });
    return () => {
      active = false;
    };
  }, [pickerOpen]);

  const pickerResults = useMemo(() => {
    const chosen = new Set(split?.exercises.map((exercise) => exercise.exerciseId));
    const normalized = pickerQuery.trim().toLowerCase();
    return catalog.filter(
      (exercise) =>
        !chosen.has(exercise.id) &&
        (normalized === "" || exercise.name.toLowerCase().includes(normalized))
    );
  }, [catalog, split, pickerQuery]);

  // ---- reorder by long-press + drag ----
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
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className={styles.page}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate("/treino")}
            aria-label="Voltar"
          >
            <ChevronLeftIcon className={styles.navIcon} />
          </button>
          <span className={styles.topTitle}>Novo treino</span>
          <span className={styles.topSlot} />
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Treino A — Peito e tríceps"
            autoFocus
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

  const removeExercise = async (sxId: string) => {
    if (!split) return;
    setRemovingId(null);
    await persist(split.exercises.filter((e) => e.id !== sxId).map(toInput));
  };

  const patchCheck = (sxId: string, checked: boolean) =>
    setSplit((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((exercise) =>
              exercise.id === sxId ? { ...exercise, checkedToday: checked } : exercise
            ),
          }
        : prev
    );

  // Marcar é a ação mais repetida do treino: aplica na hora e desfaz se a rede falhar.
  const toggleCheck = async (sxId: string, checked: boolean) => {
    patchCheck(sxId, checked);
    setError(null);
    try {
      await setExerciseCheck(id, sxId, checked);
    } catch (err) {
      patchCheck(sxId, !checked);
      setError(apiErrorMessage(err, "Não foi possível marcar o exercício."));
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
      const updated = await updateSplit(id, {
        name: editName.trim() || split.name,
        weekdays: editWeekdays,
      });
      setSplit(updated);
      setEditingInfo(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o treino."));
    }
  };

  const planList = dragOrder ?? split?.exercises ?? [];
  const muscles = split ? muscleSummary(split.exercises) : "";
  const doneCount = planList.filter((exercise) => exercise.checkedToday).length;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => navigate("/treino")}
          aria-label="Voltar"
        >
          <ChevronLeftIcon className={styles.navIcon} />
        </button>
        <span className={styles.topTitle}>
          {planList.length > 0 ? `${doneCount}/${planList.length} feitos hoje` : ""}
        </span>
        {split ? (
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
              {planList.map((exercise, index) => (
                <div
                  key={exercise.id}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                >
                  <ExerciseCard
                    key={cardKey(exercise)}
                    splitId={id}
                    exercise={exercise}
                    dragging={dragIndex === index}
                    onPointerDown={(e) => onRowPointerDown(e, index, planList)}
                    onOpen={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      navigate(`/treino/divisoes/${id}/ex/${exercise.id}`);
                    }}
                    onRemove={() => setRemovingId(exercise.id)}
                    onToggleCheck={(checked) => toggleCheck(exercise.id, checked)}
                    onSaved={setSplit}
                    onError={setError}
                  />
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
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setPickerOpen(true)}
              disabled={saving}
            >
              <PlusIcon className={styles.addIcon} />
              Adicionar exercício
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

      {removingId && (
        <ConfirmDialog
          title="Remover exercício do treino?"
          message="O exercício sai desta divisão. O catálogo é preservado."
          confirmLabel="Remover"
          danger
          onCancel={() => setRemovingId(null)}
          onConfirm={() => removeExercise(removingId)}
        />
      )}
    </div>
  );
}
