import { useEffect, useState, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { YouTubeEmbed } from "../../components/YouTubeEmbed/YouTubeEmbed";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { updateExercisePlan, fetchSplit } from "../../services/splitService";
import { updateExercise } from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS, formatClock, formatKg, imageFocalStyle, repsTarget } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import { numberToMask, parseMaskedNumber } from "../../utils/numberMask";
import type { Split } from "../../types/split";
import styles from "./WorkoutExerciseDetailPage.module.css";

const DEFAULT_REST_SECONDS = 60;

type EditField = "series" | "reps" | "carga" | "adicional" | "descanso";

function parsePositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInt(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function WorkoutExerciseDetailPage() {
  const { id, sxId } = useParams();
  const { state, refreshSession } = useWorkoutSession();
  const sessionActive = state.session !== null && state.session.status === "in_progress";

  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [series, setSeries] = useState("");
  const [repsMin, setRepsMin] = useState("");
  const [repsMax, setRepsMax] = useState("");
  const [weight, setWeight] = useState("");
  const [additional, setAdditional] = useState("");
  const [rest, setRest] = useState("");

  const backTo = `/treino/divisoes/${id}`;

  useEffect(() => {
    if (!id || !sxId) return;
    let active = true;
    fetchSplit(id)
      .then((data) => {
        if (!active) return;
        setSplit(data);
        const ex = data.exercises.find((e) => e.id === sxId);
        if (ex) {
          setSeries(String(ex.plannedSets.length || 3));
          setRepsMin(String(ex.plannedSets[0]?.targetRepsMin ?? 12));
          setRepsMax(ex.plannedSets[0]?.targetRepsMax != null ? String(ex.plannedSets[0].targetRepsMax) : "");
          setWeight(numberToMask(ex.workingWeightKg));
          setAdditional(numberToMask(ex.additionalWeightKg));
          setRest(String(ex.restSeconds ?? DEFAULT_REST_SECONDS));
        }
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

  const saveEdit = async () => {
    setEditing(null);
    if (!id || !sxId || !planned) return;
    const seriesValue = parsePositiveInt(series);
    const minValue = parsePositiveInt(repsMin);
    const maxValue = repsMax.trim() === "" ? null : parsePositiveInt(repsMax);
    // Antes um valor inválido era descartado em silêncio: a tela voltava ao valor antigo
    // sem dizer nada, e o campo continuava com o texto errado.
    if (seriesValue === null || minValue === null || (repsMax.trim() !== "" && maxValue === null)) {
      setError("Séries e repetições precisam ser números inteiros maiores que zero.");
      setSeries(String(planned.plannedSets.length || 3));
      setRepsMin(String(planned.plannedSets[0]?.targetRepsMin ?? 12));
      setRepsMax(planned.plannedSets[0]?.targetRepsMax != null ? String(planned.plannedSets[0].targetRepsMax) : "");
      return;
    }
    if (maxValue !== null && maxValue < minValue) {
      setError("O máximo de repetições não pode ser menor que o mínimo.");
      return;
    }
    const weightValue = parseMaskedNumber(weight);
    const additionalValue = parseMaskedNumber(additional);
    const restValue = parseNonNegativeInt(rest) ?? DEFAULT_REST_SECONDS;
    setError(null);
    try {
      if (
        weightValue !== (planned.workingWeightKg ?? null) ||
        additionalValue !== (planned.additionalWeightKg ?? null)
      ) {
        await updateExercise(planned.exerciseId, {
          workingWeightKg: weightValue,
          additionalWeightKg: additionalValue,
        });
      }
      const updated = await updateExercisePlan(id, sxId, {
        series: seriesValue,
        targetRepsMin: minValue,
        targetRepsMax: maxValue,
        restSeconds: restValue,
      });
      setSplit(updated);
      // O backend já ajustou as séries pendentes do treino em andamento; recarregar a
      // sessão faz a mudança aparecer no treino atual, sem esperar o próximo.
      if (sessionActive) await refreshSession();
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
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
                  value={series}
                  autoFocus
                  onChange={(e) => setSeries(e.target.value)}
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
                    value={repsMin}
                    autoFocus
                    onChange={(e) => setRepsMin(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    aria-label="Reps mínimas"
                  />
                  <span className={styles.repsDash}>-</span>
                  <input
                    className={styles.repsInput}
                    type="text"
                    inputMode="numeric"
                    placeholder="máx"
                    value={repsMax}
                    onChange={(e) => setRepsMax(e.target.value)}
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
                  value={weight}
                  autoFocus
                  onChange={setWeight}
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
                  value={additional}
                  autoFocus
                  onChange={setAdditional}
                  onBlur={saveEdit}
                  onKeyDown={onEditKeyDown}
                  aria-label="Peso adicional em kg"
                />
              ) : (
                <span className={styles.statValue}>{formatKg(planned.additionalWeightKg)}</span>
              )}
              <span className={styles.statLabel}>adicional</span>
            </div>

            <div className={`${styles.statCard} ${styles.statCardEditable}`} onClick={() => startEdit("descanso")}>
              {editing === "descanso" ? (
                <input
                  className={styles.statInput}
                  type="text"
                  inputMode="numeric"
                  value={rest}
                  autoFocus
                  onChange={(e) => setRest(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={onEditKeyDown}
                  aria-label="Descanso em segundos"
                />
              ) : (
                <span className={styles.statValue}>
                  {formatClock((planned.restSeconds ?? DEFAULT_REST_SECONDS) * 1000)}
                </span>
              )}
              <span className={styles.statLabel}>descanso</span>
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
