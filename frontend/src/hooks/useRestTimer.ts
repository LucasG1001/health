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
  const [now, setNow] = useState(() => Date.now());
  const callbacksRef = useRef({ onPrepare, onEnd });

  useEffect(() => {
    callbacksRef.current = { onPrepare, onEnd };
  }, [onPrepare, onEnd]);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [endsAt]);

  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);

  const edgeRef = useRef<{ endsAt: number | null; remaining: number }>({ endsAt: null, remaining: 0 });
  useEffect(() => {
    if (endsAt === null) {
      edgeRef.current = { endsAt: null, remaining: 0 };
      return;
    }
    if (edgeRef.current.endsAt !== endsAt) {
      edgeRef.current = { endsAt, remaining: remainingMs };
      return;
    }
    const previous = edgeRef.current.remaining;
    if (previous > PREPARE_THRESHOLD_MS && remainingMs <= PREPARE_THRESHOLD_MS && remainingMs > 0) {
      callbacksRef.current.onPrepare();
    }
    if (previous > 0 && remainingMs === 0) {
      callbacksRef.current.onEnd();
    }
    edgeRef.current.remaining = remainingMs;
  }, [endsAt, remainingMs]);

  const progress = totalMs && totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const preparing = remainingMs > 0 && remainingMs <= PREPARE_THRESHOLD_MS;

  return { remainingMs, progress, preparing };
}
