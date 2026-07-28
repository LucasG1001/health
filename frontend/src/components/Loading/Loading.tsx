import styles from "./Loading.module.css";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <p className={styles.loading} role="status">
      {label}
    </p>
  );
}
