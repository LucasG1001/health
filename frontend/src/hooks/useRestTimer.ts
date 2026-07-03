import { useEffect, useRef, useState } from "react";

const PREPARE_THRESHOLD_MS = 10000;
const TICK_MS = 250;

interface UseRestTimerOptions {
  endsAt: number | null;
  totalMs: number | null;
  onPrepare: () => void;
  onEnd: () => void;
}

export function useRestTimer({ endsAt, totalMs, onPrepare, onEnd }: UseRestTimerOptions) {
  const [remainingMs, setRemainingMs] = useState(() =>
    endsAt === null ? 0 : Math.max(0, endsAt - Date.now())
  );
  const previousRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onPrepare, onEnd });
  callbacksRef.current = { onPrepare, onEnd };

  useEffect(() => {
    if (endsAt === null) {
      previousRef.current = null;
      setRemainingMs(0);
      return;
    }

    previousRef.current = Math.max(0, endsAt - Date.now());
    setRemainingMs(previousRef.current);

    const tick = () => {
      const next = Math.max(0, endsAt - Date.now());
      const previous = previousRef.current ?? next + 1;
      if (previous > PREPARE_THRESHOLD_MS && next <= PREPARE_THRESHOLD_MS && next > 0) {
        callbacksRef.current.onPrepare();
      }
      if (previous > 0 && next === 0) {
        callbacksRef.current.onEnd();
      }
      previousRef.current = next;
      setRemainingMs(next);
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [endsAt]);

  const progress = totalMs && totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const preparing = remainingMs > 0 && remainingMs <= PREPARE_THRESHOLD_MS;

  return { remainingMs, progress, preparing };
}
