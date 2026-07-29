import { useLocation, useNavigate } from "react-router-dom";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useNow } from "../../hooks/useNow";
import { formatStopwatch } from "../../utils/format";
import { PlayIcon } from "../Icon/icons";
import styles from "./ActiveSessionBar.module.css";

export function ActiveSessionBar() {
  const { state } = useWorkoutSession();
  const location = useLocation();
  const navigate = useNavigate();

  const active = state.session !== null && state.session.status === "in_progress";
  const now = useNow(active);

  const splitId = state.session?.splitId ?? null;
  const workoutPath = splitId ? `/treino/divisoes/${splitId}` : "/treino";
  const onWorkoutScreen =
    location.pathname === workoutPath ||
    (splitId !== null && location.pathname.startsWith(`/treino/divisoes/${splitId}/`));

  // O painel de descanso entre exercícios ocupa o mesmo canto e já mostra a sessão.
  if (!active || onWorkoutScreen || state.phase === "interRest") return null;

  const elapsedMs = now - new Date(state.session!.startedAt).getTime();

  return (
    <button type="button" className={styles.bar} onClick={() => navigate(workoutPath)}>
      <span className={styles.pulse} />
      <span className={styles.label}>
        Treino em andamento · {state.session!.splitName}
      </span>
      <span className={styles.time}>{formatStopwatch(elapsedMs)}</span>
      <PlayIcon className={styles.icon} />
    </button>
  );
}
