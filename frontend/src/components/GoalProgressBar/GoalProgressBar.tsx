import type { Goal } from "../../types/goal";
import { formatDate, formatKg, formatPct } from "../../utils/format";
import { diffDays, todayIso } from "../../utils/dateUtils";
import styles from "./GoalProgressBar.module.css";

interface GoalProgressBarProps {
  goal: Goal;
}

export function GoalProgressBar({ goal }: GoalProgressBarProps) {
  const daysLeft = goal.targetDate ? diffDays(todayIso(), goal.targetDate) : null;

  const tracks: { label: string; current: string; target: string; pct: number }[] = [];
  if (goal.targetWeightKg != null && goal.weightProgressPct != null) {
    tracks.push({
      label: "Peso",
      current: formatKg(goal.currentWeightKg),
      target: formatKg(goal.targetWeightKg),
      pct: goal.weightProgressPct,
    });
  }
  if (goal.targetBodyFatPct != null && goal.bodyFatProgressPct != null) {
    tracks.push({
      label: "% Gordura",
      current: formatPct(goal.currentBodyFatPct),
      target: formatPct(goal.targetBodyFatPct),
      pct: goal.bodyFatProgressPct,
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Meta ativa</span>
        {goal.targetDate && (
          <span className={styles.deadline}>
            {daysLeft != null && daysLeft >= 0
              ? `${daysLeft} dias restantes · ${formatDate(goal.targetDate)}`
              : `venceu em ${formatDate(goal.targetDate)}`}
          </span>
        )}
      </div>
      {tracks.length === 0 && (
        <p className={styles.pending}>Registre uma medição para acompanhar o progresso.</p>
      )}
      {tracks.map((track) => (
        <div key={track.label} className={styles.track}>
          <div className={styles.trackHeader}>
            <span className={styles.trackLabel}>{track.label}</span>
            <span className={styles.trackValues}>
              {track.current} → {track.target}
            </span>
          </div>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${track.pct}%` }} />
          </div>
          <span className={styles.pct}>{track.pct}%</span>
        </div>
      ))}
    </div>
  );
}
