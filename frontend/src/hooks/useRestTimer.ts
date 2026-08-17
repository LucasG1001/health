import { useEffect, useRef } from "react";
import { useNow } from "./useNow";
import {
  initialRestCueState,
  nextRestCue,
  restProgress,
  restRemainingMs,
  type RestCueState,
} from "../utils/restTimerCues";

const TICK_MS = 250;

interface UseRestTimerOptions {
  endsAt: number | null;
  totalMs: number | null;
  onTick?: (secondsLeft: number) => void;
  onEnd: () => void;
}

export function useRestTimer({ endsAt, totalMs, onTick, onEnd }: UseRestTimerOptions) {
  // O tick para no fim do descanso: na fase entre exercícios o painel segue aberto com o
  // relógio em zero, e antes disso a árvore continuava re-renderizando 4×/s.
  const now = useNow(endsAt !== null, TICK_MS, endsAt);
  const callbacksRef = useRef({ onTick, onEnd });

  useEffect(() => {
    callbacksRef.current = { onTick, onEnd };
  }, [onTick, onEnd]);

  const remainingMs = restRemainingMs(endsAt, totalMs, now);

  const cueRef = useRef<RestCueState>(initialRestCueState);
  useEffect(() => {
    const { next, tickSecondsLeft, ended } = nextRestCue(cueRef.current, endsAt, remainingMs);
    cueRef.current = next;
    if (tickSecondsLeft !== null) callbacksRef.current.onTick?.(tickSecondsLeft);
    if (ended) callbacksRef.current.onEnd();
  }, [endsAt, remainingMs]);

  return { remainingMs, progress: restProgress(remainingMs, totalMs) };
}
