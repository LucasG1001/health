import { useEffect, useState, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { YouTubeEmbed } from "../../components/YouTubeEmbed/YouTubeEmbed";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { updateExercisePlan, fetchSplit } from "../../services/splitService";
import { updateExercise } from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS, formatKg, imageFocalStyle, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import { loadChanged, parsePlanForm, planFormOf, type PlanFormRaw } from "../../utils/planForm";
import type { Split } from "../../types/split";
import styles from "./WorkoutExerciseDetailPage.module.css";

type EditField = "series" | "reps" | "carga" | "adicional";

export function WorkoutExerciseDetailPage() {
  const { id, sxId } = useParams();

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [form, setForm] = useState<PlanFormRaw | null>(null);

  const backTo = `/treino/divisoes/${id}`;

  useEffect(() => {
    if (!id || !sxId) return;
    let active = true;
    fetchSplit(id)
      .then((data) => {
        if (!active) return;
        setSplit(data);
        const ex = data.exercises.find((e) => e.id === sxId);
        if (ex) setForm(planFormOf(ex));
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

  const startEdit = (field: EditField) => setEditing(field);

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const patch = (field: keyof PlanFormRaw, value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const saveEdit = async () => {
    setEditing(null);
    if (!id || !sxId || !planned || !form) return;
    const parsed = parsePlanForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      setForm(planFormOf(planned));
      return;
    }
    const values = parsed.values;
    setError(null);
    try {
      if (loadChanged(planned, values)) {
        await updateExercise(planned.exerciseId, {
          workingWeightKg: values.workingWeightKg,
          additionalWeightKg: values.additionalWeightKg,
        });
      }
      const updated = await updateExercisePlan(id, sxId, {
        series: values.series,
        targetRepsMin: values.targetRepsMin,
        targetRepsMax: values.targetRepsMax,
      });
      setSplit(updated);
      const fresh = updated.exercises.find((e) => e.id === sxId);
      if (fresh) setForm(planFormOf(fresh));
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
      setForm(planFormOf(planned));
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={planned?.name ?? "Exercício"}
        subtitle={planned ? MUSCLE_GROUP_LABELS[planned.muscleGroup] : undefined}
        backTo={backTo}
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}
      {!loading && !planned && <p className={styles.loading}>Exercício não encontrado.</p>}

      {planned && (
        <>
          {planned.videoUrl ? (
            <YouTubeEmbed url={planned.videoUrl} title={planned.name} />
          ) : (
            <div className={styles.hero}>
              {planned.imageUrl && (
                <img className={styles.heroImage} src={planned.imageUrl} alt="" style={imageFocalStyle(planned)} />
              )}
            </div>
          )}

          <div className={styles.stats}>
            <div className={`${styles.statCard} ${styles.statCardEditable}`} onClick={() => startEdit("series")}>
              {editing === "series" ? (
                <input
                  className={styles.statInput}
                  type="text"
                  inputMode="numeric"
                  value={form?.series ?? ""}
                  autoFocus
                  onChange={(e) => patch("series", e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={onEditKeyDown}
                  aria-label="Séries"
                />
              ) : (
                <span className={styles.statValue}>{planned.plannedSets.length}</span>
              )}
              <span className={styles.statLabel}>séries</span>
            </div>

            <div className={`${styles.statCard} ${styles.statCardEditable}`} onClick={() => startEdit("reps")}>
              {editing === "reps" ? (
                <div
                  className={styles.repsInputs}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) saveEdit();
                  }}
                >
                  <input
                    className={styles.repsInput}
                    type="text"
                    inputMode="numeric"
                    value={form?.repsMin ?? ""}
                    autoFocus
                    onChange={(e) => patch("repsMin", e.target.value)}
                    onKeyDown={onEditKeyDown}
                    aria-label="Reps mínimas"
                  />
                  <span className={styles.repsDash}>-</span>
                  <input
                    className={styles.repsInput}
                    type="text"
                    inputMode="numeric"
                    placeholder="máx"
                    value={form?.repsMax ?? ""}
                    onChange={(e) => patch("repsMax", e.target.value)}
                    onKeyDown={onEditKeyDown}
                    aria-label="Reps máximas"
                  />
                </div>
              ) : (
                <span className={styles.statValue}>
                  {repsTarget(
                    planned.plannedSets[0]?.targetRepsMin ?? null,
                    planned.plannedSets[0]?.targetRepsMax ?? null
                  )}
                </span>
              )}
              <span className={styles.statLabel}>reps</span>
            </div>

            <div className={`${styles.statCard} ${styles.statCardEditable}`} onClick={() => startEdit("carga")}>
              {editing === "carga" ? (
                <NumericInput
                  className={`${styles.statInput} ${styles.statInputAccent}`}
                  placeholder="—"
                  value={form?.weight ?? ""}
                  autoFocus
                  onChange={(value) => patch("weight", value)}
                  onBlur={saveEdit}
                  onKeyDown={onEditKeyDown}
                  aria-label="Carga em kg"
                />
              ) : (
                <span className={`${styles.statValue} ${styles.statValueAccent}`}>
                  {formatKg(planned.workingWeightKg)}
                </span>
              )}
              <span className={styles.statLabel}>carga</span>
            </div>

            <div className={`${styles.statCard} ${styles.statCardEditable}`} onClick={() => startEdit("adicional")}>
              {editing === "adicional" ? (
                <NumericInput
                  className={styles.statInput}
                  placeholder="—"
                  value={form?.additional ?? ""}
                  autoFocus
                  onChange={(value) => patch("additional", value)}
                  onBlur={saveEdit}
                  onKeyDown={onEditKeyDown}
                  aria-label="Peso adicional em kg"
                />
              ) : (
                <span className={styles.statValue}>{formatKg(planned.additionalWeightKg)}</span>
              )}
              <span className={styles.statLabel}>adicional</span>
            </div>

          </div>

          {planned.instructions && (
            <section className={styles.section}>
              <span className={styles.sectionLabel}>Como executar</span>
              <p className={styles.instructions}>{planned.instructions}</p>
            </section>
          )}

          {(planned.equipment || planned.machineSetting) && (
            <section className={styles.section}>
              <span className={styles.sectionLabel}>Informações</span>
              <div className={styles.infoList}>
                {planned.equipment && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Equipamento</span>
                    <span className={styles.infoValue}>{planned.equipment}</span>
                  </div>
                )}
                {planned.machineSetting && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Ajuste do aparelho</span>
                    <span className={styles.infoValue}>{planned.machineSetting}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
