import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { DumbbellIcon, PencilIcon, TrashIcon } from "../../components/Icon/icons";
import { fetchSplit, replaceSplitExercises, updateExercisePlan } from "../../services/splitService";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise, SplitExerciseInput } from "../../types/split";
import styles from "./WorkoutExerciseDetailPage.module.css";

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

function parsePositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function WorkoutExerciseDetailPage() {
  const { id, sxId } = useParams();
  const navigate = useNavigate();

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const [series, setSeries] = useState("");
  const [repsMin, setRepsMin] = useState("");
  const [repsMax, setRepsMax] = useState("");
  const [weight, setWeight] = useState("");

  const exercise = split?.exercises.find((e) => e.id === sxId) ?? null;
  const backTo = `/treino/divisoes/${id}`;

  const hydrate = (ex: SplitExercise) => {
    setSeries(String(ex.plannedSets.length || 3));
    setRepsMin(String(ex.plannedSets[0]?.targetRepsMin ?? 12));
    setRepsMax(ex.plannedSets[0]?.targetRepsMax != null ? String(ex.plannedSets[0].targetRepsMax) : "");
    setWeight(ex.workingWeightKg != null ? String(ex.workingWeightKg).replace(".", ",") : "");
  };

  useEffect(() => {
    if (!id || !sxId) return;
    let active = true;
    fetchSplit(id)
      .then((data) => {
        if (!active) return;
        setSplit(data);
        const ex = data.exercises.find((e) => e.id === sxId);
        if (ex) hydrate(ex);
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

  const save = async () => {
    if (!id || !sxId || !exercise) return;
    const seriesValue = parsePositiveInt(series);
    const minValue = parsePositiveInt(repsMin);
    if (seriesValue === null || minValue === null) return;
    const maxValue = repsMax.trim() === "" ? null : parsePositiveInt(repsMax);
    const weightValue = weight.trim() === "" ? null : Number(weight.replace(",", "."));
    if (weightValue !== null && Number.isNaN(weightValue)) return;

    try {
      const updated = await updateExercisePlan(id, sxId, {
        series: seriesValue,
        targetRepsMin: minValue,
        targetRepsMax: maxValue,
        workingWeightKg: weightValue,
      });
      setSplit(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
    }
  };

  const remove = async () => {
    if (!id || !sxId || !split) return;
    try {
      await replaceSplitExercises(id, split.exercises.filter((e) => e.id !== sxId).map(toInput));
      navigate(backTo);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível remover o exercício."));
      setRemoving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={exercise?.name ?? "Exercício"}
        subtitle={exercise ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : undefined}
        backTo={backTo}
        actions={
          exercise && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setRemoving(true)}
              aria-label="Remover exercício"
            >
              <TrashIcon className={styles.deleteIcon} />
            </button>
          )
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}
      {!loading && !exercise && <p className={styles.loading}>Exercício não encontrado.</p>}

      {exercise && (
        <>
          <div className={styles.imageCard}>
            {exercise.imageUrl ? (
              <img src={exercise.imageUrl} alt={exercise.name} />
            ) : (
              <span className={styles.imagePlaceholder}>
                <DumbbellIcon className={styles.placeholderIcon} />
              </span>
            )}
          </div>

          <div className={styles.editGrid}>
            <div className={styles.editField}>
              <span className={styles.editLabel}>Séries e Repetições</span>
              <div className={styles.editInputs}>
                <input
                  className={styles.numInput}
                  type="text"
                  inputMode="numeric"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  onBlur={save}
                  aria-label="Séries"
                />
                <span className={styles.sep}>x</span>
                <input
                  className={styles.numInput}
                  type="text"
                  inputMode="numeric"
                  value={repsMin}
                  onChange={(e) => setRepsMin(e.target.value)}
                  onBlur={save}
                  aria-label="Repetições mínimas"
                />
                <span className={styles.sep}>a</span>
                <input
                  className={styles.numInput}
                  type="text"
                  inputMode="numeric"
                  placeholder="máx"
                  value={repsMax}
                  onChange={(e) => setRepsMax(e.target.value)}
                  onBlur={save}
                  aria-label="Repetições máximas"
                />
                <PencilIcon className={styles.pencil} />
              </div>
            </div>

            <div className={styles.editField}>
              <span className={styles.editLabel}>Carga (kg)</span>
              <div className={styles.editInputs}>
                <input
                  className={styles.weightInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onBlur={save}
                  aria-label="Carga em kg"
                />
                <PencilIcon className={styles.pencil} />
              </div>
            </div>
          </div>
        </>
      )}

      {removing && (
        <ConfirmDialog
          title="Remover exercício"
          message="O exercício sai deste treino. Treinos já realizados são preservados."
          confirmLabel="Remover"
          danger
          onCancel={() => setRemoving(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
