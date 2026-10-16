import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkoutHeader } from "../../components/WorkoutHeader/WorkoutHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { ExerciseThumb } from "../../components/ExerciseThumb/ExerciseThumb";
import { ClockIcon } from "../../components/Icon/icons";
import { useLoadLog } from "../../hooks/useLoadLog";
import { formatKg, formatNumber } from "../../utils/format";
import { todayIso } from "../../utils/dateUtils";
import { describeChange, groupLoadLog, type LoadChange, type LoadLogItem } from "../../utils/loadLog";
import styles from "./WorkoutLogPage.module.css";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ChangeRow({ label, change }: { label: string; change: LoadChange }) {
  const { direction, delta } = describeChange(change);
  const badge =
    direction === "set"
      ? "definiu"
      : direction === "cleared"
        ? "removeu"
        : `${delta! > 0 ? "+" : ""}${formatNumber(delta, 1)} kg`;
  return (
    <div className={styles.change}>
      <span className={styles.changeLabel}>{label}</span>
      <span className={styles.changeValues}>
        {formatKg(change.oldValue)} → <strong>{formatKg(change.newValue)}</strong>
      </span>
      <span className={`${styles.badge} ${styles[direction]}`}>{badge}</span>
    </div>
  );
}

function LogItem({ item, onOpen }: { item: LoadLogItem; onOpen: (() => void) | null }) {
  const content = (
    <>
      <ExerciseThumb exercise={item.thumb} size="sm" />
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{item.exerciseName}</span>
          <span className={styles.itemTime}>{formatTime(item.changedAt)}</span>
        </div>
        {item.working && <ChangeRow label="Carga" change={item.working} />}
        {item.additional && <ChangeRow label="Adicional" change={item.additional} />}
        {item.total && <ChangeRow label="Total" change={item.total} />}
      </div>
    </>
  );
  // Exercício excluído: o log fica, mas não há o que abrir.
  return onOpen ? (
    <button type="button" className={styles.item} onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div className={styles.item}>{content}</div>
  );
}

export function WorkoutLogPage() {
  const navigate = useNavigate();
  const { entries, loading, loadingMore, hasMore, error, reload, loadMore } = useLoadLog();
  // "Hoje" fixado na montagem: ler o relógio no render é impuro (regras do React Compiler).
  const [today] = useState(todayIso);
  const days = useMemo(() => groupLoadLog(entries, today), [entries, today]);

  return (
    <div className={styles.page}>
      <WorkoutHeader />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading ? (
        <Loading />
      ) : days.length === 0 ? (
        error ? null : (
          <EmptyState
            icon={<ClockIcon />}
            title="Nenhuma mudança de carga ainda"
            description="Quando você subir ou baixar a carga ou o peso adicional de um exercício, a mudança aparece aqui."
          />
        )
      ) : (
        <>
          {days.map((day) => (
            <section key={day.day} className={styles.day}>
              <h2 className={styles.dayLabel}>{day.label}</h2>
              <div className={styles.items}>
                {day.items.map((item) => (
                  <LogItem
                    key={item.key}
                    item={item}
                    onOpen={
                      item.exerciseId
                        ? () => navigate(`/treino/exercicios/${item.exerciseId}/editar`)
                        : null
                    }
                  />
                ))}
              </div>
            </section>
          ))}
          {hasMore && (
            <button type="button" className={styles.moreButton} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
