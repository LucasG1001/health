import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import {
  ArrowUpIcon,
  ChevronRightIcon,
  CloseIcon,
  DumbbellIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from "../../components/Icon/icons";
import { useExercises } from "../../hooks/useExercises";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { createSplit, fetchSplit, replaceSplitExercises, updateSplit } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS, formatKg, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import styles from "./SplitEditorPage.module.css";

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
  const { start } = useWorkoutSession();
  const { exercises: catalog } = useExercises();

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
  const [removingSxId, setRemovingSxId] = useState<string | null>(null);

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

  const moveUp = async (index: number) => {
    if (!split || index === 0) return;
    const order = [...split.exercises];
    [order[index - 1], order[index]] = [order[index]!, order[index - 1]!];
    await persist(order.map(toInput));
  };

  const removeExercise = async (sxId: string) => {
    if (!split) return;
    setRemovingSxId(null);
    await persist(split.exercises.filter((exercise) => exercise.id !== sxId).map(toInput));
  };

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      await start(id);
      navigate("/treino/sessao/ativa");
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível iniciar o treino."));
      setStarting(false);
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

  return (
    <div className={styles.page}>
      <PageHeader
        title={split?.name ?? "Treino"}
        backTo="/treino"
        actions={
          split && (
            <button type="button" className={styles.iconButton} onClick={openEditInfo} aria-label="Editar treino">
              <PencilIcon className={styles.iconButtonIcon} />
            </button>
          )
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {split && (
        <>
          {split.exercises.length > 0 ? (
            <div className={styles.exerciseList}>
              {split.exercises.map((exercise, index) => (
                <div key={exercise.id} className={styles.exerciseRow}>
                  <button
                    type="button"
                    className={styles.exerciseMain}
                    onClick={() => navigate(`/treino/divisoes/${id}/ex/${exercise.id}`)}
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
                    <ChevronRightIcon className={styles.chevron} />
                  </button>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.rowActionButton}
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || saving}
                      aria-label="Mover para cima"
                    >
                      <ArrowUpIcon className={styles.rowActionIcon} />
                    </button>
                    <button
                      type="button"
                      className={styles.rowActionButton}
                      onClick={() => setRemovingSxId(exercise.id)}
                      aria-label="Remover exercício"
                    >
                      <TrashIcon className={styles.rowActionIcon} />
                    </button>
                  </div>
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
            onClick={handleStart}
            disabled={starting || split.exercises.length === 0}
          >
            <PlayIcon className={styles.startIcon} />
            {starting ? "Iniciando…" : "Começar treino"}
          </button>
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

      {removingSxId && (
        <ConfirmDialog
          title="Remover exercício"
          message="O exercício sai deste treino. Treinos já realizados são preservados."
          confirmLabel="Remover"
          danger
          onCancel={() => setRemovingSxId(null)}
          onConfirm={() => removeExercise(removingSxId)}
        />
      )}
    </div>
  );
}
