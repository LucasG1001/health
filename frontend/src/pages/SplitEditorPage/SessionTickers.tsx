import { SetStepper } from "../../components/SetStepper/SetStepper";
import { useRestCountdown } from "../../context/workoutSessionStore";
import { useNow } from "../../hooks/useNow";
import { formatClock, formatStopwatch } from "../../utils/format";

/**
 * Os três componentes deste arquivo existem para conter o relógio: quem depende do tempo
 * re-renderiza sozinho, sem levar a lista de exercícios junto a cada tick.
 */
export function SessionClock({ startedAt, className }: { startedAt: string; className?: string }) {
  const now = useNow(true);
  return <span className={className}>{formatStopwatch(now - new Date(startedAt).getTime())}</span>;
}

export function RestClock({ className }: { className?: string }) {
  const { remainingMs } = useRestCountdown();
  return <span className={className}>{formatClock(remainingMs)}</span>;
}

export function RestStepper({ total, completed }: { total: number; completed: number }) {
  const { progress } = useRestCountdown();
  return <SetStepper total={total} completed={completed} restProgress={progress} />;
}
