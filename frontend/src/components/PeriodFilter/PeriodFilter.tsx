import { PERIOD_LABELS, type Period } from "../../utils/chartUtils";
import styles from "./PeriodFilter.module.css";

const PERIODS: Period[] = ["week", "month", "year", "all"];

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className={styles.container} role="tablist" aria-label="Período">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          role="tab"
          aria-selected={value === period}
          className={`${styles.option} ${value === period ? styles.active : ""}`}
          onClick={() => onChange(period)}
        >
          {PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  );
}
