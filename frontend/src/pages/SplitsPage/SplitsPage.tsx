import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { ListIcon, PlusIcon, TrashIcon } from "../../components/Icon/icons";
import { useSplits } from "../../hooks/useSplits";
import { WEEKDAY_LABELS } from "../../utils/format";
import styles from "./SplitsPage.module.css";

export function SplitsPage() {
  const navigate = useNavigate();
  const { splits, loading, error, remove } = useSplits();
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Divisões de treino"
        backTo="/treino"
        actions={
          <button type="button" className={styles.primaryButton} onClick={() => navigate("/treino/divisoes/nova")}>
            <PlusIcon className={styles.primaryButtonIcon} />
            Divisão
          </button>
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && splits.length === 0 && !error && (
        <EmptyState
          icon={<ListIcon />}
          title="Nenhuma divisão criada"
          description="Monte suas divisões (ex: A - Peito/Tríceps, B - Costas/Bíceps) e vincule aos dias da semana."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/treino/divisoes/nova")}>
              Criar divisão
            </button>
          }
        />
      )}

      <div className={styles.list}>
        {splits.map((split) => (
          <article key={split.id} className={styles.card}>
            <button
              type="button"
              className={styles.cardBody}
              onClick={() => navigate(`/treino/divisoes/${split.id}`)}
            >
              <span className={styles.cardName}>{split.name}</span>
              <span className={styles.cardMeta}>
                {split.exercises.length} exercício{split.exercises.length === 1 ? "" : "s"}
              </span>
              <div className={styles.weekdays}>
                {WEEKDAY_LABELS.map((label, day) => (
                  <span
                    key={day}
                    className={`${styles.weekday} ${split.weekdays.includes(day) ? styles.weekdayActive : ""}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setDeleting(split.id)}
              aria-label="Excluir divisão"
            >
              <TrashIcon className={styles.deleteIcon} />
            </button>
          </article>
        ))}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Excluir divisão"
          message="A divisão e seu plano de exercícios serão removidos. Treinos já realizados são preservados."
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
