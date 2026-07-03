import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { GoalProgressBar } from "../../components/GoalProgressBar/GoalProgressBar";
import { PlusIcon, TargetIcon, TrashIcon } from "../../components/Icon/icons";
import { useGoals } from "../../hooks/useGoals";
import { formatDate, formatKg, formatPct } from "../../utils/format";
import type { Goal } from "../../types/goal";
import styles from "./GoalsPage.module.css";

const STATUS_LABELS: Record<Goal["status"], string> = {
  active: "Ativa",
  achieved: "Alcançada",
  abandoned: "Abandonada",
};

export function GoalsPage() {
  const navigate = useNavigate();
  const { goals, activeGoal, loading, error, reload, setStatus, remove } = useGoals();
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Metas"
        backTo="/medidas"
        actions={
          !activeGoal ? (
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/medidas/metas/nova")}>
              <PlusIcon className={styles.primaryButtonIcon} />
              Meta
            </button>
          ) : undefined
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && goals.length === 0 && !error && (
        <EmptyState
          icon={<TargetIcon />}
          title="Nenhuma meta definida"
          description="Defina um peso alvo e/ou % de gordura alvo com data prevista."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/medidas/metas/nova")}>
              Criar meta
            </button>
          }
        />
      )}

      {activeGoal && (
        <section className={styles.activeSection}>
          <GoalProgressBar goal={activeGoal} />
          <div className={styles.activeActions}>
            <button type="button" className={styles.successButton} onClick={() => setStatus(activeGoal.id, "achieved")}>
              Marcar como alcançada
            </button>
            <button type="button" className={styles.ghostButton} onClick={() => setStatus(activeGoal.id, "abandoned")}>
              Abandonar
            </button>
          </div>
        </section>
      )}

      {goals.filter((goal) => goal.status !== "active").length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Anteriores</h2>
          <div className={styles.list}>
            {goals
              .filter((goal) => goal.status !== "active")
              .map((goal) => (
                <article key={goal.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <span className={`${styles.status} ${goal.status === "achieved" ? styles.achieved : ""}`}>
                      {STATUS_LABELS[goal.status]}
                    </span>
                    <span className={styles.targets}>
                      {goal.targetWeightKg != null && `Peso ${formatKg(goal.targetWeightKg)}`}
                      {goal.targetWeightKg != null && goal.targetBodyFatPct != null && " · "}
                      {goal.targetBodyFatPct != null && `Gordura ${formatPct(goal.targetBodyFatPct)}`}
                    </span>
                    {goal.targetDate && <span className={styles.date}>até {formatDate(goal.targetDate)}</span>}
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setDeleting(goal.id)}
                    aria-label="Excluir meta"
                  >
                    <TrashIcon className={styles.deleteIcon} />
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir meta"
          message="Esta meta será removida permanentemente."
          confirmLabel="Excluir"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove(deleting);
            setDeleting(null);
          }}
        />
      )}

      <Outlet context={{ reload }} />
    </div>
  );
}
