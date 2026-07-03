import { useMemo, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { StatCard } from "../../components/StatCard/StatCard";
import { PeriodFilter } from "../../components/PeriodFilter/PeriodFilter";
import { MetricLineChart } from "../../components/MetricLineChart/MetricLineChart";
import { GoalProgressBar } from "../../components/GoalProgressBar/GoalProgressBar";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import {
  CameraIcon,
  GearIcon,
  ListIcon,
  PlusIcon,
  RulerIcon,
  TargetIcon,
} from "../../components/Icon/icons";
import { useMeasurements } from "../../hooks/useMeasurements";
import { useGoals } from "../../hooks/useGoals";
import { useProfile } from "../../hooks/useProfile";
import { useSettings } from "../../hooks/useSettings";
import { filterByPeriod, type Period } from "../../utils/chartUtils";
import { diffDays, todayIso } from "../../utils/dateUtils";
import {
  FREQUENCY_DAYS,
  bmiLabel,
  formatKcal,
  formatKg,
  formatNumber,
  formatPct,
} from "../../utils/format";
import styles from "./MeasuresPage.module.css";

type Metric = "weightKg" | "bmi" | "bodyFatPct" | "waistCm" | "hipCm" | "armCm" | "thighCm" | "chestCm";

const METRIC_OPTIONS: { key: Metric; label: string; unit: string }[] = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "bmi", label: "IMC", unit: "" },
  { key: "bodyFatPct", label: "% Gordura", unit: "%" },
  { key: "waistCm", label: "Cintura", unit: "cm" },
  { key: "hipCm", label: "Quadril", unit: "cm" },
  { key: "armCm", label: "Braço", unit: "cm" },
  { key: "thighCm", label: "Coxa", unit: "cm" },
  { key: "chestCm", label: "Peito", unit: "cm" },
];

export function MeasuresPage() {
  const navigate = useNavigate();
  const { measurements, latest, previous, loading, error, reload, remove } = useMeasurements();
  const { activeGoal, reload: reloadGoals } = useGoals();
  const { profile } = useProfile();
  const { settings } = useSettings();
  const [metric, setMetric] = useState<Metric>("weightKg");
  const [period, setPeriod] = useState<Period>("month");

  const selectedMetric = METRIC_OPTIONS.find((option) => option.key === metric)!;

  const chartData = useMemo(() => {
    const points = measurements
      .filter((m) => m[metric] != null)
      .map((m) => ({ date: m.measuredOn, value: m[metric] as number }));
    return filterByPeriod(points, period);
  }, [measurements, metric, period]);

  const goalValue =
    metric === "weightKg"
      ? activeGoal?.targetWeightKg ?? null
      : metric === "bodyFatPct"
        ? activeGoal?.targetBodyFatPct ?? null
        : null;

  const weightDelta =
    latest?.weightKg != null && previous?.weightKg != null
      ? latest.weightKg - previous.weightKg
      : null;

  const overdueDays = useMemo(() => {
    if (!settings || !latest) return null;
    const frequencyDays = FREQUENCY_DAYS[settings.weighInFrequency];
    if (frequencyDays === null) return null;
    const days = diffDays(latest.measuredOn, todayIso());
    return days > frequencyDays ? days : null;
  }, [settings, latest]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Medidas"
        subtitle={profile?.age != null ? `${profile.age} anos` : undefined}
        actions={
          <>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => navigate("/configuracoes")}
              aria-label="Configurações"
            >
              <GearIcon className={styles.iconButtonIcon} />
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => navigate("/medidas/nova")}
            >
              <PlusIcon className={styles.primaryButtonIcon} />
              Medição
            </button>
          </>
        }
      />

      {overdueDays !== null && (
        <button type="button" className={styles.banner} onClick={() => navigate("/medidas/nova")}>
          Pesagem atrasada há {overdueDays} dias — toque para registrar.
        </button>
      )}

      {error && (
        <div className={styles.error}>
          {error}{" "}
          <button type="button" onClick={reload} className={styles.retry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && measurements.length === 0 && !error ? (
        <EmptyState
          icon={<RulerIcon />}
          title="Nenhuma medição ainda"
          description="Registre seu peso e medidas para acompanhar sua evolução."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/medidas/nova")}>
              Registrar primeira medição
            </button>
          }
        />
      ) : (
        <>
          <div className={styles.statsGrid}>
            <StatCard
              label="Peso"
              value={formatKg(latest?.weightKg)}
              delta={
                weightDelta !== null
                  ? {
                      value: `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta, 1)} kg`,
                      positive: weightDelta <= 0,
                    }
                  : null
              }
            />
            <StatCard
              label="IMC"
              value={formatNumber(latest?.bmi, 1)}
              hint={bmiLabel(latest?.bmi)}
            />
            <StatCard label="% Gordura" value={formatPct(latest?.bodyFatPct)} />
            <StatCard
              label="TMB / Gasto"
              value={formatKcal(latest?.bmr ?? profile?.bmr)}
              hint={latest?.tdee ?? profile?.tdee ? `${formatKcal(latest?.tdee ?? profile?.tdee)} /dia` : undefined}
            />
          </div>

          {activeGoal && <GoalProgressBar goal={activeGoal} />}

          <section className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.metricChips}>
                {METRIC_OPTIONS.map((option) => (
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
            <MetricLineChart data={chartData} unit={selectedMetric.unit} goalValue={goalValue} />
          </section>
        </>
      )}

      <nav className={styles.quickNav}>
        <Link to="/medidas/historico" className={styles.quickNavItem}>
          <ListIcon className={styles.quickNavIcon} />
          Histórico
        </Link>
        <Link to="/medidas/fotos" className={styles.quickNavItem}>
          <CameraIcon className={styles.quickNavIcon} />
          Fotos
        </Link>
        <Link to="/medidas/metas" className={styles.quickNavItem}>
          <TargetIcon className={styles.quickNavIcon} />
          Metas
        </Link>
        <Link to="/medidas/perfil" className={styles.quickNavItem}>
          <GearIcon className={styles.quickNavIcon} />
          Perfil
        </Link>
      </nav>

      <Outlet context={{ reload: () => { reload(); reloadGoals(); }, measurements, remove }} />
    </div>
  );
}
