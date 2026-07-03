import { useLocation, useNavigate } from "react-router-dom";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useNow } from "../../hooks/useNow";
import { formatClock } from "../../utils/format";
import { PlayIcon } from "../Icon/icons";
import styles from "./ActiveSessionBar.module.css";

export function ActiveSessionBar() {
  const { state } = useWorkoutSession();
  const location = useLocation();
  const navigate = useNavigate();

  const active = state.session !== null && state.session.status === "in_progress";
  const now = useNow(active);

  if (!active || location.pathname.startsWith("/treino/sessao/ativa")) return null;

  const elapsedMs = now - new Date(state.session!.startedAt).getTime();

  return (
    <button type="button" className={styles.bar} onClick={() => navigate("/treino/sessao/ativa")}>
      <span className={styles.pulse} />
      <span className={styles.label}>
        Treino em andamento · {state.session!.splitName}
      </span>
      <span className={styles.time}>{formatClock(elapsedMs)}</span>
      <PlayIcon className={styles.icon} />
    </button>
  );
}
