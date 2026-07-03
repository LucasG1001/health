import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { PencilIcon, RulerIcon, TrashIcon } from "../../components/Icon/icons";
import { useMeasurements } from "../../hooks/useMeasurements";
import { formatCm, formatDate, formatKg, formatNumber, formatPct } from "../../utils/format";
import styles from "./MeasurementHistoryPage.module.css";

export function MeasurementHistoryPage() {
  const navigate = useNavigate();
  const { measurements, loading, error, remove } = useMeasurements();
  const [deleting, setDeleting] = useState<string | null>(null);

  const ordered = [...measurements].reverse();

  return (
    <div className={styles.page}>
      <PageHeader title="Histórico de medições" backTo="/medidas" />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && ordered.length === 0 && !error && (
        <EmptyState icon={<RulerIcon />} title="Nenhuma medição registrada" />
      )}

      <div className={styles.list}>
        {ordered.map((measurement) => (
          <article key={measurement.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.date}>{formatDate(measurement.measuredOn)}</span>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => navigate(`/medidas/m/${measurement.id}`)}
                  aria-label="Editar"
                >
                  <PencilIcon className={styles.actionIcon} />
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.dangerButton}`}
                  onClick={() => setDeleting(measurement.id)}
                  aria-label="Excluir"
                >
                  <TrashIcon className={styles.actionIcon} />
                </button>
              </div>
            </div>
            <div className={styles.values}>
              <span className={styles.mainValue}>{formatKg(measurement.weightKg)}</span>
              {measurement.bmi != null && <span>IMC {formatNumber(measurement.bmi, 1)}</span>}
              {measurement.bodyFatPct != null && <span>{formatPct(measurement.bodyFatPct)} gordura</span>}
            </div>
            <div className={styles.circumferences}>
              {measurement.waistCm != null && <span>Cintura {formatCm(measurement.waistCm)}</span>}
              {measurement.hipCm != null && <span>Quadril {formatCm(measurement.hipCm)}</span>}
              {measurement.armCm != null && <span>Braço {formatCm(measurement.armCm)}</span>}
              {measurement.thighCm != null && <span>Coxa {formatCm(measurement.thighCm)}</span>}
              {measurement.chestCm != null && <span>Peito {formatCm(measurement.chestCm)}</span>}
            </div>
            {measurement.notes && <p className={styles.notes}>{measurement.notes}</p>}
          </article>
        ))}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Excluir medição"
          message="Esta medição será removida permanentemente."
          confirmLabel="Excluir"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove(deleting);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
