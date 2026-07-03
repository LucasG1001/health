import { formatClock } from "../../utils/format";
import styles from "./RestTimerRing.module.css";

interface RestTimerRingProps {
  remainingMs: number;
  progress: number;
  preparing: boolean;
  subtitle?: string;
}

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestTimerRing({ remainingMs, progress, preparing, subtitle }: RestTimerRingProps) {
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={`${styles.container} ${preparing ? styles.preparing : ""}`}>
      <svg className={styles.ring} viewBox="0 0 200 200">
        <circle className={styles.track} cx="100" cy="100" r={RADIUS} />
        <circle
          className={styles.fill}
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.time}>{formatClock(remainingMs)}</span>
        <span className={styles.subtitle}>{preparing ? "Prepare-se!" : subtitle ?? "descanso"}</span>
      </div>
    </div>
  );
}
