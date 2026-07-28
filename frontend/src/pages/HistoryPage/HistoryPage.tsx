import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { MetricLineChart } from "../../components/MetricLineChart/MetricLineChart";
import { ChartIcon } from "../../components/Icon/icons";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { fetchVolumeStats } from "../../services/statsService";
import { apiErrorMessage } from "../../utils/apiError";
import { formatDateTime, formatDuration, formatNumber } from "../../utils/format";
import type { VolumePoint } from "../../types/stats";
import styles from "./HistoryPage.module.css";

type GroupBy = "week" | "month";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function HistoryPage() {
  const { sessions, loading, error, reload } = useSessionHistory();
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [volumeError, setVolumeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchVolumeStats(groupBy)
      .then((data) => {
        if (!active) return;
        setVolume(data);
        setVolumeError(null);
      })
      .catch((err) => {
        if (active) setVolumeError(apiErrorMessage(err, "Não foi possível carregar o volume por período."));
      });
    return () => {
      active = false;
    };
  }, [groupBy]);

  const chartData = volume.map((point) => ({ date: point.period, value: point.totalVolumeKg }));

  return (
    <div className={styles.page}>
      <PageHeader title="Histórico" subtitle="Treinos concluídos" backTo="/treino" />

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {volumeError && <ErrorBanner message={volumeError} />}

      {volume.length > 0 && (
        <section className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.sectionTitle}>Volume por {groupBy === "week" ? "semana" : "mês"}</h2>
            <SegmentedControl
              label="Agrupar por"
              value={groupBy}
              options={GROUP_OPTIONS}
              onChange={setGroupBy}
            />
          </div>
          <MetricLineChart data={chartData} unit="kg" height={200} />
        </section>
      )}

      {loading ? (
        <Loading />
      ) : error ? null : sessions.length === 0 ? (
        <EmptyState
          icon={<ChartIcon />}
          title="Nenhum treino concluído"
          description="Finalize seu primeiro treino para vê-lo aqui."
        />
      ) : (
        <div className={styles.list}>
          {sessions.map((session) => (
            <Link key={session.id} to={`/treino/historico/${session.id}`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowName}>{session.splitName}</span>
                <span className={styles.rowMeta}>
                  {formatDateTime(session.startedAt)} · {formatDuration(session.durationSeconds)}
                </span>
              </div>
              <div className={styles.rowStats}>
                <span className={styles.rowVolume}>
                  {session.totalVolumeKg != null ? `${formatNumber(session.totalVolumeKg)} kg` : "—"}
                </span>
                <span className={styles.rowSets}>{session.completedSets} séries</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
