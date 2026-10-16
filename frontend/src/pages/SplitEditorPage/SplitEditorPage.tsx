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
import { todayIso } from "../../utils/dateUtils";
import { apiErrorMessage } from "../../utils/apiError";
import { moveItem, sameOrder, targetIndexFor } from "../../utils/reorder";
import { applyServerSplit } from "../../utils/splitMerge";
import type { Exercise } from "../../types/exercise";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import styles from "./SplitEditorPage.module.css";

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
  // Componentes separados (e key por id): a mesma instância servia /nova e /:id, e depois
  // de criar a tela ficava em branco, com o estado de "não está carregando" da criação.
  return id ? <SplitEditor key={id} id={id} /> : <NewSplit />;
}

function NewSplit() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

function SplitEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  // O catálogo só alimenta o seletor de exercícios: carregá-lo na montagem trazia todas as
  // imagens do acervo junto com a tela do treino, que não usa nenhuma delas. null = ainda
  // não carregado; depois fica em cache enquanto a tela estiver aberta.
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Checks ainda sem resposta do servidor, por exerciseId: a divisão devolvida por outro
  // save não pode desfazê-los (ver applyServerSplit).
  const pendingChecks = useRef(new Map<string, { checked: boolean; seq: number }>());
  const checkSeq = useRef(0);
  const loadedOn = useRef<string | null>(null);

  const applyServer = (server: Split) => {
    const pending = new Map(
      [...pendingChecks.current].map(([exerciseId, { checked }]) => [exerciseId, checked])
    );
    setSplit(applyServerSplit(server, pending));
  };

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchSplit(id)
        .then((data) => {
          if (!active) return;
          loadedOn.current = todayIso();
          setSplit(data);
        })
        .catch((err) => {
          if (active) setError(apiErrorMessage(err, "Não foi possível carregar o treino."));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    void load();

    // PWA aberto de um dia para o outro: o checkedToday carregado é o de ontem.
    const onVisible = () => {
      if (document.visibilityState === "visible" && loadedOn.current !== null && loadedOn.current !== todayIso()) {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  useEffect(() => {
    if (!pickerOpen || catalog !== null) return;
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
  }, [pickerOpen, catalog]);

  const pickerResults = useMemo(() => {
    const chosen = new Set(split?.exercises.map((exercise) => exercise.exerciseId));
    const normalized = pickerQuery.trim().toLowerCase();
    return (catalog ?? []).filter(
      (exercise) =>
        !chosen.has(exercise.id) &&
        (normalized === "" || exercise.name.toLowerCase().includes(normalized))
    );
  }, [catalog, split, pickerQuery]);

  const persist = async (inputs: SplitExerciseInput[], revertTo?: Split): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      applyServer(await replaceSplitExercises(id, inputs));
    } catch (err) {
      if (revertTo) setSplit(revertTo);
      setError(apiErrorMessage(err, "Não foi possível salvar os exercícios."));
    } finally {
      setSaving(false);
    }
  };

  // ---- reordenar arrastando pela alça ----
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<{ order: SplitExercise[]; index: number; pointerId: number } | null>(
    null
  );

  const beginDrag = (e: React.PointerEvent<HTMLElement>, index: number) => {
    if (!split || saving) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    setDrag({ order: split.exercises, index, pointerId: e.pointerId });
  };

  // Ouvido no window e não na lista: o card arrastado muda de lugar no DOM a cada troca,
  // e o pointerup/pointercancel tem de chegar mesmo fora da lista. Sem o cancel, um gesto
  // do sistema deixava a ordem do arraste presa na tela até recarregar a página.
  useEffect(() => {
    if (!drag || !split) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const rects = drag.order.map((_, i) => rowRefs.current[i]?.getBoundingClientRect());
      const target = targetIndexFor(e.clientY, rects);
      if (target !== drag.index) {
        setDrag({ ...drag, order: moveItem(drag.order, drag.index, target), index: target });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      setDrag(null);
      if (sameOrder(drag.order, split.exercises)) return;
      const previous = split;
      setSplit({ ...split, exercises: drag.order });
      void persist(drag.order.map(toInput), previous);
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === drag.pointerId) setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  });

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

  const patchCheck = (exerciseId: string, checked: boolean) =>
    setSplit((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((exercise) =>
              exercise.exerciseId === exerciseId ? { ...exercise, checkedToday: checked } : exercise
            ),
          }
        : prev
    );

  // Marcar é a ação mais repetida do treino: aplica na hora e desfaz se a rede falhar.
  const toggleCheck = async (exercise: SplitExercise, checked: boolean) => {
    const { exerciseId } = exercise;
    const seq = ++checkSeq.current;
    pendingChecks.current.set(exerciseId, { checked, seq });
    patchCheck(exerciseId, checked);
    setError(null);
    try {
      await setExerciseCheck(id, exercise.id, checked);
    } catch (err) {
      patchCheck(exerciseId, !checked);
      setError(apiErrorMessage(err, "Não foi possível marcar o exercício."));
    } finally {
      if (pendingChecks.current.get(exerciseId)?.seq === seq) pendingChecks.current.delete(exerciseId);
    }
  };

  const openEditInfo = () => {
    if (!split) return;
    setEditName(split.name);
    setEditWeekdays(split.weekdays);
    setInfoError(null);
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    if (!split || savingInfo) return;
    setSavingInfo(true);
    setInfoError(null);
    try {
      applyServer(
        await updateSplit(id, {
          name: editName.trim() || split.name,
          weekdays: editWeekdays,
        })
      );
      setEditingInfo(false);
    } catch (err) {
      setInfoError(apiErrorMessage(err, "Não foi possível salvar o treino."));
    } finally {
      setSavingInfo(false);
    }
  };

  const planList = drag?.order ?? split?.exercises ?? [];
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
            <div className={styles.exerciseList}>
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
                    dragging={drag?.index === index}
                    onDragStart={(e) => beginDrag(e, index)}
                    onOpen={() => navigate(`/treino/divisoes/${id}/ex/${exercise.id}`)}
                    onRemove={() => setRemovingId(exercise.id)}
                    onToggleCheck={(checked) => toggleCheck(exercise, checked)}
                    onSaved={applyServer}
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
                {catalog === null ? (
                  <p className={styles.pickerEmpty}>Carregando…</p>
                ) : (
                  <>
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
                  </>
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
        <Modal
          title="Editar treino"
          onClose={() => setEditingInfo(false)}
          onSubmit={saveInfo}
          submitLabel={savingInfo ? "Salvando…" : "Salvar"}
          submitDisabled={savingInfo}
        >
          {infoError && <div className={styles.error}>{infoError}</div>}
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
