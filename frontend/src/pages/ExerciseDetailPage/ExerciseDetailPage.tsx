import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { MetricLineChart } from "../../components/MetricLineChart/MetricLineChart";
import { PeriodFilter } from "../../components/PeriodFilter/PeriodFilter";
import { TrashIcon } from "../../components/Icon/icons";
import {
  deleteExercise,
  fetchExercise,
  fetchExerciseHistory,
  fetchLastPerformance,
  updateExercise,
  uploadExerciseImage,
} from "../../services/exerciseService";
import { filterByPeriod, type Period } from "../../utils/chartUtils";
import { MUSCLE_GROUP_LABELS, formatDate, formatKg, formatNumber } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Exercise, ExerciseHistoryPoint, LastPerformance } from "../../types/exercise";
import styles from "./ExerciseDetailPage.module.css";

type HistoryMetric = "maxWeightKg" | "totalVolumeKg" | "estOneRepMax";

const HISTORY_METRICS: { key: HistoryMetric; label: string; unit: string }[] = [
  { key: "maxWeightKg", label: "Carga máx.", unit: "kg" },
  { key: "totalVolumeKg", label: "Volume", unit: "kg" },
  { key: "estOneRepMax", label: "1RM est.", unit: "kg" },
];

export function ExerciseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [lastPerformance, setLastPerformance] = useState<LastPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<HistoryMetric>("maxWeightKg");
  const [period, setPeriod] = useState<Period>("all");
  const [machineSetting, setMachineSetting] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.all([fetchExercise(id), fetchExerciseHistory(id), fetchLastPerformance(id)])
      .then(([exerciseData, historyData, performanceData]) => {
        if (!active) return;
        setExercise(exerciseData);
        setHistory(historyData);
        setLastPerformance(performanceData);
        setMachineSetting(exerciseData.machineSetting ?? "");
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
  }, [id]);

  const selectedMetric = HISTORY_METRICS.find((option) => option.key === metric)!;
  const chartData = filterByPeriod(
    history
      .filter((point) => point[metric] != null)
      .map((point) => ({ date: point.date, value: point[metric] as number })),
    period
  );

  const saveMachineSetting = async () => {
    if (!exercise) return;
    const value = machineSetting.trim() || null;
    if (value === exercise.machineSetting) return;
    const updated = await updateExercise(exercise.id, { machineSetting: value });
    setExercise(updated);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !exercise) return;
    try {
      const updated = await uploadExerciseImage(exercise.id, file);
      setExercise(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível enviar a imagem."));
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={exercise?.name ?? "Exercício"}
        subtitle={exercise ? `${MUSCLE_GROUP_LABELS[exercise.muscleGroup]}${exercise.equipment ? ` · ${exercise.equipment}` : ""}` : undefined}
        backTo="/treino/exercicios"
        actions={
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => setDeleting(true)}
            aria-label="Excluir exercício"
          >
            <TrashIcon className={styles.deleteIcon} />
          </button>
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {exercise && (
        <>
          <label className={styles.imageCard}>
            {exercise.imageUrl ? (
              <img src={exercise.imageUrl} alt={exercise.name} />
            ) : (
              <span className={styles.imagePlaceholder}>Toque para adicionar imagem</span>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)} />
          </label>

          <div className={styles.settingRow}>
            <label className={styles.settingField}>
              <span className={styles.settingLabel}>Ajuste do aparelho</span>
              <input
                type="text"
                value={machineSetting}
                onChange={(e) => setMachineSetting(e.target.value)}
                onBlur={saveMachineSetting}
                placeholder="Ex: banco no furo 4, encosto 45°"
              />
            </label>
          </div>

          {lastPerformance && (
            <section className={styles.lastCard}>
              <h2 className={styles.sectionTitle}>Último treino · {formatDate(lastPerformance.date)}</h2>
              <div className={styles.lastSets}>
                {lastPerformance.sets.map((set, index) => (
                  <span key={index} className={styles.lastSet}>
                    {set.setType === "warmup" ? "Aq " : ""}
                    {set.reps ?? "—"}× {set.weightKg != null ? formatKg(set.weightKg) : "—"}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.metricChips}>
                {HISTORY_METRICS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.chip} ${metric === option.key ? styles.chipActive : ""}`}
                    onClick={() => setMetric(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>
            <MetricLineChart data={chartData} unit={selectedMetric.unit} />
          </section>

          {history.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Sessões</h2>
              <div className={styles.historyList}>
                {[...history].reverse().map((point) => (
                  <div key={point.sessionId} className={styles.historyRow}>
                    <span className={styles.historyDate}>{formatDate(point.date)}</span>
                    <span>{point.workingSets} séries</span>
                    <span>{formatKg(point.maxWeightKg)} máx</span>
                    <span>{formatNumber(point.totalVolumeKg)} kg vol</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {exercise.notes && (
            <section>
              <h2 className={styles.sectionTitle}>Instruções</h2>
              <p className={styles.notes}>{exercise.notes}</p>
            </section>
          )}
        </>
      )}

      {deleting && exercise && (
        <ConfirmDialog
          title="Excluir exercício"
          message="O exercício sai do seu catálogo. O histórico de treinos já feitos é preservado."
          confirmLabel="Excluir"
          danger
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await deleteExercise(exercise.id);
            navigate("/treino/exercicios");
          }}
        />
      )}
    </div>
  );
}
