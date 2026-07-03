import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { DayOfWeekPicker } from "../../components/DayOfWeekPicker/DayOfWeekPicker";
import {
  ArrowUpIcon,
  CloseIcon,
  DumbbellIcon,
  PlusIcon,
} from "../../components/Icon/icons";
import { useExercises } from "../../hooks/useExercises";
import { createSplit, fetchSplit, replaceSplitExercises, updateSplit } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS, VARIATION_LABELS } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { SetType, SetVariation, SplitExerciseInput } from "../../types/split";
import styles from "./SplitEditorPage.module.css";

interface DraftSet {
  setType: SetType;
  variation: SetVariation;
  targetRepsMin: string;
  targetRepsMax: string;
  suggestedWeightKg: string;
  restSeconds: string;
}

interface DraftExercise {
  exerciseId: string;
  name: string;
  muscleGroupLabel: string;
  imageUrl: string | null;
  restSeconds: string;
  sets: DraftSet[];
}

const DEFAULT_SET: DraftSet = {
  setType: "working",
  variation: "normal",
  targetRepsMin: "12",
  targetRepsMax: "",
  suggestedWeightKg: "",
  restSeconds: "",
};

function parseIntOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseFloatOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

export function SplitEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exercises: catalog } = useExercises();

  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchSplit(id)
      .then((split) => {
        if (!active) return;
        setName(split.name);
        setWeekdays(split.weekdays);
        setDrafts(
          split.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            muscleGroupLabel: MUSCLE_GROUP_LABELS[exercise.muscleGroup],
            imageUrl: exercise.imageUrl,
            restSeconds: exercise.restSeconds != null ? String(exercise.restSeconds) : "",
            sets: exercise.plannedSets.map((set) => ({
              setType: set.setType,
              variation: set.variation,
              targetRepsMin: String(set.targetRepsMin),
              targetRepsMax: set.targetRepsMax != null ? String(set.targetRepsMax) : "",
              suggestedWeightKg:
                set.suggestedWeightKg != null ? String(set.suggestedWeightKg).replace(".", ",") : "",
              restSeconds: set.restSeconds != null ? String(set.restSeconds) : "",
            })),
          }))
        );
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar a divisão."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const pickerResults = useMemo(() => {
    const chosen = new Set(drafts.map((draft) => draft.exerciseId));
    const normalized = pickerQuery.trim().toLowerCase();
    return catalog.filter(
      (exercise) =>
        !chosen.has(exercise.id) &&
        (normalized === "" || exercise.name.toLowerCase().includes(normalized))
    );
  }, [catalog, drafts, pickerQuery]);

  const updateDraft = (index: number, patch: Partial<DraftExercise>) => {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  };

  const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) => {
    setDrafts((prev) =>
      prev.map((draft, i) =>
        i === exerciseIndex
          ? { ...draft, sets: draft.sets.map((set, j) => (j === setIndex ? { ...set, ...patch } : set)) }
          : draft
      )
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDrafts((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Informe o nome da divisão.");
      return;
    }
    const exercisesPayload: SplitExerciseInput[] = [];
    for (const draft of drafts) {
      const sets = draft.sets
        .map((set) => ({
          setType: set.setType,
          variation: set.variation,
          targetRepsMin: parseIntOrNull(set.targetRepsMin) ?? 0,
          targetRepsMax: parseIntOrNull(set.targetRepsMax),
          suggestedWeightKg: parseFloatOrNull(set.suggestedWeightKg),
          restSeconds: parseIntOrNull(set.restSeconds),
        }))
        .filter((set) => set.targetRepsMin > 0);
      if (sets.length === 0) {
        setError(`"${draft.name}" precisa de ao menos uma série com repetições alvo.`);
        return;
      }
      exercisesPayload.push({
        exerciseId: draft.exerciseId,
        restSeconds: parseIntOrNull(draft.restSeconds),
        plannedSets: sets,
      });
    }

    setSaving(true);
    setError(null);
    try {
      let splitId = id;
      if (splitId) {
        await updateSplit(splitId, { name: name.trim(), weekdays });
      } else {
        const created = await createSplit({ name: name.trim(), weekdays });
        splitId = created.id;
      }
      await replaceSplitExercises(splitId, exercisesPayload);
      navigate("/treino/divisoes");
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a divisão."));
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title={id ? "Editar divisão" : "Nova divisão"} backTo="/treino/divisoes" />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && (
        <>
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

          <div className={styles.exercises}>
            {drafts.map((draft, exerciseIndex) => (
              <section key={draft.exerciseId} className={styles.exerciseCard}>
                <header className={styles.exerciseHeader}>
                  <div className={styles.exerciseThumb}>
                    {draft.imageUrl ? <img src={draft.imageUrl} alt="" /> : <DumbbellIcon className={styles.exerciseThumbIcon} />}
                  </div>
                  <div className={styles.exerciseTitles}>
                    <span className={styles.exerciseName}>{draft.name}</span>
                    <span className={styles.exerciseMeta}>{draft.muscleGroupLabel}</span>
                  </div>
                  <div className={styles.exerciseActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => moveUp(exerciseIndex)}
                      disabled={exerciseIndex === 0}
                      aria-label="Mover para cima"
                    >
                      <ArrowUpIcon className={styles.iconButtonIcon} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.removeButton}`}
                      onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== exerciseIndex))}
                      aria-label="Remover exercício"
                    >
                      <CloseIcon className={styles.iconButtonIcon} />
                    </button>
                  </div>
                </header>

                <div className={styles.setsHeader}>
                  <span>Série</span>
                  <span>Reps</span>
                  <span>Peso</span>
                  <span>Desc.</span>
                  <span />
                </div>

                {draft.sets.map((set, setIndex) => (
                  <div key={setIndex} className={styles.setRow}>
                    <div className={styles.setTypeCol}>
                      <select
                        value={set.setType}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, { setType: e.target.value as SetType })}
                        aria-label="Tipo de série"
                      >
                        <option value="working">Valendo</option>
                        <option value="warmup">Aquec.</option>
                      </select>
                      <select
                        value={set.variation}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, { variation: e.target.value as SetVariation })}
                        aria-label="Variação"
                      >
                        {(Object.keys(VARIATION_LABELS) as SetVariation[]).map((variation) => (
                          <option key={variation} value={variation}>{VARIATION_LABELS[variation]}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.repsCol}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={set.targetRepsMin}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, { targetRepsMin: e.target.value })}
                        aria-label="Repetições mínimas"
                      />
                      <span className={styles.repsSep}>–</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="máx"
                        value={set.targetRepsMax}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, { targetRepsMax: e.target.value })}
                        aria-label="Repetições máximas"
                      />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="kg"
                      value={set.suggestedWeightKg}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, { suggestedWeightKg: e.target.value })}
                      aria-label="Peso sugerido"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="s"
                      value={set.restSeconds}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, { restSeconds: e.target.value })}
                      aria-label="Descanso em segundos"
                    />
                    <button
                      type="button"
                      className={styles.removeSetButton}
                      onClick={() =>
                        updateDraft(exerciseIndex, { sets: draft.sets.filter((_, j) => j !== setIndex) })
                      }
                      disabled={draft.sets.length === 1}
                      aria-label="Remover série"
                    >
                      <CloseIcon className={styles.removeSetIcon} />
                    </button>
                  </div>
                ))}

                <div className={styles.exerciseFooter}>
                  <button
                    type="button"
                    className={styles.addSetButton}
                    onClick={() =>
                      updateDraft(exerciseIndex, {
                        sets: [...draft.sets, { ...(draft.sets[draft.sets.length - 1] ?? DEFAULT_SET) }],
                      })
                    }
                  >
                    + série
                  </button>
                  <label className={styles.restField}>
                    <span>Descanso padrão (s)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="settings"
                      value={draft.restSeconds}
                      onChange={(e) => updateDraft(exerciseIndex, { restSeconds: e.target.value })}
                    />
                  </label>
                </div>
              </section>
            ))}
          </div>

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
                <button type="button" className={styles.iconButton} onClick={() => setPickerOpen(false)} aria-label="Fechar">
                  <CloseIcon className={styles.iconButtonIcon} />
                </button>
              </div>
              <div className={styles.pickerList}>
                {pickerResults.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => {
                      setDrafts((prev) => [
                        ...prev,
                        {
                          exerciseId: exercise.id,
                          name: exercise.name,
                          muscleGroupLabel: MUSCLE_GROUP_LABELS[exercise.muscleGroup],
                          imageUrl: exercise.imageUrl,
                          restSeconds: "",
                          sets: [
                            { ...DEFAULT_SET },
                            { ...DEFAULT_SET },
                            { ...DEFAULT_SET },
                          ],
                        },
                      ]);
                      setPickerOpen(false);
                      setPickerQuery("");
                    }}
                  >
                    <span className={styles.pickerItemName}>{exercise.name}</span>
                    <span className={styles.pickerItemMeta}>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</span>
                  </button>
                ))}
                {pickerResults.length === 0 && (
                  <p className={styles.pickerEmpty}>
                    Nada encontrado.{" "}
                    <button type="button" className={styles.pickerLink} onClick={() => navigate("/treino/exercicios/buscar")}>
                      Buscar na base ExerciseDB
                    </button>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button type="button" className={styles.addExerciseButton} onClick={() => setPickerOpen(true)}>
              <PlusIcon className={styles.addExerciseIcon} />
              Adicionar exercício
            </button>
          )}

          <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar divisão"}
          </button>
        </>
      )}
    </div>
  );
}
