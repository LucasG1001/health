import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; positive: boolean } | null;
}

export function StatCard({ label, value, hint, delta }: StatCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <div className={styles.footer}>
        {delta && (
          <span className={`${styles.delta} ${delta.positive ? styles.positive : styles.negative}`}>
            {delta.value}
          </span>
        )}
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
    </div>
  );
}
